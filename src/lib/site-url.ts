import "server-only";

import { headers } from "next/headers";

import { env } from "@/lib/env";

/**
 * Absolute origin of the running application, used to build the links that go
 * into confirmation and password-reset emails.
 *
 * `NEXT_PUBLIC_SITE_URL` is preferred and should always be set in production.
 * The `Host` header fallback exists so local development and preview
 * deployments work without configuration, but it is attacker-influenced: a
 * forged `X-Forwarded-Host` could otherwise point a password-reset link at
 * another domain.
 *
 * The real control is Supabase's redirect allowlist — a link whose origin is
 * not on that list is rejected by the Auth server regardless of what we send.
 * Keep the allowlist tight and this fallback stays harmless.
 */
export async function getSiteUrl(): Promise<string> {
  if (env.NEXT_PUBLIC_SITE_URL) {
    return env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");

  if (!host) {
    throw new Error(
      "Could not determine the site URL. Set NEXT_PUBLIC_SITE_URL so auth emails link to the right origin.",
    );
  }

  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}
