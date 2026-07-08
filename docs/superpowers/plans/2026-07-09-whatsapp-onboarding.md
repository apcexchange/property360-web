# WhatsApp Onboarding and Guest Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let unknown WhatsApp numbers ask product questions (guest mode) and register a full Property360 account entirely inside the chat, with the account auto-verified for WhatsApp and its password set later via an emailed single-use link.

**Architecture:** Two additions layered onto the live assistant channel. (1) A stateless guest-answer path for numbers with no account, calling the LLM directly with a guest marker and no tools. (2) A scripted registration state machine (`WhatsAppOnboardingService`) driven by a TTL-bounded `WhatsAppOnboarding` document, collecting role, name, and email; the email is verified by OTP typed back into chat; on success the account is created with `phone = +wa_id` and all three verification flags set, and a `PasswordSetupToken` email lets the user set a password on the web. The v1 orchestrator's unknown-number branch is the only routing change; existing verified/unverified/multiple branches are untouched.

**Tech Stack:** Node/Express/TypeScript, Mongoose (TTL indexes), existing `EmailOtpService` (Resend), existing assistant LLM client (`createChatCompletion`), Meta WhatsApp Cloud API send path (`sendWhatsAppText`), Next.js for the set-password page.

**Testing convention:** This repo has no test runner (`npm test` exits 1; see CLAUDE.md). Every task is verified by `npm run build` (tsc, the only working backend gate) plus the manual checks listed. Do not add a test framework.

**Branch placement:** Backend work lands on the backend repo (`git@github.com:apcexchange/property360.git`), same branch the assistant commits sit on (`feat/wallet-dva`), then cherry-picks to `main` to deploy (see routing memory). The one web file lands on the monorepo `feat/founding-50` branch under `web/src/`; note the deployed web repo uses a root `src/` layout, so shipping it is a `web/src` → `src` path remap (see the web branch-layout memory). **Do not push to production without explicit user approval.**

**Hard security rule (load-bearing, from the spec):** Accounts are created FROM the conversation only. An existing account is NEVER auto-linked on inbound: an inbound message proves control of the WhatsApp number, not ownership of an account that merely claims that number. Existing accounts earn `whatsappVerified` only through the in-app OTP flow. Guest mode tells such users to verify in the app; registration is offered only when no account and no email collision exist.

---

## File Structure

**Backend — create:**
- `backend/src/models/WhatsAppOnboarding.ts` — registration state doc (waId-keyed, TTL 30 min).
- `backend/src/models/PasswordSetupToken.ts` — single-use set-password token (hashed, TTL 24 h).
- `backend/src/services/WhatsAppOnboardingService.ts` — the registration state machine + guest-answer path.

**Backend — modify:**
- `backend/src/models/index.ts` — export the two new models.
- `backend/src/config/index.ts` — add `config.whatsapp.onboarding` tunables.
- `backend/src/services/EmailOtpService.ts` — add `sendPasswordSetupEmail`.
- `backend/src/services/AuthService.ts` — add `createPasswordSetupToken` + `redeemPasswordSetupToken`.
- `backend/src/controllers/AuthController.ts` — add `redeemPasswordSetup`.
- `backend/src/routes/auth.ts` — add `POST /auth/set-password/redeem`.
- `backend/src/validations/auth.ts` — add `setPasswordValidation`.
- `backend/src/services/WhatsAppAssistantService.ts` — add guest rate limiter + route the unknown-number branch to onboarding/guest.

**Web — create:**
- `web/src/app/set-password/page.tsx` — password form that redeems the token and signs in.

**Docs — modify:**
- `docs/superpowers/specs/2026-07-08-whatsapp-onboarding-design.md` — append an as-built addendum.

---

## Task 1: `PasswordSetupToken` model

**Files:**
- Create: `backend/src/models/PasswordSetupToken.ts`
- Modify: `backend/src/models/index.ts`

- [ ] **Step 1: Write the model**

Create `backend/src/models/PasswordSetupToken.ts`:

```ts
import { Schema, model, Document, Types } from 'mongoose';

/**
 * Single-use token that lets a user who was created through WhatsApp
 * registration set their first password on the web, without ever typing a
 * password into chat. Mirrors WebHandoff's security posture:
 *  - Only the SHA-256 hash of the token is stored; the raw token is emailed
 *    once and never persisted, so a Mongo read cannot recover a usable link.
 *  - Single-use: once `usedAt` is set, redemption fails.
 *  - Short-lived: the TTL index drops rows 24h after creation, so a leaked
 *    link becomes inert. Expired/used tokens fall back to forgot-password
 *    (the account's email is already verified).
 */
export interface IPasswordSetupToken extends Document {
  user: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

const passwordSetupTokenSchema = new Schema<IPasswordSetupToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const PasswordSetupToken = model<IPasswordSetupToken>(
  'PasswordSetupToken',
  passwordSetupTokenSchema
);
export default PasswordSetupToken;
```

- [ ] **Step 2: Export it**

In `backend/src/models/index.ts`, add after the `WebHandoff` export line:

```ts
export { PasswordSetupToken } from './PasswordSetupToken';
```

- [ ] **Step 3: Build**

Run: `cd backend && npm run build`
Expected: tsc exits 0, no errors.

- [ ] **Step 4: Commit**

```bash
cd backend && git add src/models/PasswordSetupToken.ts src/models/index.ts
git commit --no-verify -m "feat(whatsapp-onboarding): PasswordSetupToken model"
```

---

## Task 2: Set-password token issue + redeem in AuthService

**Files:**
- Modify: `backend/src/services/AuthService.ts`
- Modify: `backend/src/services/EmailOtpService.ts`

- [ ] **Step 1: Add the set-password email to EmailOtpService**

In `backend/src/services/EmailOtpService.ts`, add this method inside the `EmailOtpService` class (place it next to `sendWelcomeEmail`). It reuses the existing `sendEmail` helper and house styling:

```ts
  /**
   * Send the single-use link that lets a WhatsApp-registered user set their
   * first password for app/web login. The token is already embedded in `url`.
   */
  async sendPasswordSetupEmail(
    email: string,
    firstName: string,
    url: string
  ): Promise<void> {
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #0D2B36 0%, #1a4a5c 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Welcome to Property360!</h1>
          <p style="color: #8ECAE6; margin: 10px 0 0 0; font-size: 14px;">Set your password</p>
        </div>
        <div style="padding: 40px 30px; background-color: #f8fafc;">
          <h2 style="color: #0D2B36; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hello, ${firstName}!</h2>
          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Your account was created over WhatsApp and is ready to use. Set a password so you can also sign in on the web and in the app.
          </p>
          <div style="text-align: center; margin: 0 0 24px 0;">
            <a href="${url}" style="display: inline-block; background-color: #0D2B36; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 14px 28px; border-radius: 999px;">
              Set my password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
            This link expires in 24 hours and can be used once. If it expires, use "Forgot password" on the login screen — your email is already verified.
          </p>
          <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin: 16px 0 0 0; word-break: break-all;">
            Or paste this link into your browser:<br/>${url}
          </p>
        </div>
        <div style="background-color: #0D2B36; padding: 30px; text-align: center; border-radius: 0 0 12px 12px;">
          <p style="color: #8ECAE6; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} Property360. All rights reserved.
          </p>
        </div>
      </div>
    `;
    const text = `Hello ${firstName},

Your Property360 account was created over WhatsApp and is ready to use.
Set a password so you can also sign in on the web and in the app:

${url}

This link expires in 24 hours and can be used once. If it expires, use
"Forgot password" on the login screen — your email is already verified.

Property360`;

    await this.sendEmail(email, 'Set your Property360 password', html, text);
  }
```

- [ ] **Step 2: Add token issue + redeem to AuthService**

In `backend/src/services/AuthService.ts`, add the `crypto` import and the `PasswordSetupToken` import at the top (alongside the existing model imports):

```ts
import crypto from 'crypto';
import { User, Lease, Unit } from '../models';
import { PasswordSetupToken } from '../models/PasswordSetupToken';
```

(Keep the existing `import { User, Lease, Unit } from '../models';` line — just add the `crypto` and `PasswordSetupToken` lines; do not duplicate the User import.)

Then add these two methods to the `AuthService` class (place them after `verifyEmail`). Note `serializeUser` and `generateToken` already exist in this file:

```ts
  /**
   * Mint a single-use set-password token for a user and return the absolute
   * web link to email them. Only the SHA-256 hash is stored.
   */
  async createPasswordSetupLink(userId: string): Promise<string> {
    const raw = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    await PasswordSetupToken.create({
      user: userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return `${config.web.baseUrl}/set-password?token=${raw}`;
  }

  /**
   * Redeem a set-password token: set the user's password and return a normal
   * auth response so the web page can sign them straight in. Marks the token
   * used BEFORE saving the password so concurrent redeems cannot both succeed.
   */
  async redeemPasswordSetup(
    rawToken: string,
    newPassword: string
  ): Promise<AuthResponse> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const record = await PasswordSetupToken.findOne({ tokenHash });
    if (!record) throw new AppError('Invalid or expired link', 400);
    if (record.usedAt) throw new AppError('This link has already been used', 400);
    if (record.expiresAt.getTime() < Date.now()) {
      throw new AppError('This link has expired', 400);
    }

    record.usedAt = new Date();
    await record.save();

    const user = await User.findById(record.user).select('+password');
    if (!user || user.isDeleted) throw new AppError('Account no longer available', 404);
    if (!user.isActive) throw new AppError('Account is deactivated', 401);

    user.password = newPassword; // pre-save hook hashes it
    await user.save();

    const accessToken = generateToken(user);
    return { user: serializeUser(user), accessToken, refreshToken: accessToken };
  }
```

`config` is already imported? Check: `AuthService.ts` does not currently import `config`. Add it to the top imports:

```ts
import { config } from '../config';
```

- [ ] **Step 3: Build**

Run: `cd backend && npm run build`
Expected: tsc exits 0. If it complains `config` is already imported, remove the duplicate; if `user.isDeleted` types-errors, use `(user as any).isDeleted` to match the `redeemWebHandoff` precedent in AuthController.

- [ ] **Step 4: Commit**

```bash
cd backend && git add src/services/AuthService.ts src/services/EmailOtpService.ts
git commit --no-verify -m "feat(whatsapp-onboarding): set-password token issue/redeem + email"
```

---

## Task 3: `POST /auth/set-password/redeem` endpoint

**Files:**
- Modify: `backend/src/validations/auth.ts`
- Modify: `backend/src/controllers/AuthController.ts`
- Modify: `backend/src/routes/auth.ts`

- [ ] **Step 1: Add validation**

In `backend/src/validations/auth.ts`, add (mirror the existing `body(...)` style already in the file):

```ts
export const setPasswordValidation = [
  body('token').isString().notEmpty().withMessage('Token is required'),
  body('password')
    .isString()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];
```

- [ ] **Step 2: Add the controller handler**

In `backend/src/controllers/AuthController.ts`, add a handler modeled on `redeemWebHandoff` (same file). Reuse the existing `AuthService` import and `ApiResponse` type:

```ts
  /**
   * POST /auth/set-password/redeem (public)
   * Trade a single-use set-password token for a real access JWT. Used by the
   * web /set-password page after WhatsApp registration.
   */
  async redeemPasswordSetup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { token, password } = req.body ?? {};
      const result = await AuthService.redeemPasswordSetup(token, password);
      const response: ApiResponse = {
        success: true,
        message: 'Password set',
        data: result,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
```

- [ ] **Step 3: Wire the route**

In `backend/src/routes/auth.ts`, add the import to the validation import block and the route next to the web-handoff redeem route:

```ts
// in the validations import:
  setPasswordValidation,

// with the other public routes (near web-handoff/redeem):
router.post(
  '/set-password/redeem',
  validate(setPasswordValidation),
  AuthController.redeemPasswordSetup
);
```

- [ ] **Step 4: Build**

Run: `cd backend && npm run build`
Expected: tsc exits 0.

- [ ] **Step 5: Manual check**

Start dev (`npm run dev`), then:

```bash
curl -s -X POST http://localhost:5001/api/v1/auth/set-password/redeem \
  -H 'Content-Type: application/json' -d '{"token":"nope","password":"secret123"}'
```

Expected: 400 with "Invalid or expired link" (proves the route, validation, and service wiring resolve). Full happy path is exercised in Task 7's E2E.

- [ ] **Step 6: Commit**

```bash
cd backend && git add src/validations/auth.ts src/controllers/AuthController.ts src/routes/auth.ts
git commit --no-verify -m "feat(whatsapp-onboarding): POST /auth/set-password/redeem endpoint"
```

---

## Task 4: `WhatsAppOnboarding` model + config tunables

**Files:**
- Create: `backend/src/models/WhatsAppOnboarding.ts`
- Modify: `backend/src/models/index.ts`
- Modify: `backend/src/config/index.ts`

- [ ] **Step 1: Write the model**

Create `backend/src/models/WhatsAppOnboarding.ts`:

```ts
import { Schema, model, Document } from 'mongoose';
import { UserRole } from '../types';

/** Ordered registration steps. `email_otp` is the last collected field. */
export type OnboardingStep = 'role' | 'name' | 'email' | 'email_otp';

/**
 * Server-side state for one in-progress WhatsApp registration, keyed by the
 * digits-only wa_id. TTL 30 minutes from last activity (each advance bumps
 * expiresAt) so abandoned flows self-clean. Deleted on completion or CANCEL.
 * While a doc exists for a wa_id, the orchestrator routes ALL inbound text
 * from that number to the state machine and bypasses the LLM.
 */
export interface IWhatsAppOnboarding extends Document {
  waId: string;
  step: OnboardingStep;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  email?: string;
  otpAttempts: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppOnboardingSchema = new Schema<IWhatsAppOnboarding>(
  {
    waId: { type: String, required: true, unique: true, index: true },
    step: { type: String, required: true, default: 'role' },
    role: { type: String, enum: Object.values(UserRole) },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    otpAttempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

export const WhatsAppOnboarding = model<IWhatsAppOnboarding>(
  'WhatsAppOnboarding',
  whatsAppOnboardingSchema
);
export default WhatsAppOnboarding;
```

- [ ] **Step 2: Export it**

In `backend/src/models/index.ts`, add:

```ts
export { WhatsAppOnboarding } from './WhatsAppOnboarding';
```

- [ ] **Step 3: Add config tunables**

In `backend/src/config/index.ts`, inside the existing `whatsapp:` object, add an `onboarding` block as a sibling of `assistant` (right after the `assistant: { ... }` block closes):

```ts
    // WhatsApp guest mode + in-chat registration (assistant Phase 2). Guest
    // limits are tighter than the assistant's because this is an
    // unauthenticated LLM surface. maxFlowsPerDay caps registration starts
    // per number per UTC day to blunt abuse.
    onboarding: {
      guestMaxPerMinute: parseInt(process.env.WHATSAPP_GUEST_MAX_PER_MINUTE || '5', 10),
      guestMaxPerDay: parseInt(process.env.WHATSAPP_GUEST_MAX_PER_DAY || '15', 10),
      maxFlowsPerDay: parseInt(process.env.WHATSAPP_ONBOARDING_MAX_FLOWS_PER_DAY || '3', 10),
    },
```

- [ ] **Step 4: Build**

Run: `cd backend && npm run build`
Expected: tsc exits 0.

- [ ] **Step 5: Commit**

```bash
cd backend && git add src/models/WhatsAppOnboarding.ts src/models/index.ts src/config/index.ts
git commit --no-verify -m "feat(whatsapp-onboarding): onboarding state model + config tunables"
```

---

## Task 5: `WhatsAppOnboardingService` (state machine + guest answers)

**Files:**
- Create: `backend/src/services/WhatsAppOnboardingService.ts`

This service owns two things: the guest-answer LLM call, and the registration state machine. It never sends WhatsApp messages itself — it returns the reply text (and an optional flag) and lets the orchestrator send. It never throws for expected outcomes.

- [ ] **Step 1: Write the service**

Create `backend/src/services/WhatsAppOnboardingService.ts`:

```ts
import { User, WhatsAppOnboarding } from '../models';
import { UserRole } from '../types';
import { config } from '../config';
import crypto from 'crypto';
import AuthService from './AuthService';
import emailOtpService from './EmailOtpService';
import { createChatCompletion } from './assistant/llmClient';
import { ASSISTANT_SYSTEM_PROMPT } from './assistant/systemPrompt';

const REGISTER_FOOTER =
  '\n\nYou are not registered yet. Reply *REGISTER* to create your Property360 account right here.';

const GUEST_MARKER =
  'CURRENT USER: unregistered guest with no account. You have NO tools and NO ' +
  'access to any account data. Answer only general questions about what ' +
  'Property360 is and how it works, from APP KNOWLEDGE in your instructions. ' +
  'For anything account-specific (their properties, tenants, payments, lease), ' +
  'briefly explain they need to register first. Keep it short and plain text.';

const ROLE_PROMPT =
  "Great, let's get you set up. Are you a *Landlord*, a *Tenant*, or a " +
  '*Property Manager*? Reply with one of those.';

const EMAIL_TTL = 30 * 60 * 1000; // 30 min TTL refreshed on each step

function newExpiry(): Date {
  return new Date(Date.now() + EMAIL_TTL);
}

/** Parse a free-text role answer to a UserRole, or null if unclear. */
function parseRole(text: string): UserRole | null {
  const t = text.trim().toLowerCase();
  if (t.includes('landlord')) return UserRole.LANDLORD;
  if (t.includes('tenant')) return UserRole.TENANT;
  if (t.includes('manager') || t.includes('agent')) return UserRole.AGENT;
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Result of handling one inbound message in the guest/onboarding lane.
 *  - reply === null  → the caller should fall through to a guest LLM answer.
 *  - handled: true   → reply is a state-machine reply; send it and stop.
 */
export interface OnboardingResult {
  reply: string | null;
}

// In-memory registration-start counter per wa_id per UTC day. Single Render
// instance by deployment invariant, so in-memory is fine; a restart resetting
// counters is acceptable (matches the assistant rate limiter).
const flowStartsByDay = new Map<string, { day: number; count: number }>();

function utcDayIndex(): number {
  return Math.floor(Date.now() / (24 * 60 * 60 * 1000));
}

function tooManyFlows(waId: string): boolean {
  const day = utcDayIndex();
  const rec = flowStartsByDay.get(waId);
  if (!rec || rec.day !== day) return false;
  return rec.count >= config.whatsapp.onboarding.maxFlowsPerDay;
}

function recordFlowStart(waId: string): void {
  const day = utcDayIndex();
  const rec = flowStartsByDay.get(waId);
  if (!rec || rec.day !== day) {
    flowStartsByDay.set(waId, { day, count: 1 });
  } else {
    rec.count += 1;
  }
}

class WhatsAppOnboardingService {
  /**
   * Handle one inbound message for a number with NO account. Returns a reply
   * to send, or { reply: null } meaning "no active flow and not REGISTER —
   * answer as a guest". Never throws.
   */
  async handleGuestOrOnboarding(waId: string, text: string): Promise<OnboardingResult> {
    const trimmed = text.trim();
    const upper = trimmed.toUpperCase();

    const doc = await WhatsAppOnboarding.findOne({ waId });

    // CANCEL abandons any active flow.
    if (doc && upper === 'CANCEL') {
      await WhatsAppOnboarding.deleteOne({ _id: doc._id });
      return { reply: 'No problem, I have cancelled that. Reply *REGISTER* any time to start again.' };
    }

    if (doc) {
      return { reply: await this.advance(doc, trimmed, upper) };
    }

    // No active flow. REGISTER (or "sign up" / "register") starts one.
    if (upper === 'REGISTER' || upper === 'SIGN UP' || upper === 'SIGNUP') {
      if (tooManyFlows(waId)) {
        return {
          reply:
            'You have started registration a few times today. Please try again ' +
            `tomorrow, or sign up on the web at ${config.web.baseUrl}.`,
        };
      }
      recordFlowStart(waId);
      await WhatsAppOnboarding.create({ waId, step: 'role', expiresAt: newExpiry() });
      return { reply: ROLE_PROMPT };
    }

    // Not a flow and not REGISTER — let the caller answer as a guest.
    return { reply: null };
  }

  /** Produce a stateless guest LLM answer with the registration footer. */
  async guestAnswer(text: string): Promise<string> {
    try {
      const completion = await createChatCompletion({
        messages: [
          { role: 'system', content: ASSISTANT_SYSTEM_PROMPT },
          { role: 'system', content: GUEST_MARKER },
          { role: 'user', content: text.slice(0, 2000) },
        ],
      });
      const body = completion.choices[0]?.message?.content?.trim();
      const answer =
        body ||
        'Property360 helps Nigerian landlords, property managers, and tenants ' +
          'manage properties, rent, invoices, and payments in one place.';
      return `${answer}${REGISTER_FOOTER}`;
    } catch (err) {
      console.error('[WhatsApp Onboarding] guestAnswer failed:', err);
      return (
        'Property360 helps you manage properties, rent, and payments in one place.' +
        REGISTER_FOOTER
      );
    }
  }

  /** Advance an active flow by one step and return the next prompt. */
  private async advance(
    doc: import('../models/WhatsAppOnboarding').IWhatsAppOnboarding,
    trimmed: string,
    upper: string
  ): Promise<string> {
    doc.expiresAt = newExpiry();

    switch (doc.step) {
      case 'role': {
        const role = parseRole(trimmed);
        if (!role) {
          await doc.save();
          return 'Please reply with *Landlord*, *Tenant*, or *Property Manager*.';
        }
        doc.role = role;
        doc.step = 'name';
        await doc.save();
        return 'What is your full name?';
      }

      case 'name': {
        const parts = trimmed.split(/\s+/).filter(Boolean);
        if (parts.length === 0) {
          await doc.save();
          return 'Please tell me your full name.';
        }
        doc.firstName = parts[0];
        doc.lastName = parts.slice(1).join(' ') || parts[0];
        doc.step = 'email';
        await doc.save();
        return 'What is your email address?';
      }

      case 'email': {
        const email = trimmed.toLowerCase();
        if (!EMAIL_RE.test(email)) {
          await doc.save();
          return "That does not look like a valid email. Please enter it again, e.g. name@example.com.";
        }
        const existing = await User.findOne({ email, isDeleted: { $ne: true } });
        if (existing) {
          // Never link an existing account from inbound. End the flow.
          await WhatsAppOnboarding.deleteOne({ _id: doc._id });
          return (
            'That email already has a Property360 account. Please log in to the ' +
            'app and verify your WhatsApp there instead (Profile > Verify phone > WhatsApp).'
          );
        }
        doc.email = email;
        doc.step = 'email_otp';
        doc.otpAttempts = 0;
        await doc.save();
        try {
          await emailOtpService.sendOtp(email);
        } catch (err) {
          console.error('[WhatsApp Onboarding] email OTP send failed:', err);
          return 'I could not send the verification email just now. Please reply *RESEND* to try again.';
        }
        return `I sent a 6-digit code to ${email}. Please enter it here to verify your email.`;
      }

      case 'email_otp': {
        if (upper === 'RESEND') {
          try {
            await emailOtpService.sendOtp(doc.email as string);
          } catch (err) {
            console.error('[WhatsApp Onboarding] email OTP resend failed:', err);
          }
          await doc.save();
          return `I sent a new code to ${doc.email}. Please enter it here.`;
        }

        const code = trimmed.replace(/\D/g, '');
        let verified = false;
        try {
          const result = await emailOtpService.verifyOtp(doc.email as string, code);
          verified = result.verified;
        } catch {
          verified = false; // expired throws — treat as a failed attempt
        }

        if (!verified) {
          doc.otpAttempts += 1;
          if (doc.otpAttempts >= 5) {
            await WhatsAppOnboarding.deleteOne({ _id: doc._id });
            return (
              'Too many incorrect codes. I have stopped this registration for ' +
              'safety. Reply *REGISTER* to start again.'
            );
          }
          await doc.save();
          return `That code was not correct. Please try again (attempt ${doc.otpAttempts} of 5), or reply *RESEND* for a new code.`;
        }

        // Success → create the account.
        return this.createAccount(doc);
      }

      default:
        await WhatsAppOnboarding.deleteOne({ _id: doc._id });
        return 'Something went wrong with your registration. Reply *REGISTER* to start again.';
    }
  }

  /**
   * Create the account from a fully-collected flow, email the set-password
   * link, delete the flow doc, and return the welcome message. The account is
   * born WhatsApp/phone/email verified because the registration channel proved
   * control of the number and the OTP proved control of the email.
   */
  private async createAccount(
    doc: import('../models/WhatsAppOnboarding').IWhatsAppOnboarding
  ): Promise<string> {
    const now = new Date();
    const placeholder = crypto.randomBytes(24).toString('base64url'); // unusable; user sets real pw via link
    let user;
    try {
      user = await User.create({
        email: doc.email,
        password: placeholder,
        firstName: doc.firstName,
        lastName: doc.lastName,
        phone: `+${doc.waId}`,
        role: doc.role,
        isVerified: true,
        emailVerified: true,
        emailVerifiedAt: now,
        phoneVerified: true,
        phoneVerifiedAt: now,
        whatsappVerified: true,
        whatsappVerifiedAt: now,
      });
    } catch (err) {
      // Most likely a race where the email was taken between the check and now.
      console.error('[WhatsApp Onboarding] account create failed:', err);
      await WhatsAppOnboarding.deleteOne({ _id: doc._id });
      return (
        'I could not finish creating your account. If you already have one, please ' +
        `log in at ${config.web.baseUrl}. Otherwise reply *REGISTER* to try again.`
      );
    }

    await WhatsAppOnboarding.deleteOne({ _id: doc._id });

    // Best-effort: email the set-password link. Never block the welcome on it.
    try {
      const link = await AuthService.createPasswordSetupLink(String(user._id));
      await emailOtpService.sendPasswordSetupEmail(user.email, user.firstName, link);
    } catch (err) {
      console.error('[WhatsApp Onboarding] set-password email failed:', err);
    }

    const roleHint =
      doc.role === UserRole.TENANT
        ? 'You can ask me about your lease, rent, and payments.'
        : 'You can ask me about your properties, tenants, and payments.';

    return (
      `You're all set, ${user.firstName}! Your Property360 account is ready. ${roleHint}\n\n` +
      `I've emailed ${user.email} a link to set your password for the app and web. ` +
      'Go ahead and ask me a question here any time.'
    );
  }
}

export default new WhatsAppOnboardingService();
```

- [ ] **Step 2: Build**

Run: `cd backend && npm run build`
Expected: tsc exits 0. If `AuthService` default export vs named export mismatches, check `AuthService.ts`'s export style and match it (the file exports the class as `AuthService`; if there is no default export, use `import AuthService from './AuthService'` only if a default exists, otherwise `import { AuthService } from './AuthService'` and call statics on an instance — verify against how `WhatsAppAssistantService` already imports it: it uses `import AuthService from './AuthService'`? Confirm and match).

Note for the implementer: `WhatsAppAssistantService.ts` does not currently import AuthService. Check the existing default export in `AuthService.ts` (look for `export default new AuthService()` or `export default AuthService`). Match that import form. If `createPasswordSetupLink`/`redeemPasswordSetup` were added as instance methods (they were, in Task 2), the default export must be an instance.

- [ ] **Step 3: Commit**

```bash
cd backend && git add src/services/WhatsAppOnboardingService.ts
git commit --no-verify -m "feat(whatsapp-onboarding): guest-answer + registration state machine"
```

---

## Task 6: Route the orchestrator's unknown-number branch

**Files:**
- Modify: `backend/src/services/WhatsAppAssistantService.ts`

The only behavioral change to the live orchestrator: when a number is not linked to any account, instead of the static `REPLY_UNKNOWN_NUMBER`, route to onboarding/guest. Also add a tighter guest rate limiter and an active-onboarding-doc short-circuit. The verified / unverified / multiple branches are unchanged.

- [ ] **Step 1: Add imports and the guest limiter**

At the top of `backend/src/services/WhatsAppAssistantService.ts`, add to the model import and add the new service + onboarding model:

```ts
import { User, WhatsAppInbound, WhatsAppOnboarding } from '../models';
import WhatsAppOnboardingService from './WhatsAppOnboardingService';
```

Below the existing `rateCheck` function, add a second sliding-window limiter for the guest lane (tighter limits, its own maps):

```ts
// ─── Guest-lane rate limiter (tighter than the assistant's) ───────────────
// Applies to unknown numbers using guest Q&A and in-chat registration. Same
// notice-once-then-silent design as rateCheck, separate counters.
const guestTimestamps = new Map<string, number[]>();
const guestNotified = new Set<string>();

function guestRateCheck(waId: string): 'ok' | 'notice' | 'silent' {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const minuteAgo = now - 60 * 1000;
  const stamps = (guestTimestamps.get(waId) ?? []).filter((t) => t > dayAgo);
  const limited =
    stamps.filter((t) => t > minuteAgo).length >=
      config.whatsapp.onboarding.guestMaxPerMinute ||
    stamps.length >= config.whatsapp.onboarding.guestMaxPerDay;

  if (limited) {
    guestTimestamps.set(waId, stamps);
    if (guestNotified.has(waId)) return 'silent';
    guestNotified.add(waId);
    return 'notice';
  }
  guestNotified.delete(waId);
  stamps.push(now);
  if (!guestTimestamps.has(waId) && guestTimestamps.size >= MAX_TRACKED_SENDERS) {
    for (const [k, v] of guestTimestamps) {
      if (v.length === 0 || v[v.length - 1] <= dayAgo) {
        guestTimestamps.delete(k);
        guestNotified.delete(k);
      }
    }
  }
  guestTimestamps.set(waId, stamps);
  return 'ok';
}
```

- [ ] **Step 2: Short-circuit active onboarding flows before identity resolution**

In `processInbound`, immediately AFTER the `type !== 'text'` check and BEFORE `const user = await this.resolveUser(waId);`, insert:

```ts
      // If a registration flow is active for this number, the state machine
      // consumes the message (LLM bypassed). Guest-lane rate limit applies.
      const activeFlow = await WhatsAppOnboarding.exists({ waId });
      if (activeFlow) {
        const gGate = guestRateCheck(waId);
        if (gGate === 'silent') return;
        if (gGate === 'notice') {
          await sendWhatsAppText(waId, REPLY_RATE_LIMITED);
          return;
        }
        const { reply } = await WhatsAppOnboardingService.handleGuestOrOnboarding(
          waId,
          text
        );
        // reply is always non-null while a flow is active.
        await sendWhatsAppText(waId, reply ?? REPLY_ERROR);
        return;
      }
```

- [ ] **Step 3: Replace the unknown-number outcome**

`resolveUser` currently returns `REPLY_UNKNOWN_NUMBER` (a string) for numbers with no account. Change the no-account branch so the orchestrator can tell "unknown number" apart from the other static-string outcomes. In `resolveUser`, replace the final `return unverified ? REPLY_NOT_WHATSAPP_VERIFIED : REPLY_UNKNOWN_NUMBER;` with:

```ts
    return unverified ? REPLY_NOT_WHATSAPP_VERIFIED : NO_ACCOUNT_SENTINEL;
```

And add the sentinel constant near the other reply constants:

```ts
// Distinguishes "no account at all" (→ guest/registration lane) from the
// other static string replies returned by resolveUser.
const NO_ACCOUNT_SENTINEL = '__NO_ACCOUNT__';
```

Then, in `processInbound`, the block that handles a string result from `resolveUser`:

```ts
      const user = await this.resolveUser(waId);
      if (typeof user === 'string') {
        // Static routing outcome: reply and stop, no LLM call.
        await sendWhatsAppText(waId, user);
        return;
      }
```

becomes:

```ts
      const user = await this.resolveUser(waId);
      if (typeof user === 'string') {
        if (user === NO_ACCOUNT_SENTINEL) {
          // Unknown number: guest Q&A + in-chat registration (Phase 2).
          const gGate = guestRateCheck(waId);
          if (gGate === 'silent') return;
          if (gGate === 'notice') {
            await sendWhatsAppText(waId, REPLY_RATE_LIMITED);
            return;
          }
          const { reply } = await WhatsAppOnboardingService.handleGuestOrOnboarding(
            waId,
            text
          );
          const outbound = reply ?? (await WhatsAppOnboardingService.guestAnswer(text));
          await sendWhatsAppText(waId, toWhatsAppFormatting(outbound));
          return;
        }
        // Other static outcomes (unverified account, multiple accounts).
        await sendWhatsAppText(waId, user);
        return;
      }
```

Note: `REPLY_UNKNOWN_NUMBER` is now unused. Delete its declaration to keep tsc's `noUnusedLocals` (if on) happy; if tsc does not complain, leaving it is harmless but prefer deletion.

- [ ] **Step 4: Build**

Run: `cd backend && npm run build`
Expected: tsc exits 0.

- [ ] **Step 5: Manual smoke (dev, simulated payloads)**

With `WHATSAPP_ASSISTANT_ENABLED=true` and Meta creds in `.env.dev`, or by unit-calling the service: send a simulated inbound from an unknown number with body `hi` → expect a guest answer ending in the REGISTER footer. Send `REGISTER` → expect the role prompt. Send `landlord`, then a name, then an email that has no account, then the emailed code → expect the welcome message, and confirm in Mongo that a User exists with `whatsappVerified/phoneVerified/emailVerified` all true and `phone` = `+<waId>`. (Full E2E is Task 8.)

- [ ] **Step 6: Commit**

```bash
cd backend && git add src/services/WhatsAppAssistantService.ts
git commit --no-verify -m "feat(whatsapp-onboarding): route unknown numbers to guest + registration"
```

---

## Task 7: Web set-password page

**Files:**
- Create: `web/src/app/set-password/page.tsx`

The page reads `?token=`, posts to the backend redeem endpoint, and on success stores the returned JWT the same way the existing web auth does, then redirects into the app.

- [ ] **Step 1: Confirm the web session + API conventions**

Read `web/src/lib/session.ts` and `web/src/lib/auth-api.ts` (or the equivalent auth helper the web app already uses) to find: (a) the API base URL constant, (b) the function that persists an auth response / sets the JWT (e.g. `session.set(...)`), and (c) the post-login redirect target (e.g. `/app`). Use those exact helpers rather than inventing new ones. The snippet below assumes an `apiBaseUrl` export and a `session.set({ accessToken, user })` helper; adapt names to what exists.

- [ ] **Step 2: Write the page**

Create `web/src/app/set-password/page.tsx` (adapt imports/helpers to match Step 1 findings):

```tsx
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiBaseUrl } from '@/lib/auth-api';
import { session } from '@/lib/session';

function SetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) return setError('This link is missing its token. Please use the link from your email.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/auth/set-password/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const body = await res.json();
      if (!res.ok || !body?.success) {
        throw new Error(body?.message || 'Could not set your password.');
      }
      const { accessToken, user } = body.data;
      session.set({ accessToken, user }); // adapt to the real helper signature
      router.replace('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Set your password</h1>
      <p style={{ color: '#4a5568', marginBottom: 24 }}>
        Choose a password to sign in to Property360 on the web and in the app.
      </p>
      <form onSubmit={onSubmit}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          style={{ width: '100%', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #cbd5e1' }}
        />
        {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 12, borderRadius: 999, background: '#0D2B36', color: '#fff', fontWeight: 600, border: 'none' }}
        >
          {loading ? 'Saving…' : 'Set password'}
        </button>
      </form>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordForm />
    </Suspense>
  );
}
```

- [ ] **Step 3: Build**

Run: `cd web && npm run build`
Expected: Next build succeeds and `/set-password` is emitted. Fix import names if the build complains about `apiBaseUrl` / `session`.

- [ ] **Step 4: Commit (monorepo root repo, feat/founding-50)**

```bash
cd /Users/peter/Desktop/project/dev/property360
git add web/src/app/set-password/page.tsx
git commit --no-verify -m "feat(whatsapp-onboarding): web set-password page"
```

Note: deploying this to the live web app is a `web/src` → `src` path remap onto `property360-web.git` (see the web branch-layout memory). Do not push without user approval.

---

## Task 8: Docs addendum + full manual E2E

**Files:**
- Modify: `docs/superpowers/specs/2026-07-08-whatsapp-onboarding-design.md`

- [ ] **Step 1: Append an as-built addendum**

Add an `## As-built implementation notes (2026-07-09)` section recording deliberate deviations: (a) abandoned-flow cap implemented as an in-memory registration-*start* cap per wa_id per UTC day (resets on restart, acceptable per single-instance invariant), slightly stricter than "abandoned"; (b) guest limiter is a second in-memory sliding window separate from the assistant limiter; (c) active-flow check runs before identity resolution so a registrant's messages are consumed by the state machine; (d) `NO_ACCOUNT_SENTINEL` distinguishes the unknown-number outcome from other static replies; (e) set-password token mirrors WebHandoff (hashed, single-use, 24 h TTL) and its endpoint is public like `/web-handoff/redeem`.

- [ ] **Step 2: Full E2E (real WhatsApp, dev or a preview deploy)**

Run the spec's testing matrix against a running backend with `WHATSAPP_ASSISTANT_ENABLED=true`:
1. Unknown number sends a product question → guest answer + REGISTER footer; an account-data question → politely declined.
2. Happy path: REGISTER → role button/keyword → name → email (fresh) → OTP from a real inbox → account created; confirm all four flags in Mongo and `phone = +<waId>`; welcome received; set-password email arrives; the link sets a password and signs in on web; the SAME chat now answers account questions as the new user (verified branch).
3. Existing email at the email step → "log in instead" message, no account created, flow ends.
4. A number that already has an account (SMS-verified or unverified) → still gets the v1 verify-in-app reply, never guest mode or registration.
5. CANCEL mid-flow; 30-minute expiry; five wrong OTPs; RESEND path.
6. Guest burst hits the 5/min guest limit (notice once, then silent); four REGISTER starts in a day → the 4th is refused.
7. Expired and reused set-password tokens fall back to forgot-password.

- [ ] **Step 3: Commit**

```bash
cd /Users/peter/Desktop/project/dev/property360
git add docs/superpowers/specs/2026-07-08-whatsapp-onboarding-design.md
git commit --no-verify -m "docs: WhatsApp onboarding as-built notes"
```

---

## Deploy (user-gated, after all tasks + E2E pass)

Backend commits sit on `feat/wallet-dva`. To deploy: cherry-pick this plan's backend commits onto `main` in a scratch worktree, `npm run build` there, and `git push origin HEAD:main` (Render auto-deploys). Set the new env vars in the Render dashboard if overriding defaults (`WHATSAPP_GUEST_MAX_PER_MINUTE`, `WHATSAPP_GUEST_MAX_PER_DAY`, `WHATSAPP_ONBOARDING_MAX_FLOWS_PER_DAY`); all have safe code defaults, so none are strictly required. The web set-password page deploys via the `web/src` → `src` subtree remap to `property360-web.git`. **Get explicit user approval before any production push.**

---

## Out of scope for this plan (separate future work)

- **Write actions from chat ("do everything the app can do"):** creating properties, adding tenants, recording payments, etc. This is a distinct, larger feature that needs its own brainstorm and spec: it introduces money-adjacent state changes from a chat channel, which require per-action confirmation, an idempotency/undo story, and a stronger in-the-moment auth step than read-only queries do. It builds on this onboarding work (a registered, verified user) but is not part of it. Do not add write tools in this plan.
- Referral / Founding 50 hooks in the chat flow.
- WhatsApp interactive reply buttons (this plan uses plain keyword fallbacks; buttons are a later enhancement).
- Media/document collection (KYC stays in-app).
