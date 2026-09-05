import { z } from "zod";

/**
 * Environment access, validated once at module load.
 *
 * Two rules are enforced here so they cannot be broken elsewhere:
 *
 * 1. Missing configuration fails loudly at startup with a readable message,
 *    instead of surfacing later as an opaque "Invalid API key" from Supabase.
 * 2. Secrets never reach the browser. `serverEnv` is guarded by a runtime check
 *    that throws if it is evaluated in a client bundle.
 *
 * `process.env.X` is referenced literally rather than through a variable
 * because Next.js inlines `NEXT_PUBLIC_*` values at build time by static
 * analysis; a dynamic lookup would silently produce `undefined` in the browser.
 */

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({
    error: "NEXT_PUBLIC_SUPABASE_URL must be the full https URL of the Supabase project.",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, "NEXT_PUBLIC_SUPABASE_ANON_KEY looks too short to be a valid key."),
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
});

const serverEnvSchema = z.object({
  /**
   * Bypasses Row Level Security. Only ever used by trusted server-side jobs
   * (embedding generation, from Etapa 11). Optional so the app runs without it.
   */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),

  /**
   * Only read by `src/lib/ai/anthropic-provider.ts`, and only at the moment
   * something actually calls the AI client — Etapa 9 has no feature that
   * does yet. Optional so the app runs without it until then.
   */
  ANTHROPIC_API_KEY: z.string().min(20).optional(),
});

function parseOrThrow<T extends z.ZodType>(schema: T, value: unknown, scope: string): z.infer<T> {
  const result = schema.safeParse(value);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Invalid ${scope} environment configuration:\n${details}\n\n` +
        "Copy .env.example to .env.local and fill in the values from your Supabase project settings.",
    );
  }

  return result.data;
}

export const env = parseOrThrow(
  publicEnvSchema,
  {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  "public",
);

let cachedServerEnv: z.infer<typeof serverEnvSchema> | null = null;

/**
 * Server-only configuration. Throws if reached from the browser, so a bad
 * import turns into a build-time-visible crash rather than a leaked secret.
 */
export function getServerEnv(): z.infer<typeof serverEnvSchema> {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() was called in the browser. Server secrets must never be bundled.");
  }

  cachedServerEnv ??= parseOrThrow(
    serverEnvSchema,
    { SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY },
    "server",
  );

  return cachedServerEnv;
}
