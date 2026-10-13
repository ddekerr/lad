import { NextResponse } from "next/server";
import { cleanName, isValidRoleKey } from "@/entities/role";
import { can } from "@/entities/user";
import { badRequest, forbidden, unauthorized } from "@/server/auth/guard";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

/** GET /api/roles: довідник ролей (адмін). */
export async function GET() {
  const actor = await getCurrentUser();
  if (!actor) return unauthorized();
  if (!can(actor.actor, "roles:assign")) return forbidden();

  const roles = await prisma.role.findMany({ orderBy: [{ kind: "asc" }, { key: "asc" }] });
  return NextResponse.json({ roles });
}

/** POST /api/roles {key, nameEn, nameUk}: додати музичну роль (лише супер-адмін). */
export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) return unauthorized();
  if (!can(actor.actor, "musicRoles:manage")) return forbidden();

  const body = (await request.json().catch(() => null)) as {
    key?: unknown;
    nameEn?: unknown;
    nameUk?: unknown;
  } | null;
  const key = body?.key;
  const nameEn = cleanName(body?.nameEn);
  const nameUk = cleanName(body?.nameUk);
  if (!isValidRoleKey(key)) return badRequest("invalid_key");
  if (!nameEn || !nameUk) return badRequest("invalid_name");

  const exists = await prisma.role.findUnique({ where: { key } });
  if (exists) return NextResponse.json({ error: "key_taken" }, { status: 409 });

  const role = await prisma.role.create({
    data: { key, kind: "music", nameEn, nameUk, isRemovable: true },
  });
  return NextResponse.json({ role }, { status: 201 });
}
