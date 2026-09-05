import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { ProjectSummary } from "@/features/projects/queries";
import { formatRelativeTime, toDateTimeAttribute } from "@/lib/dates";
import { PROJECT_STATUS_LABELS } from "@/lib/domain";
import { ROUTES } from "@/lib/routes";

export function ProjectListItem({ project, now }: { project: ProjectSummary; now: Date }) {
  return (
    <li>
      {/* The whole row is the link, same as the knowledge and source lists —
          a title-only target is a small thing to hit, especially on a phone. */}
      <Link
        href={`${ROUTES.projects}/${project.id}`}
        className="bg-card hover:bg-accent/40 focus-visible:ring-ring block px-4 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:-outline-offset-2"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="grid min-w-0 gap-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{project.name}</span>

              <Badge variant="outline" className="shrink-0">
                {PROJECT_STATUS_LABELS[project.status]}
              </Badge>
            </div>

            {project.description ? (
              <p className="text-muted-foreground line-clamp-2 text-sm">{project.description}</p>
            ) : null}

            <span className="text-muted-foreground text-xs tabular-nums">
              {project.knowledgeCount}{" "}
              {project.knowledgeCount === 1 ? "conhecimento vinculado" : "conhecimentos vinculados"}
            </span>
          </div>

          <time
            dateTime={toDateTimeAttribute(project.createdAt)}
            className="text-muted-foreground shrink-0 text-xs whitespace-nowrap"
          >
            {formatRelativeTime(project.createdAt, now)}
          </time>
        </div>
      </Link>
    </li>
  );
}
