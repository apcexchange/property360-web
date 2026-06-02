# Portfolio Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a single-page, airy-white, product-led portfolio site for Akam Peter Chinedu to land a senior remote React Native role.

**Architecture:** Next.js 16 (App Router) + Tailwind 4 + TypeScript static site. Content (apps, experience, skills, profile) lives in typed data files under `src/lib/`; presentational components under `src/components/` render from those arrays; `src/app/page.tsx` composes the sections. No backend — contact via `mailto:` + social links. Deployed to Vercel.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript, Vitest (data-layer test only), Vercel.

**Testing note:** This is a presentational static site. TDD is applied to the data layer (the single piece with real logic/invariants). Presentational components are verified per-task with `npx tsc --noEmit` + `npm run build` + a browser check at `http://localhost:3000`. Commit after every task.

**Project location:** New standalone repo at `/Users/peter/Desktop/project/dev/peter-portfolio` (sibling of `property360`, NOT inside it).

---

## File Structure

```
peter-portfolio/
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── vitest.config.ts
├── .gitignore
├── public/
│   ├── headshot.jpg          # user supplies (see Task 8)
│   └── resume.pdf            # placeholder until user supplies
└── src/
    ├── app/
    │   ├── layout.tsx        # root layout, fonts, metadata/SEO
    │   ├── page.tsx          # composes all sections
    │   └── globals.css       # Tailwind import + design tokens
    ├── lib/
    │   ├── types.ts          # shared TS types
    │   ├── profile.ts        # name, headline, email, socials, resume path
    │   ├── apps.ts           # featured apps array
    │   ├── apps.test.ts      # data-integrity test (TDD)
    │   ├── experience.ts     # roles, education, certifications
    │   └── skills.ts         # grouped skill clusters
    └── components/
        ├── ui/
        │   ├── SectionHeading.tsx
        │   └── Tag.tsx
        ├── StoreBadge.tsx
        ├── Nav.tsx
        ├── Hero.tsx
        ├── StatsStrip.tsx
        ├── AppCard.tsx
        ├── FeaturedWork.tsx
        ├── About.tsx
        ├── Skills.tsx
        ├── Experience.tsx
        ├── Contact.tsx
        └── Reveal.tsx        # scroll-in animation wrapper
```

Design tokens (colors `#0a6e4f`, `#1dd88f`, `#0a1f17`; spacing; radius) are defined once in `globals.css` via Tailwind 4 `@theme` and reused everywhere.

---

## Task 1: Scaffold the Next.js project

**Files:**
- Create: entire `peter-portfolio/` skeleton via `create-next-app`

- [ ] **Step 1: Scaffold with create-next-app**

Run:
```bash
cd /Users/peter/Desktop/project/dev
npx create-next-app@latest peter-portfolio \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --no-turbopack --use-npm
```
Expected: project created at `/Users/peter/Desktop/project/dev/peter-portfolio`, dependencies installed.

- [ ] **Step 2: Start the dev server and verify it renders**

Run:
```bash
cd /Users/peter/Desktop/project/dev/peter-portfolio
npm run dev
```
Open `http://localhost:3000`. Expected: default Next.js starter page renders. Stop the server (Ctrl-C) once confirmed.

- [ ] **Step 3: Verify type-check and build pass on the clean scaffold**

Run:
```bash
npx tsc --noEmit && npm run build
```
Expected: both succeed with no errors.

- [ ] **Step 4: Initialize git and commit the scaffold**

Run:
```bash
git init -b main
git add -A
git commit -m "chore: scaffold Next.js + Tailwind portfolio"
```

---

## Task 2: Design tokens & global styles

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace globals.css with the design-token theme**

Replace the entire contents of `src/app/globals.css` with:
```css
@import "tailwindcss";

@theme {
  --color-brand: #0a6e4f;
  --color-brand-bright: #1dd88f;
  --color-brand-tint: #e7f7ef;
  --color-ink: #0a1f17;
  --color-ink-soft: #33433c;
  --color-muted: #5b6b63;
  --color-line: #eef3f1;
  --color-surface: #f7faf9;

  --radius-card: 0.75rem;
  --shadow-soft: 0 8px 24px rgba(10, 110, 79, 0.12);
}

html {
  scroll-behavior: smooth;
}

body {
  background: #ffffff;
  color: var(--color-ink);
  -webkit-font-smoothing: antialiased;
}

/* Reveal-on-scroll base state */
.reveal {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.reveal.is-visible {
  opacity: 1;
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
  html { scroll-behavior: auto; }
}
```

- [ ] **Step 2: Verify build still passes**

Run:
```bash
npx tsc --noEmit && npm run build
```
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add design tokens and global styles"
```

---

## Task 3: Shared types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Create the types file**

Create `src/lib/types.ts`:
```ts
export interface AppItem {
  name: string;
  description: string;
  tags: string[];
  /** Tailwind-friendly hex used for the app's icon swatch */
  color: string;
  appStoreUrl?: string;
  playStoreUrl?: string;
  comingSoon?: boolean;
}

export interface Role {
  company: string;
  title: string;
  location: string;
  period: string;
  bullets: string[];
}

export interface SkillGroup {
  label: string;
  skills: string[];
}

export interface Stat {
  value: string;
  label: string;
}

export interface SocialLink {
  label: string;
  href: string;
}

export interface Profile {
  name: string;
  role: string;
  headlineLead: string;
  headlineAccent: string;
  subline: string;
  availability: string;
  email: string;
  resumePath: string;
  headshotPath: string;
  socials: SocialLink[];
  stats: Stat[];
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add shared content types"
```

---

## Task 4: Apps data + data-integrity test (TDD)

**Files:**
- Create: `src/lib/apps.ts`
- Create: `src/lib/apps.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add test script + devDeps)

- [ ] **Step 1: Install Vitest**

Run:
```bash
npm install -D vitest
```

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Add the test script to package.json**

In `package.json`, add to the `"scripts"` object:
```json
"test": "vitest run"
```

- [ ] **Step 4: Write the failing data-integrity test**

Create `src/lib/apps.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { apps } from "./apps";

describe("apps data", () => {
  it("has at least 5 featured apps", () => {
    expect(apps.length).toBeGreaterThanOrEqual(5);
  });

  it("every app has a name, description, color, and tags", () => {
    for (const app of apps) {
      expect(app.name.trim()).not.toBe("");
      expect(app.description.trim()).not.toBe("");
      expect(app.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(app.tags.length).toBeGreaterThan(0);
    }
  });

  it("every non-coming-soon app links to at least one live store", () => {
    for (const app of apps) {
      if (app.comingSoon) continue;
      const hasStore = Boolean(app.appStoreUrl || app.playStoreUrl);
      expect(hasStore, `${app.name} must have a store link`).toBe(true);
    }
  });

  it("all store URLs are valid https URLs", () => {
    for (const app of apps) {
      for (const url of [app.appStoreUrl, app.playStoreUrl]) {
        if (!url) continue;
        expect(() => new URL(url)).not.toThrow();
        expect(url.startsWith("https://")).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './apps'` (apps.ts not created yet).

- [ ] **Step 6: Create the apps data file**

Create `src/lib/apps.ts`:
```ts
import type { AppItem } from "./types";

export const apps: AppItem[] = [
  {
    name: "V by VFD",
    description: "Digital bank — secure transfers, OTP, and account onboarding.",
    tags: ["React Native", "Payments", "Auth"],
    color: "#0a6e4f",
    appStoreUrl: "https://apps.apple.com/ng/app/v-by-vfd/id1462870303",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.vfd.app",
  },
  {
    name: "Switch by Sterling",
    description: "Mobile banking — payments, transfers, and transaction flows.",
    tags: ["React Native", "Banking", "Security"],
    color: "#c0392b",
    appStoreUrl: "https://apps.apple.com/ng/app/switch-by-sterling/id1494153941",
    playStoreUrl:
      "https://play.google.com/store/apps/details?id=ng.sterling.sterlingswitch",
  },
  {
    name: "Finna Wallet",
    description: "Stablecoin wallet — crypto on/off ramp and secure storage.",
    tags: ["React Native", "Crypto", "Wallet"],
    color: "#1dd88f",
    appStoreUrl:
      "https://apps.apple.com/ng/app/finna-stablecoin-wallet/id6483920894",
    playStoreUrl:
      "https://play.google.com/store/apps/details?id=com.finna.protocol",
  },
  {
    name: "Wowzi for Creators",
    description: "Creator marketplace — wallet, payouts, and identity verification.",
    tags: ["React Native", "Marketplace", "Payouts"],
    color: "#7c5cff",
    appStoreUrl:
      "https://apps.apple.com/ng/app/wowzi-for-creators/id1635743764",
    playStoreUrl:
      "https://play.google.com/store/apps/details?id=co.threewin.wowzi.app",
  },
  {
    name: "AbbeyMobile",
    description: "Mobile banking app for everyday financial transactions.",
    tags: ["React Native", "Banking", "Mobile"],
    color: "#2c3e87",
    appStoreUrl: "https://apps.apple.com/ng/app/abbeymobile/id1604213434",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.abbey.app",
  },
  {
    name: "Property360",
    description: "Property management platform for landlords, tenants, and agents.",
    tags: ["React Native", "Expo", "Fintech"],
    color: "#0a6e4f",
    comingSoon: true,
  },
];
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test`
Expected: PASS — all assertions green.

- [ ] **Step 8: Commit**

```bash
git add src/lib/apps.ts src/lib/apps.test.ts vitest.config.ts package.json package-lock.json
git commit -m "feat: add apps data with integrity test"
```

---

## Task 5: Profile, experience, and skills data

**Files:**
- Create: `src/lib/profile.ts`
- Create: `src/lib/experience.ts`
- Create: `src/lib/skills.ts`

- [ ] **Step 1: Create the profile data**

Create `src/lib/profile.ts`:
```ts
import type { Profile } from "./types";

export const profile: Profile = {
  name: "Akam Peter Chinedu",
  role: "Senior React Native Engineer",
  headlineLead: "Shipped 15+ apps to",
  headlineAccent: "App Store & Google Play.",
  subline:
    "Senior React Native Engineer · fintech & payments · 7+ yrs · iOS & Android",
  availability: "Available for remote roles",
  email: "peterchinedupeter@gmail.com",
  resumePath: "/resume.pdf",
  headshotPath: "/headshot.jpg",
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/akam-peter/" },
    { label: "GitHub", href: "https://github.com/apcexchange" },
  ],
  stats: [
    { value: "7+", label: "Years" },
    { value: "15+", label: "Shipped apps" },
    { value: "iOS + Android", label: "Both stores" },
    { value: "Fintech", label: "Domain" },
  ],
};
```

- [ ] **Step 2: Create the experience data**

Create `src/lib/experience.ts`:
```ts
import type { Role } from "./types";

export const roles: Role[] = [
  {
    company: "Wowzi",
    title: "Senior Mobile Engineer",
    location: "Nairobi, Kenya (Remote)",
    period: "Dec 2023 – Present",
    bullets: [
      "Architected and built features for a multi-market influencer marketplace connecting creators and brands across Africa.",
      "Built wallet and payout features: bank transfers, mobile money, OTP, and identity verification.",
      "Improved performance and crash-free sessions via caching, offline-first improvements, and Android stability fixes.",
    ],
  },
  {
    company: "Sterling Bank / Uridium Technologies",
    title: "Senior Software Engineer",
    location: "Lagos, Nigeria",
    period: "Feb 2021 – Nov 2023",
    bullets: [
      "Built and maintained mobile banking features for a digital banking platform serving a large customer base.",
      "Implemented secure authentication and transaction flows: OTP, session management, and payment processing.",
      "Scaled core modules with Redux / Redux-Saga and improved delivery via CI/CD automation.",
    ],
  },
  {
    company: "Rocket Global",
    title: "Mobile Engineer (React Native)",
    location: "Lagos, Nigeria",
    period: "Feb 2019 – Oct 2021",
    bullets: [
      "Built React Native features for a cryptocurrency trading application.",
      "Implemented real-time market updates via WebSocket integrations.",
      "Optimized responsiveness and usability across low-end Android devices.",
    ],
  },
];

export const education = {
  degree: "BSc Mathematics and Computer Science",
  school: "Ebonyi State University, Nigeria",
};

export const certifications: string[] = [
  "Scrum Fundamentals Certification — 2021",
  "Google Africa Developer Scholarship — 2021",
];
```

- [ ] **Step 3: Create the skills data**

Create `src/lib/skills.ts`:
```ts
import type { SkillGroup } from "./types";

export const skillGroups: SkillGroup[] = [
  { label: "Languages", skills: ["React Native", "TypeScript", "JavaScript"] },
  {
    label: "State & Data",
    skills: ["Redux Toolkit", "Redux-Saga", "React Query"],
  },
  {
    label: "Mobile & Architecture",
    skills: [
      "Offline-first",
      "Performance optimization",
      "Secure storage",
      "Biometric login",
      "WebSocket",
    ],
  },
  {
    label: "Payments & Fintech",
    skills: ["Paystack", "Flutterwave", "Mobile money", "KYC / identity", "OTP", "JWT"],
  },
  {
    label: "Delivery",
    skills: ["Fastlane", "CI/CD", "Firebase", "Crashlytics"],
  },
];
```

- [ ] **Step 4: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile.ts src/lib/experience.ts src/lib/skills.ts
git commit -m "feat: add profile, experience, and skills data"
```

---

## Task 6: UI primitives (SectionHeading, Tag, StoreBadge, Reveal)

**Files:**
- Create: `src/components/ui/SectionHeading.tsx`
- Create: `src/components/ui/Tag.tsx`
- Create: `src/components/StoreBadge.tsx`
- Create: `src/components/Reveal.tsx`

- [ ] **Step 1: Create SectionHeading**

Create `src/components/ui/SectionHeading.tsx`:
```tsx
export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-muted">
      {children}
    </p>
  );
}
```

- [ ] **Step 2: Create Tag**

Create `src/components/ui/Tag.tsx`:
```tsx
export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft">
      {children}
    </span>
  );
}
```

- [ ] **Step 3: Create StoreBadge**

Create `src/components/StoreBadge.tsx`:
```tsx
type Store = "apple" | "google";

const LABELS: Record<Store, string> = {
  apple: "App Store",
  google: "Google Play",
};

export function StoreBadge({ store, href }: { store: Store; href: string }) {
  const isApple = store === "apple";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 ${
        isApple ? "bg-ink text-white" : "bg-brand text-white"
      }`}
    >
      <span aria-hidden>{isApple ? "" : "▶"}</span>
      {LABELS[store]}
    </a>
  );
}
```

- [ ] **Step 4: Create the Reveal scroll-in wrapper (client component)**

Create `src/components/Reveal.tsx`:
```tsx
"use client";

import { useEffect, useRef, useState } from "react";

export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${visible ? "is-visible" : ""} ${className}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui src/components/StoreBadge.tsx src/components/Reveal.tsx
git commit -m "feat: add UI primitives and reveal animation"
```

---

## Task 7: Nav

**Files:**
- Create: `src/components/Nav.tsx`

- [ ] **Step 1: Create the Nav component**

Create `src/components/Nav.tsx`:
```tsx
import { profile } from "@/lib/profile";

const LINKS = [
  { label: "Work", href: "#work" },
  { label: "Experience", href: "#experience" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <a href="#top" className="text-base font-extrabold text-ink">
          {profile.name.split(" ").slice(0, 2).join(" ")}
        </a>
        <ul className="hidden gap-6 text-sm text-muted sm:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="transition hover:text-brand">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href={profile.resumePath}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 sm:hidden"
        >
          Résumé
        </a>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/Nav.tsx
git commit -m "feat: add sticky nav"
```

---

## Task 8: Hero

**Files:**
- Create: `src/components/Hero.tsx`
- Create: `public/resume.pdf` (placeholder)

- [ ] **Step 1: Create a placeholder résumé so the link resolves**

Run:
```bash
cd /Users/peter/Desktop/project/dev/peter-portfolio
printf '%%PDF-1.4\n%% placeholder resume — replace with real PDF\n' > public/resume.pdf
```
(User replaces `public/resume.pdf` with the real CV later.)

- [ ] **Step 2: Create the Hero component**

Create `src/components/Hero.tsx`:
```tsx
import { profile } from "@/lib/profile";

export function Hero() {
  return (
    <section id="top" className="mx-auto max-w-5xl px-6 pb-12 pt-16 sm:pt-24">
      <div className="flex flex-col items-center gap-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <span className="inline-block rounded-full bg-brand-tint px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand">
            {profile.availability}
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
            {profile.headlineLead}
            <br />
            <span className="text-brand">{profile.headlineAccent}</span>
          </h1>
          <p className="mt-4 text-base text-muted">{profile.subline}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#work"
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
            >
              See the apps
            </a>
            <a
              href={profile.resumePath}
              className="rounded-lg border border-line px-5 py-2.5 text-sm font-bold text-ink transition hover:border-brand hover:text-brand"
            >
              Download résumé
            </a>
          </div>
        </div>

        {/* Phone mockup */}
        <div className="shrink-0">
          <div className="h-[260px] w-[130px] rounded-[1.75rem] border-2 border-line bg-white p-2 shadow-[var(--shadow-soft)]">
            <div className="mb-2 h-14 rounded-xl bg-brand" />
            <div className="mb-1.5 h-2.5 rounded bg-surface" />
            <div className="mb-3 h-2.5 w-3/4 rounded bg-surface" />
            <div className="h-9 rounded-lg bg-brand-bright" />
            <div className="mt-3 h-2.5 rounded bg-surface" />
            <div className="mt-1.5 h-2.5 w-2/3 rounded bg-surface" />
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/components/Hero.tsx public/resume.pdf
git commit -m "feat: add hero section"
```

---

## Task 9: StatsStrip

**Files:**
- Create: `src/components/StatsStrip.tsx`

- [ ] **Step 1: Create the StatsStrip component**

Create `src/components/StatsStrip.tsx`:
```tsx
import { profile } from "@/lib/profile";

export function StatsStrip() {
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap justify-around gap-6 px-6 py-8 text-center">
        {profile.stats.map((stat) => (
          <div key={stat.label}>
            <div className="text-2xl font-extrabold text-brand">{stat.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-muted">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/StatsStrip.tsx
git commit -m "feat: add stats strip"
```

---

## Task 10: AppCard + FeaturedWork

**Files:**
- Create: `src/components/AppCard.tsx`
- Create: `src/components/FeaturedWork.tsx`

- [ ] **Step 1: Create the AppCard component**

Create `src/components/AppCard.tsx`:
```tsx
import type { AppItem } from "@/lib/types";
import { StoreBadge } from "./StoreBadge";

export function AppCard({ app }: { app: AppItem }) {
  return (
    <div className="rounded-card border border-line p-4 transition hover:shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-lg"
          style={{ backgroundColor: app.color }}
          aria-hidden
        />
        <h3 className="text-sm font-bold text-ink">{app.name}</h3>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-muted">
        {app.description}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {app.tags.map((tag) => (
          <span
            key={tag}
            className="rounded bg-surface px-2 py-0.5 text-[11px] font-medium text-ink-soft"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-3.5 flex flex-wrap gap-2">
        {app.comingSoon && (
          <span className="rounded-md bg-brand-tint px-3 py-1.5 text-xs font-semibold text-brand">
            Coming soon
          </span>
        )}
        {app.appStoreUrl && <StoreBadge store="apple" href={app.appStoreUrl} />}
        {app.playStoreUrl && <StoreBadge store="google" href={app.playStoreUrl} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the FeaturedWork section**

Create `src/components/FeaturedWork.tsx`:
```tsx
import { apps } from "@/lib/apps";
import { AppCard } from "./AppCard";
import { SectionHeading } from "./ui/SectionHeading";
import { Reveal } from "./Reveal";

export function FeaturedWork() {
  return (
    <section id="work" className="mx-auto max-w-5xl px-6 py-16">
      <SectionHeading>Featured work</SectionHeading>
      <p className="mt-2 max-w-xl text-muted">
        Production apps I&apos;ve built and shipped — banking, payments, wallets,
        and marketplaces used across Africa.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <Reveal key={app.name}>
            <AppCard app={app} />
          </Reveal>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        + AbbeyMobile, Property360 &amp; more — 15+ apps shipped in total.
      </p>
    </section>
  );
}
```

- [ ] **Step 3: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppCard.tsx src/components/FeaturedWork.tsx
git commit -m "feat: add featured work grid"
```

---

## Task 11: About (with headshot)

**Files:**
- Create: `src/components/About.tsx`
- Add (user action): `public/headshot.jpg`

- [ ] **Step 1: Ensure the headshot exists (user action)**

The user must save their headshot to `public/headshot.jpg`. If it is not yet present, create a temporary neutral placeholder so the build and layout work:
```bash
cd /Users/peter/Desktop/project/dev/peter-portfolio
[ -f public/headshot.jpg ] || curl -sL "https://placehold.co/400x400/0a6e4f/ffffff/jpg?text=Akam+Peter" -o public/headshot.jpg
```
Expected: `public/headshot.jpg` exists.

- [ ] **Step 2: Create the About component**

Create `src/components/About.tsx`:
```tsx
import Image from "next/image";
import { profile } from "@/lib/profile";
import { SectionHeading } from "./ui/SectionHeading";

export function About() {
  return (
    <section id="about" className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 py-16 sm:flex-row">
        <Image
          src={profile.headshotPath}
          alt={profile.name}
          width={160}
          height={160}
          className="h-40 w-40 shrink-0 rounded-2xl object-cover shadow-[var(--shadow-soft)]"
        />
        <div>
          <SectionHeading>About</SectionHeading>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-soft">
            I&apos;m a senior React Native engineer with 7+ years building secure,
            high-performance mobile apps across fintech, banking, and payments.
            I&apos;ve shipped products used by thousands of users across Africa,
            working closely with product, backend, compliance, and design teams to
            deliver reliable iOS and Android releases.
          </p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify type-check and build pass (Next Image needs build)**

Run: `npx tsc --noEmit && npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/components/About.tsx public/headshot.jpg
git commit -m "feat: add about section with headshot"
```

---

## Task 12: Skills

**Files:**
- Create: `src/components/Skills.tsx`

- [ ] **Step 1: Create the Skills component**

Create `src/components/Skills.tsx`:
```tsx
import { skillGroups } from "@/lib/skills";
import { SectionHeading } from "./ui/SectionHeading";
import { Tag } from "./ui/Tag";

export function Skills() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <SectionHeading>Skills</SectionHeading>
      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
        {skillGroups.map((group) => (
          <div key={group.label}>
            <h3 className="text-sm font-bold text-ink">{group.label}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {group.skills.map((skill) => (
                <Tag key={skill}>{skill}</Tag>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/Skills.tsx
git commit -m "feat: add skills section"
```

---

## Task 13: Experience

**Files:**
- Create: `src/components/Experience.tsx`

- [ ] **Step 1: Create the Experience component**

Create `src/components/Experience.tsx`:
```tsx
import { roles, education, certifications } from "@/lib/experience";
import { SectionHeading } from "./ui/SectionHeading";

export function Experience() {
  return (
    <section id="experience" className="border-t border-line bg-surface">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <SectionHeading>Experience</SectionHeading>
        <div className="mt-8 border-l-2 border-line pl-6">
          {roles.map((role) => (
            <div key={role.company} className="relative mb-10 last:mb-0">
              <span className="absolute -left-[1.92rem] top-1.5 h-3 w-3 rounded-full bg-brand" />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-bold text-ink">
                  {role.company} — {role.title}
                </h3>
                <span className="text-sm text-muted">{role.period}</span>
              </div>
              <p className="text-sm text-muted">{role.location}</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
                {role.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold text-ink">Education</h3>
            <p className="mt-2 text-sm text-ink-soft">{education.degree}</p>
            <p className="text-sm text-muted">{education.school}</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Certifications</h3>
            <ul className="mt-2 space-y-1 text-sm text-ink-soft">
              {certifications.map((cert) => (
                <li key={cert}>{cert}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/Experience.tsx
git commit -m "feat: add experience timeline"
```

---

## Task 14: Contact footer

**Files:**
- Create: `src/components/Contact.tsx`

- [ ] **Step 1: Create the Contact component**

Create `src/components/Contact.tsx`:
```tsx
import { profile } from "@/lib/profile";

export function Contact() {
  return (
    <footer id="contact" className="bg-ink text-white">
      <div className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h2 className="text-2xl font-extrabold sm:text-3xl">
          Let&apos;s build something.
        </h2>
        <p className="mt-2 text-brand-bright">
          Open to senior remote mobile roles, worldwide.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href={`mailto:${profile.email}`}
            className="rounded-lg bg-brand-bright px-5 py-2.5 text-sm font-bold text-ink transition hover:opacity-90"
          >
            Email me
          </a>
          {profile.socials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/20 px-5 py-2.5 text-sm font-bold text-white/90 transition hover:border-brand-bright hover:text-brand-bright"
            >
              {social.label}
            </a>
          ))}
        </div>
        <p className="mt-10 text-xs text-white/50">
          © 2026 {profile.name}. Built with Next.js &amp; Tailwind.
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/Contact.tsx
git commit -m "feat: add contact footer"
```

---

## Task 15: Compose page + SEO metadata

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Compose the page**

Replace the entire contents of `src/app/page.tsx` with:
```tsx
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { StatsStrip } from "@/components/StatsStrip";
import { FeaturedWork } from "@/components/FeaturedWork";
import { About } from "@/components/About";
import { Skills } from "@/components/Skills";
import { Experience } from "@/components/Experience";
import { Contact } from "@/components/Contact";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <StatsStrip />
        <FeaturedWork />
        <About />
        <Skills />
        <Experience />
      </main>
      <Contact />
    </>
  );
}
```

- [ ] **Step 2: Set SEO metadata in the layout**

Replace the entire contents of `src/app/layout.tsx` with:
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { profile } from "@/lib/profile";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${profile.name} — ${profile.role}`,
  description:
    "Senior React Native engineer with 7+ years building secure fintech and payments apps for iOS and Android. 15+ apps shipped to the App Store and Google Play.",
  openGraph: {
    title: `${profile.name} — ${profile.role}`,
    description:
      "Senior React Native engineer — 15+ fintech apps shipped to App Store & Google Play.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Run the full page in the browser**

Run: `npm run dev`
Open `http://localhost:3000`. Expected: full portfolio renders top to bottom — Nav, Hero, Stats, Featured Work (6 app cards with store badges), About (headshot), Skills, Experience, Contact footer. Anchor links scroll correctly. Test at mobile width (DevTools responsive mode). Stop the server when done.

- [ ] **Step 4: Verify type-check, tests, and build all pass**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: all succeed.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx
git commit -m "feat: compose portfolio page with SEO metadata"
```

---

## Task 16: Polish pass + responsive verification

**Files:**
- Modify: any component needing adjustment after visual review

- [ ] **Step 1: Visual QA in the browser**

Run: `npm run dev` and open `http://localhost:3000`. Check, at both desktop and 375px mobile widths:
- Hero headline doesn't overflow; phone mockup stacks below text on mobile.
- Stats strip wraps cleanly (4 items → 2×2 on narrow screens).
- App cards are 1 col (mobile) / 2 col (sm) / 3 col (lg).
- About headshot stacks above text on mobile.
- Nav links hidden on mobile, résumé button shown.
- Footer buttons wrap without clipping.

Note any issues; fix them inline in the relevant component using existing Tailwind classes.

- [ ] **Step 2: Re-verify build after any fixes**

Run: `npx tsc --noEmit && npm run build`
Expected: success.

- [ ] **Step 3: Commit (only if changes were made)**

```bash
git add -A
git commit -m "polish: responsive adjustments"
```

---

## Task 17: Deploy to Vercel

**Files:**
- None (deployment only)

- [ ] **Step 1: Push to a new GitHub repo**

Create a new GitHub repo (e.g. `peter-portfolio`) and push:
```bash
cd /Users/peter/Desktop/project/dev/peter-portfolio
gh repo create peter-portfolio --private --source=. --remote=origin --push
```
Expected: repo created and `main` pushed.

- [ ] **Step 2: Deploy with Vercel**

Run:
```bash
npx vercel --prod
```
Follow prompts (link to the repo, accept defaults — Next.js auto-detected). Expected: a live `*.vercel.app` URL is printed.

- [ ] **Step 3: Smoke-test the live site**

Open the printed Vercel URL. Expected: site renders identically to local; store badge links open the correct App Store / Play Store listings; résumé link downloads the PDF.

- [ ] **Step 4: Final commit (any Vercel config)**

```bash
git add -A
git commit -m "chore: vercel deployment config" --allow-empty
git push
```

---

## Post-launch follow-ups (not blocking)

- Replace `public/resume.pdf` with the real CV.
- Replace `public/headshot.jpg` with the real headshot if the placeholder was used.
- Add real Play Store links for any additional apps beyond the 6 featured.
- Wire a custom domain in the Vercel dashboard.
- Optionally add Vercel Analytics (`npm i @vercel/analytics`, one component in layout).
