import Link from "next/link";
import { Check } from "lucide-react";

import { RowsEditor } from "@/components/forms/rows-editor";
import { FinanceStartForm, GoalsForm, ProfileForm } from "@/components/forms/settings-forms";
import {
  learningWeekDefault,
  learningWeekFields,
  learningWeekToRow,
  learningYearDefault,
  learningYearFields,
  learningYearToRow,
  medicationDefault,
  medicationFields,
  medicationToRow,
  projectDefault,
  projectFields,
  projectToRow,
  recordDefault,
  recordFields,
  recordToRow,
  trainingDefault,
  trainingFields,
  trainingToRow,
} from "@/components/forms/specs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  finishOnboarding,
  saveLearningWeek,
  saveLearningYear,
  saveMedications,
  savePersonalRecords,
  saveProjects,
  saveTrainingPlans,
} from "@/lib/actions/config";
import { getUserSettings, requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { dailyLogs } from "@/lib/db/schema";
import { todayInTz, weekdayLabel } from "@/lib/domain/dates";
import {
  getConfigStatus,
  getLearningWeek,
  getLearningYear,
  getMedications,
  getPersonalRecords,
  getProjects,
  getTrainingPlans,
} from "@/lib/queries/config";
import { pluralPl } from "@/lib/utils";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const STEPS = [
  { n: 1, title: "Profil", desc: "Jak się do Ciebie zwracać i w jakiej strefie czasowej liczyć dzień." },
  { n: 2, title: "Finanse", desc: "Punkt startowy dla stanu środków." },
  { n: 3, title: "Sprzedaż", desc: "Ile rozmów, spotkań i umów chcesz robić." },
  { n: 4, title: "Leki i suplementy", desc: "Dodaj tyle pozycji, ile realnie przyjmujesz." },
  { n: 5, title: "Nawodnienie i waga", desc: "Cel picia wody, własne progi oceny i waga." },
  { n: 6, title: "Trening", desc: "Jednostki treningowe w tygodniu." },
  { n: 7, title: "Rekordy", desc: "Twoje aktualne najlepsze wyniki." },
  { n: 8, title: "Nauka — tydzień", desc: "Który dzień, jaka dziedzina, o której godzinie." },
  { n: 9, title: "Nauka — rok", desc: "Okresy, które zawężają temat bloków." },
  { n: 10, title: "Projekty", desc: "Co prowadzisz i jaki jest następny krok." },
  { n: 11, title: "Gotowe", desc: "Podgląd konfiguracji." },
];

function next(step: number) {
  return `/start?krok=${Math.min(step + 1, STEPS.length)}`;
}

function SkipLink({ step }: { step: number }) {
  return (
    <Link href={next(step)} className="px-3 text-sm text-muted hover:text-ink">
      Pomiń
    </Link>
  );
}

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ krok?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const step = Math.min(Math.max(Number(params.krok) || 1, 1), STEPS.length);
  const meta = STEPS[step - 1];
  const settings = await getUserSettings(user.id);
  const today = todayInTz(settings.timezone);

  const hidden = { step: String(step), next: next(step) };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-medium tracking-wide text-muted uppercase">
          Kreator profilu · krok {step} z {STEPS.length}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{meta.title}</h1>
        <p className="mt-1 text-sm text-muted">{meta.desc}</p>

        <ol className="mt-4 flex flex-wrap gap-1">
          {STEPS.map((s) => (
            <li key={s.n}>
              <Link
                href={`/start?krok=${s.n}`}
                title={s.title}
                aria-current={s.n === step ? "step" : undefined}
                className={`block h-1.5 w-8 rounded-full transition-colors ${
                  s.n === step ? "bg-series-1" : s.n < step ? "bg-series-1/40" : "bg-line"
                }`}
              >
                <span className="sr-only">
                  {s.n}. {s.title}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </header>

      <Card>
        <StepContent step={step} userId={user.id} userName={user.name ?? ""} settings={settings} today={today} hidden={hidden} />
      </Card>

      <nav className="flex items-center justify-between text-sm">
        {step > 1 ? (
          <Link href={`/start?krok=${step - 1}`} className="text-muted hover:text-ink">
            ← Wstecz
          </Link>
        ) : (
          <span />
        )}
        <span className="text-xs text-muted">
          Możesz przerwać w dowolnym momencie — wpisane dane zostają zapisane.
        </span>
      </nav>
    </div>
  );
}

type Settings = Awaited<ReturnType<typeof getUserSettings>>;

async function StepContent({
  step,
  userId,
  userName,
  settings,
  today,
  hidden,
}: {
  step: number;
  userId: string;
  userName: string;
  settings: Settings;
  today: string;
  hidden: Record<string, string>;
}) {
  switch (step) {
    case 1:
      return (
        <ProfileForm
          initial={{
            name: userName,
            timezone: settings.timezone,
            currency: settings.currency,
            weekStartsOn: settings.weekStartsOn,
          }}
          hiddenFields={hidden}
          submitLabel="Zapisz i dalej"
          footer={<SkipLink step={step} />}
        />
      );

    case 2: {
      const [log] = await db
        .select({ cashBalancePln: dailyLogs.cashBalancePln })
        .from(dailyLogs)
        .where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.date, today)))
        .limit(1);

      return (
        <FinanceStartForm
          initial={{
            cashBalancePln: log?.cashBalancePln ?? null,
            monthlyRevenueGoalPln: settings.monthlyRevenueGoalPln,
          }}
          hiddenFields={hidden}
          submitLabel="Zapisz i dalej"
          footer={<SkipLink step={step} />}
        />
      );
    }

    case 3:
      return (
        <GoalsForm
          initial={settings}
          sections="sprzedaz"
          hiddenFields={hidden}
          submitLabel="Zapisz i dalej"
          footer={<SkipLink step={step} />}
        />
      );

    case 4: {
      const rows = await getMedications(userId);
      return (
        <RowsEditor
          fields={medicationFields}
          initial={rows.map(medicationToRow)}
          defaultRow={medicationDefault}
          action={saveMedications}
          hiddenFields={hidden}
          addLabel="Dodaj lek lub suplement"
          submitLabel="Zapisz i dalej"
          emptyHint="Dodaj pierwszy lek albo suplement — nazwa, dawka i pory dnia."
          rowTitle={(row, index) => (row.name ? String(row.name) : `Pozycja ${index + 1}`)}
          footer={<SkipLink step={step} />}
        />
      );
    }

    case 5:
      return (
        <GoalsForm
          initial={settings}
          sections="zdrowie"
          showCurrentWeight
          hiddenFields={hidden}
          submitLabel="Zapisz i dalej"
          footer={<SkipLink step={step} />}
        />
      );

    case 6: {
      const rows = await getTrainingPlans(userId);
      return (
        <RowsEditor
          fields={trainingFields}
          initial={rows.map(trainingToRow)}
          defaultRow={trainingDefault}
          action={saveTrainingPlans}
          hiddenFields={hidden}
          addLabel="Dodaj jednostkę treningową"
          submitLabel="Zapisz i dalej"
          emptyHint="Dodaj tyle jednostek, ile masz w tygodniu. Dni bez wpisu są wolne."
          rowTitle={(row, index) =>
            row.discipline ? `${weekdayLabel(Number(row.weekday))} · ${String(row.discipline)}` : `Pozycja ${index + 1}`
          }
          footer={<SkipLink step={step} />}
        />
      );
    }

    case 7: {
      const rows = await getPersonalRecords(userId);
      return (
        <RowsEditor
          fields={recordFields}
          initial={rows.map(recordToRow)}
          defaultRow={recordDefault}
          action={savePersonalRecords}
          hiddenFields={hidden}
          addLabel="Dodaj rekord"
          submitLabel="Zapisz i dalej"
          emptyHint="Dodaj aktualne najlepsze wyniki — dyscyplinę i metrykę wpisujesz własnymi słowami."
          rowTitle={(row, index) =>
            row.discipline ? `${String(row.discipline)} · ${String(row.metric ?? "")}` : `Pozycja ${index + 1}`
          }
          footer={<SkipLink step={step} />}
        />
      );
    }

    case 8: {
      const rows = await getLearningWeek(userId);
      return (
        <RowsEditor
          fields={learningWeekFields}
          initial={rows.map(learningWeekToRow)}
          defaultRow={learningWeekDefault}
          action={saveLearningWeek}
          hiddenFields={hidden}
          addLabel="Dodaj blok nauki"
          submitLabel="Zapisz i dalej"
          emptyHint="Dodawaj kolejne pola i wpisuj, jaka to dziedzina — np. poniedziałek: hiszpański, 18:00."
          rowTitle={(row, index) =>
            row.skill ? `${weekdayLabel(Number(row.weekday))} · ${String(row.skill)}` : `Pozycja ${index + 1}`
          }
          footer={<SkipLink step={step} />}
        />
      );
    }

    case 9: {
      const rows = await getLearningYear(userId);
      return (
        <RowsEditor
          fields={learningYearFields}
          initial={rows.map(learningYearToRow)}
          defaultRow={learningYearDefault}
          action={saveLearningYear}
          hiddenFields={hidden}
          addLabel="Dodaj okres"
          submitLabel="Zapisz i dalej"
          emptyHint="Plan roczny jest opcjonalny — bloki tygodniowe działają i bez niego."
          rowTitle={(row, index) => (row.skill ? String(row.skill) : `Okres ${index + 1}`)}
          footer={<SkipLink step={step} />}
        />
      );
    }

    case 10: {
      const rows = await getProjects(userId);
      return (
        <RowsEditor
          fields={projectFields}
          initial={rows.map(projectToRow)}
          defaultRow={projectDefault}
          action={saveProjects}
          hiddenFields={hidden}
          addLabel="Dodaj projekt"
          submitLabel="Zapisz i zakończ"
          emptyHint="Dodaj projekty, które prowadzisz. Mentor będzie pytał o ich następne kroki."
          rowTitle={(row, index) => (row.name ? String(row.name) : `Projekt ${index + 1}`)}
          footer={<SkipLink step={step} />}
        />
      );
    }

    default:
      return <Summary userId={userId} />;
  }
}

async function Summary({ userId }: { userId: string }) {
  const status = await getConfigStatus(userId);

  const items = [
    { label: "Leki i suplementy", count: status.medications, href: "/start?krok=4" },
    { label: "Jednostki treningowe", count: status.trainingPlans, href: "/start?krok=6" },
    { label: "Rekordy", count: status.personalRecords, href: "/start?krok=7" },
    { label: "Bloki nauki w tygodniu", count: status.learningWeek, href: "/start?krok=8" },
    { label: "Okresy planu rocznego", count: status.learningYear, href: "/start?krok=9" },
    { label: "Projekty", count: status.projects, href: "/start?krok=10" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
            <span className="flex items-center gap-2 text-sm text-ink-2">
              {item.count > 0 ? (
                <Check className="h-4 w-4 text-good" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-dashed border-edge" />
              )}
              {item.label}
            </span>
            <span className="flex items-center gap-3">
              <span className="text-sm text-ink">
                {item.count === 0
                  ? "pominięte"
                  : `${item.count} ${pluralPl(item.count, "pozycja", "pozycje", "pozycji")}`}
              </span>
              <Link href={item.href} className="text-xs text-series-1 hover:underline">
                popraw
              </Link>
            </span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted">
        Pominięte sekcje możesz uzupełnić kiedykolwiek w panelu zarządzania. Dashboard pokaże tam
        „skonfiguruj →” zamiast pustego kafelka.
      </p>

      <form action={finishOnboarding}>
        <Button type="submit" size="lg">
          Zakończ i przejdź do dashboardu
        </Button>
      </form>
    </div>
  );
}
