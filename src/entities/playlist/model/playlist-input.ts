/** Перевірка введення для плейлистів (чиста логіка, без БД). */

export const MAX_PLAYLIST_NAME = 80;

export function cleanPlaylistName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= MAX_PLAYLIST_NAME ? name : null;
}

/** Контекст ролі з query: "none" = без ролі, інакше id музичної ролі, порожнє = усі. */
export type RoleFilter = { kind: "all" } | { kind: "none" } | { kind: "role"; roleId: string };

export function parseRoleFilter(value: string | null | undefined): RoleFilter {
  if (!value) return { kind: "all" };
  if (value === "none") return { kind: "none" };
  return { kind: "role", roleId: value };
}
