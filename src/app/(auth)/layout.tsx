import { LibraryBigIcon } from "lucide-react";
import Link from "next/link";

import { ROUTES } from "@/lib/routes";

/**
 * Shell for the signed-out pages.
 *
 * Deliberately plain: a single centred column, no navigation, nothing to click
 * except the form. Anything else on these pages is a distraction from the one
 * action the visitor came to complete.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link
          href={ROUTES.home}
          className="mb-8 flex items-center justify-center gap-2 font-medium"
        >
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md">
            <LibraryBigIcon className="size-4" aria-hidden="true" />
          </span>
          <span className="text-lg tracking-tight">Knowledge Vault</span>
        </Link>

        {children}
      </div>
    </main>
  );
}
