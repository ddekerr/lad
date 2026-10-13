import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlaylistView } from "@/widgets/playlist-view";
import { roleName } from "@/entities/role";
import { copyState } from "@/entities/song-copy";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { getDictionary } from "@/server/i18n";
import { getOwnedPlaylist } from "@/server/playlists";

export const metadata: Metadata = { title: "Лад · Playlist" };

type Props = { params: Promise<{ id: string }> };

export default async function PlaylistPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const [playlist, { locale, t }] = await Promise.all([
    getOwnedPlaylist(user.id, id),
    getDictionary(),
  ]);
  if (!playlist) notFound();

  const copies = await prisma.songCopy.findMany({
    where: { playlistId: id },
    orderBy: { position: "asc" },
    include: { sourceSong: { select: { version: true, deletedAt: true } } },
  });

  return (
    <PlaylistView
      playlist={{
        id: playlist.id,
        name: playlist.name,
        roleLabel: playlist.musicRole ? roleName(playlist.musicRole, locale) : t.playlists.noRole,
        roleId: playlist.musicRoleId,
      }}
      copies={copies.map((c) => ({
        id: c.id,
        title: c.title,
        artist: c.artist,
        state: copyState(c),
      }))}
      t={t}
    />
  );
}
