import { prisma } from "./db";

/**
 * Скільки плейлистів і копій зникне разом із музичною роллю.
 * Якщо вказано userId, рахуємо лише для цього користувача, інакше для всіх.
 * Плейлисти «без ролі» сюди не потрапляють.
 */
export async function musicRoleImpact(roleId: string, userId?: string) {
  const where = { musicRoleId: roleId, ...(userId ? { userId } : {}) };
  const [playlists, copies] = await Promise.all([
    prisma.playlist.count({ where }),
    prisma.songCopy.count({ where: { playlist: where } }),
  ]);
  return { playlists, copies };
}
