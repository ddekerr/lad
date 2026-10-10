import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** Одноразовий код із листа: 6 цифр. */
export function generateLoginCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Хеш коду з прив'язкою до email і секрету: сам код у БД не лежить. */
export function hashLoginCode(email: string, code: string, secret: string): string {
  return createHmac("sha256", secret).update(`${email.trim().toLowerCase()}:${code}`).digest("hex");
}

/** Порівняння хешів без витоку часу. */
export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

/** Випадковий токен сесії: віддаємо в cookie, у БД зберігаємо лише хеш. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Простий розбір email: нормалізує регістр і відкидає очевидно хибні адреси. */
export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return null;
  return email;
}

/** Код має рівно 6 цифр (пробіли навколо ігноруються). */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.trim();
  return /^\d{6}$/.test(code) ? code : null;
}
