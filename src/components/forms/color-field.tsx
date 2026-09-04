"use client";

import { useId } from "react";

import { PALETTE } from "@/lib/palette";

/**
 * Colour chooser built from native radio inputs.
 *
 * Radios rather than a custom widget: they submit with the form, they are
 * keyboard-navigable with the arrow keys for free, and a screen reader
 * announces "Verde, 5 de 10" without any ARIA of our own. The swatch is just
 * the label, styled.
 *
 * `sr-only` hides the input visually while leaving it focusable — hiding it
 * with `display: none` would take it out of the tab order and break the
 * keyboard entirely.
 */
export function ColorField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  const groupId = useId();

  return (
    <fieldset className="grid gap-2">
      {/* A fieldset legend is what names a radio group to assistive tech. */}
      <legend className="mb-2 text-sm leading-none font-medium">{label}</legend>

      <div className="flex flex-wrap gap-2">
        {PALETTE.map(({ value, label: colorLabel }) => {
          const id = `${groupId}-${value.slice(1)}`;

          return (
            <div key={value}>
              <input
                type="radio"
                id={id}
                name={name}
                value={value}
                defaultChecked={value === defaultValue}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                title={colorLabel}
                className="border-border ring-offset-background peer-checked:border-foreground peer-focus-visible:ring-ring block size-7 cursor-pointer rounded-full border-2 transition-[box-shadow,border-color] peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2"
                style={{ backgroundColor: value }}
              >
                <span className="sr-only">{colorLabel}</span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
