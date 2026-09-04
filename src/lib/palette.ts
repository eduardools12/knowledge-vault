/**
 * Colours available for areas and tags.
 *
 * A fixed palette rather than a free colour input, for three reasons: the
 * database enforces `^#[0-9a-fA-F]{6}$` and a picker cannot produce anything
 * else; a dozen curated hues stay distinguishable from one another where
 * arbitrary values quickly do not; and every value here is legible against both
 * the light and the dark background, which a user-chosen colour need not be.
 */
export const PALETTE = [
  { value: "#64748B", label: "Cinza" },
  { value: "#DC2626", label: "Vermelho" },
  { value: "#EA580C", label: "Laranja" },
  { value: "#CA8A04", label: "Âmbar" },
  { value: "#16A34A", label: "Verde" },
  { value: "#0D9488", label: "Turquesa" },
  { value: "#0284C7", label: "Azul" },
  { value: "#4F46E5", label: "Índigo" },
  { value: "#9333EA", label: "Roxo" },
  { value: "#DB2777", label: "Rosa" },
] as const;

export type PaletteColor = (typeof PALETTE)[number]["value"];

export const DEFAULT_COLOR: PaletteColor = "#64748B";

const VALUES: readonly string[] = PALETTE.map((entry) => entry.value);

/**
 * Whether a stored colour is one this application offers.
 *
 * Used when rendering: a value written before the palette changed, or by hand
 * in SQL, still passes the database CHECK but should not be trusted to be
 * legible. Callers fall back to the neutral default.
 */
export function isPaletteColor(value: string | null | undefined): value is PaletteColor {
  return typeof value === "string" && VALUES.includes(value);
}
