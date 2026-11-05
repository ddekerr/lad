import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SetlistCreateForm } from '@/features/create-setlist';
import { getCurrentUser } from '@/server/auth/session';
import { getDictionary } from '@/server/i18n';
import { listSetlists } from '@/server/setlists';
import { getStage } from '@/server/stage';
import { fmt } from '@/shared/i18n';

export const metadata: Metadata = { title: 'Лад · Setlists' };

/** Спільні сетлісти: список, створення й банер сцени, якщо вона зараз іде. */
export default async function SetlistsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');

  const [{ t }, setlists, stage] = await Promise.all([getDictionary(), listSetlists(), getStage()]);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t.setlists.title}</h1>
        <p className="mt-2 text-sm text-muted">{t.setlists.intro}</p>
      </div>

      {stage && (
        <div className="flex flex-col gap-3 rounded-card bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {stage.leaderId === user.id
              ? fmt(t.setlists.stageYours, { setlist: stage.setlistName })
              : fmt(t.setlists.stageBusy, { name: stage.leaderName, setlist: stage.setlistName })}
          </p>
          <Link
            href="/stage"
            className="flex min-h-11 flex-none items-center justify-center rounded-tile bg-amber px-5 font-semibold text-ink hover:bg-amber-active"
          >
            {stage.leaderId === user.id ? t.setlists.openStage : t.setlists.joinStage}
          </Link>
        </div>
      )}

      {setlists.length === 0 ? (
        <p className="rounded-card bg-surface p-6 text-muted">{t.setlists.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {setlists.map((setlist) => (
            <li key={setlist.id}>
              <Link
                href={`/setlists/${setlist.id}`}
                className="flex min-h-16 items-center justify-between gap-3 rounded-card bg-surface px-5 py-3 hover:bg-line"
              >
                <span className="truncate font-semibold">{setlist.name}</span>
                <span className="flex-none text-sm text-muted">
                  {setlist._count.items} {t.setlists.songs}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <SetlistCreateForm t={t} />
    </main>
  );
}
