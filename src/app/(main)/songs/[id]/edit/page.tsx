import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Forbidden } from "@/components/Forbidden";
import { SongEditor } from "@/components/SongEditor";
import { can } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.editor.titleEdit };
}

type Props = { params: Promise<{ id: string }> };

/** Редагування пісні. Лише Editor. */
export default async function EditSongPage({ params }: Props) {
  const [user, { t }, { id }] = await Promise.all([getCurrentUser(), getDictionary(), params]);
  if (!user) redirect("/sign-in");
  if (!can(user.actor, "song:write")) return <Forbidden t={t} />;

  const song = await prisma.song.findFirst({ where: { id, deletedAt: null } });
  if (!song) notFound();

  return (
    <SongEditor
      songId={song.id}
      initial={{
        title: song.title,
        artist: song.artist,
        language: song.language,
        originalKey: song.originalKey,
        body: song.body,
      }}
      t={t}
    />
  );
}
