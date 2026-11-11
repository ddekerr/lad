/**
 * Спільна сцена: одна на всіх. У таблиці завжди щонайбільше один рядок (id = 'main'), тож запустити другу
 * не вдасться навіть при одночасних запитах. Ведучий (той, хто запустив) рухає пісню, такт і тональність,
 * решта опитує стан і слідує за ним.
 */
import { Prisma } from '@prisma/client';
import { parseBars } from '@/shared/lib/bars';
import {
  clampBar,
  nameFromEmail,
  type StageCommand,
  type StageItemView,
  type StageStateView,
} from '@/entities/setlist';
import { isAdmin, type Actor } from '@/entities/user';
import { prisma } from './db';

const STAGE_ID = 'main';
/** Сцена без жодної зміни понад цей час вважається забутою й не заважає запустити нову. */
export const STAGE_IDLE_MS = 12 * 60 * 60 * 1000;

type SessionRow = Prisma.StageSessionGetPayload<{
  include: {
    startedBy: { select: { email: true } };
    setlist: { select: { name: true; _count: { select: { items: true } } } };
  };
}>;

function toView(row: SessionRow): StageStateView {
  return {
    setlistId: row.setlistId,
    setlistName: row.setlist.name,
    leaderId: row.startedById,
    leaderName: nameFromEmail(row.startedBy.email),
    item: row.itemIndex,
    bar: row.bar,
    keyShift: row.keyShift,
    revision: row.revision,
    itemCount: row.setlist._count.items,
  };
}

async function loadRow(): Promise<SessionRow | null> {
  const row = await prisma.stageSession.findUnique({
    where: { id: STAGE_ID },
    include: {
      startedBy: { select: { email: true } },
      setlist: { select: { name: true, _count: { select: { items: true } } } },
    },
  });
  if (!row) return null;
  if (Date.now() - row.updatedAt.getTime() > STAGE_IDLE_MS) {
    await prisma.stageSession.deleteMany({ where: { id: STAGE_ID, revision: row.revision } });
    return null;
  }
  return row;
}

/** Поточна сцена або null, якщо ніхто її не вів. */
export async function getStage(): Promise<StageStateView | null> {
  const row = await loadRow();
  return row ? toView(row) : null;
}

/** Пісні сетліста з текстами для показу на сцені. */
export async function getStageItems(setlistId: string): Promise<StageItemView[]> {
  const items = await prisma.setlistItem.findMany({
    where: { setlistId },
    orderBy: { position: 'asc' },
    include: { song: { select: { id: true, title: true, artist: true, originalKey: true, body: true } } },
  });
  return items.map((item) => ({
    id: item.id,
    songId: item.song.id,
    title: item.song.title,
    artist: item.song.artist,
    originalKey: item.song.originalKey,
    body: item.song.body,
    keyShift: item.keyShift,
  }));
}

export type StartResult =
  | { ok: true; stage: StageStateView }
  | { ok: false; reason: 'busy' | 'not_found' | 'empty'; stage?: StageStateView };

/** Запускає сцену для сетліста. Якщо сцена вже йде в когось, повертає `busy` разом з її станом. */
export async function startStage(setlistId: string, userId: string): Promise<StartResult> {
  const setlist = await prisma.setlist.findUnique({
    where: { id: setlistId },
    select: { id: true, items: { orderBy: { position: 'asc' }, take: 1, select: { keyShift: true } } },
  });
  if (!setlist) return { ok: false, reason: 'not_found' };
  if (setlist.items.length === 0) return { ok: false, reason: 'empty' };

  const current = await loadRow();
  if (current) return { ok: false, reason: 'busy', stage: toView(current) };

  try {
    await prisma.stageSession.create({
      data: { id: STAGE_ID, setlistId, startedById: userId, keyShift: setlist.items[0].keyShift },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const winner = await loadRow();
      return { ok: false, reason: 'busy', ...(winner ? { stage: toView(winner) } : {}) };
    }
    throw error;
  }
  const created = await loadRow();
  return created ? { ok: true, stage: toView(created) } : { ok: false, reason: 'busy' };
}

export type MoveResult =
  | { ok: true; stage: StageStateView }
  | { ok: false; reason: 'no_stage' | 'not_leader' | 'bad_command' };

/** Команда ведучого: перейти до пісні, до такту чи змінити тональність. Іншим учасникам керувати не можна. */
export async function moveStage(userId: string, command: StageCommand): Promise<MoveResult> {
  const row = await loadRow();
  if (!row) return { ok: false, reason: 'no_stage' };
  if (row.startedById !== userId) return { ok: false, reason: 'not_leader' };

  let data: Prisma.StageSessionUpdateInput;
  if (command.type === 'item') {
    const target = await prisma.setlistItem.findFirst({
      where: { setlistId: row.setlistId },
      orderBy: { position: 'asc' },
      skip: command.item,
      select: { keyShift: true },
    });
    if (!target) return { ok: false, reason: 'bad_command' };
    data = { itemIndex: command.item, bar: 0, keyShift: target.keyShift };
  } else if (command.type === 'bar') {
    const current = await prisma.setlistItem.findFirst({
      where: { setlistId: row.setlistId },
      orderBy: { position: 'asc' },
      skip: row.itemIndex,
      select: { song: { select: { body: true } } },
    });
    const count = current ? parseBars(current.song.body).bars.length : 0;
    data = { bar: clampBar(count, command.bar) };
  } else {
    data = { keyShift: command.shift };
  }

  await prisma.stageSession.update({ where: { id: STAGE_ID }, data: { ...data, revision: { increment: 1 } } });
  const updated = await loadRow();
  return updated ? { ok: true, stage: toView(updated) } : { ok: false, reason: 'no_stage' };
}

/** Завершує сцену: це може зробити ведучий або адмін (якщо ведучий пішов і забув). */
export async function endStage(userId: string, actor: Actor): Promise<'ok' | 'no_stage' | 'forbidden'> {
  const row = await prisma.stageSession.findUnique({ where: { id: STAGE_ID }, select: { startedById: true } });
  if (!row) return 'no_stage';
  if (row.startedById !== userId && !isAdmin(actor)) return 'forbidden';
  await prisma.stageSession.deleteMany({ where: { id: STAGE_ID } });
  return 'ok';
}
