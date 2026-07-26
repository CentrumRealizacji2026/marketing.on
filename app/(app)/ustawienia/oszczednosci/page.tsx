import type { Metadata } from "next";

import { RowsEditor } from "@/components/forms/rows-editor";
import { savingsGoalDefault, savingsGoalFields, savingsGoalToRow } from "@/components/forms/specs";
import { Card, CardHeader } from "@/components/ui/card";
import { saveSavingsGoals } from "@/lib/actions/config";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getSavingsGoals } from "@/lib/queries/config";

export const metadata: Metadata = { title: "Cele oszczędnościowe" };
export const dynamic = "force-dynamic";

export default async function SavingsSettingsPage() {
  const user = await requireOnboardedUser();
  const rows = await getSavingsGoals(user.id);

  return (
    <Card>
      <CardHeader
        title="Cele oszczędnościowe"
        subtitle="Usunięcie celu wyłącza go z raportu, ale zachowuje dopłaty w historii. Postęp liczy się z kwoty startowej i dopłat."
      />
      <RowsEditor
        fields={savingsGoalFields}
        initial={rows.map(savingsGoalToRow)}
        defaultRow={savingsGoalDefault}
        action={saveSavingsGoals}
        addLabel="Dodaj cel"
        emptyHint="Nie masz jeszcze celów. Dodaj pierwszy — nazwa i kwota wystarczą."
        titleFields={["name"]}
        itemNoun="Cel"
      />
    </Card>
  );
}
