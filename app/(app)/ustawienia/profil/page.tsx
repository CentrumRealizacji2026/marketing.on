import type { Metadata } from "next";

import { ProfileForm } from "@/components/forms/settings-forms";
import { Card, CardHeader } from "@/components/ui/card";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Profil" };
export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);

  return (
    <Card>
      <CardHeader title="Profil" subtitle="Podstawowe ustawienia konta." />
      <ProfileForm
        initial={{
          name: user.name ?? "",
          timezone: settings.timezone,
          currency: settings.currency,
          weekStartsOn: settings.weekStartsOn,
        }}
      />
    </Card>
  );
}
