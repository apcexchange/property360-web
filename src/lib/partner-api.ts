"use client";

import { api, unwrap } from "./api";

export interface PartnerEarnings {
  isPartner: boolean;
  codes: Array<{ code: string; commissionRate: number; status: string }>;
  shareUrls: string[];
  signups: number;
  paidConversions: number;
  totalEarned: number;
}

export const partnerApi = {
  async getMyPartner(): Promise<PartnerEarnings> {
    return unwrap((await api.get("/partner/me")).data) as PartnerEarnings;
  },
};
export default partnerApi;
