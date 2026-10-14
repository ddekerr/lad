import { NextResponse } from 'next/server';
import { appUrl } from '@/server/auth/config';
import { revokeCurrentSession } from '@/server/auth/session';

export const dynamic = 'force-dynamic';

/** POST /api/auth/logout: відкликає токен сесії й повертає на головну. */
export async function POST() {
  await revokeCurrentSession();
  return NextResponse.redirect(`${appUrl()}/`, { status: 303 });
}
