/**
 * Імпорт пісень із файлу (чиста логіка, без БД).
 *
 * Дві незалежні частини, щоб пізніше додавати інші формати:
 *  1. розбір документа у список «сирих» пісень (для кожного формату свій, зараз лише JSON);
 *  2. перевірка цього списку (спільна для всіх форматів): зайві поля відкидаються,
 *     відсутні необов'язкові отримують значення за замовчуванням, відсутні обов'язкові дають помилку.
 *
 * Формат JSON:
 *   { "songs": [ { "title": "...", "artist": "...", "language": "uk", "originalKey": "Am", "body": "[Am]..." } ] }
 * Інші ключі верхнього рівня й інші поля пісень ігноруються.
 */
import { parseFields, SONG_FIELDS, type FieldIssue, type SongInput } from './song-input';

export const MAX_IMPORT_SONGS = 500;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
/** Скільки пісень із помилками показуємо у звіті (загальну кількість віддаємо окремо). */
export const MAX_REPORTED_ERRORS = 50;
/** Скільки назв ігнорованих полів повертаємо. */
export const MAX_IGNORED_FIELDS = 20;

export type ImportFileError = 'invalid_json' | 'invalid_format' | 'no_songs' | 'too_many_songs';

export type ImportDocumentResult = { ok: true; items: unknown[] } | { ok: false; error: ImportFileError };

/** Розбирає текст JSON-файлу у список пісень. Вміст пісень тут не перевіряється. */
export function parseSongsJson(text: string): ImportDocumentResult {
  let document: unknown;
  try {
    // Блокнот Windows додає на початок файлу BOM: JSON.parse його не приймає
    document = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return { ok: false, error: 'invalid_json' };
  }

  if (typeof document !== 'object' || document === null || Array.isArray(document)) {
    return { ok: false, error: 'invalid_format' };
  }
  const songs = Object.hasOwn(document, 'songs') ? (document as Record<string, unknown>).songs : undefined;
  if (!Array.isArray(songs)) return { ok: false, error: 'invalid_format' };
  if (songs.length === 0) return { ok: false, error: 'no_songs' };
  if (songs.length > MAX_IMPORT_SONGS) return { ok: false, error: 'too_many_songs' };

  return { ok: true, items: songs };
}

export type ImportIssue = FieldIssue<keyof SongInput> | { field: null; code: 'not_an_object' };

/** Проблеми однієї пісні. index: номер пісні у файлі, з одиниці. */
export type ImportItemError = { index: number; title: string | null; issues: ImportIssue[] };

export type SongImportResult =
  | { ok: true; songs: SongInput[]; ignoredFields: string[] }
  | { ok: false; items: ImportItemError[]; total: number };

const KNOWN_FIELDS = new Set(Object.keys(SONG_FIELDS));

function titleHint(raw: Record<string, unknown>): string | null {
  const title = Object.hasOwn(raw, 'title') && typeof raw.title === 'string' ? raw.title.trim() : '';
  return title ? title.slice(0, 80) : null;
}

/**
 * Перевіряє список пісень. Усе або нічого: якщо хоч одна пісня не пройшла перевірку,
 * повертається звіт і зберігати не слід нічого (тоді повторне завантаження виправленого файлу не дублює пісні).
 */
export function validateImportedSongs(items: readonly unknown[]): SongImportResult {
  const songs: SongInput[] = [];
  const errors: ImportItemError[] = [];
  const ignored = new Set<string>();

  items.forEach((item, position) => {
    const index = position + 1;

    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      errors.push({ index, title: null, issues: [{ field: null, code: 'not_an_object' }] });
      return;
    }

    const raw = item as Record<string, unknown>;
    for (const key of Object.keys(raw)) {
      if (!KNOWN_FIELDS.has(key)) ignored.add(key);
    }

    const result = parseFields(SONG_FIELDS, raw);
    if (result.ok) songs.push(result.data);
    else errors.push({ index, title: titleHint(raw), issues: result.issues });
  });

  if (errors.length > 0) {
    return { ok: false, items: errors.slice(0, MAX_REPORTED_ERRORS), total: errors.length };
  }
  const ignoredFields = [...ignored].slice(0, MAX_IGNORED_FIELDS).map((name) => name.slice(0, 50));
  return { ok: true, songs, ignoredFields };
}
