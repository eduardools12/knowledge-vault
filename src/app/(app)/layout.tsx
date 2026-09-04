import { LibraryBigIcon } from "lucide-react";
import Link from "next/link";

import { SignOutButton } from "@/components/layout/sign-out-button";
import { getCurrentProfile, requireUser } from "@/lib/auth/dal";
import { ROUTES } from "@/lib/routes";

/**
 * Shell for every signed-in page.
 *
 * `requireUser()` here is the authoritative check for this whole subtree. The
 * proxy already redirected anonymous visitors, but that check is optimistic by
 * design — this one verifies the token against the Auth server, and Row Level
 * Security backs both of them at the database.
 *
 * Navigation is deliberately minimal at this stage; the full sidebar arrives
 * with Etapa 2, once there are sections worth navigating to.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-background/80 sticky top-0 z-10 border-b backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Link href={ROUTES.dashboard} className="flex items-center gap-2 font-medium">
            <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
              <LibraryBigIcon className="size-4" aria-hidden="true" />
            </span>
            <span className="tracking-tight">Knowledge Vault</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {profile?.displayName ?? user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
