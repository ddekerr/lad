import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Forbidden } from "@/components/Forbidden";
import { UsersAdmin, type AdminRole, type AdminUser } from "@/components/UsersAdmin";
import { superAdminEmails } from "@/lib/auth/config";
import { can, isSuperAdminEmail } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.admin.usersTitle };
}

type Props = { searchParams: Promise<{ search?: string }> };

/** Користувачі й ролі: видача й зняття ролей. Лише адмін. */
export default async function UsersPage({ searchParams }: Props) {
  const [user, { locale, t }, { search }] = await Promise.all([
    getCurrentUser(),
    getDictionary(),
    searchParams,
  ]);
  if (!user) redirect("/sign-in");
  if (!can(user.actor, "users:read")) return <Forbidden t={t} />;

  const query = search?.trim() ?? "";
  const [allRoles, rows] = await Promise.all([
    prisma.role.findMany({ orderBy: [{ kind: "asc" }, { key: "asc" }] }),
    prisma.user.findMany({
      where: query ? { email: { contains: query, mode: "insensitive" } } : {},
      orderBy: { email: "asc" },
      take: 100,
      select: { id: true, email: true, roles: { select: { roleId: true } } },
    }),
  ]);

  const nameOf = (r: { nameEn: string; nameUk: string }) => (locale === "uk" ? r.nameUk : r.nameEn);
  const member = allRoles.find((r) => r.key === "member");
  const manageable: AdminRole[] = allRoles
    .filter((r) => r.key !== "member")
    .map((r) => ({ id: r.id, key: r.key, kind: r.kind, name: nameOf(r) }));

  const users: AdminUser[] = rows.map((u) => ({
    id: u.id,
    email: u.email,
    isSuperAdmin: isSuperAdminEmail(u.email, superAdminEmails()),
    roleIds: u.roles.map((r) => r.roleId),
  }));

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t.admin.usersTitle}</h1>
        <span className="self-start rounded-full border border-dashed border-dim bg-line px-2.5 py-0.5 text-xs text-muted">
          {t.admin.adminOnly}
        </span>
      </div>

      <form role="search" className="flex gap-2 sm:max-w-md">
        <label htmlFor="search" className="sr-only">
          {t.admin.search}
        </label>
        <input
          id="search"
          name="search"
          type="search"
          defaultValue={query}
          placeholder={t.admin.search}
          className="h-12 w-full rounded-tile border border-line bg-ink px-3.5 text-base text-cream placeholder:text-dim"
        />
        <button
          type="submit"
          className="h-12 rounded-tile bg-amber px-5 font-semibold text-ink hover:bg-amber-active"
        >
          {t.admin.searchButton}
        </button>
      </form>

      {users.length === 0 ? (
        <p className="rounded-card bg-surface p-8 text-center text-muted">{t.admin.noUsers}</p>
      ) : (
        <UsersAdmin
          users={users}
          roles={manageable}
          memberRoleName={member ? nameOf(member) : "Member"}
          actorIsSuper={user.isSuperAdmin}
          t={t}
        />
      )}
    </main>
  );
}
