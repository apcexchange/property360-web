# Newsletter / Prospect-Nurture List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single prospect-nurture email list captured from the marketing site, backed by a Mongo `Subscriber` collection and mirrored to a Resend Audience, with demo-request and founding-waitlist emails funneled into the same list.

**Architecture:** Mongo `Subscriber` is the system of record (owns `source`, status, timestamps). A new `NewsletterService` wraps the Resend Contacts API and sends a welcome email; its `addToAudience` helper is reused by `DemoRequestService` and `FoundingService` for consolidation. Public `/newsletter/*` routes + an admin list route on the backend; a reusable `NewsletterForm` placed in the footer, end-of-landing, and guides pages on the web.

**Tech Stack:** Node/Express 5 + TypeScript + Mongoose (backend), Resend SDK, Next.js 16 + Tailwind 4 (web, `web/src/` layout on `feat/founding-50`).

**Note on testing:** This repo has no test runner (`npm test` exits 1; CLAUDE.md mandates manual verification). Each task uses manual verification (curl / running the flow) in place of automated tests. Run the backend with `cd backend && npm run dev` (port 5001, base `/api/v1`).

---

## File Structure

**Backend (create):**
- `backend/src/models/Subscriber.ts` — subscriber schema (system of record)
- `backend/src/services/NewsletterService.ts` — subscribe / addToAudience / unsubscribe / welcome email
- `backend/src/controllers/NewsletterController.ts` — public subscribe/unsubscribe + admin list handlers

**Backend (modify):**
- `backend/src/models/index.ts` — export `Subscriber`
- `backend/src/config/index.ts` — add `resend.audienceId`
- `backend/src/routes/index.ts` — mount public `/newsletter/*` routes
- `backend/src/routes/admin.ts` — mount `GET /admin/subscribers`
- `backend/src/services/DemoRequestService.ts` — call `addToAudience` after create
- `backend/src/services/FoundingService.ts` — call `addToAudience` after waitlist upsert
- `backend/.env.example` + `backend/.env.prod.example` — document `RESEND_AUDIENCE_ID`

**Web (create):**
- `web/src/lib/newsletter-api.ts` — public subscribe/unsubscribe fetch client
- `web/src/components/marketing/NewsletterForm.tsx` — reusable capture form
- `web/src/components/marketing/NewsletterBlock.tsx` — section wrapper (block variant)
- `web/src/app/unsubscribe/page.tsx` — unsubscribe confirmation page

**Web (modify):**
- `web/src/components/landing/Footer.tsx` — footer capture variant
- `web/src/app/page.tsx` — newsletter block before `<FinalCta />`
- `web/src/app/guides/page.tsx` — newsletter block at end

---

## Task 1: Subscriber model

**Files:**
- Create: `backend/src/models/Subscriber.ts`
- Modify: `backend/src/models/index.ts`

- [ ] **Step 1: Create the model**

```ts
// backend/src/models/Subscriber.ts
import mongoose, { Schema, Document } from 'mongoose';

export type SubscriberSource =
  | 'newsletter-footer'
  | 'newsletter-landing'
  | 'newsletter-guides'
  | 'demo-request'
  | 'founding-sold-out';

export type SubscriberStatus = 'subscribed' | 'unsubscribed';

/**
 * Prospect-nurture mailing list. System of record for the nurture audience —
 * the Resend Audience is only the send target. Deduplicated by lowercase email.
 */
export interface ISubscriber extends Document {
  email: string;
  name?: string | null;
  source: SubscriberSource;
  status: SubscriberStatus;
  resendContactId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const subscriberSchema = new Schema<ISubscriber>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true, default: null },
    source: {
      type: String,
      enum: [
        'newsletter-footer',
        'newsletter-landing',
        'newsletter-guides',
        'demo-request',
        'founding-sold-out',
      ],
      default: 'newsletter-footer',
    },
    status: { type: String, enum: ['subscribed', 'unsubscribed'], default: 'subscribed' },
    resendContactId: { type: String, default: null },
  },
  { timestamps: true }
);

subscriberSchema.index({ status: 1, createdAt: -1 });

export const Subscriber = mongoose.model<ISubscriber>('Subscriber', subscriberSchema);
```

- [ ] **Step 2: Export from the model barrel**

Add after the `FoundingWaitlist` export in `backend/src/models/index.ts:32`:

```ts
export { Subscriber } from './Subscriber';
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no new errors referencing `Subscriber`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/models/Subscriber.ts backend/src/models/index.ts
git commit -m "feat(backend): add Subscriber model for nurture list"
```

---

## Task 2: Resend audienceId config + env docs

**Files:**
- Modify: `backend/src/config/index.ts:165-171`
- Modify: `backend/.env.example`, `backend/.env.prod.example`

- [ ] **Step 1: Add audienceId to the resend config block**

Replace the `resend` block at `backend/src/config/index.ts:165-171` with:

```ts
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    // Empty when unset — services must fail loud rather than silently fall
    // back to onboarding@resend.dev, which is Resend's shared sandbox and
    // can only deliver to the workspace owner's verified email.
    fromEmail: process.env.RESEND_FROM_EMAIL || '',
    // Resend Audience id for the prospect-nurture list. When empty, audience
    // mirroring is skipped (Mongo capture still works).
    audienceId: process.env.RESEND_AUDIENCE_ID || '',
  },
```

- [ ] **Step 2: Document the env var**

Add to both `backend/.env.example` and `backend/.env.prod.example`, near the existing `RESEND_FROM_EMAIL` line:

```
# Resend Audience id for the newsletter / prospect-nurture list (Audiences tab).
RESEND_AUDIENCE_ID=
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/config/index.ts backend/.env.example backend/.env.prod.example
git commit -m "feat(backend): add RESEND_AUDIENCE_ID config for nurture audience"
```

---

## Task 3: NewsletterService

**Files:**
- Create: `backend/src/services/NewsletterService.ts`

- [ ] **Step 1: Create the service**

```ts
// backend/src/services/NewsletterService.ts
import { Resend } from 'resend';
import { Subscriber } from '../models';
import { ISubscriber, SubscriberSource } from '../models/Subscriber';
import { AppError } from '../middleware';
import config from '../config';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ResendCfg {
  apiKey?: string;
  fromEmail?: string;
  audienceId?: string;
}

class NewsletterService {
  private resend: Resend | null;
  private fromAddress: string;
  private audienceId: string;

  constructor() {
    const cfg = (config as { resend?: ResendCfg }).resend ?? {};
    this.resend = cfg.apiKey ? new Resend(cfg.apiKey) : null;
    this.fromAddress = cfg.fromEmail || '';
    this.audienceId = cfg.audienceId || '';
  }

  /** PUBLIC — subscribe an email to the nurture list. Welcomes once. */
  async subscribe(emailRaw: string, name?: string, source?: SubscriberSource) {
    const email = emailRaw?.toLowerCase().trim();
    if (!email || !EMAIL_RE.test(email)) {
      throw new AppError('A valid email address is required', 400);
    }

    const existing = await Subscriber.findOne({ email });
    const isNew = !existing;

    // Upsert: a returning email is re-activated but never re-welcomed.
    await Subscriber.updateOne(
      { email },
      {
        $set: { status: 'subscribed' },
        $setOnInsert: { email, name: name?.trim() || null, source: source ?? 'newsletter-footer' },
      },
      { upsert: true }
    );

    await this.mirrorToAudience(email, name).catch((err) =>
      console.error('[Newsletter] audience mirror failed:', err)
    );

    if (isNew) {
      await this.sendWelcome(email, name).catch((err) =>
        console.error('[Newsletter] welcome email failed:', err)
      );
    }

    return { status: 'subscribed' as const };
  }

  /**
   * Add an email captured elsewhere (demo request, founding waitlist) to the
   * nurture audience. No welcome email — those flows send their own. Best
   * effort: never throws into the caller.
   */
  async addToAudience(emailRaw: string, name?: string, source?: SubscriberSource): Promise<void> {
    const email = emailRaw?.toLowerCase().trim();
    if (!email || !EMAIL_RE.test(email)) return;
    try {
      await Subscriber.updateOne(
        { email },
        { $setOnInsert: { email, name: name?.trim() || null, source: source ?? 'newsletter-footer', status: 'subscribed' } },
        { upsert: true }
      );
      await this.mirrorToAudience(email, name);
    } catch (err) {
      console.error('[Newsletter] addToAudience failed:', err);
    }
  }

  /** PUBLIC — unsubscribe an email. Idempotent. */
  async unsubscribe(emailRaw: string) {
    const email = emailRaw?.toLowerCase().trim();
    if (!email || !EMAIL_RE.test(email)) {
      throw new AppError('A valid email address is required', 400);
    }
    const sub = await Subscriber.findOneAndUpdate(
      { email },
      { $set: { status: 'unsubscribed' } },
      { new: true }
    );
    if (sub?.resendContactId && this.resend && this.audienceId) {
      await this.resend.contacts
        .update({ audienceId: this.audienceId, id: sub.resendContactId, unsubscribed: true })
        .catch((err) => console.error('[Newsletter] resend unsubscribe failed:', err));
    }
    return { status: 'unsubscribed' as const };
  }

  /** ADMIN — list subscribers, newest first. */
  async list(filters: { source?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 25));
    const query: Record<string, unknown> = {};
    if (filters.status && filters.status !== 'all') query.status = filters.status;
    if (filters.source && filters.source !== 'all') query.source = filters.source;

    const [items, total] = await Promise.all([
      Subscriber.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Subscriber.countDocuments(query),
    ]);
    return { items, total, page, limit };
  }

  // ─── helpers ──────────────────────────────────────────────────────────

  private async mirrorToAudience(email: string, name?: string): Promise<void> {
    if (!this.resend || !this.audienceId) return;
    const firstName = name?.trim().split(' ')[0];
    const { data } = await this.resend.contacts.create({
      audienceId: this.audienceId,
      email,
      firstName,
      unsubscribed: false,
    });
    if (data?.id) {
      await Subscriber.updateOne({ email }, { $set: { resendContactId: data.id } });
    }
  }

  private async sendWelcome(email: string, name?: string): Promise<void> {
    if (!this.resend || !this.fromAddress) return;
    const first = name?.trim().split(' ')[0] || 'there';
    const unsubUrl = `https://property360.africa/unsubscribe?email=${encodeURIComponent(email)}`;
    await this.resend.emails.send({
      from: this.fromAddress,
      to: email,
      subject: 'Welcome to Property360',
      html: `
        <p>Hi ${first},</p>
        <p>Thanks for subscribing. You'll get occasional tips for Nigerian
        landlords, tenants, and agents — plus the odd product update from
        Property360. No spam.</p>
        <p>Ready to get started? <a href="https://property360.africa/onboarding">Create a free account</a>
        or <a href="https://property360.africa/listings">browse listings</a>.</p>
        <p>— The Property360 team</p>
        <p style="font-size:12px;color:#888">Not interested? <a href="${unsubUrl}">Unsubscribe</a>.</p>
      `,
      text:
        `Hi ${first},\n\n` +
        `Thanks for subscribing. You'll get occasional tips for Nigerian landlords, ` +
        `tenants, and agents — plus the odd product update from Property360. No spam.\n\n` +
        `Get started: https://property360.africa/onboarding\n\n` +
        `— The Property360 team\n\n` +
        `Unsubscribe: ${unsubUrl}`,
      headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
    });
  }
}

export default new NewsletterService();
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors. (If the installed `resend` SDK types differ on `contacts.create`/`update`, check `node_modules/resend` and adjust the call shape; the `emails.send` shape matches existing `DemoRequestService`.)

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/NewsletterService.ts
git commit -m "feat(backend): add NewsletterService (subscribe, audience mirror, welcome)"
```

---

## Task 4: NewsletterController + public routes

**Files:**
- Create: `backend/src/controllers/NewsletterController.ts`
- Modify: `backend/src/routes/index.ts` (near line 91, the demo-requests route)

- [ ] **Step 1: Create the controller**

```ts
// backend/src/controllers/NewsletterController.ts
import { Request, Response, NextFunction } from 'express';
import NewsletterService from '../services/NewsletterService';
import { SubscriberSource } from '../models/Subscriber';
import { AuthRequest, ApiResponse } from '../types';

const parseString = (raw: unknown): string | undefined =>
  typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : undefined;

const VALID_SOURCES: SubscriberSource[] = [
  'newsletter-footer',
  'newsletter-landing',
  'newsletter-guides',
];

class NewsletterController {
  /** PUBLIC — POST /newsletter/subscribe (no auth) */
  async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawSource = parseString(req.body?.source);
      const source = VALID_SOURCES.includes(rawSource as SubscriberSource)
        ? (rawSource as SubscriberSource)
        : 'newsletter-footer';
      const result = await NewsletterService.subscribe(
        parseString(req.body?.email) ?? '',
        parseString(req.body?.name),
        source
      );
      const response: ApiResponse = {
        success: true,
        message: "You're subscribed. Check your inbox for a hello from us.",
        data: result,
      };
      res.status(201).json(response);
    } catch (e) {
      next(e);
    }
  }

  /** PUBLIC — POST /newsletter/unsubscribe (no auth) */
  async unsubscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await NewsletterService.unsubscribe(parseString(req.body?.email) ?? '');
      res.status(200).json({ success: true, message: "You've been unsubscribed.", data: result });
    } catch (e) {
      next(e);
    }
  }

  /** ADMIN — GET /admin/subscribers */
  async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await NewsletterService.list({
        source: typeof req.query.source === 'string' ? req.query.source : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        page: Number(req.query.page) || undefined,
        limit: Number(req.query.limit) || undefined,
      });
      res.status(200).json({ success: true, message: 'Subscribers', data });
    } catch (e) {
      next(e);
    }
  }
}

export default new NewsletterController();
```

- [ ] **Step 2: Mount the public routes**

In `backend/src/routes/index.ts`, add an import near the other controller imports, then add the routes immediately after the `POST /demo-requests` line (line 91):

```ts
// import (top of file with other controllers)
import NewsletterController from '../controllers/NewsletterController';

// routes (after router.post('/demo-requests', ...))
// Public newsletter capture — property360.africa marketing forms post here.
router.post('/newsletter/subscribe', NewsletterController.subscribe);
router.post('/newsletter/unsubscribe', NewsletterController.unsubscribe);
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification — subscribe**

Start the server (`cd backend && npm run dev`), then:

```bash
curl -s -X POST http://localhost:5001/api/v1/newsletter/subscribe \
  -H 'Content-Type: application/json' \
  -d '{"email":"test1@example.com","name":"Test One","source":"newsletter-footer"}'
```
Expected: `{"success":true,"message":"You're subscribed...","data":{"status":"subscribed"}}` (201). Confirm a `subscribers` doc exists in Mongo. Re-run the same curl — still 201, but no duplicate doc and no second welcome (check server logs / Resend).

Invalid email check:

```bash
curl -s -X POST http://localhost:5001/api/v1/newsletter/subscribe \
  -H 'Content-Type: application/json' -d '{"email":"nope"}'
```
Expected: 400 with "A valid email address is required".

- [ ] **Step 5: Manual verification — unsubscribe**

```bash
curl -s -X POST http://localhost:5001/api/v1/newsletter/unsubscribe \
  -H 'Content-Type: application/json' -d '{"email":"test1@example.com"}'
```
Expected: 200; the Mongo doc's `status` is now `unsubscribed`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/NewsletterController.ts backend/src/routes/index.ts
git commit -m "feat(backend): public newsletter subscribe/unsubscribe routes"
```

---

## Task 5: Admin subscribers list route

**Files:**
- Modify: `backend/src/routes/admin.ts`

- [ ] **Step 1: Mount the admin list route**

In `backend/src/routes/admin.ts`, add the import near the top and a route in the list section (the whole router is already gated by `protect, authorize(UserRole.ADMIN)`):

```ts
import NewsletterController from '../controllers/NewsletterController';

// ... with the other GET list routes:
router.get('/subscribers', NewsletterController.list);
```

- [ ] **Step 2: Verify it compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

With an admin JWT in `$ADMIN_TOKEN`:

```bash
curl -s http://localhost:5001/api/v1/admin/subscribers \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```
Expected: 200 with `data.items` listing the subscriber(s) created in Task 4, newest first. Without the header → 401.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/admin.ts
git commit -m "feat(backend): admin subscribers list route"
```

---

## Task 6: Consolidate demo-request + founding-waitlist into the audience

**Files:**
- Modify: `backend/src/services/DemoRequestService.ts`
- Modify: `backend/src/services/FoundingService.ts`

- [ ] **Step 1: Wire DemoRequestService**

In `backend/src/services/DemoRequestService.ts`, add the import at the top:

```ts
import NewsletterService from './NewsletterService';
```

In `submit(...)`, immediately after `const request = await DemoRequest.create({ ... });` and before the `notifySales` call, add:

```ts
    // Funnel the lead into the nurture audience (best-effort, no welcome).
    await NewsletterService.addToAudience(request.email, request.fullName, 'demo-request');
```

- [ ] **Step 2: Wire FoundingService**

In `backend/src/services/FoundingService.ts`, add the import at the top:

```ts
import NewsletterService from './NewsletterService';
```

In `joinWaitlist(...)`, after the `FoundingWaitlist.updateOne(...)` upsert, add:

```ts
    await NewsletterService.addToAudience(clean, name, 'founding-sold-out');
```

- [ ] **Step 3: Verify no import cycle and it compiles**

`NewsletterService` imports only `Subscriber` + config, so `DemoRequestService`/`FoundingService` → `NewsletterService` is one-directional.

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Restart `npm run dev`, then submit a demo request:

```bash
curl -s -X POST http://localhost:5001/api/v1/demo-requests \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Lead Two","email":"lead2@example.com","phone":"+2348000000000","role":"landlord"}'
```
Expected: 201, and a `subscribers` doc for `lead2@example.com` with `source: "demo-request"`.

Then the founding waitlist:

```bash
curl -s -X POST http://localhost:5001/api/v1/founding/waitlist \
  -H 'Content-Type: application/json' \
  -d '{"email":"lead3@example.com","name":"Lead Three"}'
```
Expected: a `subscribers` doc for `lead3@example.com` with `source: "founding-sold-out"`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/DemoRequestService.ts backend/src/services/FoundingService.ts
git commit -m "feat(backend): funnel demo + founding leads into nurture audience"
```

---

## Task 7: Web newsletter API client

**Files:**
- Create: `web/src/lib/newsletter-api.ts`

- [ ] **Step 1: Create the client**

```ts
// web/src/lib/newsletter-api.ts
"use client";

import { API_BASE_URL } from "./api";

export type NewsletterSource =
  | "newsletter-footer"
  | "newsletter-landing"
  | "newsletter-guides";

/**
 * Subscribe an email to the nurture list. Public endpoint (no auth), so a
 * plain fetch keeps it independent of the axios/session stack — same pattern
 * as the demo-request and founding waitlist clients. Never throws.
 */
export async function subscribeNewsletter(payload: {
  email: string;
  name?: string;
  source: NewsletterSource;
}): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: res.ok, message: body.message };
  } catch {
    return { ok: false, message: "Network error — please try again." };
  }
}

/** Unsubscribe an email. Never throws. */
export async function unsubscribeNewsletter(
  email: string
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/newsletter/unsubscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: res.ok, message: body.message };
  } catch {
    return { ok: false, message: "Network error — please try again." };
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/newsletter-api.ts
git commit -m "feat(web): newsletter api client"
```

---

## Task 8: NewsletterForm component

**Files:**
- Create: `web/src/components/marketing/NewsletterForm.tsx`

- [ ] **Step 1: Create the component**

```tsx
// web/src/components/marketing/NewsletterForm.tsx
"use client";

import { useState } from "react";
import { subscribeNewsletter, type NewsletterSource } from "@/lib/newsletter-api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterForm({
  source,
  variant = "block",
}: {
  source: NewsletterSource;
  variant?: "footer" | "block";
}) {
  const [email, setEmail] = useState("");
  // Honeypot — bots fill hidden fields; humans never see it.
  const [company, setCompany] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (company) return; // honeypot tripped — silently drop
    if (!EMAIL_RE.test(email.trim())) {
      setState("error");
      setMessage("Enter a valid email address.");
      return;
    }
    setState("loading");
    const res = await subscribeNewsletter({ email: email.trim(), source });
    if (res.ok) {
      setState("ok");
      setMessage("You're in. Check your inbox.");
      setEmail("");
    } else {
      setState("error");
      setMessage(res.message ?? "Something went wrong. Try again.");
    }
  }

  const isFooter = variant === "footer";

  return (
    <form onSubmit={onSubmit} className={isFooter ? "mt-4" : "mt-6 max-w-md"}>
      <div className={isFooter ? "flex gap-2" : "flex flex-col gap-3 sm:flex-row"}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email address"
          disabled={state === "loading" || state === "ok"}
          className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 outline-none placeholder:text-ink-muted focus:border-cryola-500"
        />
        {/* honeypot */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="hidden"
          aria-hidden="true"
        />
        <button
          type="submit"
          disabled={state === "loading" || state === "ok"}
          className="shrink-0 rounded-lg bg-cryola-500 px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-cryola-600 disabled:opacity-60"
        >
          {state === "loading" ? "…" : state === "ok" ? "Subscribed" : "Subscribe"}
        </button>
      </div>
      {message ? (
        <p
          className={`mt-2 text-[12.5px] ${
            state === "error" ? "text-red-600" : "text-ink-muted"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd web && npx tsc --noEmit`
Expected: no errors. (If `cryola-600` is not a defined Tailwind token in this project, use `cryola-500` for both states — check `web/src/app/globals.css` or the Tailwind config for the available `cryola` shades and match an existing button, e.g. in `FinalCta.tsx`.)

- [ ] **Step 3: Commit**

```bash
git add web/src/components/marketing/NewsletterForm.tsx
git commit -m "feat(web): reusable NewsletterForm component"
```

---

## Task 9: Footer placement

**Files:**
- Modify: `web/src/components/landing/Footer.tsx`

- [ ] **Step 1: Add a newsletter column to the footer**

Import at the top of `web/src/components/landing/Footer.tsx`:

```tsx
import { NewsletterForm } from "@/components/marketing/NewsletterForm";
```

Replace the brand column block (`web/src/components/landing/Footer.tsx:8-20`) so the brand column also carries the capture form. Replace:

```tsx
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-foundation-700 text-cryola-300">
                <span className="text-[13px] font-bold leading-none">P</span>
              </span>
              <span className="text-[15px] text-foundation-700">
                Property<span className="text-cryola-500">360</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-[13.5px] leading-[1.6] text-ink-muted">
              Property management for the way Nigeria rents — built in Lagos.
            </p>
          </div>
```

with:

```tsx
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-foundation-700 text-cryola-300">
                <span className="text-[13px] font-bold leading-none">P</span>
              </span>
              <span className="text-[15px] text-foundation-700">
                Property<span className="text-cryola-500">360</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-[13.5px] leading-[1.6] text-ink-muted">
              Property management for the way Nigeria rents — built in Lagos.
            </p>
            <p className="mt-6 text-[13px] font-medium text-foundation-700">
              Tips for landlords, tenants &amp; agents — straight to your inbox.
            </p>
            <NewsletterForm source="newsletter-footer" variant="footer" />
          </div>
```

> Note: the grid is `grid-cols-2 md:grid-cols-4`. Widening the brand block to
> `col-span-2` keeps the three link columns (Product/Company/Legal) on the
> remaining tracks. If the layout looks cramped at `md`, bump the grid wrapper
> at `Footer.tsx:7` to `md:grid-cols-5` and keep the link columns single-width.

- [ ] **Step 2: Verify it compiles**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run `cd web && npm run dev`, open `http://localhost:3000`, scroll to the footer. Enter an email and Subscribe → "You're in. Check your inbox." Confirm a `subscribers` doc with `source: "newsletter-footer"` (backend dev server must be running and `NEXT_PUBLIC_API_URL` pointed at it).

- [ ] **Step 4: Commit**

```bash
git add web/src/components/landing/Footer.tsx
git commit -m "feat(web): newsletter capture in footer"
```

---

## Task 10: NewsletterBlock + end-of-landing placement

**Files:**
- Create: `web/src/components/marketing/NewsletterBlock.tsx`
- Modify: `web/src/app/page.tsx`

- [ ] **Step 1: Create the block section**

```tsx
// web/src/components/marketing/NewsletterBlock.tsx
import { NewsletterForm } from "./NewsletterForm";
import type { NewsletterSource } from "@/lib/newsletter-api";

export function NewsletterBlock({
  source,
  heading = "Stay in the loop",
  sub = "Occasional tips for Nigerian landlords, tenants, and agents — plus product updates. No spam.",
}: {
  source: NewsletterSource;
  heading?: string;
  sub?: string;
}) {
  return (
    <section className="bg-paper py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="rounded-2xl border border-foundation-700/10 bg-white p-8 md:p-10">
          <h2 className="text-[22px] font-semibold tracking-tight text-foundation-700 md:text-[26px]">
            {heading}
          </h2>
          <p className="mt-2 max-w-xl text-[14.5px] leading-[1.6] text-ink-muted">{sub}</p>
          <NewsletterForm source={source} variant="block" />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Place it on the landing page**

In `web/src/app/page.tsx`, add the import with the other component imports:

```tsx
import { NewsletterBlock } from "@/components/marketing/NewsletterBlock";
```

Insert it between `<Faq />` and `<FinalCta />`:

```tsx
      <Faq />
      <NewsletterBlock source="newsletter-landing" />
      <FinalCta />
```

- [ ] **Step 3: Verify it compiles**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

`cd web && npm run dev`, open `http://localhost:3000`, scroll to just above the final CTA → the block renders. Subscribe with a fresh email → success; confirm a `subscribers` doc with `source: "newsletter-landing"`.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/marketing/NewsletterBlock.tsx web/src/app/page.tsx
git commit -m "feat(web): newsletter block on landing page"
```

---

## Task 11: Guides placement

**Files:**
- Modify: `web/src/app/guides/page.tsx`

- [ ] **Step 1: Add the block at the end of the guides index**

Add the import at the top of `web/src/app/guides/page.tsx`:

```tsx
import { NewsletterBlock } from "@/components/marketing/NewsletterBlock";
```

Render `<NewsletterBlock source="newsletter-guides" heading="Get the next guide by email" />`
as the last element before the page's closing wrapper/`<Footer />` (place it after the
guides list content). Match the existing JSX structure of the file — insert the
block inside the same top-level fragment/`<div>` that wraps the page content.

- [ ] **Step 2: Verify it compiles**

Run: `cd web && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

`cd web && npm run dev`, open `http://localhost:3000/guides`, scroll to the end → block renders. Subscribe with a fresh email → success; confirm `source: "newsletter-guides"`.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/guides/page.tsx
git commit -m "feat(web): newsletter block on guides page"
```

---

## Task 12: Unsubscribe page

**Files:**
- Create: `web/src/app/unsubscribe/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// web/src/app/unsubscribe/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { unsubscribeNewsletter } from "@/lib/newsletter-api";

function UnsubscribeInner() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const [state, setState] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    if (!email) {
      setState("error");
      return;
    }
    unsubscribeNewsletter(email).then((res) => setState(res.ok ? "done" : "error"));
  }, [email]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-[24px] font-semibold tracking-tight text-foundation-700">
        {state === "loading" ? "Unsubscribing…" : state === "done" ? "You're unsubscribed" : "Something went wrong"}
      </h1>
      <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-muted">
        {state === "done"
          ? `${email} won't receive any more newsletter emails. Changed your mind? You can resubscribe from any form on our site.`
          : state === "error"
          ? "We couldn't process that unsubscribe link. Email hello@property360.africa and we'll sort it out."
          : "One moment."}
      </p>
      <a href="/" className="mt-6 text-[14px] font-semibold text-cryola-500 hover:underline">
        Back to property360.africa
      </a>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubscribeInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd web && npx tsc --noEmit`
Expected: no errors. (`useSearchParams` requires the `Suspense` wrapper for the Next.js build — it's included above.)

- [ ] **Step 3: Manual verification**

`cd web && npm run dev`, open `http://localhost:3000/unsubscribe?email=test1@example.com` →
shows "You're unsubscribed"; confirm the `subscribers` doc for that email now has
`status: "unsubscribed"`. Open `/unsubscribe` with no `email` param → "Something went wrong".

- [ ] **Step 4: Commit**

```bash
git add web/src/app/unsubscribe/page.tsx
git commit -m "feat(web): unsubscribe page"
```

---

## Task 13: Final verification pass

- [ ] **Step 1: Full backend typecheck + lint**

Run: `cd backend && npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 2: Full web typecheck + build**

Run: `cd web && npx tsc --noEmit && npm run lint && npm run build`
Expected: build succeeds (the `/unsubscribe` page builds with its Suspense boundary; all new components compile).

- [ ] **Step 3: End-to-end smoke (servers running)**

With backend (`npm run dev`, port 5001) and web (`npm run dev`, port 3000) both up and `NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1`:
- Footer form → `source: newsletter-footer`
- Landing block → `source: newsletter-landing`
- Guides block → `source: newsletter-guides`
- Demo request → `source: demo-request`
- Founding waitlist → `source: founding-sold-out`
- Unsubscribe page flips status.

Confirm all five sources appear in `GET /admin/subscribers` and no duplicate rows on re-submit.

- [ ] **Step 4: (If RESEND_AUDIENCE_ID is set) verify Resend mirror**

Set `RESEND_AUDIENCE_ID` to a real audience, restart backend, subscribe a fresh email, and confirm the contact appears in the Resend dashboard Audiences tab and the `subscribers` doc has a non-null `resendContactId`. With the var unset, confirm subscribe still succeeds (Mongo-only) and logs no fatal error.

---

## Self-Review Notes

- **Spec coverage:** Subscriber model (T1), config/env (T2), NewsletterService incl. welcome (T3), public routes (T4), admin list (T5), consolidation (T6), web client (T7), form (T8), footer/landing/guides placements (T9–T11), unsubscribe page (T12). Exit-intent is explicitly Phase 2 in the spec — not in this plan.
- **Type consistency:** `addToAudience(email, name?, source?)`, `subscribe(email, name?, source?)`, `SubscriberSource` union, and `resendContactId` are used identically across backend tasks; `NewsletterSource` (web, the three public sources only) is used identically across web tasks.
- **Open implementation detail to confirm during T3/T8:** the exact `resend` SDK return shape for `contacts.create` (`{ data: { id } }`) and the available `cryola` Tailwind shades — both flagged inline with fallbacks.
