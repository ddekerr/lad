/**
 * Матриця прав і правила видачі ролей (lad-backend-spec.md, п. 2).
 * Чиста логіка без доступу до БД: легко тестується.
 *
 * Права користувача = сума прав усіх його ролей. Member є в кожного
 * зареєстрованого. Супер-адмін визначається за email з `.env`, а не з БД.
 */

export const ROLE_MEMBER = 'member';
export const ROLE_EDITOR = 'editor';
export const ROLE_ADMIN = 'admin';

export type Actor = {
  /** Ключі ролей користувача (member, editor, admin, bassist…) */
  roles: readonly string[];
  isSuperAdmin: boolean;
};

export type Action =
  | 'song:read' // перегляд: усі, навіть гість
  | 'song:write' // додавати, змінювати, видаляти пісні
  | 'playlist:manage' // власні плейлисти й копії
  | 'users:read' // список користувачів
  | 'roles:assign' // видавати й знімати ролі
  | 'musicRoles:manage'; // довідник музичних ролей

function hasRole(actor: Actor, key: string): boolean {
  return actor.roles.includes(key);
}

export function isAdmin(actor: Actor | null): boolean {
  return actor !== null && (actor.isSuperAdmin || hasRole(actor, ROLE_ADMIN));
}

export function can(actor: Actor | null, action: Action): boolean {
  switch (action) {
    case 'song:read':
      return true;
    case 'playlist:manage':
      // Member є в усіх зареєстрованих, тож достатньо бути авторизованим
      return actor !== null;
    case 'song:write':
      return actor !== null && hasRole(actor, ROLE_EDITOR);
    case 'users:read':
    case 'roles:assign':
      return isAdmin(actor);
    case 'musicRoles:manage':
      return actor !== null && actor.isSuperAdmin;
  }
}

export type RoleRef = {
  key: string;
  kind: 'system' | 'music';
  isRemovable: boolean;
};

export type Denial =
  'not_admin' | 'member_is_automatic' | 'member_not_removable' | 'admin_super_only' | 'super_admin_locked';

export type Decision = { ok: true } | { ok: false; reason: Denial };

const ok: Decision = { ok: true };
const deny = (reason: Denial): Decision => ({ ok: false, reason });

/** Чи може діючий користувач видати цю роль. */
export function canGrantRole(actor: Actor | null, role: RoleRef): Decision {
  if (!isAdmin(actor)) return deny('not_admin');
  if (role.key === ROLE_MEMBER) return deny('member_is_automatic');
  if (role.key === ROLE_ADMIN && !actor!.isSuperAdmin) return deny('admin_super_only');
  return ok;
}

/** Чи може діючий користувач зняти цю роль із цільового користувача. */
export function canRevokeRole(actor: Actor | null, role: RoleRef, target: { isSuperAdmin: boolean }): Decision {
  if (!isAdmin(actor)) return deny('not_admin');
  if (role.key === ROLE_MEMBER || !role.isRemovable) return deny('member_not_removable');
  if (role.key === ROLE_ADMIN) {
    if (target.isSuperAdmin) return deny('super_admin_locked');
    if (!actor!.isSuperAdmin) return deny('admin_super_only');
  }
  return ok;
}

/** Супер-адмін задається в `.env` через SUPER_ADMIN_EMAIL (можна кілька через кому). */
export function isSuperAdminEmail(email: string, configured: string | undefined): boolean {
  if (!configured) return false;
  const wanted = email.trim().toLowerCase();
  return configured
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(wanted);
}
