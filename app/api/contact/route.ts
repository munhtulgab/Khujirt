import { NextResponse, type NextRequest } from "next/server";

/**
 * Same-origin proxy for the contact form → Python API (Cloudflare Worker + D1).
 * Keeps the API address private, forwards the visitor IP for rate limiting and
 * authenticates with a shared key so the Worker only trusts this proxy.
 */
const API_URL = (process.env.KHUJIRT_API_URL || "").replace(/\/$/, "");
const PROXY_KEY = process.env.KHUJIRT_API_PROXY_KEY || "";
const MAX_BODY = 16_000;

export async function POST(request: NextRequest) {
  if (!API_URL) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const body = await request.text();
  if (body.length > MAX_BODY) return NextResponse.json({ error: "too_large" }, { status: 413 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": (request.headers.get("user-agent") || "").slice(0, 300),
  };
  if (PROXY_KEY) headers["x-proxy-key"] = PROXY_KEY;
  if (ip) headers["x-forwarded-for"] = ip;

  try {
    const res = await fetch(`${API_URL}/api/contact`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}
