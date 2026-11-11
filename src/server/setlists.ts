/** Спільні сетлісти: читання, збереження, видалення. Доступ мають усі авторизовані (перевіряє маршрут). */
import type { SetlistInput } from '@/entities/setlist';
import { prisma } from './db';

export type SetlistSaveResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'unknown_song' | 'on_stage' | 'not_found' };

const STAGE_ID = 'main';

export function listSetlists() {
  return prisma.setlist.findMany({
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, updatedAt: true, _count: { select: { items: true } } },
  });
}

/** Сетліст разом із піснями в порядку виступу. */
export function getSetlist(id: string) {
  return prisma.setlist.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { position: 'asc' },
        include: {
          song: { select: { id: true, title: true, artist: true, originalKey: true, body: true, deletedAt: true } },
        },
      },
    },
  });
}

/** Чи зараз цей сетліст на спільній сцені (тоді його не можна змінювати й видаляти: збилися б номери пісень). */
export async function isOnStage(setlistId: string): Promise<boolean> {
  const session = await prisma.stageSession.findUnique({ where: { id: STAGE_ID }, select: { setlistId: true } });
  return session?.setlistId === setlistId;
}

/** Створює сетліст (id = null) або замінює назву й список пісень наявного. */
export async function saveSetlist(id: string | null, userId: string, input: SetlistInput): Promise<SetlistSaveResult> {
  const songIds = [...new Set(input.items.map((item) => item.songId))];
  const found = await prisma.song.count({ where: { id: { in: songIds }, deletedAt: null } });
  if (found !== songIds.length) return { ok: false, reason: 'unknown_song' };

  if (id !== null) {
    if (!(await prisma.setlist.findUnique({ where: { id }, select: { id: true } }))) {
      return { ok: false, reason: 'not_found' };
    }
    if (await isOnStage(id)) return { ok: false, reason: 'on_stage' };
  }

  const items = input.items.map((item, position) => ({ songId: item.songId, keyShift: item.keyShift, position }));
  const saved = await prisma.$transaction(async (tx) => {
    if (id === null) {
      return tx.setlist.create({
        data: { name: input.name, createdById: userId, items: { create: items } },
        select: { id: true },
      });
    }
    await tx.setlistItem.deleteMany({ where: { setlistId: id } });
    return tx.setlist.update({
      where: { id },
      data: { name: input.name, items: { create: items } },
      select: { id: true },
    });
  });
  return { ok: true, id: saved.id };
}

export async function deleteSetlist(id: string): Promise<'ok' | 'on_stage' | 'not_found'> {
  if (await isOnStage(id)) return 'on_stage';
  const result = await prisma.setlist.deleteMany({ where: { id } });
  return result.count === 0 ? 'not_found' : 'ok';
}
