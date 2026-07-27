import type { Metadata } from "next";

import { RowsEditor } from "@/components/forms/rows-editor";
import {
  familyEventDefault,
  familyEventFields,
  familyEventToRow,
  familyMemberDefault,
  familyMemberFields,
  familyMemberToRow,
} from "@/components/forms/specs";
import { Card, CardHeader } from "@/components/ui/card";
import { saveFamilyEvents, saveFamilyMembers } from "@/lib/actions/config";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getFamilyEvents, getFamilyMembers } from "@/lib/queries/config";

export const metadata: Metadata = { title: "Rodzina" };
export const dynamic = "force-dynamic";

export default async function FamilySettingsPage() {
  const user = await requireOnboardedUser();
  const [members, events] = await Promise.all([getFamilyMembers(user.id), getFamilyEvents(user.id)]);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader
          title="Osoby"
          subtitle="Imię, kim jest ta osoba i data urodzin. Urodziny wracają w kalendarzu co roku same."
        />
        <RowsEditor
          fields={familyMemberFields}
          initial={members.map(familyMemberToRow)}
          defaultRow={familyMemberDefault}
          action={saveFamilyMembers}
          addLabel="Dodaj osobę"
          emptyHint="Dodaj pierwszą osobę — partnerkę, partnera, dziecko, rodzica."
          titleFields={["name", "relation"]}
          itemNoun="Osoba"
        />
      </Card>

      <Card>
        <CardHeader
          title="Wydarzenia"
          subtitle="Rocznice, randki, wspólne wyjazdy. „Co roku” zaznacz przy datach, które wracają."
        />
        <RowsEditor
          fields={familyEventFields}
          initial={events.map(familyEventToRow)}
          defaultRow={familyEventDefault}
          action={saveFamilyEvents}
          addLabel="Dodaj wydarzenie"
          emptyHint="Rocznica ślubu, zaplanowana randka, wyjazd we dwoje — wszystko trafi do kalendarza."
          titleFields={["name"]}
          itemNoun="Wydarzenie"
        />
      </Card>
    </div>
  );
}
