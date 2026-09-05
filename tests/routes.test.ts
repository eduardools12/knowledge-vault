import { describe, expect, it } from "vitest";

import { ROUTES, isAuthRoute, isPublicRoute, safeRedirectPath } from "@/lib/routes";

/**
 * These functions decide who reaches which page and where a login sends people
 * afterwards. A mistake here is a security bug, not a cosmetic one, which is
 * why they are pure and tested rather than inlined into the proxy.
 */

describe("isPublicRoute", () => {
  it("allows the pages a signed-out visitor must reach", () => {
    for (const route of [
      ROUTES.home,
      ROUTES.login,
      ROUTES.signup,
      ROUTES.forgotPassword,
      ROUTES.resetPassword,
    ]) {
      expect(isPublicRoute(route)).toBe(true);
    }
  });

  it("allows the auth callback handlers, so email links do not loop", () => {
    expect(isPublicRoute(ROUTES.authConfirm)).toBe(true);
    expect(isPublicRoute(ROUTES.authCallback)).toBe(true);
    expect(isPublicRoute(ROUTES.authError)).toBe(true);
  });

  it("protects every application route", () => {
    for (const route of [
      ROUTES.dashboard,
      ROUTES.inbox,
      ROUTES.knowledge,
      ROUTES.sources,
      ROUTES.areas,
      ROUTES.tags,
      ROUTES.projects,
      ROUTES.reviews,
      ROUTES.graph,
      ROUTES.settings,
    ]) {
      expect(isPublicRoute(route)).toBe(false);
    }
  });

  it("protects nested paths under a protected route", () => {
    expect(isPublicRoute(`${ROUTES.knowledge}/alguma-nota`)).toBe(false);
    expect(isPublicRoute(`${ROUTES.settings}/perfil`)).toBe(false);
  });

  it("does not treat a path that merely starts with a public prefix as public", () => {
    // `/authenticate` shares a prefix with `/auth` but is a different route;
    // matching on the raw string would quietly expose it.
    expect(isPublicRoute("/authenticate")).toBe(false);
    expect(isPublicRoute("/auth-admin")).toBe(false);
    expect(isPublicRoute("/apixyz")).toBe(false);
  });

  it("allows every API route, so each one can apply its own authorization", () => {
    // Etapa 11: the embedding worker (src/app/api/jobs/embeddings) is called
    // by Vercel Cron, which carries no session cookie at all. Without this,
    // the proxy would redirect the cron request to /login before the route's
    // own CRON_SECRET check ever ran.
    expect(isPublicRoute("/api/jobs/embeddings")).toBe(true);
    expect(isPublicRoute("/api/anything")).toBe(true);
  });
});

describe("isAuthRoute", () => {
  it("identifies the pages a signed-in user should be bounced away from", () => {
    expect(isAuthRoute(ROUTES.login)).toBe(true);
    expect(isAuthRoute(ROUTES.signup)).toBe(true);
    expect(isAuthRoute(ROUTES.forgotPassword)).toBe(true);
  });

  it("leaves the password reset page reachable while signed in", () => {
    // A recovery link establishes a session before this page renders, so
    // treating it as an auth route would redirect the user away from the very
    // form they were sent to complete.
    expect(isAuthRoute(ROUTES.resetPassword)).toBe(false);
  });
});

describe("safeRedirectPath", () => {
  it("keeps a same-origin path", () => {
    expect(safeRedirectPath("/conhecimentos/python")).toBe("/conhecimentos/python");
    expect(safeRedirectPath("/inbox?status=unprocessed")).toBe("/inbox?status=unprocessed");
  });

  it("falls back when nothing was requested", () => {
    expect(safeRedirectPath(null)).toBe(ROUTES.dashboard);
    expect(safeRedirectPath(undefined)).toBe(ROUTES.dashboard);
    expect(safeRedirectPath("")).toBe(ROUTES.dashboard);
  });

  it("rejects absolute URLs pointing at another origin", () => {
    expect(safeRedirectPath("https://evil.example/phish")).toBe(ROUTES.dashboard);
    expect(safeRedirectPath("http://evil.example")).toBe(ROUTES.dashboard);
  });

  it("rejects protocol-relative URLs", () => {
    // `//evil.example` is resolved by browsers against the current scheme and
    // lands on a foreign origin, despite starting with a slash.
    expect(safeRedirectPath("//evil.example")).toBe(ROUTES.dashboard);
    expect(safeRedirectPath("/\\evil.example")).toBe(ROUTES.dashboard);
  });

  it("rejects scheme-based payloads", () => {
    expect(safeRedirectPath("javascript:alert(1)")).toBe(ROUTES.dashboard);
    expect(safeRedirectPath("data:text/html,<script>")).toBe(ROUTES.dashboard);
  });

  it("honours an explicit fallback", () => {
    expect(safeRedirectPath(null, ROUTES.inbox)).toBe(ROUTES.inbox);
  });
});
