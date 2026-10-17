import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { CopyView } from '@/widgets/copy-editor';
import { buildGenerationInput, copyState, readDynamics } from '@/entities/song-copy';
import { getCurrentUser } from '@/server/auth/session';
import { getDictionary } from '@/server/i18n';
import { copyForParts, listCopyParts } from '@/server/parts/service';
import { getOwnedCopy } from '@/server/playlists';

export const metadata: Metadata = { title: 'Лад · Copy' };

type Props = { params: Promise<{ id: string }> };

/** Моя копія пісні: перегляд, тональність, нотатки, правки, оновлення з оригіналу. */
export default async function CopyPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const { id } = await params;
  const [copy, { t }] = await Promise.all([getOwnedCopy(user.id, id), getDictionary()]);
  if (!copy) notFound();
  const parts = await listCopyParts(copy);
  const canGenerate = buildGenerationInput(copyForParts(copy), 'easy').ok;

  return (
    <CopyView
      key={`${copy.id}:${copy.state}:${copy.title}:${copy.body.length}`}
      copy={{
        id: copy.id,
        title: copy.title,
        artist: copy.artist,
        language: copy.language,
        originalKey: copy.originalKey,
        body: copy.body,
        keyShift: copy.keyShift,
        notes: copy.notes,
        bpm: copy.bpm,
        timeSignature: copy.timeSignature,
        sectionDynamics: readDynamics(copy.sectionDynamics),
        state: copyState(copy),
      }}
      playlist={{ id: copy.playlist.id, name: copy.playlist.name }}
      parts={parts}
      canGenerate={canGenerate}
      t={t}
    />
  );
}
