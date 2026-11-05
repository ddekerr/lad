/**
 * Позиція на спільній сцені та команди керування (чиста логіка).
 * Позиція це номер пісні в сетлісті (з нуля), номер такту (з нуля) і зсув тональності.
 * Спільною є саме позиція: кожен учасник бачить її у своєму вигляді (текст, акорди чи партія).
 */
import type { Bar } from '@/shared/lib/bars';

export const MAX_BAR_INDEX = 4096;

const mod12 = (n: number) => ((n % 12) + 12) % 12;

export type StageCommand =
  | { type: 'item'; item: number }
  | { type: 'bar'; bar: number }
  | { type: 'shift'; shift: number };

/** Розбирає команду від ведучого; null, якщо вона хибна або виходить за межі сетліста. */
export function parseStageCommand(raw: unknown, itemCount: number): StageCommand | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { type, item, bar, shift } = raw as Record<string, unknown>;
  const isInt = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value);

  if (type === 'item') return isInt(item) && item >= 0 && item < itemCount ? { type, item } : null;
  if (type === 'bar') return isInt(bar) && bar >= 0 && bar <= MAX_BAR_INDEX ? { type, bar } : null;
  if (type === 'shift') return isInt(shift) ? { type, shift: mod12(shift) } : null;
  return null;
}

/** Номер такту, обмежений довжиною пісні (для пісні без тактів це 0). */
export function clampBar(barCount: number, bar: number): number {
  return Math.max(0, Math.min(bar, Math.max(0, barCount - 1)));
}

/** Рядок тексту (з одиниці), у якому стоїть такт, або null. */
export function lineOfBar(bars: readonly Bar[], bar: number): number | null {
  return bars[bar]?.line ?? null;
}

/** Номер першого такту, що починається в цьому рядку тексту, або null, якщо в рядку тактів нема. */
export function barOfLine(bars: readonly Bar[], line: number): number | null {
  const index = bars.findIndex((item) => item.line === line);
  return index === -1 ? null : index;
}

/** Номери тактів, з яких починається кожен розділ. */
export function sectionStarts(bars: readonly Bar[]): number[] {
  return bars.flatMap((bar, i) => (i === 0 || bar.section !== bars[i - 1].section ? [i] : []));
}

/** Перший такт попереднього (-1) чи наступного (+1) розділу. Із крайнього розділу лишається на місці. */
export function stepSection(bars: readonly Bar[], bar: number, direction: 1 | -1): number {
  const starts = sectionStarts(bars);
  if (starts.length === 0) return 0;
  const current = starts.filter((start) => start <= bar).length - 1;
  if (direction === 1) return starts[Math.min(current + 1, starts.length - 1)];
  // Із середини розділу «назад» веде на його початок, а з початку на попередній розділ.
  return starts[starts[current] < bar ? current : Math.max(0, current - 1)];
}

/**
 * Такт партії, що відповідає такту пісні на сцені. Партія особиста й могла бути зроблена зі старішого тексту,
 * тому спершу шукаємо той самий розділ і той самий зсув усередині нього, інакше беремо номер такту.
 */
export function matchPartBar(
  songBars: readonly { section?: string | null }[],
  partBars: readonly { section?: string | null }[],
  bar: number,
): number {
  if (partBars.length === 0) return 0;
  const section = songBars[bar]?.section;
  if (section) {
    const firstInSong = songBars.findIndex((item) => item.section === section);
    const firstInPart = partBars.findIndex((item) => item.section === section);
    if (firstInSong !== -1 && firstInPart !== -1) {
      let end = firstInPart;
      while (end + 1 < partBars.length && partBars[end + 1].section === section) end += 1;
      return Math.min(firstInPart + (bar - firstInSong), end);
    }
  }
  return clampBar(partBars.length, bar);
}

/** Пісня сетліста з усім, що потрібно, щоб показати її на сцені. */
export type StageItemView = {
  id: string;
  songId: string;
  title: string;
  artist: string;
  originalKey: string;
  body: string;
  /** Зсув тональності, заданий у сетлісті для цього виступу */
  keyShift: number;
};

/** Стан спільної сцени, який опитують учасники. */
export type StageStateView = {
  setlistId: string;
  setlistName: string;
  /** Хто веде сцену (ім'я з пошти) і чи це поточний користувач */
  leaderId: string;
  leaderName: string;
  item: number;
  bar: number;
  keyShift: number;
  revision: number;
  itemCount: number;
};

/** Ім'я для показу з адреси пошти: частина до `@`. */
export function nameFromEmail(email: string): string {
  const name = email.split('@')[0]?.trim();
  return name ? name : email;
}
