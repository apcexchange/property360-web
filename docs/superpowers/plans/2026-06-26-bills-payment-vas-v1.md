# Bills Payment (VAS) v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any Property360 user (tenant, landlord, agent) buy value-added services (airtime, data, electricity, cable TV, internet, education, betting) from inside the app, funded from an in-app wallet that they top up by free bank transfer to a dedicated bank account. Sold at face value (no surcharge); Property360's margin is the aggregator commission. Failed deliveries refund instantly to the wallet.

**Architecture:** A new `VasService` talks to **VTpass** (the delivery aggregator) over its REST API with an idempotent `request_id` per purchase and a **requery** step for pending transactions. Users fund a new user-scoped `UserWallet` via a **Paystack Dedicated Virtual Account** (Paystack-Titan / Titan Trust Bank); inbound transfers fire the existing `/webhooks/paystack/dva` webhook and credit the wallet. A `BillPaymentService` orchestrates: debit wallet → call VTpass → on confirmed failure, re-credit wallet (instant ledger reversal). A daily reconciliation job matches money-in (Paystack settlement) against value-out (VTpass float) and resolves stuck "pending" purchases via requery.

**Why this shape (locked decisions):**
- **VTpass** for delivery: one integration covers the whole domestic catalogue, it is a pure VAS provider so it does not conflict with the Paystack-only-collections rule, and it pays a commission that funds "free to the user" pricing.
- **Paystack DVA** for funding: inbound transfer is **1% capped at ₦300, T+1** (vs card ~1.5% + ₦100 every purchase). The cap is what makes per-purchase free. At-rest funds sit with a CBN-licensed bank (Titan Trust).
- **Sell at par.** Never pass the card fee to the user. Spend from wallet = ledger debit + VTpass call, no acquiring fee. Revenue = VTpass commission (airtime/data ~2-5%; electricity/cable/betting thin).
- **Instant in-wallet refunds.** A failed VTpass delivery re-credits the wallet (ledger reversal), no Paystack card refund needed since the money is already in-system.

**Tech Stack:** Node.js / Express 5 / TypeScript, MongoDB (Mongoose), the existing Paystack integration + DVA scaffolding, VTpass REST API. No new gateway. No jest/pytest in this repo — "tests" = `npx tsc --noEmit` (compile gate) + a `ts-node` eval script against the VTpass **sandbox** + `curl`.

---

## Compliance caveat (read before building)

Holding a user's prepaid balance is **CBN-regulated e-money**. A purchased "coin"/credit is the *same* regulated activity, not a loophole. DVA parks at-rest funds with a licensed bank, but the balance carried in `UserWallet` is still Property360's liability — the same grey zone as the existing landlord rent wallet. This plan does not change that risk profile; it just keeps the new feature funded cheaply. **Get a Nigerian fintech lawyer to confirm the structure before scaling stored balances.** Betting specifically may need extra KYC (BVN) and brand/compliance review — it is deliberately the last category in the rollout and can be cut.

---

## Reference (verified signatures, file:line — confirmed 2026-06-26)

- Paystack config block + `dvaProvider`: `backend/src/config/index.ts:170-196`
- `Wallet` model is **landlord-only** (1 per landlord, amounts in **Naira**): `backend/src/models/Wallet.ts:4-59`
- `WalletService.creditWallet(landlordId, data)` / `debitWallet(...)` / `reverseTransaction(...)` / `getWalletTransactions(...)`: `backend/src/services/WalletService.ts:108,154,196,277`
- `Transaction` model (status enum `pending|completed|failed|voided`): `backend/src/models/Transaction.ts:4-77`
- Paystack base URL + secret, `initiatePayment` / `verifyPayment` / `handleWebhook`: `backend/src/services/PaymentGatewayService.ts:46-53,67,202,398`
- HMAC verify + `safeEqualHex` (header `x-paystack-signature`): `backend/src/services/PaymentGatewayService.ts:398-408,482-491`
- **Existing DVA webhook + provisioning to reuse/generalize:** `SharedBillWalletController.handleDVAWebhook`, route `backend/src/routes/index.ts:99` (`/webhooks/paystack/dva`)
- Other webhook routes (public, HMAC-trusted): `backend/src/routes/index.ts:94-99`
- `NotificationService.createNotification(userId, title, message, type, data?, options?)` (types incl. `'payment'`): `backend/src/services/NotificationService.ts:55-65`
- `WhatsAppService.sendTemplate(input)` + convenience wrappers (templates: paymentReminder/invoiceSent/receiptIssued): `backend/src/services/WhatsAppService.ts:343,414,443,474`
- `OtpService.sendSms(to, message)` (Termii, gated by `config.sms.enabled`): `backend/src/services/OtpService.ts:172`
- Route mount pattern + API prefix `/api/v1`: `backend/src/routes/index.ts:44-101`

### VTpass API facts (from vtpass.com/documentation)
- Auth via API key/secret headers; **sandbox at `sandbox.vtpass.com`**, live at `api.vtpass.com`.
- Core endpoints: **purchase** (`/pay`), **requery** (transaction status, `/requery`), **variation codes** (data plans, TV bundles, education products), **service categories / service IDs**.
- Idempotency via a caller-supplied unique `request_id`. Electricity returns a token in the response.
- Prefunded float model: each purchase debits Property360's VTpass wallet; low-balance alerts + top-up required.

### Paystack DVA facts (from paystack.com/docs)
- Branded **Paystack-Titan** (Titan Trust Bank, CBN-licensed); Wema/Access/Zenith alternates. `config.paystack.dvaProvider` already set.
- Create a Customer (email, first_name, last_name, phone), then create/assign a DVA (single-step or multi-step). Up to 1,000 DVAs immediately, more via support.
- Inbound transfer fee **1% capped ₦300**, **T+1** settlement. Financial/betting/general-services businesses must validate customer details (BVN).

---

## File structure

**Create (backend):**
- `backend/src/models/UserWallet.ts` — user-scoped wallet (any role), Naira, with a `WalletLedger` of credit/debit entries (or a sibling `WalletLedgerEntry` model). Distinct from landlord `Wallet`.
- `backend/src/models/BillPayment.ts` — one VAS purchase: user, category, serviceID, variationCode, customerIdentifier (phone/meterNo/smartcard), amount, fee, `requestId` (unique), `vtpassRef`, status (`pending|delivered|failed|reversed`), token, raw provider payloads.
- `backend/src/services/VasService.ts` — VTpass client: `purchase`, `requery`, `getVariations`, `getServices`, signature/header auth, sandbox/live switch.
- `backend/src/services/UserWalletService.ts` — `getOrCreateWallet(userId)`, `credit(userId, data)`, `debit(userId, data)`, `reverse(...)`, `getBalance`, `getLedger`, all transaction-safe (Mongo session).
- `backend/src/services/BillPaymentService.ts` — orchestration: validate → debit wallet → VTpass purchase (idempotent) → on success persist token/notify; on failure reverse wallet; expose `requeryPending`.
- `backend/src/services/DvaService.ts` — generalize the existing shared-bill DVA provisioning to issue a DVA per user and map inbound transfers → `UserWalletService.credit`.
- `backend/src/controllers/BillPaymentController.ts` — list services/variations, validate customer (e.g. meter lookup), pay, list history, get receipt.
- `backend/src/controllers/UserWalletController.ts` — get balance, get/assign DVA details, ledger history.
- `backend/src/routes/bills.ts` + `backend/src/routes/userWallet.ts` — authed route groups.
- `backend/scripts/verifyVas.ts` — manual sandbox eval (buy airtime, requery, simulate failure→reverse).

**Modify (backend):**
- `backend/src/config/index.ts` — add `vtpass` block (apiKey, secretKey, publicKey, baseUrl, env switch) in the style of the paystack block at 170-196.
- `backend/src/routes/index.ts` — mount `/bills` and `/wallet` (user); confirm `/webhooks/paystack/dva` routes to the generalized handler.
- `backend/src/models/index.ts` — export `UserWallet`, `BillPayment`.
- `backend/.env.example` + `backend/.env.prod.example` + `render.yaml` — document `VTPASS_*` vars (secrets `sync: false`).

**Later (web + mobile):** `/me/pay` and `/app/pay` category screens (web); a Bills tab in the Expo app driven by VTpass variation codes. Out of scope for the backend-first v1 below.

---

## Phase 0 — Accounts & float (user, not code)

- [ ] Create + business-verify a **VTpass** account; get live API key/secret; note commission rates per category.
- [ ] Create a **VTpass sandbox** account; get sandbox keys (self-serve) so backend dev can start immediately.
- [ ] Confirm **Paystack DVA** is enabled on the live account; confirm betting/financial KYC (BVN validation) requirement.
- [ ] Decide initial **VTpass float** amount + a low-balance alert threshold.

## Phase 1 — Backend foundation (sandbox)

- [ ] **Task 1: Config.** Add `config.vtpass` (keys, baseUrl, `isSandbox`) mirroring `config.paystack` at `config/index.ts:170-196`. Document env vars.
- [ ] **Task 2: UserWallet model + service.** New user-scoped wallet + ledger, Naira, session-safe credit/debit/reverse. Do NOT touch landlord `Wallet`. Compile gate.
- [ ] **Task 3: VasService.** VTpass client with `getServices`, `getVariations(serviceID)`, `purchase({serviceID, variationCode?, amount, phone, billersCode?, requestId})`, `requery(requestId)`. Sandbox-first. Unit-exercise via `verifyVas.ts`.
- [ ] **Task 4: BillPayment model.** Fields above; unique index on `requestId`; store raw request/response for audit.
- [ ] **Task 5: BillPaymentService.** Orchestrate debit → purchase → success/notify or failure/reverse. Idempotent on `requestId`. `requeryPending()` for the cron. Notify via `NotificationService.createNotification(..., 'payment', ...)` and optionally WhatsApp/SMS receipt.
- [ ] **Task 6: Controllers + routes.** `/bills` (services, variations, validate-customer, pay, history, receipt) and `/wallet` (balance, ledger). All behind `protect`.
- [ ] **Task 7: DVA provisioning.** Generalize the shared-bill DVA flow into `DvaService` to issue a DVA per user; expose "fund your wallet" account details; ensure `/webhooks/paystack/dva` credits `UserWallet` on `charge.success` (verify HMAC via `safeEqualHex`). Idempotent on Paystack reference.
- [ ] **Task 8: Reconciliation cron.** Daily job: requery all `pending` BillPayments, reverse confirmed failures, and emit a money-in (DVA) vs value-out (VTpass float) report. Reuse the existing `node-cron` registration pattern in `server.ts` (single-instance, UTC).
- [ ] **Task 9: Sandbox end-to-end.** `verifyVas.ts` + `curl`: fund (simulate DVA credit) → buy airtime/data/electricity → confirm token + wallet debit → simulate failure → confirm instant reverse. `npx tsc --noEmit` clean.

## Phase 2 — Go live, core categories

- [ ] Swap to live VTpass keys; fund float. Ship **airtime, data, electricity** first (highest volume, healthiest commission).
- [ ] Web `/me/pay` + `/app/pay` category UI; mobile Bills tab.
- [ ] Low-float alerting + a basic admin view of BillPayments.

## Phase 3 — Remaining catalogue

- [ ] **cable TV + internet** (same engine, more variation-code UI).
- [ ] **education** (JAMB/WAEC).
- [ ] **betting** — gated, only after KYC/compliance review; cut if it adds brand risk.

---

## Messaging (VTpass SMS vs current stack) — separate, low priority

Investigated per the request to "replace Twilio." Findings:
- **Twilio is already deprecated** (config-only, unused). Live stack = **Termii** SMS/OTP (`OtpService`) + multi-provider `WhatsAppService` (Meta Cloud / Sendchamp / Termii).
- **VTpass messaging is SMS-only** (no WhatsApp Business API), ~₦2.7-2.9 per page, DND + DND-fallback routes, sender-ID registration required. API: `messaging.vtpass.com/api/sms/...`.

Conclusion: VTpass **cannot replace the WhatsApp channel**. It could replace **Termii SMS** purely for vendor consolidation (one VTpass float for bills + SMS, one dashboard). Marginal benefit, no real cost win. **Defer.** If pursued later: add VTpass as an SMS provider option inside `OtpService.sendSms` behind a `config.sms.provider` switch (Termii | vtpass), no interface change for callers.

---

## Verification

- `npx tsc --noEmit` after each backend task (compile gate; repo has no unit tests).
- `backend/scripts/verifyVas.ts` against VTpass sandbox for the happy path + the failure→reverse path + requery.
- `curl` the `/bills` and `/wallet` routes with a real JWT.
- Manual DVA test: small live transfer into a test user's DVA → confirm webhook credits the wallet exactly once (idempotency).
