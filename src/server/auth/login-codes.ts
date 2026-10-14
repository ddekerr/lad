import { prisma } from '@/server/db';
import { sendLoginCodeMail } from '@/server/mail';
import { CODE_MAX_ATTEMPTS, CODE_REQUESTS_PER_WINDOW, CODE_REQUEST_WINDOW_MS, CODE_TTL_MS, authSecret } from './config';
import { generateLoginCode, hashLoginCode, safeEqualHex } from './crypto';

export type RequestResult = 'sent' | 'rate_limited';
export type VerifyResult = 'ok' | 'invalid' | 'expired' | 'too_many_attempts';

/** Створює одноразовий код і надсилає його на пошту. Є ліміт запитів на email. */
export async function requestLoginCode(email: string): Promise<RequestResult> {
  const since = new Date(Date.now() - CODE_REQUEST_WINDOW_MS);
  const recent = await prisma.loginCode.count({ where: { email, createdAt: { gte: since } } });
  if (recent >= CODE_REQUESTS_PER_WINDOW) return 'rate_limited';

  const code = generateLoginCode();
  await prisma.loginCode.create({
    data: {
      email,
      codeHash: hashLoginCode(email, code, authSecret()),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  await sendLoginCodeMail(email, code);
  return 'sent';
}

/** Перевіряє код: не прострочений, не використаний, обмежена кількість спроб. */
export async function verifyLoginCode(email: string, code: string): Promise<VerifyResult> {
  const latest = await prisma.loginCode.findFirst({
    where: { email, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!latest) return 'invalid';
  if (latest.expiresAt.getTime() <= Date.now()) return 'expired';
  if (latest.attempts >= CODE_MAX_ATTEMPTS) return 'too_many_attempts';

  const matches = safeEqualHex(latest.codeHash, hashLoginCode(email, code, authSecret()));
  if (!matches) {
    await prisma.loginCode.update({
      where: { id: latest.id },
      data: { attempts: { increment: 1 } },
    });
    return 'invalid';
  }

  // Атомарно позначаємо використаним: повторне використання того самого коду не пройде
  const claimed = await prisma.loginCode.updateMany({
    where: { id: latest.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  return claimed.count === 1 ? 'ok' : 'invalid';
}
