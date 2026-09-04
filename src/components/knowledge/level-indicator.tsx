import { KNOWLEDGE_LEVEL_META, type KnowledgeLevel } from "@/lib/domain";
import { cn } from "@/lib/utils";

/**
 * Colours for the maturity scale.
 *
 * Written out one by one rather than built from the level name: Tailwind scans
 * source text for complete class names, so `bg-level-${level}` would compile to
 * nothing and every dot would render transparent.
 */
export const LEVEL_BG_CLASS: Record<KnowledgeLevel, string> = {
  discovered: "bg-level-discovered",
  understood: "bg-level-understood",
  practiced: "bg-level-practiced",
  mastered: "bg-level-mastered",
};

/**
 * A level shown as a coloured dot plus its name.
 *
 * The name is always present. Colour alone would carry the whole meaning
 * otherwise, which fails for anyone who cannot distinguish the four hues — and
 * for anyone using a screen reader.
 */
export function LevelIndicator({
  level,
  className,
  showLabel = true,
}: {
  level: KnowledgeLevel;
  className?: string;
  showLabel?: boolean;
}) {
  const meta = KNOWLEDGE_LEVEL_META[level];

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <span
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full", LEVEL_BG_CLASS[level])}
      />
      {showLabel ? (
        <span className="text-muted-foreground">{meta.label}</span>
      ) : (
        <span className="sr-only">{meta.label}</span>
      )}
    </span>
  );
}
