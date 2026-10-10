import Link from "next/link";
import { IconMusic } from "@/components/icons";
import { LangSwitcher } from "@/components/LangSwitcher";
import { Logo } from "@/components/Logo";
import { getDictionary } from "@/lib/i18n/server";

/**
 * Оболонка застосунку. Комп'ютер: вузька бічна панель з іконками й верхня смуга.
 * Телефон: верхня смуга з мовою й нижня панель навігації.
 * Поки існує лише розділ «Пісні»; плейлисти, профіль, редактор і адмінка додамо пізніше.
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getDictionary();

  return (
    <div className="flex min-h-dvh">
      <nav
        aria-label={t.nav.main}
        className="sticky top-0 hidden h-dvh w-18 flex-none flex-col items-center gap-2 border-r border-line bg-ink py-4 md:flex"
      >
        <Link href="/" aria-label={t.appName} className="mb-4">
          <Logo size={40} />
        </Link>
        <Link
          href="/"
          aria-label={t.nav.songs}
          aria-current="page"
          className="flex size-12 items-center justify-center rounded-[12px] bg-amber text-ink"
        >
          <IconMusic size={22} />
        </Link>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-none items-center justify-between border-b border-line px-4 md:h-16 md:px-8">
          <Link href="/" className="flex items-center gap-2.5 md:hidden">
            <Logo size={28} />
            <span className="font-heading text-lg font-bold">{t.appName}</span>
          </Link>
          <span className="hidden md:block" />
          <LangSwitcher locale={locale} t={t} />
        </header>

        <div className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">{children}</div>
      </div>

      <nav
        aria-label={t.nav.main}
        className="fixed inset-x-0 bottom-0 flex h-16 border-t border-line bg-ink md:hidden"
      >
        <Link
          href="/"
          aria-current="page"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold text-amber"
        >
          <IconMusic size={22} />
          {t.nav.songs}
        </Link>
      </nav>
    </div>
  );
}
