import { NextResponse } from 'next/server';
import { parseSetlistInput } from '@/entities/setlist';
import { requireSetlistUser } from '@/server/auth/api';
import { badRequest, notFound } from '@/server/auth/guard';
import { deleteSetlist, getSetlist, saveSetlist } from '@/server/setlists';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

const conflict = (error: string) => NextResponse.json({ error }, { status: 409 });

/** GET /api/setlists/{id}: сетліст із піснями в порядку виступу. */
export async function GET(_request: Request, { params }: Context) {
  const auth = await requireSetlistUser();
  if ('response' in auth) return auth.response;

  const setlist = await getSetlist((await params).id);
  if (!setlist) return notFound('setlist');
  return NextResponse.json({
    setlist: {
      id: setlist.id,
      name: setlist.name,
      items: setlist.items.map((item) => ({
        id: item.id,
        songId: item.songId,
        title: item.song.title,
        artist: item.song.artist,
        originalKey: item.song.originalKey,
        keyShift: item.keyShift,
      })),
    },
  });
}

/** PUT /api/setlists/{id} {name, items}: замінити назву й список. Поки сетліст на сцені, змінювати не можна (409). */
export async function PUT(request: Request, { params }: Context) {
  const auth = await requireSetlistUser();
  if ('response' in auth) return auth.response;

  const parsed = parseSetlistInput(await request.json().catch(() => null));
  if (!parsed.ok) return badRequest(parsed.error);

  const result = await saveSetlist((await params).id, auth.user.id, parsed.data);
  if (result.ok) return NextResponse.json({ setlist: { id: result.id } });
  if (result.reason === 'not_found') return notFound('setlist');
  if (result.reason === 'on_stage') return conflict('on_stage');
  return badRequest(result.reason);
}

/** DELETE /api/setlists/{id}: видалити сетліст (не можна, поки він на сцені). */
export async function DELETE(_request: Request, { params }: Context) {
  const auth = await requireSetlistUser();
  if ('response' in auth) return auth.response;

  const result = await deleteSetlist((await params).id);
  if (result === 'not_found') return notFound('setlist');
  if (result === 'on_stage') return conflict('on_stage');
  return NextResponse.json({ ok: true });
}
