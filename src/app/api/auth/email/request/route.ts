import { NextResponse } from "next/server";
import { normalizeEmail } from "@/server/auth/crypto";
import { requestLoginCode } from "@/server/auth/login-codes";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/email/request {email}: надіслати код на пошту.
 * Відповідь однакова, чи є такий акаунт, чи ні (адреси не розкриваємо).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (!email) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const result = await requestLoginCode(email);
  if (result === "rate_limited") {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  return NextResponse.json({ ok: true });
}
