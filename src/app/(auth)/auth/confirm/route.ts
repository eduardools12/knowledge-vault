import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { ROUTES, safeRedirectPath } from "@/lib/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Landing point for every link Supabase sends by email.
 *
 * The link carries a single-use credential which is exchanged here for a real
 * session. Route Handlers can write cookies, which Server Components cannot, so
 * the exchange has to happen at this layer.
 *
 * Two credential shapes are accepted, because the shape depends on how the
 * email template is written:
 *
 *   token_hash + type   the recommended template, using {{ .TokenHash }}
 *   code                what Supabase's *default* template produces, since
 *                       @supabase/ssr uses the PKCE flow
 *
 * Handling both is deliberate. With only the first, forgetting to edit the
 * email templates turns every confirmation link into "link inválido" — a
 * failure that looks like a bug in the app and is miserable to diagnose from
 * the outside. Preferred template, in Supabase → Authentication → Email
 * Templates:
 *
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .EmailActionType }}
 */

/**
 * Only the flows this application actually initiates. Casting the query
 * parameter straight to `EmailOtpType` would let a crafted link drive a
 * verification flow the app never intended to support.
 */
const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "recovery",
  "email_change",
  "email",
  "invite",
]);

function parseOtpType(value: string | null): EmailOtpType | null {
  if (value && ALLOWED_OTP_TYPES.has(value as EmailOtpType)) {
    return value as EmailOtpType;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = safeRedirectPath(searchParams.get("next"));

  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");

  const invalidLink = `${ROUTES.authError}?reason=invalid_link`;
  // Expired and already-used links are the common failure here, and both mean
  // the same thing to the user: request a fresh email.
  const expiredLink = `${ROUTES.authError}?reason=expired_link`;

  const supabase = await createSupabaseServerClient();

  if (tokenHash) {
    const type = parseOtpType(searchParams.get("type"));

    // A `token_hash` without a recognised `type` is not a link this
    // application issued, so it is rejected rather than guessed at.
    if (!type) {
      redirect(invalidLink);
    }

    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (error) {
      redirect(expiredLink);
    }

    redirect(next);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      redirect(expiredLink);
    }

    redirect(next);
  }

  redirect(invalidLink);
}
