import { NextResponse } from "next/server";
import { forbidden, notFound, unauthorized } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { musicRoleImpact } from "@/lib/roles";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** GET /api/roles/{id}/impact: скільки користувачів, плейлистів і копій зачепить видалення ролі. */
export async function GET(_request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return unauthorized();
  if (!can(actor.actor, "musicRoles:manage")) return forbidden();

  const { id } = await params;
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) return notFound("role");

  const [users, impact] = await Promise.all([
    prisma.userRole.count({ where: { roleId: id } }),
    musicRoleImpact(id),
  ]);
  return NextResponse.json({ impact: { users, ...impact } });
}
