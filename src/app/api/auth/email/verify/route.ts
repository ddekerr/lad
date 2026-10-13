import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { normalizeCode, normalizeEmail } from "@/server/auth/crypto";
import { verifyLoginCode } from "@/server/auth/login-codes";
import { createSession, setSessionCookie } from "@/server/auth/session";
import { findOrCreateUser } from "@/server/auth/users";
import { LOCALE_COOKIE } from "@/shared/i18n";

export const dynamic = "force-dynamic";

const STATUS = { invalid: 400, expired: 400, too_many_attempts: 429 } as const;

/** POST /api/auth/email/verify {email, code}: перевірити код і створити сесію. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    code?: unknown;
  } | null;
  const email = normalizeEmail(body?.email);
  const code = normalizeCode(body?.code);
  if (!email || !code) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  const result = await verifyLoginCode(email, code);
  if (result !== "ok") {
    const error = result === "invalid" ? "invalid_code" : result;
    return NextResponse.json({ error }, { status: STATUS[result] });
  }

  const user = await findOrCreateUser(email, "email", null);
  const { token, expiresAt } = await createSession(user.id, (await headers()).get("user-agent"));
  await setSessionCookie(token, expiresAt);

  // Мова з профілю стає мовою інтерфейсу на цьому пристрої
  (await cookies()).set(LOCALE_COOKIE, user.language, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return NextResponse.json({ ok: true });
}
