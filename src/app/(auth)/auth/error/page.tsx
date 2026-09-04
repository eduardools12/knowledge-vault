import type { Metadata } from "next";

import { ButtonLink } from "@/components/common/button-link";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Não foi possível continuar",
};

/**
 * Where `/auth/confirm` and `/auth/callback` send a failed exchange.
 *
 * The reason is mapped through a fixed table rather than rendered from the
 * query string: reflecting arbitrary text from the URL into the page is how a
 * harmless error screen turns into a phishing surface.
 */
const REASONS: Record<string, { title: string; description: string }> = {
  invalid_link: {
    title: "Link inválido",
    description:
      "O link usado não está completo. Isso costuma acontecer quando o e-mail quebra o endereço em várias linhas — tente copiá-lo por inteiro.",
  },
  expired_link: {
    title: "Link expirado",
    description:
      "Este link já foi usado ou passou do prazo de validade. Solicite um novo para continuar.",
  },
};

const FALLBACK = {
  title: "Não foi possível continuar",
  description: "Ocorreu um problema ao validar seu acesso. Tente novamente.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  // `Object.hasOwn`, not a bare `REASONS[reason]`: a plain object also answers
  // to inherited keys, so `?reason=constructor` and `?reason=__proto__` return
  // a truthy value from Object.prototype, skip the fallback, and render a page
  // with no title and no explanation at all.
  const { title, description } =
    reason && Object.hasOwn(REASONS, reason) ? REASONS[reason] : FALLBACK;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter className="grid gap-2">
        <ButtonLink href={ROUTES.login} size="lg" className="w-full">
          Ir para o login
        </ButtonLink>
        <ButtonLink href={ROUTES.forgotPassword} variant="ghost" size="lg" className="w-full">
          Solicitar novo link
        </ButtonLink>
      </CardFooter>
    </Card>
  );
}
