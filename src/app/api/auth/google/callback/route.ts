import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { OAUTH_STATE_COOKIE, appUrl, googleConfig } from '@/server/auth/config';
import { normalizeEmail } from '@/server/auth/crypto';
import { createSession, setSessionCookie } from '@/server/auth/session';
import { findOrCreateUser } from '@/server/auth/users';
import { LOCALE_COOKIE } from '@/shared/i18n';

export const dynamic = 'force-dynamic';

const fail = (reason: string) => NextResponse.redirect(`${appUrl()}/sign-in?error=${reason}`);

/** GET /api/auth/google/callback: завершення входу через Google. */
export async function GET(request: Request) {
  const config = googleConfig();
  if (!config) return fail('google_not_configured');

  const params = new URL(request.url).searchParams;
  const code = params.get('code');
  const state = params.get('state');

  const store = await cookies();
  const expectedState = store.get(OAUTH_STATE_COOKIE)?.value;
  store.delete(OAUTH_STATE_COOKIE);
  if (!code || !state || !expectedState || state !== expectedState) {
    return fail('google_failed');
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: `${appUrl()}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) return fail('google_failed');
    const { access_token: accessToken } = (await tokenResponse.json()) as {
      access_token?: string;
    };
    if (!accessToken) return fail('google_failed');

    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!profileResponse.ok) return fail('google_failed');
    const profile = (await profileResponse.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
    };

    const email = normalizeEmail(profile.email);
    if (!profile.sub || !email || profile.email_verified !== true) {
      return fail('google_failed');
    }

    const user = await findOrCreateUser(email, 'google', profile.sub);
    const session = await createSession(user.id, (await headers()).get('user-agent'));
    await setSessionCookie(session.token, session.expiresAt);
    store.set(LOCALE_COOKIE, user.language, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });

    return NextResponse.redirect(`${appUrl()}/`);
  } catch {
    return fail('google_failed');
  }
}
