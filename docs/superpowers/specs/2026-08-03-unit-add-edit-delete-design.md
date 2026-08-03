# Unit Add / Edit / Delete Design

**Status:** Approved design, ready for implementation planning
**Date:** 2026-08-03
**Owner:** Peter (hello@property360.africa)

## Problem

A landlord can only shape a property's unit list at creation time (the "new property" form, including its Quick Setup batch generator). Once a property exists, there is no way to:

- Add a unit to it (a new wing gets built, or the original count was wrong).
- Edit a unit's number, bedroom/bathroom count, size, rent, or fees (typo, rent change, or the fee schedule was wrong).
- Delete a unit (added by mistake, or a physical unit no longer exists).

This gap was surfaced while fixing an adjacent bug (units listing in lexicographic instead of natural order) on a 51-unit property created with the Quick Setup append-mode fix.

## Locked decisions

- **Scope:** backend (`property360.git`) + web (`property360-web.git`) + mobile (`property360-mobile.git`). All three ship.
- **Delete is a hard delete.** No soft-delete/archive flag added to `Unit`. A unit that's currently vacant can be deleted even if it has historical (expired/terminated/declined) leases or invoices, those old records keep their `unit` reference but it will resolve to nothing if ever re-fetched. Accepted trade-off, chosen for simplicity over Property's soft-delete pattern.
- **Delete guard:** blocked only on *current* occupancy or an *active* reservation hold, not on historical leases. Specifically: reject if `unit.isOccupied === true`, or if `unit.reservedBy` is set and `unit.reservationExpiresAt` is still in the future.
- **Edit is unrestricted by occupancy.** `Lease` snapshots its own `rentAmount` and fee fields at signing time (confirmed in `backend/src/models/Lease.ts`), it never reads live from `Unit`. So editing a unit's rent/fees/number/bed-bath count never retroactively changes an active lease's already-agreed terms, it only changes the unit's *default* values for whatever comes next (marketplace listing, next tenant, "assign tenant" defaults).
- **Add and edit share one form** (same fields, prefilled when editing), rather than two separate UIs, on both web and mobile.
- **No batch/bulk add on the detail page.** Quick Setup's batch generator stays creation-only; adding units to an existing property is one-at-a-time. (See Future work.)

## What already exists (reused, not rebuilt)

- **Add unit, backend is already done.** `POST /:id/units` → `PropertyController.addUnit` → `PropertyService.addUnit(propertyId, ownerId, data)` (`backend/src/services/PropertyService.ts:265-274`) already works, gated by `authorize(LANDLORD, AGENT)` + `requireActiveSubscription` + `addUnitValidation`. Nothing to change here.
- **Ownership check pattern.** `addUnit`/`updateProperty`/`deleteProperty` all check `Property.findOne({ _id: propertyId, owner: ownerId })` using `req.user._id` directly (not `req.landlordId`/`checkAgentPermission`). Per the route comment in `backend/src/routes/property.ts:180-183`, this is intentional: property/unit *structure* changes are landlord-or-self-owning-agent only, never delegable to an assigned agent (no `canManageUnits`-style permission flag exists, and none is being added). `updateUnit`/`deleteUnit` follow the identical pattern.
- **Unique unit numbers.** `unitSchema.index({ property: 1, unitNumber: 1 }, { unique: true })` (`backend/src/models/Unit.ts`) already rejects duplicate unit numbers within a property at the DB layer, for both add and edit (rename).
- **Mobile `addUnit`.** `mobile/src/api/endpoints/property.endpoints.ts:81-87` + `mobile/src/services/property.ts:85` + `useAddUnit()` (`mobile/src/hooks/useProperty.ts:58-73`) already exist, currently only invoked from the new-property onboarding wizard (`AddPropertyUnitsScreen`/`AddPropertyReviewScreen`). Reused for the new post-creation add-unit screen/modal, not rebuilt.
- **Confirm-modal precedent.** Web's whole-property delete uses a type-the-name-to-confirm modal (`web/src/app/app/properties/[id]/page.tsx:241-302`). Unit delete is far less destructive (one row, not a whole property + its history), so it gets a lighter "Delete Flat 12? This can't be undone." confirm instead, not the type-to-confirm pattern.
- **Property unit counts are always live.** No `totalUnits` field is stored on `Property`, every place that reports a unit count computes it from the actual `Unit` collection at read time (`PropertyService.ts:216`, `:144`). Add/edit/delete need zero counter bookkeeping.

## API design (backend)

Two new routes in `backend/src/routes/property.ts`, alongside the existing unit routes, same middleware stack as `addUnit`:

```
PUT    /:id/units/:unitId    → PropertyController.updateUnit → PropertyService.updateUnit
DELETE /:id/units/:unitId    → PropertyController.deleteUnit → PropertyService.deleteUnit
```

Both: `authorize(UserRole.LANDLORD, UserRole.AGENT)`, `requireActiveSubscription`, a new `updateUnitValidation`/`unitIdValidation` (mirroring `addUnitValidation`/`propertyIdValidation`).

**`PropertyService.updateUnit(unitId, propertyId, ownerId, data)`**
- Verify property ownership (`Property.findOne({ _id: propertyId, owner: ownerId })`), 404 if not found/not owned.
- Verify the unit belongs to that property, 404 if not.
- Apply the allowed field patch: `unitNumber`, `bedrooms`, `bathrooms`, `size`, `rentAmount`, `rentPeriod`, `defaultFees.*`. `isOccupied`/`tenant`/listing/reservation fields are never editable through this endpoint (those are owned by other flows, assign-tenant, marketplace listing, reservations).
- Rely on the existing unique index for duplicate-unit-number rejection, surfaced through the existing generic Mongo-duplicate-key → readable-message path in `errorHandler`.

**`PropertyService.deleteUnit(unitId, propertyId, ownerId)`**
- Same ownership + unit-belongs-to-property checks as above.
- Guard: if `unit.isOccupied` → `AppError('Cannot delete an occupied unit. End the tenancy first.', 400)`.
- Guard: if `unit.reservedBy` and `unit.reservationExpiresAt > now` → `AppError('This unit has a pending reservation. Cancel it first.', 400)`.
- Otherwise `Unit.findOneAndDelete({ _id: unitId, property: propertyId })`.

`PropertyController` gets matching `updateUnit`/`deleteUnit` methods, same shape as the existing `addUnit`/`deleteProperty` (try/catch → `next(error)`, `ApiResponse` envelope).

## Web (`property360-web`)

- `web/src/lib/landlord-api.ts`: add `addUnit(propertyId, data)`, `updateUnit(propertyId, unitId, data)`, `deleteUnit(propertyId, unitId)` wrappers.
- `web/src/app/app/properties/[id]/page.tsx`:
  - One shared `UnitFormModal` (new component in this file or a sibling) with the fields: unit number, bedrooms, bathrooms, size, rent amount, rent period, and the six fee fields, same shape as the per-unit fields already used on the new-property form. In **add** mode it opens blank with unit number prefilled to the next natural number (via the same natural-sort logic already added for listing, `Flat ${N+1}` where N is the current unit count); in **edit** mode it opens prefilled with the selected unit's current values.
  - "Add unit" button in the Units section header (next to the existing count heading) opens the modal in add mode, submits via `addUnit`, invalidates the property query on success.
  - Each `UnitRow` gets a pencil icon (edit, opens the modal in edit mode, submits via `updateUnit`) and a trash icon (delete). Trash is disabled (with a tooltip/title explaining why) when `unit.isOccupied`. Clicking it shows the lightweight confirm, then calls `deleteUnit` and invalidates the query.
  - Errors from the guard rules (occupied / reserved) surface via the existing toast pattern with the backend's exact message.

## Mobile (`property360-mobile`)

- `mobile/src/api/endpoints/property.endpoints.ts` + `mobile/src/services/property.ts`: add `updateUnit`/`deleteUnit`, mirroring the existing `addUnit`.
- `mobile/src/hooks/useProperty.ts`: add `useUpdateUnit()`/`useDeleteUnit()` mutation hooks, mirroring `useAddUnit()`, invalidating `propertyKeys.detail`/`.lists()` on success.
- `mobile/src/screens/property/PropertyDetailsScreen.tsx`: an "Add unit" action (button/FAB, matching whatever header-action convention the screen already uses) opens the same-shaped form as web (native equivalent) in add mode. Each unit row gets an edit action (opens the form prefilled) and a delete action, using the same `Alert.alert` confirm pattern already used for whole-property delete on this screen (no existing swipe-to-delete pattern to follow instead), disabled for occupied units.
- Ships to real users only on the next store release (no OTA per the existing release pipeline), build/merge now, but it isn't live for landlords until that release goes through TestFlight/Play review.

## Error handling & guards

- Business-rule rejections (occupied, active reservation, duplicate unit number) come back as a specific 400 message from the backend and are shown as-is via each platform's existing toast/alert pattern, never a generic "something went wrong."
- No new validation is needed at system boundaries beyond what already exists (`addUnitValidation` shape reused for `updateUnitValidation`; ownership/ID checks mirror `addUnit`/`deleteProperty`).

## Verification (no test runner in this repo)

1. `curl` the two new backend endpoints directly: update a unit's rent, then attempt to delete an occupied unit (expect 400) and a vacant one (expect success).
2. Web: add a unit from the property detail page, edit its rent/fees, delete a vacant unit, confirm delete is disabled/blocked on an occupied one, confirm the list re-sorts naturally after add.
3. Mobile: same three actions (add, edit, delete) through `PropertyDetailsScreen`, on both iOS and Android simulators/devices.
4. Backend `tsc --noEmit` and web `tsc --noEmit` are the compile gates throughout (no automated tests exist in either repo).

## Where it lands

- Backend (`property360.git`), web (`property360-web.git`), mobile (`property360-mobile.git`).
- Backend and web follow the same worktree-off-`main` PR flow already used for the natural-sort fix in this same session (the working branches in both repos currently carry unrelated in-progress work that shouldn't be swept into this change).
- Mobile changes land on whatever branch mobile work currently happens on, then ride the existing tag-triggered fastlane release lanes (`mobile-v*` / `mobile-staging-v*`).

## Future work / non-goals

- A Quick-Setup-style batch add on the property detail page (add N units at once post-creation). Not requested, one-at-a-time covers the reported need.
- Soft-delete/archive for units (mirroring Property's `isActive` pattern). Explicitly not chosen, hard delete was the approved answer.
- Any change to who can perform these actions (e.g. a new `canManageUnits` agent-permission flag). Out of scope, matches the existing landlord/self-owning-agent-only pattern for property structure changes.
