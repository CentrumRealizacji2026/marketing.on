import type { Metadata } from "next";

import { RowsEditor } from "@/components/forms/rows-editor";
import { medicationDefault, medicationFields, medicationToRow } from "@/components/forms/specs";
import { Card, CardHeader } from "@/components/ui/card";
import { saveMedications } from "@/lib/actions/config";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getMedications } from "@/lib/queries/config";

export const metadata: Metadata = { title: "Leki i suplementy" };
export const dynamic = "force-dynamic";

export default async function MedicationSettingsPage() {
  const user = await requireOnboardedUser();
  const rows = await getMedications(user.id);

  return (
    <Card>
      <CardHeader
        title="Leki i suplementy"
        subtitle="Usunięcie pozycji wyłącza ją z dzisiejszej listy, ale nie kasuje historii przyjmowania."
      />
      <RowsEditor
        fields={medicationFields}
        initial={rows.map(medicationToRow)}
        defaultRow={medicationDefault}
        action={saveMedications}
        addLabel="Dodaj lek lub suplement"
        emptyHint="Nie masz jeszcze żadnych leków ani suplementów. Dodaj pierwszą pozycję."
        titleFields={["name"]}
      />
    </Card>
  );
}
