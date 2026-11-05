'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Dictionary } from '@/shared/i18n';

/** Форма нового сетліста: після створення відкриває його редактор, щоб додати пісні. */
export function SetlistCreateForm({ t }: { t: Dictionary }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(false);
    const res = await fetch('/api/setlists', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, items: [] }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { setlist?: { id: string } } | null;
    setBusy(false);
    if (!res?.ok || !data?.setlist) return setError(true);
    router.push(`/setlists/${data.setlist.id}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-card bg-surface p-5">
      <label htmlFor="setlist-name" className="font-semibold">
        {t.setlists.create}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="setlist-name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.setlists.namePlaceholder}
          className="min-h-11 flex-1 rounded-tile bg-ink px-4 text-cream placeholder:text-dim"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="min-h-11 rounded-tile bg-amber px-6 font-semibold text-ink hover:bg-amber-active disabled:cursor-not-allowed disabled:bg-line disabled:text-dim disabled:hover:bg-line disabled:hover:text-dim"
        >
          {t.setlists.create}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t.setlists.failed}
        </p>
      )}
    </form>
  );
}
