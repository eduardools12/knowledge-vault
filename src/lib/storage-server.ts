import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { BUCKET } from "@/lib/storage";
import type { Database } from "@/types/database";

/**
 * Server-side operations on the private `vault` bucket, shared by every
 * feature that attaches a file — sources and inbox items so far.
 *
 * Kept apart from `storage.ts`: that module's constants and `isOwnedPath` are
 * isomorphic and run in the browser too, while signing a URL or deleting an
 * object must never ship to the client.
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
 * Called when an owning record is deleted or its file replaced. A leftover
 * object costs storage; a failed delete that blocked the database write would
 * cost the user their action. The database is the source of truth about what
 * exists.
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
