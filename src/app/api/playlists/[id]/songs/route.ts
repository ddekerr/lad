import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/api";
import { badRequest, notFound } from "@/lib/auth/guard";
import { copyDataFromSong, nextPosition } from "@/lib/copies";
import { prisma } from "@/lib/db";
import { getOwnedPlaylist } from "@/lib/playlists";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/playlists/{id}/songs {songId}: додати пісню в плейлист.
 * Кожне додавання створює нову незалежну копію, навіть якщо така пісня тут уже є.
 */
export async function POST(request: Request, { params }: Context) {
  const auth = await requireMember();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const playlist = await getOwnedPlaylist(auth.user.id, id);
  if (!playlist) return notFound("playlist");

  const body = (await request.json().catch(() => null)) as { songId?: unknown } | null;
  if (typeof body?.songId !== "string") return badRequest("invalid_song");

  const song = await prisma.song.findFirst({ where: { id: body.songId, deletedAt: null } });
  if (!song) return notFound("song");

  const copy = await prisma.$transaction(async (tx) => {
    const existing = await tx.songCopy.findMany({
      where: { playlistId: id },
      select: { position: true },
    });
    return tx.songCopy.create({
      data: {
        playlistId: id,
        sourceSongId: song.id,
        position: nextPosition(existing.map((c) => c.position)),
        ...copyDataFromSong(song),
      },
      select: { id: true },
    });
  });

  return NextResponse.json({ copy }, { status: 201 });
}
