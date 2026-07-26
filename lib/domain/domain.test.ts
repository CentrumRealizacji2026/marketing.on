import { describe, expect, it } from "vitest";
import { addDays, isoWeekday, lastNDays, startOfWeek, todayInTz } from "./dates";
import { learningBlocksForDate } from "./learning";
import { medicationScheduleForDate, slotSortKey } from "./medication";
import { beatsRecord, currentRecords } from "./records";
import { conversionRates, sumSales } from "./sales";
import { averageOfReportedDays, waterStatus } from "./water";

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
