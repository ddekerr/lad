/**
 * Параметри копії для генерації партій (чиста логіка): темп, розмір і динаміка розділів.
 * Усі необов'язкові: пісню можна читати без них, а генерація без них повертає перелік відсутнього.
 */
import { listSections } from '@/shared/lib/sections';

export const MIN_BPM = 30;
export const MAX_BPM = 300;
export const MIN_DYNAMICS = 1;
export const MAX_DYNAMICS = 5;
export const MAX_DYNAMICS_ENTRIES = 50;
export const MAX_SECTION_ID = 60;

/** Розміри, які підтримує генератор. Верхнє число це кількість долей у такті, нижнє це тривалість долі. */
export const TIME_SIGNATURES = ['2/4', '3/4', '4/4', '5/4', '6/8', '9/8', '12/8'] as const;
export type TimeSignature = (typeof TIME_SIGNATURES)[number];

export type SectionDynamics = Record<string, number>;

export function parseBpm(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_BPM && value <= MAX_BPM ? value : null;
}

export function parseTimeSignature(value: unknown): TimeSignature | null {
  return typeof value === 'string' && (TIME_SIGNATURES as readonly string[]).includes(value)
    ? (value as TimeSignature)
    : null;
}

/** Перевіряє тіло запиту: звичайний об'єкт «id розділу → ціле 1..5». Хибне повертає null. */
export function parseDynamics(value: unknown): SectionDynamics | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > MAX_DYNAMICS_ENTRIES) return null;

  const result: SectionDynamics = Object.create(null) as SectionDynamics;
  for (const [id, level] of entries) {
    const valid =
      id !== '__proto__' &&
      id.length >= 1 &&
      id.length <= MAX_SECTION_ID &&
      typeof level === 'number' &&
      Number.isInteger(level) &&
      level >= MIN_DYNAMICS &&
      level <= MAX_DYNAMICS;
    if (!valid) return null;
    result[id] = level;
  }
  return { ...result };
}

/** Читає значення з бази (Json): усе, що не схоже на динаміку, відкидається. */
export function readDynamics(value: unknown): SectionDynamics {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const result: SectionDynamics = {};
  for (const [id, level] of Object.entries(value)) {
    if (typeof level === 'number' && Number.isInteger(level) && level >= MIN_DYNAMICS && level <= MAX_DYNAMICS) {
      result[id] = level;
    }
  }
  return result;
}

export type MissingParameters = {
  bpm: boolean;
  timeSignature: boolean;
  /** Ідентифікатори розділів тексту без динаміки */
  sections: string[];
  /** true, якщо нічого не бракує */
  complete: boolean;
};

/**
 * Чого не вистачає для генерації партії. Тональність уже є в копії. Динаміка потрібна
 * для кожного розділу, що є в тексті зараз; записи про розділи, яких уже немає, ігноруються.
 */
export function missingParameters(copy: {
  body: string;
  bpm: number | null;
  timeSignature: string | null;
  sectionDynamics: SectionDynamics;
}): MissingParameters {
  const bpm = copy.bpm === null;
  const timeSignature = copy.timeSignature === null;
  const sections = listSections(copy.body)
    .filter((section) => copy.sectionDynamics[section.id] === undefined)
    .map((section) => section.id);
  return { bpm, timeSignature, sections, complete: !bpm && !timeSignature && sections.length === 0 };
}
