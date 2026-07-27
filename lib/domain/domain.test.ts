import { describe, expect, it } from "vitest";
import { agendaSortKey, buildAgenda } from "./agenda";
import {
  addDays,
  addMonths,
  endOfMonth,
  isoWeekday,
  lastNDays,
  monthGridDates,
  orderedWeekdays,
  startOfWeek,
  todayInTz,
} from "./dates";
import { countdownFor, describeCountdown, formatDaysPl, sortCountdowns } from "./countdown";
import { summarizeDeals } from "./deals";
import { familyDatesInRange, nextAnnualOccurrence, occurrencesInRange, upcomingFamilyDates } from "./family";
import { GESTURES, planGesturesForWeek, seedFromId } from "./gestures";
import { dayCashFlow, sumExpenses, sumIncome } from "./finance";
import { describeRank, formatTopPct, incomeRank } from "./income-rank";
import { learningBlocksForDate } from "./learning";
import { medicationScheduleForDate, slotSortKey } from "./medication";
import { MENTAL_TESTS, compareScores, isDue, nextDueDate, scoreAssessment } from "./mental-tests";
import {
  dueLabel,
  obligationOccurrences,
  paymentsInRange,
  summarizeObligations,
} from "./obligations";
import { savingsPace, savingsProgress, summarizeSavings } from "./savings";
import { niceScaleMax, scaleTicks } from "./scale";
import { beatsRecord, currentRecords } from "./records";
import { conversionRates, sumSales } from "./sales";
import { averageOfReportedDays, waterStatus } from "./water";
import { weightPlanProgress } from "./weight";

describe("daty", () => {
  it("liczy dzień tygodnia w standardzie ISO", () => {
    expect(isoWeekday("2026-07-27")).toBe(1); // poniedziałek
    expect(isoWeekday("2026-07-26")).toBe(7); // niedziela
  });

  it("nie gubi dnia przy przejściu przez miesiąc", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("cofa do poniedziałku", () => {
    expect(startOfWeek("2026-07-26")).toBe("2026-07-20");
    expect(startOfWeek("2026-07-20")).toBe("2026-07-20");
  });

  it("zwraca ostatnie N dni rosnąco, z dniem końcowym włącznie", () => {
    expect(lastNDays("2026-07-26", 3)).toEqual(["2026-07-24", "2026-07-25", "2026-07-26"]);
  });

  it("ustala dzisiejszą datę w strefie użytkownika, nie serwera", () => {
    // 23:30 UTC to już następny dzień w Warszawie.
    const late = new Date("2026-07-26T23:30:00Z");
    expect(todayInTz("Europe/Warsaw", late)).toBe("2026-07-27");
    expect(todayInTz("UTC", late)).toBe("2026-07-26");
  });
});

describe("kalendarz miesięczny", () => {
  it("przesuwa miesiąc przez granicę roku", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("zna ostatni dzień miesiąca, także w lutym roku przestępnego", () => {
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
    expect(endOfMonth("2026-07-01")).toBe("2026-07-31");
  });

  it("buduje siatkę z pełnych tygodni obejmującą cały miesiąc", () => {
    const grid = monthGridDates("2026-07", 1);
    expect(grid.length % 7).toBe(0);
    expect(isoWeekday(grid[0])).toBe(1); // zaczyna się w poniedziałek
    expect(isoWeekday(grid.at(-1)!)).toBe(7); // kończy w niedzielę
    expect(grid).toContain("2026-07-01");
    expect(grid).toContain("2026-07-31");
  });

  it("respektuje inny początek tygodnia", () => {
    const grid = monthGridDates("2026-07", 7); // tydzień od niedzieli
    expect(isoWeekday(grid[0])).toBe(7);
    expect(orderedWeekdays(7)[0].value).toBe(7);
    expect(orderedWeekdays(1)[0].value).toBe(1);
  });
});

describe("agenda dnia", () => {
  const dose = (name: string, slot: string, taken = false) => ({
    medicationId: `m-${name}`,
    name,
    kind: "lek" as const,
    doseAmount: 1,
    doseUnit: "tabletka",
    slot,
    taken,
    notes: null,
  });

  it("porządkuje nazwane pory dnia razem z godzinami", () => {
    expect(agendaSortKey("rano")).toBe(7 * 60);
    expect(agendaSortKey("18:30")).toBe(18 * 60 + 30);
    expect(agendaSortKey("wieczór")).toBe(19 * 60);
    expect(agendaSortKey(null)).toBeNull();
  });

  it("składa jedną oś czasu ze wszystkich kategorii", () => {
    const agenda = buildAgenda({
      doses: [dose("Magnez", "wieczór"), dose("Witamina D", "rano", true)],
      training: [
        { id: "t1", discipline: "rower", title: "interwały", startTime: "18:00:00", durationMin: 60, done: false },
      ],
      learning: [
        { id: "l1", skill: "hiszpański", startTime: "20:00:00", durationMin: 45, focus: "czasy przeszłe", done: false },
      ],
      tasks: [{ id: "z1", title: "Zadzwonić do klientów", kind: "priorytet", position: 1, done: false }],
    });

    expect(agenda.map((item) => item.title)).toEqual([
      "Witamina D", // rano (07:00)
      "interwały", // 18:00
      "Magnez", // wieczór (19:00)
      "hiszpański", // 20:00
      "Zadzwonić do klientów", // bez pory — na końcu
    ]);
  });

  it("przenosi pozycje bez godziny na koniec, nawet gdy są pierwsze na wejściu", () => {
    const agenda = buildAgenda({
      doses: [],
      training: [],
      learning: [],
      tasks: [
        { id: "z1", title: "Side quest", kind: "side", position: 0, done: false },
        { id: "z2", title: "Priorytet", kind: "priorytet", position: 1, done: true },
      ],
    });
    expect(agenda.every((item) => item.when === null)).toBe(true);
    expect(agenda).toHaveLength(2);
  });

  it("oznacza wykonane pozycje i zachowuje kategorię", () => {
    const agenda = buildAgenda({
      doses: [dose("Magnez", "rano", true)],
      training: [{ id: "t1", discipline: "bieg", title: null, startTime: null, durationMin: null, done: true }],
      learning: [],
      tasks: [],
    });
    expect(agenda.find((i) => i.title === "Magnez")?.category).toBe("zdrowie");
    expect(agenda.find((i) => i.title === "bieg")?.category).toBe("trening");
    expect(agenda.every((item) => item.done)).toBe(true);
  });
});

describe("plan wagowy", () => {
  // Chudnięcie: 90 → 84 kg w 100 dni, czyli 3 kg po 50 dniach.
  const plan = {
    startKg: 90,
    startDate: "2026-01-01",
    targetKg: 84,
    targetDate: "2026-04-11",
  };

  it("wylicza wagę oczekiwaną na dany dzień", () => {
    const progress = weightPlanProgress({ ...plan, currentKg: 87, currentDate: "2026-02-20" });
    expect(progress?.expectedKg).toBeCloseTo(87, 1);
    expect(progress?.status).toBe("zgodnie");
  });

  it("rozpoznaje wyprzedzenie i opóźnienie względem planu", () => {
    const przed = weightPlanProgress({ ...plan, currentKg: 85.5, currentDate: "2026-02-20" });
    expect(przed?.status).toBe("przed");
    expect(przed?.aheadKg).toBeGreaterThan(0);

    const za = weightPlanProgress({ ...plan, currentKg: 88.5, currentDate: "2026-02-20" });
    expect(za?.status).toBe("za");
    expect(za?.aheadKg).toBeLessThan(0);
  });

  it("odwraca kierunek przy budowaniu masy", () => {
    const masa = { startKg: 70, startDate: "2026-01-01", targetKg: 76, targetDate: "2026-04-11" };
    // Powyżej linii planu przy tyciu to wyprzedzenie, nie opóźnienie.
    const progress = weightPlanProgress({ ...masa, currentKg: 74.5, currentDate: "2026-02-20" });
    expect(progress?.status).toBe("przed");
  });

  it("liczy tempo planowane i rzeczywiste w kg na tydzień", () => {
    const progress = weightPlanProgress({ ...plan, currentKg: 87, currentDate: "2026-02-20" });
    expect(progress?.plannedPacePerWeek).toBeCloseTo(-0.42, 1);
    expect(progress?.actualPacePerWeek).toBeCloseTo(-0.42, 1);
  });

  it("nie ocenia planu bez kompletu danych ani bez zmiany wagi", () => {
    expect(weightPlanProgress({ ...plan, targetDate: null, currentKg: 87, currentDate: "2026-02-20" })).toBeNull();
    expect(weightPlanProgress({ ...plan, currentKg: null, currentDate: "2026-02-20" })).toBeNull();
    expect(
      weightPlanProgress({ ...plan, targetKg: 90, currentKg: 90, currentDate: "2026-02-20" }),
    ).toBeNull();
    // Termin przed startem to nie jest plan.
    expect(
      weightPlanProgress({ ...plan, targetDate: "2025-12-01", currentKg: 87, currentDate: "2026-02-20" }),
    ).toBeNull();
  });

  it("po terminie porównuje z docelową wagą, nie ekstrapoluje dalej", () => {
    const progress = weightPlanProgress({ ...plan, currentKg: 84, currentDate: "2026-06-01" });
    expect(progress?.expectedKg).toBeCloseTo(84, 1);
    expect(progress?.daysLeft).toBeLessThan(0);
  });
});

describe("przepływy finansowe", () => {
  it("liczy wynik dnia z wpisanych kwot", () => {
    const flow = dayCashFlow({ expensesPln: 250, incomePln: 1000 });
    expect(flow.netPln).toBe(750);
    expect(flow.expensesPln).toBe(250);
    expect(flow.incomePln).toBe(1000);
    expect(flow.source).toBe("raport");
  });

  it("zachowuje wydatek, gdy wynik dnia wychodzi na zero", () => {
    const flow = dayCashFlow({ expensesPln: 300, incomePln: 300 });
    expect(flow.netPln).toBe(0);
    expect(flow.expensesPln).toBe(300);
  });

  it("traktuje sam wydatek jako minus", () => {
    expect(dayCashFlow({ expensesPln: 120 }).netPln).toBe(-120);
    expect(dayCashFlow({ incomePln: 120 }).netPln).toBe(120);
  });

  it("przyjmuje kwoty bez znaku, nawet gdy ktoś wpisze minus", () => {
    const flow = dayCashFlow({ expensesPln: -80 });
    expect(flow.expensesPln).toBe(80);
    expect(flow.netPln).toBe(-80);
  });

  it("wpisane kwoty mają pierwszeństwo przed różnicą sald", () => {
    const flow = dayCashFlow({ expensesPln: 50, balanceChangePln: 900 });
    expect(flow.netPln).toBe(-50);
    expect(flow.source).toBe("raport");
  });

  it("bez kwot spada na różnicę sald", () => {
    const flow = dayCashFlow({ balanceChangePln: -420 });
    expect(flow.netPln).toBe(-420);
    expect(flow.expensesPln).toBeNull();
    expect(flow.source).toBe("saldo");
  });

  it("bez żadnych danych nie zgaduje", () => {
    const flow = dayCashFlow({ expensesPln: null, incomePln: null, balanceChangePln: null });
    expect(flow.netPln).toBeNull();
    expect(flow.source).toBeNull();
  });

  it("sumuje tylko dni z wpisem — brak danych to nie zero", () => {
    const flows = [
      dayCashFlow({ expensesPln: 100 }),
      dayCashFlow({ balanceChangePln: -500 }),
      dayCashFlow({ expensesPln: 50, incomePln: 200 }),
    ];
    expect(sumExpenses(flows)).toEqual({ totalPln: 150, days: 2 });
    expect(sumIncome(flows)).toEqual({ totalPln: 200, days: 1 });
  });
});

describe("cele oszczędnościowe", () => {
  const goal = { id: "g1", name: "Wakacje", targetPln: 10000, initialPln: 2000, deadline: "2026-12-31" };

  it("dolicza dopłaty do kwoty startowej", () => {
    const progress = savingsProgress(goal, 3000, "2026-07-26");
    expect(progress.savedPln).toBe(5000);
    expect(progress.pct).toBe(50);
    expect(progress.remainingPln).toBe(5000);
    expect(progress.done).toBe(false);
  });

  it("nie przekracza 100% na pasku, ale pokazuje pełną odłożoną kwotę", () => {
    const progress = savingsProgress(goal, 9000, "2026-07-26");
    expect(progress.savedPln).toBe(11000);
    expect(progress.pct).toBe(100);
    expect(progress.remainingPln).toBe(0);
    expect(progress.done).toBe(true);
  });

  it("liczy, ile trzeba odkładać tygodniowo do terminu", () => {
    // 5000 zł brakuje, 70 dni do terminu = 10 tygodni.
    const progress = savingsProgress({ ...goal, deadline: "2026-10-04" }, 3000, "2026-07-26");
    expect(progress.daysLeft).toBe(70);
    expect(progress.requiredPerWeekPln).toBe(500);
  });

  it("nie wylicza tempa bez terminu ani po jego upływie", () => {
    expect(savingsProgress({ ...goal, deadline: null }, 3000, "2026-07-26").requiredPerWeekPln).toBeNull();
    expect(savingsProgress({ ...goal, deadline: "2026-07-01" }, 3000, "2026-07-26").requiredPerWeekPln).toBeNull();
  });

  it("ocenia tempo względem wymaganego", () => {
    const progress = savingsProgress({ ...goal, deadline: "2026-10-04" }, 3000, "2026-07-26");
    expect(savingsPace(progress, 700)).toBe("przed");
    expect(savingsPace(progress, 500)).toBe("zgodnie");
    expect(savingsPace(progress, 200)).toBe("za wolno");
    expect(savingsPace(progress, null)).toBeNull();
  });

  it("sumuje cele do jednego wskaźnika", () => {
    const a = savingsProgress({ id: "a", name: "A", targetPln: 5000 }, 2500, "2026-07-26");
    const b = savingsProgress({ id: "b", name: "B", targetPln: 5000 }, 500, "2026-07-26");
    expect(summarizeSavings([a, b])).toEqual({ goals: 2, savedPln: 3000, targetPln: 10000, pct: 30, done: 0 });
  });
});

describe("płatności cykliczne", () => {
  const czynsz = {
    id: "o1",
    name: "Czynsz",
    amountPln: 2400,
    cadence: "miesiecznie" as const,
    firstDueDate: "2026-01-10",
    endDate: null,
  };

  it("generuje kolejne terminy miesięczne", () => {
    expect(obligationOccurrences(czynsz, "2026-07-01", "2026-09-30")).toEqual([
      "2026-07-10",
      "2026-08-10",
      "2026-09-10",
    ]);
  });

  it("nie wychodzi poza koniec zobowiązania", () => {
    const rata = { ...czynsz, name: "Rata", endDate: "2026-08-10" };
    expect(obligationOccurrences(rata, "2026-07-01", "2026-12-31")).toEqual(["2026-07-10", "2026-08-10"]);
  });

  it("cofa termin do ostatniego dnia krótszego miesiąca", () => {
    const plan = { ...czynsz, firstDueDate: "2026-01-31" };
    expect(obligationOccurrences(plan, "2026-02-01", "2026-04-30")).toEqual([
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("płatność jednorazowa wypada tylko raz", () => {
    const jednorazowa = { ...czynsz, cadence: "jednorazowo" as const, firstDueDate: "2026-07-15" };
    expect(obligationOccurrences(jednorazowa, "2026-07-01", "2026-12-31")).toEqual(["2026-07-15"]);
  });

  it("rozpoznaje zaległości i zapłacone raty", () => {
    const payments = paymentsInRange(
      [czynsz],
      [{ obligationId: "o1", dueDate: "2026-06-10", paidOn: "2026-06-11", amountPln: 2400 }],
      "2026-06-01",
      "2026-08-31",
      "2026-07-26",
    );
    expect(payments.map((p) => [p.dueDate, p.status])).toEqual([
      ["2026-06-10", "zaplacone"],
      ["2026-07-10", "zalegle"],
      ["2026-08-10", "do-zaplaty"],
    ]);
  });

  it("sprowadza koszty do miesiąca, pomijając jednorazowe", () => {
    const summary = summarizeObligations([
      czynsz,
      { ...czynsz, id: "o2", name: "OC auta", amountPln: 1200, cadence: "rocznie" },
      { ...czynsz, id: "o3", name: "Netflix", amountPln: 60, cadence: "miesiecznie", category: "subskrypcje" },
      { ...czynsz, id: "o4", name: "Wycieczka", amountPln: 5000, cadence: "jednorazowo" },
    ]);
    expect(summary.monthlyPln).toBe(2560); // 2400 + 100 + 60
    expect(summary.yearlyPln).toBe(30720);
    expect(summary.oneOffPln).toBe(5000);
    expect(summary.byCategory[0]).toEqual({ category: "bez kategorii", monthlyPln: 2500 });
  });

  it("pomija zobowiązania zakończone przed dzisiaj", () => {
    const summary = summarizeObligations([{ ...czynsz, endDate: "2026-05-10" }], "2026-07-26");
    expect(summary.monthlyPln).toBe(0);
    expect(summary.count).toBe(0);
  });

  it("opisuje termin po ludzku", () => {
    expect(dueLabel("2026-07-26", "2026-07-26")).toBe("dziś");
    expect(dueLabel("2026-07-27", "2026-07-26")).toBe("jutro");
    expect(dueLabel("2026-07-31", "2026-07-26")).toBe("za 5 dni");
    expect(dueLabel("2026-07-20", "2026-07-26")).toBe("6 dni po terminie");
  });
});

describe("pozycja zarobkowa", () => {
  it("odtwarza opublikowane progi światowe", () => {
    // Próg górnych 10% to 65 500 $ PPP rocznie = 10 917 zł miesięcznie przy 2,0 zł/$.
    const top10 = incomeRank((65500 * 2) / 12);
    expect(top10.world?.topPct).toBeCloseTo(10, 1);

    // Próg górnego 1%: 250 300 $ PPP rocznie.
    const top1 = incomeRank((250300 * 2) / 12);
    expect(top1.world?.topPct).toBeCloseTo(1, 1);

    // Mediana światowa: 6 000 $ PPP rocznie = 1 000 zł miesięcznie.
    const median = incomeRank((6000 * 2) / 12);
    expect(median.world?.percentile).toBeCloseTo(50, 1);
  });

  it("odtwarza progi krajowe z danych GUS", () => {
    expect(incomeRank(7447.16).poland?.percentile).toBeCloseTo(50, 1);
    expect(incomeRank(15500).poland?.topPct).toBeCloseTo(10, 1);
  });

  it("umieszcza 150 000 zł miesięcznie w górnych ułamkach procenta", () => {
    const rank = incomeRank(150000);
    expect(rank.annualPln).toBe(1_800_000);
    expect(rank.world!.topPct).toBeLessThan(0.2);
    expect(rank.world!.topPct).toBeGreaterThan(0.05);
    expect(rank.poland!.topPct).toBeLessThan(0.2);
  });

  it("nie zgaduje pozycji poniżej najniższej kotwicy", () => {
    expect(incomeRank(50).world).toBeNull();
    expect(incomeRank(0).world).toBeNull();
    expect(incomeRank(1000).poland).toBeNull(); // poniżej pierwszego decyla GUS
  });

  it("dobiera dokładność etykiety do wysokości pozycji", () => {
    expect(formatTopPct(0.113)).toBe("górne 0,11%");
    expect(formatTopPct(3.4)).toBe("górne 3,4%");
    expect(formatTopPct(37.2)).toBe("górne 37%");
    expect(formatTopPct(0.004)).toBe("górne 0,01%");
  });

  it("opisuje wynik zdaniem dopasowanym do rozkładu", () => {
    expect(describeRank({ percentile: 99.89, topPct: 0.11 }, "swiat")).toContain("dorosłych na świecie");
    expect(describeRank({ percentile: 82, topPct: 18 }, "polska")).toBe("Więcej niż 82% zatrudnionych w Polsce");
  });
});

describe("odliczanie", () => {
  const wakacje = { id: "c1", name: "wakacje Włochy 2027", targetDate: "2027-07-04" };

  it("liczy dni do wydarzenia", () => {
    const countdown = countdownFor(wakacje, "2026-07-27");
    expect(countdown.days).toBe(342);
    expect(countdown.state).toBe("przed");
  });

  it("rozpoznaje dzień wydarzenia i dni po nim", () => {
    expect(countdownFor(wakacje, "2027-07-04").state).toBe("dzis");
    expect(countdownFor(wakacje, "2027-07-04").days).toBe(0);
    expect(countdownFor(wakacje, "2027-07-10").days).toBe(-6);
    expect(countdownFor(wakacje, "2027-07-10").state).toBe("po");
  });

  it("nie gubi dnia na przełomie roku ani w roku przestępnym", () => {
    expect(countdownFor({ ...wakacje, targetDate: "2027-01-01" }, "2026-12-31").days).toBe(1);
    expect(countdownFor({ ...wakacje, targetDate: "2028-03-01" }, "2028-02-28").days).toBe(2);
  });

  it("stawia najbliższe wydarzenie na początku, a minione na końcu", () => {
    const today = "2026-07-27";
    const list = sortCountdowns([
      countdownFor({ id: "a", name: "dawno", targetDate: "2026-07-01" }, today),
      countdownFor({ id: "b", name: "daleko", targetDate: "2027-07-04" }, today),
      countdownFor({ id: "c", name: "blisko", targetDate: "2026-08-10" }, today),
      countdownFor({ id: "d", name: "wczoraj", targetDate: "2026-07-26" }, today),
    ]);
    expect(list.map((entry) => entry.name)).toEqual(["blisko", "daleko", "wczoraj", "dawno"]);
  });

  it("odmienia dni po polsku", () => {
    expect(formatDaysPl(1)).toBe("1 dzień");
    expect(formatDaysPl(2)).toBe("2 dni");
    expect(formatDaysPl(22)).toBe("22 dni");
    expect(formatDaysPl(-5)).toBe("5 dni");
  });

  it("opisuje odległość w naturalnej jednostce", () => {
    const at = (date: string) => describeCountdown(countdownFor(wakacje, date));
    expect(at("2027-07-04")).toBe("dzisiaj");
    expect(at("2027-07-03")).toBe("jutro");
    expect(at("2027-07-05")).toBe("wczoraj");
    expect(at("2027-06-30")).toBe("za 4 dni");
    expect(at("2027-06-10")).toBe("za 3 tygodnie");
    expect(at("2027-01-04")).toBe("za 6 miesięcy");
    expect(at("2027-07-20")).toBe("16 dni temu");
  });
});

describe("lejek do podpisania", () => {
  const deals = [
    { clientName: "Alfa", valuePln: 12000, stage: "do-podpisania" as const },
    { clientName: "Beta", valuePln: 8000, stage: "do-podpisania" as const },
    { clientName: "Gamma", valuePln: 30000, stage: "podpisana" as const },
    { clientName: "Delta", valuePln: 5000, stage: "przepadla" as const },
  ];

  it("sumuje tylko pozycje czekające na podpis", () => {
    const summary = summarizeDeals(deals);
    expect(summary.open).toBe(2);
    expect(summary.openPln).toBe(20000);
  });

  it("liczy podpisane i przepadłe osobno", () => {
    const summary = summarizeDeals(deals);
    expect(summary.won).toBe(1);
    expect(summary.wonPln).toBe(30000);
    expect(summary.lost).toBe(1);
    expect(summary.winRate).toBe(50);
  });

  it("bez zamkniętych pozycji nie wylicza skuteczności", () => {
    expect(summarizeDeals([deals[0]]).winRate).toBeNull();
    expect(summarizeDeals([]).openPln).toBe(0);
  });
});

describe("daty rodzinne", () => {
  const ania = { id: "m1", name: "Ania", birthDate: "1990-03-14" };
  const rocznica = {
    id: "e1",
    name: "Rocznica ślubu",
    date: "2018-09-08",
    kind: "rocznica" as const,
    recurring: true,
  };
  const randka = { id: "e2", name: "Randka", date: "2026-08-02", kind: "randka" as const, recurring: false };

  it("znajduje najbliższe urodziny, także po przejściu przez koniec roku", () => {
    expect(nextAnnualOccurrence("1990-03-14", "2026-07-27")).toBe("2027-03-14");
    expect(nextAnnualOccurrence("1990-08-14", "2026-07-27")).toBe("2026-08-14");
    // Dzień wydarzenia liczy się jako najbliższy, nie jako miniony.
    expect(nextAnnualOccurrence("1990-07-27", "2026-07-27")).toBe("2026-07-27");
  });

  it("przenosi 29 lutego na 28 w roku nieprzestępnym", () => {
    expect(nextAnnualOccurrence("2000-02-29", "2026-01-01")).toBe("2026-02-28");
    expect(nextAnnualOccurrence("2000-02-29", "2028-01-01")).toBe("2028-02-29");
  });

  it("wydarzenie jednorazowe pojawia się tylko raz", () => {
    expect(occurrencesInRange("2026-08-02", false, "2026-01-01", "2028-01-01")).toEqual(["2026-08-02"]);
    expect(occurrencesInRange("2026-08-02", true, "2026-01-01", "2028-01-01")).toEqual([
      "2026-08-02",
      "2027-08-02",
    ]);
  });

  it("dokłada wiek i numer rocznicy", () => {
    const dates = familyDatesInRange([ania], [rocznica], "2026-01-01", "2026-12-31", "2026-07-27");
    const urodziny = dates.find((entry) => entry.kind === "urodziny");
    const jubileusz = dates.find((entry) => entry.kind === "rocznica");
    expect(urodziny?.ordinal).toBe(36);
    expect(urodziny?.label).toBe("Urodziny — Ania");
    expect(jubileusz?.ordinal).toBe(8);
  });

  it("sortuje najbliższe daty rosnąco", () => {
    const upcoming = upcomingFamilyDates([ania], [rocznica, randka], "2026-07-27", 120);
    expect(upcoming.map((entry) => entry.date)).toEqual(["2026-08-02", "2026-09-08"]);
  });
});

describe("plan drobnych gestów", () => {
  it("planuje tyle gestów, ile ustawiono, i rozkłada je w tygodniu", () => {
    const plan = planGesturesForWeek("2026-07-27", 2);
    expect(plan).toHaveLength(2);
    expect(plan[0].date).toBe("2026-07-27");
    expect(plan[1].date).toBe("2026-07-30");
  });

  it("zero wyłącza podpowiedzi", () => {
    expect(planGesturesForWeek("2026-07-27", 0)).toEqual([]);
  });

  it("ten sam tydzień daje ten sam plan, kolejny — inny", () => {
    const a = planGesturesForWeek("2026-07-27", 2);
    const b = planGesturesForWeek("2026-07-27", 2);
    const next = planGesturesForWeek("2026-08-03", 2);
    expect(a.map((e) => e.gesture.id)).toEqual(b.map((e) => e.gesture.id));
    expect(next.map((e) => e.gesture.id)).not.toEqual(a.map((e) => e.gesture.id));
  });

  it("nie powtarza gestu w obrębie tygodnia", () => {
    const plan = planGesturesForWeek("2026-07-27", 5);
    expect(new Set(plan.map((entry) => entry.gesture.id)).size).toBe(5);
  });

  it("różnicuje plan między kontami", () => {
    const a = planGesturesForWeek("2026-07-27", 2, seedFromId("user-a"));
    const b = planGesturesForWeek("2026-07-27", 2, seedFromId("user-b"));
    expect(a.map((e) => e.gesture.id)).not.toEqual(b.map((e) => e.gesture.id));
  });

  it("każdy gest w katalogu ma źródło i konkretną instrukcję", () => {
    for (const gesture of GESTURES) {
      expect(gesture.text.length).toBeGreaterThan(20);
      expect(gesture.why.length).toBeGreaterThan(10);
      expect(gesture.minutes).toBeGreaterThan(0);
      expect(gesture.source).toBeTruthy();
    }
    expect(new Set(GESTURES.map((g) => g.id)).size).toBe(GESTURES.length);
  });
});

describe("skala wykresu", () => {
  it("zaokrągla górę osi w górę do okrągłej wartości", () => {
    expect(niceScaleMax(22)).toBe(25);
    expect(niceScaleMax(3400)).toBe(4000);
    expect(niceScaleMax(7)).toBe(8);
    expect(niceScaleMax(1)).toBe(1);
  });

  it("zawsze zostawia miejsce nad najwyższym słupkiem albo kończy równo", () => {
    for (const value of [1, 3, 9, 17, 48, 260, 2450, 19999]) {
      expect(niceScaleMax(value)).toBeGreaterThanOrEqual(value);
    }
  });

  it("nie wywraca się na zerze i wartościach ujemnych", () => {
    expect(niceScaleMax(0)).toBe(1);
    expect(niceScaleMax(-5)).toBe(1);
    expect(niceScaleMax(Number.NaN)).toBe(1);
  });

  it("daje podpisy od góry do zera", () => {
    expect(scaleTicks(25)).toEqual([25, 12.5, 0]);
    expect(scaleTicks(4000, 4)).toEqual([4000, 3000, 2000, 1000, 0]);
  });
});

describe("nawodnienie", () => {
  const goal = 3000;

  it("kategoryzuje względem celu i progów użytkownika", () => {
    expect(waterStatus(3000, goal)).toBe("dobrze");
    expect(waterStatus(3200, goal)).toBe("dobrze");
    expect(waterStatus(2400, goal)).toBe("norma"); // 80 %
    expect(waterStatus(2900, goal)).toBe("norma");
    expect(waterStatus(2399, goal)).toBe("zle");
  });

  it("respektuje własne progi", () => {
    // 2600 / 3000 to ~87 % celu.
    expect(waterStatus(2600, goal, 85, 60)).toBe("dobrze");
    expect(waterStatus(2600, goal, 90, 60)).toBe("norma");
    expect(waterStatus(1700, goal, 90, 60)).toBe("zle");
  });

  it("nie ocenia, gdy brak celu albo brak danych", () => {
    expect(waterStatus(2000, null)).toBeNull();
    expect(waterStatus(null, goal)).toBeNull();
  });

  it("liczy średnią tylko z dni z wpisem", () => {
    expect(averageOfReportedDays([2000, null, 3000, undefined])).toBe(2500);
    expect(averageOfReportedDays([null, undefined])).toBeNull();
  });
});

describe("plan nauki", () => {
  const weekPlans = [
    { id: "pn", weekday: 1, skill: "hiszpański", startTime: "18:00:00", durationMin: 60, active: true, position: 0 },
    { id: "wt", weekday: 2, skill: "rolnictwo", startTime: "18:00:00", durationMin: 60, active: true, position: 0 },
    { id: "sr", weekday: 3, skill: "narzędzia AI", startTime: "20:00:00", durationMin: 45, active: true, position: 0 },
    { id: "sr2", weekday: 3, skill: "hiszpański", startTime: "07:00:00", durationMin: 30, active: true, position: 1 },
    { id: "off", weekday: 4, skill: "hiszpański", startTime: "18:00:00", durationMin: 60, active: false, position: 0 },
  ];

  const yearPlans = [
    {
      id: "q3",
      periodStart: "2026-07-01",
      periodEnd: "2026-09-30",
      skill: "Hiszpański",
      focus: "czasy przeszłe",
      target: "swobodna rozmowa o przeszłości",
    },
  ];

  it("zwraca bloki dnia posortowane po godzinie", () => {
    const blocks = learningBlocksForDate("2026-07-29", weekPlans, yearPlans); // środa
    expect(blocks.map((b) => b.skill)).toEqual(["hiszpański", "narzędzia AI"]);
  });

  it("nakłada zakres z planu rocznego, dopasowując nazwę bez względu na wielkość liter", () => {
    const [blok] = learningBlocksForDate("2026-07-27", weekPlans, yearPlans); // poniedziałek
    expect(blok.skill).toBe("hiszpański");
    expect(blok.focus).toBe("czasy przeszłe");
  });

  it("nie nakłada okresu spoza zakresu dat", () => {
    const [blok] = learningBlocksForDate("2026-10-05", weekPlans, yearPlans);
    expect(blok.focus).toBeNull();
  });

  it("dzień bez wpisu w planie jest wolny", () => {
    expect(learningBlocksForDate("2026-08-01", weekPlans, yearPlans)).toEqual([]); // sobota
  });

  it("pomija wyłączone pozycje planu", () => {
    expect(learningBlocksForDate("2026-07-30", weekPlans, yearPlans)).toEqual([]); // czwartek, wpis nieaktywny
  });
});

describe("leki i suplementy", () => {
  const base = {
    doseAmount: 1,
    doseUnit: "tabletka",
    daysOfWeek: [] as number[],
    active: true,
    startDate: null,
    endDate: null,
    notes: null,
    position: 0,
  };

  const meds = [
    { ...base, id: "a", name: "Magnez", kind: "suplement" as const, timesOfDay: ["wieczór", "rano"] },
    { ...base, id: "b", name: "Witamina D", kind: "suplement" as const, timesOfDay: ["rano"] },
    { ...base, id: "c", name: "Lek tylko w poniedziałki", kind: "lek" as const, timesOfDay: ["rano"], daysOfWeek: [1] },
  ];

  it("rozwija pozycje na dawki i porządkuje je wg pory dnia", () => {
    const doses = medicationScheduleForDate("2026-07-27", meds); // poniedziałek
    expect(doses.map((d) => `${d.slot}:${d.name}`)).toEqual([
      "rano:Lek tylko w poniedziałki",
      "rano:Magnez",
      "rano:Witamina D",
      "wieczór:Magnez",
    ]);
  });

  it("respektuje wybrane dni tygodnia", () => {
    const doses = medicationScheduleForDate("2026-07-28", meds); // wtorek
    expect(doses.some((d) => d.name === "Lek tylko w poniedziałki")).toBe(false);
  });

  it("wyłączony lub zakończony lek znika z listy dnia", () => {
    const zmienione = [
      { ...meds[0], active: false },
      { ...meds[1], endDate: "2026-07-01" },
    ];
    expect(medicationScheduleForDate("2026-07-27", zmienione)).toEqual([]);
  });

  it("nie pokazuje leku przed datą rozpoczęcia", () => {
    const przyszly = [{ ...meds[1], startDate: "2026-08-01" }];
    expect(medicationScheduleForDate("2026-07-27", przyszly)).toEqual([]);
    expect(medicationScheduleForDate("2026-08-02", przyszly)).toHaveLength(1);
  });

  it("oznacza przyjęte dawki na podstawie dziennika", () => {
    const doses = medicationScheduleForDate("2026-07-27", meds, [
      { medicationId: "b", slot: "rano", taken: true },
    ]);
    expect(doses.find((d) => d.name === "Witamina D")?.taken).toBe(true);
    expect(doses.find((d) => d.name === "Magnez")?.taken).toBe(false);
  });

  it("sortuje godziny chronologicznie, po nazwanych porach dnia", () => {
    expect(slotSortKey("rano")[0]).toBeLessThan(slotSortKey("wieczór")[0]);
    expect(slotSortKey("07:30")[0]).toBeLessThan(slotSortKey("19:00")[0]);
    expect(slotSortKey("noc")[0]).toBeLessThan(slotSortKey("07:30")[0]);
  });
});

describe("rekordy", () => {
  const rows = [
    { id: "1", discipline: "rower", metric: "dystans", unit: "km", value: 80, higherIsBetter: true, achievedOn: "2026-05-01", note: null },
    { id: "2", discipline: "rower", metric: "dystans", unit: "km", value: 120, higherIsBetter: true, achievedOn: "2026-06-01", note: null },
    { id: "3", discipline: "pływanie", metric: "czas na 1 km", unit: "min", value: 24, higherIsBetter: false, achievedOn: "2026-05-10", note: null },
    { id: "4", discipline: "pływanie", metric: "czas na 1 km", unit: "min", value: 21.5, higherIsBetter: false, achievedOn: "2026-07-10", note: null },
  ];

  it("dla metryki 'większe lepsze' bierze największą wartość", () => {
    const rower = currentRecords(rows).find((g) => g.discipline === "rower");
    expect(rower?.best.value).toBe(120);
    expect(rower?.previousBest?.value).toBe(80);
  });

  it("dla metryki 'mniejsze lepsze' bierze najmniejszą wartość", () => {
    const plywanie = currentRecords(rows).find((g) => g.discipline === "pływanie");
    expect(plywanie?.best.value).toBe(21.5);
  });

  it("rozpoznaje pobicie rekordu w obie strony", () => {
    expect(beatsRecord(rows, { discipline: "rower", metric: "dystans", value: 130, higherIsBetter: true })).toBe(true);
    expect(beatsRecord(rows, { discipline: "rower", metric: "dystans", value: 100, higherIsBetter: true })).toBe(false);
    expect(beatsRecord(rows, { discipline: "pływanie", metric: "czas na 1 km", value: 20, higherIsBetter: false })).toBe(true);
    expect(beatsRecord(rows, { discipline: "pływanie", metric: "czas na 1 km", value: 23, higherIsBetter: false })).toBe(false);
  });

  it("pierwszy wynik w nowej dyscyplinie zawsze jest rekordem", () => {
    expect(beatsRecord(rows, { discipline: "bieganie", metric: "dystans", value: 5, higherIsBetter: true })).toBe(true);
  });
});

describe("sprzedaż", () => {
  it("sumuje dni i liczy konwersje lejka", () => {
    const totals = sumSales([
      { calls: 10, meetingsScheduled: 4, meetingsHeld: 3, contracts: 1, valuePln: 12000 },
      { calls: 10, meetingsScheduled: 2, meetingsHeld: 1, contracts: 1, valuePln: 8000 },
    ]);
    expect(totals.calls).toBe(20);
    expect(totals.valuePln).toBe(20000);

    const rates = conversionRates(totals);
    expect(rates.callToScheduled).toBeCloseTo(0.3);
    expect(rates.heldToContract).toBeCloseTo(0.5);
  });

  it("nie dzieli przez zero", () => {
    expect(conversionRates(sumSales([])).callToScheduled).toBeNull();
  });
});

describe("testy stanu psychicznego", () => {
  const who5Max = MENTAL_TESTS.who5.items.map(() => 5);
  const phq9Zero = MENTAL_TESTS.phq9.items.map(() => 0);

  it("przelicza WHO-5 z surowych 0–25 na skalę 0–100", () => {
    expect(scoreAssessment("who5", who5Max)?.score).toBe(100);
    expect(scoreAssessment("who5", [0, 0, 0, 0, 0])?.score).toBe(0);
    expect(scoreAssessment("who5", [3, 3, 3, 3, 3])?.score).toBe(60);
  });

  it("zwraca punkty wprost dla GAD-7 i PHQ-9", () => {
    expect(scoreAssessment("gad7", [3, 3, 3, 3, 3, 3, 3])?.score).toBe(21);
    expect(scoreAssessment("phq9", phq9Zero)?.score).toBe(0);
  });

  it("przypisuje przedziały zgodne z progami z narzędzi", () => {
    // WHO-5: ≤28 to poziom spotykany przy depresji, ≤50 to próg przesiewowy.
    expect(scoreAssessment("who5", [1, 1, 1, 1, 1])?.band.tone).toBe("critical");
    expect(scoreAssessment("who5", [2, 2, 3, 2, 2])?.band.tone).toBe("warning");
    expect(scoreAssessment("who5", [4, 4, 4, 4, 4])?.band.tone).toBe("good");

    // GAD-7 i PHQ-9: od 10 punktów zalecana dalsza diagnostyka.
    expect(scoreAssessment("gad7", [2, 2, 2, 2, 1, 1, 0])?.score).toBe(10);
    expect(scoreAssessment("gad7", [2, 2, 2, 2, 1, 1, 0])?.band.tone).toBe("warning");
    expect(scoreAssessment("gad7", [1, 1, 1, 1, 0, 0, 0])?.band.tone).toBe("good");
    expect(scoreAssessment("phq9", [3, 3, 3, 3, 3, 3, 2, 0, 0])?.band.tone).toBe("critical");
  });

  it("odrzuca niekompletny i wykraczający poza skalę zestaw odpowiedzi", () => {
    expect(scoreAssessment("who5", [5, 5, 5])).toBeNull();
    expect(scoreAssessment("gad7", [0, 0, 0, 0, 0, 0, 4])).toBeNull();
    expect(scoreAssessment("gad7", [0, 0, 0, 0, 0, 0, 1.5])).toBeNull();
    expect(scoreAssessment("gad7", [0, 0, 0, 0, 0, 0, -1])).toBeNull();
  });

  it("podnosi sygnał ryzyka tylko przy dodatniej odpowiedzi w pytaniu 9 PHQ-9", () => {
    expect(scoreAssessment("phq9", phq9Zero)?.riskFlag).toBe(false);
    expect(scoreAssessment("phq9", [0, 0, 0, 0, 0, 0, 0, 0, 1])?.riskFlag).toBe(true);
    // Niski wynik ogólny nie kasuje sygnału — o tym pytaniu decyduje sama odpowiedź.
    expect(scoreAssessment("phq9", [0, 0, 0, 0, 0, 0, 0, 0, 1])?.band.tone).toBe("good");
    expect(scoreAssessment("gad7", [3, 3, 3, 3, 3, 3, 3])?.riskFlag).toBe(false);
  });

  it("wyznacza termin kolejnego wypełnienia z rytmu testu", () => {
    expect(nextDueDate("who5", "2026-07-01")).toBe("2026-07-08");
    expect(nextDueDate("phq9", "2026-07-01")).toBe("2026-07-31");
    expect(nextDueDate("who5", null)).toBeNull();
  });

  it("test nigdy nie wypełniony jest zawsze do zrobienia", () => {
    expect(isDue("who5", null, "2026-07-27")).toBe(true);
    expect(isDue("who5", "2026-07-27", "2026-07-27")).toBe(false);
    expect(isDue("who5", "2026-07-20", "2026-07-27")).toBe(true);
  });

  it("czyta kierunek zmiany zgodnie ze skalą testu", () => {
    // WHO-5: więcej punktów to lepiej.
    expect(compareScores("who5", 72, 60)).toEqual({ delta: 12, improved: true });
    // GAD-7: więcej punktów to więcej objawów.
    expect(compareScores("gad7", 12, 8)).toEqual({ delta: 4, improved: false });
    expect(compareScores("gad7", 8, 12)).toEqual({ delta: -4, improved: true });
    expect(compareScores("who5", 60, null).improved).toBeNull();
    expect(compareScores("who5", 60, 60).improved).toBeNull();
  });
});
