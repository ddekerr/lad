import type { Prisma } from "@prisma/client";

/** Умова каталогу: без «м'яко» видалених, за потреби пошук за назвою або виконавцем. */
export function catalogWhere(query: string): Prisma.SongWhereInput {
  const q = query.trim();
  const where: Prisma.SongWhereInput = { deletedAt: null };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { artist: { contains: q, mode: "insensitive" } },
    ];
  }
  return where;
}
