import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Supabase client for Client Components.
 *
 * Holds only the anon key and is fully constrained by Row Level Security, so
 * it is safe to ship to the browser. Prefer Server Components and Server
 * Actions for data access; reach for this only where the browser genuinely
 * needs to talk to Supabase directly (realtime subscriptions, direct uploads).
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
