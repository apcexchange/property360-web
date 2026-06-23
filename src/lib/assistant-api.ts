"use client";

import { api, unwrap } from "./api";

export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

async function getHistory(): Promise<AssistantTurn[]> {
  const res = await api.get("/assistant/messages");
  const d = unwrap(res.data);
  return Array.isArray(d) ? (d as AssistantTurn[]) : [];
}

async function send(text: string): Promise<string> {
  const res = await api.post(
    "/assistant/messages",
    { text },
    { timeout: 60_000 }
  );
  return (unwrap(res.data) as { reply: string }).reply;
}

export const assistantApi = { getHistory, send };
