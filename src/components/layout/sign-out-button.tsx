import { LogOutIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";

/**
 * Sign out as a real form submission rather than a click handler.
 *
 * Because it is a POST to a Server Action, it works before hydration and
 * without JavaScript, and it cannot be triggered by a cross-site GET the way a
 * plain link could.
 */
export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant="ghost" size="sm">
        <LogOutIcon className="size-4" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Sair</span>
      </Button>
    </form>
  );
}
