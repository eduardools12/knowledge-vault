"use client";

import { Loader2Icon } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * Submit button wired to the pending state of the form it sits in.
 *
 * `useFormStatus` reads that state from the enclosing `<form>`, so no page has
 * to thread a loading flag down by hand — and no form can forget to disable
 * itself and let an impatient user submit twice.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          {pendingLabel ?? "Aguarde…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
