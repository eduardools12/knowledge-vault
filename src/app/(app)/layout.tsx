import { Brand } from "@/components/layout/brand";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLinks } from "@/components/layout/nav-links";
import { UserMenu } from "@/components/layout/user-menu";
import { getCurrentProfile, requireUser } from "@/lib/auth/dal";

/**
 * Shell for every signed-in page.
 *
 * `requireUser()` here is the authoritative check for this whole subtree. The
 * proxy already turned anonymous visitors away, but that check is optimistic by
 * design — this one verifies the token against the Auth server, and Row Level
 * Security backs both of them at the database.
 *
 * Placing it in the layout means a new page under `(app)/` is protected the
 * moment it exists, rather than depending on whoever adds it remembering to.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  return (
    <div className="flex min-h-svh">
      {/*
        The sidebar is its own scroll container pinned to the viewport, so a long
        page body scrolls under it instead of dragging the navigation off-screen.
      */}
      <aside className="bg-sidebar sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r p-4 lg:flex">
        <Brand className="px-2" />
        <NavLinks />
      </aside>

      {/* `min-w-0` stops a wide child (a table, a long URL) from forcing the
          whole layout wider than the viewport. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/85 sticky top-0 z-10 flex h-14 items-center gap-3 border-b px-4 backdrop-blur-sm">
          <div className="lg:hidden">
            <MobileNav />
          </div>
          <Brand className="lg:hidden" />

          <div className="ml-auto">
            <UserMenu name={profile?.displayName ?? null} email={user.email} />
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6">
          {/* Capped for reading comfort: this is a tool people spend long
              sessions reading in, and full-width text is tiring. */}
          <div className="mx-auto w-full max-w-4xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
