import { CheckIcon, type LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";

/**
 * A section that has a route and a place in the sidebar, but no screen yet.
 *
 * It states plainly which stage builds it and what it will do, instead of the
 * usual "Coming soon" — a section that is honest about being unbuilt is far
 * less confusing than one that looks broken. Every one of these is replaced by
 * a real page in its own stage.
 */
export function StagePlaceholder({
  icon: Icon,
  title,
  description,
  stage,
  willDo,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  stage: string;
  /** Concrete capabilities, so the placeholder doubles as the section's brief. */
  willDo: string[];
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        action={<Badge variant="secondary">{stage}</Badge>}
      />

      <div className="rounded-lg border border-dashed p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-full">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium">Esta seção entra na {stage}.</p>
        </div>

        <p className="text-muted-foreground mb-3 text-sm">O que ela vai permitir:</p>

        <ul className="grid gap-2">
          {willDo.map((item) => (
            <li key={item} className="text-muted-foreground flex items-start gap-2 text-sm">
              <CheckIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
