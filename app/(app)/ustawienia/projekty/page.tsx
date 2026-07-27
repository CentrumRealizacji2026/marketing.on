import type { Metadata } from "next";

import { RowsEditor } from "@/components/forms/rows-editor";
import { projectDefault, projectFields, projectToRow } from "@/components/forms/specs";
import { Card, CardHeader } from "@/components/ui/card";
import { saveProjects } from "@/lib/actions/config";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getProjects } from "@/lib/queries/config";

export const metadata: Metadata = { title: "Projekty" };
export const dynamic = "force-dynamic";

export default async function ProjectSettingsPage() {
  const user = await requireOnboardedUser();
  const rows = await getProjects(user.id);

  return (
    <Card>
      <CardHeader
        title="Projekty"
        subtitle="Mentor w trybie kierownika projektów pyta o wąskie gardła właśnie tutaj — pole „następny krok” jest najważniejsze."
      />
      <RowsEditor
        fields={projectFields}
        initial={rows.map(projectToRow)}
        defaultRow={projectDefault}
        action={saveProjects}
        addLabel="Dodaj projekt"
        emptyHint="Nie masz jeszcze projektów."
        titleFields={["name"]}
        itemNoun="Projekt"
      />
    </Card>
  );
}
