import { NextResponse } from 'next/server';
import { buildGenerationInput, MAX_PART_BARS, parseDifficulty } from '@/entities/song-copy';
import { requireMember } from '@/server/auth/api';
import { badRequest, notFound } from '@/server/auth/guard';
import { getOwnedCopy } from '@/server/playlists';
import { anthropicClient } from '@/server/parts/anthropic';
import { anthropicApiKey, dailyGenerationLimit, MAX_GENERATION_ATTEMPTS, partModel } from '@/server/parts/config';
import { AiUnavailableError, generateBassPart } from '@/server/parts/generate';
import {
  copyForParts,
  deletePart,
  generationsLastDay,
  listCopyParts,
  logGeneration,
  savePart,
} from '@/server/parts/service';

export const dynamic = 'force-dynamic';
/** Генерація може тривати понад хвилину (кілька спроб). */
export const maxDuration = 300;

type Context = { params: Promise<{ id: string }> };

/** GET /api/copies/{id}/parts: партії копії з ознакою «застаріла». */
export async function GET(_request: Request, { params }: Context) {
  const auth = await requireMember();
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const copy = await getOwnedCopy(auth.user.id, id);
  if (!copy) return notFound('copy');

  return NextResponse.json({ parts: await listCopyParts(copy) });
}

/**
 * POST /api/copies/{id}/parts {difficulty}: згенерувати (чи згенерувати знову) партію баса.
 * Помилки: 400 (нема параметрів чи тактів), 429 (добовий ліміт), 502 (ШІ недоступний чи не дав коректну партію),
 * 503 (ШІ не налаштовано на сервері).
 */
export async function POST(request: Request, { params }: Context) {
  const auth = await requireMember();
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const copy = await getOwnedCopy(auth.user.id, id);
  if (!copy) return notFound('copy');

  const body = (await request.json().catch(() => null)) as { difficulty?: unknown } | null;
  const difficulty = parseDifficulty(body?.difficulty);
  if (!difficulty) return badRequest('invalid_difficulty');

  const built = buildGenerationInput(copyForParts(copy), difficulty);
  if (!built.ok) {
    if (built.reason === 'missing_parameters') {
      return NextResponse.json(
        { error: 'missing_parameters', missing: built.missing, barIssues: built.barIssues.slice(0, 20) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: built.reason, max: MAX_PART_BARS }, { status: 400 });
  }

  const apiKey = anthropicApiKey();
  if (!apiKey) return NextResponse.json({ error: 'ai_not_configured' }, { status: 503 });

  const limit = dailyGenerationLimit();
  if ((await generationsLastDay(auth.user.id)) >= limit) {
    return NextResponse.json({ error: 'daily_limit', limit }, { status: 429 });
  }
  await logGeneration(auth.user.id);

  const model = partModel();
  try {
    const result = await generateBassPart(built.input, anthropicClient({ apiKey, model }), MAX_GENERATION_ATTEMPTS);
    if (!result.ok) {
      return NextResponse.json({ error: 'generation_failed', problems: result.problems.slice(0, 5) }, { status: 502 });
    }
    await savePart({ copyId: id, difficulty, input: built.input, model, data: result.data });
    return NextResponse.json({ ok: true, attempts: result.attempts });
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      return NextResponse.json({ error: 'ai_unavailable' }, { status: 502 });
    }
    throw error;
  }
}

/** DELETE /api/copies/{id}/parts?difficulty=easy: видалити партію. */
export async function DELETE(request: Request, { params }: Context) {
  const auth = await requireMember();
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const copy = await getOwnedCopy(auth.user.id, id);
  if (!copy) return notFound('copy');

  const difficulty = parseDifficulty(new URL(request.url).searchParams.get('difficulty'));
  if (!difficulty) return badRequest('invalid_difficulty');

  await deletePart(id, difficulty);
  return NextResponse.json({ ok: true });
}
