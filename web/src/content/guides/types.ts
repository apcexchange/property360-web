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
  /** Rough read time in minutes, shown on the page */
  readingMinutes: number;
  /** Short category label, e.g. "Leases", "Payments" */
  category: string;
};

export type Guide = {
  meta: GuideMeta;
  Body: ComponentType;
};
