'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BodyField, SongBody, type DisplayMode } from '@/entities/song';
import type { CopyState, SectionDynamics } from '@/entities/song-copy';
import type { Dictionary } from '@/shared/i18n';
import { shouldPreferFlats, transposeKey } from '@/shared/lib/chords';
import { IconChevronLeft, IconExpand, IconMinus, IconPlus, IconWarning } from '@/shared/ui';
import { CopyParameters } from './copy-parameters';

type Props = {
  copy: {
    id: string;
    title: string;
    artist: string;
    language: 'en' | 'uk';
    originalKey: string;
    body: string;
    keyShift: number;
    notes: string;
    bpm: number | null;
    timeSignature: string | null;
    sectionDynamics: SectionDynamics;
    state: CopyState;
  };
  playlist: { id: string; name: string };
  t: Dictionary;
};

const primary =
  'min-h-11 rounded-tile bg-amber px-5 font-semibold text-ink hover:bg-amber-active disabled:cursor-not-allowed disabled:bg-line disabled:text-dim disabled:hover:bg-line disabled:hover:text-dim';
const secondary = 'min-h-11 rounded-tile bg-line px-5 font-semibold text-cream hover:bg-taupe hover:text-ink';

/**
 * Моя копія: тональність і нотатки зберігаються в самій копії, правки тексту живуть
 * лише в ній. Одна кнопка «Оновити згідно з оригіналом» замінює назву, текст і акорди.
 */
export function CopyView({ copy, playlist, t }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<DisplayMode>('both');
  const [shift, setShift] = useState(copy.keyShift);
  const [notes, setNotes] = useState(copy.notes);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: copy.title, artist: copy.artist, body: copy.body });

  const preferFlats = shouldPreferFlats(copy.originalKey, shift);
  const currentKey = transposeKey(copy.originalKey, shift);

  async function call(url: string, method: string, body?: unknown): Promise<boolean> {
    setStatus('idle');
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).catch(() => null);
    setStatus(res?.ok ? 'saved' : 'error');
    return Boolean(res?.ok);
  }

  async function changeShift(delta: number) {
    const next = (((shift + delta) % 12) + 12) % 12;
    setShift(next);
    await call(`/api/copies/${copy.id}`, 'PATCH', { keyShift: next });
  }

  async function saveNotes() {
    await call(`/api/copies/${copy.id}`, 'PATCH', { notes });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (await call(`/api/copies/${copy.id}`, 'PATCH', draft)) {
      setEditing(false);
      router.refresh();
    }
  }

  async function update() {
    if (await call(`/api/copies/${copy.id}/refresh`, 'POST')) {
      setConfirmUpdate(false);
      router.refresh();
      // свіжі дані приходять із сервера; чернетку редагування скидаємо після перезавантаження
    }
  }

  async function keepOwn() {
    if (await call(`/api/copies/${copy.id}/keep`, 'POST')) router.refresh();
  }

  async function deleteCopy() {
    if (await call(`/api/copies/${copy.id}`, 'DELETE')) router.push(`/playlists/${playlist.id}`);
  }

  const modes: { value: DisplayMode; label: string }[] = [
    { value: 'text', label: t.song.modeText },
    { value: 'chords', label: t.song.modeChords },
    { value: 'both', label: t.song.modeBoth },
  ];

  const banner = (title: string, body: string, actions: React.ReactNode) => (
    <div role="status" className="flex flex-col gap-3 rounded-card border border-amber bg-surface p-5">
      <div className="flex items-center gap-2 font-semibold text-amber">
        <IconWarning size={20} />
        {title}
      </div>
      <p className="text-sm text-muted">{body}</p>
      <div className="flex flex-wrap gap-3">{actions}</div>
    </div>
  );

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={`/playlists/${playlist.id}`}
          className="inline-flex items-center gap-1.5 self-start text-sm text-muted hover:text-cream"
        >
          <IconChevronLeft size={18} />
          {t.copy.back}: {playlist.name}
        </Link>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{copy.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-muted">
          <span>{copy.artist}</span>
          <span className="rounded-full bg-amber px-2.5 py-0.5 text-xs font-semibold text-ink">{t.copy.badge}</span>
          <span className="rounded-full bg-line px-2.5 py-0.5 text-xs font-semibold text-cream">
            {t.song.language[copy.language]}
          </span>
        </div>
      </div>

      {copy.state === 'outdated' &&
        banner(
          t.copy.outdatedTitle,
          t.copy.outdatedBody,
          confirmUpdate ? (
            <div className="flex w-full flex-col gap-3">
              <p className="text-sm">{t.copy.updateConfirm}</p>
              <div className="flex gap-3">
                <button type="button" onClick={update} className={primary}>
                  {t.copy.updateYes}
                </button>
                <button type="button" onClick={() => setConfirmUpdate(false)} className={secondary}>
                  {t.copy.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmUpdate(true)} className={primary}>
              {t.copy.update}
            </button>
          ),
        )}

      {copy.state === 'original_deleted' &&
        banner(
          t.copy.deletedTitle,
          t.copy.deletedBody,
          <>
            <button type="button" onClick={keepOwn} className={primary}>
              {t.copy.keepOwn}
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)} className={secondary}>
              {t.copy.deleteCopy}
            </button>
          </>,
        )}

      {copy.state === 'standalone' && <p className="text-sm text-muted">{t.copy.standalone}</p>}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <section
          aria-label={t.copy.display}
          className="min-w-0 flex-1 overflow-x-auto rounded-card bg-surface p-5 sm:p-8"
        >
          {editing ? (
            <form onSubmit={saveEdit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-muted">{t.copy.editTitle}</span>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="min-h-11 rounded-tile bg-ink px-4"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-muted">{t.copy.editArtist}</span>
                <input
                  value={draft.artist}
                  onChange={(e) => setDraft({ ...draft, artist: e.target.value })}
                  className="min-h-11 rounded-tile bg-ink px-4"
                />
              </label>
              <BodyField
                label={t.copy.editBody}
                hint={t.copy.editHint}
                value={draft.body}
                onChange={(body) => setDraft({ ...draft, body })}
                rows={16}
                t={t}
              />
              <div>
                <div className="mb-2 text-sm text-muted">{t.copy.preview}</div>
                <div className="rounded-tile bg-ink p-4">
                  <SongBody
                    body={draft.body}
                    mode="both"
                    shift={shift}
                    preferFlats={preferFlats}
                    sectionNames={t.sections.names}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className={primary}>
                  {t.copy.save}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft({ title: copy.title, artist: copy.artist, body: copy.body });
                    setEditing(false);
                  }}
                  className={secondary}
                >
                  {t.copy.cancel}
                </button>
              </div>
            </form>
          ) : (
            <SongBody
              body={copy.body}
              mode={mode}
              shift={shift}
              preferFlats={preferFlats}
              sectionNames={t.sections.names}
            />
          )}
        </section>

        <aside className="flex flex-col gap-6 rounded-card bg-surface p-5 lg:sticky lg:top-6 lg:w-80 lg:flex-none">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-semibold">{t.copy.display}</legend>
            {modes.map((m) => (
              <label key={m.value} className="flex min-h-9 items-center gap-3">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === m.value}
                  onChange={() => setMode(m.value)}
                  className="size-5 accent-amber"
                />
                {m.label}
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col gap-2">
            <div className="font-semibold">{t.song.key}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changeShift(-1)}
                aria-label={t.song.transposeDown}
                className="flex size-11 items-center justify-center rounded-tile bg-taupe text-ink"
              >
                <IconMinus size={18} />
              </button>
              <div
                aria-live="polite"
                className="flex h-11 flex-1 items-center justify-center rounded-tile bg-ink font-heading text-lg font-bold"
              >
                {currentKey}
              </div>
              <button
                type="button"
                onClick={() => changeShift(1)}
                aria-label={t.song.transposeUp}
                className="flex size-11 items-center justify-center rounded-tile bg-taupe text-ink"
              >
                <IconPlus size={18} />
              </button>
            </div>
            {shift !== 0 && (
              <button
                type="button"
                onClick={() => changeShift(-shift)}
                className="self-start text-sm text-amber underline underline-offset-4"
              >
                {t.song.resetKey} ({copy.originalKey})
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="notes" className="font-semibold">
              {t.copy.notes}
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.copy.notesPlaceholder}
              rows={4}
              className="rounded-tile bg-ink p-3 text-sm placeholder:text-dim"
            />
            <button type="button" onClick={saveNotes} className={secondary}>
              {t.copy.saveNotes}
            </button>
            <p aria-live="polite" className="min-h-5 text-sm">
              {status === 'saved' && <span className="text-success">{t.copy.saved}</span>}
              {status === 'error' && <span className="text-danger">{t.copy.failed}</span>}
            </p>
          </div>

          {!editing && (
            <button type="button" onClick={() => setEditing(true)} className={secondary}>
              {t.copy.edit}
            </button>
          )}

          <Link
            href={`/copies/${copy.id}/stage`}
            className="flex min-h-11 items-center justify-center gap-2 rounded-tile bg-amber px-5 font-semibold text-ink hover:bg-amber-active"
          >
            <IconExpand size={18} />
            {t.song.stageMode}
          </Link>

          {confirmDelete ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm">{t.copy.deleteCopyConfirm}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={deleteCopy}
                  className="min-h-11 rounded-tile bg-danger px-5 font-semibold text-ink"
                >
                  {t.copy.deleteCopy}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className={secondary}>
                  {t.copy.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="self-start text-sm text-danger underline underline-offset-4"
            >
              {t.copy.deleteCopy}
            </button>
          )}
        </aside>
      </div>

      <CopyParameters
        copyId={copy.id}
        body={copy.body}
        initial={{ bpm: copy.bpm, timeSignature: copy.timeSignature, sectionDynamics: copy.sectionDynamics }}
        t={t}
      />
    </main>
  );
}
