import { BookMarkedIcon, InboxIcon, LibraryBigIcon, RepeatIcon, SparklesIcon } from "lucide-react";
import type { Metadata } from "next";

import { ButtonLink } from "@/components/common/button-link";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { InsightList } from "@/features/dashboard/components/insight-list";
import { LevelDistribution } from "@/features/dashboard/components/level-distribution";
import { RecentKnowledge } from "@/features/dashboard/components/recent-knowledge";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { buildInsights, isVaultEmpty } from "@/features/dashboard/insights";
import {
  getDashboardSummary,
  getRecentlyAdded,
  getRecentlyUpdated,
} from "@/features/dashboard/queries";
import { getCurrentProfile } from "@/lib/auth/dal";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  // Fetched together rather than in sequence: three independent reads against a
  // database in São Paulo, so awaiting them one after another would triple the
  // page's latency for no reason.
  const [profile, summary, recentlyAdded, recentlyUpdated] = await Promise.all([
    getCurrentProfile(),
    getDashboardSummary(),
    getRecentlyAdded(),
    getRecentlyUpdated(),
  ]);

  // One instant for the whole render, so two rows saved a second apart cannot
  // end up described against different "nows".
  const now = new Date();
  const firstName = profile?.displayName?.trim().split(/\s+/)[0];

  if (isVaultEmpty(summary)) {
    return (
      <>
        <PageHeader
          title={firstName ? `Olá, ${firstName}` : "Bem-vindo"}
          description="Seu acervo está vazio. Ele começa a ficar útil no momento em que você joga a primeira coisa aqui dentro."
        />

        <EmptyState
          icon={SparklesIcon}
          title="Comece pela captura"
          description="Não tente organizar tudo de uma vez. Jogue links, ideias e anotações na Inbox e transforme em conhecimento estruturado quando fizer sentido."
          action={
            <ButtonLink href={ROUTES.inbox} size="lg">
              Ir para a Inbox
            </ButtonLink>
          }
        />
      </>
    );
  }

  const insights = buildInsights(summary);

  return (
    <>
      <PageHeader
        title={firstName ? `Olá, ${firstName}` : "Dashboard"}
        description="O que está no acervo e o que está esperando por você."
      />

      <div className="grid gap-10">
        <section aria-label="Resumo do acervo" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Conhecimentos"
            value={summary.knowledgeTotal}
            icon={LibraryBigIcon}
            href={ROUTES.knowledge}
          />
          <StatCard
            label="Fontes"
            value={summary.sourcesTotal}
            icon={BookMarkedIcon}
            href={ROUTES.sources}
          />
          <StatCard
            label="Na Inbox"
            value={summary.inboxUnprocessed}
            icon={InboxIcon}
            href={ROUTES.inbox}
            highlight
          />
          <StatCard
            label="Para revisar"
            value={summary.needsReview}
            icon={RepeatIcon}
            href={ROUTES.reviews}
            highlight
          />
        </section>

        {insights.length > 0 ? (
          <section aria-labelledby="insights-heading" className="grid gap-3">
            <h2 id="insights-heading" className="text-sm font-medium">
              Vale a sua atenção
            </h2>
            <InsightList insights={insights} />
          </section>
        ) : null}

        <LevelDistribution byLevel={summary.byLevel} />

        {/*
          `items-start` matters: without it the grid stretches both columns to
          the taller one, and the shorter list — itself a grid — spreads its
          rows out to fill the extra height, so two items end up floating far
          apart for no reason the reader can see.
        */}
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <RecentKnowledge
            title="Adicionados recentemente"
            items={recentlyAdded}
            timestampField="createdAt"
            emptyMessage="Nenhum conhecimento cadastrado ainda."
            now={now}
          />
          <RecentKnowledge
            title="Editados recentemente"
            items={recentlyUpdated}
            timestampField="updatedAt"
            emptyMessage="Nada foi editado depois de criado."
            now={now}
          />
        </div>
      </div>
    </>
  );
}
