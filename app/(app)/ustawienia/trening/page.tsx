import type { Metadata } from "next";

import { RowsEditor } from "@/components/forms/rows-editor";
import { trainingDefault, trainingFields, trainingToRow } from "@/components/forms/specs";
import { Card, CardHeader } from "@/components/ui/card";
import { saveTrainingPlans } from "@/lib/actions/config";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getTrainingPlans } from "@/lib/queries/config";

export const metadata: Metadata = { title: "Plan treningowy" };
export const dynamic = "force-dynamic";

export default async function TrainingSettingsPage() {
  const user = await requireOnboardedUser();
  const rows = await getTrainingPlans(user.id);

  return (
    <Card>
      <CardHeader
        title="Plan treningowy"
        subtitle="Dodaj tyle jednostek w tygodniu, ile realnie robisz. Dzień bez wpisu jest po prostu wolny."
      />
      <RowsEditor
        fields={trainingFields}
        initial={rows.map(trainingToRow)}
        defaultRow={trainingDefault}
        action={saveTrainingPlans}
        addLabel="Dodaj jednostkę treningową"
        emptyHint="Nie masz jeszcze planu treningowego. Dodaj pierwszą jednostkę."
        weekdayField="weekday"
        titleFields={["discipline", "title"]}
      />
    </Card>
  );
}
