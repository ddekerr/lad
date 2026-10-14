/** Перевірка введення редактора пісень і правила підвищення версії (чиста логіка). */
import { parseKey } from '@/shared/lib/chords';

export const MAX_SONG_TITLE = 200;
export const MAX_SONG_BODY = 50_000;

export type SongInput = {
  title: string;
  artist: string;
  language: 'en' | 'uk';
  originalKey: string;
  body: string;
};

export type SongInputResult = { ok: true; data: SongInput } | { ok: false; error: string };

/** Усі п'ять полів обов'язкові (і для створення, і для повної заміни при редагуванні). */
export function parseSongInput(input: unknown): SongInputResult {
  if (typeof input !== 'object' || input === null) return { ok: false, error: 'invalid_body' };
  const raw = input as Record<string, unknown>;

  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title || title.length > MAX_SONG_TITLE) return { ok: false, error: 'invalid_title' };

  const artist = typeof raw.artist === 'string' ? raw.artist.trim() : '';
  if (!artist || artist.length > MAX_SONG_TITLE) return { ok: false, error: 'invalid_artist' };

  if (raw.language !== 'en' && raw.language !== 'uk') return { ok: false, error: 'invalid_language' };

  const key = typeof raw.originalKey === 'string' ? raw.originalKey.trim() : '';
  if (!parseKey(key)) return { ok: false, error: 'invalid_key' };

  const body = typeof raw.body === 'string' ? raw.body.replace(/\r\n?/g, '\n') : '';
  if (!body.trim() || body.length > MAX_SONG_BODY) return { ok: false, error: 'invalid_body' };

  return { ok: true, data: { title, artist, language: raw.language, originalKey: key, body } };
}

/** Версія зростає лише коли змінився вміст, який бачать копії. */
export function contentChanged(before: SongInput, after: SongInput): boolean {
  return (
    before.title !== after.title ||
    before.artist !== after.artist ||
    before.language !== after.language ||
    before.originalKey !== after.originalKey ||
    before.body !== after.body
  );
}
