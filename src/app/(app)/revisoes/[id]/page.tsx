import { InfoIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LevelIndicator } from "@/components/knowledge/level-indicator";
import { PageHeader } from "@/components/common/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GenerateQuestionsButton } from "@/features/reviews/components/generate-questions-button";
import { ReviewRatingForm } from "@/features/reviews/components/review-rating-form";
import { RenderedContent } from "@/features/knowledge/components/rendered-content";
import { getKnowledgeById } from "@/features/knowledge/queries";
import { isDueForReview } from "@/features/reviews/schedule";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const knowledge = await getKnowledgeById(id);

  return { title: knowledge ? `Revisar: ${knowledge.title}` : "Revisar" };
}

export default async function ReviewKnowledgePage({ params }: PageProps) {
  const { id } = await params;
  const knowledge = await getKnowledgeById(id);

  if (!knowledge) {
    notFound();
  }

  const now = new Date();
  const reviewingEarly = !isDueForReview(knowledge.nextReviewAt, now);

  return (
    <>
      <PageHeader title={knowledge.title} description="Leia, tente lembrar antes de olhar, depois avalie como foi." />

      <div className="grid gap-6">
        <LevelIndicator level={knowledge.level} />

        {reviewingEarly ? (
          <Alert>
            <InfoIcon className="size-4" aria-hidden="true" />
            <AlertDescription>
              Este conhecimento ainda não venceu para revisão — você está revisando adiantado, o que também
              conta.
            </AlertDescription>
          </Alert>
        ) : null}

        <GenerateQuestionsButton knowledgeId={knowledge.id} />

        <RenderedContent document={knowledge.content} />

        <div className="grid gap-2">
          <p className="text-muted-foreground text-sm">Como foi lembrar disto?</p>
          <ReviewRatingForm knowledgeId={knowledge.id} />
        </div>
      </div>
    </>
  );
}
