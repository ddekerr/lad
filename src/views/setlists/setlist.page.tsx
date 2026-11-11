import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { SetlistEditor } from '@/widgets/setlist-editor';
import { getCurrentUser } from '@/server/auth/session';
import { getDictionary } from '@/server/i18n';
import { getSetlist } from '@/server/setlists';
import { getStage } from '@/server/stage';

export const metadata: Metadata = { title: 'Лад · Setlist' };

type Props = { params: Promise<{ id: string }> };

export default async function SetlistPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const { id } = await params;
  const [{ t }, setlist, stage] = await Promise.all([getDictionary(), getSetlist(id), getStage()]);
  if (!setlist) notFound();

  return (
    <SetlistEditor
      key={`${setlist.id}-${setlist.updatedAt.getTime()}`}
      setlist={{
        id: setlist.id,
        name: setlist.name,
        items: setlist.items.map((item) => ({
          songId: item.songId,
          title: item.song.title,
          artist: item.song.artist,
          originalKey: item.song.originalKey,
          keyShift: item.keyShift,
        })),
      }}
      stage={
        stage
          ? {
              leaderName: stage.leaderName,
              setlistName: stage.setlistName,
              onThis: stage.setlistId === setlist.id,
              mine: stage.leaderId === user.id,
            }
          : null
      }
      t={t}
    />
  );
}
