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

/** Опис одного поля: чи обов'язкове, як його перевірити й очистити, що підставити, якщо його немає. */
export type FieldSpec<T> = {
  required: boolean;
  /** Повертає очищене значення або null, якщо значення хибне. */
  parse: (value: unknown) => T | null;
  /** Значення для відсутнього необов'язкового поля. Без нього поле просто не потрапляє в результат. */
  defaultValue?: T;
};

export type FieldSpecs<S> = { [K in keyof S]-?: FieldSpec<S[K]> };

/** missing: поля немає (або null); invalid: значення є, але не проходить перевірку. */
export type FieldIssue<K extends string = string> = { field: K; code: 'missing' | 'invalid' };

export type FieldsResult<S> = { ok: true; data: S } | { ok: false; issues: FieldIssue<keyof S & string>[] };

/**
 * Збирає з об'єкта лише описані поля, решту відкидає. Відсутнє обов'язкове поле дає missing,
 * відсутнє необов'язкове отримує значення за замовчуванням (якщо воно є). Проблеми йдуть у порядку опису.
 */
export function parseFields<S extends object>(specs: FieldSpecs<S>, raw: Record<string, unknown>): FieldsResult<S> {
  const data: Record<string, unknown> = {};
  const issues: FieldIssue<keyof S & string>[] = [];

  for (const [key, spec] of Object.entries(specs) as [keyof S & string, FieldSpec<unknown>][]) {
    const value = Object.hasOwn(raw, key) ? raw[key] : undefined;

    if (value === undefined || value === null) {
      if (spec.required) issues.push({ field: key, code: 'missing' });
      else if (spec.defaultValue !== undefined) data[key] = spec.defaultValue;
      continue;
    }

    const parsed = spec.parse(value);
    if (parsed === null) issues.push({ field: key, code: 'invalid' });
    else data[key] = parsed;
  }

  return issues.length > 0 ? { ok: false, issues } : { ok: true, data: data as unknown as S };
}

function parseText(value: unknown, max: number): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text && text.length <= max ? text : null;
}

/** Поля пісні. Порядок важливий: у цьому порядку редактор повертає першу помилку. */
export const SONG_FIELDS: FieldSpecs<SongInput> = {
  title: { required: true, parse: (value) => parseText(value, MAX_SONG_TITLE) },
  artist: { required: true, parse: (value) => parseText(value, MAX_SONG_TITLE) },
  language: { required: true, parse: (value) => (value === 'en' || value === 'uk' ? value : null) },
  originalKey: {
    required: true,
    parse: (value) => {
      const key = typeof value === 'string' ? value.trim() : '';
      return parseKey(key) ? key : null;
    },
  },
  body: {
    required: true,
    parse: (value) => {
      const body = typeof value === 'string' ? value.replace(/\r\n?/g, '\n') : '';
      return body.trim() && body.length <= MAX_SONG_BODY ? body : null;
    },
  },
};

const FIELD_ERRORS: Record<keyof SongInput, string> = {
  title: 'invalid_title',
  artist: 'invalid_artist',
  language: 'invalid_language',
  originalKey: 'invalid_key',
  body: 'invalid_body',
};

/** Усі п'ять полів обов'язкові (і для створення, і для повної заміни при редагуванні). */
export function parseSongInput(input: unknown): SongInputResult {
  if (typeof input !== 'object' || input === null) return { ok: false, error: 'invalid_body' };

  const result = parseFields(SONG_FIELDS, input as Record<string, unknown>);
  if (!result.ok) return { ok: false, error: FIELD_ERRORS[result.issues[0].field] };
  return result;
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
