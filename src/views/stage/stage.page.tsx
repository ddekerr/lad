import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { StageRoom } from '@/widgets/stage-mode';
import { getCurrentUser } from '@/server/auth/session';
import { getDictionary } from '@/server/i18n';
import { listPartsForSongs } from '@/server/parts/service';
import { getStage, getStageItems } from '@/server/stage';

export const metadata: Metadata = { title: 'Stage' };

/**
 * Спільна сцена. Немає активної сцени: повертаємо до сетлістів. Партії баса беруться з власних копій
 * користувача, тож у кожного вони свої.
 */
export default async function StagePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const stage = await getStage();
  if (!stage) redirect('/setlists');

  const [{ t }, items] = await Promise.all([getDictionary(), getStageItems(stage.setlistId)]);
  if (items.length === 0) redirect('/setlists');
  const partsBySong = await listPartsForSongs(
    user.id,
    items.map((item) => item.songId),
  );

  return <StageRoom meId={user.id} items={items} initial={stage} partsBySong={partsBySong} t={t} />;
}
