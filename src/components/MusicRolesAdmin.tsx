"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { fmt, type Dictionary } from "@/lib/i18n/dictionaries";
import { IconWarning } from "./icons";

export type MusicRoleRow = { id: string; key: string; name: string; nameEn: string; nameUk: string };

type Props = { roles: MusicRoleRow[]; t: Dictionary };

type Impact = { users: number; playlists: number; copies: number };

const inputClass =
  "h-12 w-full rounded-tile border border-line bg-ink px-3.5 text-base text-cream placeholder:text-dim";

/** Довідник музичних ролей: додати, видалити (з підтвердженням і підрахунком наслідків). Лише супер-адмін. */
export function MusicRolesAdmin({ roles, t }: Props) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameUk, setNameUk] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ role: MusicRoleRow; impact: Impact } | null>(null);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, nameEn, nameUk }),
      });
      if (response.ok) {
        setKey("");
        setNameEn("");
        setNameUk("");
        router.refresh();
        return;
      }
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(
        data.error === "key_taken"
          ? t.admin.keyTaken
          : data.error === "invalid_key"
            ? t.admin.invalidKey
            : data.error === "invalid_name"
              ? t.admin.invalidName
              : t.admin.failed,
      );
    } catch {
      setError(t.admin.failed);
    } finally {
      setBusy(false);
    }
  }

  async function askDelete(role: MusicRoleRow) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/roles/${role.id}/impact`);
      if (!response.ok) throw new Error("impact_failed");
      const data = (await response.json()) as { impact: Impact };
      setConfirm({ role, impact: data.impact });
    } catch {
      setError(t.admin.failed);
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!confirm) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/roles/${confirm.role.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete_failed");
      setConfirm(null);
      router.refresh();
    } catch {
      setError(t.admin.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="rounded-tile border border-danger bg-surface px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {roles.map((role) => (
          <li key={role.id} className="flex items-center gap-3 rounded-[16px] bg-surface px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{role.name}</div>
              <div className="truncate text-sm text-muted">
                {role.key} · {role.nameEn} / {role.nameUk}
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => askDelete(role)}
              className="min-h-10 rounded-tile border border-danger px-4 text-sm font-semibold text-danger hover:bg-line disabled:opacity-60"
            >
              {t.admin.delete}
            </button>
          </li>
        ))}
      </ul>

      {confirm && (
        <section
          role="alertdialog"
          aria-label={t.admin.deleteConfirm}
          className="flex flex-col gap-3 rounded-card border border-danger bg-ink p-4"
        >
          <div className="flex items-center gap-2 font-semibold">
            <IconWarning size={20} className="text-danger" />
            {fmt(t.admin.deleteTitle, { role: confirm.role.name })}
          </div>
          <p className="text-sm text-muted">{fmt(t.admin.deleteBody, confirm.impact)}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={doDelete}
              className="min-h-11 flex-1 rounded-tile bg-danger px-5 font-semibold text-ink disabled:opacity-60"
            >
              {t.admin.deleteConfirm}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirm(null)}
              className="min-h-11 rounded-tile border border-dim px-5 font-semibold"
            >
              {t.admin.keep}
            </button>
          </div>
        </section>
      )}

      <form onSubmit={create} className="flex flex-col gap-3 rounded-card bg-surface p-5">
        <h2 className="font-heading text-base font-medium">{t.admin.addRole}</h2>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t.admin.roleKey}
          <input
            value={key}
            onChange={(e) => setKey(e.target.value.toLowerCase())}
            required
            autoComplete="off"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t.admin.roleNameEn}
          <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t.admin.roleNameUk}
          <input value={nameUk} onChange={(e) => setNameUk(e.target.value)} required className={inputClass} />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 self-start rounded-tile bg-amber px-6 font-semibold text-ink hover:bg-amber-active disabled:opacity-60"
        >
          {t.admin.create}
        </button>
      </form>
    </div>
  );
}
