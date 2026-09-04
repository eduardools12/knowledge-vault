import { useId } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type FieldRenderProps = {
  id: string;
  /** Pass to the control so its message and hint are announced on focus. */
  "aria-describedby": string | undefined;
  /** Pass to the control; `true` only while the field has an error. */
  "aria-invalid": true | undefined;
};

/**
 * A labelled form control with its hint and validation message.
 *
 * The accessibility wiring lives here once instead of at every call site:
 * `aria-invalid` marks the control for assistive technology, `aria-describedby`
 * ties the message to it, and `role="alert"` is what makes a message that
 * appears after submit get announced at all.
 *
 * Children receive the generated id and ARIA attributes, so this works for any
 * control — input, textarea, select, or a composite widget — rather than only
 * the one it happened to be written for.
 */
export function Field({
  label,
  errors,
  hint,
  className,
  children,
}: {
  label: string;
  errors?: string[];
  hint?: string;
  className?: string;
  children: (props: FieldRenderProps) => React.ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const messages = errors ?? [];
  const hasError = messages.length > 0;

  // A plain join, not `cn`: this is a list of element ids, and running it
  // through a Tailwind class merger is nonsense waiting to misbehave.
  const describedBy = [hasError ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ");

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>

      {children({
        id,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": hasError || undefined,
      })}

      {hint && !hasError ? (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}

      {hasError ? (
        <p id={errorId} role="alert" className="text-destructive text-xs">
          {messages.join(" ")}
        </p>
      ) : null}
    </div>
  );
}
