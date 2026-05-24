# Marketing kit

Ready-to-send growth assets that live next to the marketing site (`web/src/app/page.tsx`). Source files only — no build output here.

## What's in here today

### `whatsapp/`
The WhatsApp share kit you use to reach out to hostel owners, small landlords, and property managers one-by-one. Mass broadcasts don't work in Nigeria; this is built for personal outreach.

- [`messages.md`](whatsapp/messages.md) — 5 copy-and-paste message templates, one per audience.
- [`screenshots.md`](whatsapp/screenshots.md) — brief for the 6 screenshots you should capture from the live app, with WhatsApp-friendly captions for each.
- [`video-script.md`](whatsapp/video-script.md) — a 60-second screen-recording script you can record on your phone in one take.

## What's NOT in here yet

- One-pager PDF for property management agencies (planned item 4).
- Cold email + LinkedIn outreach scripts (planned item 5).
- Referral mechanic in the app — that's a code change, lives in the product, not here (planned item 6).

Add them as you build them and link from this README.

## A note on the workflow

This folder isn't built or deployed. The Next.js app ignores it. It exists in this repo so:

1. The artifacts stay version-controlled. When you tweak a message that got better results, you commit the change and have history.
2. A future teammate or contractor doing growth picks up the work without you having to forward a Google Doc.
3. The captions and screenshots stay close to the screens they reference — when you redesign the dashboard, the marketing copy that mentions it lives next door, so it's easier to keep in sync.

## How to actually use this on a Monday

1. Open `whatsapp/messages.md`, pick the template that fits your next 10 conversations.
2. Personalise the bracketed bits (`[Name]`, `[Agency name]`).
3. Send 10 messages. Track replies in a spreadsheet — name, segment, did they sign up, did they add a property.
4. Once a week, look at which template converted best and double-down. Discard the weakest.

That cadence — 10 messages a day, 50 a week — gets you to the "10–20 active landlords on the platform" threshold most accelerators (Antler, YC, REACH) want to see in 4–6 weeks.
