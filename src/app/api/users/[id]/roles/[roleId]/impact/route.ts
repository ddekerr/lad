import { NextResponse } from "next/server";
import { can } from "@/entities/user";
import { forbidden, notFound, unauthorized } from "@/server/auth/guard";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { musicRoleImpact } from "@/server/roles";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; roleId: string }> };

/** GET /api/users/{id}/roles/{roleId}/impact: скільки плейлистів і копій буде видалено. */
export async function GET(_request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return unauthorized();
  if (!can(actor.actor, "roles:assign")) return forbidden();

  const { id, roleId } = await params;
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return notFound("role");

  const impact =
    role.kind === "music" ? await musicRoleImpact(role.id, id) : { playlists: 0, copies: 0 };
  return NextResponse.json({ impact });
}
