import { NextResponse } from 'next/server';
import { parseSetlistInput } from '@/entities/setlist';
import { requireSetlistUser } from '@/server/auth/api';
import { badRequest } from '@/server/auth/guard';
import { listSetlists, saveSetlist } from '@/server/setlists';

export const dynamic = 'force-dynamic';

/** GET /api/setlists: усі сетлісти (спільні для всіх авторизованих). */
export async function GET() {
  const auth = await requireSetlistUser();
  if ('response' in auth) return auth.response;

  const setlists = await listSetlists();
  return NextResponse.json({
    setlists: setlists.map((s) => ({
      id: s.id,
      name: s.name,
      songCount: s._count.items,
      updatedAt: s.updatedAt.toISOString(),
    })),
  });
}

/** POST /api/setlists {name, items:[{songId, keyShift}]}: створити сетліст. */
export async function POST(request: Request) {
  const auth = await requireSetlistUser();
  if ('response' in auth) return auth.response;

  const parsed = parseSetlistInput(await request.json().catch(() => null));
  if (!parsed.ok) return badRequest(parsed.error);

  const result = await saveSetlist(null, auth.user.id, parsed.data);
  if (!result.ok) return badRequest(result.reason);
  return NextResponse.json({ setlist: { id: result.id } }, { status: 201 });
}
