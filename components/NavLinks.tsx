"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ items }: { items: readonly (readonly [string, string])[] }) {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map(([href, label]) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={active ? "font-semibold text-ink underline decoration-2 underline-offset-[6px]" : "text-graphite/70 hover:text-ink"}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
