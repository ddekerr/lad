/** Налаштування автентифікації з середовища. Значення беремо лише тут. */

export const SESSION_COOKIE = 'lad_session';
export const OAUTH_STATE_COOKIE = 'lad_oauth_state';

/** Сесія (refresh-токен) діє 1 місяць. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Код із листа діє 10 хвилин. */
export const CODE_TTL_MS = 10 * 60 * 1000;
/** Спроб введення одного коду. */
export const CODE_MAX_ATTEMPTS = 5;
/** Скільки кодів можна запитати для одного email за вікно. */
export const CODE_REQUESTS_PER_WINDOW = 5;
export const CODE_REQUEST_WINDOW_MS = 15 * 60 * 1000;

export function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET must be set (at least 16 characters) in production');
  }
  return 'dev-only-insecure-secret-change-me';
}

export function appUrl(): string {
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function superAdminEmails(): string | undefined {
  return process.env.SUPER_ADMIN_EMAIL;
}

export function googleConfig(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export const isProduction = process.env.NODE_ENV === 'production';
