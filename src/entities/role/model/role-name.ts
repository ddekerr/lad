/** Назва музичної ролі мовою інтерфейсу. */
export function roleName(role: { nameEn: string; nameUk: string }, locale: "en" | "uk"): string {
  return locale === "uk" ? role.nameUk : role.nameEn;
}
