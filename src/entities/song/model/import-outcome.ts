import type { ImportItemError } from './song-import';

/** Тіло відповіді POST /api/songs/import. */
export type ImportResponse = {
  imported?: number;
  ignoredFields?: string[];
  error?: string;
  items?: ImportItemError[];
  total?: number;
};

export type ImportOutcome =
  | { kind: 'done'; imported: number; ignoredFields: string[] }
  | { kind: 'invalid_songs'; items: ImportItemError[]; total: number }
  | { kind: 'error'; code: string };

/** Перетворює відповідь сервера на один із трьох результатів, які показує інтерфейс. */
export function importOutcome(ok: boolean, data: ImportResponse | null): ImportOutcome {
  if (ok && typeof data?.imported === 'number') {
    return { kind: 'done', imported: data.imported, ignoredFields: data.ignoredFields ?? [] };
  }
  if (data?.error === 'invalid_songs') {
    const items = data.items ?? [];
    return { kind: 'invalid_songs', items, total: data.total ?? items.length };
  }
  return { kind: 'error', code: data?.error ?? 'generic' };
}
