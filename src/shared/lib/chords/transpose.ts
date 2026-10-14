/**
 * Транспонування акордів і тональностей. Нотація англійська літерна (C D E F G A B).
 * Акорд розбирається на основну ноту, якість (m, 7, sus тощо) і бас після скісної
 * риски (C/E). Невпізнаний акорд повертається без змін.
 */

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const LETTER_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Тональності, які записують із бемолями (за індексом ноти). */
const MAJOR_FLAT_KEYS = new Set([5, 10, 3, 8, 1]); // F Bb Eb Ab Db (шостий півтон пишемо як F#, а не Gb)
const MINOR_FLAT_KEYS = new Set([2, 7, 0, 5, 10, 3]); // Dm Gm Cm Fm Bbm Ebm

const CHORD_RE = /^([A-G])([#b]?)([^/]*)(?:\/([A-G])([#b]?))?$/;
const QUALITY_RE = /^(?:maj|min|dim|aug|sus|add|m|M|[0-9]|#|b|\+|-|°|ø|\(|\)|,)*$/;
const KEY_RE = /^([A-G])([#b]?)(m|min)?$/;

function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

function noteIndex(letter: string, accidental: string): number {
  let index = LETTER_INDEX[letter];
  if (accidental === '#') index += 1;
  if (accidental === 'b') index -= 1;
  return mod12(index);
}

function noteName(index: number, preferFlats: boolean): string {
  return (preferFlats ? FLAT_NAMES : SHARP_NAMES)[mod12(index)];
}

export type ParsedKey = { index: number; minor: boolean };

/** Розбирає тональність («G», «Am», «Bb», «F#m»). Невпізнану повертає null. */
export function parseKey(key: string): ParsedKey | null {
  const match = KEY_RE.exec(key.trim());
  if (!match) return null;
  return { index: noteIndex(match[1], match[2]), minor: Boolean(match[3]) };
}

/** Чи записується тональність із бемолями (інакше з дієзами). */
export function keyUsesFlats(key: ParsedKey): boolean {
  return (key.minor ? MINOR_FLAT_KEYS : MAJOR_FLAT_KEYS).has(key.index);
}

/** Транспонує тональність; невпізнану повертає без змін. */
export function transposeKey(key: string, semitones: number): string {
  const parsed = parseKey(key);
  if (!parsed) return key;
  const index = mod12(parsed.index + semitones);
  const flats = keyUsesFlats({ index, minor: parsed.minor });
  return noteName(index, flats) + (parsed.minor ? 'm' : '');
}

/**
 * Чи треба писати акорди з бемолями після зсуву. Рішення залежить від цільової
 * тональності; якщо тональності немає чи вона невпізнана, дієзи.
 */
export function shouldPreferFlats(originalKey: string, semitones: number): boolean {
  const parsed = parseKey(originalKey);
  if (!parsed) return false;
  return keyUsesFlats({ index: mod12(parsed.index + semitones), minor: parsed.minor });
}

/** Транспонує один акорд на кількість півтонів. */
export function transposeChord(chord: string, semitones: number, preferFlats = false): string {
  const match = CHORD_RE.exec(chord.trim());
  if (!match) return chord;
  const [, rootLetter, rootAccidental, quality, bassLetter, bassAccidental] = match;
  if (!QUALITY_RE.test(quality)) return chord;

  const root = noteName(noteIndex(rootLetter, rootAccidental) + semitones, preferFlats);
  const bass = bassLetter ? '/' + noteName(noteIndex(bassLetter, bassAccidental) + semitones, preferFlats) : '';
  return root + quality + bass;
}
