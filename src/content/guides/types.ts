import type { ComponentType } from "react";

export type GuideMeta = {
  /** URL slug under /guides/<slug> */
  slug: string;
  /** SEO <title> (brand suffix is appended by the title template) */
  title: string;
  /** On-page H1 */
  heading: string;
  /** Meta description + card summary */
  description: string;
  /** Target search keywords for this article */
  keywords: string[];
  /** ISO date (YYYY-MM-DD) */
  datePublished: string;
  /** ISO date (YYYY-MM-DD); defaults to datePublished when omitted */
  dateModified?: string;
  /** Specialist reviewer, shown only when a named review has actually happened. */
  reviewedBy?: string;
  /** Rough read time in minutes, shown on the page */
  readingMinutes: number;
  /** Short category label, e.g. "Leases", "Payments" */
  category: string;
  /** Organization or person accountable for the article's editorial content. */
  author: string;
  /** Concise promise shown directly below the article headline. */
  standfirst?: string;
  /** Optional labels used for related-content discovery and topical archives. */
  tags?: string[];
  /** Article-specific guidance that translates the explainer into decisions. */
  takeaways?: { title: string; body: string }[];
  /** Reader questions answered without relying on unverified claims. */
  faqs?: { question: string; answer: string }[];
  /** Article-specific action list shown in the print-friendly reader worksheet. */
  checklist: string[];
  /** Sources that directly support claims in the article. */
  sources?: { label: string; url: string; publisher?: string }[];
};

export type Guide = {
  meta: GuideMeta;
  Body: ComponentType;
};
