# Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real OS-level push notifications (banner shown even when the app is backgrounded or killed) covering every existing `Notification` type plus chat messages, via the Expo Push Notification Service.

**Architecture:** A new `DeviceToken` collection stores one row per registered device. `PushNotificationService` (backend) sends through `expo-server-sdk`, invoked from the single `NotificationService.createMany`/`createNotification` choke point so all existing notification-producing call sites get push automatically. Chat (which bypasses `NotificationService` today) gets a new call added directly in the socket handlers, guarded by a room-presence check so a user actively viewing a conversation doesn't get double-buzzed. Mobile registers/unregisters an Expo push token tied to auth state (mirroring the existing `SocketProvider` pattern) and a shared route-mapping helper handles tap-through navigation for both in-app and OS push taps.

**Tech Stack:** `expo-server-sdk` (backend), `expo-notifications` (mobile), existing `node-cron` for receipt pruning — no new job-queue infrastructure.

**Note on testing:** This repo has no test runner (`CLAUDE.md`: "No tests in any package... manually exercise the affected flow"). Per that explicit project instruction, steps below replace the usual "write failing test" ritual with "implement, then manually verify via `npm run build` / curl / the relevant app screen."

---

## Task 0: Prerequisites (manual, external — not code)

These require a human with account access (Firebase console, Apple Developer portal, Expo dashboard login) and cannot be scripted by an engineer working from this plan alone. They block Task 12's end-to-end verification but do **not** block any other task — all backend and mobile code in Tasks 1–15 compiles and runs safely without real credentials (push sends will just no-op or fail silently until these exist).

- [ ] **Step 1: Create a Firebase project**

Go to https://console.firebase.google.com, create a project (e.g. "Property360"), add an Android app with package `com.property360.africa` (and a second Android app entry with package `com.property360.africa.staging` if you want staging push to work too). Download the resulting `google-services.json`.

- [ ] **Step 2: Add `google-services.json` to the mobile project**

Place the downloaded file at `mobile/google-services.json`. Do not commit it if it contains sensitive keys beyond the public `google-services.json` fields (Firebase's Android config file is safe to commit by convention, but check `mobile/.gitignore` first — if unsure, ask before committing).

- [ ] **Step 3: Generate an APNs Auth Key**

In https://developer.apple.com/account → Certificates, Identifiers & Profiles → Keys, create a new key with the "Apple Push Notifications service (APNs)" capability enabled. Download the `.p8` file (Apple only lets you download it once) and note the Key ID and your Team ID.

- [ ] **Step 4: Create/link an Expo project and get a project ID**

Run `cd mobile && npx eas init` (this only registers project identity for credential storage and push routing — it does not enable EAS Build or OTA, and nothing in the existing GitHub Actions + fastlane pipeline changes). This writes a `projectId` you'll need for Task 9. Note it down.

- [ ] **Step 5: Upload FCM and APNs credentials to the Expo project**

Via the Expo dashboard (expo.dev → your project → Credentials), upload the Firebase service account / `google-services.json` for Android push, and the APNs `.p8` key + Key ID + Team ID for iOS push.

- [ ] **Step 6: Record the Expo project ID as an env var**

Add `EXPO_PROJECT_ID=<the projectId from Step 4>` to your local `mobile/.env` (or however this project injects build-time env vars into `app.config.ts` — check for an existing `.env` loading mechanism in `mobile/app.config.ts` or CI secrets) and to the CI secrets used by the GitHub Actions mobile workflows, since `app.config.ts` reads `process.env.EXPO_PROJECT_ID` (added in Task 9).

---

## Task 1: Backend dependency

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Install expo-server-sdk**

Run: `cd backend && npm install expo-server-sdk`

- [ ] **Step 2: Verify it installed**

Run: `cd backend && node -e "console.log(require('expo-server-sdk').Expo)"`
Expected: prints the `Expo` class (a function), no error.

- [ ] **Step 3: Commit**

```bash
cd backend && git add package.json package-lock.json && git commit -m "chore(backend): add expo-server-sdk dependency"
```

---

## Task 2: DeviceToken model + type

**Files:**
- Create: `backend/src/models/DeviceToken.ts`
- Modify: `backend/src/models/index.ts`
- Modify: `backend/src/types/index.ts`

- [ ] **Step 1: Add the `IDeviceToken` type**

In `backend/src/types/index.ts`, add this near the `INotification` interface (after it):

```typescript
// Registered Expo push token for a device
export interface IDeviceToken extends Document {
  user: IUser['_id'];
  token: string;
  platform: 'ios' | 'android';
  lastRegisteredAt: Date;
  lastTicketId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Create the model**

Create `backend/src/models/DeviceToken.ts`:

```typescript
import mongoose, { Schema } from 'mongoose';
import { IDeviceToken } from '../types';

const deviceTokenSchema = new Schema<IDeviceToken>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    token: {
      type: String,
      required: [true, 'Token is required'],
      unique: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ['ios', 'android'],
      required: [true, 'Platform is required'],
    },
    lastRegisteredAt: {
      type: Date,
      default: Date.now,
    },
    lastTicketId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

deviceTokenSchema.index({ user: 1 });

export const DeviceToken = mongoose.model<IDeviceToken>('DeviceToken', deviceTokenSchema);
export default DeviceToken;
```

- [ ] **Step 3: Export from models/index.ts**

In `backend/src/models/index.ts`, add this line after `export { PartnerCommission } from './PartnerCommission';`:

```typescript
export { DeviceToken } from './DeviceToken';
```

- [ ] **Step 4: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd backend && git add src/models/DeviceToken.ts src/models/index.ts src/types/index.ts && git commit -m "feat(backend): add DeviceToken model for push notification tokens"
```

---

## Task 3: `chatMessages` notification preference

**Files:**
- Modify: `backend/src/types/index.ts` (`INotificationPreferences`, around line 118)
- Modify: `backend/src/models/User.ts` (`notificationPreferences` schema block, around line 139)

Note: `main` already has `whatsappUpdates`/`smsFallback` fields (from the tenant WhatsApp+SMS messaging feature merged 2026-08-05) that weren't present when this plan was originally drafted against an older branch. The snippets below reflect the actual current `main` content — match against the real file, not just these line numbers.

- [ ] **Step 1: Add the field to the type**

In `backend/src/types/index.ts`, modify `INotificationPreferences` — change:

```typescript
export interface INotificationPreferences {
  paymentReminders: boolean;
  leaseExpiration: boolean;
  maintenanceUpdates: boolean;
  generalAnnouncements: boolean;
  marketingEmails: boolean;
  // WhatsApp delivery opt-ins. Tenant turns these on from the app; the
  // landlord's subscription tier still has to allow WhatsApp delivery
  // (Pro+) or the send is suppressed at the service layer.
  whatsappPaymentReminders: boolean;
  whatsappReceipts: boolean;
  whatsappInvoices: boolean;
  // Unified tenant lifecycle delivery (TenantMessagingService). Opt-out:
  // read as "on unless explicitly false". Supersede the three per-event
  // whatsapp* keys above, which are now dormant.
  whatsappUpdates: boolean;
  smsFallback: boolean;
}
```

to:

```typescript
export interface INotificationPreferences {
  paymentReminders: boolean;
  leaseExpiration: boolean;
  maintenanceUpdates: boolean;
  generalAnnouncements: boolean;
  marketingEmails: boolean;
  chatMessages: boolean;
  // WhatsApp delivery opt-ins. Tenant turns these on from the app; the
  // landlord's subscription tier still has to allow WhatsApp delivery
  // (Pro+) or the send is suppressed at the service layer.
  whatsappPaymentReminders: boolean;
  whatsappReceipts: boolean;
  whatsappInvoices: boolean;
  // Unified tenant lifecycle delivery (TenantMessagingService). Opt-out:
  // read as "on unless explicitly false". Supersede the three per-event
  // whatsapp* keys above, which are now dormant.
  whatsappUpdates: boolean;
  smsFallback: boolean;
}
```

- [ ] **Step 2: Add the schema default**

In `backend/src/models/User.ts`, modify the `notificationPreferences` block — change:

```typescript
    notificationPreferences: {
      paymentReminders: { type: Boolean, default: true },
      leaseExpiration: { type: Boolean, default: true },
      maintenanceUpdates: { type: Boolean, default: true },
      generalAnnouncements: { type: Boolean, default: true },
      marketingEmails: { type: Boolean, default: false },
      // Tenant-side WhatsApp delivery. Off by default so we don't surprise
      // anyone with paid-channel messaging; tenant opts in from the app.
      // Gated server-side by the landlord's subscription tier — Pro+ only.
      whatsappPaymentReminders: { type: Boolean, default: false },
      whatsappReceipts: { type: Boolean, default: false },
      whatsappInvoices: { type: Boolean, default: false },
      // Unified lifecycle delivery — ON by default (opt-out). Tenants
      // receive WhatsApp (with SMS fallback) without taking any action.
      whatsappUpdates: { type: Boolean, default: true },
      smsFallback: { type: Boolean, default: true },
    },
```

to:

```typescript
    notificationPreferences: {
      paymentReminders: { type: Boolean, default: true },
      leaseExpiration: { type: Boolean, default: true },
      maintenanceUpdates: { type: Boolean, default: true },
      generalAnnouncements: { type: Boolean, default: true },
      marketingEmails: { type: Boolean, default: false },
      chatMessages: { type: Boolean, default: true },
      // Tenant-side WhatsApp delivery. Off by default so we don't surprise
      // anyone with paid-channel messaging; tenant opts in from the app.
      // Gated server-side by the landlord's subscription tier — Pro+ only.
      whatsappPaymentReminders: { type: Boolean, default: false },
      whatsappReceipts: { type: Boolean, default: false },
      whatsappInvoices: { type: Boolean, default: false },
      // Unified lifecycle delivery — ON by default (opt-out). Tenants
      // receive WhatsApp (with SMS fallback) without taking any action.
      whatsappUpdates: { type: Boolean, default: true },
      smsFallback: { type: Boolean, default: true },
    },
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd backend && git add src/types/index.ts src/models/User.ts && git commit -m "feat(backend): add chatMessages notification preference"
```

---

## Task 4: `PUSH_NOTIFICATIONS_ENABLED` config flag

**Files:**
- Modify: `backend/src/config/index.ts`
- Modify: `backend/.env.example`
- Modify: `backend/.env.prod.example`

- [ ] **Step 1: Add the config block**

In `backend/src/config/index.ts`, add this near the other feature-flag blocks (after the `kyc` block):

```typescript
  // Master switch for sending real OS push notifications via the Expo Push
  // Service. Default false so backend deploys dark — device tokens are
  // still collected regardless (see DeviceToken registration endpoints),
  // only the actual send is gated. Flip on once Task 0's Firebase/APNs/Expo
  // credential setup is verified end-to-end.
  push: {
    enabled:
      (process.env.PUSH_NOTIFICATIONS_ENABLED ?? 'false').toLowerCase() === 'true',
  },
```

- [ ] **Step 2: Add to .env.example**

In `backend/.env.example`, add after the `KYC_PAYOUT_GATE_ENABLED=false` line:

```
# Master switch for sending real push notifications via Expo. Default false;
# device token registration still works regardless. Flip on once Firebase/
# APNs credentials are uploaded to the Expo project (see push notifications
# design spec).
PUSH_NOTIFICATIONS_ENABLED=false
```

- [ ] **Step 3: Add to .env.prod.example**

In `backend/.env.prod.example`, add the same block after the `KYC_PAYOUT_GATE_ENABLED=false` line:

```
# Master switch for sending real push notifications via Expo. Default false;
# device token registration still works regardless. Flip on once Firebase/
# APNs credentials are uploaded to the Expo project (see push notifications
# design spec).
PUSH_NOTIFICATIONS_ENABLED=false
```

- [ ] **Step 4: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd backend && git add src/config/index.ts .env.example .env.prod.example && git commit -m "feat(backend): add PUSH_NOTIFICATIONS_ENABLED flag"
```

---

## Task 5: PushNotificationService

**Files:**
- Create: `backend/src/services/PushNotificationService.ts`

- [ ] **Step 1: Write the service**

Create `backend/src/services/PushNotificationService.ts`:

```typescript
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { DeviceToken } from '../models';
import config from '../config';

const expo = new Expo();

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

class PushNotificationService {
  /**
   * Send a push notification to every registered device of the given users.
   * No-ops entirely while PUSH_NOTIFICATIONS_ENABLED is false, so this is
   * safe to call unconditionally from NotificationService.
   */
  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    if (!config.push.enabled) return;
    if (userIds.length === 0) return;

    const tokens = await DeviceToken.find({ user: { $in: userIds } });
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens
      .filter((t) => Expo.isExpoPushToken(t.token))
      .map((t) => ({
        to: t.token,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
      }));

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        await Promise.all(
          tickets.map((ticket, i) => {
            const message = chunk[i];
            if (ticket.status !== 'ok' || !message) return Promise.resolve();
            return DeviceToken.updateOne(
              { token: message.to as string },
              { lastTicketId: ticket.id }
            );
          })
        );
      } catch (err) {
        console.error('[PushNotificationService] Send failed:', err);
      }
    }
  }

  /**
   * Check delivery receipts for the last ticket sent to each token and
   * prune tokens Expo reports as permanently dead (DeviceNotRegistered).
   * Run on a recurring cron — see server.ts.
   */
  async checkReceiptsAndPrune(): Promise<void> {
    const tokens = await DeviceToken.find({
      lastTicketId: { $exists: true, $ne: null },
    });
    if (tokens.length === 0) return;

    const receiptIds = tokens.map((t) => t.lastTicketId as string);
    const chunks = expo.chunkPushNotificationReceiptIds(receiptIds);

    for (const chunk of chunks) {
      try {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

        for (const receiptId of Object.keys(receipts)) {
          const receipt = receipts[receiptId];
          const tokenDoc = tokens.find((t) => t.lastTicketId === receiptId);
          if (!tokenDoc || !receipt) continue;

          if (receipt.status === 'error') {
            if (receipt.details?.error === 'DeviceNotRegistered') {
              await DeviceToken.deleteOne({ _id: tokenDoc._id });
            } else {
              console.error(
                `[PushNotificationService] Receipt error for device ${tokenDoc._id}:`,
                receipt.message
              );
              await DeviceToken.updateOne(
                { _id: tokenDoc._id },
                { $unset: { lastTicketId: 1 } }
              );
            }
          } else {
            await DeviceToken.updateOne(
              { _id: tokenDoc._id },
              { $unset: { lastTicketId: 1 } }
            );
          }
        }
      } catch (err) {
        console.error('[PushNotificationService] Receipt check failed:', err);
      }
    }
  }
}

export default new PushNotificationService();
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd backend && git add src/services/PushNotificationService.ts && git commit -m "feat(backend): add PushNotificationService (Expo push send + receipt pruning)"
```

---

## Task 6: Device-token registration endpoints

**Files:**
- Modify: `backend/src/services/NotificationService.ts`
- Modify: `backend/src/controllers/NotificationController.ts`
- Modify: `backend/src/routes/notifications.ts`

- [ ] **Step 1: Add register/unregister methods to NotificationService**

In `backend/src/services/NotificationService.ts`, add the import and two methods. First, add to the imports at the top:

```typescript
import { Notification, User, DeviceToken } from '../models';
```

Then add these two methods inside the `NotificationService` class, after `markAllAsRead`:

```typescript
  async registerDeviceToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android'
  ): Promise<void> {
    await DeviceToken.findOneAndUpdate(
      { token },
      { user: userId, token, platform, lastRegisteredAt: new Date() },
      { upsert: true }
    );
  }

  async unregisterDeviceToken(userId: string, token: string): Promise<void> {
    await DeviceToken.deleteOne({ token, user: userId });
  }
```

- [ ] **Step 2: Add controller methods**

In `backend/src/controllers/NotificationController.ts`, add these two methods inside the `NotificationController` class, after `markAllAsRead`:

```typescript
  async registerDeviceToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, platform } = req.body as { token: string; platform: 'ios' | 'android' };
      await NotificationService.registerDeviceToken(req.user!._id.toString(), token, platform);

      const response: ApiResponse = {
        success: true,
        message: 'Device registered',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async unregisterDeviceToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body as { token: string };
      await NotificationService.unregisterDeviceToken(req.user!._id.toString(), token);

      const response: ApiResponse = {
        success: true,
        message: 'Device unregistered',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
```

- [ ] **Step 3: Add routes**

In `backend/src/routes/notifications.ts`, change the `express-validator` import line to add `body`:

```typescript
import { body, param, query } from 'express-validator';
```

Then add these two routes before the final `export default router;`:

```typescript
// Register a device's Expo push token
router.post(
  '/device-tokens',
  validate([
    body('token').isString().notEmpty().withMessage('Token is required'),
    body('platform')
      .isIn(['ios', 'android'])
      .withMessage('Platform must be ios or android'),
  ]),
  NotificationController.registerDeviceToken
);

// Unregister a device's Expo push token (called on logout)
router.delete(
  '/device-tokens',
  validate([
    body('token').isString().notEmpty().withMessage('Token is required'),
  ]),
  NotificationController.unregisterDeviceToken
);
```

- [ ] **Step 4: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually verify the endpoints**

Start the backend (`cd backend && npm run dev`), get a valid JWT by logging in via the existing `/api/v1/auth/login` endpoint with a test account, then:

```bash
curl -X POST http://localhost:5001/api/v1/notifications/device-tokens \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"token": "ExponentPushToken[test-token-123]", "platform": "ios"}'
```

Expected: `{"success":true,"message":"Device registered"}`. Then:

```bash
curl -X DELETE http://localhost:5001/api/v1/notifications/device-tokens \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"token": "ExponentPushToken[test-token-123]"}'
```

Expected: `{"success":true,"message":"Device unregistered"}`.

- [ ] **Step 6: Commit**

```bash
cd backend && git add src/services/NotificationService.ts src/controllers/NotificationController.ts src/routes/notifications.ts && git commit -m "feat(backend): add device token registration endpoints"
```

---

## Task 7: Wire push sends into NotificationService

**Files:**
- Modify: `backend/src/services/NotificationService.ts`

This is the integration point that gives every existing notification-producing call site (payment, lease, maintenance, invitation, marketplace, general, profile_request) push delivery automatically.

- [ ] **Step 1: Import PushNotificationService**

In `backend/src/services/NotificationService.ts`, add to the imports:

```typescript
import PushNotificationService from './PushNotificationService';
```

- [ ] **Step 2: Add the chatMessages preference mapping**

Modify the `preferenceKeyFor` function's switch statement — change:

```typescript
    case 'marketplace':
    case 'chat':
    case 'general':
      return 'generalAnnouncements';
```

to:

```typescript
    case 'marketplace':
    case 'general':
      return 'generalAnnouncements';
    case 'chat':
      return 'chatMessages';
```

- [ ] **Step 3: Send push after persisting notifications**

In the `createMany` method, modify:

```typescript
    const created = (await Notification.insertMany(docs)) as unknown as INotification[];
    created.forEach(pushToUser);
    return created;
```

to:

```typescript
    const created = (await Notification.insertMany(docs)) as unknown as INotification[];
    created.forEach(pushToUser);

    PushNotificationService.sendToUsers(recipients, {
      title,
      body: message,
      data: { ...data, type },
    }).catch((err) => console.error('[NotificationService] Push send failed:', err));

    return created;
```

Note: `{ ...data, type }`, not `{ type, ...data }` — object spread order means later keys win, so `type` must come after `...data` to guarantee the real notification type can never be silently overwritten by a caller's `data` object (even though no current call site passes a `data.type`, this makes it impossible by construction rather than by convention).

- [ ] **Step 4: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually verify the wiring is inert while the flag is off**

With `PUSH_NOTIFICATIONS_ENABLED` unset (defaults false) in `backend/.env.dev`, start the backend and trigger any existing notification-producing flow — e.g. create a maintenance request via the mobile app or `POST /api/v1/maintenance` with a valid tenant token. Expected: the request succeeds exactly as before (check server logs — no `[PushNotificationService]` errors, no thrown exceptions), confirming the new code path is a safe no-op.

- [ ] **Step 6: Commit**

```bash
cd backend && git add src/services/NotificationService.ts && git commit -m "feat(backend): send push notifications from NotificationService"
```

---

## Task 8: Receipt-pruning cron

**Files:**
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Import the service**

In `backend/src/server.ts`, add to the imports:

```typescript
import PushNotificationService from './services/PushNotificationService';
```

- [ ] **Step 2: Schedule the cron**

Add this cron schedule inside `startServer`, after the existing `*/15 * * * *` shared-bill-withdrawal cron block:

```typescript
    // Check Expo push delivery receipts and prune permanently-dead device
    // tokens every 30 minutes. Expo recommends checking receipts a while
    // after sending (not immediately) — 30 min matches the existing
    // withdrawal-sweep cron's granularity.
    cron.schedule('*/30 * * * *', async () => {
      try {
        await PushNotificationService.checkReceiptsAndPrune();
      } catch (err) {
        console.error('[Cron] Push receipt check failed:', err);
      }
    });
```

- [ ] **Step 3: Verify it compiles and starts**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

Run: `cd backend && npm run dev`, watch the startup logs.
Expected: server starts normally, no new errors (the cron won't fire immediately — that's expected, it's on a 30-minute schedule).

- [ ] **Step 4: Commit**

```bash
cd backend && git add src/server.ts && git commit -m "feat(backend): add push notification receipt-pruning cron"
```

---

## Task 9: Chat push integration

**Files:**
- Modify: `backend/src/services/ChatService.ts`
- Modify: `backend/src/socket/socketServer.ts`

This is the one path that bypasses `NotificationService` today — 1:1 chat and building chat only emit over Socket.IO. We add a `NotificationService` call after the message is persisted, skipped when the recipient already has a live socket in that room (so someone actively chatting doesn't get double-buzzed).

- [ ] **Step 1: Add a helper to ChatService to resolve the other participant**

In `backend/src/services/ChatService.ts`, add this method to the `ChatService` class, after `sendMessage`:

```typescript
  /**
   * Resolve the other participant's user ID for a conversation, given one
   * side of it. Used by the socket layer to know who to push-notify.
   */
  async getOtherParticipantId(conversationId: string, userId: string): Promise<string | null> {
    const conversation = await Conversation.findById(conversationId).select('tenant landlord');
    if (!conversation) return null;
    const isTenant = conversation.tenant.toString() === userId;
    return (isTenant ? conversation.landlord : conversation.tenant).toString();
  }
```

- [ ] **Step 2: Add a room-presence helper to socketServer.ts**

In `backend/src/socket/socketServer.ts`, add this function after `isUserOnline`. It's a local, synchronous check against the in-memory room/user maps — correct because Socket.IO connections in this app are single-instance and not Redis-shared (see CLAUDE.md), so `io.sockets.adapter.rooms` is authoritative.

```typescript
// Whether the given user currently has a live socket joined to the given
// room. Used to skip a push notification for someone actively viewing the
// conversation/building chat they'd otherwise be notified about.
export function isUserInRoom(userId: string, room: string): boolean {
  const userSocketIds = onlineUsers.get(userId);
  if (!userSocketIds) return false;

  const roomSocketIds = io.sockets.adapter.rooms.get(room);
  if (!roomSocketIds) return false;

  for (const socketId of userSocketIds) {
    if (roomSocketIds.has(socketId)) return true;
  }
  return false;
}
```

- [ ] **Step 3: Import NotificationService**

In `backend/src/socket/socketServer.ts`, add to the imports:

```typescript
import NotificationService from '../services/NotificationService';
```

- [ ] **Step 4: Wire 1:1 chat notifications**

Modify the `chat:message` handler:

```typescript
    // Send a message
    socket.on('chat:message', async (data: { conversationId: string; text: string }) => {
      try {
        const message = await ChatService.sendMessage(
          data.conversationId,
          userId,
          data.text
        );

        // Emit to all in the conversation room
        io.to(`conversation:${data.conversationId}`).emit('chat:message', message);

        const recipientId = await ChatService.getOtherParticipantId(data.conversationId, userId);
        if (recipientId && !isUserInRoom(recipientId, `conversation:${data.conversationId}`)) {
          const sender = (message as any).sender;
          const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'New message';
          NotificationService.createNotification(
            recipientId,
            senderName,
            data.text || 'Sent a message',
            'chat',
            { conversationId: data.conversationId }
          ).catch((err) => console.error('[Socket] Chat notification failed:', err));
        }
      } catch (error) {
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });
```

- [ ] **Step 5: Wire building chat notifications**

Modify the `building:message` handler:

```typescript
    socket.on(
      'building:message',
      async (data: { propertyId: string; text: string; messageType?: string }) => {
        try {
          await BuildingChatService.assertMembership(userId, data.propertyId);
          const message = await BuildingChatService.sendMessage(
            data.propertyId,
            userId,
            { text: data.text, messageType: data.messageType as any }
          );
          io.to(`building:${data.propertyId}`).emit('building:message', message);

          const members = await BuildingChatService.getMembers(data.propertyId);
          const recipientIds = members
            .map((m: any) => m.tenant._id.toString())
            .filter((id: string) => id !== userId)
            .filter((id: string) => !isUserInRoom(id, `building:${data.propertyId}`));

          if (recipientIds.length > 0) {
            const sender = (message as any).sender;
            const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'New message';
            NotificationService.createMany(
              recipientIds,
              senderName,
              data.text || 'Sent a message',
              'chat',
              { propertyId: data.propertyId }
            ).catch((err) => console.error('[Socket] Building chat notification failed:', err));
          }
        } catch {
          socket.emit('building:error', {
            code: 'send_failed',
            message: 'Failed to send building message',
          });
        }
      }
    );
```

- [ ] **Step 6: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Manually verify with two logged-in sessions**

Start the backend. Using two browser tabs or two devices/simulators logged in as a tenant and their landlord (or use a REST client with two JWTs plus a Socket.IO test client), connect both sockets, have the landlord NOT join the conversation room, and have the tenant emit `chat:message`. Expected: the landlord's socket receives `chat:message`, and a `Notification` document is created for the landlord (check via `GET /api/v1/notifications` with the landlord's token, or query MongoDB directly: `db.notifications.find({ type: 'chat' }).sort({ createdAt: -1 }).limit(1)`). Then repeat with the landlord's socket having emitted `chat:join` for that conversation first — expected: no new `Notification` document is created for that second message (the presence check suppressed it).

- [ ] **Step 8: Commit**

```bash
cd backend && git add src/services/ChatService.ts src/socket/socketServer.ts && git commit -m "feat(backend): send push notifications for chat and building chat messages"
```

---

## Task 10: Mobile dependency + app config

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/app.config.ts`

- [ ] **Step 1: Install expo-notifications**

Run: `cd mobile && npx expo install expo-notifications`

This resolves and pins the version compatible with Expo SDK 54, matching how every other `expo-*` dependency in `mobile/package.json` is already version-pinned.

- [ ] **Step 2: Add the EAS project ID to app config**

In `mobile/app.config.ts`, modify the `extra` block:

```typescript
    extra: {
      ...config.extra,
      apiUrl: v.apiUrl,
      variant,
      eas: {
        projectId: process.env.EXPO_PROJECT_ID,
      },
    },
```

This reads the `EXPO_PROJECT_ID` env var set up in Task 0, Step 6. Until that's set, `Constants.expoConfig?.extra?.eas?.projectId` will be `undefined` and the mobile registration code (Task 12) treats that as "skip silently" — safe either way.

- [ ] **Step 3: Verify it compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd mobile && git add package.json package-lock.json app.config.ts && git commit -m "chore(mobile): add expo-notifications and EAS project ID config"
```

---

## Task 11: Device-token API + URL constants

**Files:**
- Modify: `mobile/src/api/endpoints/urls.ts:150-155`
- Modify: `mobile/src/services/notification.ts`

- [ ] **Step 1: Add URL constants**

In `mobile/src/api/endpoints/urls.ts`, modify `NOTIFICATION_URLS`:

```typescript
export const NOTIFICATION_URLS = {
  LIST: '/notifications',
  UNREAD_COUNT: '/notifications/unread-count',
  MARK_READ: (id: string) => `/notifications/${id}/read`,
  MARK_ALL_READ: '/notifications/read-all',
  DEVICE_TOKENS: '/notifications/device-tokens',
} as const;
```

- [ ] **Step 2: Add API wrapper functions**

In `mobile/src/services/notification.ts`, add these two functions to the `notificationApi` object, after `declineInvitation`:

```typescript
  async registerDeviceToken(token: string, platform: 'ios' | 'android'): Promise<void> {
    await api.post(NOTIFICATION_URLS.DEVICE_TOKENS, { token, platform });
  },

  async unregisterDeviceToken(token: string): Promise<void> {
    await api.delete(NOTIFICATION_URLS.DEVICE_TOKENS, { data: { token } });
  },
```

Add `NOTIFICATION_URLS` to the imports at the top of the file:

```typescript
import { api } from './api';
import { NOTIFICATION_URLS } from '../api/endpoints/urls';
```

- [ ] **Step 3: Verify it compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd mobile && git add src/api/endpoints/urls.ts src/services/notification.ts && git commit -m "feat(mobile): add device token API wrappers"
```

---

## Task 12: Push notification service module

**Files:**
- Create: `mobile/src/services/pushNotification.ts`

- [ ] **Step 1: Write the service**

Create `mobile/src/services/pushNotification.ts`:

```typescript
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { notificationApi } from './notification';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
}

/**
 * Request notification permission (if not already granted) and register
 * this device's Expo push token with the backend. Safe to call every time
 * the app becomes authenticated — no-ops quietly if permission is denied
 * or no EAS project ID is configured yet.
 */
export async function registerForPushNotificationsAsync(): Promise<void> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const projectId = getProjectId();
    if (!projectId) {
      if (__DEV__) {
        console.log('[Push] No EAS projectId configured, skipping token registration');
      }
      return;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    await notificationApi.registerDeviceToken(tokenResponse.data, platform);
  } catch (error) {
    if (__DEV__) {
      console.log('[Push] Registration failed:', error);
    }
  }
}

/**
 * Best-effort unregister of this device's token. Called on logout, before
 * the auth token is cleared. Never throws — logout must proceed regardless.
 */
export async function unregisterPushNotificationsAsync(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const projectId = getProjectId();
    if (!projectId) return;

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    await notificationApi.unregisterDeviceToken(tokenResponse.data);
  } catch (error) {
    if (__DEV__) {
      console.log('[Push] Unregistration failed:', error);
    }
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd mobile && git add src/services/pushNotification.ts && git commit -m "feat(mobile): add push notification registration service"
```

---

## Task 13: Shared notification route mapping

**Files:**
- Create: `mobile/src/utils/notificationRouting.ts`
- Modify: `mobile/src/screens/tenantApp/NotificationsScreen.tsx:68-126`

- [ ] **Step 1: Extract the routing logic into a shared helper**

Create `mobile/src/utils/notificationRouting.ts`. This is the existing `handlePress` switch from `NotificationsScreen.tsx`, extracted so both the in-app tap handler and the OS push tap listener (Task 14) can use it, plus a new `chat` case (chat notifications didn't exist before this feature):

```typescript
export interface NotificationRoute {
  screen: string;
  params?: Record<string, unknown>;
}

/**
 * Map a notification's type + data payload to a navigation target. Shared
 * between the in-app notification list (tap on a list row) and the OS push
 * tap listener (tap a system notification, including from a killed app).
 */
export function getNotificationRoute(
  type: string,
  data: Record<string, unknown> | undefined,
  isTenant: boolean
): NotificationRoute | null {
  switch (type) {
    case 'invitation':
      if (data?.leaseId) {
        return { screen: 'LeaseInvitation', params: { leaseId: data.leaseId } };
      }
      return null;
    case 'payment':
      if (isTenant) {
        return { screen: 'TenantMain', params: { screen: 'TenantPayments' } };
      }
      if (data?.action === 'confirm_payment' || data?.transactionId) {
        return { screen: 'PendingPayments' };
      }
      return null;
    case 'lease':
      return isTenant
        ? { screen: 'TenantMain', params: { screen: 'TenantHome' } }
        : { screen: 'Tenants' };
    case 'marketplace':
      return isTenant ? { screen: 'MyReservations' } : { screen: 'ReservationRequests' };
    case 'maintenance':
      if (isTenant) return { screen: 'TenantRequests' };
      if (data?.requestId) {
        return { screen: 'MaintenanceDetail', params: { requestId: data.requestId } };
      }
      return { screen: 'Maintenance' };
    case 'profile_request':
      if (isTenant && data?.requestId) {
        return { screen: 'CompleteProfile', params: { requestId: data.requestId } };
      }
      if (!isTenant && data?.leaseId) {
        return { screen: 'Tenants' };
      }
      return null;
    case 'chat':
      if (data?.conversationId) {
        return { screen: 'Chat', params: { conversationId: data.conversationId } };
      }
      if (data?.propertyId) {
        return { screen: 'BuildingChat', params: { propertyId: data.propertyId } };
      }
      return null;
    default:
      return null;
  }
}
```

- [ ] **Step 2: Use it in NotificationsScreen**

In `mobile/src/screens/tenantApp/NotificationsScreen.tsx`, add the import:

```typescript
import { getNotificationRoute } from '../../utils/notificationRouting';
```

Replace the entire `handlePress` function body:

```typescript
  const handlePress = (item: NotificationItem) => {
    if (!item.isRead) {
      markAsRead(item._id);
    }

    const route = getNotificationRoute(item.type, item.data, isTenant);
    if (route) {
      navigation.navigate(route.screen as any, route.params as any);
    }
  };
```

- [ ] **Step 3: Verify it compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manually verify existing tap-through still works**

Run the app (`cd mobile && npm start`), log in as a tenant with at least one existing notification (e.g. a payment or lease notification), open the Notifications screen, tap a notification. Expected: navigates to the same screen it did before this change (behavior unchanged, just refactored).

- [ ] **Step 5: Commit**

```bash
cd mobile && git add src/utils/notificationRouting.ts src/screens/tenantApp/NotificationsScreen.tsx && git commit -m "refactor(mobile): extract notification tap-through routing into a shared helper"
```

---

## Task 14: Push tap-through listener + provider

**Files:**
- Create: `mobile/src/context/PushNotificationContext.tsx`
- Modify: `mobile/App.tsx`

- [ ] **Step 1: Write the provider**

Create `mobile/src/context/PushNotificationContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import * as Notifications from 'expo-notifications';
import { useAppSelector, selectIsTenant } from '../store';
import { navigationRef } from '../navigation';
import { getNotificationRoute } from '../utils/notificationRouting';
import { registerForPushNotificationsAsync } from '../services/pushNotification';

const PushNotificationContext = createContext<null>(null);

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isTenant = useAppSelector(selectIsTenant);

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotificationsAsync();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { type?: string; [key: string]: unknown }
        | undefined;

      if (!data?.type) return;

      const route = getNotificationRoute(data.type, data, isTenant);
      if (route && navigationRef.isReady()) {
        navigationRef.navigate(route.screen as never, route.params as never);
      }
    });

    return () => subscription.remove();
  }, [isTenant]);

  return (
    <PushNotificationContext.Provider value={null}>{children}</PushNotificationContext.Provider>
  );
}

export function usePushNotificationContext() {
  return useContext(PushNotificationContext);
}
```

- [ ] **Step 2: Mount it in App.tsx**

In `mobile/App.tsx`, add the import:

```typescript
import { PushNotificationProvider } from './src/context/PushNotificationContext';
```

Modify the provider tree — wrap `PersistGate` with `PushNotificationProvider`, matching how `SocketProvider` already wraps it:

```typescript
                    <SocketProvider>
                      <PushNotificationProvider>
                        <PersistGate loading={null} persistor={persistor}>
                          <AppContent />
                        </PersistGate>
                      </PushNotificationProvider>
                    </SocketProvider>
```

- [ ] **Step 3: Verify it compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manually verify permission prompt + registration**

Run the app on a physical device or a simulator/emulator capable of push (Android emulator with Play Store image, or a physical iOS device — the iOS Simulator cannot receive real push). Log in. Expected: an OS permission prompt appears ("Property360 Would Like to Send You Notifications"); accept it. Check backend logs or query MongoDB (`db.devicetokens.find()`) to confirm a `DeviceToken` document was created for that user.

This step only fully works once Task 0 (Firebase/APNs/Expo credentials + `EXPO_PROJECT_ID`) is complete — until then, `getExpoPushTokenAsync` will throw and the service logs `[Push] Registration failed:` in dev mode, which is expected and harmless.

- [ ] **Step 5: Commit**

```bash
cd mobile && git add src/context/PushNotificationContext.tsx App.tsx && git commit -m "feat(mobile): register push tokens and handle notification taps"
```

---

## Task 15: Wire unregister into logout + add preference toggle

**Files:**
- Modify: `mobile/src/services/auth.ts`
- Modify: `mobile/src/screens/main/Profile/NotificationSettingsScreen.tsx`

- [ ] **Step 1: Unregister the device token on logout**

In `mobile/src/services/auth.ts`, add the import:

```typescript
import { unregisterPushNotificationsAsync } from './pushNotification';
```

Modify the `logout` method:

```typescript
  async logout(): Promise<void> {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } finally {
      await unregisterPushNotificationsAsync();
      await tokenStorage.clearTokens();
    }
  },
```

- [ ] **Step 2: Add `chatMessages` to the NotificationPreferences type**

In `mobile/src/services/auth.ts`, modify the `NotificationPreferences` interface:

```typescript
export interface NotificationPreferences {
  paymentReminders: boolean;
  leaseExpiration: boolean;
  maintenanceUpdates: boolean;
  generalAnnouncements: boolean;
  marketingEmails: boolean;
  chatMessages: boolean;
  // WhatsApp opt-ins (Pro+ landlord tier required server-side; if the
  // landlord isn't on Pro+, the toggle is harmless — the send is just
  // suppressed.)
  whatsappPaymentReminders: boolean;
  whatsappReceipts: boolean;
  whatsappInvoices: boolean;
  // Unified tenant lifecycle delivery (opt-out, default on). Supersede the
  // three per-event whatsapp* keys above.
  whatsappUpdates: boolean;
  smsFallback: boolean;
}
```

- [ ] **Step 3: Add the toggle to NotificationSettingsScreen**

In `mobile/src/screens/main/Profile/NotificationSettingsScreen.tsx`, modify `PUSH_ITEMS`:

```typescript
const PUSH_ITEMS: SettingItem[] = [
  {
    key: 'paymentReminders',
    label: 'Payment reminders',
    description: 'Upcoming and overdue payments',
    icon: 'cash-outline',
  },
  {
    key: 'leaseExpiration',
    label: 'Lease expiration alerts',
    description: 'When leases are about to expire',
    icon: 'calendar-outline',
  },
  {
    key: 'maintenanceUpdates',
    label: 'Maintenance updates',
    description: 'Maintenance request status changes',
    icon: 'construct-outline',
  },
  {
    key: 'chatMessages',
    label: 'Chat messages',
    description: 'New messages in your conversations',
    icon: 'chatbubble-outline',
  },
  {
    key: 'generalAnnouncements',
    label: 'General announcements',
    description: 'Important updates and news',
    icon: 'megaphone-outline',
  },
];
```

- [ ] **Step 4: Verify it compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually verify the toggle**

Run the app, navigate to Profile → Notification Settings. Expected: a new "Chat messages" row appears under the push section, defaults to on, and toggling it persists (pull-to-refresh or re-navigate to confirm the toggle state is saved via the existing `useUpdateNotificationPreferences` mutation).

- [ ] **Step 6: Commit**

```bash
cd mobile && git add src/services/auth.ts src/screens/main/Profile/NotificationSettingsScreen.tsx && git commit -m "feat(mobile): unregister push token on logout, add chat messages toggle"
```

---

## Self-Review Notes

**Spec coverage:** Every section of the design spec maps to a task — data model (Tasks 2–3), registration endpoints (Task 6), send pipeline (Tasks 5, 7), receipt pruning (Task 8), chat integration (Task 9), mobile registration lifecycle (Tasks 10, 12, 14, 15), tap-through (Tasks 13–14), preferences (Tasks 3, 15), rollout flag (Task 4), prerequisites (Task 0).

**Deviation from the spec worth flagging:** the spec's mobile section described suppressing the OS banner client-side when the user is foregrounded on the relevant chat screen. Task 9's backend room-presence check (`isUserInRoom`) makes this unnecessary — if the recipient is actively viewing that conversation (mobile already joins the `conversation:`/`building:` room on screen focus via `useChat.ts`/`useBuilding.ts`), no push is sent at all, so there's nothing for the client to suppress. This is simpler than the originally-described approach and produces the same user-facing behavior, so Task 12's notification handler is a plain always-show handler rather than the type-aware suppression logic sketched during brainstorming.

**Type consistency:** `getNotificationRoute(type, data, isTenant)` signature and the `NotificationRoute` shape are identical between Task 13 (definition) and Task 14 (consumer). `NotificationService.registerDeviceToken(userId, token, platform)` / `unregisterDeviceToken(userId, token)` signatures match between Task 6's service and controller. `PushNotificationService.sendToUsers(userIds, payload)` and `checkReceiptsAndPrune()` match between Task 5's definition and Tasks 7/8's callers.
