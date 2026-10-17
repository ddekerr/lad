/** Налаштування генерації партій із середовища. */

export function anthropicApiKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key ? key : null;
}

/** Модель, що пише партії. Змінюється без правок коду. */
export function partModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-5-5';
}

/** Скільки генерацій на добу дозволено одному користувачеві (кожна коштує грошей). */
export function dailyGenerationLimit(): number {
  const value = Number(process.env.PART_GENERATIONS_PER_DAY);
  return Number.isInteger(value) && value > 0 ? value : 20;
}

/** Скільки разів просимо модель виправити відповідь, що не пройшла перевірку. */
export const MAX_GENERATION_ATTEMPTS = 3;
export const MODEL_TIMEOUT_MS = 100_000;
export const MODEL_MAX_TOKENS = 16_000;
