/**
 * Every route in the application, in one place.
 *
 * Route strings are needed by the proxy, the navigation, redirects after auth
 * and the tests. Defining them once means a renamed page cannot leave a stale
 * literal behind that silently breaks a redirect or, worse, leaves a private
 * page out of the protected set.
 */
export const ROUTES = {
  home: "/",

  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",

  /** Exchanges the token in an email link for a session. */
  authConfirm: "/auth/confirm",
  /** Exchanges an OAuth / magic-link PKCE code for a session. */
  authCallback: "/auth/callback",
  authError: "/auth/error",

  dashboard: "/dashboard",
  search: "/busca",
  inbox: "/inbox",
  knowledge: "/conhecimentos",
  sources: "/fontes",
  areas: "/areas",
  tags: "/tags",
  projects: "/projetos",
  reviews: "/revisoes",
  graph: "/grafo",
  settings: "/configuracoes",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

/**
 * Pages that only make sense while signed out. An authenticated visitor is
 * bounced to the dashboard instead of being shown a login form again.
 */
const AUTH_ROUTES: readonly string[] = [
  ROUTES.login,
  ROUTES.signup,
  ROUTES.forgotPassword,
];

/**
 * Reachable without a session.
 *
 * `/reset-password` is here because the user arrives from an email link holding
 * a recovery token but no established session yet.
 *
 * `/auth` covers the callback handlers that exchange email tokens for a
 * session; blocking those would make every email link a redirect loop.
 */
const PUBLIC_ROUTES: readonly string[] = [
  ROUTES.home,
  ROUTES.resetPassword,
  ...AUTH_ROUTES,
];

const PUBLIC_PREFIXES: readonly string[] = ["/auth"];

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.includes(pathname);
}

export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true;
  }

  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Validates a `redirectTo` value taken from the query string.
 *
 * Only same-origin, absolute paths are allowed. Without this check an attacker
 * could send `/login?redirectTo=https://evil.example` and have the app hand a
 * freshly authenticated user straight to a phishing page.
 */
export function safeRedirectPath(value: string | null | undefined, fallback: string = ROUTES.dashboard): string {
  if (!value) {
    return fallback;
  }

  // Must be a root-relative path. `//host` and `/\host` are protocol-relative
  // URLs that browsers resolve to a different origin, so they are rejected too.
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }

  return value;
}
