"use client";

import { Field } from "@/components/forms/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AreaOption = { id: string; name: string; depth: number };

/** Sentinel for "no area". A Base UI select item cannot carry an empty value. */
export const NO_AREA = "none";

/**
 * A flat, indented select built from an area tree.
 *
 * Shared by the area form (picking a parent) and the knowledge form (picking
 * an area): both need the same thing — a `Select` whose items are a flattened
 * tree, indented so it still reads as a hierarchy. `options` is expected
 * pre-flattened and pre-filtered by the caller, since what counts as a valid
 * choice differs — an area cannot be its own parent, but it can file its own
 * knowledge.
 */
export function AreaSelectField({
  name,
  label,
  hint,
  options,
  defaultValue,
  errors,
  noneLabel = "Nenhuma",
}: {
  name: string;
  label: string;
  hint?: string;
  options: AreaOption[];
  defaultValue?: string | null;
  errors?: string[];
  noneLabel?: string;
}) {
  // Base UI reads the trigger label from `items`, not from the selected
  // option's children.
  const items: Record<string, string> = {
    [NO_AREA]: noneLabel,
    ...Object.fromEntries(
      options.map((option) => [
        option.id,
        // Indentation is what makes a flat select read as a tree.
        `${"— ".repeat(option.depth)}${option.name}`,
      ]),
    ),
  };

  return (
    <Field label={label} hint={hint} errors={errors}>
      {(field) => (
        <Select name={name} items={items} defaultValue={defaultValue ?? NO_AREA}>
          <SelectTrigger id={field.id} aria-describedby={field["aria-describedby"]}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(items).map(([value, optionLabel]) => (
              <SelectItem key={value} value={value}>
                {optionLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Field>
  );
}
