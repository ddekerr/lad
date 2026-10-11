import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/api";
import { badRequest, notFound } from "@/lib/auth/guard";
import { copyState } from "@/lib/copies";
import { prisma } from "@/lib/db";
import { cleanPlaylistName } from "@/lib/playlist-input";
import { getOwnedPlaylist } from "@/lib/playlists";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** GET /api/playlists/{id}: плейлист із копіями й станом кожної. */
export async function GET(_request: Request, { params }: Context) {
  const auth = await requireMember();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const playlist = await getOwnedPlaylist(auth.user.id, id);
  if (!playlist) return notFound("playlist");

  const copies = await prisma.songCopy.findMany({
    where: { playlistId: id },
    orderBy: { position: "asc" },
    include: { sourceSong: { select: { version: true, deletedAt: true } } },
  });

  return NextResponse.json({
    playlist: { id: playlist.id, name: playlist.name, musicRoleId: playlist.musicRoleId },
    copies: copies.map((c) => ({
      id: c.id,
      position: c.position,
      title: c.title,
      artist: c.artist,
      originalKey: c.originalKey,
      keyShift: c.keyShift,
      state: copyState(c),
    })),
  });
}

/** PATCH /api/playlists/{id} {name}: перейменувати. */
export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireMember();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const playlist = await getOwnedPlaylist(auth.user.id, id);
  if (!playlist) return notFound("playlist");

  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = cleanPlaylistName(body?.name);
  if (!name) return badRequest("invalid_name");

  await prisma.playlist.update({ where: { id }, data: { name } });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/playlists/{id}: видалити плейлист разом із копіями (каскад у БД). */
export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireMember();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const playlist = await getOwnedPlaylist(auth.user.id, id);
  if (!playlist) return notFound("playlist");

  await prisma.playlist.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
