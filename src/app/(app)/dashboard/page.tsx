import type { Metadata } from "next";
import { BoxesIcon, InboxIcon, LibraryBigIcon, TagsIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Placeholder dashboard.
 *
 * Etapa 1 covers architecture, database and authentication, so this page exists
 * to prove the protected route and the session actually work end to end. The
 * real dashboard — counts, recent items, what needs review — arrives in Etapa 2
 * on top of the tables that already exist in the schema.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  const sections = [
    { icon: LibraryBigIcon, title: "Conhecimentos", description: "Etapa 3" },
    { icon: InboxIcon, title: "Inbox", description: "Etapa 5" },
    { icon: BoxesIcon, title: "Áreas e fontes", description: "Etapa 4" },
    { icon: TagsIcon, title: "Tags", description: "Etapa 4" },
  ];

  return (
    <div className="grid gap-8">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá, {profile?.displayName ?? user.email}
        </h1>
        <p className="text-muted-foreground text-sm">
          A base está pronta: banco modelado, autenticação funcionando e as páginas privadas
          protegidas. As seções abaixo entram nas próximas etapas.
        </p>
      </header>

      <section aria-label="Próximas seções" className="grid gap-4 sm:grid-cols-2">
        {sections.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Icon className="text-muted-foreground size-4" aria-hidden="true" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">Em breve.</CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
