import type { Metadata } from "next";
import Link from "next/link";
import { can } from "@/entities/user";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { getDictionary } from "@/server/i18n";
import { catalogWhere } from "@/server/songs";
import { IconChevronRight, IconSearch } from "@/shared/ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.catalog.title };
}

type Props = { searchParams: Promise<{ q?: string }> };

/** Каталог пісень (головна). Публічний: доступний гостю без входу. */
export default async function CatalogPage({ searchParams }: Props) {
  const [{ t }, user] = await Promise.all([getDictionary(), getCurrentUser()]);
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const songs = await prisma.song.findMany({
    where: catalogWhere(query),
    orderBy: { title: "asc" },
    select: { id: true, title: true, artist: true, originalKey: true, language: true },
  });

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t.catalog.title}</h1>
          <p className="text-sm text-muted">
            {songs.length} {t.catalog.count}
          </p>
        </div>

        {user && can(user.actor, "song:write") && (
          <Link
            href="/songs/new"
            className="flex min-h-11 items-center justify-center rounded-tile bg-amber px-5 font-semibold text-ink hover:bg-amber-active"
          >
            {t.editor.newSong}
          </Link>
        )}

        <form role="search" className="flex w-full gap-2 sm:max-w-md">
          <label htmlFor="q" className="sr-only">
            {t.catalog.searchLabel}
          </label>
          <div className="relative flex-1">
            <IconSearch
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-taupe"
            />
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={query}
              placeholder={t.catalog.searchPlaceholder}
              className="h-12 w-full rounded-tile border border-line bg-ink pl-10 pr-3 text-base text-cream placeholder:text-dim"
            />
          </div>
          <button
            type="submit"
            className="h-12 rounded-tile bg-amber px-5 font-semibold text-ink hover:bg-amber-active"
          >
            {t.catalog.searchButton}
          </button>
        </form>
      </div>

      {songs.length === 0 ? (
        <div className="rounded-card bg-surface p-8 text-center">
          <p className="font-semibold">{t.catalog.empty}</p>
          <p className="text-sm text-muted">{t.catalog.emptyHint}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {songs.map((song) => (
            <li key={song.id}>
              <Link
                href={`/songs/${song.id}`}
                className="flex min-h-[72px] items-center gap-4 rounded-[16px] bg-surface px-4 py-3 hover:bg-line"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{song.title}</div>
                  <div className="truncate text-sm text-muted">{song.artist}</div>
                </div>
                <span className="rounded-full bg-line px-2.5 py-0.5 text-xs font-semibold uppercase text-muted">
                  {song.language}
                </span>
                <span className="w-12 text-right text-sm text-muted">
                  <span className="sr-only">{t.catalog.key} </span>
                  {song.originalKey}
                </span>
                <IconChevronRight size={20} className="flex-none text-taupe" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
