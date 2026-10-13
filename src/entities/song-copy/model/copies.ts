/**
 * Логіка персональних копій пісень і порядку в плейлисті (lad-functional-spec.md п. 5).
 * Чисті функції без доступу до БД: легко тестуються.
 */

/** Поля оригіналу, потрібні, щоб зробити копію або оновити її. */
export type SongSnapshot = {
  title: string;
  artist: string;
  language: "en" | "uk";
  originalKey: string;
  body: string;
  version: number;
};

/** Дані нової копії: вміст оригіналу, зсув тональності 0, синхронізована версія = поточна. */
export function copyDataFromSong(song: SongSnapshot) {
  return {
    title: song.title,
    artist: song.artist,
    language: song.language,
    originalKey: song.originalKey,
    body: song.body,
    keyShift: 0,
    notes: "",
    syncedVersion: song.version,
    isStandalone: false,
  };
}

/**
 * Оновлення копії згідно з оригіналом: замінює назву, виконавця, мову, тональність
 * оригіналу, текст і акорди. Нотатки та обраний зсув тональності не змінюються.
 */
export function refreshDataFromSong(song: SongSnapshot) {
  return {
    title: song.title,
    artist: song.artist,
    language: song.language,
    originalKey: song.originalKey,
    body: song.body,
    syncedVersion: song.version,
  };
}

export type CopyState = "current" | "outdated" | "original_deleted" | "standalone";

/**
 * Стан копії:
 * - standalone: «залишили як власну», зв'язку з базою немає;
 * - original_deleted: оригінал видалено (м'яко чи остаточно);
 * - outdated: редактор змінив оригінал, версії розійшлися;
 * - current: усе збігається.
 */
export function copyState(copy: {
  isStandalone: boolean;
  syncedVersion: number | null;
  sourceSong: { version: number; deletedAt: Date | null } | null;
}): CopyState {
  if (copy.isStandalone) return "standalone";
  if (!copy.sourceSong || copy.sourceSong.deletedAt) return "original_deleted";
  if (copy.syncedVersion === null || copy.sourceSong.version > copy.syncedVersion) {
    return "outdated";
  }
  return "current";
}

/** Позиція для нової копії в кінці плейлиста (позиції з нуля). */
export function nextPosition(positions: readonly number[]): number {
  return positions.length === 0 ? 0 : Math.max(...positions) + 1;
}

/** Переміщує елемент на крок вгору (-1) чи вниз (+1). Поза межами: без змін. */
export function moveItem<T>(items: readonly T[], item: T, direction: -1 | 1): T[] {
  const index = items.indexOf(item);
  const target = index + direction;
  const result = [...items];
  if (index < 0 || target < 0 || target >= items.length) return result;
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}

/** Нове впорядкування має містити рівно ті самі id (без втрат і дублів). */
export function isSamePermutation(current: readonly string[], proposed: readonly string[]): boolean {
  if (current.length !== proposed.length) return false;
  const set = new Set(proposed);
  return set.size === proposed.length && current.every((id) => set.has(id));
}

/** Сусіди елемента в плейлисті для кнопок «Попередня» й «Наступна» в режимі сцени. */
export function neighbours<T>(items: readonly T[], item: T): { prev: T | null; next: T | null; index: number } {
  const index = items.indexOf(item);
  if (index < 0) return { prev: null, next: null, index: -1 };
  return {
    prev: index > 0 ? items[index - 1] : null,
    next: index < items.length - 1 ? items[index + 1] : null,
    index,
  };
}
