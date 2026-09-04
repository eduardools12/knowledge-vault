import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { ROUTES, safeRedirectPath } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * PKCE callback.
 *
 * Not used by the email/password flow, which goes through `/auth/confirm`.
 * It exists now because adding an OAuth provider (Etapa futura) or a magic-link
 * option otherwise means introducing an auth entry point later, and auth entry
 * points are the last thing worth improvising.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (!code) {
    redirect(`${ROUTES.authError}?reason=invalid_link`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    redirect(`${ROUTES.authError}?reason=expired_link`);
  }

  redirect(next);
}
