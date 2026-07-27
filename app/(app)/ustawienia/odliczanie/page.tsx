import type { Metadata } from "next";

import { RowsEditor } from "@/components/forms/rows-editor";
import { countdownDefault, countdownFields, countdownToRow } from "@/components/forms/specs";
import { Card, CardHeader } from "@/components/ui/card";
import { saveCountdowns } from "@/lib/actions/config";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getCountdowns } from "@/lib/queries/config";

export const metadata: Metadata = { title: "Odliczanie" };
export const dynamic = "force-dynamic";

export default async function CountdownSettingsPage() {
  const user = await requireOnboardedUser();
  const rows = await getCountdowns(user.id);

  return (
    <Card>
      <CardHeader
        title="Odliczanie"
        subtitle="Liczniki dni do wydarzeń. Najbliższe trafia na dashboard jako duża liczba."
      />
      <RowsEditor
        fields={countdownFields}
        initial={rows.map(countdownToRow)}
        defaultRow={countdownDefault}
        action={saveCountdowns}
        addLabel="Dodaj odliczanie"
        emptyHint="Dodaj pierwsze wydarzenie — nazwa i data wystarczą."
        titleFields={["name"]}
        itemNoun="Odliczanie"
      />
    </Card>
  );
}
