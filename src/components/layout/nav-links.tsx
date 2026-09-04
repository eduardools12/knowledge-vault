"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActiveNavItem, NAV_GROUPS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * The navigation list itself, shared by the desktop rail and the mobile sheet.
 *
 * A Client Component only because the active item depends on the current path.
 * `onNavigate` lets the mobile sheet close itself on selection; the desktop
 * rail passes nothing.
 */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Seções" className="grid gap-6">
      {NAV_GROUPS.map((group, index) => (
        <div key={group.label ?? `group-${index}`} className="grid gap-1">
          {group.label ? (
            <h2 className="text-muted-foreground px-2 pb-1 text-xs font-medium tracking-wide uppercase">
              {group.label}
            </h2>
          ) : null}

          {group.items.map(({ href, label, icon: Icon, stage }) => {
            const isActive = isActiveNavItem(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                // `aria-current` is what tells a screen reader which item is the
                // current page. Colour alone says nothing to anyone not looking.
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>

                {stage ? (
                  <span className="text-muted-foreground/70 ml-auto text-[10px] tabular-nums">
                    {stage}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
