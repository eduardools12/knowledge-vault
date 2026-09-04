import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { safeRedirectPath } from "@/lib/routes";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesse seu acervo de conhecimento.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Validated here, at the boundary, so an open-redirect payload in the
            query string never reaches the client component. */}
        <LoginForm redirectTo={safeRedirectPath(redirectTo)} />
      </CardContent>
    </Card>
  );
}
