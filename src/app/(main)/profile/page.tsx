import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getDictionary } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.profile.title };
}

/** Профіль: email, ролі (лише перегляд), мова, вихід. */
export default async function ProfilePage() {
  const [user, { locale, t }] = await Promise.all([getCurrentUser(), getDictionary()]);
  if (!user) redirect("/sign-in");

  const roles = await prisma.role.findMany({
    where: { key: { in: user.roles } },
    orderBy: [{ kind: "asc" }, { key: "asc" }],
  });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t.profile.title}</h1>

      <section className="rounded-card bg-surface p-5">
        <div className="text-sm text-muted">{t.profile.email}</div>
        <div className="font-semibold">{user.email}</div>
      </section>

      <section className="flex flex-col gap-3 rounded-card bg-surface p-5">
        <h2 className="font-heading text-base font-medium">{t.profile.roles}</h2>
        <ul className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <li
              key={role.id}
              className={
                "rounded-full px-3 py-1 text-sm font-semibold " +
                (role.key === "member" ? "bg-amber text-ink" : "bg-line text-cream")
              }
            >
              {locale === "uk" ? role.nameUk : role.nameEn}
            </li>
          ))}
          {user.isSuperAdmin && (
            <li className="rounded-full border border-amber px-3 py-1 text-sm font-semibold text-amber">
              {t.profile.superAdmin}
            </li>
          )}
        </ul>
        <p className="text-sm text-muted">{t.profile.rolesHint}</p>
      </section>

      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          className="min-h-12 w-full rounded-tile border border-danger px-5 font-semibold text-danger hover:bg-surface sm:w-auto"
        >
          {t.profile.signOut}
        </button>
      </form>
    </main>
  );
}
