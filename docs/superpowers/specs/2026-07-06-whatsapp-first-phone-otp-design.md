# WhatsApp-First Phone OTP Ladder

**Date:** 2026-07-06
**Status:** Approved
**Scope:** Backend OtpService + auth routes, mobile PhoneVerifyModal, web PhoneVerifyModal/Banner

## Problem

Phone verification OTPs delivered over SMS are unreliable in Nigeria. DND-flagged numbers block promotional sender routes, and carriers filter aggressively. Users on both mobile and web fail to receive codes, so `phoneVerified` conversion suffers.

A contributing bug was found during design: the Termii OTP send in `backend/src/services/OtpService.ts` uses `channel: 'generic'`, which is Termii's promotional route. DND-flagged numbers never receive it. Termii's `dnd` channel is the route intended for OTPs.

## Decision

Deliver OTPs WhatsApp-first with automatic server-side SMS fallback, and fix the SMS route to use Termii's `dnd` channel. No new vendor is introduced.

Verification completed over the WhatsApp channel additionally marks the user's WhatsApp as verified (`whatsappVerified`). Downstream features gate on this: the WhatsApp assistant channel (companion spec, same date) requires a verified WhatsApp, not just a verified phone.

### Alternatives considered and rejected

1. **Firebase Phone Auth.** Rejected: requires the Blaze plan with per-SMS billing (roughly 10-30x Termii's rate for Nigeria), still terminates as an SMS on the same carriers, adds a second identity system, and demands native-module surgery on a no-EAS Expo pipeline (config plugins, google-services files in CI, release keystore SHA-256 registration, Play Integrity, APNs key). Google's SMS fraud protection also throttles high-risk regions, and Nigeria is a top SMS-pumping target.
2. **WhatsApp channel only, no measurement.** Rejected in favor of adding a lightweight measurement layer so channel performance is knowable instead of guessed.

WhatsApp delivery in Nigeria is data-based, unaffected by DND, and near-universal among Property360's smartphone-first users. The existing Termii account already has WhatsApp configuration (`TERMII_WHATSAPP_DEVICE_ID`, message templates).

## Design

### 1. Backend: OtpService channel support

- Extend the OTP channel type to `'sms' | 'whatsapp'` and thread it through `sendOtp`. Email OTPs remain in `EmailOtpService`.
- Termii channel mapping: requested `whatsapp` sends with Termii `channel: 'whatsapp'`; requested `sms` sends with Termii `channel: 'dnd'` (replacing the current `generic`).
- **Server-side fallback in one request:** if the WhatsApp send fails (recipient has no WhatsApp, Termii error), retry immediately over SMS on the `dnd` channel. The response reports which channel actually succeeded via `channelUsed`. If both channels fail, return a clean 502.
- Verification mechanics are unchanged. Termii verifies by `pinId` regardless of delivery channel; the VTpass self-managed HMAC path stays as-is.
- **WhatsApp verification flag (new User fields):** add `whatsappVerified: boolean` and `whatsappVerifiedAt: Date` to the User model. `verifyOtp` returns the channel that actually delivered the code (read from the `PhoneOtp` record before it is deleted). `AuthService.verifyPhone` always sets `phoneVerified`; when the delivering channel was WhatsApp it also sets `whatsappVerified` and `whatsappVerifiedAt`. This proves the user controls that WhatsApp account, not just the phone number. A code requested over WhatsApp but delivered by the SMS fallback counts as SMS: it sets `phoneVerified` only.
- **Re-verification path:** the send endpoint currently rejects whenever `phoneVerified` is true. It now rejects only when the requested channel adds nothing: SMS requests reject when `phoneVerified` is true; WhatsApp requests reject only when `whatsappVerified` is also true. This lets a user who verified by SMS run the flow again over WhatsApp to earn `whatsappVerified`.
- **VTpass provider degradation:** VTpass is SMS-only. Under `SMS_PROVIDER=vtpass`, a WhatsApp request silently degrades to SMS and the response carries `channelUsed: 'sms'`.
- **Resend cooldown:** enforce a 60-second per-phone cooldown on sends, checked against the latest `PhoneOtp` record's `createdAt`. A ladder invites more resends; this bounds cost and abuse.

### 2. API shape

- `POST /auth/phone/send-verification` accepts an optional body `{ channel?: 'whatsapp' | 'sms' }`, defaulting to `whatsapp`.
- The response adds `channelUsed: 'whatsapp' | 'sms'` alongside the existing `expiresAt`.
- `POST /auth/phone/verify` keeps its request shape; the serialized user in the response now includes `whatsappVerified` / `whatsappVerifiedAt`.
- Backward compatibility: old clients send no body, which resolves to WhatsApp-first with SMS fallback; their verify flow is identical.

### 3. Clients (mobile and web, same treatment)

- `mobile/src/components/PhoneVerifyModal.tsx` and `web/src/components/app/PhoneVerifyModal.tsx`:
  - Primary action sends via WhatsApp (the default request, no channel override needed).
  - Secondary "Send by SMS instead" link forces `channel: 'sms'`.
  - Confirmation copy reflects `channelUsed`: "Code sent to your WhatsApp" vs "Code sent by SMS". This matters because the fallback can silently switch channels.
  - Resend allows switching channels and respects the 60-second cooldown (disable resend with a countdown).

### 4. Measurement

- Add a `channel` field to the `PhoneOtp` model recording what was actually sent (post-fallback). This field is load-bearing, not just analytics: verify reads it to decide whether to set `whatsappVerified`.
- Clients fire `phone_otp_sent` (with `channel` property) and `phone_otp_verified` events. These slot into the PostHog instrumentation on `feat/analytics-posthog` when it merges; until then they are no-ops or logs. No new analytics infrastructure is part of this feature.

### 5. Error handling summary

| Scenario | Behavior |
| --- | --- |
| WhatsApp send fails, SMS succeeds | 200 with `channelUsed: 'sms'` |
| Both channels fail | 502 with a clean provider-error message |
| Resend within 60s | 429 with retry-after messaging |
| `SMS_ENABLED=false` | Existing 503 gate unchanged (gates the whole phone OTP feature) |
| Provider is VTpass, WhatsApp requested | Degrades to SMS, `channelUsed: 'sms'` |

## Ops prerequisite (before implementation)

Confirm in the Termii dashboard that the OTP API is enabled for the WhatsApp channel on the current plan, and identify the correct `from` value for WhatsApp OTP sends (the WhatsApp-enabled sender/device already configured as `TERMII_WHATSAPP_DEVICE_ID` for template messages may or may not be the right identifier for the OTP endpoint). If WhatsApp OTP is not available on the plan, the `dnd` channel fix and cooldown still ship; the WhatsApp channel lands once the account supports it.

## Testing

No test runner exists in the repo. Manual verification:

1. curl `POST /auth/phone/send-verification` with no body against a real +234 number; confirm WhatsApp delivery and `channelUsed: 'whatsapp'`.
2. curl with `{ "channel": "sms" }`; confirm SMS delivery on a DND-flagged number (the `dnd` channel fix).
3. Verify the code via `POST /auth/phone/verify` for each channel; confirm `phoneVerified` flips in both cases, and that `whatsappVerified` flips only for the WhatsApp-delivered code (including the fallback case: requested WhatsApp, delivered by SMS, must NOT set it).
4. As an SMS-verified user, request a WhatsApp-channel code again; confirm the send is allowed and completing it sets `whatsappVerified`.
5. Force a WhatsApp failure (number without WhatsApp) and confirm the SMS fallback plus `channelUsed: 'sms'`.
6. Exercise the modal flow end to end on mobile and web, including resend cooldown and channel switch.
