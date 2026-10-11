"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CopyState } from "@/lib/copies";
import { moveItem } from "@/lib/copies";
import { fmt, type Dictionary } from "@/lib/i18n/dictionaries";
import { IconArrowDown, IconArrowUp, IconChevronLeft, IconClose, IconExpand } from "./icons";
import { CopyStateBadge } from "./CopyStateBadge";

type Props = {
  playlist: { id: string; name: string; roleLabel: string; roleId: string | null };
  copies: { id: string; title: string; artist: string; state: CopyState }[];
  t: Dictionary;
};

const iconButton =
  "flex size-11 flex-none items-center justify-center rounded-tile bg-line text-cream hover:bg-taupe hover:text-ink disabled:opacity-30";

/** Плейлист: порядок копій, перейменування, видалення, перехід до сцени. */
export function PlaylistView({ playlist, copies: initial, t }: Props) {
  const router = useRouter();
  const [copies, setCopies] = useState(initial);
  const [name, setName] = useState(playlist.name);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(false);

  const back = `/playlists?role=${playlist.roleId ?? "none"}`;

  async function call(url: string, method: string, body?: unknown): Promise<boolean> {
    setError(false);
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).catch(() => null);
    if (!res?.ok) setError(true);
    return Boolean(res?.ok);
  }

  async function move(index: number, delta: -1 | 1) {
    const next = moveItem(copies, copies[index], delta);
    const previous = copies;
    setCopies(next);
    const ok = await call(`/api/playlists/${playlist.id}/songs/order`, "PATCH", {
      copyIds: next.map((c) => c.id),
    });
    if (!ok) setCopies(previous);
  }

  async function removeCopy(id: string) {
    if (!(await call(`/api/copies/${id}`, "DELETE"))) return;
    setCopies((list) => list.filter((c) => c.id !== id));
  }

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (await call(`/api/playlists/${playlist.id}`, "PATCH", { name })) {
      setEditing(false);
      router.refresh();
    }
  }

  async function deletePlaylist() {
    if (await call(`/api/playlists/${playlist.id}`, "DELETE")) router.push(back);
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={back}
          className="inline-flex items-center gap-1.5 self-start text-sm text-muted hover:text-cream"
        >
          <IconChevronLeft size={18} />
          {t.playlists.back}
        </Link>

        {editing ? (
          <form onSubmit={rename} className="flex flex-col gap-3 sm:flex-row">
            <input
              value={name}
              maxLength={80}
              aria-label={t.playlists.rename}
              onChange={(e) => setName(e.target.value)}
              className="min-h-11 flex-1 rounded-tile bg-surface px-4 text-cream"
            />
            <button
              type="submit"
              className="min-h-11 rounded-tile bg-amber px-6 font-semibold text-ink"
            >
              {t.playlists.save}
            </button>
            <button
              type="button"
              onClick={() => {
                setName(playlist.name);
                setEditing(false);
              }}
              className="min-h-11 rounded-tile bg-line px-6"
            >
              {t.playlists.cancel}
            </button>
          </form>
        ) : (
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">{playlist.name}</h1>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-line px-2.5 py-0.5 text-xs font-semibold">
            {playlist.roleLabel}
          </span>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-sm text-amber underline underline-offset-4"
            >
              {t.playlists.rename}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="flex min-h-11 items-center rounded-tile bg-amber px-5 font-semibold text-ink hover:bg-amber-active"
        >
          {t.playlists.addSongs}
        </Link>
        {copies.length > 0 && (
          <Link
            href={`/copies/${copies[0].id}/stage`}
            className="flex min-h-11 items-center gap-2 rounded-tile bg-line px-5 font-semibold"
          >
            <IconExpand size={18} />
            {t.playlists.stage}
          </Link>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {t.playlists.failed}
        </p>
      )}

      {copies.length === 0 ? (
        <p className="rounded-card bg-surface p-6 text-muted">{t.playlists.emptySongs}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {copies.map((c, i) => (
            <li key={c.id} className="flex items-center gap-2 rounded-card bg-surface p-3">
              <span className="w-7 flex-none text-center text-sm text-muted">{i + 1}</span>
              <Link href={`/copies/${c.id}`} className="min-w-0 flex-1 px-1 py-1">
                <div className="truncate font-semibold">{c.title}</div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <span className="truncate">{c.artist}</span>
                  <CopyStateBadge state={c.state} t={t} />
                </div>
              </Link>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={t.playlists.moveUp}
                className={iconButton}
              >
                <IconArrowUp size={18} />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === copies.length - 1}
                aria-label={t.playlists.moveDown}
                className={iconButton}
              >
                <IconArrowDown size={18} />
              </button>
              <button
                type="button"
                onClick={() => removeCopy(c.id)}
                aria-label={t.playlists.remove}
                title={t.playlists.remove}
                className={iconButton}
              >
                <IconClose size={18} />
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="border-t border-line pt-6">
        {confirmDelete ? (
          <div className="flex flex-col gap-3 rounded-card bg-surface p-5">
            <div className="font-semibold">
              {fmt(t.playlists.deleteTitle, { name: playlist.name })}
            </div>
            <p className="text-sm text-muted">
              {fmt(t.playlists.deleteBody, { count: copies.length })}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={deletePlaylist}
                className="min-h-11 rounded-tile bg-danger px-6 font-semibold text-ink"
              >
                {t.playlists.deleteConfirm}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-11 rounded-tile bg-line px-6"
              >
                {t.playlists.cancel}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-danger underline underline-offset-4"
          >
            {t.playlists.delete}
          </button>
        )}
      </div>
    </main>
  );
}
