import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/** Сторінка «немає доступу» для користувача без потрібної ролі. */
export function Forbidden({ t }: { t: Dictionary }) {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-start gap-4 py-12">
      <h1 className="font-heading text-2xl font-bold">{t.errors.forbidden}</h1>
      <p className="text-muted">{t.errors.forbiddenHint}</p>
      <Link
        href="/"
        className="flex min-h-11 items-center rounded-tile bg-amber px-5 font-semibold text-ink hover:bg-amber-active"
      >
        {t.errors.toSongs}
      </Link>
    </main>
  );
}
