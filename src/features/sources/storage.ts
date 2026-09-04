import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { BUCKET } from "@/features/sources/storage-path";
import type { Database } from "@/types/database";

/**
 * Files attached to sources, in the private `vault` bucket.
 *
 * ## Why the browser uploads directly
 *
 * The file goes from the browser straight to Supabase Storage, not through a
 * Server Action. Two reasons: a Server Action body is capped well below the
 * bucket's 50 MB limit, and routing a large file through the Next server would
 * double the bandwidth for no benefit. The bucket's Row Level Security policies
 * were written for exactly this — they scope every object to the `{user_id}/`
 * prefix, so the browser can only write inside its own folder.
 *
 * ## Why the path is still validated here
 *
 * The form submits the resulting path as an ordinary field, and a field can say
 * anything. Storage policies would stop a *write* outside the user's prefix,
 * but nothing stops a crafted form from claiming a path belonging to someone
 * else and having this application render a signed URL for it. `isOwnedPath`
 * is what closes that.
 */

/**
 * A short-lived URL for reading a private file.
 *
 * Signed rather than public, and short rather than long: the link is generated
 * when a page renders, so it only has to outlive the click that follows it.
 */
export async function createSignedUrl(
  supabase: SupabaseClient<Database>,
  path: string,
  expiresInSeconds = 60 * 10,
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds);

  if (error || !data) {
    console.error("[storage] could not sign url:", error?.message);

    return null;
  }

  return data.signedUrl;
}

/**
 * Removes a file, ignoring failure.
 *
 * Called when a source is deleted or its file replaced. A leftover object costs
 * storage; a failed delete that blocked the database write would cost the user
 * their action. The database is the source of truth about what exists.
 */
export async function removeFile(
  supabase: SupabaseClient<Database>,
  path: string | null,
): Promise<void> {
  if (!path) {
    return;
  }

  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) {
    console.error("[storage] could not remove file:", error.message);
  }
}
