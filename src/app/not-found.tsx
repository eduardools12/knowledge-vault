import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="grid gap-2">
        <p className="text-muted-foreground font-mono text-sm">404</p>
        <h1 className="text-xl font-semibold tracking-tight">Página não encontrada</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          O endereço acessado não existe ou o conteúdo foi removido.
        </p>
      </div>

      <Button render={<Link href={ROUTES.home} />} size="lg">
        Voltar para o início
      </Button>
    </main>
  );
}
