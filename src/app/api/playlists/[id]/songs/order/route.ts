import { NextResponse } from "next/server";
import { isSamePermutation } from "@/entities/song-copy";
import { requireMember } from "@/server/auth/api";
import { badRequest, notFound } from "@/server/auth/guard";
import { prisma } from "@/server/db";
import { getOwnedPlaylist } from "@/server/playlists";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** PATCH /api/playlists/{id}/songs/order {copyIds: [...]}: нове впорядкування копій. */
export async function PATCH(request: Request, { params }: Context) {
  const auth = await requireMember();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const playlist = await getOwnedPlaylist(auth.user.id, id);
  if (!playlist) return notFound("playlist");

  const body = (await request.json().catch(() => null)) as { copyIds?: unknown } | null;
  const proposed = body?.copyIds;
  if (!Array.isArray(proposed) || !proposed.every((x): x is string => typeof x === "string")) {
    return badRequest("invalid_order");
  }

  const current = await prisma.songCopy.findMany({
    where: { playlistId: id },
    select: { id: true },
  });
  if (!isSamePermutation(current.map((c) => c.id), proposed)) {
    return badRequest("invalid_order");
  }

  await prisma.$transaction(
    proposed.map((copyId, position) =>
      prisma.songCopy.update({ where: { id: copyId }, data: { position } }),
    ),
  );
  return NextResponse.json({ ok: true });
}
