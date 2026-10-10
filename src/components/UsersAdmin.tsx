"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fmt, type Dictionary } from "@/lib/i18n/dictionaries";
import { IconWarning } from "./icons";

export type AdminRole = {
  id: string;
  key: string;
  kind: "system" | "music";
  /** Назва мовою інтерфейсу */
  name: string;
};

export type AdminUser = {
  id: string;
  email: string;
  isSuperAdmin: boolean;
  roleIds: string[];
};

type Props = {
  users: AdminUser[];
  /** Ролі, якими можна керувати (без Member) */
  roles: AdminRole[];
  memberRoleName: string;
  actorIsSuper: boolean;
  t: Dictionary;
};

type Pending = { role: AdminRole; playlists: number; copies: number };

const buttonBase = "min-h-11 rounded-tile px-5 font-semibold disabled:opacity-60";

/** Список користувачів: розкрити картку, відмітити ролі, зберегти. */
export function UsersAdmin({ users, roles, memberRoleName, actorIsSuper, t }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ul className="flex flex-col gap-3">
      {users.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          roles={roles}
          memberRoleName={memberRoleName}
          actorIsSuper={actorIsSuper}
          t={t}
          open={openId === user.id}
          onToggle={() => setOpenId(openId === user.id ? null : user.id)}
        />
      ))}
    </ul>
  );
}

function UserCard({
  user,
  roles,
  memberRoleName,
  actorIsSuper,
  t,
  open,
  onToggle,
}: Omit<Props, "users"> & { user: AdminUser; open: boolean; onToggle: () => void }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(user.roleIds));
  const [pending, setPending] = useState<Pending[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const original = new Set(user.roleIds);
  const toAdd = roles.filter((r) => selected.has(r.id) && !original.has(r.id));
  const toRemove = roles.filter((r) => !selected.has(r.id) && original.has(r.id));
  const changed = toAdd.length + toRemove.length > 0;

  /** Чи можна змінювати цю роль: роль Admin лише для супер-адміна, і не в самого супер-адміна. */
  function lockReason(role: AdminRole): string | null {
    if (role.key !== "admin") return null;
    if (user.isSuperAdmin) return t.admin.superAdminLocked;
    if (!actorIsSuper) return t.admin.adminSuperOnlyHint;
    return null;
  }

  function toggle(role: AdminRole) {
    setMessage(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(role.id)) next.delete(role.id);
      else next.add(role.id);
      return next;
    });
  }

  async function apply() {
    setBusy(true);
    setMessage(null);
    try {
      for (const role of toAdd) {
        const response = await fetch(`/api/users/${user.id}/roles`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ roleId: role.id }),
        });
        if (!response.ok) throw new Error("grant_failed");
      }
      for (const role of toRemove) {
        const response = await fetch(`/api/users/${user.id}/roles/${role.id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("revoke_failed");
      }
      setPending(null);
      setMessage({ kind: "ok", text: t.admin.saved });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: t.admin.failed });
    } finally {
      setBusy(false);
    }
  }

  /** Перед зняттям музичної ролі показуємо, скільки плейлистів і копій буде видалено. */
  async function save() {
    const musicRemovals = toRemove.filter((r) => r.kind === "music");
    if (musicRemovals.length === 0) {
      await apply();
      return;
    }
    setBusy(true);
    try {
      const list: Pending[] = [];
      for (const role of musicRemovals) {
        const response = await fetch(`/api/users/${user.id}/roles/${role.id}/impact`);
        if (!response.ok) throw new Error("impact_failed");
        const data = (await response.json()) as {
          impact: { playlists: number; copies: number };
        };
        list.push({ role, ...data.impact });
      }
      setPending(list);
    } catch {
      setMessage({ kind: "error", text: t.admin.failed });
    } finally {
      setBusy(false);
    }
  }

  const currentNames = roles.filter((r) => original.has(r.id)).map((r) => r.name);

  return (
    <li
      className={
        "rounded-[16px] bg-surface p-4 " + (open ? "border border-amber" : "border border-transparent")
      }
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{user.email}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-amber px-2.5 py-0.5 text-xs font-semibold text-ink">
              {memberRoleName}
            </span>
            {currentNames.map((name) => (
              <span
                key={name}
                className="rounded-full bg-line px-2.5 py-0.5 text-xs font-semibold"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="min-h-10 rounded-tile border border-dim px-4 text-sm font-semibold hover:bg-line"
        >
          {open ? t.admin.close : t.admin.manage}
        </button>
      </div>

      {open && (
        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
          <label className="flex min-h-11 items-center gap-3 text-muted">
            <input type="checkbox" checked disabled className="size-5 accent-amber" />
            {memberRoleName} <span className="text-xs">({t.admin.memberAlways})</span>
          </label>

          {roles.map((role) => {
            const reason = lockReason(role);
            return (
              <div key={role.id}>
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(role.id)}
                    disabled={reason !== null || busy}
                    onChange={() => toggle(role)}
                    className="size-5 accent-amber"
                  />
                  {role.name}
                </label>
                {reason && <p className="ml-8 text-xs text-muted">{reason}</p>}
              </div>
            );
          })}

          {pending && (
            <section
              role="alertdialog"
              aria-label={t.admin.removeConfirm}
              className="flex flex-col gap-3 rounded-card border border-danger bg-ink p-4"
            >
              {pending.map(({ role, playlists, copies }) => (
                <div key={role.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <IconWarning size={20} className="text-danger" />
                    {fmt(t.admin.removeTitle, { role: role.name })}
                  </div>
                  <p className="text-sm text-muted">{fmt(t.admin.removeBody, { playlists, copies })}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={apply}
                  className={`${buttonBase} flex-1 bg-danger text-ink`}
                >
                  {t.admin.removeConfirm}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPending(null)}
                  className={`${buttonBase} border border-dim`}
                >
                  {t.admin.keep}
                </button>
              </div>
            </section>
          )}

          {!pending && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!changed || busy}
                onClick={save}
                className={`${buttonBase} bg-amber text-ink hover:bg-amber-active`}
              >
                {busy ? t.admin.saving : t.admin.save}
              </button>
              {message && (
                <span
                  role="status"
                  className={message.kind === "ok" ? "text-sm text-success" : "text-sm text-danger"}
                >
                  {message.text}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
