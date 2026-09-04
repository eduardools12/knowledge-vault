import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { ROUTES, safeRedirectPath } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Landing point for every link Supabase sends by email.
 *
 * The email template passes a single-use `token_hash`, which is exchanged here
 * for a real session. Route Handlers can write cookies, which Server Components
 * cannot, so this exchange has to happen at this layer.
 *
 * Configure the Supabase email templates to point at:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .EmailActionType }}
 */

/**
 * Only the flows this application actually initiates. Casting the query
 * parameter straight to `EmailOtpType` would let a crafted link drive a
 * verification flow the app never intended to support.
 */
const ALLOWED_OTP_TYPES = new Set<EmailOtpType>(["signup", "recovery", "email_change", "email", "invite"]);

function parseOtpType(value: string | null): EmailOtpType | null {
  if (value && ALLOWED_OTP_TYPES.has(value as EmailOtpType)) {
    return value as EmailOtpType;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = parseOtpType(searchParams.get("type"));
  const next = safeRedirectPath(searchParams.get("next"));

  if (!tokenHash || !type) {
    redirect(`${ROUTES.authError}?reason=invalid_link`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    // Expired and already-used links are the common case here, and both mean
    // the user needs to request a fresh email.
    redirect(`${ROUTES.authError}?reason=expired_link`);
  }

  redirect(next);
}
