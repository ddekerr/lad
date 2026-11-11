/**
 * Ключ пошуку пісні. SQLite порівнює без урахування регістру лише ASCII, тому «Привіт» не знайде «привіт».
 * Зберігаємо назву й виконавця малими літерами (JS знає й кирилицю) і шукаємо та сортуємо по цьому ключу.
 * Правило дублюється в prisma/seed.ts.
 */
export function normalizeSearch(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function songSearchKey(song: { title: string; artist: string }): string {
  return normalizeSearch(`${song.title} ${song.artist}`);
}
