/** Партії копій: збереження, список із ознакою «застаріла», добовий ліміт. */
import { createHash } from 'node:crypto';
import {
  buildGenerationInput,
  PART_DIFFICULTIES,
  PART_PROMPT_VERSION,
  readDynamics,
  type GenerationInput,
  type PartData,
  type PartDifficulty,
  type PartView,
} from '@/entities/song-copy';
import { prisma } from '@/server/db';

export const INSTRUMENT_BASS = 'bass';

type CopyRow = {
  id: string;
  body: string;
  originalKey: string;
  keyShift: number;
  bpm: number | null;
  timeSignature: string | null;
  sectionDynamics: unknown;
};

/** Копія в тому вигляді, який потрібен для побудови входу генерації. */
export function copyForParts(copy: CopyRow) {
  return {
    body: copy.body,
    originalKey: copy.originalKey,
    keyShift: copy.keyShift,
    bpm: copy.bpm,
    timeSignature: copy.timeSignature,
    sectionDynamics: readDynamics(copy.sectionDynamics),
  };
}

/** Хеш входу й версії запиту: змінився хеш, значить партія вже не відповідає копії. */
export function hashInput(input: GenerationInput): string {
  return createHash('sha256')
    .update(JSON.stringify({ promptVersion: PART_PROMPT_VERSION, input }))
    .digest('hex');
}

/** Партії копії за рівнями складності, з ознакою, чи вони ще відповідають копії. */
export async function listCopyParts(copy: CopyRow): Promise<PartView[]> {
  const rows = await prisma.copyPart.findMany({ where: { copyId: copy.id, instrument: INSTRUMENT_BASS } });
  const source = copyForParts(copy);

  return PART_DIFFICULTIES.flatMap((difficulty) => {
    const row = rows.find((item) => item.difficulty === difficulty);
    if (!row) return [];
    const built = buildGenerationInput(source, difficulty);
    const stale = !built.ok || hashInput(built.input) !== row.inputHash;
    return [{ difficulty, data: row.data as unknown as PartData, stale, updatedAt: row.updatedAt.toISOString() }];
  });
}

/** Скільки генерацій користувач уже зробив за останню добу. */
export function generationsLastDay(userId: string): Promise<number> {
  return prisma.partGeneration.count({
    where: { userId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
}

export function logGeneration(userId: string) {
  return prisma.partGeneration.create({ data: { userId } });
}

export function savePart(args: {
  copyId: string;
  difficulty: PartDifficulty;
  input: GenerationInput;
  model: string;
  data: PartData;
}) {
  const fields = {
    inputHash: hashInput(args.input),
    model: args.model,
    promptVersion: PART_PROMPT_VERSION,
    data: args.data as unknown as object,
  };
  return prisma.copyPart.upsert({
    where: {
      copyId_instrument_difficulty: { copyId: args.copyId, instrument: INSTRUMENT_BASS, difficulty: args.difficulty },
    },
    create: { copyId: args.copyId, instrument: INSTRUMENT_BASS, difficulty: args.difficulty, ...fields },
    update: fields,
  });
}

export function deletePart(copyId: string, difficulty: PartDifficulty) {
  return prisma.copyPart.deleteMany({ where: { copyId, instrument: INSTRUMENT_BASS, difficulty } });
}

/**
 * Партії баса поточного користувача для пісень каталогу: беруться з його власної копії пісні
 * (якщо копій кілька, береться та, що оновлювалась останньою й має партії). Потрібно для спільної сцени.
 */
export async function listPartsForSongs(
  userId: string,
  songIds: readonly string[],
): Promise<Record<string, PartView[]>> {
  if (songIds.length === 0) return {};
  const withParts = await prisma.copyPart.findMany({
    where: { instrument: INSTRUMENT_BASS, copy: { playlist: { userId }, sourceSongId: { in: [...songIds] } } },
    orderBy: { updatedAt: 'desc' },
    select: { copyId: true, copy: { select: { sourceSongId: true } } },
  });

  const copyBySong = new Map<string, string>();
  for (const row of withParts) {
    const songId = row.copy.sourceSongId;
    if (songId && !copyBySong.has(songId)) copyBySong.set(songId, row.copyId);
  }
  if (copyBySong.size === 0) return {};

  const copies = await prisma.songCopy.findMany({ where: { id: { in: [...copyBySong.values()] } } });
  const result: Record<string, PartView[]> = {};
  for (const copy of copies) {
    const songId = copy.sourceSongId;
    if (songId) result[songId] = await listCopyParts(copy);
  }
  return result;
}
