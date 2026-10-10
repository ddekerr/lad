import { NextResponse } from "next/server";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/auth/guard";
import { canGrantRole } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** POST /api/users/{id}/roles {roleId}: видати роль (адмін; роль Admin лише супер-адмін). */
export async function POST(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return unauthorized();

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { roleId?: unknown } | null;
  if (typeof body?.roleId !== "string") return badRequest("invalid_role");

  const [role, target] = await Promise.all([
    prisma.role.findUnique({ where: { id: body.roleId } }),
    prisma.user.findUnique({ where: { id }, select: { id: true } }),
  ]);
  if (!role) return notFound("role");
  if (!target) return notFound("user");

  const decision = canGrantRole(actor.actor, role);
  if (!decision.ok) return forbidden(decision.reason);

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: target.id, roleId: role.id } },
    update: {},
    create: { userId: target.id, roleId: role.id, grantedById: actor.id },
  });
  return NextResponse.json({ ok: true });
}
