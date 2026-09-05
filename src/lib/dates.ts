/**
 * Date formatting for the interface, in pt-BR.
 *
 * `Intl` does the work rather than a date library: it already knows that
 * "ontem" beats "há 1 dia", and it costs nothing in bundle size.
 *
 * `now` is a parameter, not `Date.now()` read inside. That is what makes the
 * output testable without freezing the clock, and it lets a page render every
 * timestamp against a single instant instead of drifting mid-render.
 */

const relativeFormatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

const absoluteFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * "agora mesmo", "há 5 minutos", "ontem", "há 3 semanas".
 *
 * Falls back to an absolute date beyond a year, where "há 2 anos" stops being
 * the useful answer.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);

  if (Number.isNaN(then.getTime())) {
    return "";
  }

  const diff = then.getTime() - now.getTime();
  const magnitude = Math.abs(diff);

  if (magnitude < MINUTE) {
    return "agora mesmo";
  }

  if (magnitude >= YEAR) {
    return absoluteFormatter.format(then);
  }

  const [unit, size]: [Intl.RelativeTimeFormatUnit, number] =
    magnitude < HOUR
      ? ["minute", MINUTE]
      : magnitude < DAY
        ? ["hour", HOUR]
        : magnitude < WEEK
          ? ["day", DAY]
          : magnitude < MONTH
            ? ["week", WEEK]
            : ["month", MONTH];

  // Rounding toward zero keeps "há 1 dia" from appearing after 25 hours while
  // the calendar still says yesterday.
  return relativeFormatter.format(Math.trunc(diff / size), unit);
}

/** A bare `YYYY-MM-DD`, with no time or zone of its own. */
const PLAIN_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * "04 de set. de 2026" — used where an exact date matters more than recency.
 *
 * A plain calendar date (`published_at`, a project's `started_at`/`ended_at`)
 * names a day, not an instant. Handed straight to `Date`, it parses as UTC
 * midnight, and `Intl.DateTimeFormat` then renders that instant in the
 * server's local zone — which silently shifts the displayed day backward
 * everywhere west of UTC. Building the date from its parts instead keeps a
 * calendar date exactly the day it was stored as, regardless of server
 * timezone. A full timestamp (`created_at` and the like) still goes through
 * plain `Date` parsing, unaffected.
 */
export function formatDate(iso: string): string {
  const plain = PLAIN_DATE.exec(iso);
  const date = plain
    ? new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]))
    : new Date(iso);

  return Number.isNaN(date.getTime()) ? "" : absoluteFormatter.format(date);
}

/** Machine-readable value for a `<time dateTime>` attribute. */
export function toDateTimeAttribute(iso: string): string | undefined {
  const date = new Date(iso);

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
