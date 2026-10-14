import { cookies } from 'next/headers';
import { cache } from 'react';
import { ROLE_ADMIN, ROLE_MEMBER, isSuperAdminEmail, type Actor } from '@/entities/user';
import { prisma } from '@/server/db';
import { SESSION_COOKIE, SESSION_TTL_MS, isProduction, superAdminEmails } from './config';
import { generateSessionToken, hashSessionToken } from './crypto';

export type CurrentUser = {
  id: string;
  email: string;
  language: 'en' | 'uk';
  /** Ключі ролей. Member є завжди; для супер-адміна додано admin */
  roles: string[];
  isSuperAdmin: boolean;
  actor: Actor;
};

/** Роль із прапорцем супер-адміна збираємо в один об'єкт для перевірок прав. */
export function buildCurrentUser(user: {
  id: string;
  email: string;
  language: 'en' | 'uk';
  roleKeys: string[];
}): CurrentUser {
  const isSuperAdmin = isSuperAdminEmail(user.email, superAdminEmails());
  const roles = new Set([ROLE_MEMBER, ...user.roleKeys]);
  if (isSuperAdmin) roles.add(ROLE_ADMIN);
  const list = [...roles];
  return {
    id: user.id,
    email: user.email,
    language: user.language,
    roles: list,
    isSuperAdmin,
    actor: { roles: list, isSuperAdmin },
  };
}

/** Створює сесію (refresh-токен на 1 місяць). У БД лежить лише хеш токена. */
export async function createSession(userId: string, userAgent?: string | null) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
      userAgent: userAgent?.slice(0, 255) ?? null,
    },
  });
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Відкликає поточну сесію (вихід). */
export async function revokeCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashSessionToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  store.delete(SESSION_COOKIE);
}

/** Поточний користувач за cookie сесії або null (гість). Кешується на час одного запиту. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: { include: { roles: { include: { role: { select: { key: true } } } } } },
    },
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  const { user } = session;
  return buildCurrentUser({
    id: user.id,
    email: user.email,
    language: user.language,
    roleKeys: user.roles.map((r) => r.role.key),
  });
});
