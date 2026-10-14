import { prisma } from './db';

/** Плейлист, який належить користувачу, або null (чужі плейлисти для API не існують). */
export function getOwnedPlaylist(userId: string, id: string) {
  return prisma.playlist.findFirst({
    where: { id, userId },
    include: { musicRole: { select: { id: true, key: true, nameEn: true, nameUk: true } } },
  });
}

/** Копія, яка лежить у плейлисті користувача, разом зі станом оригіналу. */
export function getOwnedCopy(userId: string, id: string) {
  return prisma.songCopy.findFirst({
    where: { id, playlist: { userId } },
    include: {
      playlist: { select: { id: true, name: true, musicRoleId: true } },
      sourceSong: { select: { id: true, version: true, deletedAt: true } },
    },
  });
}

/** Музичні ролі користувача: з них він вибирає контекст плейлистів. */
export async function getUserMusicRoles(userId: string) {
  const rows = await prisma.userRole.findMany({
    where: { userId, role: { kind: 'music' } },
    select: { role: { select: { id: true, key: true, nameEn: true, nameUk: true } } },
    orderBy: { role: { key: 'asc' } },
  });
  return rows.map((r) => r.role);
}
