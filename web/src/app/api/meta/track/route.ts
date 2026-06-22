import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

// Server relay to Meta's Conversions API.
//
// The browser calls this with an event_id that matches the one it already sent
// through the pixel, so Meta de-duplicates the pair. We hash every piece of PII
// (SHA-256) before it leaves the server, attach the _fbp/_fbc cookies plus the
// client IP and user-agent for match quality, then forward to the Graph API.
//
// Runs on the Node.js runtime (default) because it needs node:crypto.

const PIXEL_ID =
  process.env.META_PIXEL_ID ?? process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN ?? "";
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE ?? "";
const API_VERSION = "v21.0";

interface TrackBody {
  eventName?: string;
  eventId?: string;
  eventSourceUrl?: string;
  params?: Record<string, unknown>;
  userData?: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  };
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normEmail(value?: string): string | undefined {
  const v = value?.trim().toLowerCase();
  return v || undefined;
}

function normName(value?: string): string | undefined {
  const v = value?.trim().toLowerCase();
  return v || undefined;
}

function normPhone(value?: string): string | undefined {
  // Meta wants country code + number, digits only, no '+'.
  const digits = value?.replace(/\D/g, "");
  return digits || undefined;
}

export async function POST(req: NextRequest) {
  // Accept silently when unconfigured so the client fetch never errors.
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let body: TrackBody;
  try {
    body = (await req.json()) as TrackBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { eventName, eventId, eventSourceUrl, params = {}, userData = {} } = body;
  if (!eventName || !eventId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const fbp = req.cookies.get("_fbp")?.value;
  const fbc = req.cookies.get("_fbc")?.value;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined;
  const ua = req.headers.get("user-agent") || undefined;

  const em = normEmail(userData.email);
  const ph = normPhone(userData.phone);
  const fn = normName(userData.firstName);
  const ln = normName(userData.lastName);

  const user_data: Record<string, unknown> = {};
  if (em) user_data.em = [sha256(em)];
  if (ph) user_data.ph = [sha256(ph)];
  if (fn) user_data.fn = [sha256(fn)];
  if (ln) user_data.ln = [sha256(ln)];
  if (fbp) user_data.fbp = fbp;
  if (fbc) user_data.fbc = fbc;
  if (ip) user_data.client_ip_address = ip;
  if (ua) user_data.client_user_agent = ua;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: eventSourceUrl,
        user_data,
        custom_data: params,
      },
    ],
  };
  if (TEST_EVENT_CODE) payload.test_event_code = TEST_EVENT_CODE;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(
        ACCESS_TOKEN
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      console.error("[meta-capi] graph error", res.status, text);
      return NextResponse.json({ ok: false }, { status: 502 });
    }
  } catch (err) {
    console.error("[meta-capi] fetch failed", err);
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
