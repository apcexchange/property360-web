# Screenshot kit — what to capture + how to use

Take these 6 screenshots from your live, signed-in app and keep them in `web/marketing/whatsapp/img/` (create the folder when you have them). Each one is captioned for direct paste-and-send on WhatsApp.

## Why screenshots beat words

A WhatsApp link preview shows one image. Once they tap the link, they're 50% gone. A few well-chosen screenshots sent *before* the link convert better than the link alone — the recipient already knows what they'd see if they clicked.

---

## The six to capture

### 1. Dashboard hero (the "control room")
**Capture:** `/app/dashboard` while signed in as a landlord with at least 2 properties and a few months of data.
**Caption:**
> This is what your dashboard looks like — every property, every tenant, every payment, in one screen.

### 2. Mobile signup → add property (the "5 minutes" promise)
**Capture:** A 2-up: side-by-side phone screenshots — left is the signup screen, right is the "add property" form pre-filled. Same phone, light mode.
**Caption:**
> From signup to first property is under 5 minutes on your phone. Free for the first 14 days.

### 3. Tenancy agreement (signed copy with both signatures)
**Capture:** Open a signed PDF in `/me/agreement` (or the `/app/leases/[id]/agreements` page on landlord side) and screenshot the page showing both tenant + landlord signatures on the final page.
**Caption:**
> Every lease is signed in-app and stored against the tenant. No more digging through email or your old phone.

### 4. Rent payment record (one tenant, multiple payments)
**Capture:** `/app/transactions` filtered to one tenant, showing 3+ payments over time, statuses, amounts.
**Caption:**
> When tenants pay, it shows up here instantly — and they get a receipt automatically. No paper, no excuses about "I sent it."

### 5. Property + tenants list (the "scale" view, for agency/hostel pitches)
**Capture:** A property detail page where the building has 10+ units, showing the occupancy mix.
**Caption:**
> One hostel, every room, every tenant — managed from one place. Up to 2 buildings free on the Solo plan, up to 30 on Pro.

### 6. The pricing page (closes the loop after they ask "how much")
**Capture:** `/pricing` with the **Annual** toggle selected (so the ₦/month-equivalent shows).
**Caption:**
> Pricing. Starts at ₦2,250/month — less than a tank of fuel. First 14 days are free with no card.

---

## How to send them

**Sequence for a cold WhatsApp:**
1. The intro message (from `messages.md`).
2. *One* screenshot — pick the one that matches the audience:
   - Hostel owner → #5 (the property + tenants view)
   - Small landlord → #1 (dashboard) or #3 (signed agreement)
   - Agency → #1 (dashboard) and #5 (scale view), in that order
   - Re-engagement → #2 (5-minute signup)
   - Referral target → #1 (dashboard, no caption)
3. Wait for a reply or 24h before sending more.

**Don't dump six images at once.** That feels like a sales blast and gets muted. One image, one message.

---

## Capture tips

- Phone screenshots: **portrait, status bar showing full battery + Nigerian carrier**. Looks more "real" than a perfectly cropped marketing shot.
- Desktop screenshots: **crop tight** to the relevant card, not the whole browser window. Less to read.
- **Blur sensitive data** (tenant phone numbers, real ID numbers, exact rent amounts on living leases) using the iOS markup tool or Pixelmator on Mac. A blurred-out value is more credible than placeholder text.
- Don't use Lorem Ipsum or fake-looking names. If your real data is too sensitive, create one "demo" landlord account and seed it with realistic-looking but invented tenants ("Ada Okonkwo", "Babatunde Adeyemi", "Chinedu Okafor"). Reuse this account for all marketing screenshots.

---

## Folder layout once you have them

```
web/marketing/whatsapp/
  messages.md
  screenshots.md
  video-script.md
  img/
    01-dashboard.png
    02-mobile-signup.png
    03-signed-agreement.png
    04-transactions.png
    05-property-units.png
    06-pricing.png
```

Numbering matches the captions above so you can find the right one fast when sending.
