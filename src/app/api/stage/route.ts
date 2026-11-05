import { NextResponse } from 'next/server';
import { parseStageCommand } from '@/entities/setlist';
import { requireSetlistUser } from '@/server/auth/api';
import { badRequest, forbidden, notFound } from '@/server/auth/guard';
import { endStage, getStage, moveStage, startStage } from '@/server/stage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stage?rev=N: стан спільної сцени. Учасники опитують його раз на секунду;
 * якщо ревізія не змінилась, відповідь `{ changed: false }`. Немає сцени: `{ stage: null }`.
 */
export async function GET(request: Request) {
  const auth = await requireSetlistUser();
  if ('response' in auth) return auth.response;

  const stage = await getStage();
  const rev = Number(new URL(request.url).searchParams.get('rev'));
  if (stage && Number.isInteger(rev) && rev === stage.revision) return NextResponse.json({ changed: false });
  return NextResponse.json({ stage });
}

/** POST /api/stage {setlistId}: запустити сцену. Одна на всіх: якщо вона вже йде, 409 разом із її станом. */
export async function POST(request: Request) {
  const auth = await requireSetlistUser();
  if ('response' in auth) return auth.response;

  const body = (await request.json().catch(() => null)) as { setlistId?: unknown } | null;
  if (typeof body?.setlistId !== 'string') return badRequest('invalid_setlist');

  const result = await startStage(body.setlistId, auth.user.id);
  if (result.ok) return NextResponse.json({ stage: result.stage }, { status: 201 });
  if (result.reason === 'not_found') return notFound('setlist');
  if (result.reason === 'empty') return badRequest('empty_setlist');
  return NextResponse.json({ error: 'busy', stage: result.stage ?? null }, { status: 409 });
}

/** PATCH /api/stage {type: 'item'|'bar'|'shift', ...}: команда ведучого. Іншим учасникам 403. */
export async function PATCH(request: Request) {
  const auth = await requireSetlistUser();
  if ('response' in auth) return auth.response;

  const stage = await getStage();
  if (!stage) return notFound('stage');
  const command = parseStageCommand(await request.json().catch(() => null), stage.itemCount);
  if (!command) return badRequest('invalid_command');

  const result = await moveStage(auth.user.id, command);
  if (result.ok) return NextResponse.json({ stage: result.stage });
  if (result.reason === 'not_leader') return forbidden();
  if (result.reason === 'bad_command') return badRequest('invalid_command');
  return notFound('stage');
}

/** DELETE /api/stage: завершити сцену (ведучий або адмін). */
export async function DELETE() {
  const auth = await requireSetlistUser();
  if ('response' in auth) return auth.response;

  const result = await endStage(auth.user.id, auth.user.actor);
  if (result === 'no_stage') return notFound('stage');
  if (result === 'forbidden') return forbidden();
  return NextResponse.json({ ok: true });
}
