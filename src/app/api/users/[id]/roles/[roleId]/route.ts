import { NextResponse } from "next/server";
import { superAdminEmails } from "@/lib/auth/config";
import { forbidden, notFound, unauthorized } from "@/lib/auth/guard";
import { canRevokeRole, isSuperAdminEmail } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string; roleId: string }> };

/**
 * DELETE /api/users/{id}/roles/{roleId}: зняти роль.
 * Member не знімається. При зніманні музичної ролі в одній транзакції
 * видаляються плейлисти цієї ролі й усі копії в них.
 */
export async function DELETE(_request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return unauthorized();

  const { id, roleId } = await params;
  const [role, target] = await Promise.all([
    prisma.role.findUnique({ where: { id: roleId } }),
    prisma.user.findUnique({ where: { id }, select: { id: true, email: true } }),
  ]);
  if (!role) return notFound("role");
  if (!target) return notFound("user");

  const decision = canRevokeRole(actor.actor, role, {
    isSuperAdmin: isSuperAdminEmail(target.email, superAdminEmails()),
  });
  if (!decision.ok) return forbidden(decision.reason);

  await prisma.$transaction(async (tx) => {
    if (role.kind === "music") {
      // Копії видаляються каскадом разом із плейлистами
      await tx.playlist.deleteMany({ where: { userId: target.id, musicRoleId: role.id } });
    }
    await tx.userRole.deleteMany({ where: { userId: target.id, roleId: role.id } });
  });

  return NextResponse.json({ ok: true });
}
