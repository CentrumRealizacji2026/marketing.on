import type { Metadata } from "next";

import { RowsEditor } from "@/components/forms/rows-editor";
import { obligationDefault, obligationFields, obligationToRow } from "@/components/forms/specs";
import { Card, CardHeader } from "@/components/ui/card";
import { saveObligations } from "@/lib/actions/config";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getObligations } from "@/lib/queries/config";

export const metadata: Metadata = { title: "Płatności" };
export const dynamic = "force-dynamic";

export default async function ObligationsSettingsPage() {
  const user = await requireOnboardedUser();
  const rows = await getObligations(user.id);

  return (
    <Card>
      <CardHeader
        title="Płatności i koszty stałe"
        subtitle="Terminy nie są zapisywane w bazie — wynikają z pierwszej daty i rytmu, więc zmiana kwoty nie wymaga poprawiania przyszłych rat."
      />
      <RowsEditor
        fields={obligationFields}
        initial={rows.map(obligationToRow)}
        defaultRow={obligationDefault}
        action={saveObligations}
        addLabel="Dodaj płatność"
        emptyHint="Dodaj czynsz, raty i abonamenty. Kolejne terminy pojawią się w kalendarzu i w raporcie."
        titleFields={["name"]}
        itemNoun="Płatność"
      />
    </Card>
  );
}
