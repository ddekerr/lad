/**
 * Партія для інструмента (зараз бас): тип даних і перевірка того, що повернула модель.
 * Чиста логіка. Перевірка суворіша за схему JSON: ноти мають вкладатися в такти, не накладатися,
 * лежати в діапазоні баса, а кожен акорд такту має отримати свою ноту (основу чи бас акорда).
 */
import { chordBassPitchClass } from '@/shared/lib/chords';
import { beatsPerBar, type Bar } from '@/shared/lib/bars';

export const PART_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type PartDifficulty = (typeof PART_DIFFICULTIES)[number];

export function parseDifficulty(value: unknown): PartDifficulty | null {
  return typeof value === 'string' && (PART_DIFFICULTIES as readonly string[]).includes(value)
    ? (value as PartDifficulty)
    : null;
}

/** Діапазон чотириструнного баса: E1 (MIDI 28) .. G4 (MIDI 67). */
export const BASS_MIN_MIDI = 28;
export const BASS_MAX_MIDI = 67;
/** Найдрібніша частка долі, на яку вирівняно початок і довжину нот. */
export const BEAT_GRID = 0.25;
export const MAX_NOTES_PER_BAR = 32;

export type PartNote = {
  /** Початок ноти в такті: 1 це перша доля, дробові значення кратні 0.25 */
  beat: number;
  /** Тривалість у долях, кратна 0.25 */
  length: number;
  /** Висота науковою нотацією: E1, F#2, Bb1 */
  pitch: string;
};

export type PartBar = {
  bar: number;
  /** Акорди такту (для показу); при збереженні їх додає сервер */
  chords: string[];
  notes: PartNote[];
};

export type PartData = { bars: PartBar[] };

/** Партія для показу: дані, чи вона ще відповідає копії, і коли оновлена. */
export type PartView = {
  difficulty: PartDifficulty;
  data: PartData;
  stale: boolean;
  updatedAt: string;
};

const PITCH_RE = /^([A-G])(#|b)?(-?\d)$/;
const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** MIDI-номер висоти («A1» це 33) або null. */
export function pitchToMidi(pitch: string): number | null {
  const match = PITCH_RE.exec(pitch);
  if (!match) return null;
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  return 12 * (Number(match[3]) + 1) + LETTER_PC[match[1]] + accidental;
}

function onGrid(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value / BEAT_GRID - Math.round(value / BEAT_GRID)) < 1e-9;
}

export type PartValidation = { ok: true; notes: PartNote[][] } | { ok: false; problems: string[] };

const MAX_PROBLEMS = 12;

/**
 * Перевіряє відповідь моделі проти тактів пісні. Повертає або нормалізовані ноти по тактах
 * (відсортовані за початком), або перелік проблем англійською: його читає модель під час повтору.
 */
export function validatePart(raw: unknown, bars: readonly Bar[], signature: string): PartValidation {
  const beats = beatsPerBar(signature);
  if (beats === null) return { ok: false, problems: [`Unsupported time signature ${signature}.`] };

  const problems: string[] = [];
  const add = (text: string) => {
    if (problems.length < MAX_PROBLEMS) problems.push(text);
  };

  const list = typeof raw === 'object' && raw !== null ? (raw as { bars?: unknown }).bars : undefined;
  if (!Array.isArray(list)) return { ok: false, problems: ['The result must be an object with a "bars" array.'] };
  if (list.length !== bars.length) {
    return {
      ok: false,
      problems: [`Expected ${bars.length} bars, got ${list.length}. Return exactly one entry per bar.`],
    };
  }

  const result: PartNote[][] = [];
  bars.forEach((bar, i) => {
    const entry = list[i] as { bar?: unknown; notes?: unknown } | null;
    const label = `Bar ${bar.index}`;
    if (typeof entry !== 'object' || entry === null || entry.bar !== bar.index) {
      add(`${label}: entry ${i + 1} must have "bar": ${bar.index}, in order.`);
      result.push([]);
      return;
    }
    if (!Array.isArray(entry.notes) || entry.notes.length === 0) {
      add(`${label}: needs at least one note.`);
      result.push([]);
      return;
    }
    if (entry.notes.length > MAX_NOTES_PER_BAR) {
      add(`${label}: more than ${MAX_NOTES_PER_BAR} notes.`);
      result.push([]);
      return;
    }

    const notes: PartNote[] = [];
    entry.notes.forEach((item: unknown, n: number) => {
      const note = item as Partial<PartNote> | null;
      const where = `${label}, note ${n + 1}`;
      if (typeof note !== 'object' || note === null) return add(`${where}: must be an object.`);
      const { beat, length, pitch } = note;
      if (typeof beat !== 'number' || !onGrid(beat) || beat < 1 || beat >= beats + 1) {
        return add(`${where}: "beat" must be a multiple of ${BEAT_GRID} from 1 to ${beats + 1 - BEAT_GRID}.`);
      }
      if (typeof length !== 'number' || !onGrid(length) || length <= 0) {
        return add(`${where}: "length" must be a positive multiple of ${BEAT_GRID}.`);
      }
      if (beat + length > beats + 1 + 1e-9) {
        return add(`${where}: ends after the bar (beat ${beat} + length ${length} > ${beats + 1}).`);
      }
      const midi = typeof pitch === 'string' ? pitchToMidi(pitch) : null;
      if (midi === null) return add(`${where}: "pitch" must look like E1, F#2 or Bb1.`);
      if (midi < BASS_MIN_MIDI || midi > BASS_MAX_MIDI) {
        return add(`${where}: pitch ${pitch} is outside the bass range E1..G4.`);
      }
      notes.push({ beat, length, pitch: pitch as string });
    });

    notes.sort((a, b) => a.beat - b.beat);
    for (let k = 1; k < notes.length; k += 1) {
      if (notes[k].beat < notes[k - 1].beat + notes[k - 1].length - 1e-9) {
        add(`${label}: notes overlap at beat ${notes[k].beat}. The bass plays one note at a time.`);
        break;
      }
    }

    // Кожен акорд такту ділить його порівну й має отримати ноту з основою (чи басом) цього акорда.
    const segment = beats / bar.chords.length;
    bar.chords.forEach((chord, k) => {
      const wanted = chordBassPitchClass(chord);
      if (wanted === null) return;
      const from = 1 + k * segment;
      const to = from + segment;
      const hit = notes.some((note) => {
        const midi = pitchToMidi(note.pitch);
        return note.beat >= from - 1e-9 && note.beat < to - 1e-9 && midi !== null && midi % 12 === wanted;
      });
      if (!hit) add(`${label}: chord ${chord} (beats ${from} to ${to}) needs a note on its root or slash bass.`);
    });

    result.push(notes);
  });

  return problems.length > 0 ? { ok: false, problems } : { ok: true, notes: result };
}
