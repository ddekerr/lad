/**
 * Генерація партії ШІ-агентом: просимо модель, перевіряємо відповідь суворим валідатором,
 * а якщо вона не пройшла, повертаємо моделі список проблем і просимо виправити (до кількох спроб).
 * Клієнт моделі передається ззовні, тож логіку можна перевірити без мережі.
 */
import {
  buildPrompt,
  buildRetryMessage,
  validatePart,
  type GenerationInput,
  type PartData,
} from '@/entities/song-copy';
import type { Bar } from '@/shared/lib/bars';

export type ModelMessage = { role: 'user' | 'assistant'; content: string };
export type ModelRequest = { system: string; messages: ModelMessage[] };
/** Повертає сирий вміст виклику інструмента: те, що модель здала як партію. */
export type ModelClient = (request: ModelRequest) => Promise<unknown>;

/** Модель недосяжна або відповіла не за протоколом: помилка не залежить від змісту партії. */
export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

export type GenerateResult =
  | { ok: true; data: PartData; attempts: number }
  | { ok: false; error: 'invalid_output'; problems: string[]; attempts: number };

const MAX_ECHO_CHARS = 20_000;

function asBars(input: GenerationInput): Bar[] {
  return input.bars.map((bar) => ({
    index: bar.bar,
    section: bar.section,
    line: 0,
    chords: bar.chords,
    held: false,
  }));
}

export async function generateBassPart(
  input: GenerationInput,
  client: ModelClient,
  maxAttempts: number,
): Promise<GenerateResult> {
  const { system, user } = buildPrompt(input);
  const messages: ModelMessage[] = [{ role: 'user', content: user }];
  const bars = asBars(input);
  let problems: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const raw = await client({ system, messages });
    const result = validatePart(raw, bars, input.timeSignature);

    if (result.ok) {
      const data: PartData = {
        timeSignature: input.timeSignature,
        shift: input.shift,
        bars: input.bars.map((bar, i) => ({
          bar: bar.bar,
          section: bar.section,
          chords: bar.chords,
          notes: result.notes[i],
        })),
      };
      return { ok: true, data, attempts: attempt };
    }

    problems = result.problems;
    messages.push(
      { role: 'assistant', content: (JSON.stringify(raw) ?? 'null').slice(0, MAX_ECHO_CHARS) },
      { role: 'user', content: buildRetryMessage(problems) },
    );
  }

  return { ok: false, error: 'invalid_output', problems, attempts: maxAttempts };
}
