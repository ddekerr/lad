import { NextResponse } from "next/server";
import { forbidden, unauthorized } from "@/lib/auth/guard";
import { can, isSuperAdminEmail } from "@/lib/auth/permissions";
import { superAdminEmails } from "@/lib/auth/config";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/users?search= : список користувачів з ролями (адмін). */
export async function GET(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return unauthorized();
  if (!can(actor.actor, "users:read")) return forbidden();

  const search = new URL(request.url).searchParams.get("search")?.trim() ?? "";
  const users = await prisma.user.findMany({
    where: search ? { email: { contains: search, mode: "insensitive" } } : {},
    orderBy: { email: "asc" },
    take: 100,
    select: {
      id: true,
      email: true,
      createdAt: true,
      roles: { select: { role: { select: { id: true, key: true, kind: true } } } },
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      createdAt: u.createdAt,
      isSuperAdmin: isSuperAdminEmail(u.email, superAdminEmails()),
      roles: u.roles.map((r) => r.role),
    })),
  });
}
