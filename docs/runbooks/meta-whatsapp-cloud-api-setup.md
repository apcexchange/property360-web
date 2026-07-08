# Meta WhatsApp Cloud API Setup Runbook

**Date:** 2026-07-07
**Purpose:** Stand up a first-party Meta WhatsApp Cloud API integration. This is the prerequisite for (1) the WhatsApp AI assistant channel (spec `docs/superpowers/specs/2026-07-06-whatsapp-assistant-channel-design.md`) and (2) the v2 Meta-direct WhatsApp OTP delivery (recorded in the OTP spec's "Future direction" section).

**Who does what:** Steps marked [OPS] happen in Meta dashboards and need the Business Manager admin (Peter). Steps marked [CODE] are backend work that lands with the assistant implementation plan.

## What Property360 already has (head start)

- A **Meta Business Portfolio** (Business Manager): you already run Meta ads with Pixel `1750700762596595` + CAPI, so the portfolio exists. Everything below hangs off it.
- A public HTTPS API at `https://api.property360.africa` (Render) for the webhook callback.
- Backend code that already speaks the Cloud API for template sends (`MetaProvider` in `WhatsAppService.ts`) with env plumbing: `WHATSAPP_PROVIDER=meta`, `META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_API_VERSION`, `META_WHATSAPP_LANGUAGE_CODE`, `META_WHATSAPP_TEMPLATE_*`.

## The one hard rule

A phone number lives on EITHER the WhatsApp Business app (human-answered chats) OR the Cloud API, never both. The Founding 50 click-to-WhatsApp sales number stays on the Business app. The assistant/OTP needs a **dedicated number**.

## Phase 1 [OPS]: Business verification (start first, it has the longest lead time)

1. Go to business.facebook.com, select the Property360 portfolio, then **Settings > Security Centre > Business verification**.
2. If status is already "Verified" (possible given the ads history), skip to Phase 2.
3. Otherwise submit: legal business name (CAC registration), address, business phone/email on the business domain (hello@property360.africa), and a supporting document (CAC certificate or utility bill matching the legal name).
4. Approval typically takes 1 to 14 days. Nothing else blocks on it immediately (you can build against Meta's free test number meanwhile), but the real number's display name approval and higher messaging tiers require it.

Why it matters: unverified portfolios are capped at 250 business-initiated conversations per 24h (limits are per portfolio since October 2025, with tier upgrades re-evaluated every 6 hours). Assistant replies inside the 24h service window are user-initiated and do NOT count against this cap; OTP authentication templates DO, so verification matters for OTP-at-scale (v2), not for assistant v1.

## Phase 2 [OPS]: Create the Meta app and attach WhatsApp

1. developers.facebook.com > My Apps > **Create App** > use case "Other" > type **Business** > select the Property360 business portfolio.
2. In the new app's dashboard, **Add product > WhatsApp > Set up**. This creates or connects a **WhatsApp Business Account (WABA)** under the portfolio.
3. The API Setup page gives you a **free Meta test number** and a temporary token immediately. Development and webhook testing can start against this test number today, before Phases 3 and 4 finish.
4. Record from the app dashboard: **App ID** and **App Secret** (Settings > Basic). The app secret becomes `WHATSAPP_APP_SECRET` for webhook signature verification.

## Phase 3 [OPS]: The dedicated number

1. Acquire a fresh Nigerian number (a cheap SIM works; it must be able to receive one SMS or voice call for verification). Do NOT install the WhatsApp/WhatsApp Business app with it.
2. WhatsApp Manager (business.facebook.com/wa/manage) > Phone numbers > **Add phone number**: enter the number, choose SMS or voice verification, enter the code.
3. Submit the **display name** ("Property360"). Approval is quick when business verification is done; it is what users see in the chat header.
4. **Register the number on the Cloud API.** Registration is API-only (not in the dashboards): pick a 6-digit two-step PIN and call

```
curl -X POST "https://graph.facebook.com/<API_VERSION>/<PHONE_NUMBER_ID>/register" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","pin":"<6_DIGIT_PIN>"}'
```

5. Record the **Phone number ID** (WhatsApp Manager or the app's API Setup page; it is an ID, not the phone number itself). This becomes `META_WHATSAPP_PHONE_NUMBER_ID`. Store the PIN in the password manager (needed if the number ever re-registers).

## Phase 4 [OPS]: Permanent access token (system user)

The API Setup page's token expires in about 24 hours. Production needs a system-user token:

1. business.facebook.com > Settings > **Users > System users** > Add. Name it (for example `property360-backend`), role **Admin** (or Employee with the asset grants below).
2. Select the system user > **Assign assets**: the app (Manage app, full control) AND the WhatsApp account/WABA (Manage WhatsApp Business account, full control).
3. **Generate token**: select the app; token expiration "Never"; scopes `whatsapp_business_messaging` and `whatsapp_business_management`.
4. Copy once, store in the password manager. This becomes `META_WHATSAPP_ACCESS_TOKEN` (Render dashboard for prod, `.env.dev` for local). Rotate only if compromised.

## Phase 5 [OPS after assistant code ships] : Webhook

The callback endpoint (`POST /api/v1/webhooks/whatsapp`) is built in the assistant implementation, so this phase runs after that code deploys. For test-number development it can point at a dev tunnel first.

1. Choose a random string as `WHATSAPP_VERIFY_TOKEN` (password manager + Render env).
2. App dashboard > WhatsApp > **Configuration** > Webhook: callback URL `https://api.property360.africa/api/v1/webhooks/whatsapp`, verify token from step 1. Meta immediately fires the GET handshake; the endpoint must echo `hub.challenge`.
3. Under Webhook fields, **subscribe to `messages`** (only).
4. **Subscribe the app to the WABA** (the step everyone misses; without it Meta silently delivers nothing, even though the dashboard shows the callback URL saved):

```
curl -X POST "https://graph.facebook.com/<API_VERSION>/<WABA_ID>/subscribed_apps" \
  -H "Authorization: Bearer <TOKEN>"
```

Verify with a GET on the same URL: `data` must list the app. An empty `data: []` means inbound webhooks are OFF for that WABA. (Bit us on 2026-07-08: URL configured, `messages` toggled on, yet zero deliveries until this call.)

## Phase 6 [OPS]: Sanity test

With the test number (immediately) and again with the real number (after Phase 3/4):

```
curl -X POST "https://graph.facebook.com/<API_VERSION>/<PHONE_NUMBER_ID>/messages" \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"messaging_product":"whatsapp","to":"234XXXXXXXXXX","type":"template","template":{"name":"hello_world","language":{"code":"en_US"}}}'
```

Expected: message arrives on the target WhatsApp; response contains a message id. Note: with the test number, recipients must first be added to the allowed list on the API Setup page.

## Phase 7 [OPS, only for OTP v2]: Authentication template

For Meta-direct OTP delivery later: WhatsApp Manager > Message templates > Create > category **Authentication**, with the copy-code button. Meta fixes the body copy for auth templates; you only choose options like code expiry text. Approval is usually fast. Record the template name for `META_WHATSAPP_TEMPLATE_*`-style config when the v2 OTP work lands.

## Env summary

| Env var | Source | Exists today? |
| --- | --- | --- |
| `META_WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Manager / API Setup page | var exists, value pending |
| `META_WHATSAPP_ACCESS_TOKEN` | System-user token (Phase 4) | var exists, value pending |
| `META_WHATSAPP_API_VERSION` | current Graph version (default in code is v21.0; bump when configuring) | exists |
| `WHATSAPP_APP_SECRET` | App dashboard > Settings > Basic | new (assistant spec) |
| `WHATSAPP_VERIFY_TOKEN` | self-chosen (Phase 5) | new (assistant spec) |
| `WHATSAPP_ASSISTANT_ENABLED` | feature flag, default false | new (assistant spec) |

## Order of operations and lead times

1. Phase 1 (verification) today: longest external wait (1 to 14 days), everything quality-of-life depends on it.
2. Phases 2 + 6-with-test-number today: 30 minutes, unblocks all backend development.
3. Phase 3 (number) + Phase 4 (token): about an hour once the SIM is in hand.
4. Phase 5 (webhook) after the assistant implementation deploys.
5. Phase 7 whenever OTP v2 is scheduled.
