'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Dictionary } from '@/shared/i18n';

type Props = {
  songId: string;
  /** null = гість */
  playlists: { id: string; name: string; roleLabel: string }[] | null;
  t: Dictionary;
};

/** Додає пісню в обраний плейлист: кожне додавання створює нову незалежну копію. */
export function AddToPlaylist({ songId, playlists, t }: Props) {
  const [playlistId, setPlaylistId] = useState(playlists?.[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ copyId: string } | 'error' | null>(null);

  if (playlists === null) {
    return (
      <p className="text-sm text-muted">
        <Link href="/sign-in" className="text-amber underline underline-offset-4">
          {t.nav.signIn}
        </Link>
        : {t.song.signInToAdd}
      </p>
    );
  }

  if (playlists.length === 0) {
    return (
      <p className="text-sm text-muted">
        {t.song.noPlaylists}{' '}
        <Link href="/playlists" className="text-amber underline underline-offset-4">
          {t.song.createPlaylist}
        </Link>
      </p>
    );
  }

  async function add() {
    setBusy(true);
    setResult(null);
    const res = await fetch(`/api/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ songId }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setResult('error');
    const data = (await res.json()) as { copy: { id: string } };
    setResult({ copyId: data.copy.id });
  }

  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface p-4 sm:flex-row sm:items-center">
      <label htmlFor="add-playlist" className="font-semibold">
        {t.song.addToPlaylist}
      </label>
      <select
        id="add-playlist"
        value={playlistId}
        onChange={(e) => setPlaylistId(e.target.value)}
        className="min-h-11 flex-1 rounded-tile bg-ink px-3 text-cream"
      >
        {playlists.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.roleLabel}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={add}
        disabled={busy}
        className="min-h-11 rounded-tile bg-amber px-5 font-semibold text-ink hover:bg-amber-active disabled:cursor-not-allowed disabled:bg-line disabled:text-dim disabled:hover:bg-line disabled:hover:text-dim"
      >
        {t.song.addButton}
      </button>
      <div aria-live="polite" className="text-sm">
        {result === 'error' && <span className="text-danger">{t.playlists.failed}</span>}
        {result && result !== 'error' && (
          <span className="text-success">
            {t.song.added}{' '}
            <Link href={`/copies/${result.copyId}`} className="underline underline-offset-4">
              {t.song.openCopy}
            </Link>
          </span>
        )}
      </div>
    </div>
  );
}
