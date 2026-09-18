"use client";

import axios from "axios";
import { API_BASE_URL } from "./api";

// Separate axios instance on purpose: the shared `api` client redirects to
// /login on 401 and attaches auth headers; the public sales endpoints must
// never trigger any of that.
const salesClient = axios.create({ baseURL: API_BASE_URL, timeout: 60_000 });

export interface SalesAction {
  key: string;
  label: string;
  web: string;
}

export interface SalesTurn {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface SalesSendResult {
  reply: string;
  actions: SalesAction[];
  leadCaptured: boolean;
}

export interface SalesHistory {
  enabled: boolean;
  leadCaptured: boolean;
  messages: SalesTurn[];
}

const SESSION_KEY = "p360.salesbot.session";

/** Anonymous per-browser session id; opaque to the server. */
export function getSalesSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

async function send(text: string, page: string): Promise<SalesSendResult> {
  const res = await salesClient.post("/sales/messages", {
    sessionId: getSalesSessionId(),
    text,
    page,
  });
  const d = res.data?.data ?? {};
  return {
    reply: d.reply ?? "",
    actions: Array.isArray(d.actions) ? d.actions : [],
    leadCaptured: Boolean(d.leadCaptured),
  };
}

async function getHistory(): Promise<SalesHistory> {
  const res = await salesClient.get("/sales/messages", {
    params: { sessionId: getSalesSessionId() },
  });
  const d = res.data?.data ?? {};
  return {
    enabled: d.enabled !== false,
    leadCaptured: Boolean(d.leadCaptured),
    messages: Array.isArray(d.messages) ? d.messages : [],
  };
}

async function captureLead(input: {
  name: string;
  phone?: string;
  email?: string;
  // Ad attribution from the /chat landing URL. Sent as flat fields; the
  // backend persists them onto the lead and older builds ignore them.
  attribution?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
    landingPath?: string;
    referrer?: string;
  };
}): Promise<void> {
  const { attribution, ...contact } = input;
  await salesClient.post("/sales/leads", {
    sessionId: getSalesSessionId(),
    ...contact,
    ...(attribution ?? {}),
  });
}

export const salesApi = { send, getHistory, captureLead };
