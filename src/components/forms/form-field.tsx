import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * A labelled input with its validation message.
 *
 * Accessibility is handled here once rather than at every call site:
 * `aria-invalid` marks the field for assistive technology, `aria-describedby`
 * ties the message to the input so a screen reader announces it on focus, and
 * `role="alert"` makes a message that appears after submit get announced at all.
 */
export function FormField({
  name,
  label,
  errors,
  hint,
  className,
  ...inputProps
}: {
  name: string;
  label: string;
  errors?: string[];
  hint?: string;
} & Omit<React.ComponentProps<typeof Input>, "name" | "id">) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const errorMessages = errors ?? [];
  const hasError = errorMessages.length > 0;

  // Plain join, not `cn`: this is a list of element ids, and passing it through
  // a Tailwind class merger would be nonsense waiting to misbehave.
  const describedBy = [hasError ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>

      <Input
        id={id}
        name={name}
        aria-invalid={hasError || undefined}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />

      {hint && !hasError ? (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}

      {hasError ? (
        <p id={errorId} role="alert" className="text-destructive text-xs">
          {errorMessages.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
