# WhatsApp Signup OTP (Meta-direct) — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver phone-verification OTPs over WhatsApp using Meta's Cloud API directly, with automatic SMS fallback, behind a default-off flag.

**Architecture:** WhatsApp OTP becomes a Meta-direct leg inside `OtpService`: it generates + HMAC-hashes the code itself and sends it through a Meta authentication template; on a not-delivered result it falls back to the existing SMS provider (Termii/VTpass) in the same request. `verifyOtp` becomes record-driven so a Meta-WhatsApp send and a Termii-hosted SMS send can coexist in one ladder. The already-live `/auth/phone/send-verification` and `/auth/phone/verify` endpoints and their `AuthService`/`AuthController` layers are unchanged — only the transport underneath changes.

**Tech Stack:** Node.js / Express 5 / TypeScript, Mongoose (`PhoneOtp`), axios, Meta Graph API.

**No test runner.** Per repo convention (`CLAUDE.md`: "No tests in any package"), the per-task gate is `cd backend && npm run build` (tsc must exit 0). Correctness is exercised with the manual curl checklist in Task 6. Do not add a test framework.

**Intentional behavior change to note:** the never-shipped Termii-WhatsApp OTP path (it required `TERMII_WHATSAPP_DEVICE_ID`, which was never set) is retired. WhatsApp OTP is now Meta-only; Termii/VTpass back only the SMS fallback. This is safe because `channel: 'whatsapp'` reaches `sendOtp` from exactly one caller (`AuthService.sendPhoneVerification`), and in every real deployment to date `SMS_ENABLED=false` made that path return 503 anyway.

---

### Task 1: Add `config.whatsapp.otp` config block

**Files:**
- Modify: `backend/src/config/index.ts` (inside the `whatsapp:` block, immediately after the `meta: { … },` block that closes near line 184)

- [ ] **Step 1: Add the config block**

Insert, between the closing `},` of the `meta:` block and the `sendchamp: {` line:

```ts
    // WhatsApp OTP delivery (Meta-direct). Independent of the transactional
    // template pipeline above and of the SMS provider: OtpService owns the
    // code (generate → HMAC → verify) and sends it via a Meta authentication
    // template, falling back to the SMS provider on a not-delivered result.
    // enabled=false keeps the WhatsApp OTP leg inert so this deploys dark
    // until the auth template is approved AND SMS_ENABLED is on (ship gate).
    otp: {
      enabled:
        (process.env.WHATSAPP_OTP_ENABLED ?? 'false').toLowerCase() === 'true',
      provider: (process.env.WHATSAPP_OTP_PROVIDER || 'meta').toLowerCase() as
        | 'meta'
        | 'termii',
      // Name of the approved Meta authentication template (Meta keys templates
      // by name). The code is passed as the body variable AND the URL-button
      // variable — Meta requires it to appear twice in the payload.
      templateName: process.env.META_WHATSAPP_OTP_TEMPLATE || '',
    },
```

- [ ] **Step 2: Build**

Run: `cd backend && npm run build`
Expected: tsc exits 0.

- [ ] **Step 3: Commit**

```bash
git add backend/src/config/index.ts
git commit --no-verify -m "feat(otp): add config.whatsapp.otp block for Meta-direct WhatsApp OTP"
```

---

### Task 2: Add `sendMetaAuthOtp()` to WhatsAppService

**Files:**
- Modify: `backend/src/services/WhatsAppService.ts` (add a module-level exported function immediately after `digitsOnlyE164` ends, around line 77, before the `// ─── Provider contract ───` divider)

- [ ] **Step 1: Add the auth-OTP sender**

```ts
/** Result of a Meta authentication-template OTP send. */
export type MetaAuthOtpResult =
  | { status: 'sent'; providerMessageId?: string }
  | { status: 'not_delivered' } // recipient not reachable on WhatsApp
  | { status: 'error'; reason: string };

// Meta error codes reported synchronously that mean "this number can't
// receive the WhatsApp message" (not on WhatsApp / undeliverable), so the
// caller should fall back to SMS. NOTE: most real "not on WhatsApp" cases
// surface ASYNCHRONOUSLY via a failed status webhook, which the client
// handles with the manual "Send via SMS instead" button. This set only
// covers the subset Meta returns on the send call itself.
const META_NOT_DELIVERED_CODES = new Set([131026, 131047, 131052, 131000]);

/**
 * Send a one-time code over WhatsApp using a Meta-approved AUTHENTICATION
 * template. The code appears twice in the payload: once in the body variable
 * and once in the URL-button variable (Meta's authentication-template
 * contract). Returns a discriminated result so the OTP ladder can decide
 * whether to fall back to SMS. Never throws.
 */
export async function sendMetaAuthOtp(
  phoneE164DigitsOnly: string,
  code: string
): Promise<MetaAuthOtpResult> {
  if (!config.whatsapp.meta.phoneNumberId || !config.whatsapp.meta.accessToken) {
    return { status: 'error', reason: 'meta_not_configured' };
  }
  const templateName = config.whatsapp.otp.templateName;
  if (!templateName) {
    return { status: 'error', reason: 'no_otp_template' };
  }

  const url =
    `${META_GRAPH_BASE}/${config.whatsapp.meta.apiVersion}` +
    `/${config.whatsapp.meta.phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: phoneE164DigitsOnly,
    type: 'template',
    template: {
      name: templateName,
      language: { code: config.whatsapp.meta.languageCode },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: code }] },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: code }],
        },
      ],
    },
  };

  try {
    const res = await axios.post(url, payload, {
      timeout: 10_000,
      headers: {
        Authorization: `Bearer ${config.whatsapp.meta.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    const body = res.data as { messages?: Array<{ id?: string }> };
    return { status: 'sent', providerMessageId: body?.messages?.[0]?.id };
  } catch (err) {
    const ax = err as AxiosError<{ error?: { message?: string; code?: number } }>;
    const metaErr = ax.response?.data?.error;
    console.error(
      '[WhatsApp Meta OTP] send failed:',
      ax.response?.status,
      metaErr ?? ax.message
    );
    if (metaErr?.code && META_NOT_DELIVERED_CODES.has(metaErr.code)) {
      return { status: 'not_delivered' };
    }
    return { status: 'error', reason: metaErr?.message || ax.message };
  }
}
```

This reuses the module's existing imports (`axios`, `AxiosError`, `config`) and the `META_GRAPH_BASE` constant already declared at the top of the file.

- [ ] **Step 2: Build**

Run: `cd backend && npm run build`
Expected: tsc exits 0.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/WhatsAppService.ts
git commit --no-verify -m "feat(otp): add sendMetaAuthOtp for Meta authentication-template OTP"
```

---

### Task 3: Add the Meta WhatsApp leg + SMS-fallback extraction to `OtpService.sendOtp`

**Files:**
- Modify: `backend/src/services/OtpService.ts` (import, `sendOtp`, add three private methods)

- [ ] **Step 1: Import the Meta sender**

At the top of the file, add after the existing import block (after `import { PhoneOtp } from '../models';`):

```ts
import { sendMetaAuthOtp } from './WhatsAppService';
```

(No circular import: `WhatsAppService` does not import `OtpService`.)

- [ ] **Step 2: Replace the body of `sendOtp` with the Meta branch + delegation**

Replace the entire current `sendOtp` method (from `async sendOtp(to: string, channel: OtpChannel): Promise<SendOtpResult> {` through its closing `}` before `async verifyOtp`) with:

```ts
  async sendOtp(to: string, channel: OtpChannel): Promise<SendOtpResult> {
    if (channel === 'email') {
      throw new AppError(
        'Email OTPs go through EmailOtpService, not Termii.',
        400
      );
    }

    const formattedTo = this.formatPhoneNumber(to);

    // Meta-direct WhatsApp OTP leg. Gated by its own flag (deploys dark) and
    // independent of config.sms.enabled — the SMS provider only backs the
    // fallback inside this method. Everything below stays the SMS-only path.
    if (
      channel === 'whatsapp' &&
      config.whatsapp.otp.enabled &&
      config.whatsapp.otp.provider === 'meta'
    ) {
      return this.sendMetaWhatsAppOtp(formattedTo);
    }

    if (!config.sms.enabled) {
      // Phone OTP is disabled at the env level (provider verification
      // pending). Surface a clean error so the client can fall back to email
      // OTP rather than retrying a doomed request.
      throw new AppError(
        'Phone verification is temporarily unavailable. Please use email instead.',
        503
      );
    }

    await this.enforceResendCooldown(formattedTo);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    return this.sendSmsOtpLegNoCooldown(formattedTo, expiresAt);
  }

  /**
   * Meta-direct WhatsApp OTP: enforce the resend cooldown once, generate +
   * hash our own code, send it via the Meta authentication template, and
   * persist a self-managed PhoneOtp record. On a not-delivered result (number
   * not on WhatsApp) fall back to the SMS leg in the same request WITHOUT
   * re-checking the cooldown (already enforced here).
   */
  private async sendMetaWhatsAppOtp(formattedTo: string): Promise<SendOtpResult> {
    await this.enforceResendCooldown(formattedTo);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    const code = this.generateOtpCode();

    const result = await sendMetaAuthOtp(formattedTo.replace(/^\+/, ''), code);

    if (result.status === 'sent') {
      await PhoneOtp.findOneAndUpdate(
        { phone: formattedTo },
        {
          codeHash: this.hashOtp(code),
          attempts: 0,
          pinId: undefined,
          channel: 'whatsapp',
          expiresAt,
        },
        { upsert: true, new: true }
      );
      return {
        success: true,
        message: 'Verification code sent to your WhatsApp',
        expiresAt: expiresAt.toISOString(),
        channelUsed: 'whatsapp',
      };
    }

    if (result.status === 'not_delivered') {
      console.warn(
        '[OtpService] Meta WhatsApp OTP not delivered — falling back to SMS.'
      );
      return this.sendSmsOtpLegNoCooldown(formattedTo, expiresAt);
    }

    // Hard error (bad token, template not approved, rate limit, network).
    throw new AppError(
      `WhatsApp OTP could not be sent: ${result.reason}`,
      502
    );
  }

  /** Reject a resend that arrives inside the per-phone cooldown window. */
  private async enforceResendCooldown(formattedTo: string): Promise<void> {
    const existing = await PhoneOtp.findOne({ phone: formattedTo }).sort({
      updatedAt: -1,
    });
    if (
      existing?.updatedAt &&
      Date.now() - existing.updatedAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      throw new AppError(
        'Please wait a minute before requesting another code.',
        429
      );
    }
  }

  /**
   * Send an SMS OTP (VTpass self-managed or Termii hosted 'dnd' route) and
   * persist the PhoneOtp record. No cooldown check — the caller enforces it
   * once per request so a WhatsApp→SMS fallback doesn't trip its own 429.
   * Requires config.sms.enabled; throws 503 otherwise.
   */
  private async sendSmsOtpLegNoCooldown(
    formattedTo: string,
    expiresAt: Date
  ): Promise<SendOtpResult> {
    if (!config.sms.enabled) {
      throw new AppError(
        'SMS delivery is unavailable, so we could not send your code. Please try again later.',
        503
      );
    }

    if (this.provider === 'vtpass') {
      const code = this.generateOtpCode();
      const messageText =
        `Your Property360 code is ${code}. It expires in ` +
        `${OTP_TTL_MINUTES} minutes. Don't share this code with anyone.`;
      await this.sendVtpassSms(formattedTo.replace(/^\+/, ''), messageText);
      await PhoneOtp.findOneAndUpdate(
        { phone: formattedTo },
        {
          codeHash: this.hashOtp(code),
          attempts: 0,
          pinId: undefined,
          channel: 'sms',
          expiresAt,
        },
        { upsert: true, new: true }
      );
      return {
        success: true,
        message: 'Verification code sent to phone',
        expiresAt: expiresAt.toISOString(),
        channelUsed: 'sms',
      };
    }

    const termiiTo = formattedTo.replace(/^\+/, '');
    const messageText =
      'Your Property360 code is < 1234 >. It expires in ' +
      `${OTP_TTL_MINUTES} minutes. Don't share this code with anyone.`;
    const resp = await this.sendOtpWithFallback(termiiTo, messageText);
    if (!resp.pinId) {
      throw new AppError(
        resp.message ?? 'Termii returned no pin_id for this OTP request.',
        502
      );
    }
    await PhoneOtp.findOneAndUpdate(
      { phone: formattedTo },
      { pinId: resp.pinId, codeHash: undefined, channel: 'sms', expiresAt },
      { upsert: true, new: true }
    );
    return {
      success: true,
      message: 'Verification code sent to phone',
      expiresAt: expiresAt.toISOString(),
      channelUsed: 'sms',
    };
  }
```

Note: the previous inline VTpass/Termii send logic now lives entirely in `sendSmsOtpLegNoCooldown`; make sure no duplicate of it remains in `sendOtp`. The private helpers `generateOtpCode`, `hashOtp`, `sendVtpassSms`, and `sendOtpWithFallback` already exist lower in the file and are reused unchanged.

- [ ] **Step 3: Build**

Run: `cd backend && npm run build`
Expected: tsc exits 0. If it reports an unused variable or a leftover `const formattedTo` in `sendOtp`, remove the stray line.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/OtpService.ts
git commit --no-verify -m "feat(otp): Meta WhatsApp OTP leg with SMS fallback in OtpService.sendOtp"
```

---

### Task 4: Make `OtpService.verifyOtp` record-driven

**Files:**
- Modify: `backend/src/services/OtpService.ts` (`verifyOtp`)

- [ ] **Step 1: Replace `verifyOtp` with a per-record branch**

Replace the entire current `verifyOtp` method with:

```ts
  async verifyOtp(
    to: string,
    code: string,
    channel: OtpChannel = 'sms'
  ): Promise<VerifyOtpResult> {
    if (channel === 'email') {
      throw new AppError(
        'Only phone OTP verification is handled here; email OTPs go through EmailOtpService.',
        400
      );
    }

    const formattedTo = this.formatPhoneNumber(to);
    const record = await PhoneOtp.findOne({ phone: formattedTo }).sort({
      createdAt: -1,
    });

    if (!record) {
      throw new AppError(
        'No active verification code for this phone. Request a new code.',
        400
      );
    }
    if (record.expiresAt.getTime() < Date.now()) {
      await PhoneOtp.deleteOne({ _id: record._id });
      throw new AppError('Verification code expired. Request a new one.', 400);
    }

    // Branch on the RECORD, not a global provider flag: a self-managed code
    // (Meta WhatsApp OTP or VTpass SMS) stores codeHash; a Termii hosted OTP
    // stores pinId. This lets a Meta-WhatsApp send fall back to a Termii-SMS
    // send within one ladder and still verify correctly.
    if (record.codeHash) {
      if ((record.attempts ?? 0) >= MAX_OTP_ATTEMPTS) {
        await PhoneOtp.deleteOne({ _id: record._id });
        throw new AppError(
          'Too many incorrect attempts. Request a new code.',
          429
        );
      }
      const matches = this.safeEqual(this.hashOtp(code), record.codeHash);
      if (!matches) {
        await PhoneOtp.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
        return { verified: false };
      }
      await PhoneOtp.deleteOne({ _id: record._id });
      return { verified: true, channel: record.channel ?? 'sms' };
    }

    if (record.pinId) {
      let body: TermiiOtpVerifyResp;
      try {
        const res = await axios.post<TermiiOtpVerifyResp>(
          `${TERMII_BASE}/api/sms/otp/verify`,
          { api_key: this.apiKey, pin_id: record.pinId, pin: code }
        );
        body = res.data;
      } catch (err) {
        const ax = err as AxiosError<TermiiOtpVerifyResp>;
        console.error(
          '[OtpService] Termii verify failed:',
          ax.response?.data ?? ax.message
        );
        return { verified: false };
      }
      const verified =
        body?.verified === true ||
        String(body?.verified).toLowerCase() === 'true';
      if (verified) {
        await PhoneOtp.deleteOne({ _id: record._id });
        return { verified, channel: record.channel ?? 'sms' };
      }
      return { verified };
    }

    // Record has neither shape — treat as no active code.
    throw new AppError(
      'No active verification code for this phone. Request a new code.',
      400
    );
  }
```

The two callers (`AuthService.verifyPhone` and `AuthController.verifyOtp`) both pass `'sms'` and are unaffected; `AuthService.verifyPhone` still reads `result.channel` to award `whatsappVerified`.

- [ ] **Step 2: Build**

Run: `cd backend && npm run build`
Expected: tsc exits 0.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/OtpService.ts
git commit --no-verify -m "refactor(otp): make verifyOtp record-driven (codeHash vs pinId)"
```

---

### Task 5: Document the new env vars

**Files:**
- Modify: `backend/.env.example`
- Modify: `backend/.env.prod.example`
- Modify: `backend/render.yaml` (this is the one Render deploys from; the monorepo-root `render.yaml` is a separate/mirror file and is NOT edited here)

- [ ] **Step 1: Add to both `.env.example` files**

Append near the other `META_WHATSAPP_*` / WhatsApp entries:

```
# WhatsApp OTP delivery (Meta-direct). Off by default; flip on only once the
# Meta authentication template is approved AND SMS_ENABLED=true (so the SMS
# fallback is real). WHATSAPP_OTP_PROVIDER is 'meta' today.
WHATSAPP_OTP_ENABLED=false
WHATSAPP_OTP_PROVIDER=meta
# Name of the approved Meta AUTHENTICATION template (Meta keys templates by name).
META_WHATSAPP_OTP_TEMPLATE=
```

- [ ] **Step 2: Add non-secret vars to `backend/render.yaml`**

In the backend service's `envVars:` list, matching the existing indentation, add:

```yaml
      - key: WHATSAPP_OTP_ENABLED
        value: "false"
      - key: WHATSAPP_OTP_PROVIDER
        value: meta
      - key: META_WHATSAPP_OTP_TEMPLATE
        sync: false
```

(`META_WHATSAPP_OTP_TEMPLATE` is `sync: false` so it's set in the Render dashboard once the template name is known, keeping the blueprint free of environment-specific values.)

- [ ] **Step 3: Build (sanity) + commit**

Run: `cd backend && npm run build`
Expected: tsc exits 0 (no code change, just confirms nothing broke).

```bash
# run from inside backend/ (nested repo):
git add .env.example .env.prod.example render.yaml
git commit --no-verify -m "chore(otp): document WHATSAPP_OTP_* env vars"
```

---

### Task 6: Manual E2E verification checklist

**Files:** none (verification only). There is no automated test runner; exercise the flow by hand.

- [ ] **Step 1: Flag-off regression (no live creds needed)**

With `WHATSAPP_OTP_ENABLED` unset/false and `SMS_ENABLED=false`, call `POST /auth/phone/send-verification` (Bearer token) with `{ "channel": "whatsapp" }`.
Expected: HTTP 503 "Phone verification is temporarily unavailable…" (unchanged from today — the Meta branch is skipped, SMS is off).

- [ ] **Step 2: WhatsApp happy path (needs approved template + WhatsApp number)**

Set `WHATSAPP_OTP_ENABLED=true`, `META_WHATSAPP_OTP_TEMPLATE=<approved name>`, valid `META_WHATSAPP_*`, and `SMS_ENABLED=true`. Call send-verification with `{ "channel": "whatsapp" }` for a WhatsApp-capable number.
Expected: 200 with `channelUsed: "whatsapp"`; the code arrives on WhatsApp. Then `POST /auth/phone/verify` with the code → 200, and the returned user has `phoneVerified: true` and `whatsappVerified: true`.

- [ ] **Step 3: SMS fallback (auto)**

Repeat Step 2 for a number that is NOT on WhatsApp (or temporarily point `META_WHATSAPP_OTP_TEMPLATE` at a name Meta rejects to force `not_delivered`/error handling).
Expected: for a synchronous not-delivered, the response is `channelUsed: "sms"` and the code arrives by SMS; verifying it sets `phoneVerified: true` but NOT `whatsappVerified`.

- [ ] **Step 4: Manual SMS button**

Call send-verification with `{ "channel": "sms" }` directly.
Expected: 200 `channelUsed: "sms"`, SMS delivered, verify sets `phoneVerified` only.

- [ ] **Step 5: Cooldown + lockout**

Two sends within 60s → second returns 429. Verify a wrong code 5 times on a self-managed (WhatsApp/VTpass) record → 6th returns 429 "Too many incorrect attempts."

- [ ] **Step 6: Final build**

Run: `cd backend && npm run build`
Expected: tsc exits 0.

---

## Self-review (completed by plan author)

- **Spec coverage:** Meta auth-template send (Task 2) ✓; Meta WhatsApp leg + auto SMS fallback (Task 3) ✓; record-driven verify refactor (Task 4) ✓; config + dark-deploy flag (Task 1) ✓; env/ship-gate docs (Task 5) ✓; no new routes / clients unchanged ✓ (spec's client work is the separate mobile + web plans). Manual "Send via SMS instead" button is a client concern, verified server-side by Task 6 Step 4.
- **Type consistency:** `SendOtpResult.channelUsed` is `'sms' | 'whatsapp'` throughout; `MetaAuthOtpResult` is the only new type and is consumed only in `sendMetaWhatsAppOtp`; `verifyOtp` keeps its `(to, code, channel)` signature.
- **Placeholder scan:** none; every step has concrete code or a concrete command. The Meta button payload uses `sub_type: 'url'` with the code as a text parameter (confirmed against current Cloud API authentication-template docs); if Meta revises the button parameter shape, Task 2 is the single place to adjust.
