import type { Prisma } from '@prisma/client';
import { normalizeSearch } from '@/entities/song';

/** Умова каталогу: без «м'яко» видалених, за потреби пошук за назвою або виконавцем. */
export function catalogWhere(query: string): Prisma.SongWhereInput {
  const q = normalizeSearch(query);
  const where: Prisma.SongWhereInput = { deletedAt: null };
  if (q) where.searchKey = { contains: q };
  return where;
}
