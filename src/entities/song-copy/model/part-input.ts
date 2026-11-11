/**
 * Вхід для генерації партії й запит до моделі (чиста логіка).
 * Моделі передаються лише такти, акорди, розділи, темп, розмір і динаміка: тексту пісні вона не отримує.
 */
import { parseBars, validateBars, type BarIssue } from '@/shared/lib/bars';
import { shouldPreferFlats, transposeChord, transposeKey } from '@/shared/lib/chords';
import { missingParameters, type MissingParameters, type SectionDynamics } from './copy-parameters';
import type { PartDifficulty } from './part';

/** Збільшуй при зміні запиту: так видно, якою версією правил зроблено партію. */
export const PART_PROMPT_VERSION = 1;
/** Більше тактів за один запит модель надійно не опише. */
export const MAX_PART_BARS = 128;

export type GenerationBar = {
  bar: number;
  /** Ідентифікатор розділу */
  section: string;
  /** Динаміка розділу, 1..5 */
  dynamics: number;
  /** Акорди такту в тональності, яку грає музикант (з урахуванням зсуву) */
  chords: string[];
};

export type GenerationInput = {
  instrument: 'bass';
  difficulty: PartDifficulty;
  key: string;
  /** Зсув копії, з яким зроблено вхід (у запит до моделі не йде) */
  shift: number;
  timeSignature: string;
  beatsPerBar: number;
  bpm: number;
  bars: GenerationBar[];
};

export type BuildInputResult =
  | { ok: true; input: GenerationInput }
  | { ok: false; reason: 'missing_parameters'; missing: MissingParameters; barIssues: BarIssue[] }
  | { ok: false; reason: 'no_bars' }
  | { ok: false; reason: 'too_many_bars'; count: number };

type CopyForParts = {
  body: string;
  originalKey: string;
  keyShift: number;
  bpm: number | null;
  timeSignature: string | null;
  sectionDynamics: SectionDynamics;
};

/** Збирає вхід для генерації або каже, чого бракує. Партія робиться в тональності, яку музикант грає (оригінал + зсув). */
export function buildGenerationInput(copy: CopyForParts, difficulty: PartDifficulty): BuildInputResult {
  const missing = missingParameters(copy);
  const { bars } = parseBars(copy.body);
  const barIssues = copy.timeSignature ? (validateBars(bars, copy.timeSignature) ?? []) : [];

  if (!missing.complete || barIssues.length > 0) return { ok: false, reason: 'missing_parameters', missing, barIssues };
  if (bars.length === 0) return { ok: false, reason: 'no_bars' };
  if (bars.length > MAX_PART_BARS) return { ok: false, reason: 'too_many_bars', count: bars.length };

  const signature = copy.timeSignature as string;
  const flats = shouldPreferFlats(copy.originalKey, copy.keyShift);
  return {
    ok: true,
    input: {
      instrument: 'bass',
      difficulty,
      key: transposeKey(copy.originalKey, copy.keyShift),
      shift: copy.keyShift,
      timeSignature: signature,
      beatsPerBar: Number(signature.split('/')[0]),
      bpm: copy.bpm as number,
      bars: bars.map((bar) => ({
        bar: bar.index,
        section: bar.section,
        dynamics: copy.sectionDynamics[bar.section],
        chords: bar.chords.map((chord) => transposeChord(chord, copy.keyShift, flats)),
      })),
    },
  };
}

const DIFFICULTY_GUIDE: Record<PartDifficulty, string> = {
  easy:
    'EASY (beginner). Mostly root notes. Half notes, whole notes and plain quarter notes. Stay in the lower positions, ' +
    'no syncopation, no big leaps. At the top dynamics levels add repeated roots or simple root-fifth alternation, nothing more.',
  medium:
    'MEDIUM (intermediate). Roots, fifths and octaves, steady eighth-note patterns where the dynamics ask for it, ' +
    'simple passing notes into the next chord, light syncopation. Keep it playable at tempo for a club bassist.',
  hard:
    'HARD (advanced). Syncopated grooves, anticipations, walking or chromatic approach lines, sixteenth notes at high ' +
    'dynamics, short fills at the end of sections. Still musical and in the pocket: support the song, do not show off.',
};

export const PART_TOOL = {
  name: 'submit_bass_part',
  description: 'Submit the finished bass part: one entry per bar, in order.',
  input_schema: {
    type: 'object',
    properties: {
      bars: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            bar: { type: 'integer', description: 'Bar number, starting from 1, in order.' },
            notes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  beat: {
                    type: 'number',
                    description: 'Start inside the bar. 1 is the first beat. Multiples of 0.25.',
                  },
                  length: { type: 'number', description: 'Duration in beats. Multiples of 0.25.' },
                  pitch: { type: 'string', description: 'Scientific pitch notation, for example E1, F#2, Bb1.' },
                },
                required: ['beat', 'length', 'pitch'],
              },
            },
          },
          required: ['bar', 'notes'],
        },
      },
    },
    required: ['bars'],
  },
} as const;

/** Запит до моделі: системна інструкція й дані пісні. Текст англійською, бо так модель працює надійніше. */
export function buildPrompt(input: GenerationInput): { system: string; user: string } {
  const system = [
    'You are an experienced session bass player and arranger. You write bass guitar parts for songs from chord charts.',
    '',
    'Rules for the part:',
    `- Instrument: 4-string bass guitar, standard tuning. Allowed pitches are E1 to G4 in scientific pitch notation (E1 is the lowest string, open). Prefer the range E1 to G3.`,
    `- The song has ${input.beatsPerBar} beats per bar (time signature ${input.timeSignature}). Beat 1 is the first beat of the bar. The "beat" of a note and its "length" are counted in these beats and must be multiples of 0.25. A note must not run past the end of the bar.`,
    '- The bass plays one note at a time: notes in a bar must not overlap. Gaps between notes are rests.',
    '- A bar with several chords is split equally between them. Each chord must get at least one note on its root (or on the slash bass, for chords like C/E) inside its own part of the bar.',
    '- Dynamics 1 to 5 belong to the section: 1 is very sparse and quiet (long notes, space), 3 is a steady supporting groove, 5 is the most energetic and busy the chosen difficulty allows. Follow the difficulty limits first, then the dynamics.',
    '- Keep the same feel inside a section, make repeats of the same chords similar, and mark section changes with a little variation.',
    '- Every bar must have at least one note.',
    '',
    `Difficulty: ${DIFFICULTY_GUIDE[input.difficulty]}`,
    '',
    'Answer only by calling the submit_bass_part tool with exactly one entry per bar, numbered as in the input.',
  ].join('\n');

  const user = [
    'Write the bass part for this song structure (chords only; there are no lyrics).',
    '',
    JSON.stringify(
      {
        key: input.key,
        timeSignature: input.timeSignature,
        bpm: input.bpm,
        difficulty: input.difficulty,
        bars: input.bars,
      },
      null,
      0,
    ),
  ].join('\n');

  return { system, user };
}

/** Повідомлення для повтору, коли відповідь не пройшла перевірку. */
export function buildRetryMessage(problems: readonly string[]): string {
  return [
    'The previous part was rejected by the validator. Fix every problem and submit the full part again with the tool:',
    ...problems.map((problem) => `- ${problem}`),
  ].join('\n');
}
