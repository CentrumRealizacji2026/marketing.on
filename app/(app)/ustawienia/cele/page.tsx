import type { Metadata } from "next";

import { GoalsForm } from "@/components/forms/settings-forms";
import { Card, CardHeader } from "@/components/ui/card";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Cele i normy" };
export const dynamic = "force-dynamic";

export default async function GoalsSettingsPage() {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);

  return (
    <Card>
      <CardHeader
        title="Cele i normy"
        subtitle="Puste pole znaczy „nie mierzę tego” — kafelek wtedy nie pokazuje paska postępu."
      />
      <GoalsForm initial={settings} />
    </Card>
  );
}
