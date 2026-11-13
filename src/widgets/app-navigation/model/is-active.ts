/** Чи підсвічувати пункт меню `href` на сторінці `pathname`. */
export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname.startsWith('/songs');
  if (href === '/playlists') return pathname.startsWith('/playlists') || pathname.startsWith('/copies');
  return pathname === href || pathname.startsWith(`${href}/`);
}
