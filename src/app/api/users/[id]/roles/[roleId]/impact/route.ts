import { NextResponse } from "next/server";
import { forbidden, notFound, unauthorized } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { musicRoleImpact } from "@/lib/roles";

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
