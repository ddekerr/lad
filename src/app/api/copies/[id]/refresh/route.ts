import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/api";
import { badRequest, notFound } from "@/lib/auth/guard";
import { refreshDataFromSong } from "@/lib/copies";
import { prisma } from "@/lib/db";
import { getOwnedCopy } from "@/lib/playlists";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/copies/{id}/refresh: оновити копію згідно з оригіналом (одна дія для тексту й акордів).
 * Власні правки назви, виконавця, тексту й акордів замінюються; нотатки й зсув тональності лишаються.
 */
export async function POST(_request: Request, { params }: Context) {
  const auth = await requireMember();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const copy = await getOwnedCopy(auth.user.id, id);
  if (!copy) return notFound("copy");
  if (copy.isStandalone || !copy.sourceSongId) return badRequest("no_original");

  const song = await prisma.song.findFirst({ where: { id: copy.sourceSongId, deletedAt: null } });
  if (!song) return badRequest("original_deleted");

  await prisma.songCopy.update({ where: { id }, data: refreshDataFromSong(song) });
  return NextResponse.json({ ok: true });
}
