import { normalizeEmail } from './crypto';

export type GoogleProfile = { sub?: string; email?: string; email_verified?: boolean };

/** Код із відповіді Google, якщо state збігається з тим, що ми поклали в cookie. Інакше null. */
export function callbackCode(params: URLSearchParams, expectedState: string | undefined): string | null {
  const code = params.get('code');
  const state = params.get('state');
  return code && state && expectedState && state === expectedState ? code : null;
}

/** Профіль Google, якому можна довіряти: є sub, коректна й підтверджена пошта. */
export function verifiedGoogleProfile(profile: GoogleProfile): { sub: string; email: string } | null {
  const email = normalizeEmail(profile.email);
  if (!profile.sub || !email || profile.email_verified !== true) return null;
  return { sub: profile.sub, email };
}
