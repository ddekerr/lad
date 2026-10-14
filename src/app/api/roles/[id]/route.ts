import { NextResponse } from 'next/server';
import { cleanName } from '@/entities/role';
import { can } from '@/entities/user';
import { badRequest, forbidden, notFound, unauthorized } from '@/server/auth/guard';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

/** PATCH /api/roles/{id} {nameEn?, nameUk?}: перейменувати музичну роль (супер-адмін). */
export async function PATCH(request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return unauthorized();
  if (!can(actor.actor, 'musicRoles:manage')) return forbidden();

  const { id } = await params;
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) return notFound('role');
  if (role.kind !== 'music') return badRequest('not_a_music_role');

  const body = (await request.json().catch(() => null)) as {
    nameEn?: unknown;
    nameUk?: unknown;
  } | null;
  const nameEn = body?.nameEn === undefined ? role.nameEn : cleanName(body.nameEn);
  const nameUk = body?.nameUk === undefined ? role.nameUk : cleanName(body.nameUk);
  if (!nameEn || !nameUk) return badRequest('invalid_name');

  const updated = await prisma.role.update({ where: { id }, data: { nameEn, nameUk } });
  return NextResponse.json({ role: updated });
}

/**
 * DELETE /api/roles/{id}: прибрати музичну роль із системи (супер-адмін).
 * Каскадом зникають зв'язки з користувачами, плейлисти цієї ролі й копії в них.
 */
export async function DELETE(_request: Request, { params }: Context) {
  const actor = await getCurrentUser();
  if (!actor) return unauthorized();
  if (!can(actor.actor, 'musicRoles:manage')) return forbidden();

  const { id } = await params;
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) return notFound('role');
  if (role.kind !== 'music') return badRequest('not_a_music_role');

  await prisma.role.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
