"use client";

import { api, unwrap } from "./api";

export interface AssistantAction {
  key: string;
  label: string;
  web: string;
  mobileScreen: string;
}

export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  actions?: AssistantAction[];
}

async function getHistory(): Promise<AssistantTurn[]> {
  const res = await api.get("/assistant/messages");
  const d = unwrap(res.data);
  return Array.isArray(d) ? (d as AssistantTurn[]) : [];
}

export interface AssistantSendResult {
  reply: string;
  actions: AssistantAction[];
}

async function send(text: string): Promise<AssistantSendResult> {
  const res = await api.post(
    "/assistant/messages",
    { text },
    { timeout: 60_000 }
  );
  const d = unwrap(res.data) as { reply: string; actions?: AssistantAction[] };
  return { reply: d.reply, actions: d.actions ?? [] };
}

export const assistantApi = { getHistory, send };
