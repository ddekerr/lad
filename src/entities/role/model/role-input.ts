/** Перевірка введення для довідника музичних ролей (чиста логіка, без БД). */

/** Ключі системних ролей: їх не можна використати як ключ нової музичної ролі. */
export const RESERVED_ROLE_KEYS = ['member', 'editor', 'admin', 'super-admin', 'guest'] as const;

const ROLE_KEY_RE = /^[a-z][a-z0-9_-]{1,29}$/;

export function isValidRoleKey(key: unknown): key is string {
  return typeof key === 'string' && ROLE_KEY_RE.test(key) && !(RESERVED_ROLE_KEYS as readonly string[]).includes(key);
}

export function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= 60 ? name : null;
}
