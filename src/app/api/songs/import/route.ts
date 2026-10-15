import { NextResponse } from 'next/server';
import { MAX_IMPORT_BYTES, parseSongsJson, validateImportedSongs } from '@/entities/song';
import { requireEditor } from '@/server/auth/api';
import { badRequest } from '@/server/auth/guard';
import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

const tooLarge = () => NextResponse.json({ error: 'too_large' }, { status: 413 });

/**
 * POST /api/songs/import?format=json (Editor): імпорт пісень із файлу.
 * Тіло запиту це вміст файлу. Формат JSON: { "songs": [ { title, artist, language, originalKey, body } ] }.
 * Зайві поля відкидаються. Якщо хоч одна пісня не пройшла перевірку, не зберігається жодна (422 зі списком проблем).
 * Інші формати додаються як нові розбирачі поруч із parseSongsJson.
 */
export async function POST(request: Request) {
  const auth = await requireEditor();
  if ('response' in auth) return auth.response;

  const format = new URL(request.url).searchParams.get('format') ?? 'json';
  if (format !== 'json') return badRequest('unsupported_format');

  if (Number(request.headers.get('content-length')) > MAX_IMPORT_BYTES) return tooLarge();
  const text = await request.text().catch(() => null);
  if (text === null) return badRequest('invalid_json');
  if (text.length > MAX_IMPORT_BYTES) return tooLarge();

  const document = parseSongsJson(text);
  if (!document.ok) return badRequest(document.error);

  const result = validateImportedSongs(document.items);
  if (!result.ok) {
    return NextResponse.json({ error: 'invalid_songs', items: result.items, total: result.total }, { status: 422 });
  }

  // Один INSERT: усі пісні зберігаються разом або не зберігається жодна
  await prisma.song.createMany({
    data: result.songs.map((song) => ({ ...song, createdById: auth.user.id, updatedById: auth.user.id })),
  });

  return NextResponse.json({ imported: result.songs.length, ignoredFields: result.ignoredFields }, { status: 201 });
}
