
import { LevelIndicator } from "@/components/knowledge/level-indicator";
import type { KnowledgeListItem } from "@/features/dashboard/queries";
import { formatRelativeTime, toDateTimeAttribute } from "@/lib/dates";

/**
 * A short list of knowledge records, used for both "recently added" and
 * "recently edited".
 *
 * `timestampField` picks which date the row is describing, so the two lists do
 * not silently show the same value under different headings.
 */
export function RecentKnowledge({
  title,
  items,
  timestampField,
  emptyMessage,
  now,
}: {
  title: string;
  items: KnowledgeListItem[];
  timestampField: "createdAt" | "updatedAt";
  emptyMessage: string;
  /** A single instant for the whole page, so the rows stay consistent. */
  now: Date;
}) {
  return (
    <section className="grid gap-3">
      <h2 className="text-sm font-medium">{title}</h2>

      {items.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
          {emptyMessage}
        </p>
      ) : (
        <ul className="grid gap-px overflow-hidden rounded-lg border">
          {items.map((item) => {
            const timestamp = item[timestampField];

            return (
              <li key={item.id} className="bg-card px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid min-w-0 gap-1">
                    {/*
                      Knowledge detail pages arrive in Etapa 3. Rendering the
                      title as plain text until then is better than a link that
                      lands on a 404.
                    */}
                    <span className="truncate text-sm font-medium">{item.title}</span>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <LevelIndicator level={item.level} />
                      {item.area ? (
                        <span className="text-muted-foreground truncate text-xs">
                          {item.area.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 text-xs">Sem área</span>
                      )}
                    </div>
                  </div>

                  <time
                    dateTime={toDateTimeAttribute(timestamp)}
                    className="text-muted-foreground shrink-0 text-xs whitespace-nowrap"
                  >
                    {formatRelativeTime(timestamp, now)}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
