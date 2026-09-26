# Batch 5 scripts: coming soon (WhatsApp)

Continues [Batch 4](./2026-08-03-batch-4-edge-scripts.md). These three features
are fully built and committed in the backend but **not live in production** —
`WHATSAPP_ASSISTANT_ENABLED`, `WHATSAPP_ONBOARDING_ENABLED`, and
`WHATSAPP_WRITE_ACTIONS_ENABLED` all default to `false` and none appear in
`render.yaml` yet. See the "Blocker to resolve separately" section of
[the video series plan](../../.claude/plans/what-if-we-require-smooth-lovelace.md)
for what's needed to actually ship it (real Meta Cloud API credentials, webhook
registration, flags flipped in Render, end-to-end test with a real
conversation).

> **Do not film or publish any of these three until that separate readiness
> work is done and confirmed live.** Scripts are written now so they're ready
> to shoot the moment the feature ships, not as a promise of a launch date.

Visual format differs from earlier batches: instead of screen-recording the
Property360 app, record the WhatsApp conversation itself (phone screen record
of the WhatsApp thread), since the whole feature happens inside WhatsApp.
Same voiceover-over-footage approach, same length target (25 to 40s), same
plain-English, no-hype tone. Message content below is grounded in the actual
conversational flow implemented in the backend (`WhatsAppAssistantService.ts`,
`WhatsAppOnboardingService.ts`, `WhatsAppWriteFlowService.ts`), not invented.

---

## 35. Ask the WhatsApp assistant anything, right from a chat

**Role:** Landlord/agent/tenant · **Length:** ~30s

**Hook:** "You don't even need to open the app to check your rent. Just text
it."

**Beats:**
1. Screen: WhatsApp thread with Property360's number, user sends "who are my
   landlords" (agent) or "show payments." VO: "Message the Property360
   WhatsApp number, in plain language." Caption: "Just ask, in plain
   language"
2. Screen: bot reply with the real answer (landlords/properties/permissions,
   or a list of recent payments). VO: "It answers with your real data, the
   same assistant that's in the app." Caption: "Real answers, from your
   account"
3. Screen: user asks "where do I add a tenant," bot replies with a direct
   link. VO: "Ask how to do something, and it sends you straight to the right
   page." Caption: "Get a direct link, not just an answer"

**End card:** "Not registered yet? WhatsApp can set you up too." (leads into
video 36)

**Note:** if the sender's WhatsApp number isn't linked to a verified account,
the bot replies telling them to sign up or verify WhatsApp in the app first,
it doesn't just answer blind. Don't script around that edge case, but the
demo account used for filming needs WhatsApp already verified.

---

## 36. Create your account without leaving WhatsApp

**Role:** New user (no account yet) · **Length:** ~40s

**Hook:** "No app download, no form. Just start typing."

**Beats:**
1. Screen: new WhatsApp chat, user texts "hi." Bot replies explaining
   Property360 and adds: "You're not registered yet. Reply REGISTER to create
   your account right here." VO: "Message the number, and if you're new,
   it'll offer to sign you up right there." Caption: "Text REGISTER to start"
2. Screen: bot asks landlord/tenant/property manager, user answers. VO: "Tell
   it your role." Caption: "Step 1: your role"
3. Screen: bot asks name, then email, user answers both. VO: "Give your name
   and email." Caption: "Step 2: name and email"
4. Screen: bot sends a 6-digit code, user types it back. VO: "Enter the code
   it sends to your email." Caption: "Step 3: confirm the code"
5. Screen: bot confirms account created, sends a welcome message and a link
   to set a password. VO: "That's it. Your account exists, verified by phone,
   WhatsApp, and email, all at once." Caption: "Account created"

**End card:** "Once you're set up, you can even add a tenant right from
WhatsApp. Here's how." (leads into video 37)

---

## 37. Add a tenant or a property, without opening the app

**Role:** Landlord/agent (with permission) · **Length:** ~40s

**Hook:** "Add a whole property, or onboard a tenant, in a WhatsApp
conversation. No app required."

**Beats:**
1. Screen: user texts "I want to add a tenant." Bot asks which property (as a
   numbered list). VO: "Tell it what you want to do, and it walks you through
   it, one question at a time." Caption: "Just say what you want to do"
2. Screen: bot asks unit, name, email, phone, rent, frequency, lease dates,
   one-time fees, in sequence (sped up in editing). VO: "It asks for exactly
   what it needs, in order, nothing more." Caption: "One question at a time"
3. Screen: bot shows a full summary, asks "Reply YES to create, or CANCEL to
   stop." VO: "Before anything's created, it shows you a full summary to
   confirm." Caption: "Confirm before anything's created"
4. Screen: user replies "YES," bot replies "Done" with a link to manage it in
   the app. VO: "Confirm, and it's live, same as if you'd done it in the app."
   Caption: "Done, right from the chat"

**End card:** "That's every feature, live and coming soon. More as we ship
them." (closes the full series)

**Note:** only two write actions exist today, adding a property and
adding/assigning a tenant (agents need the matching permission for the
tenant one). There's no standalone "record a payment via WhatsApp" yet, an
upfront payment can only be logged as part of adding a tenant. Don't imply
broader write capability than that in the script or captions.
