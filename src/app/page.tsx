import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/dal";
import { ROUTES } from "@/lib/routes";

/**
 * The root path has no content of its own: this is a private tool with a single
 * user, so a marketing landing page would be pure ceremony. It simply routes to
 * the vault or to the login screen.
 */
export default async function HomePage() {
  const user = await getCurrentUser();

  redirect(user ? ROUTES.dashboard : ROUTES.login);
}
