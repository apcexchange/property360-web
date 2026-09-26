# Unit Update/Delete Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `PUT /:id/units/:unitId` and `DELETE /:id/units/:unitId` endpoints so a landlord (or a self-owning agent) can edit a unit's details or remove a vacant unit from an existing property. `POST /:id/units` (add) already exists and needs no backend changes.

**Architecture:** Two new methods on the existing `PropertyService` class (`updateUnit`, `deleteUnit`), two new `PropertyController` methods, two new routes in `backend/src/routes/property.ts`, using the exact same ownership-check and middleware pattern as the existing `addUnit`/`deleteProperty`/`updateProperty` (`authorize(LANDLORD, AGENT)` + `requireActiveSubscription`, service-level `Property.findOne({ _id: propertyId, owner: ownerId })`). Delete is a hard delete guarded by two checks read directly off the `Unit` document (`isOccupied`, active `reservedBy`/`reservationExpiresAt`), no new schema fields.

**Tech Stack:** Node.js / Express 5 / TypeScript / Mongoose, `express-validator` for request validation.

**Repo:** `backend/` (git repo root `property360.git`, remote `git@github.com:apcexchange/property360.git`).

**Spec:** `docs/superpowers/specs/2026-08-03-unit-add-edit-delete-design.md`

---

## Before you start

- **Work in an isolated worktree off `origin/main`.** The backend repo's currently-checked-out branch (`feat/partner-referrals`) has unrelated uncommitted work that must not be touched or swept into this change. Set up the worktree per the `superpowers:using-git-worktrees` skill, based on `origin/main` (this is what's actually deployed to `https://api.property360.africa`), on a new branch, e.g. `feat/unit-crud`.
- **No test runner exists in this repo** (`npm test` exits 1, per the project's CLAUDE.md). There is no TDD red/green cycle here — verification is `tsc --noEmit` (the compile gate) plus manual `curl` against a running dev server where steps say so. Skip a `curl` step if you don't have a local dev server + MongoDB connection available; `tsc` passing is the hard requirement for every task.
- **Known pre-existing gap, out of scope:** the `Unit` model (`backend/src/models/Unit.ts`) has no `rentPeriod` field at all, even though the web/mobile "add unit" forms send one. Mongoose's default strict-schema behavior silently drops it. Do not add a `rentPeriod` field as part of this plan, it's a separate, already-existing issue unrelated to add/edit/delete. The new `updateUnit` endpoint's allowed-fields list simply does not include `rentPeriod`.

---

### Task 1: Add validation rules for the two new routes

**Files:**
- Modify: `backend/src/validations/property.ts`

- [ ] **Step 1: Add `unitIdValidation` and `updateUnitValidation`**

Open `backend/src/validations/property.ts`. Find the existing `addUnitValidation` block:

```ts
export const addUnitValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid property ID'),
  body('unitNumber')
    .trim()
    .notEmpty()
    .withMessage('Unit number is required'),
  body('rentAmount')
    .isNumeric()
    .withMessage('Rent amount must be a number'),
];
```

Immediately after it, insert:

```ts

export const unitIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid property ID'),
  param('unitId')
    .isMongoId()
    .withMessage('Invalid unit ID'),
];

export const updateUnitValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid property ID'),
  param('unitId')
    .isMongoId()
    .withMessage('Invalid unit ID'),
  body('unitNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Unit number cannot be empty'),
  body('rentAmount')
    .optional()
    .isNumeric()
    .withMessage('Rent amount must be a number'),
  body('bedrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Bedrooms must be a non-negative number'),
  body('bathrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Bathrooms must be a non-negative number'),
  body('size')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Size must be a non-negative number'),
  body('defaultFees')
    .optional()
    .isObject()
    .withMessage('Default fees must be an object'),
  body('defaultFees.securityDeposit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Security deposit must be a non-negative number'),
  body('defaultFees.cautionFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Caution fee must be a non-negative number'),
  body('defaultFees.agentFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Agent fee must be a non-negative number'),
  body('defaultFees.agreementFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Agreement fee must be a non-negative number'),
  body('defaultFees.legalFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Legal fee must be a non-negative number'),
  body('defaultFees.serviceCharge')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Service charge must be a non-negative number'),
  body('defaultFees.otherFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Other fee must be a non-negative number'),
  body('defaultFees.otherFeeDescription')
    .optional()
    .isString()
    .withMessage('Other fee description must be text'),
];
```

- [ ] **Step 2: Type-check**

Run: `cd backend && npx tsc --noEmit`
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```bash
git add backend/src/validations/property.ts
git commit -m "feat(properties): add validation for unit update/delete routes"
```

---

### Task 2: Add `PropertyService.updateUnit` and `PropertyService.deleteUnit`

**Files:**
- Modify: `backend/src/services/PropertyService.ts`

- [ ] **Step 1: Add the two methods**

Open `backend/src/services/PropertyService.ts`. Find the existing `getUnits` method:

```ts
  async getUnits(propertyId: string, ownerId: string, role?: UserRole) {
    // Verify the caller owns (landlord) or manages (agent) the property.
    const accessFilter = await this.propertyAccessFilter(
      propertyId,
      ownerId,
      role
    );
    const property = await Property.findOne(accessFilter);
    if (!property) {
      throw new AppError('Property not found', 404);
    }

    return sortByUnitNumber(
      await Unit.find({ property: propertyId }).populate('tenant', 'firstName lastName email phone')
    );
  }
```

Immediately after it, insert:

```ts

  async updateUnit(
    propertyId: string,
    unitId: string,
    ownerId: string,
    data: Partial<
      Pick<IUnit, 'unitNumber' | 'bedrooms' | 'bathrooms' | 'size' | 'rentAmount' | 'defaultFees'>
    >
  ): Promise<IUnit> {
    // Same ownership pattern as addUnit/updateProperty/deleteProperty: only
    // the property's own owner (landlord, or a self-owning agent) can
    // reshape its units. Never delegable to an assigned agent, there's no
    // canManageUnits-style permission flag for this.
    const property = await Property.findOne({ _id: propertyId, owner: ownerId });
    if (!property) {
      throw new AppError('Property not found', 404);
    }

    const unit = await Unit.findOne({ _id: unitId, property: propertyId });
    if (!unit) {
      throw new AppError('Unit not found', 404);
    }

    const { defaultFees, ...rest } = data;
    Object.assign(unit, rest);
    // $set on a nested path replaces the whole subdocument rather than
    // merging it, so a partial fee update (e.g. just securityDeposit) would
    // silently wipe the other fees if applied directly via findOneAndUpdate.
    // Merge onto the unit's existing fees instead so untouched fields
    // survive. Every unit's defaultFees is fully populated by schema
    // defaults (Unit.ts), so this merge always produces a complete object.
    if (defaultFees) {
      unit.defaultFees = { ...(unit.defaultFees ?? {}), ...defaultFees } as IUnit['defaultFees'];
    }

    await unit.save();
    return unit;
  }

  async deleteUnit(propertyId: string, unitId: string, ownerId: string): Promise<void> {
    const property = await Property.findOne({ _id: propertyId, owner: ownerId });
    if (!property) {
      throw new AppError('Property not found', 404);
    }

    const unit = await Unit.findOne({ _id: unitId, property: propertyId });
    if (!unit) {
      throw new AppError('Unit not found', 404);
    }

    if (unit.isOccupied) {
      throw new AppError('Cannot delete an occupied unit. End the tenancy first.', 400);
    }

    if (
      unit.reservedBy &&
      unit.reservationExpiresAt &&
      unit.reservationExpiresAt > new Date()
    ) {
      throw new AppError('This unit has a pending reservation. Cancel it first.', 400);
    }

    await Unit.deleteOne({ _id: unitId });
  }
```

This hard-deletes the unit (per the approved design). A vacant unit with only *historical* (expired/terminated/declined) leases or invoices is deletable, those records keep their `unit` reference but it resolves to nothing if re-fetched later; this is the accepted trade-off from the design doc.

- [ ] **Step 2: Type-check**

Run: `cd backend && npx tsc --noEmit`
Expected: no output (clean pass). If you see `Property 'reservedBy' does not exist on type 'IUnit'` or similar, confirm `backend/src/types/index.ts`'s `IUnit` interface has `reservedBy?: IUser['_id']` and `reservationExpiresAt?: Date` (it should already, added by the marketplace/reservation feature, not part of this task).

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/PropertyService.ts
git commit -m "feat(properties): add updateUnit/deleteUnit service methods"
```

---

### Task 3: Add controller actions

**Files:**
- Modify: `backend/src/controllers/PropertyController.ts`

- [ ] **Step 1: Add `updateUnit` and `deleteUnit`**

Open `backend/src/controllers/PropertyController.ts`. Find the existing `getUnits` method:

```ts
  async getUnits(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const units = await PropertyService.getUnits(
        req.params.id as string,
        req.user!._id.toString(),
        req.user!.role
      );

      const response: ApiResponse = {
        success: true,
        message: 'Units retrieved successfully',
        data: units,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
```

Immediately after it, insert:

```ts

  async updateUnit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Whitelist explicitly rather than passing req.body straight through.
      // PropertyService.updateUnit's TS parameter type only restricts what a
      // strictly-typed *caller* can pass, req.body is `any` at this boundary,
      // so without this the type restriction is compile-time-only and a
      // client could smuggle isOccupied/tenant/reservation fields into the
      // update via extra JSON keys the validator doesn't reject.
      const { unitNumber, bedrooms, bathrooms, size, rentAmount, defaultFees } = req.body;
      // Only include keys the client actually sent. An object literal like
      // { unitNumber, bedrooms, ... } would include every key even when its
      // destructured value is undefined (field omitted from the request),
      // and PropertyService.updateUnit's Object.assign(unit, rest) copies
      // undefined-valued keys too, wiping fields the client never touched
      // and failing validation on the required unitNumber/rentAmount fields
      // for any single-field update. Build the payload from only defined keys.
      const updates: Parameters<typeof PropertyService.updateUnit>[3] = {};
      if (unitNumber !== undefined) updates.unitNumber = unitNumber;
      if (bedrooms !== undefined) updates.bedrooms = bedrooms;
      if (bathrooms !== undefined) updates.bathrooms = bathrooms;
      if (size !== undefined) updates.size = size;
      if (rentAmount !== undefined) updates.rentAmount = rentAmount;
      if (defaultFees !== undefined) updates.defaultFees = defaultFees;

      const unit = await PropertyService.updateUnit(
        req.params.id as string,
        req.params.unitId as string,
        req.user!._id.toString(),
        updates
      );

      const response: ApiResponse = {
        success: true,
        message: 'Unit updated successfully',
        data: unit,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async deleteUnit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await PropertyService.deleteUnit(
        req.params.id as string,
        req.params.unitId as string,
        req.user!._id.toString()
      );

      const response: ApiResponse = {
        success: true,
        message: 'Unit deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
```

- [ ] **Step 2: Type-check**

Run: `cd backend && npx tsc --noEmit`
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/PropertyController.ts
git commit -m "feat(properties): add updateUnit/deleteUnit controller actions"
```

---

### Task 4: Wire the routes

**Files:**
- Modify: `backend/src/routes/property.ts`

- [ ] **Step 1: Import the new validations**

Find:

```ts
import {
  createPropertyValidation,
  updatePropertyValidation,
  propertyIdValidation,
  addUnitValidation,
  assignAgentValidation,
} from '../validations';
```

Replace with:

```ts
import {
  createPropertyValidation,
  updatePropertyValidation,
  propertyIdValidation,
  addUnitValidation,
  updateUnitValidation,
  unitIdValidation,
  assignAgentValidation,
} from '../validations';
```

- [ ] **Step 2: Add the two routes**

Find:

```ts
router.get(
  '/:id/units',
  validate(propertyIdValidation),
  PropertyController.getUnits
);

// Agent assignment
```

Replace with:

```ts
router.get(
  '/:id/units',
  validate(propertyIdValidation),
  PropertyController.getUnits
);

router.put(
  '/:id/units/:unitId',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  requireActiveSubscription,
  validate(updateUnitValidation),
  PropertyController.updateUnit
);

router.delete(
  '/:id/units/:unitId',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  requireActiveSubscription,
  validate(unitIdValidation),
  PropertyController.deleteUnit
);

// Agent assignment
```

- [ ] **Step 3: Type-check**

Run: `cd backend && npx tsc --noEmit`
Expected: no output (clean pass).

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/property.ts
git commit -m "feat(properties): wire up PUT/DELETE unit routes"
```

---

### Task 5: Manual verification (only if a dev server + MongoDB is reachable)

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `cd backend && npm run dev`
Expected: server logs `Server running on port 5001` (or configured `PORT`) and a Mongo connection success line. If this fails (no reachable MongoDB in this environment), skip the rest of Task 5, `tsc` passing across Tasks 1-4 is sufficient to hand off.

- [ ] **Step 2: Get a landlord JWT**

Use an existing test landlord account, or register one:

```bash
curl -s -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<test-landlord-email>","password":"<test-password>"}' | jq -r '.data.token'
```

Save the returned token as `$TOKEN` for the next steps.

- [ ] **Step 3: Edit a unit**

Pick an existing `<propertyId>`/`<unitId>` you own (from `GET /api/v1/properties/<propertyId>`), then:

```bash
curl -s -X PUT http://localhost:5001/api/v1/properties/<propertyId>/units/<unitId> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rentAmount": 550000}'
```

Expected: `{"success":true,"message":"Unit updated successfully","data":{...,"rentAmount":550000,...}}`

- [ ] **Step 4: Try to delete an occupied unit (expect a 400)**

Pick a unit with `isOccupied: true`:

```bash
curl -s -X DELETE http://localhost:5001/api/v1/properties/<propertyId>/units/<occupiedUnitId> \
  -H "Authorization: Bearer $TOKEN"
```

Expected: `{"success":false,"message":"Cannot delete an occupied unit. End the tenancy first."}` with a 400 status.

- [ ] **Step 5: Delete a vacant unit (expect success)**

```bash
curl -s -X DELETE http://localhost:5001/api/v1/properties/<propertyId>/units/<vacantUnitId> \
  -H "Authorization: Bearer $TOKEN"
```

Expected: `{"success":true,"message":"Unit deleted successfully"}`. Confirm with `GET /api/v1/properties/<propertyId>` that the unit is gone and the unit count/occupancy stats updated (no separate bookkeeping needed, they're computed live).

---

### Task 6: Push and open a PR to `main`

**Files:** none (git operations only)

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/unit-crud
```

- [ ] **Step 2: Open a PR** (via `gh pr create` if authenticated, otherwise use the compare URL GitHub prints on push)

```bash
gh pr create --repo apcexchange/property360 --base main --head feat/unit-crud \
  --title "feat(properties): add unit update/delete endpoints" \
  --body "Adds PUT/DELETE /:id/units/:unitId so a landlord can edit or remove a unit from an existing property. Delete is guarded against occupied units and active reservations. See docs/superpowers/specs/2026-08-03-unit-add-edit-delete-design.md."
```

If `gh` isn't authenticated, push prints a compare URL like `https://github.com/apcexchange/property360/pull/new/feat/unit-crud`, open that manually.
