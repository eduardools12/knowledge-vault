import type { DashboardSummary } from "@/features/dashboard/queries";
import { ROUTES } from "@/lib/routes";

/**
 * Turns the dashboard aggregates into sentences.
 *
 * The brief for this page was explicit: useful information, not a wall of
 * charts. So the numbers are phrased as things the user can act on — "2 itens
 * esperando na Inbox" with a link — and an insight that does not apply is not
 * rendered at all. A card reading "0" every day trains people to stop looking.
 *
 * Pure on purpose: no database, no React. That makes the wording and the
 * thresholds testable, which is where the bugs in this kind of code live.
 */

export type Insight = {
  /** Stable key for React, and the handle used by the tests. */
  id: string;
  /** `attention` is something waiting on the user; `neutral` is a fact. */
  tone: "attention" | "neutral";
  text: string;
  href?: string;
  actionLabel?: string;
};

/**
 * Portuguese agreement for the counts above. Worth a helper: "1 conhecimentos"
 * is the kind of detail that makes an otherwise careful product feel sloppy.
 */
export function plural(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function buildInsights(summary: DashboardSummary): Insight[] {
  const attention: Insight[] = [];
  const activity: Insight[] = [];

  if (summary.inboxUnprocessed > 0) {
    attention.push({
      id: "inbox",
      tone: "attention",
      text: `${plural(summary.inboxUnprocessed, "item", "itens")} esperando na Inbox.`,
      href: ROUTES.inbox,
      actionLabel: "Processar",
    });
  }

  if (summary.needsReview > 0) {
    attention.push({
      id: "needs-review",
      tone: "attention",
      text: `${plural(summary.needsReview, "conhecimento", "conhecimentos")} ${
        summary.needsReview === 1 ? "venceu" : "venceram"
      } para revisão.`,
      href: ROUTES.reviews,
      actionLabel: "Revisar",
    });
  }

  if (summary.withoutSources > 0) {
    attention.push({
      id: "without-sources",
      tone: "attention",
      text: `${plural(summary.withoutSources, "conhecimento", "conhecimentos")} ainda ${
        summary.withoutSources === 1 ? "não tem" : "não têm"
      } nenhuma fonte.`,
      href: ROUTES.sources,
      actionLabel: "Ver fontes",
    });
  }

  if (summary.addedThisWeek > 0) {
    activity.push({
      id: "added",
      tone: "neutral",
      text: `Você adicionou ${plural(
        summary.addedThisWeek,
        "conhecimento",
        "conhecimentos",
      )} nesta semana.`,
    });
  }

  if (summary.updatedThisWeek > 0) {
    activity.push({
      id: "updated",
      tone: "neutral",
      text: `Você revisitou ${plural(
        summary.updatedThisWeek,
        "conhecimento",
        "conhecimentos",
      )} nesta semana.`,
    });
  }

  if (summary.topAreaThisWeek) {
    activity.push({
      id: "top-area",
      tone: "neutral",
      text: `Nesta semana seu foco foi ${summary.topAreaThisWeek.name}.`,
    });
  }

  // A quiet week is itself worth saying, but only once there is a vault to be
  // quiet about — on an empty vault the onboarding state says it better.
  if (activity.length === 0 && summary.knowledgeTotal > 0) {
    activity.push({
      id: "quiet-week",
      tone: "neutral",
      text: "Nenhuma atividade nos últimos 7 dias.",
    });
  }

  // What is waiting on the user comes first; the retrospective comes after.
  return [...attention, ...activity];
}

/**
 * Whether the vault is empty enough that the dashboard should onboard instead
 * of reporting. Sources and inbox items count: someone who has only captured
 * links has still started, and should not be told the vault is empty.
 */
export function isVaultEmpty(summary: DashboardSummary): boolean {
  return (
    summary.knowledgeTotal === 0 &&
    summary.knowledgeArchived === 0 &&
    summary.sourcesTotal === 0 &&
    summary.inboxUnprocessed === 0
  );
}
