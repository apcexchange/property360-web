# Cold email agent outreach: design

**Date:** 2026-07-06
**Status:** Approved
**Problem:** The Founding 50 campaign has 0 of 50 slots claimed. The site converts nobody because almost nobody visits: this is a traffic problem, not a conversion problem. Cold email is the demand-generation channel this spec designs.

## Decisions made

| Question | Decision |
|---|---|
| Diagnosis | Little to no traffic; demand generation needed |
| Target | Agents first, landlords as an opportunistic secondary lane |
| Scale | Scrappy manual sprint: 150 to 300 hand-picked agents, personalized, no new infrastructure |
| CTA | Ask a low-friction question, move replies to WhatsApp, close there |
| Setup | Founder inbox, fully manual (approach A). No outreach subdomain, no sequencer yet |

## 1. Goal and funnel math

Activate agents as a distribution channel for the Founding 50. Working numbers:

- 300 personalized emails over ~3 weeks
- 5 to 10% reply rate: 15 to 30 replies
- Roughly 8 to 15 WhatsApp conversations
- 3 to 5 agents who actively bring landlords
- Each landlord brought is a Founding 50 candidate; expected 5 to 15 founding landlords from this channel

These are planning numbers, not promises. The checkpoint logic in section 8 is what governs whether the sprint continues.

## 2. Pre-flight (one-time, before the first send)

The domain's email DNS is currently misconfigured for a reply-driven campaign:

- **MX conflict:** `property360.africa` has MX records for both Namecheap PrivateEmail (`mx1/mx2.privateemail.com`) and Zoho (`mx.zoho.com` and friends) at similar priorities. Inbound replies can route to either mailbox. Remove the set for the provider not in use (SPF suggests Zoho is the intended one). Verify with `dig +short MX property360.africa` afterwards.
- **Send only from Zoho.** SPF is `v=spf1 include:zohomail.com ~all`, so a message sent from Gmail with a property360.africa address fails authentication and lands in spam. Use Zoho webmail or the Zoho Mail app as `peter@property360.africa` or `hello@property360.africa`.
- **Enable DKIM** in the Zoho admin console if not already on.
- **Test:** send one email to mail-tester.com and confirm a score of 9+/10 before the first real send.
- **Never use Resend for this campaign.** Resend's terms prohibit unsolicited email; using it risks the account that runs the newsletter and transactional mail. All cold sends happen from the founder inbox.
- DMARC is `p=none`, which is fine for now; no change needed.

## 3. The list (150 to 300 agents)

- **Source by hand from active listings** on PropertyPro, NigeriaPropertyCentre, and Jiji, plus agency websites and Instagram bios. "Currently has live listings" is the qualifier: it proves the agent is active and the address is monitored.
- **Concentrate on 2 or 3 areas** where density is wanted (for example, specific Lagos mainland neighborhoods). Agent referrals and WhatsApp intros compound locally.
- **One Google Sheet** with columns: name, agency, email, phone, area, source listing URL, personalization note (one line), status, touch 1 date, touch 2 date, touch 3 date, replied (y/n), on WhatsApp (y/n), outcome, opted out (y/n).
- No bought lists, no scraping automation. Every row was seen by a human.

## 4. The pitch and sequence

The offer is the existing agent hook from the launch plan: **bring 3 landlords during launch and get the Agency plan free for 6 months.** Numbers and terms must match [web/src/components/marketing/foundingOffer.ts](../../../web/src/components/marketing/foundingOffer.ts) and the brand-and-offer reference in the launch content skill; do not quote prices from memory.

Three touches, all in the same thread. Plain text, no images, at most one link per email.

### Touch 1 (day 0)

Subject: `your listing in [area]` (lowercase, specific)

> Hi [Name],
>
> I came across your [2-bedroom on Bode Thomas] on [PropertyPro]. [One genuine, specific line about the listing.]
>
> I'm Peter, the founder of Property360. It's an app Nigerian agents use to manage the properties they handle for landlords: rent collection, receipts, tenant records, renewals, all in one place, so you look organised to your landlords and never argue about "I have paid."
>
> During our launch, any agent who brings 3 landlords onto the platform gets our Agency plan free for 6 months.
>
> Quick question: after you close a letting, do you also manage the property for the landlord, or hand it back?
>
> Peter
> Founder, Property360
> property360.africa | [phone number]
>
> If you'd rather I didn't email again, just reply "no" and that's the end of it.

### Touch 2 (day 3, same thread)

> Hi [Name], floating this back up in case it got buried. Short version: 6 months of our Agency plan free if you bring 3 landlords during launch. Worth a look?

### Touch 3 (day 7, same thread, final)

The trust angle: landlords hand more properties to agents who look organised, and receipts plus clean records are how an agent looks organised. Mention the 14-day free trial at property360.africa as a no-contact fallback. Close politely; this is the last touch. Example:

> Last one from me, [Name]. One thing agents tell us: landlords give more properties to the agent whose records are clean, where every payment has a receipt. That is exactly what Property360 does for you. If you'd rather just poke around, there's a 14-day free trial at property360.africa. Either way, good luck with the [Bode Thomas] listing.

Personalization rule: the first sentence of touch 1 must reference something real (a specific listing, area, or detail). If there is nothing real to say, the contact is not ready to be emailed.

## 5. Daily operation

- 15 to 25 sends per weekday morning, Nigerian business hours.
- About an hour a day: ~30 minutes building or topping up the list, ~30 minutes sending and logging.
- Sent individually from the inbox. Never BCC, never a visible merge.
- 300 contacts is roughly 3 weeks of sends at this pace.
- Follow-ups (touch 2 and 3) are part of the same daily block; the sheet's date columns drive who is due.

## 6. Reply handling

- Every reply gets a same-day response.
- The move: answer briefly, then "easier to show you on WhatsApp, can I message you there?" and continue in chat.
- In WhatsApp: short demo, then the onboarding link. The done-for-you setup (from the Founding 50 perks) is the closer for their landlords' data entry.
- Interested agents get an invite to the Founding Landlords WhatsApp channel.
- A "no" reply: log opted out in the sheet, never contact again, no reply needed beyond a one-line "understood, all the best."

## 7. Compliance guardrails

- Contacts are business addresses taken from public listings where the agent is soliciting contact.
- Every email identifies the sender fully (name, company, site, phone).
- Every email carries the opt-out line; opt-outs are logged and honored permanently.
- Deletion on request: if anyone asks to be removed from the sheet, delete the row.
- This is a defensible posture under the NDPA for B2B outreach; it depends on the volume staying low and the personalization staying real.

## 8. Measure, kill, or scale

Tracked weekly, from the sheet: sends, replies, reply rate, WhatsApp conversations, agents activated (brought at least 1 landlord), landlords signed, founding slots claimed.

- **Checkpoint at 100 sends:** reply rate under 2% means stop sending and rework the subject line, first line, or targeting before burning the rest of the list.
- **Reply rate over 8%:** the pitch works. Consider light tooling (a mail-merge layer such as GMass on the same inbox) to automate touches 2 and 3, and expand the list.
- **Channel verdict after the full 300:** if the funnel produced fewer than 2 activated agents, the channel is not working in this form; regroup before investing further.

## Secondary lane: direct landlords

Where a landlord email surfaces (personal network, LinkedIn, estate communities), send the Founding 50 pitch directly: Pro at ₦65,000/year locked forever, free done-for-you setup, founder direct line. Opportunistic only; no volume target, no list-building time budgeted.

## Out of scope

- Any automated scraping or bulk enrichment tooling
- Cold WhatsApp outreach to numbers from listings (risks number blocking; WhatsApp is reply-driven only)
- A separate outreach domain or warm-up infrastructure
- Changes to the website, offer terms, or pricing
