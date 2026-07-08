# WhatsApp Onboarding and Guest Mode (Assistant Phase 2)

**Date:** 2026-07-08
**Status:** Approved (builds on the 2026-07-06 WhatsApp assistant channel spec; do not implement until assistant v1 is live)
**Scope:** Backend (webhook orchestrator, onboarding state machine, set-password token) plus one small web page (set-password form).

## Problem

Assistant v1 turns unknown WhatsApp numbers away with a static signup link. For a WhatsApp-first market (and a click-to-WhatsApp ad funnel), that discards the warmest possible lead: someone already talking to us. Unregistered users should be able to ask about the platform, be told they are not registered, and complete registration without leaving the chat.

## Decision

Two additions layered onto the assistant channel:

1. **Guest mode:** unknown numbers get a limited assistant (product and how-it-works answers only, no tools, no account data) with a persistent registration nudge.
2. **In-chat registration:** a scripted state machine collects role, name, and email; email is verified by OTP typed back into the chat; the account is created with the WhatsApp number as its phone and is auto-verified for WhatsApp; the password is set later via a single-use link emailed to the verified address.

### The identity boundary (load-bearing security rule)

- **Accounts created FROM the WhatsApp conversation** are born with `phone = wa_id`, `whatsappVerified = true`, `phoneVerified = true`, `emailVerified = true`. The registration channel itself is the proof: the sender demonstrably controls that WhatsApp, and the account claims no pre-existing data.
- **Existing accounts are NEVER auto-linked on inbound.** An inbound message proves control of the WhatsApp number, not ownership of an account that merely claims that number (a typo'd or maliciously entered phone would hand the account's data to whoever holds the WhatsApp). Existing accounts earn `whatsappVerified` only through the in-app OTP flow (2026-07-06 OTP spec). Guest mode tells such users to verify in the app; it does not offer registration for an email that already exists.

### Alternatives considered and rejected

- **LLM-driven free-form registration:** rejected; registration data must be collected exactly and validated deterministically. The LLM stays in the answering lane; a scripted state machine owns the form-filling lane.
- **Collecting a password in chat:** rejected; passwords in WhatsApp history and backups are unacceptable. Set-password link chosen over emailed temp password (cleaner UX, no plaintext credential in email) and over passwordless-until-login (most new plumbing).
- **Auto-verifying existing accounts on inbound:** rejected per the identity boundary above.

## Design

### 1. Guest mode

- The v1 orchestrator's unknown-number branch changes from a static reply to a guest answer path. Guests cannot go through `AssistantService.ask()` (it persists history keyed by a User id, and guests have none): the orchestrator instead calls the assistant's LLM client directly with the existing system prompt, a guest marker ("CURRENT USER: unregistered guest. No tools. Answer only from APP KNOWLEDGE; for anything account-specific, explain that they need to register."), and the single inbound message. Guest turns are stateless (each question stands alone, nothing persisted).
- Every guest reply is footed with: "You are not registered yet. Reply REGISTER to create your Property360 account right here."
- Numbers matching an existing account (any verification state) do NOT get guest mode; they get the v1 static replies (verify your WhatsApp in the app / contact support). Guest mode is strictly for numbers with no account.
- Guest rate limits are tighter than registered users (defaults 5/minute, 15/day, env-tunable) because this is an unauthenticated LLM surface.

### 2. Registration state machine

A `WhatsAppOnboarding` document keyed by `waId` (unique), TTL 30 minutes from last activity, holding `step`, collected fields, and an OTP attempt counter. The keyword REGISTER (case-insensitive) starts or restarts the flow; CANCEL abandons it. While a flow is active, the state machine consumes all inbound text from that number (the LLM is bypassed).

Steps:

1. **role**: "Are you a Landlord, a Tenant, or a Property Manager?" (WhatsApp interactive reply buttons where available, plain keywords as fallback). Maps to `UserRole.LANDLORD | TENANT | AGENT`.
2. **name**: "What is your full name?" Split into first and last name (first word / remainder); reject empty.
3. **email**: validated syntactically, then checked for uniqueness. If the email already has an account: "That email already has a Property360 account. Log in to the app and verify your WhatsApp there instead." and the flow ends (no linking).
4. **email OTP**: send via the existing `EmailOtpService`; prompt "Enter the 6-digit code we sent to {email}". Max 5 attempts, resend on RESEND (respecting the email OTP service's own cooldown).
5. **create**: on OTP success, create the User: role, names, email, `phone = +{waId}`, `emailVerified/emailVerifiedAt`, `phoneVerified/phoneVerifiedAt`, `whatsappVerified/whatsappVerifiedAt` all set, password unset-but-required-by-schema handled via a random unusable placeholder hash (never disclosed). Delete the onboarding doc.
6. **welcome**: confirmation message with what they can now ask, the app store / web links, and "Check {email} for a link to set your password for app access."

### 3. Set-password link

- On account creation, generate a single-use token (32 random bytes, SHA-256 hash stored) in a `PasswordSetupToken` collection with a 24-hour TTL, and email the link `{config.web.baseUrl}/set-password?token=...` via the existing email service.
- New public backend endpoints: `POST /auth/set-password/redeem` body `{ token, password }` validates the token hash, sets the password, marks the token used, and returns the standard auth response (JWT + serialized user) so the web page can log them straight in. Follows the `/web-handoff/redeem` precedent: the token is the bearer credential, no JWT required.
- Expired or used token: the page directs them to the normal forgot-password flow, which works because their email is verified.
- **Web work (small):** one page `web/src/app/set-password/page.tsx` with a password form posting to the redeem endpoint. Note the web repo branch-layout constraint (monorepo `web/src` vs deployed root `src/`) when porting.

### 4. Orchestrator routing (v1 branch becomes)

| Sender state | Behavior |
| --- | --- |
| Active onboarding doc | State machine consumes the message |
| Exactly one whatsappVerified match | Full assistant (v1 behavior) |
| Account exists, not whatsappVerified | Static verify-in-app reply (v1 behavior, unchanged; no guest mode, no registration) |
| Multiple verified matches | Static support reply (v1) |
| No account | Guest mode; REGISTER starts onboarding |

### 5. Abuse controls

- Guest rate limits above; onboarding flows count against the same budget.
- Max 3 abandoned onboarding flows per waId per day (tracked on the TTL doc count or a simple counter); beyond that, static "try again tomorrow or sign up on the web" reply.
- Email OTP attempts capped (5) per flow; the email uniqueness check prevents account-takeover-by-registration.
- Account creation via this path is capped only by email verification plus rate limits; monitor volume once live.

## Out of scope

- Referral codes and Founding 50 offer hooks in the chat flow (add later if the funnel needs it).
- Auto-linking existing accounts (permanently out, by design).
- Media/document collection (KYC stays in-app).
- Editing registration data after creation (profile edits happen in-app).

## Testing (manual, no test runner)

1. Unknown number asks product questions: guest answers with the registration footer; account data requests are declined.
2. Full happy path: REGISTER, role button, name, email, OTP from a real inbox, account created; confirm all four verification flags in Mongo; welcome message received; set-password email arrives; link sets a password and logs in on web; the same chat immediately answers account questions as the new user.
3. Existing email: flow ends with the log-in-instead message and no account changes.
4. Existing phone-number account (SMS-verified or unverified): still gets the v1 verify-in-app reply, never guest mode or registration.
5. CANCEL mid-flow, 30-minute timeout expiry, wrong OTP five times, RESEND path.
6. Rate limits: guest burst and the 3-abandoned-flows cap.
7. Expired and reused set-password tokens fall back to forgot-password.
