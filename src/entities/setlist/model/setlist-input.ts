/** Перевірка введення для сетлістів (чиста логіка, без БД). */
export const MAX_SETLIST_NAME = 80;
export const MAX_SETLIST_ITEMS = 60;

export type SetlistItemInput = { songId: string; keyShift: number };
export type SetlistInput = { name: string; items: SetlistItemInput[] };

export type SetlistParse = { ok: true; data: SetlistInput } | { ok: false; error: string };

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Назва сетліста: 1..80 символів після обрізання пробілів. */
export function cleanSetlistName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= MAX_SETLIST_NAME ? name : null;
}

/** Тіло запиту `{name, items:[{songId, keyShift}]}`: зсув приводиться до 0..11, порядок масиву стає порядком у списку. */
export function parseSetlistInput(raw: unknown): SetlistParse {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'invalid_body' };
  const { name, items } = raw as { name?: unknown; items?: unknown };

  const cleanName = cleanSetlistName(name);
  if (!cleanName) return { ok: false, error: 'invalid_name' };
  if (!Array.isArray(items)) return { ok: false, error: 'invalid_items' };
  if (items.length > MAX_SETLIST_ITEMS) return { ok: false, error: 'too_many_items' };

  const parsed: SetlistItemInput[] = [];
  for (const item of items) {
    const { songId, keyShift } = (typeof item === 'object' && item !== null ? item : {}) as {
      songId?: unknown;
      keyShift?: unknown;
    };
    if (typeof songId !== 'string' || songId.length === 0 || songId.length > 64) {
      return { ok: false, error: 'invalid_song' };
    }
    if (keyShift !== undefined && (typeof keyShift !== 'number' || !Number.isInteger(keyShift))) {
      return { ok: false, error: 'invalid_key_shift' };
    }
    parsed.push({ songId, keyShift: mod12(keyShift ?? 0) });
  }
  return { ok: true, data: { name: cleanName, items: parsed } };
}
