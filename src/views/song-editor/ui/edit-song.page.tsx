import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { SongEditor } from '@/widgets/song-editor';
import { can } from '@/entities/user';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db';
import { getDictionary } from '@/server/i18n';
import { Forbidden } from '@/shared/ui';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.editor.titleEdit };
}

type Props = { params: Promise<{ id: string }> };

/** Редагування пісні. Лише Editor. */
export default async function EditSongPage({ params }: Props) {
  const [user, { t }, { id }] = await Promise.all([getCurrentUser(), getDictionary(), params]);
  if (!user) redirect('/sign-in');
  if (!can(user.actor, 'song:write')) return <Forbidden t={t} />;

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
