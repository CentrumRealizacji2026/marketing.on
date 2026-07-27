import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ClipboardCheck, ExternalLink } from "lucide-react";

import { AssessmentForm } from "./assessment-form";
import { BandPill, CrisisBox, TestScore } from "@/components/health/mental-panels";
import { Sparkline } from "@/components/charts/sparkline";
import { Card, CardHeader } from "@/components/ui/card";
import { getUserSettings, requireOnboardedUser } from "@/lib/auth/session";
import { formatDatePl, todayInTz } from "@/lib/domain/dates";
import { MENTAL_TESTS, MENTAL_TEST_IDS, isMentalTestId, scoreAssessment } from "@/lib/domain/mental-tests";
import { getAssessmentForDate, getMentalState } from "@/lib/queries/mental";
import { formatDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ test: string }> }): Promise<Metadata> {
  const { test } = await params;
  return { title: isMentalTestId(test) ? MENTAL_TESTS[test].name : "Test" };
}

export default async function MentalTestPage({
  params,
  searchParams,
}: {
  params: Promise<{ test: string }>;
  searchParams: Promise<{ zapisano?: string }>;
}) {
  const { test: testParam } = await params;
  if (!isMentalTestId(testParam)) notFound();

  const user = await requireOnboardedUser();
  const settings = await getUserSettings(user.id);
  const today = todayInTz(settings.timezone);
  const test = MENTAL_TESTS[testParam];

  const [states, todayRow, saved] = await Promise.all([
    getMentalState(user.id, today),
    getAssessmentForDate(user.id, testParam, today),
    searchParams,
  ]);

  const state = states.find((entry) => entry.testId === testParam)!;
  const todayResult = todayRow ? scoreAssessment(testParam, todayRow.answers) : null;
  // Ramkę ratunkową pokazujemy przy zaznaczonym pytaniu o myśli samobójcze
  // albo przy wyniku z najgorszego przedziału — w obu wypadkach jako pierwszą rzecz.
  const urgent = Boolean(state.latest?.riskFlag) || state.latest?.band.tone === "critical";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <header>
        <p className="text-xs text-muted">
          <Link href="/zdrowie#psychika" className="hover:text-ink">
            Zdrowie psychiczne
          </Link>{" "}
          / test
        </p>
        <h1 className="mt-1 text-xl font-semibold text-ink">{test.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {test.measures} Powtarzaj co {formatDays(test.cadenceDays)}.
        </p>
      </header>

      {saved.zapisano ? (
        <p className="rounded-lg border border-good/40 bg-good/10 px-3 py-2 text-sm text-ink">
          Wynik zapisany.
        </p>
      ) : null}

      {urgent ? <CrisisBox urgent /> : null}

      {state.latest ? (
        <Card>
          <CardHeader title="Ostatni wynik" icon={ClipboardCheck} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <TestScore state={state} />
            <div>
              <p className="text-xs text-muted">Przebieg ({state.history.length} pomiarów)</p>
              <div className="mt-1">
                <Sparkline
                  values={state.history.map((entry) => entry.score)}
                  height={56}
                  tone="var(--series-1)"
                  label={`Przebieg wyników ${test.name}`}
                />
              </div>
              <p className="mt-1 text-xs text-muted">
                {state.due
                  ? "Kolejne wypełnienie wypada dziś."
                  : `Kolejne wypełnienie: ${state.nextDue ? formatDatePl(state.nextDue) : "dziś"}.`}
              </p>
            </div>
          </div>

          {state.history.length > 1 ? (
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3">
              {[...state.history].reverse().slice(0, 8).map((entry) => (
                <li key={entry.date} className="tabular text-xs text-muted">
                  {formatDatePl(entry.date)} · <span className="text-ink">{entry.score}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title={todayResult ? "Wypełniony dziś — możesz poprawić" : "Wypełnij test"}
          subtitle={test.prompt}
        />

        {todayResult ? (
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-edge bg-surface-2 px-3 py-2">
            <span className="tabular text-sm font-semibold text-ink">
              {todayResult.score} / {todayResult.max}
            </span>
            <BandPill band={todayResult.band} />
            <span className="text-xs text-muted">Ponowny zapis nadpisze dzisiejszy wynik.</span>
          </div>
        ) : null}

        <AssessmentForm
          test={test}
          date={today}
          initialAnswers={todayRow?.answers ?? null}
          initialNote={todayRow?.note ?? null}
        />
      </Card>

      <Card>
        <CardHeader title="Pozostałe testy" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {MENTAL_TEST_IDS.filter((id) => id !== testParam).map((id) => {
            const other = states.find((entry) => entry.testId === id)!;
            return (
              <Link
                key={id}
                href={`/zdrowie/test/${id}`}
                className="rounded-lg border border-edge p-3 hover:bg-surface-2"
              >
                <TestScore state={other} compact />
              </Link>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader title="Skąd ten test" />
        <p className="text-sm text-ink-2">
          Punktacja i progi pochodzą z narzędzia przesiewowego, nie z tej aplikacji. Wynik jest wskaźnikiem do
          obserwacji i rozmowy ze specjalistą — <span className="text-ink">nie jest diagnozą</span>.
        </p>
        <p className="mt-2 text-sm text-muted">
          Polskie sformułowania pytań przygotowano na potrzeby kokpitu — są wierne treści oryginału, ale nie są
          oficjalnym, walidowanym tłumaczeniem.
        </p>
        <a
          href={test.source.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-series-1 hover:underline"
        >
          {test.source.label} <ExternalLink className="h-3 w-3" />
        </a>
      </Card>

      {urgent ? null : <CrisisBox />}
    </div>
  );
}
