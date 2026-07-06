# WhatsApp-First Phone OTP Ladder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver phone-verification OTPs over WhatsApp first with automatic SMS fallback, fix the SMS route to Termii's `dnd` channel, and add a `whatsappVerified` flag on User that only a WhatsApp-delivered code can earn.

**Architecture:** Backend-driven channel ladder inside the existing `OtpService` (Termii hosted OTP; VTpass degrades to SMS-only). `AuthService.verifyPhone` reads which channel actually delivered the code from the `PhoneOtp` record and sets `phoneVerified` always, `whatsappVerified` only for WhatsApp delivery. Mobile and web verify modals gain a channel switch and channel-aware copy. Spec: `docs/superpowers/specs/2026-07-06-whatsapp-first-phone-otp-design.md`.

**Tech Stack:** Express 5 + Mongoose (backend), React Native/Expo (mobile), Next.js 16 (web), Termii OTP API.

**Testing convention:** This repo has NO test runner in any package (CLAUDE.md convention, overrides TDD). Every task verifies via `npm run build` + `npm run lint`, and Task 6 is a mandatory manual end-to-end pass. Live sends require `SMS_ENABLED=true` and Termii credentials in `backend/.env.dev`.

**Ops prerequisite (before Task 6, not before coding):** Confirm in the Termii dashboard that the OTP API supports `channel: 'whatsapp'` on the current plan, and whether the `from` for WhatsApp sends is the `TERMII_WHATSAPP_DEVICE_ID` or the regular sender ID. The code parameterizes this so either works.

---

## File Structure

| File | Change |
| --- | --- |
| `backend/src/types/index.ts` | Add `whatsappVerified` / `whatsappVerifiedAt` to `IUser` |
| `backend/src/models/User.ts` | Same two fields in the schema |
| `backend/src/models/PhoneOtp.ts` | Add `channel` field + `createdAt`/`updatedAt` typings |
| `backend/src/services/OtpService.ts` | Channel ladder, `dnd` fix, cooldown, channel persistence, channel in verify result |
| `backend/src/services/AuthService.ts` | `serializeUser` fields, channel param, re-verification guards, flag setting |
| `backend/src/controllers/AuthController.ts` | Read `channel` from body, channel-aware message |
| `backend/src/validations/auth.ts` | `sendPhoneVerificationValidation` |
| `backend/src/routes/auth.ts` | Wire validation |
| `web/src/lib/session.ts` | `whatsappVerified` on `AdminUser` |
| `web/src/lib/auth-api.ts` | Channel param + `channelUsed` return |
| `web/src/components/app/PhoneVerifyModal.tsx` | Channel switch UI, cooldown countdown, channel-aware copy, analytics events |
| `mobile/src/types/index.ts` | `whatsappVerified` on `User` |
| `mobile/src/services/auth.ts` | Channel param + `PhoneVerificationResponse` |
| `mobile/src/hooks/useAuth.ts` | Channel variable on the send mutation |
| `mobile/src/components/PhoneVerifyModal.tsx` | Channel switch UI, cooldown countdown, channel-aware copy |

Note: mobile `phone_otp_sent` / `phone_otp_verified` analytics events are deliberately deferred to the `feat/analytics-posthog` branch merge (mobile has no PostHog client on this branch and no clean global no-op). Web uses a guarded `window.posthog` call that is a no-op until PostHog lands.

---

### Task 1: Data model fields (User, IUser, PhoneOtp, serializeUser)

**Files:**
- Modify: `backend/src/types/index.ts:51-52`
- Modify: `backend/src/models/User.ts:54-60`
- Modify: `backend/src/models/PhoneOtp.ts`
- Modify: `backend/src/services/AuthService.ts:21-22`

- [ ] **Step 1: Add fields to `IUser`**

In `backend/src/types/index.ts`, find:

```ts
  phoneVerified: boolean;
  phoneVerifiedAt?: Date;
```

Replace with:

```ts
  phoneVerified: boolean;
  phoneVerifiedAt?: Date;
  // Set only when a verification code was DELIVERED over WhatsApp and then
  // verified — proves control of the WhatsApp account, not just the number.
  // Gates the WhatsApp assistant channel.
  whatsappVerified: boolean;
  whatsappVerifiedAt?: Date;
```

- [ ] **Step 2: Add fields to the User schema**

In `backend/src/models/User.ts`, find:

```ts
    phoneVerifiedAt: {
      type: Date,
    },
```

Replace with:

```ts
    phoneVerifiedAt: {
      type: Date,
    },
    whatsappVerified: {
      type: Boolean,
      default: false,
    },
    whatsappVerifiedAt: {
      type: Date,
    },
```

- [ ] **Step 3: Add `channel` + timestamp typings to PhoneOtp**

In `backend/src/models/PhoneOtp.ts`, replace the interface:

```ts
export interface IPhoneOtp extends Document {
  phone: string;
  pinId?: string; // Termii hosted-OTP lookup key
  codeHash?: string; // VTpass self-managed OTP: HMAC-SHA256 of the code
  attempts?: number; // VTpass self-managed OTP: wrong-guess counter
  expiresAt: Date;
}
```

with:

```ts
export interface IPhoneOtp extends Document {
  phone: string;
  pinId?: string; // Termii hosted-OTP lookup key
  codeHash?: string; // VTpass self-managed OTP: HMAC-SHA256 of the code
  attempts?: number; // VTpass self-managed OTP: wrong-guess counter
  // Which channel actually delivered the code (post-fallback). Load-bearing:
  // verify reads it to decide whether the user earns whatsappVerified.
  channel?: 'sms' | 'whatsapp';
  expiresAt: Date;
  // Added by { timestamps: true }; declared so cooldown checks type-check.
  createdAt?: Date;
  updatedAt?: Date;
}
```

And in the schema, find:

```ts
    attempts: { type: Number, default: 0 },
```

Replace with:

```ts
    attempts: { type: Number, default: 0 },
    channel: { type: String, enum: ['sms', 'whatsapp'] },
```

- [ ] **Step 4: Expose the flags in `serializeUser`**

In `backend/src/services/AuthService.ts`, find:

```ts
  phoneVerified: user.phoneVerified ?? false,
  phoneVerifiedAt: user.phoneVerifiedAt,
```

Replace with:

```ts
  phoneVerified: user.phoneVerified ?? false,
  phoneVerifiedAt: user.phoneVerifiedAt,
  whatsappVerified: user.whatsappVerified ?? false,
  whatsappVerifiedAt: user.whatsappVerifiedAt,
```

- [ ] **Step 5: Build + lint**

Run: `cd backend && npm run build && npm run lint`
Expected: both succeed with no new errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/types/index.ts backend/src/models/User.ts backend/src/models/PhoneOtp.ts backend/src/services/AuthService.ts
git commit -m "feat(otp): add whatsappVerified user fields and PhoneOtp channel"
```

---

### Task 2: OtpService channel ladder

**Files:**
- Modify: `backend/src/services/OtpService.ts`

- [ ] **Step 1: Update types and constants**

In `backend/src/services/OtpService.ts`, find:

```ts
type OtpChannel = 'sms' | 'email';

interface SendOtpResult {
  success: boolean;
  message: string;
  expiresAt: string;
}

interface VerifyOtpResult {
  verified: boolean;
  token?: string;
}
```

Replace with:

```ts
type OtpChannel = 'sms' | 'whatsapp' | 'email';

interface SendOtpResult {
  success: boolean;
  message: string;
  expiresAt: string;
  /** Channel that actually delivered the code (post-fallback). */
  channelUsed: 'sms' | 'whatsapp';
}

interface VerifyOtpResult {
  verified: boolean;
  token?: string;
  /** Delivery channel of the verified code; set only when verified=true. */
  channel?: 'sms' | 'whatsapp';
}
```

Then find:

```ts
const OTP_LENGTH = 6;
```

Replace with:

```ts
const OTP_LENGTH = 6;
// Minimum gap between OTP sends to the same phone. A WhatsApp→SMS ladder
// invites more resends; this bounds cost and brute-force surface.
const RESEND_COOLDOWN_MS = 60 * 1000;
```

- [ ] **Step 2: Rewrite `sendOtp` with cooldown + ladder**

Replace the entire `sendOtp` method with:

```ts
  async sendOtp(to: string, channel: OtpChannel): Promise<SendOtpResult> {
    if (channel === 'email') {
      throw new AppError(
        'Email OTPs go through EmailOtpService, not Termii.',
        400
      );
    }

    if (!config.sms.enabled) {
      // Phone OTP is currently disabled at the env level (provider
      // verification pending). Surface a clean error so the client can fall
      // back to email OTP rather than retrying a doomed request.
      throw new AppError(
        'Phone verification is temporarily unavailable. Please use email instead.',
        503
      );
    }

    const formattedTo = this.formatPhoneNumber(to);

    // Resend cooldown: at most one send per phone per minute. updatedAt is
    // refreshed by the upsert below on every send, so it is the send clock.
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

    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    if (this.provider === 'vtpass') {
      // VTpass is SMS-only: a WhatsApp request silently degrades to SMS.
      // It also has no hosted OTP: generate the code, store its hash, send
      // it as a plain SMS, and verify in-house on the way back.
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

    // WhatsApp-first ladder: try WhatsApp when requested; on ANY WhatsApp
    // failure (no WhatsApp on the number, channel not enabled on the Termii
    // plan, provider error) fall back to SMS on the dnd route in the same
    // request. The caller learns what actually happened via channelUsed.
    let resp: TermiiOtpSendResp;
    let channelUsed: 'sms' | 'whatsapp' = 'sms';

    if (channel === 'whatsapp') {
      try {
        resp = await this.sendTermiiOtp(termiiTo, messageText, 'whatsapp');
        channelUsed = 'whatsapp';
      } catch (err) {
        console.warn(
          '[OtpService] WhatsApp OTP send failed — falling back to SMS (dnd):',
          (err as Error).message
        );
        resp = await this.sendOtpWithFallback(termiiTo, messageText);
      }
    } else {
      resp = await this.sendOtpWithFallback(termiiTo, messageText);
    }

    if (!resp.pinId) {
      throw new AppError(
        resp.message ?? 'Termii returned no pin_id for this OTP request.',
        502
      );
    }

    await PhoneOtp.findOneAndUpdate(
      { phone: formattedTo },
      { pinId: resp.pinId, codeHash: undefined, channel: channelUsed, expiresAt },
      { upsert: true, new: true }
    );

    return {
      success: true,
      message:
        channelUsed === 'whatsapp'
          ? 'Verification code sent to your WhatsApp'
          : 'Verification code sent to phone',
      expiresAt: expiresAt.toISOString(),
      channelUsed,
    };
  }
```

- [ ] **Step 3: Extract `sendTermiiOtp` and switch SMS to the `dnd` channel**

Replace the entire `sendOtpWithFallback` private method with:

```ts
  /**
   * One Termii OTP send. `termiiChannel` 'dnd' is the DND-bypassing SMS
   * route (the correct one for OTPs — the old 'generic' route is silently
   * dropped for DND-flagged numbers). 'whatsapp' delivers to the user's
   * WhatsApp. WhatsApp sends go out from the approved WhatsApp sender when
   * one is configured; SMS sends use the alphanumeric sender ID.
   */
  private async sendTermiiOtp(
    to: string,
    messageText: string,
    termiiChannel: 'dnd' | 'whatsapp',
    from?: string
  ): Promise<TermiiOtpSendResp> {
    const res = await axios.post<TermiiOtpSendResp>(
      `${TERMII_BASE}/api/sms/otp/send`,
      {
        api_key: this.apiKey,
        message_type: 'NUMERIC',
        to,
        from:
          from ??
          (termiiChannel === 'whatsapp' && config.termii.whatsappDeviceId
            ? config.termii.whatsappDeviceId
            : this.senderId),
        channel: termiiChannel,
        pin_attempts: 5,
        pin_time_to_live: OTP_TTL_MINUTES,
        pin_length: OTP_LENGTH,
        pin_placeholder: '< 1234 >',
        message_text: messageText,
        pin_type: 'NUMERIC',
      }
    );
    return res.data;
  }

  /** SMS (dnd) OTP send with the N-Alert sender-ID fallback. */
  private async sendOtpWithFallback(
    to: string,
    messageText: string
  ): Promise<TermiiOtpSendResp> {
    const trySend = (from: string): Promise<TermiiOtpSendResp> =>
      this.sendTermiiOtp(to, messageText, 'dnd', from);

    try {
      return await trySend(this.senderId);
    } catch (err) {
      return this.handleSenderFallback(err, trySend);
    }
  }
```

- [ ] **Step 4: Return the delivery channel from `verifyOtp`**

In `verifyOtp`, the VTpass branch ends with:

```ts
      await PhoneOtp.deleteOne({ _id: record._id });
      return { verified: true };
```

Replace with:

```ts
      await PhoneOtp.deleteOne({ _id: record._id });
      return { verified: true, channel: record.channel ?? 'sms' };
```

And the Termii branch ends with:

```ts
    if (verified) {
      await PhoneOtp.deleteOne({ _id: record._id });
    }

    return { verified };
```

Replace with:

```ts
    if (verified) {
      await PhoneOtp.deleteOne({ _id: record._id });
      return { verified, channel: record.channel ?? 'sms' };
    }

    return { verified };
```

- [ ] **Step 5: Build + lint**

Run: `cd backend && npm run build && npm run lint`
Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/OtpService.ts
git commit -m "feat(otp): WhatsApp-first ladder with SMS dnd fallback and resend cooldown"
```

---

### Task 3: Auth layer (service guards, controller, validation, route)

**Files:**
- Modify: `backend/src/services/AuthService.ts:165-191`
- Modify: `backend/src/controllers/AuthController.ts:490-539`
- Modify: `backend/src/validations/auth.ts` (append after `verifyCodeValidation`)
- Modify: `backend/src/routes/auth.ts:7-19,86`

- [ ] **Step 1: Rewrite `sendPhoneVerification` and `verifyPhone` in AuthService**

In `backend/src/services/AuthService.ts`, replace both methods (currently lines 165-191, from the `// Sends an SMS OTP via Termii...` comment through the end of `verifyPhone`) with exactly:

```ts
  // Sends an OTP to the currently-authenticated user's phone. WhatsApp-first
  // by default; the ladder inside OtpService may fall back to SMS.
  async sendPhoneVerification(
    userId: string,
    channel: 'whatsapp' | 'sms' = 'whatsapp'
  ): Promise<{ expiresAt: string; channelUsed: 'whatsapp' | 'sms' }> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    // Reject only when the requested channel adds nothing: SMS adds nothing
    // once the phone is verified; WhatsApp additionally earns
    // whatsappVerified, so allow it until that flag is set too.
    if (channel === 'sms' && user.phoneVerified) {
      throw new AppError('Phone is already verified', 400);
    }
    if (channel === 'whatsapp' && user.phoneVerified && user.whatsappVerified) {
      throw new AppError('Phone and WhatsApp are already verified', 400);
    }
    const result = await otpService.sendOtp(user.phone, channel);
    return { expiresAt: result.expiresAt, channelUsed: result.channelUsed };
  }

  // Verifies a code submitted from the phone-verify modal. Always sets
  // phoneVerified; additionally sets whatsappVerified when the code was
  // DELIVERED over WhatsApp (read from the PhoneOtp record's channel).
  async verifyPhone(userId: string, code: string): Promise<Partial<IUser>> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.phoneVerified && user.whatsappVerified) {
      return serializeUser(user);
    }
    const result = await otpService.verifyOtp(user.phone, code, 'sms');
    if (!result.verified) {
      throw new AppError('Invalid verification code', 400);
    }
    if (!user.phoneVerified) {
      user.phoneVerified = true;
      user.phoneVerifiedAt = new Date();
    }
    if (result.channel === 'whatsapp' && !user.whatsappVerified) {
      user.whatsappVerified = true;
      user.whatsappVerifiedAt = new Date();
    }
    await user.save();
    return serializeUser(user);
  }
```

(The `verifyOtp` third argument stays `'sms'`: in `OtpService.verifyOtp` that parameter only rejects `'email'`; verification itself is channel-agnostic.)

- [ ] **Step 2: Controller reads the channel and reports `channelUsed`**

In `backend/src/controllers/AuthController.ts`, replace the body of `sendPhoneVerification` (the `try` block, currently lines 500-509) with:

```ts
    try {
      const channel =
        (req.body?.channel as 'whatsapp' | 'sms' | undefined) ?? 'whatsapp';
      const result = await AuthService.sendPhoneVerification(
        req.user!._id.toString(),
        channel
      );
      const response: ApiResponse = {
        success: true,
        message:
          result.channelUsed === 'whatsapp'
            ? 'Verification code sent to your WhatsApp'
            : 'Verification code sent to your phone',
        data: result,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
```

Also update the method's doc comment from "Send a Termii SMS OTP" to:

```ts
  /**
   * POST /auth/phone/send-verification (protected)
   * Send an OTP to the authenticated user's phone. Body may carry
   * { channel: 'whatsapp' | 'sms' }; default is WhatsApp-first with an
   * automatic SMS fallback. Used by the in-app phone-verify modal/banner.
   */
```

- [ ] **Step 3: Add the channel validation**

In `backend/src/validations/auth.ts`, append after `verifyCodeValidation`:

```ts
// Optional preferred delivery channel for the phone-verification code.
export const sendPhoneVerificationValidation = [
  body('channel')
    .optional()
    .isIn(['whatsapp', 'sms'])
    .withMessage("channel must be 'whatsapp' or 'sms'"),
];
```

(`backend/src/validations/index.ts` does `export * from './auth'`, so no index change is needed.)

- [ ] **Step 4: Wire the validation into the route**

In `backend/src/routes/auth.ts`, add `sendPhoneVerificationValidation` to the import list from `'../validations'`, then find:

```ts
router.post('/phone/send-verification', protect, AuthController.sendPhoneVerification);
```

Replace with:

```ts
router.post(
  '/phone/send-verification',
  protect,
  validate(sendPhoneVerificationValidation),
  AuthController.sendPhoneVerification
);
```

- [ ] **Step 5: Build + lint**

Run: `cd backend && npm run build && npm run lint`
Expected: both succeed.

- [ ] **Step 6: Smoke-test the API shape locally (no live sends needed)**

Run the dev server (`cd backend && npm run dev`) with `SMS_ENABLED=false` in `.env.dev`, then with a valid JWT:

```bash
curl -s -X POST http://localhost:5001/api/v1/auth/phone/send-verification \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"channel":"whatsapp"}'
```

Expected: `503` with "Phone verification is temporarily unavailable" (proves routing + validation + guards run before the provider).

```bash
curl -s -X POST http://localhost:5001/api/v1/auth/phone/send-verification \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"channel":"telegram"}'
```

Expected: `400` validation error "channel must be 'whatsapp' or 'sms'".

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/AuthService.ts backend/src/controllers/AuthController.ts backend/src/validations/auth.ts backend/src/routes/auth.ts
git commit -m "feat(auth): channel-aware phone verification with whatsappVerified flag"
```

---

### Task 4: Web client (auth-api, session type, PhoneVerifyModal)

**Files:**
- Modify: `web/src/lib/session.ts:17-18`
- Modify: `web/src/lib/auth-api.ts:94-96`
- Modify: `web/src/components/app/PhoneVerifyModal.tsx`

- [ ] **Step 1: Add the flag to `AdminUser`**

In `web/src/lib/session.ts`, find:

```ts
  emailVerified?: boolean;
  phoneVerified?: boolean;
```

Replace with:

```ts
  emailVerified?: boolean;
  phoneVerified?: boolean;
  // True only when a verification code was delivered over WhatsApp and
  // verified — unlocks the WhatsApp assistant.
  whatsappVerified?: boolean;
```

- [ ] **Step 2: Channel-aware `sendPhoneVerification` in auth-api**

In `web/src/lib/auth-api.ts`, replace:

```ts
  async sendPhoneVerification(): Promise<void> {
    await api.post("/auth/phone/send-verification");
  },
```

with:

```ts
  /** Send the phone OTP. WhatsApp-first; the backend may fall back to SMS
   *  and reports what actually happened via channelUsed. */
  async sendPhoneVerification(
    channel: "whatsapp" | "sms" = "whatsapp"
  ): Promise<{ channelUsed: "whatsapp" | "sms" }> {
    const res = await api.post("/auth/phone/send-verification", { channel });
    const data = unwrap(res.data) as { channelUsed?: "whatsapp" | "sms" };
    return { channelUsed: data?.channelUsed ?? channel };
  },
```

- [ ] **Step 3: Update the modal (channel state, switch link, cooldown, copy)**

Replace the entire component body of `web/src/components/app/PhoneVerifyModal.tsx` between the `Props` interface and the final closing brace with:

```tsx
/**
 * In-app phone verification dialog. Sends a WhatsApp-first OTP when it opens
 * (backend may fall back to SMS), collects the 6-digit code, and offers a
 * manual "send by SMS instead" switch. On success flips phoneVerified (and
 * whatsappVerified when the code arrived on WhatsApp) via authApi.verifyPhone.
 */
export function PhoneVerifyModal({ open, phone, onClose, onVerified }: Props) {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [channelUsed, setChannelUsed] = useState<"whatsapp" | "sms">("whatsapp");
  const [cooldown, setCooldown] = useState(0);
  const sentRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setCode("");
      setError(null);
      setResendNotice(null);
      setChannelUsed("whatsapp");
      setCooldown(0);
      sentRef.current = false;
      return;
    }
    // Auto-send on open, but only once per open cycle (StrictMode would
    // otherwise fire two sends).
    if (sentRef.current) return;
    sentRef.current = true;
    sendCode("whatsapp");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 60s resend cooldown, mirrored server-side (429 if bypassed).
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function sendCode(channel: "whatsapp" | "sms") {
    setSending(true);
    setError(null);
    try {
      const { channelUsed: used } = await authApi.sendPhoneVerification(channel);
      setChannelUsed(used);
      setCooldown(60);
      setResendNotice(
        used === "whatsapp"
          ? "Code sent to your WhatsApp."
          : "Code sent by SMS. Check your text messages."
      );
      (window as unknown as { posthog?: { capture?: (e: string, p?: object) => void } })
        .posthog?.capture?.("phone_otp_sent", { channel: used });
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setError(
        axErr.response?.data?.message ??
          (err instanceof Error ? err.message : "Could not send code.")
      );
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code) return;
    setVerifying(true);
    setError(null);
    try {
      await authApi.verifyPhone(code.trim());
      (window as unknown as { posthog?: { capture?: (e: string, p?: object) => void } })
        .posthog?.capture?.("phone_otp_verified", { channel: channelUsed });
      onVerified();
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setError(
        axErr.response?.data?.message ??
          (err instanceof Error ? err.message : "Verification failed.")
      );
    } finally {
      setVerifying(false);
    }
  }

  if (!open) return null;

  const resendLabel = cooldown > 0 ? `Resend (${cooldown}s)` : "Resend code";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foundation-900/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-paper p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-cryola-300 text-foundation-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-[18px] font-extrabold tracking-tight text-foundation-700">
                Verify your phone
              </h2>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">
                {channelUsed === "whatsapp" ? (
                  <>
                    Code sent to your WhatsApp on{" "}
                    <span className="font-semibold text-foundation-700">
                      {phone}
                    </span>
                  </>
                ) : (
                  <>
                    Code sent by SMS to{" "}
                    <span className="font-semibold text-foundation-700">
                      {phone}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-muted transition hover:bg-foundation-700/5 hover:text-foundation-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="eyebrow block text-[10px]">6-digit code</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
              placeholder="123456"
              autoFocus
              className="mt-1 w-full rounded-full border border-foundation-700/15 bg-surface px-5 py-3 text-center text-[20px] font-semibold tracking-[0.5em] text-foundation-700 outline-none transition focus:border-foundation-700/40"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={verifying || code.length < 4}
              className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-60"
            >
              {verifying ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              onClick={() => sendCode(channelUsed)}
              disabled={sending || cooldown > 0}
              className="text-[12.5px] font-semibold text-foundation-700 transition hover:text-foundation-900 disabled:opacity-60"
            >
              {sending ? "Sending…" : resendLabel}
            </button>
            <button
              type="button"
              onClick={() =>
                sendCode(channelUsed === "whatsapp" ? "sms" : "whatsapp")
              }
              disabled={sending || cooldown > 0}
              className="text-[12.5px] font-semibold text-ink-muted underline-offset-2 transition hover:text-foundation-700 hover:underline disabled:opacity-60"
            >
              {channelUsed === "whatsapp"
                ? "Send by SMS instead"
                : "Send to WhatsApp instead"}
            </button>
          </div>

          {resendNotice && !error && (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[12.5px] text-emerald-700">
              {resendNotice}
            </p>
          )}
          {error && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12.5px] text-red-700">
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build + lint**

Run: `cd web && npm run build && npm run lint`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/session.ts web/src/lib/auth-api.ts web/src/components/app/PhoneVerifyModal.tsx
git commit -m "feat(web): channel-aware phone verify modal with WhatsApp default"
```

---

### Task 5: Mobile client (types, service, hook, PhoneVerifyModal)

**Files:**
- Modify: `mobile/src/types/index.ts:138`
- Modify: `mobile/src/services/auth.ts:150-166` (plus the response-type block near line 67)
- Modify: `mobile/src/hooks/useAuth.ts:141-148`
- Modify: `mobile/src/components/PhoneVerifyModal.tsx`

- [ ] **Step 1: Add the flag to the mobile `User` type**

In `mobile/src/types/index.ts`, find:

```ts
  emailVerified?: boolean;
  phoneVerified?: boolean;
```

Replace with:

```ts
  emailVerified?: boolean;
  phoneVerified?: boolean;
  // True only when a verification code was delivered over WhatsApp and
  // verified — unlocks the WhatsApp assistant.
  whatsappVerified?: boolean;
```

- [ ] **Step 2: Channel-aware service call**

In `mobile/src/services/auth.ts`, add below the `OTPResponse` interface (near line 70):

```ts
export type PhoneVerifyChannel = 'whatsapp' | 'sms';

export interface PhoneVerificationResponse {
  expiresAt: string;
  /** Channel that actually delivered the code (post-fallback). */
  channelUsed: PhoneVerifyChannel;
}
```

Then replace:

```ts
  // Send an SMS OTP to the signed-in user's phone — in-app phone-verify
  // bottom sheet uses this.
  async sendPhoneVerification(): Promise<OTPResponse> {
    const response = await api.post<ApiResponse<OTPResponse>>(
      '/auth/phone/send-verification'
    );
    return response.data.data;
  },
```

with:

```ts
  // Send an OTP to the signed-in user's phone — WhatsApp-first, backend may
  // fall back to SMS. The in-app phone-verify bottom sheet uses this.
  async sendPhoneVerification(
    channel: PhoneVerifyChannel = 'whatsapp'
  ): Promise<PhoneVerificationResponse> {
    const response = await api.post<ApiResponse<PhoneVerificationResponse>>(
      '/auth/phone/send-verification',
      { channel }
    );
    return response.data.data;
  },
```

- [ ] **Step 3: Pass the channel through the hook**

In `mobile/src/hooks/useAuth.ts`, replace `useSendPhoneVerification`:

```ts
// Send an OTP to the signed-in user's phone (in-app phone-verify bottom
// sheet). WhatsApp-first; pass 'sms' to force the SMS channel.
export function useSendPhoneVerification() {
  return useMutation({
    mutationFn: (channel: 'whatsapp' | 'sms') =>
      authApi.sendPhoneVerification(channel),
    onError: (error) => {
      console.error('Send phone verification error:', getErrorMessage(error));
    },
  });
}
```

- [ ] **Step 4: Update the modal**

In `mobile/src/components/PhoneVerifyModal.tsx`, make these changes:

4a. Replace the component's state/effect/handler section (from `const sendMutation = ...` through the end of `handleResend`) with:

```tsx
  const sendMutation = useSendPhoneVerification();
  const verifyMutation = useVerifyPhone();
  const [otpKey, setOtpKey] = useState(0);
  const [channelUsed, setChannelUsed] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [cooldown, setCooldown] = useState(0);
  const sentRef = useRef(false);

  // Auto-send the first code (WhatsApp-first) when the modal opens. The ref
  // guards against React's StrictMode double-firing the effect.
  useEffect(() => {
    if (!visible) {
      sentRef.current = false;
      setOtpKey((k) => k + 1);
      setChannelUsed('whatsapp');
      setCooldown(0);
      return;
    }
    if (sentRef.current) return;
    sentRef.current = true;
    sendCode('whatsapp');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // 60s resend cooldown, mirrored server-side (429 if bypassed).
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendCode = (channel: 'whatsapp' | 'sms', notify = false) => {
    sendMutation.mutate(channel, {
      onSuccess: (res) => {
        setChannelUsed(res.channelUsed);
        setCooldown(60);
        if (notify) {
          toast.success(
            res.channelUsed === 'whatsapp'
              ? 'Code sent to your WhatsApp.'
              : 'Code sent by SMS.'
          );
          setOtpKey((k) => k + 1);
        }
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  };

  const handleComplete = (code: string) => {
    verifyMutation.mutate(code, {
      onSuccess: (user) => {
        dispatch(updateUser(user));
        toast.success('Phone verified.');
        onVerified();
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setOtpKey((k) => k + 1);
      },
    });
  };

  const handleResend = () => sendCode(channelUsed, true);
  const handleSwitchChannel = () =>
    sendCode(channelUsed === 'whatsapp' ? 'sms' : 'whatsapp', true);
```

4b. Update the subtitle `<Text>` (currently `Code sent to {phone}`) to:

```tsx
                <Text style={styles.subtitle} numberOfLines={1}>
                  {channelUsed === 'whatsapp'
                    ? `Code sent to your WhatsApp (${phone})`
                    : `Code sent by SMS to ${phone}`}
                </Text>
```

4c. Add a channel-switch row below the `<OTPInput …/>` block, inside `styles.body`:

```tsx
            <TouchableOpacity
              onPress={handleSwitchChannel}
              disabled={sendMutation.isPending || cooldown > 0}
              style={styles.switchRow}
            >
              <Text style={styles.switchText}>
                {cooldown > 0
                  ? `Resend available in ${cooldown}s`
                  : channelUsed === 'whatsapp'
                    ? "Didn't get it? Send by SMS instead"
                    : 'Send to WhatsApp instead'}
              </Text>
            </TouchableOpacity>
```

4d. Gate the OTPInput resend on the cooldown by changing its prop:

```tsx
              onResend={cooldown > 0 ? undefined : handleResend}
```

4e. Add the two styles to the `StyleSheet.create` block:

```tsx
    switchRow: {
      marginTop: spacing.md,
      alignItems: 'center',
    },
    switchText: {
      fontSize: fontSize.sm,
      fontFamily: fontFamily.semibold,
      color: colors.accent,
    },
```

- [ ] **Step 5: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: no new errors (pre-existing errors, if any, are unchanged).

- [ ] **Step 6: Commit**

```bash
git add mobile/src/types/index.ts mobile/src/services/auth.ts mobile/src/hooks/useAuth.ts mobile/src/components/PhoneVerifyModal.tsx
git commit -m "feat(mobile): channel-aware phone verify modal with WhatsApp default"
```

---

### Task 6: Manual end-to-end verification (spec testing section)

**Prerequisites:** `SMS_ENABLED=true`, `TERMII_API_KEY` set in `backend/.env.dev`, Termii dashboard confirms the OTP WhatsApp channel (and `TERMII_WHATSAPP_DEVICE_ID` set if that is the required `from`). Use a real +234 test number you control. Between resend tests, wait 60s or delete the `PhoneOtp` doc in Mongo.

- [ ] **Step 1: WhatsApp-first send.** `POST /auth/phone/send-verification` with `{}` body (valid JWT). Expected: code arrives on WhatsApp, response `data.channelUsed === 'whatsapp'`.
- [ ] **Step 2: Forced SMS on a DND number.** Send `{"channel":"sms"}` for a DND-flagged number. Expected: SMS arrives (the `dnd` route fix), `channelUsed === 'sms'`.
- [ ] **Step 3: Verify WhatsApp-delivered code.** `POST /auth/phone/verify` with the WhatsApp code. Expected: `user.phoneVerified === true` AND `user.whatsappVerified === true` in the response.
- [ ] **Step 4: Verify SMS-delivered code (different user).** Expected: `phoneVerified === true`, `whatsappVerified === false`.
- [ ] **Step 5: SMS-verified user upgrades.** As the Step 4 user, send `{"channel":"whatsapp"}`. Expected: send allowed (not "already verified"), and verifying flips `whatsappVerified === true`.
- [ ] **Step 6: Fallback.** Send `{"channel":"whatsapp"}` for a number without WhatsApp. Expected: SMS arrives, `channelUsed === 'sms'`; verifying it does NOT set `whatsappVerified`.
- [ ] **Step 7: Cooldown.** Fire two sends within 60s. Expected: second returns `429`.
- [ ] **Step 8: Clients.** Run the mobile modal (dashboard banner) and web modal end to end: WhatsApp copy shows, switch-to-SMS works, resend disabled with countdown, success updates the user in state.
- [ ] **Step 9: Commit any fixes found, one commit per fix.**

---

## Self-Review Notes

- Spec coverage: channel ladder + `dnd` fix (Task 2), API shape + guards + `whatsappVerified` (Task 3), client UX on both surfaces (Tasks 4-5), measurement (PhoneOtp.channel in Task 1; web PostHog-guarded events in Task 4; mobile events deferred to the analytics branch, noted above), ops prerequisite (header + Task 6 prerequisites), manual testing (Task 6 mirrors the spec's test list).
- Backward compatibility: old clients send no body; controller defaults to `'whatsapp'`, which is the spec's intended default-with-fallback behavior.
- The legacy public `/auth/otp/send` flow still calls `sendOtp(phone, 'sms')` and is unaffected apart from inheriting the `dnd` fix and cooldown.
