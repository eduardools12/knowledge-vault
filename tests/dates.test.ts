import { describe, expect, it } from "vitest";

import { formatDate, formatRelativeTime, toDateTimeAttribute } from "@/lib/dates";

/**
 * Timestamps appear on nearly every row of the vault, so getting the wording
 * or the rounding wrong is highly visible. `now` is injected, which is what
 * makes these assertions possible without mocking the clock.
 */

const NOW = new Date("2026-09-04T12:00:00.000Z");

function ago(ms: number): string {
  return new Date(NOW.getTime() - ms).toISOString();
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it("collapses anything under a minute", () => {
    expect(formatRelativeTime(ago(5_000), NOW)).toBe("agora mesmo");
    expect(formatRelativeTime(NOW.toISOString(), NOW)).toBe("agora mesmo");
  });

  it("uses minutes and hours while they are the useful unit", () => {
    expect(formatRelativeTime(ago(5 * MINUTE), NOW)).toBe("há 5 minutos");
    expect(formatRelativeTime(ago(3 * HOUR), NOW)).toBe("há 3 horas");
  });

  it("prefers the word over the number where Portuguese has one", () => {
    // `numeric: "auto"` is what turns "há 1 dia" into "ontem".
    expect(formatRelativeTime(ago(DAY), NOW)).toBe("ontem");
  });

  it("does not round a day up before the day has passed", () => {
    // 25 hours is still yesterday. Rounding rather than truncating would show
    // "há 2 dias" here, which contradicts the calendar.
    expect(formatRelativeTime(ago(25 * HOUR), NOW)).toBe("ontem");
  });

  it("scales to weeks and months", () => {
    // Portuguese names the nearest week and month rather than counting them,
    // which is the whole point of `numeric: "auto"` — "semana passada" reads
    // better than "há 1 semana".
    expect(formatRelativeTime(ago(10 * DAY), NOW)).toBe("semana passada");
    expect(formatRelativeTime(ago(60 * DAY), NOW)).toBe("há 2 meses");
  });

  it("falls back to an absolute date past a year", () => {
    // "há 2 anos" stops being an answer anyone can act on.
    const result = formatRelativeTime(ago(400 * DAY), NOW);

    expect(result).not.toContain("há");
    expect(result).toContain("2025");
  });

  it("handles a future timestamp, such as a scheduled review", () => {
    const tomorrow = new Date(NOW.getTime() + DAY).toISOString();

    expect(formatRelativeTime(tomorrow, NOW)).toBe("amanhã");
  });

  it("returns an empty string for an unparseable value instead of Invalid Date", () => {
    expect(formatRelativeTime("não é uma data", NOW)).toBe("");
    expect(formatRelativeTime("", NOW)).toBe("");
  });
});

describe("formatDate", () => {
  it("formats in pt-BR", () => {
    const result = formatDate("2026-09-04T12:00:00.000Z");

    expect(result).toContain("2026");
    expect(result).toContain("04");
  });

  it("returns an empty string for an invalid value", () => {
    expect(formatDate("qualquer coisa")).toBe("");
  });

  it("keeps a plain calendar date as-is, regardless of the server's timezone", () => {
    // `published_at`, `started_at` and `ended_at` are `date` columns: a bare
    // "2026-08-01" names a day, not an instant. Parsed as a plain `Date`, it
    // becomes UTC midnight, which `Intl.DateTimeFormat` then renders in the
    // server's local zone — anywhere west of UTC, that silently prints
    // "31 de jul." for a date stored as August 1st.
    const result = formatDate("2026-08-01");

    expect(result).toContain("01");
    expect(result).not.toContain("31");
  });

  it("still parses a full timestamp as an instant, not as a plain date", () => {
    // Unlike a bare date, a full timestamp names a real moment — rendering it
    // in the server's local zone is the app's accepted behaviour (see
    // architecture.md), so this only checks the plain-date fast path is not
    // mistakenly applied to it.
    expect(formatDate("2026-01-01T12:00:00.000Z")).not.toBe("");
  });
});

describe("toDateTimeAttribute", () => {
  it("produces a machine-readable value for <time dateTime>", () => {
    expect(toDateTimeAttribute("2026-09-04T12:00:00.000Z")).toBe("2026-09-04T12:00:00.000Z");
  });

  it("is undefined for an invalid value, so the attribute is omitted", () => {
    // Rendering `dateTime=""` would be invalid HTML.
    expect(toDateTimeAttribute("nada")).toBeUndefined();
  });
});
