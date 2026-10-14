import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { MusicRolesAdmin, type MusicRoleRow } from '@/widgets/music-roles-admin';
import { can } from '@/entities/user';
import { getCurrentUser } from '@/server/auth/session';
import { prisma } from '@/server/db';
import { getDictionary } from '@/server/i18n';
import { Forbidden } from '@/shared/ui';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.admin.rolesTitle };
}

/** Довідник музичних ролей. Лише супер-адмін. */
export default async function MusicRolesPage() {
  const [user, { locale, t }] = await Promise.all([getCurrentUser(), getDictionary()]);
  if (!user) redirect('/sign-in');
  if (!can(user.actor, 'musicRoles:manage')) return <Forbidden t={t} />;

  const roles = await prisma.role.findMany({
    where: { kind: 'music' },
    orderBy: { key: 'asc' },
  });
  const rows: MusicRoleRow[] = roles.map((r) => ({
    id: r.id,
    key: r.key,
    nameEn: r.nameEn,
    nameUk: r.nameUk,
    name: locale === 'uk' ? r.nameUk : r.nameEn,
  }));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{t.admin.rolesTitle}</h1>
        <p className="text-muted">{t.admin.rolesIntro}</p>
        <span className="self-start rounded-full border border-dashed border-dim bg-line px-2.5 py-0.5 text-xs text-muted">
          {t.admin.superOnly}
        </span>
      </div>
      <MusicRolesAdmin roles={rows} t={t} />
    </main>
  );
}
