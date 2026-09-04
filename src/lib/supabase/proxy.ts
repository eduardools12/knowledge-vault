import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { isAuthRoute, isPublicRoute, ROUTES } from "@/lib/routes";
import type { Database } from "@/types/database";

/**
 * Refreshes the Supabase session and performs the *optimistic* auth check.
 *
 * Two distinct jobs, both of which have to happen here:
 *
 * 1. **Token refresh.** Server Components cannot write cookies, so a session
 *    whose access token expired mid-browse can only be renewed at this layer.
 *    Skipping it produces the classic "randomly logged out" bug.
 *
 * 2. **Optimistic redirect.** This runs on every request, including prefetches,
 *    so it deliberately does no database work. It is a UX shortcut, not a
 *    security boundary — the real check lives in the data access layer
 *    (`src/lib/auth/dal.ts`) and, ultimately, in Row Level Security.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          response = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }

          // Supabase hands us `Cache-Control: no-store` and friends whenever a
          // response carries auth cookies. These must be forwarded: a CDN or
          // reverse proxy that caches such a response would serve one user's
          // session token to the next visitor.
          for (const [header, headerValue] of Object.entries(headers)) {
            response.headers.set(header, headerValue);
          }
        },
      },
    },
  );

  // Verifies the JWT rather than trusting the cookie's contents. With
  // asymmetric signing keys this is a local verification with no network round
  // trip, which matters because this code runs on every single request.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  const { pathname, search } = request.nextUrl;

  if (!isAuthenticated && !isPublicRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = ROUTES.login;
    redirectUrl.search = "";
    // Preserve where the user was heading so login can return them there.
    redirectUrl.searchParams.set("redirectTo", `${pathname}${search}`);

    return copyCookies(response, NextResponse.redirect(redirectUrl));
  }

  if (isAuthenticated && isAuthRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = ROUTES.dashboard;
    redirectUrl.search = "";

    return copyCookies(response, NextResponse.redirect(redirectUrl));
  }

  return response;
}

/**
 * Carries refreshed auth cookies onto a redirect.
 *
 * Building a fresh `NextResponse` discards anything Supabase wrote to the
 * previous one. Dropping those cookies would throw away a token that was just
 * refreshed and log the user out on the very next request.
 */
function copyCookies(from: NextResponse, to: NextResponse): NextResponse {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }

  return to;
}
