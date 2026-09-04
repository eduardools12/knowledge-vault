import { DEFAULT_COLOR, isPaletteColor } from "@/lib/palette";
import { cn } from "@/lib/utils";

/**
 * A tag, shown the same way everywhere it appears.
 *
 * The dot carries the colour rather than the whole badge being tinted: a row of
 * ten saturated pills is harder to read than a row of labels, and the colour is
 * a hint, not the information.
 */
export function TagBadge({
  name,
  color,
  className,
}: {
  name: string;
  color: string | null;
  className?: string;
}) {
  // A value stored before the palette changed still passes the database CHECK
  // but is not guaranteed to be legible on both themes.
  const resolved = isPaletteColor(color) ? color : DEFAULT_COLOR;

  return (
    <span
      className={cn(
        "border-border text-foreground inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: resolved }}
      />
      {name}
    </span>
  );
}
