import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/dal";
import { ROUTES } from "@/lib/routes";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Redefinir senha",
};

export default async function ResetPasswordPage() {
  // Arriving here means `/auth/confirm` already exchanged the recovery token
  // for a session. If there is none, the link was expired, already used, or the
  // page was opened directly — all of which need a fresh email, so say so
  // instead of showing a form that could only fail on submit.
  const user = await getCurrentUser();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link inválido ou expirado</CardTitle>
          <CardDescription>
            Links de recuperação valem por tempo limitado e só podem ser usados uma vez.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button render={<Link href={ROUTES.forgotPassword} />} size="lg" className="w-full">
            Solicitar novo link
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Redefinir senha</CardTitle>
        <CardDescription>Escolha uma nova senha para {user.email}.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
