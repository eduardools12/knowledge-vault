import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import type { FormState } from "@/lib/forms";

/**
 * Form-level feedback: the message that belongs to the submission as a whole
 * rather than to one field.
 *
 * Rendered in a live region so the outcome is announced to a screen reader
 * user, who otherwise gets no signal that anything happened after submit.
 */
export function FormAlert({ state }: { state: FormState }) {
  if (!state.message || state.status === "idle") {
    return null;
  }

  const isError = state.status === "error";
  const Icon = isError ? TriangleAlertIcon : CircleCheckIcon;

  return (
    <div aria-live="polite">
      <Alert variant={isError ? "destructive" : "default"}>
        <Icon className="size-4" aria-hidden="true" />
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    </div>
  );
}
