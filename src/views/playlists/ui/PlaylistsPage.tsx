import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlaylistCreateForm } from "@/features/create-playlist";
import { roleName } from "@/entities/role";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { getDictionary } from "@/server/i18n";
import { getUserMusicRoles } from "@/server/playlists";

export const metadata: Metadata = { title: "Лад · Playlists" };

type Props = { searchParams: Promise<{ role?: string }> };

/** Мої плейлисти в контексті однієї музичної ролі (або «без ролі»). */
export default async function PlaylistsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [{ locale, t }, roles, { role }] = await Promise.all([
    getDictionary(),
    getUserMusicRoles(user.id),
    searchParams,
  ]);

  const valid = role === "none" || roles.some((r) => r.id === role);
  const selected = valid && role ? role : (roles[0]?.id ?? "none");
  const musicRoleId = selected === "none" ? null : selected;

  const playlists = await prisma.playlist.findMany({
    where: { userId: user.id, musicRoleId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, _count: { select: { copies: true } } },
  });

  const chips = [
    ...roles.map((r) => ({ id: r.id, label: roleName(r, locale) })),
    { id: "none", label: t.playlists.noRole },
  ];

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t.playlists.title}</h1>

      <nav aria-label={t.playlists.roleLabel} className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">{t.playlists.roleLabel}</span>
        {chips.map((c) => (
          <Link
            key={c.id}
            href={`/playlists?role=${c.id}`}
            aria-current={c.id === selected ? "true" : undefined}
            className={
              "flex min-h-10 items-center rounded-full px-4 text-sm font-semibold " +
              (c.id === selected ? "bg-amber text-ink" : "bg-surface text-cream hover:bg-line")
            }
          >
            {c.label}
          </Link>
        ))}
      </nav>
      <p className="text-sm text-muted">{t.playlists.hint}</p>

      {playlists.length === 0 ? (
        <p className="rounded-card bg-surface p-6 text-muted">{t.playlists.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {playlists.map((p) => (
            <li key={p.id}>
              <Link
                href={`/playlists/${p.id}`}
                className="flex min-h-16 items-center justify-between gap-3 rounded-card bg-surface px-5 py-3 hover:bg-line"
              >
                <span className="truncate font-semibold">{p.name}</span>
                <span className="flex-none text-sm text-muted">
                  {p._count.copies} {t.playlists.songs}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <PlaylistCreateForm musicRoleId={musicRoleId} t={t} />
    </main>
  );
}
