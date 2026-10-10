import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

/** GET /api/me: email, мова, ролі поточного користувача. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      language: user.language,
      roles: user.roles,
      isSuperAdmin: user.isSuperAdmin,
    },
  });
}

/** PATCH /api/me {language}: змінити мову інтерфейсу. */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { language?: string } | null;
  const language = body?.language;
  if (!isLocale(language)) {
    return NextResponse.json({ error: "invalid_language" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { language } });
  (await cookies()).set(LOCALE_COOKIE, language, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return NextResponse.json({ ok: true });
}
