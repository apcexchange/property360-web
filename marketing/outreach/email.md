# Email — cold outreach

Email engagement is weaker than LinkedIn or WhatsApp for the Nigerian property market — most operators run on WhatsApp and rarely check business email. Still worth doing because:

1. The 10–20% who DO check email are typically agency principals and serious portfolio landlords (high-value).
2. Email gives you a documented audit trail you can re-use in a follow-up over LinkedIn or WhatsApp ("I sent you a note last week…").

## How to find email addresses

- **Real estate directories** — Nigerian Institution of Estate Surveyors and Valuers (NIESV) member list, NigeriaPropertyCentre, PrivateProperty.com.ng "agent" profiles. Most list a public email.
- **Hostel websites** — university hostel pages, private hostel websites often list a `contact@…` or `info@…` address.
- **LinkedIn** — many lead profiles list a business email in the "contact info" section.
- **Hunter.io** (free tier: 25 lookups/month) — feed a company domain, get likely email patterns.

Don't scrape mass lists. Bulk-send violates Nigerian and EU rules (most spam filters block you anyway). Targeted, named, ≤30/day is the right cadence.

## Subject lines (pick one — test, don't reuse)

Subjects that work in this market:

- `Question about how [Agency name] handles rent`
- `Rent collection for [Hostel name] — 2-min idea`
- `One-pager for [Agency name]`
- `Cash flow visibility across all your landlords?`
- `Property360 — for property managers in [city]`

Avoid:

- `URGENT` / `OPPORTUNITY` / `IMPORTANT` — anything in CAPS goes straight to spam.
- `Free` / `$$$` / `Get rich` — flagged.
- Anything too generic ("Hello!", "Quick question").

---

## Body — pick the audience that fits

### To a property management agency

**Subject:** Question about how **[Agency name]** handles rent

> Hi **[Name]**,
>
> I came across **[Agency name]** through **[where you found them — a property listing site, a LinkedIn post, a referral]**, and wanted to send a quick note. I'm building Property360 — a workspace for Nigerian property management agencies. It gives each landlord their own dashboard while letting your team operate on their behalf with per-property permission flags.
>
> I'm trying to understand how mid-sized agencies in **[city]** currently handle rent collection and per-landlord reporting. Would you have 10–15 minutes for a call next week? Even if Property360 isn't a fit, I'd value the conversation.
>
> Here's a one-pager you can forward to the team if useful:
> https://property360.africa/for-agencies
>
> Thanks,
> **[Your name]**
> Founder, Property360
> property360.africa

### To a hostel operator (university hostel, large student accommodation)

**Subject:** Rent collection for **[Hostel name]** — 2-min idea

> Hi **[Name]**,
>
> I'm reaching out because I'm building Property360 — software for Nigerian hostel owners and landlords. Each tenant gets an invoice automatically on the 1st, pays online, and you see who's paid from one dashboard. No more walking floor to floor or chasing on WhatsApp.
>
> It's free for the first 14 days. I'd love your feedback on whether the workflow we've built actually maps to how **[Hostel name]** runs day to day. If you have 10 minutes for a call this week or next, I'd really appreciate it.
>
> https://property360.africa
>
> Thanks,
> **[Your name]**
> Founder, Property360

### To a small portfolio landlord (5–30 units)

**Subject:** Rent collection for your portfolio — 2-min idea

> Hi **[Name]**,
>
> I noticed you own **[number]** units in **[area]**. I'm building Property360 to help Nigerian landlords stop chasing rent over WhatsApp. Tenants pay through the app (Paystack), payments and signed leases live in one place, and a 14-day free trial means you can try it without putting in a card.
>
> If you have 5 minutes, give it a look:
> https://property360.africa
>
> Happy to set up your first property for you over a quick call.
>
> Thanks,
> **[Your name]**
> Founder, Property360

---

## Follow-up #1 (4 days after, if no reply)

Same thread, **reply** to your own email (don't start a new chain — the original sits underneath as context).

> Hi **[Name]**,
>
> Just bumping this in case it got buried. Even a "not interested" is a useful reply — saves us both time. If it's worth a quick chat, here's my calendar: **[Calendly link]**.
>
> Thanks,
> **[Your name]**

## Follow-up #2 (10 days after #1, if no reply)

Final touch. Close the loop politely. Don't follow up beyond this — three emails is the etiquette ceiling for cold outreach to a non-replier.

> Hi **[Name]**,
>
> Closing the loop — I'll stop reaching out for now. If your team's situation changes and rent collection software becomes a priority, my door is open. Best wishes for **[Agency / Hostel name]** in the meantime.
>
> Thanks,
> **[Your name]**

---

## Tracking what worked

Keep a simple spreadsheet:

| Date | Name | Org | City | Subject used | Replied? | Booked call? | Signed up? | Notes |

After 50 sends, look at:

- **Open rate** by subject line (if you use a sender that tracks opens — Resend, MailerSend, Mailchimp all do).
- **Reply rate** by audience type (hostel / agency / portfolio landlord).
- **Conversion to signup**.

Optimise on the strongest variant.

## Anti-spam practices

- **Send from a real address with your real name in the From field.** "Peter <peter@property360.africa>" lands. "no-reply@property360.africa" doesn't.
- **Use a real domain you control.** Sending from a Gmail address signals amateur.
- **Set up SPF + DKIM + DMARC** on the property360.africa domain via your DNS host. Without these, ~30% of cold email goes to spam. Resend has a one-click setup; ask me if you want to do it.
- **Limit volume.** 30 cold emails/day from a new domain is fine. 300 will get you flagged.
- **Don't attach the PDF in the first email.** Link to `/for-agencies` instead; the PDF can come once they reply with interest. Attachments to cold contacts often bounce or trigger spam filters.
