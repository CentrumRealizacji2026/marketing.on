import type { Metadata } from "next";

import { PasswordForm } from "./password-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { reopenOnboarding } from "@/lib/actions/config";
import { requireOnboardedUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Konto" };
export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const user = await requireOnboardedUser();

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader title="Konto" subtitle={user.email} />
        <PasswordForm />
      </Card>

      <Card>
        <CardHeader
          title="Kreator profilu"
          subtitle="Przejdź konfigurację jeszcze raz, krok po kroku. Dane, które już wpisałeś, zostają — kreator pokaże je do poprawy."
        />
        <form action={reopenOnboarding}>
          <Button type="submit" variant="secondary">
            Uruchom kreator ponownie
          </Button>
        </form>
      </Card>
    </div>
  );
}
