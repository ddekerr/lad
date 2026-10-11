import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/api";
import { badRequest, notFound } from "@/lib/auth/guard";
import { copyState } from "@/lib/copies";
import { prisma } from "@/lib/db";
import { parseCopyPatch } from "@/lib/playlist-input";
import { getOwnedCopy } from "@/lib/playlists";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** GET /api/copies/{id}: копія зі станом синхронізації. */
export async function GET(_request: Request, { params }: Context) {
  const auth = await requireMember();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const copy = await getOwnedCopy(auth.user.id, id);
  if (!copy) return notFound("copy");

  return NextResponse.json({
    copy: {
      id: copy.id,
      playlistId: copy.playlistId,
      title: copy.title,
      artist: copy.artist,
      language: copy.language,
      originalKey: copy.originalKey,
      body: copy.body,
      keyShift: copy.keyShift,
      notes: copy.notes,
      state: copyState(copy),
    },
  });
}

/** PATCH /api/copies/{id}: змінити назву, виконавця, текст з акордами, нотатки, зсув тональності. */
export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireMember();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const copy = await getOwnedCopy(auth.user.id, id);
  if (!copy) return notFound("copy");

  const parsed = parseCopyPatch(await request.json().catch(() => null));
  if (!parsed.ok) return badRequest(parsed.error);

  await prisma.songCopy.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/copies/{id}: видалити копію з плейлиста. */
export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireMember();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const copy = await getOwnedCopy(auth.user.id, id);
  if (!copy) return notFound("copy");

  await prisma.songCopy.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
