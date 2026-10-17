/**
 * Табулатура партії для чотириструнного баса (чиста логіка): транспонування нот,
 * розкладка по струнах і ладах, позиції акордів. Малює це `PartTab`.
 */
import { shouldPreferFlats, transposeChord } from '@/shared/lib/chords';
import { beatsPerBar } from '@/shared/lib/bars';
import { BASS_MAX_MIDI, BASS_MIN_MIDI, pitchToMidi, type PartData } from './part';

/** Струни зверху вниз, як у табулатурі: G D A E. */
export const BASS_STRINGS = [
  { name: 'G', open: 43 },
  { name: 'D', open: 38 },
  { name: 'A', open: 33 },
  { name: 'E', open: 28 },
] as const;
export const MAX_FRET = 24;

export type TabPosition = { string: number; fret: number };

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/**
 * На скільки півтонів зсунути партію, щоб вона відповідала поточному зсуву копії (0..11).
 * Партія записана для зсуву `generatedShift`.
 */
export function partDelta(currentShift: number, generatedShift: number | undefined): number {
  return mod12(currentShift - (generatedShift ?? 0));
}

/**
 * Транспонує ноти (MIDI) на `semitones`, лишаючи їх у діапазоні баса.
 * Вибирає найближчий до нуля зсув з тих, що кратні октаві від заданого, і вся партія рухається разом.
 * Якщо жоден не вміщає все, окремі ноти, що вилізли, переносяться на октаву в діапазон.
 */
export function transposeMidis(midis: readonly number[], semitones: number): number[] {
  if (midis.length === 0) return [];
  const base = mod12(semitones);
  const candidates = [base - 12, base, base + 12].sort((a, b) => Math.abs(a) - Math.abs(b));
  const fits = (d: number) => midis.every((m) => m + d >= BASS_MIN_MIDI && m + d <= BASS_MAX_MIDI);
  const chosen = candidates.find(fits);
  if (chosen !== undefined) return midis.map((m) => m + chosen);

  return midis.map((m) => {
    let value = m + candidates[0];
    while (value > BASS_MAX_MIDI) value -= 12;
    while (value < BASS_MIN_MIDI) value += 12;
    return value;
  });
}

function positionsFor(midi: number): TabPosition[] {
  const list: TabPosition[] = [];
  BASS_STRINGS.forEach((string, index) => {
    const fret = midi - string.open;
    if (fret >= 0 && fret <= MAX_FRET) list.push({ string: index, fret });
  });
  return list;
}

function nodeCost(position: TabPosition): number {
  // Відкрита струна найзручніша; далі вищі лади дорожчі, а понад 12-й різко.
  if (position.fret === 0) return 0;
  return 0.4 + (position.fret > 12 ? (position.fret - 12) * 1.5 : position.fret * 0.05);
}

function moveCost(from: TabPosition, to: TabPosition): number {
  const stringChange = from.string === to.string ? 0 : 0.3;
  // Відкрита струна не вимагає переносу руки.
  if (from.fret === 0 || to.fret === 0) return stringChange;
  return Math.abs(from.fret - to.fret) + stringChange;
}

/**
 * Розкладає ноти по струнах і ладах так, щоб рука рухалася якнайменше:
 * динамічне програмування за всією послідовністю. Нота поза діапазоном дає null.
 */
export function assignTab(midis: readonly number[]): (TabPosition | null)[] {
  const options = midis.map(positionsFor);
  const result: (TabPosition | null)[] = midis.map(() => null);
  let start = 0;

  while (start < midis.length) {
    if (options[start].length === 0) {
      start += 1;
      continue;
    }
    let end = start;
    while (end < midis.length && options[end].length > 0) end += 1;

    const cost: number[][] = [];
    const back: number[][] = [];
    for (let i = start; i < end; i += 1) {
      const row: number[] = [];
      const from: number[] = [];
      options[i].forEach((position) => {
        if (i === start) {
          row.push(nodeCost(position));
          from.push(-1);
          return;
        }
        let best = Infinity;
        let bestIndex = 0;
        options[i - 1].forEach((previous, k) => {
          const value = cost[i - 1 - start][k] + moveCost(previous, position);
          if (value < best) {
            best = value;
            bestIndex = k;
          }
        });
        row.push(best + nodeCost(position));
        from.push(bestIndex);
      });
      cost.push(row);
      back.push(from);
    }

    let index = cost[cost.length - 1].reduce((best, value, k, all) => (value < all[best] ? k : best), 0);
    for (let i = end - 1; i >= start; i -= 1) {
      result[i] = options[i][index];
      index = back[i - start][index];
    }
    start = end;
  }
  return result;
}

export type TabNote = { beat: number; length: number; string: number; fret: number };
export type TabChord = { beat: number; name: string };
export type TabBar = {
  bar: number;
  section: string | null;
  /** true, якщо це перший такт розділу: перед ним малюється заголовок */
  sectionStart: boolean;
  chords: TabChord[];
  notes: TabNote[];
};
export type PartTabModel = { beats: number; bars: TabBar[] };

function fallbackBeats(data: PartData): number {
  let max = 4;
  for (const bar of data.bars)
    for (const note of bar.notes) max = Math.max(max, Math.ceil(note.beat + note.length - 1));
  return max;
}

/**
 * Готує табулатуру для показу в тональності «оригінал + currentShift».
 * Ноти й акорди переносяться від зсуву, у якому партію згенеровано.
 */
export function buildPartTab(data: PartData, originalKey: string, currentShift: number): PartTabModel {
  const beats = (data.timeSignature ? beatsPerBar(data.timeSignature) : null) ?? fallbackBeats(data);
  const delta = partDelta(currentShift, data.shift);
  const flats = shouldPreferFlats(originalKey, currentShift);

  const flat = data.bars.flatMap((bar) => bar.notes);
  const midis = flat.map((note) => pitchToMidi(note.pitch) ?? BASS_MIN_MIDI);
  const moved = transposeMidis(midis, delta);
  const positions = assignTab(moved);

  let cursor = 0;
  let previousSection: string | null = null;
  const bars = data.bars.map((bar): TabBar => {
    const notes: TabNote[] = [];
    for (const note of bar.notes) {
      const position = positions[cursor];
      cursor += 1;
      if (position) notes.push({ beat: note.beat, length: note.length, string: position.string, fret: position.fret });
    }
    const segment = bar.chords.length > 0 ? beats / bar.chords.length : beats;
    const section = bar.section ?? null;
    const sectionStart = section !== null && section !== previousSection;
    previousSection = section ?? previousSection;
    return {
      bar: bar.bar,
      section,
      sectionStart,
      chords: bar.chords.map((chord, k) => ({ beat: 1 + k * segment, name: transposeChord(chord, delta, flats) })),
      notes,
    };
  });

  return { beats, bars };
}
