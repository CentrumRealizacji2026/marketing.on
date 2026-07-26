import type { Metadata } from "next";

import { RowsEditor } from "@/components/forms/rows-editor";
import { materialDefault, materialFields, materialToRow } from "@/components/forms/specs";
import { Card, CardHeader } from "@/components/ui/card";
import { saveMaterials } from "@/lib/actions/config";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getMaterials } from "@/lib/queries/config";

export const metadata: Metadata = { title: "Materiały" };
export const dynamic = "force-dynamic";

export default async function MaterialsSettingsPage() {
  const user = await requireOnboardedUser();
  const rows = await getMaterials(user.id);

  return (
    <Card>
      <CardHeader
        title="Materiały"
        subtitle="Szkolenia, kursy i książki przypisane do dziedziny nauki. Postęp widać przy bloku nauki."
      />
      <RowsEditor
        fields={materialFields}
        initial={rows.map(materialToRow)}
        defaultRow={materialDefault}
        action={saveMaterials}
        addLabel="Dodaj materiał"
        emptyHint="Nie masz jeszcze materiałów. Dodasz je w dowolnym momencie."
        rowTitle={(row, index) => (row.title ? String(row.title) : `Materiał ${index + 1}`)}
      />
    </Card>
  );
}
