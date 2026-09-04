"use client";

import { RotateCcwIcon } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Error boundary for anything that throws during a render.
 *
 * `error.message` is not shown. In production Next.js replaces it with a
 * generic string anyway, and in development printing it here would put internal
 * detail — table names, query text — on screen. The `digest` is enough to match
 * the incident to the server log.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error", error);
  }, [error]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="grid gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Algo deu errado</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Não foi possível carregar esta página. Seus dados não foram alterados.
        </p>
        {error.digest ? (
          <p className="text-muted-foreground font-mono text-xs">Código: {error.digest}</p>
        ) : null}
      </div>

      <Button onClick={reset} size="lg">
        <RotateCcwIcon className="size-4" aria-hidden="true" />
        Tentar novamente
      </Button>
    </main>
  );
}
