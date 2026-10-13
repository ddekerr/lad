import Link from "next/link";
import { NavLinks, type NavItem } from "@/widgets/app-navigation";
import { LangSwitcher } from "@/features/change-language";
import { can } from "@/entities/user";
import { getCurrentUser } from "@/server/auth/session";
import { getDictionary } from "@/server/i18n";
import { Logo } from "@/shared/ui";

/**
 * Оболонка застосунку. Комп'ютер: вузька бічна панель з іконками й верхня смуга.
 * Телефон: верхня смуга з мовою й нижня панель навігації.
 * Пункти меню залежать від ролей: гість бачить «Пісні» й «Увійти»,
 * користувач ще «Профіль», адмін «Користувачі», супер-адмін «Музичні ролі».
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const [{ locale, t }, user] = await Promise.all([getDictionary(), getCurrentUser()]);

  const items: NavItem[] = [{ href: "/", label: t.nav.songs, icon: "music" }];
  if (!user) {
    items.push({ href: "/sign-in", label: t.nav.signIn, icon: "user" });
  } else {
    items.push({ href: "/playlists", label: t.nav.playlists, icon: "list" });
    items.push({ href: "/profile", label: t.nav.profile, icon: "user" });
    if (can(user.actor, "users:read")) {
      items.push({ href: "/admin/users", label: t.nav.users, icon: "users" });
    }
    if (can(user.actor, "musicRoles:manage")) {
      items.push({ href: "/admin/roles", label: t.nav.musicRoles, icon: "tags" });
    }
  }

  return (
    <div className="flex min-h-dvh">
      <nav
        aria-label={t.nav.main}
        className="sticky top-0 hidden h-dvh w-18 flex-none flex-col items-center gap-2 border-r border-line bg-ink py-4 md:flex"
      >
        <Link href="/" aria-label={t.appName} className="mb-4">
          <Logo size={40} />
        </Link>
        <NavLinks items={items} variant="side" />
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-none items-center justify-between gap-3 border-b border-line px-4 md:h-16 md:px-8">
          <Link href="/" className="flex items-center gap-2.5 md:hidden">
            <Logo size={28} />
            <span className="font-heading text-lg font-bold">{t.appName}</span>
          </Link>
          <span className="hidden md:block" />
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden max-w-60 truncate text-sm text-muted sm:block">
                {user.email}
              </span>
            )}
            <LangSwitcher locale={locale} t={t} />
          </div>
        </header>

        <div className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">{children}</div>
      </div>

      <nav
        aria-label={t.nav.main}
        className="fixed inset-x-0 bottom-0 flex h-16 border-t border-line bg-ink md:hidden"
      >
        <NavLinks items={items} variant="bottom" />
      </nav>
    </div>
  );
}
