import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env, getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Supabase client for trusted, unattended server code — the embedding worker,
 * so far. Holds the service role key and bypasses Row Level Security
 * entirely, so it must never be reachable from a request driven by an
 * end-user session. It exists to do exactly what RLS is designed to prevent
 * an ordinary client from doing: read across every user's content to process
 * the shared `embedding_jobs` queue, and write to `embeddings`, which no
 * `authenticated` policy allows.
 *
 * No cookies, no session — unlike `createSupabaseServerClient()`, one
 * instance is safe to reuse across requests, because there is no per-user
 * state to leak between them.
 */
export function createSupabaseServiceClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não está configurada. Necessária para processar a fila de embeddings.",
    );
  }

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
