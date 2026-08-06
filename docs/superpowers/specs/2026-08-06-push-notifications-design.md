# Push Notifications — Design Spec

**Date:** 2026-08-06
**Status:** Approved, ready for implementation planning

## Problem

Property360 has in-app notifications (`Notification` model + Socket.IO room emit) but no real OS-level push. Two consequences:

1. If a user's app isn't open and socket-connected, they get nothing — the notification only shows up next time they open the app.
2. Chat messages (1:1 via `ChatService` and building chat via `BuildingChatService`) don't create a `Notification` record at all — they're pure Socket.IO emits. A recipient who isn't actively connected to that conversation's room gets no signal a message arrived.

The mobile `NotificationSettingsScreen` already labels its in-app toggles "Push", setting a user expectation the app doesn't currently meet.

## Goal

Real push notifications (banner/pop-up) that reach the user even when the app is backgrounded or fully killed, covering every existing notification type plus chat.

## Scope

**In scope:** payment, lease, maintenance, invitation, marketplace, general, profile_request (all existing `Notification` types) + chat messages (1:1 and building chat) — full coverage ("everything + chat").

**Explicitly out of scope:**
- A full landlord/agent in-app Notification Center screen. Only a type → route mapping needed for push tap-through is included; the tenant app already has a full list screen.
- Per-conversation mute. Chat push is controlled only by a new global `chatMessages` preference toggle.
- Rich push (images, action buttons). Plain title/body/data payload only for v1.
- Any native build config beyond what the `expo-notifications` config plugin generates automatically on prebuild.

## Delivery mechanism: Expo Push Notification Service

`expo-notifications` (mobile) + `expo-server-sdk-node` (backend). The mobile client obtains an Expo push token; the backend sends one HTTP call per batch and Expo relays to FCM/APNs.

This is a separate product from EAS Build/OTA and does not touch the existing GitHub Actions + fastlane release pipeline. Firebase and APNs credentials still have to be created (Apple/Google require them regardless of relay), but they're uploaded once to the Expo project via the Expo dashboard — no `eas build` or OTA update involved.

Rejected alternative: direct FCM + APNs integration (Firebase Admin SDK + `node-apn`). More control, no Expo-hosted dependency, but roughly double the integration surface (two token types, two payload formats, manual retry/receipt handling) for no benefit given neither credential set exists yet.

## Data model

New collection, following the existing pattern of standalone collections referencing `User` (e.g. `Wallet`, `BankAccount`) rather than an embedded array:

```
DeviceToken {
  user: ObjectId (ref User, indexed)
  token: string (unique index — Expo push token)
  platform: 'ios' | 'android'
  lastRegisteredAt: Date
}
```

A user can have multiple active tokens (multiple devices/reinstalls) — push sends to all of a user's tokens, not just the most recent. Registering a token that's already bound to a different user reassigns the row (covers device/account handoff, e.g. logout + different account login on the same phone).

`INotificationPreferences` gets one new key:

```
chatMessages: boolean (default true)
```

Kept separate from `generalAnnouncements` so muting marketing-style announcements doesn't silently mute DMs.

## Backend: registration endpoints

Under the existing `/notifications` router, both behind `protect`:

- `POST /notifications/device-tokens` `{ token, platform }` — upsert by token (reassigns `user` if the token already exists under a different account)
- `DELETE /notifications/device-tokens` `{ token }` — called on logout

Registration is not gated by the feature flag — collecting tokens before send is enabled is harmless and lets rollout be a single flag flip rather than requiring a second mobile release.

## Backend: send pipeline

New `PushNotificationService`:

- `sendToUsers(userIds, title, body, data)` — loads all `DeviceToken` rows for the given users, chunks into batches of 100 (Expo's per-request limit), sends via `expo-server-sdk-node`, records returned tickets.
- A daily cron job, added alongside the existing `LeaseExpirationService` cron in `server.ts` (same `node-cron` mechanism — no new job-queue infrastructure), checks ticket receipts and deletes any `DeviceToken` row that comes back `DeviceNotRegistered`.

**Integration point for existing types:** `NotificationService.createNotification` / `createMany` already sit in front of every non-chat type and already run preference filtering. Add the `PushNotificationService.sendToUsers` call as one more step alongside the existing `pushToUser` (Socket.IO) call, after the `Notification` documents are persisted and preference filtering has already narrowed the recipient list. Every existing call site (`TenantService`, `MaintenanceService`, `WalletService`, `ReservationService`, `SharedBillService`, `KYCService`, `TenancyAgreementService`, `TenantDashboardService`, `TenantProfileRequestService`, `AdminService`, `ListingService`) gets push automatically — no call-site changes required.

**Chat integration:** `ChatService.sendMessage` and `BuildingChatService.sendMessage`, invoked from the socket handlers in `socketServer.ts`, currently only emit to the conversation/building room. After the message is persisted, add a call to `NotificationService.createNotification(recipientId, senderName, messageText, 'chat', { conversationId }, { respectPreferences: true })` for 1:1 chat (and the equivalent per-recipient fan-out for building chat). To avoid double-buzzing someone actively viewing the conversation, skip the push (but still persist the `Notification` doc and emit the socket event as today) when the recipient already has a live socket joined to that `conversation:${id}` / `building:${propertyId}` room — checked via `io.in(room).fetchSockets()`.

`preferenceKeyFor` (in `NotificationService.ts`) gets a new case: `'chat' → 'chatMessages'`.

## Mobile client

- **Permission + registration**: on successful login, and on app foreground if already authenticated, request notification permission via `expo-notifications`, obtain the token via `Notifications.getExpoPushTokenAsync({ projectId })`, POST to `/notifications/device-tokens`. On logout, DELETE the current device's token. A push-token-changed listener re-registers if Expo issues a new token (reinstalls, device restores).
- **Foreground behavior**: `Notifications.setNotificationHandler` controls whether a banner shows while the app is open. Chat notifications are suppressed as an OS banner when the app is foregrounded on the relevant conversation screen (already covered by the live socket-driven UI update); shown otherwise. All other types always show when received.
- **Tap-through / deep linking**: extract the tenant app's existing inline type → route mapping (`handlePress` in `NotificationsScreen.tsx`) into a shared `getNotificationRoute(type, data)` helper. Wire it to both the existing in-app tap handler and a new `Notifications.addNotificationResponseReceivedListener` (fires on tap, including cold start from a killed app). Add the equivalent mapping for the landlord/agent role, scoped to push tap-through only (no new list screen).

## Rollout

Prerequisites (external setup, done once, not code):
1. Create a Firebase project, add the Android app, add `google-services.json` to the mobile project.
2. Generate an APNs Auth Key (`.p8`) in the Apple Developer portal, for both the production (`com.property360.africa`) and staging (`com.property360.africa.staging`) bundle IDs.
3. Upload both to the Expo project via the Expo dashboard (Project → Credentials).

Feature flag: `PUSH_NOTIFICATIONS_ENABLED` (backend env var, default false), following the existing pattern (`SALES_ASSISTANT_ENABLED`, `WALLET_FUNDING_ENABLED`). Gates only the send call in `PushNotificationService`; registration stays live regardless.

Because this repo has no OTA (every JS change ships via store re-submit), the mobile registration code shipping is itself a one-time release event, but turning delivery on afterward is a pure backend flag flip — no second mobile release needed. Sequence: ship the mobile release with registration code active and the backend flag off → verify credentials and delivery end-to-end with an internal test build → flip `PUSH_NOTIFICATIONS_ENABLED` on.
