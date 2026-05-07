# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is a multi-package monorepo (no workspace tool — each package is independent with its own `node_modules`):

- `backend/` — Node.js / Express 5 / TypeScript REST + Socket.IO API on MongoDB (Mongoose)
- `mobile/` — React Native (Expo 54) app for landlords, tenants, and agents (the primary product)
- `web/` — Next.js 16 / Tailwind 4 dashboard (early skeleton; only `app/page.tsx` exists today)

`PROPERTY360_POC.md` is the canonical product spec (user roles, flows, screen inventory, model fields, status of each feature). Read it for product/domain questions before grepping the code.

## Common commands

Run inside the relevant package directory.

### backend
```
npm run dev        # ts-node-dev with --respawn --transpile-only on src/server.ts
npm run build      # tsc → dist/
npm start          # node dist/server.js (requires build first)
npm run lint       # eslint src/**/*.ts
```
No test runner is configured (`npm test` exits 1).

The backend loads `.env.dev` when `NODE_ENV !== 'production'` and `.env.prod` otherwise (see [backend/src/config/index.ts](backend/src/config/index.ts)). `.env.example` lists required vars.

The server binds to `0.0.0.0` so Android/iOS emulators on the host network can connect; default port is `5000`, but the mobile app's dev URL resolution assumes `5001` — keep them aligned (set `PORT=5001` in `.env.dev`, or update [mobile/src/api/endpoints/urls.ts](mobile/src/api/endpoints/urls.ts)).

### mobile
```
npm start          # expo start
npm run ios        # expo run:ios
npm run android    # expo run:android
```
The mobile app auto-discovers the API host: in dev it pulls the LAN IP from Expo's `debuggerHost`, falls back to `10.0.2.2:5001` on Android emulator and `localhost:5001` otherwise. Production reads `Constants.expoConfig.extra.apiUrl`.

### web
```
npm run dev        # next dev (port 3000)
npm run build
npm start
npm run lint
```

## Architecture

### Backend request lifecycle

`src/server.ts` boots: connects Mongo → runs a startup lease-expiration sweep → schedules the daily `0 1 * * *` cron for `LeaseExpirationService.checkAndExpireLeases()` → creates the HTTP server → initializes Socket.IO. `src/app.ts` wires Helmet, CORS, body parser (10mb), Morgan (dev only), serves `/uploads` statically, mounts all routes under `${API_PREFIX}/${API_VERSION}` (defaults to `/api/v1`), then a 404 handler and the `errorHandler` middleware.

Layering is strict: `routes/ → controllers/ → services/ → models/`. Routes own URL shape and middleware composition; controllers parse the request and shape the response; services contain business logic and are the only place that should touch multiple models. Cross-cutting concerns (`AppError`, `errorHandler`, validators) live in `middleware/`.

TypeScript path aliases are configured in [backend/tsconfig.json](backend/tsconfig.json): `@/*`, `@config/*`, `@controllers/*`, `@middleware/*`, `@models/*`, `@routes/*`, `@services/*`, `@utils/*`, `@types/*`, `@validations/*`. (Imports in the existing code mostly use relative paths; either style works.)

Webhooks are mounted directly on the root router in [backend/src/routes/index.ts](backend/src/routes/index.ts) (`/webhooks/docuseal`, `/webhooks/paystack`, `/webhooks/paystack/transfer`, `/webhooks/paystack/reservation`) and intentionally **bypass JWT auth** — verify signatures inside the handler.

### Auth + role + agent-permission model

Authentication uses JWT in the `Authorization: Bearer …` header. Two layers of authorization:

1. [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts): `protect` attaches `req.user`; `authorize(...roles)` gates a route by `UserRole` (`landlord`, `tenant`, `agent`).
2. [backend/src/middleware/agentPermission.ts](backend/src/middleware/agentPermission.ts): `checkAgentPermission(permission)` is the workhorse for landlord-or-agent routes. It resolves the property from `req.params/body.propertyId`, derives it from `unitId` or `leaseId` if needed, and:
   - For landlords, verifies they own the property and sets `req.landlordId = user._id`.
   - For agents, looks up an active `LandlordAgent` assignment, checks the named permission flag (`canAddTenant`, `canRecordPayment`, `canRenewLease`, `canUploadAgreements`, `canManageMaintenance`, `canViewPayments`, `canViewReports`, `canRemoveTenant`), and sets `req.landlordId` to the agent's *landlord* (not the agent themselves).

**Critical invariant:** services that scope queries by landlord must use `req.landlordId`, not `req.user._id`, so an agent acting on behalf of a landlord still sees the landlord's data. New routes that an agent might use should always go through `checkAgentPermission`.

Socket.IO uses the same JWT — see [backend/src/socket/socketServer.ts](backend/src/socket/socketServer.ts), which authenticates via `socket.handshake.auth.token` and tracks online users in an in-memory `Map<userId, Set<socketId>>` (`isUserOnline()` / `getIO()` are exported for service-side broadcasts).

### Domain modules

The domains map 1:1 across `models/`, `controllers/`, `services/`, `routes/` (and on mobile, across `screens/`, `api/endpoints/`, `store/slices/`). Core entities and their relationships:

- **User** (role: landlord/tenant/agent) → owns Properties, has Wallet, BankAccounts
- **Property** → has many **Unit**s; agents are linked via **LandlordAgent** (assignment + per-property permission flags)
- **Unit** → at most one active **Lease** with a tenant; can also be marketplace-listed and reserved via **ReservationRequest**
- **Lease** → drives **Invoice** generation (incl. `AutoInvoiceService` for recurring rent), accepts **Transaction**s (manual or Paystack), and can have an attached **TenancyAgreement** (Cloudinary-stored doc, OCR'd via Google Document AI, signed via DocuSeal)
- **Wallet** → credited on tenant payments, debited via **Payout** (Paystack Transfer API → `BankAccount`)
- **Conversation** / **Message** → real-time chat via Socket.IO
- **Notification** → in-app notification center
- **MaintenanceRequest** → tenant-submitted with images and priority

`LeaseExpirationService` runs both at startup and on cron and is the only place that auto-transitions lease status; do not duplicate that logic.

### Mobile architecture

- State: **Redux Toolkit** with `redux-persist` + **MMKV** storage ([mobile/src/store/index.ts](mobile/src/store/index.ts), slices in `store/slices/`) for auth + app prefs; **React Query** ([mobile/src/api/queryClient.ts](mobile/src/api/queryClient.ts)) for server state. Don't push server data into Redux — use React Query.
- API client: a single axios instance ([mobile/src/api/client/axiosInstance.ts](mobile/src/api/client/axiosInstance.ts)) with request interceptor (token injection, `NetworkError` translation) and response interceptor (token refresh + toast surfacing of errors). Endpoint URL constants live in [mobile/src/api/endpoints/urls.ts](mobile/src/api/endpoints/urls.ts) — keep them synced with backend route changes.
- Provider tree (in [mobile/App.tsx](mobile/App.tsx)): Redux → ReactQuery → GestureHandler → SafeArea → Theme → Toast → Loading → Socket → PersistGate → NavigationContainer. The Toast provider must be set up before API interceptors fire because the response interceptor calls `setToastRef`.
- Navigation: stack/tab-based via React Navigation 7 in `mobile/src/navigation/`; the role determines which navigator mounts (`MainNavigator` for landlord/agent, `TenantNavigator` for tenant).
- Tokens are stored via `tokenManager` in MMKV; `expo-secure-store` is available for higher-sensitivity values.

### Nigerian-market conventions

- Currency is NGN (₦) throughout; phone numbers are `+234` format; KYC IDs are NIN/Driver's License/Passport/Voter's Card.
- Payment gateway is **Paystack** only — card, bank transfer, USSD. Don't introduce other gateways without coordinating with `PaymentGatewayService`.
- Lease fee structure assumes Nigerian categories: `securityDeposit`, `cautionFee`, `agentFee`, `agreementFee`, `legalFee`, `serviceCharge`. Payment frequencies: monthly / quarterly / annually.

## Backend deployment pipeline

Production lives at **`https://api.property360.africa`** on **Render Starter** ($7/mo, region `frankfurt`). GitHub auto-deploys on push to `main`.

- [render.yaml](render.yaml) at repo root is the source of truth — non-secret env vars and service config are declared there. Changes to that file take effect on the next deploy. Secrets (`MONGODB_URI`, `JWT_SECRET`, vendor API keys, etc.) are set in the Render dashboard with `sync: false` markers in the blueprint so they aren't committed.
- [backend/.env.prod.example](backend/.env.prod.example) lists every required env var with hints; real values live only in Render and the user's password manager.
- Single instance is mandatory — `LeaseExpirationService` cron runs in-process via `node-cron`, and Socket.IO connections are not Redis-shared. Don't propose horizontal scaling without first extracting the cron to a job queue.
- `app.set('trust proxy', 1)` in [backend/src/app.ts](backend/src/app.ts) ensures `req.ip` and rate limiting work behind Render's TLS-terminating proxy. Don't remove this.
- Google Document AI credentials are mounted via Render **Secret Files** at `/etc/secrets/gcloud.json`; `GOOGLE_APPLICATION_CREDENTIALS` env var points there. Don't try to inline the JSON into a normal env var.
- Cron schedule (`0 1 * * *` for lease expiration) runs in **UTC** on Render — that's 2 AM Africa/Lagos (WAT is UTC+1). Acceptable; flag if a different local time matters.
- Full setup runbook (Mongo Atlas allowlist, custom domain CNAME, Render Secret Files, Paystack live-key swap) lives in [backend/DEPLOY.md](backend/DEPLOY.md).

## Mobile release pipeline

Releases go through **GitHub Actions + fastlane**. iOS builds run on a **self-hosted macOS runner** (private repo + cost reasons — see runbook); Android builds run on `ubuntu-latest`. **No EAS, no OTA updates** — every JS change ships via store re-submit.

- Production bundle ID: `com.property360.africa` (matches the owned domain). Staging is `com.property360.africa.staging`, derived automatically via `applicationIdSuffix '.staging'` on a `stagingRelease` build type (Android) and via fastlane xcargs override (iOS).
- [mobile/app.config.ts](mobile/app.config.ts) extends [mobile/app.json](mobile/app.json) and switches `extra.apiUrl` and the user-visible app name per `APP_VARIANT` (`staging` | `production`, defaulting to production). The native bundle ID it declares is informational for local `expo run:*` flows; CI builds get the bundle ID from the native projects directly. **`mobile/.gitignore` excludes `/ios/` and `/android/`** — those folders live only on developer machines and CI runners. Custom edits to native projects (signing config, build types, package directory rename) don't survive `expo prebuild --clean`; treat them as locally maintained.
- [mobile/android/app/build.gradle](mobile/android/app/build.gradle) reads signing credentials from `mobile/android/keystore.properties` (gitignored, materialized in CI from secrets). The `release` build type signs via `signingConfigs.release`. The `stagingRelease` build type adds `applicationIdSuffix '.staging'` and `versionNameSuffix '-staging'`. `versionCode` is overridable via the `-PVERSION_CODE` gradle property (fastlane sets this from latest store value + 1).
- [mobile/ios/fastlane/Fastfile](mobile/ios/fastlane/Fastfile) and [mobile/android/fastlane/Fastfile](mobile/android/fastlane/Fastfile) define `staging` and `production` lanes. iOS uses an App Store Connect API key (`.p8`) for cert/profile fetch (`cert` + `sigh`) and TestFlight upload, with `xcargs` setting `PRODUCT_BUNDLE_IDENTIFIER` per lane. Android signs via the keystore + uploads to the Play internal track via a service account JSON.
- Build numbers auto-increment per release: iOS reads `latest_testflight_build_number + 1`; Android reads `google_play_track_version_codes + 1`. **Do not bump them manually.** `versionName` / `MARKETING_VERSION` (the user-visible "1.0.0") are still hand-bumped.
- Workflows: [.github/workflows/mobile-ios.yml](.github/workflows/mobile-ios.yml) (self-hosted Mac, label `mobile-ci`) and [.github/workflows/mobile-android.yml](.github/workflows/mobile-android.yml) (ubuntu) trigger on tags `mobile-v*` (production lane) and `mobile-staging-v*` (staging lane), plus manual `workflow_dispatch`.
- Full runbook + one-time setup (Mac runner registration, ASC API key, keystore, Play service account, GitHub secrets) lives in [mobile/RELEASE.md](mobile/RELEASE.md).
- **Critical invariant:** the Android signing keystore is irreplaceable — losing it bricks the published Play app forever. It lives only as `ANDROID_KEYSTORE_BASE64` in GitHub Secrets and a backup the user holds. Do not write tooling that regenerates or replaces it.

## Conventions to respect

- **No tests in any package.** When changing logic, manually exercise the affected flow (curl the API or run the relevant mobile screen) — there is no CI safety net.
- **Status enums are string codes** (`pending`, `active`, `expired`, `terminated`, `declined` for leases; `draft`, `sent`, `paid`, `partially_paid`, `overdue`, `cancelled` for invoices; etc.). Reuse the existing values rather than inventing new ones.
- **Soft-deletion**: User deletions anonymize rather than remove rows. Don't add hard-delete paths for user data.
- File uploads go to **Cloudinary** via `CloudinaryService`; do not write to local `uploads/` for anything other than dev scratch.
- The web package is a near-empty skeleton — don't assume parity with mobile features when working there.
