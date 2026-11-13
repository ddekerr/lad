'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconList, IconMusic, IconSetlist, IconTags, IconUser, IconUsers } from '@/shared/ui';
import { isActive } from '../model/is-active';

export type NavItem = {
  href: string;
  label: string;
  icon: 'music' | 'list' | 'setlist' | 'user' | 'users' | 'tags';
};

const ICONS = {
  music: IconMusic,
  list: IconList,
  setlist: IconSetlist,
  user: IconUser,
  users: IconUsers,
  tags: IconTags,
};

/** Навігація: вузька бічна панель із іконками (комп'ютер) або нижня панель (телефон). */
export function NavLinks({ items, variant }: { items: NavItem[]; variant: 'side' | 'bottom' }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = ICONS[item.icon];

        if (variant === 'side') {
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              aria-current={active ? 'page' : undefined}
              className={
                'flex size-12 items-center justify-center rounded-xl ' +
                (active ? 'bg-amber text-ink' : 'text-taupe hover:text-cream')
              }
            >
              <Icon size={22} />
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={
              'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-xs font-semibold ' +
              (active ? 'text-amber' : 'text-taupe')
            }
          >
            <Icon size={22} />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}
