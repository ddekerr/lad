'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { parseSongInput, SongBody } from '@/entities/song';
import { fmt, type Dictionary } from '@/shared/i18n';
import { shouldPreferFlats } from '@/shared/lib/chords';

type Props = {
  /** Є id → редагування, немає → нова пісня */
  songId?: string;
  initial: { title: string; artist: string; language: 'en' | 'uk'; originalKey: string; body: string };
  t: Dictionary;
};

const field = 'min-h-11 rounded-tile bg-ink px-4 text-cream';

const ERRORS = {
  invalid_title: 'errorTitle',
  invalid_artist: 'errorArtist',
  invalid_key: 'errorKey',
  invalid_body: 'errorBody',
} as const;

/** Редактор пісні (Editor): поля, текст з акордами й живий перегляд. */
export function SongEditor({ songId, initial, t }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const check = parseSongInput(form);
    if (!check.ok) {
      const key = ERRORS[check.error as keyof typeof ERRORS];
      return setError(key ? t.editor[key] : t.editor.errorGeneric);
    }
    setBusy(true);
    setError(null);
    const res = await fetch(songId ? `/api/songs/${songId}` : '/api/songs', {
      method: songId ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(check.data),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(t.editor.errorGeneric);
    const data = (await res.json()) as { song: { id: string } };
    router.push(`/songs/${data.song.id}`);
    router.refresh();
  }

  async function remove() {
    if (!songId) return;
    const res = await fetch(`/api/songs/${songId}`, { method: 'DELETE' }).catch(() => null);
    if (!res?.ok) return setError(t.editor.errorGeneric);
    router.push('/');
    router.refresh();
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">{songId ? t.editor.titleEdit : t.editor.titleNew}</h1>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-card bg-surface p-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">{t.editor.fieldTitle}</span>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">{t.editor.fieldArtist}</span>
            <input value={form.artist} onChange={(e) => set('artist', e.target.value)} className={field} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-muted">{t.editor.fieldLanguage}</span>
              <select
                value={form.language}
                onChange={(e) => set('language', e.target.value as 'en' | 'uk')}
                className={field}
              >
                <option value="uk">{t.song.language.uk}</option>
                <option value="en">{t.song.language.en}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-muted">{t.editor.fieldKey}</span>
              <input value={form.originalKey} onChange={(e) => set('originalKey', e.target.value)} className={field} />
            </label>
          </div>
          <p className="-mt-2 text-xs text-muted">{t.editor.keyHint}</p>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">{t.editor.fieldBody}</span>
            <textarea
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              rows={18}
              spellCheck={false}
              className="rounded-tile bg-ink p-4 font-mono text-sm"
            />
            <span className="text-xs text-muted">{t.editor.bodyHint}</span>
          </label>
          {songId && <p className="text-xs text-muted">{t.editor.versionHint}</p>}
        </div>

        <section aria-label={t.editor.preview} className="flex flex-col gap-3">
          <div className="text-sm text-muted">{t.editor.preview}</div>
          <div className="min-h-40 overflow-x-auto rounded-card bg-surface p-5 sm:p-8">
            <SongBody body={form.body} mode="both" shift={0} preferFlats={shouldPreferFlats(form.originalKey, 0)} />
          </div>
        </section>

        <div className="flex flex-col gap-3 lg:col-span-2">
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-tile bg-amber px-6 font-semibold text-ink hover:bg-amber-active disabled:cursor-not-allowed disabled:bg-line disabled:text-dim disabled:hover:bg-line disabled:hover:text-dim"
            >
              {busy ? t.editor.saving : t.editor.save}
            </button>
            <Link
              href={songId ? `/songs/${songId}` : '/'}
              className="flex min-h-11 items-center rounded-tile bg-line px-6 font-semibold"
            >
              {t.editor.cancel}
            </Link>
          </div>
        </div>
      </form>

      {songId && (
        <div className="border-t border-line pt-6">
          {confirmDelete ? (
            <div className="flex flex-col gap-3 rounded-card bg-surface p-5">
              <div className="font-semibold">{fmt(t.editor.deleteTitle, { title: initial.title })}</div>
              <p className="text-sm text-muted">{t.editor.deleteBody}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={remove}
                  className="min-h-11 rounded-tile bg-danger px-6 font-semibold text-ink"
                >
                  {t.editor.deleteConfirm}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="min-h-11 rounded-tile bg-line px-6"
                >
                  {t.editor.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-danger underline underline-offset-4"
            >
              {t.editor.delete}
            </button>
          )}
        </div>
      )}
    </main>
  );
}
