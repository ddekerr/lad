import Link from 'next/link';
import { getDictionary } from '@/server/i18n';

export default async function NotFound() {
  const { t } = await getDictionary();
  return (
    <main className="mx-auto flex max-w-xl flex-col items-start gap-4 py-12">
      <h1 className="font-heading text-2xl font-bold">{t.song.notFound}</h1>
      <p className="text-muted">{t.song.notFoundHint}</p>
      <Link
        href="/"
        className="flex min-h-11 items-center rounded-tile bg-amber px-5 font-semibold text-ink hover:bg-amber-active"
      >
        {t.errors.toSongs}
      </Link>
    </main>
  );
}
