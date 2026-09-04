import { LEVEL_BG_CLASS } from "@/components/knowledge/level-indicator";
import { KNOWLEDGE_LEVEL_META, KNOWLEDGE_LEVELS, type KnowledgeLevel } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * How the vault is distributed across the maturity scale.
 *
 * A single stacked bar rather than a chart library: there are four ordered
 * categories summing to a whole, which is the one shape a stacked bar reads
 * better than anything else — and it costs no dependency, no client JavaScript
 * and no loading state.
 *
 * It answers a real question: a vault that is all "Descobri" is a reading list,
 * not knowledge.
 */
export function LevelDistribution({ byLevel }: { byLevel: Record<KnowledgeLevel, number> }) {
  const total = KNOWLEDGE_LEVELS.reduce((sum, level) => sum + byLevel[level], 0);

  if (total === 0) {
    return null;
  }

  return (
    <section aria-labelledby="level-distribution-heading" className="grid gap-3">
      <h2 id="level-distribution-heading" className="text-sm font-medium">
        Maturidade do acervo
      </h2>

      <div
        className="bg-muted flex h-2 w-full overflow-hidden rounded-full"
        // The bar is decorative: the same numbers are listed in the legend
        // below, which is what assistive technology reads.
        aria-hidden="true"
      >
        {KNOWLEDGE_LEVELS.map((level) => {
          const count = byLevel[level];

          if (count === 0) {
            return null;
          }

          return (
            <div
              key={level}
              className={LEVEL_BG_CLASS[level]}
              style={{ width: `${(count / total) * 100}%` }}
            />
          );
        })}
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {KNOWLEDGE_LEVELS.map((level) => {
          const count = byLevel[level];
          const meta = KNOWLEDGE_LEVEL_META[level];

          return (
            <li key={level} className="flex items-center gap-1.5 text-xs">
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  count > 0 ? LEVEL_BG_CLASS[level] : "bg-muted-foreground/25",
                )}
              />
              <span className={count > 0 ? "text-foreground" : "text-muted-foreground"}>
                {meta.label}
              </span>
              <span className="text-muted-foreground tabular-nums">{count}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
