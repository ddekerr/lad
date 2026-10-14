import { NextResponse } from 'next/server';
import { contentChanged, parseSongInput } from '@/entities/song';
import { requireEditor } from '@/server/auth/api';
import { badRequest, notFound } from '@/server/auth/guard';
import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

/** GET /api/songs/{id} : публічно, пісня з текстом і акордами. */
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const song = await prisma.song.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      title: true,
      artist: true,
      language: true,
      originalKey: true,
      body: true,
      version: true,
    },
  });

  if (!song) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ song });
}

/** PATCH /api/songs/{id}: змінити пісню (Editor). Версія зростає, лише якщо змінився вміст. */
export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireEditor();
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const parsed = parseSongInput(await request.json().catch(() => null));
  if (!parsed.ok) return badRequest(parsed.error);

  const current = await prisma.song.findFirst({ where: { id, deletedAt: null } });
  if (!current) return notFound('song');

  if (!contentChanged(current, parsed.data)) {
    return NextResponse.json({ song: { id, version: current.version } });
  }
  const song = await prisma.song.update({
    where: { id },
    data: { ...parsed.data, version: { increment: 1 }, updatedById: auth.user.id },
    select: { id: true, version: true },
  });
  return NextResponse.json({ song });
}

/** DELETE /api/songs/{id}: м'яке видалення (Editor). Копії користувачів лишаються. */
export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireEditor();
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const current = await prisma.song.findFirst({ where: { id, deletedAt: null } });
  if (!current) return notFound('song');

  await prisma.song.update({
    where: { id },
    data: { deletedAt: new Date(), updatedById: auth.user.id },
  });
  return NextResponse.json({ ok: true });
}
