import type { Metadata } from "next";

import { RowsEditor } from "@/components/forms/rows-editor";
import {
  learningWeekDefault,
  learningWeekFields,
  learningWeekToRow,
  learningYearDefault,
  learningYearFields,
  learningYearToRow,
} from "@/components/forms/specs";
import { Card, CardHeader } from "@/components/ui/card";
import { saveLearningWeek, saveLearningYear } from "@/lib/actions/config";
import { requireOnboardedUser } from "@/lib/auth/session";
import { weekdayLabel } from "@/lib/domain/dates";
import { getLearningWeek, getLearningYear } from "@/lib/queries/config";

export const metadata: Metadata = { title: "Plan nauki" };
export const dynamic = "force-dynamic";

export default async function LearningSettingsPage() {
  const user = await requireOnboardedUser();
  const [week, year] = await Promise.all([getLearningWeek(user.id), getLearningYear(user.id)]);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader
          title="Plan tygodnia"
          subtitle="Dodaj kolejne pole i wpisz, jaka to dziedzina. Dzień bez wpisu jest wolny."
        />
        <RowsEditor
          fields={learningWeekFields}
          initial={week.map(learningWeekToRow)}
          defaultRow={learningWeekDefault}
          action={saveLearningWeek}
          addLabel="Dodaj blok nauki"
          emptyHint="Nie masz jeszcze bloków nauki. Dodaj pierwszy."
          rowTitle={(row, index) =>
            row.skill ? `${weekdayLabel(Number(row.weekday))} · ${String(row.skill)}` : `Pozycja ${index + 1}`
          }
        />
      </Card>

      <Card>
        <CardHeader
          title="Plan roczny"
          subtitle="Okresy zawężają temat bloku tygodniowego — np. „lipiec–wrzesień, hiszpański: czasy przeszłe”."
        />
        <RowsEditor
          fields={learningYearFields}
          initial={year.map(learningYearToRow)}
          defaultRow={learningYearDefault}
          action={saveLearningYear}
          addLabel="Dodaj okres"
          emptyHint="Nie masz jeszcze okresów w planie rocznym. Bloki tygodniowe będą działać bez nich."
          rowTitle={(row, index) =>
            row.skill ? `${String(row.skill)} · ${String(row.periodStart ?? "")}` : `Okres ${index + 1}`
          }
        />
      </Card>
    </div>
  );
}
