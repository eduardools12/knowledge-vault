import { LibraryBigIcon } from "lucide-react";
import Link from "next/link";

import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <Link
      href={ROUTES.dashboard}
      className={cn(
        "flex items-center gap-2 font-medium tracking-tight",
        "focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      <span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
        <LibraryBigIcon className="size-4" aria-hidden="true" />
      </span>
      <span className="truncate">Knowledge Vault</span>
    </Link>
  );
}
