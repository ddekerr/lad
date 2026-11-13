'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { moveSetlistItem, shiftItemKey } from '@/entities/setlist';
import { fmt, type Dictionary } from '@/shared/i18n';
import { transposeKey } from '@/shared/lib/chords';
import { IconArrowDown, IconArrowUp, IconChevronLeft, IconClose, IconMinus, IconPlus, IconSearch } from '@/shared/ui';

type Item = { key: string; songId: string; title: string; artist: string; originalKey: string; keyShift: number };
type FoundSong = { id: string; title: string; artist: string; originalKey: string };

type Props = {
  setlist: { id: string; name: string; items: Omit<Item, 'key'>[] };
  /** Сцена, що йде зараз, якщо вона є */
  stage: { leaderName: string; setlistName: string; onThis: boolean; mine: boolean } | null;
  t: Dictionary;
};

const iconButton =
  'flex size-11 flex-none items-center justify-center rounded-tile bg-line text-cream hover:bg-taupe hover:text-ink disabled:cursor-not-allowed disabled:bg-line disabled:text-dim disabled:hover:bg-line disabled:hover:text-dim';
const primary =
  'flex min-h-11 items-center justify-center rounded-tile bg-amber px-5 font-semibold text-ink hover:bg-amber-active disabled:cursor-not-allowed disabled:bg-line disabled:text-dim disabled:hover:bg-line disabled:hover:text-dim';
const secondary =
  'flex min-h-11 items-center justify-center rounded-tile bg-line px-5 font-semibold text-cream hover:bg-taupe hover:text-ink';

let counter = 0;
const nextKey = () => `item-${(counter += 1)}`;

/** Редактор сетліста: назва, порядок і тональність пісень, пошук у каталозі, запуск сцени. */
export function SetlistEditor({ setlist, stage, t }: Props) {
  const router = useRouter();
  const [name, setName] = useState(setlist.name);
  const [items, setItems] = useState<Item[]>(() => setlist.items.map((item) => ({ ...item, key: nextKey() })));
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | { error: string }>('idle');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<FoundSong[] | null>(null);
  const locked = Boolean(stage?.onThis);

  // Пошук у каталозі з невеликою затримкою, щоб не питати сервер після кожної літери.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setFound(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/songs?q=${encodeURIComponent(q)}`).catch(() => null);
      const data = (await res?.json().catch(() => null)) as { songs?: FoundSong[] } | null;
      if (!cancelled) setFound(data?.songs?.slice(0, 20) ?? []);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function change(next: Item[]) {
    setItems(next);
    setDirty(true);
    setStatus('idle');
  }

  const move = (index: number, delta: -1 | 1) => {
    const next = moveSetlistItem(items, index, delta);
    if (next) change(next);
  };

  const shiftKey = (index: number, delta: number) => change(shiftItemKey(items, index, delta));

  const add = (song: FoundSong) =>
    change([
      ...items,
      {
        key: nextKey(),
        songId: song.id,
        title: song.title,
        artist: song.artist,
        originalKey: song.originalKey,
        keyShift: 0,
      },
    ]);

  function errorText(code: string | undefined): string {
    const errors: Record<string, string> = t.setlists.errors;
    return errors[code ?? ''] ?? t.setlists.errors.generic;
  }

  async function save(): Promise<boolean> {
    setBusy(true);
    setStatus('idle');
    const res = await fetch(`/api/setlists/${setlist.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, items: items.map(({ songId, keyShift }) => ({ songId, keyShift })) }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!res?.ok) {
      setStatus({ error: errorText(data?.error) });
      return false;
    }
    setDirty(false);
    setStatus('saved');
    router.refresh();
    return true;
  }

  async function remove() {
    const res = await fetch(`/api/setlists/${setlist.id}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) router.push('/setlists');
    else {
      const data = (await res?.json().catch(() => null)) as { error?: string } | null;
      setConfirmDelete(false);
      setStatus({ error: errorText(data?.error) });
    }
  }

  async function start() {
    setBusy(true);
    const res = await fetch('/api/stage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ setlistId: setlist.id }),
    }).catch(() => null);
    setBusy(false);
    // 409: хтось устиг раніше, тож просто показуємо актуальний стан
    if (res?.ok) router.push('/stage');
    else if (res?.status === 409) router.refresh();
    else setStatus({ error: t.setlists.stageStartFailed });
  }

  const startDisabled = busy || dirty || items.length === 0;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/setlists" className="flex min-h-11 w-fit items-center gap-1 text-sm text-muted hover:text-cream">
        <IconChevronLeft size={18} />
        {t.setlists.back}
      </Link>

      <section aria-label={t.setlists.startStage} className="flex flex-col gap-3 rounded-card bg-surface p-5">
        {stage ? (
          <>
            <p>
              {stage.mine
                ? fmt(t.setlists.stageYours, { setlist: stage.setlistName })
                : fmt(t.setlists.stageBusy, { name: stage.leaderName, setlist: stage.setlistName })}
            </p>
            <Link href="/stage" className={primary + ' sm:w-fit'}>
              {stage.mine ? t.setlists.openStage : t.setlists.joinStage}
            </Link>
          </>
        ) : (
          <>
            <button type="button" onClick={start} disabled={startDisabled} className={primary + ' sm:w-fit'}>
              {t.setlists.startStage}
            </button>
            {items.length === 0 && <p className="text-sm text-muted">{t.setlists.stageNeedsSongs}</p>}
            {dirty && items.length > 0 && <p className="text-sm text-amber">{t.setlists.unsaved}</p>}
          </>
        )}
        {locked && <p className="text-sm text-muted">{t.setlists.stageOnThis}</p>}
      </section>

      <div className="flex flex-col gap-2">
        <label htmlFor="setlist-title" className="font-semibold">
          {t.setlists.nameLabel}
        </label>
        <input
          id="setlist-title"
          value={name}
          maxLength={80}
          disabled={locked}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
            setStatus('idle');
          }}
          className="min-h-11 rounded-tile bg-surface px-4 text-cream disabled:text-dim"
        />
      </div>

      {items.length === 0 ? (
        <p className="rounded-card bg-surface p-6 text-muted">{t.setlists.noSongs}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={item.key} className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface px-4 py-3">
              <span className="w-6 flex-none text-center text-sm text-muted">{index + 1}</span>
              <div className="min-w-0 flex-1 basis-40">
                <div className="truncate font-semibold">{item.title}</div>
                <div className="truncate text-sm text-muted">{item.artist}</div>
              </div>
              <div role="group" aria-label={t.setlists.key} className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label={t.setlists.keyDown}
                  disabled={locked}
                  onClick={() => shiftKey(index, -1)}
                  className={iconButton}
                >
                  <IconMinus size={18} />
                </button>
                <span
                  aria-live="polite"
                  className="flex h-11 min-w-12 items-center justify-center rounded-tile bg-ink px-2 font-heading font-bold"
                >
                  {transposeKey(item.originalKey, item.keyShift)}
                </span>
                <button
                  type="button"
                  aria-label={t.setlists.keyUp}
                  disabled={locked}
                  onClick={() => shiftKey(index, 1)}
                  className={iconButton}
                >
                  <IconPlus size={18} />
                </button>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  aria-label={t.setlists.moveUp}
                  disabled={locked || index === 0}
                  onClick={() => move(index, -1)}
                  className={iconButton}
                >
                  <IconArrowUp size={18} />
                </button>
                <button
                  type="button"
                  aria-label={t.setlists.moveDown}
                  disabled={locked || index === items.length - 1}
                  onClick={() => move(index, 1)}
                  className={iconButton}
                >
                  <IconArrowDown size={18} />
                </button>
                <button
                  type="button"
                  aria-label={t.setlists.remove}
                  disabled={locked}
                  onClick={() => change(items.filter((_, i) => i !== index))}
                  className={iconButton}
                >
                  <IconClose size={18} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {!locked && (
        <section aria-label={t.setlists.addSongs} className="flex flex-col gap-3 rounded-card bg-surface p-5">
          <h2 className="font-semibold">{t.setlists.addSongs}</h2>
          <div className="relative">
            <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
            <input
              type="search"
              aria-label={t.setlists.searchLabel}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.setlists.searchPlaceholder}
              className="h-12 w-full rounded-tile bg-ink pl-10 pr-3 text-cream placeholder:text-dim"
            />
          </div>
          {found !== null &&
            (found.length === 0 ? (
              <p className="text-sm text-muted">{t.setlists.noResults}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {found.map((song) => (
                  <li key={song.id} className="flex items-center gap-3 rounded-2xl bg-ink px-4 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{song.title}</div>
                      <div className="truncate text-sm text-muted">
                        {song.artist} · {song.originalKey}
                      </div>
                    </div>
                    <button type="button" onClick={() => add(song)} className={secondary}>
                      {t.setlists.add}
                    </button>
                  </li>
                ))}
              </ul>
            ))}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy || locked || !dirty || !name.trim()} className={primary}>
          {t.setlists.save}
        </button>
        {status === 'saved' && (
          <span role="status" className="text-sm text-success">
            {t.setlists.saved}
          </span>
        )}
        {typeof status === 'object' && (
          <span role="alert" className="text-sm text-danger">
            {status.error}
          </span>
        )}
        <span className="flex-1" />
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>{t.setlists.deleteConfirm}</span>
            <button
              type="button"
              onClick={remove}
              className="min-h-11 rounded-tile bg-danger px-4 font-semibold text-ink"
            >
              {t.setlists.delete}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="min-h-11 rounded-tile bg-line px-4"
            >
              {t.setlists.cancel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={locked}
            onClick={() => setConfirmDelete(true)}
            className="min-h-11 rounded-tile px-3 text-sm text-danger underline underline-offset-4 disabled:cursor-not-allowed disabled:text-dim"
          >
            {t.setlists.delete}
          </button>
        )}
      </div>
    </main>
  );
}
