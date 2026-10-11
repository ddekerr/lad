import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToPlaylist } from "@/components/AddToPlaylist";
import { IconChevronLeft } from "@/components/icons";
import { SongView } from "@/components/SongView";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getDictionary } from "@/lib/i18n/server";
import { roleName } from "@/lib/playlists";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function findSong(id: string) {
  return prisma.song.findFirst({ where: { id, deletedAt: null } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const song = await findSong(id);
  return { title: song?.title ?? "Лад" };
}

/** Перегляд пісні: публічний, змінює лише відображення в браузері. */
export default async function SongPage({ params }: Props) {
  const { id } = await params;
  const [song, { locale, t }, user] = await Promise.all([
    findSong(id),
    getDictionary(),
    getCurrentUser(),
  ]);
  if (!song) notFound();

  const playlists = user
    ? (
        await prisma.playlist.findMany({
          where: { userId: user.id },
          orderBy: [{ musicRoleId: "asc" }, { createdAt: "asc" }],
          select: { id: true, name: true, musicRole: { select: { nameEn: true, nameUk: true } } },
        })
      ).map((p) => ({
        id: p.id,
        name: p.name,
        roleLabel: p.musicRole ? roleName(p.musicRole, locale) : t.playlists.noRole,
      }))
    : null;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 self-start text-sm text-muted hover:text-cream"
        >
          <IconChevronLeft size={18} />
          {t.song.back}
        </Link>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{song.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-muted">
          <span>{song.artist}</span>
          <span className="rounded-full bg-line px-2.5 py-0.5 text-xs font-semibold text-cream">
            {t.song.language[song.language]}
          </span>
        </div>
      </div>

      <AddToPlaylist songId={song.id} playlists={playlists} t={t} />

      <SongView id={song.id} body={song.body} originalKey={song.originalKey} t={t} />
    </main>
  );
}
