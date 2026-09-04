import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ROUTES } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Data Access Layer for identity.
 *
 * This is the authoritative auth check. `proxy.ts` only performs an optimistic
 * redirect for UX; anything that reads or writes user data must go through
 * `requireUser()` so the check sits as close to the data as possible.
 *
 * `server-only` makes an accidental import from a Client Component a build
 * error rather than a runtime leak.
 */

/**
 * The signed-in user, or `null`.
 *
 * Uses `getUser()`, which revalidates the token with the Supabase Auth server,
 * rather than `getSession()`, which merely decodes the cookie. The cookie is
 * user-controlled storage, so trusting it without verification would let anyone
 * hand-craft a session.
 *
 * Wrapped in React's `cache` so several components in one render share a single
 * verification instead of each issuing their own request.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    // An expired or malformed token is the ordinary "not signed in" case, not
    // an exceptional one. Treat it as absence of a user.
    return null;
  }

  return data.user;
});

/**
 * The signed-in user, or a redirect to the login page.
 *
 * Use this at the top of every protected page, layout, Server Action and Route
 * Handler. Returning a non-nullable `User` means downstream code cannot forget
 * to handle the anonymous case.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(ROUTES.login);
  }

  return user;
}

export type Profile = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  locale: string;
};

/**
 * The profile row belonging to the signed-in user.
 *
 * Returns `null` rather than throwing when the row is missing: the profile is
 * created by a database trigger at signup, and a page should degrade to showing
 * the email address rather than erroring if that row is ever absent.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, locale")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  // Renamed to camelCase at the boundary so snake_case stops at the database
  // layer instead of spreading through every component that touches a profile.
  return {
    id: data.id,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    locale: data.locale,
  };
});
