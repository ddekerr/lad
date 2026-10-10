"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconMusic, IconTags, IconUser, IconUsers } from "./icons";

export type NavItem = {
  href: string;
  label: string;
  icon: "music" | "user" | "users" | "tags";
};

const ICONS = { music: IconMusic, user: IconUser, users: IconUsers, tags: IconTags };

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/songs");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Навігація: вузька бічна панель із іконками (комп'ютер) або нижня панель (телефон). */
export function NavLinks({ items, variant }: { items: NavItem[]; variant: "side" | "bottom" }) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = ICONS[item.icon];

        if (variant === "side") {
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={
                "flex size-12 items-center justify-center rounded-[12px] " +
                (active ? "bg-amber text-ink" : "text-taupe hover:text-cream")
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
            aria-current={active ? "page" : undefined}
            className={
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-xs font-semibold " +
              (active ? "text-amber" : "text-taupe")
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
