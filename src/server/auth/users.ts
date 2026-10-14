import { Prisma, type AuthProvider } from '@prisma/client';
import { ROLE_MEMBER } from '@/entities/user';
import { prisma } from '@/server/db';

/**
 * Реєстрація й вхід це один потік: якщо акаунта з таким email немає, він
 * створюється з роллю Member. Google та email з однаковою адресою ведуть в один акаунт.
 */
export async function findOrCreateUser(email: string, provider: AuthProvider, providerUserId: string | null) {
  try {
    return await upsertUser(email, provider, providerUserId);
  } catch (error) {
    // Два одночасні входи нового користувача: другий отримає конфлікт унікальності
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return await upsertUser(email, provider, providerUserId);
    }
    throw error;
  }
}

async function upsertUser(email: string, provider: AuthProvider, providerUserId: string | null) {
  const memberRole = await prisma.role.findUnique({ where: { key: ROLE_MEMBER } });
  if (!memberRole) {
    throw new Error("Role 'member' is missing. Run `npm run db:seed` first.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    return prisma.user.create({
      data: {
        email,
        lastLoginAt: new Date(),
        identities: { create: { provider, providerUserId } },
        roles: { create: { roleId: memberRole.id } },
      },
    });
  }

  const identity = await prisma.authIdentity.findFirst({
    where: { userId: existing.id, provider, providerUserId },
    select: { id: true },
  });
  if (!identity) {
    await prisma.authIdentity.create({
      data: { userId: existing.id, provider, providerUserId },
    });
  }

  // Member незнімна: якщо запису раптом немає, відновлюємо
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: existing.id, roleId: memberRole.id } },
    update: {},
    create: { userId: existing.id, roleId: memberRole.id },
  });

  return prisma.user.update({
    where: { id: existing.id },
    data: { lastLoginAt: new Date() },
  });
}
