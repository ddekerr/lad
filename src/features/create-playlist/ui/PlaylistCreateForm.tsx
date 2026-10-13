"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dictionary } from "@/shared/i18n";

/** Форма нового плейлиста у поточному контексті ролі (musicRoleId = null означає «без ролі»). */
export function PlaylistCreateForm({
  musicRoleId,
  t,
}: {
  musicRoleId: string | null;
  t: Dictionary;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(false);
    const res = await fetch("/api/playlists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, musicRoleId }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(true);
    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-card bg-surface p-5">
      <label htmlFor="playlist-name" className="font-semibold">
        {t.playlists.newPlaylist}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="playlist-name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.playlists.namePlaceholder}
          className="min-h-11 flex-1 rounded-tile bg-ink px-4 text-cream placeholder:text-dim"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="min-h-11 rounded-tile bg-amber px-6 font-semibold text-ink hover:bg-amber-active disabled:opacity-50"
        >
          {t.playlists.create}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {t.playlists.failed}
        </p>
      )}
    </form>
  );
}
