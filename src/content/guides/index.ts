import type { Guide } from "./types";
import {
  meta as tenancyMeta,
  Body as TenancyBody,
} from "./how-to-write-tenancy-agreement-nigeria";
import {
  meta as cautionMeta,
  Body as CautionBody,
} from "./caution-fee-vs-security-deposit-nigeria";
import {
  meta as collectRentMeta,
  Body as CollectRentBody,
} from "./how-to-collect-rent-online-nigeria";
import {
  meta as evictMeta,
  Body as EvictBody,
} from "./how-to-evict-a-tenant-legally-nigeria";
import {
  meta as rentIncreaseMeta,
  Body as RentIncreaseBody,
} from "./rent-increase-rules-nigeria";
import {
  meta as scamsMeta,
  Body as ScamsBody,
} from "./how-to-avoid-rental-scams-nigeria";
import {
  meta as lagosCostMeta,
  Body as LagosCostBody,
} from "./cost-of-renting-in-lagos";
import {
  meta as agentFeesMeta,
  Body as AgentFeesBody,
} from "./agent-fees-in-nigeria-explained";
import {
  meta as docsMeta,
  Body as DocsBody,
} from "./documents-to-rent-an-apartment-nigeria";

// Newest first. Order here is the order shown on /guides.
export const guides: Guide[] = [
  { meta: scamsMeta, Body: ScamsBody },
  { meta: lagosCostMeta, Body: LagosCostBody },
  { meta: agentFeesMeta, Body: AgentFeesBody },
  { meta: docsMeta, Body: DocsBody },
  { meta: tenancyMeta, Body: TenancyBody },
  { meta: collectRentMeta, Body: CollectRentBody },
  { meta: evictMeta, Body: EvictBody },
  { meta: cautionMeta, Body: CautionBody },
  { meta: rentIncreaseMeta, Body: RentIncreaseBody },
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.meta.slug === slug);
}

export function getRelatedGuides(slug: string, limit = 2): Guide[] {
  return guides.filter((g) => g.meta.slug !== slug).slice(0, limit);
}

export type { Guide, GuideMeta } from "./types";
