# WhatsApp Signup OTP (Meta-direct) Design

**Date:** 2026-07-09
**Status:** Approved (design), pending implementation plan

## Goal

Verify a new user's phone number at signup by sending a one-time code over WhatsApp using Meta's Cloud API directly, falling back to SMS when the number is not on WhatsApp. Verification is a soft nudge: the user enters the app immediately and is prompted (not blocked) to verify.

## Why Meta-direct (not Termii)

We already run the Meta Cloud API for the two-way assistant, so the same WhatsApp Business number, `phoneNumberId`, and access token are reused. Meta-direct means we own the OTP lifecycle (generate, hash, verify) and pay Meta's domestic Nigeria authentication rate (~$0.0067, roughly ₦10 per code) with no aggregator markup. The assistant's inbound/in-window messages remain free; only these outbound authentication templates are billed.

## Decisions (locked with the user)

1. **Soft nudge.** Signup is unchanged and non-blocking. The existing email OTP still fires in the background. After landing, a dismissible banner prompts the user to verify their WhatsApp number. Tap-to-send (we only pay for users who choose to verify, not everyone who abandons).
2. **Fallback: auto + manual.** On a hard "undeliverable / not a WhatsApp user" result from Meta, we auto-send the code by SMS in the same request. For the silent (asynchronous) failure case, a "Send via SMS instead" button calls the same endpoint with `channel: 'sms'`.
3. **Ship gate: wait for SMS.** Deploy dark behind a flag. Do not flip on until BOTH (a) the Meta authentication template is approved and (b) an SMS provider is verified with `SMS_ENABLED=true`, so the SMS fallback is real from day one.
4. **Platforms: both.** Backend built complete first, then wire mobile (primary product) and web together.
5. **Email OTP unchanged.** Continues firing at register as today; the WhatsApp prompt is the newly visible one.

## Architecture

Layering follows the existing backend convention (routes → controllers → services → models). No new routes: the design re-points the WhatsApp leg of the already-live phone-verification endpoints from Termii to Meta and adds the fallback ladder underneath.

### Components

**1. Meta authentication-template send (new).**
A dedicated send path for authentication OTP, separate from the three transactional templates in `WhatsAppService.ts`. Reasons it is separate: authentication templates are not preference-gated (they are identity, not marketing), and their payload carries the code in BOTH a `body` parameter and a `button` parameter (copy-code or one-tap autofill), unlike the body-only transactional sends.

It returns a discriminated result the ladder can branch on:
- `sent` (with provider message id)
- `not_delivered` (Meta reports the recipient is not reachable on WhatsApp: the send-time error code is in the "recipient not on WhatsApp / undeliverable" set; exact codes pinned in the plan against the current Graph API version)
- `error` (any other failure: auth, template not approved, rate limit, network)

**2. `OtpService` gains a Meta WhatsApp leg.**
When `channel === 'whatsapp'` and `config.whatsapp.otp.provider === 'meta'`, the service:
- generates a cryptographically-random numeric code (reusing `generateOtpCode`),
- HMAC-hashes it (reusing `hashOtp`),
- sends it via the Meta authentication template,
- on `sent`: upserts a `PhoneOtp` record with `codeHash`, `channel: 'whatsapp'`, `attempts: 0`, `expiresAt`,
- on `not_delivered`: falls through to the SMS provider leg (Termii hosted OTP or VTpass self-managed) in the same request, recording the SMS channel used,
- on `error`: raises a clean error the controller surfaces.

This mirrors the VTpass self-managed branch already at `OtpService.ts:122-151`.

**3. `verifyOtp` becomes record-driven (required refactor).**
Today `verifyOtp` branches on the global `this.provider` flag. That breaks the mixed combination this feature introduces (WhatsApp via Meta self-managed, SMS fallback via Termii hosted): a WhatsApp code stored as `codeHash` would be wrongly routed to Termii's hosted verify. The fix: decide per `PhoneOtp` record:
- record has `codeHash` → self-managed verify (HMAC compare + attempts throttle),
- record has `pinId` → Termii hosted verify.

`AuthService.verifyPhone` already reads `record.channel` to award `whatsappVerified` when the code came over WhatsApp, so no change is needed there.

**4. Config: `config.whatsapp.otp` (new block).**
```
otp: {
  enabled:      WHATSAPP_OTP_ENABLED (default false),   // dark-deploy kill switch
  provider:     WHATSAPP_OTP_PROVIDER (default 'meta'),  // 'meta' today; room for 'termii'
  templateName: META_WHATSAPP_OTP_TEMPLATE (default ''), // approved auth template name
  buttonType:   META_WHATSAPP_OTP_BUTTON (default 'copy_code'), // 'copy_code' | 'one_tap'
}
```
When `enabled` is false, the WhatsApp leg behaves exactly as today (Termii or the existing 503 when `SMS_ENABLED=false`). When true, the WhatsApp leg uses Meta. Code length and TTL keep reusing the existing `OtpService` constants.

**5. Clients (mobile + web).**
A non-blocking "Verify your WhatsApp number" banner shown when `!user.phoneVerified`:
- tapping it calls `POST /auth/phone/send-verification` (WhatsApp-first),
- a 6-digit code entry field posts to `POST /auth/phone/verify`,
- a "Resend" control respects the existing 60s cooldown,
- a "Send via SMS instead" button calls send-verification with `channel: 'sms'`.
Reuse the existing in-app phone-verify modal if one exists; otherwise add a minimal one styled to each platform.

### Data flow (happy path + fallback)

```
Signup (unchanged) ──> user in app, email OTP fired in background
                         │
      banner: "Verify your WhatsApp number"  ──tap──> POST /auth/phone/send-verification {channel:'whatsapp'}
                         │
        AuthService.sendPhoneVerification ──> OtpService.sendOtp(phone,'whatsapp')
                         │
        generate+hash code ──> Meta auth template send
             ├── sent ─────────> store PhoneOtp{codeHash, channel:'whatsapp'}  ──> "code sent to WhatsApp"
             └── not_delivered ─> SMS provider send ──> store PhoneOtp{...,channel:'sms'} ──> "code sent by SMS"
                         │
        user enters code ──> POST /auth/phone/verify {code}
                         │
        OtpService.verifyOtp (record-driven) ──> AuthService.verifyPhone
             sets phoneVerified=true; whatsappVerified=true iff record.channel==='whatsapp'
                         │
                 banner dismisses
```

## Error handling

- **Not on WhatsApp (hard, synchronous):** classified `not_delivered`, auto-fallback to SMS in the same request.
- **Not on WhatsApp (silent, asynchronous):** Meta accepts then never delivers. Covered by the manual "Send via SMS instead" button. Consuming Meta's `failed` status webhook to auto-fallback is out of scope for v1.
- **Template not approved / bad token:** `error`, surfaced as a clean 502; the client keeps the manual SMS button available.
- **Resend abuse:** existing 60s per-phone cooldown and the self-managed 5-attempt lockout both apply unchanged.
- **SMS provider off (`SMS_ENABLED=false`):** cannot happen in production because the ship gate requires SMS live before flipping the flag on; in the dark-deploy window the flag is off so the Meta leg is inert.

## Meta authentication template

A one-time-password template in the **Authentication** category, submitted for approval in WhatsApp Manager under the same WABA as the assistant. The code is passed as the body variable and as the button variable (copy-code or one-tap). Exact component JSON is pinned in the implementation plan against the live Graph API version. This is an external dependency with approval lead time; the live send cannot be end-to-end tested until it is approved.

## Rollout / ship gate

1. Deploy backend + clients dark (`WHATSAPP_OTP_ENABLED=false`).
2. Submit and get the authentication template approved.
3. Verify the SMS provider (Termii/VTpass) and set `SMS_ENABLED=true`.
4. Set `META_WHATSAPP_OTP_TEMPLATE` to the approved name, flip `WHATSAPP_OTP_ENABLED=true`.
5. Real-phone E2E: WhatsApp-capable number (WhatsApp path) and a non-WhatsApp number (SMS fallback path).

## Cost

Domestic Nigeria authentication rate, ~$0.0067 (~₦10) per delivered WhatsApp OTP; the international rate does not apply because the business and the recipients are both in Nigeria. Assistant/service messages remain free. ~1,000 verifications ≈ $6.70.

## Out of scope (YAGNI)

- Consuming Meta delivery-failure status webhooks for automatic async fallback (manual button suffices for v1).
- Changing email verification behavior or making any verification a hard gate.
- Phone verification for landlord-invited tenants (they do not self-register; their invitation flow is unchanged).
- A general multi-provider OTP abstraction beyond leaving `provider` room in config.

## Risks

- Meta template approval timing and Meta-controlled copy.
- The Meta access token is long-lived and was semi-exposed earlier; rotate before go-live.
- The `verifyOtp` per-record refactor touches security-adjacent code with no automated tests; exercise both self-managed and hosted verify paths manually.
