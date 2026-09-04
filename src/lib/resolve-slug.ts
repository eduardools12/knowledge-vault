import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { slugify, uniqueSlug } from "@/lib/slug";
import type { Database } from "@/types/database";

/** Tables whose rows carry a per-user unique slug. */
type SluggedTable = "areas" | "tags" | "projects";

/**
 * Picks a slug for a name that is not already taken by this user.
 *
 * The existing slugs are read through the caller's own client, so Row Level
 * Security scopes the check to their rows — the uniqueness constraint is per
 * user, and two people may both have an area called "Dados".
 *
 * Returns `null` when the name reduces to nothing usable (only emoji or
 * punctuation), leaving the decision to the caller instead of producing an
 * empty string the database would reject.
 */
export async function resolveUniqueSlug(
  supabase: SupabaseClient<Database>,
  table: SluggedTable,
  name: string,
  /** The row being edited, so its own slug does not count as taken. */
  excludeId?: string,
): Promise<string | null> {
  const base = slugify(name);

  if (!base) {
    return null;
  }

  let query = supabase.from(table).select("slug");

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;

  if (error) {
    // Falling back to the bare slug rather than failing: the unique constraint
    // is the real guarantee, and the action turns a violation into a readable
    // message. Better a rare "esse nome já existe" than a blocked save.
    console.error(`[slug] could not read existing ${table} slugs:`, error.message);

    return base;
  }

  return uniqueSlug(
    base,
    (data ?? []).map((row) => row.slug),
  );
}

/** Postgres unique-violation, which here always means a duplicate name. */
export const UNIQUE_VIOLATION = "23505";
