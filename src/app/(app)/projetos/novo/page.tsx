import type { Metadata } from "next";

import { PageHeader } from "@/components/common/page-header";
import { createProjectAction } from "@/features/projects/actions";
import { ProjectForm } from "@/features/projects/components/project-form";

export const metadata: Metadata = {
  title: "Novo projeto",
};

export default function NewProjectPage() {
  return (
    <>
      <PageHeader
        title="Novo projeto"
        description="Registre agora, vincule o que você usou conforme for aplicando."
      />

      <ProjectForm action={createProjectAction} submitLabel="Criar projeto" />
    </>
  );
}
