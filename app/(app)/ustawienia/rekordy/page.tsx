import type { Metadata } from "next";

import { RowsEditor } from "@/components/forms/rows-editor";
import { recordDefault, recordFields, recordToRow } from "@/components/forms/specs";
import { Card, CardHeader } from "@/components/ui/card";
import { savePersonalRecords } from "@/lib/actions/config";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getPersonalRecords } from "@/lib/queries/config";

export const metadata: Metadata = { title: "Rekordy" };
export const dynamic = "force-dynamic";

export default async function RecordsSettingsPage() {
  const user = await requireOnboardedUser();
  const rows = await getPersonalRecords(user.id);

  return (
    <Card>
      <CardHeader
        title="Rekordy"
        subtitle="Każdy wiersz to jeden wynik. Aktualny rekord aplikacja wybiera sama — najlepszy w danej dyscyplinie i metryce."
      />
      <RowsEditor
        fields={recordFields}
        initial={rows.map(recordToRow)}
        defaultRow={recordDefault}
        action={savePersonalRecords}
        addLabel="Dodaj wynik"
        emptyHint="Nie masz jeszcze zapisanych wyników. Dodaj pierwszy rekord."
        titleFields={["discipline", "metric"]}
      />
    </Card>
  );
}
