import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 renamed the `middleware` convention to `proxy`. The file must sit
 * next to `app/` (so `src/proxy.ts`) and the runtime is always Node.js.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  /**
   * Runs on everything except static assets and image files.
   *
   * The exclusions matter for more than speed: without them the auth redirect
   * would also intercept CSS, JS chunks and images, and an unauthenticated
   * visitor would be served a redirect in place of the stylesheet for the very
   * login page they were sent to.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)$).*)",
  ],
};
