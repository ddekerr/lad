export type LoginCodeState = 'invalid' | 'expired' | 'too_many_attempts' | 'open';

/** Чи можна ще перевіряти останній код: він є, не прострочений і не вичерпав спроби. */
export function loginCodeState(
  latest: { expiresAt: Date; attempts: number } | null,
  now: Date,
  maxAttempts: number,
): LoginCodeState {
  if (!latest) return 'invalid';
  if (latest.expiresAt.getTime() <= now.getTime()) return 'expired';
  if (latest.attempts >= maxAttempts) return 'too_many_attempts';
  return 'open';
}
