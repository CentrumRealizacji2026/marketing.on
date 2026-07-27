/**
 * Ocena stanu psychicznego na podstawie kwestionariuszy, a nie jednej suwaka
 * „samopoczucie 1–5". Codzienny wpis dalej ma sens jako puls dnia, ale wynik
 * porównywalny w czasie daje dopiero test z ustaloną punktacją i progami.
 *
 * Używamy trzech narzędzi przesiewowych dostępnych bez opłat:
 *
 * — WHO-5 (Wskaźnik Dobrostanu WHO): 5 pytań, okno dwóch tygodni, wynik surowy
 *   0–25 mnożony przez 4 do skali 0–100. Wynik ≤50 jest zalecanym progiem do
 *   dalszego sprawdzenia w kierunku depresji, ≤28 odpowiada poziomowi dobrostanu
 *   spotykanemu przy depresji. To narzędzie pierwszego rzutu — krótkie i
 *   sformułowane pozytywnie, więc nadaje się do cotygodniowego powtarzania.
 *
 * — GAD-7: 7 pytań o lęk, 0–3 punkty każde, zakres 0–21.
 * — PHQ-9: 9 pytań o objawy depresyjne, 0–3 punkty każde, zakres 0–27.
 *
 * PHQ-9 i GAD-7 zostały udostępnione przez Pfizer bez ograniczeń licencyjnych —
 * nie wymagają zgody na powielanie, tłumaczenie i rozpowszechnianie. WHO-5 jest
 * darmowo dostępny w wielu językach na who-5.org.
 *
 * Treść pytań poniżej to polskie sformułowania przygotowane na potrzeby tej
 * aplikacji, wierne treści oryginałów, ale nie będące oficjalnym, walidowanym
 * tłumaczeniem — interfejs mówi o tym wprost i linkuje do źródeł.
 *
 * ŻADEN z tych wyników nie jest diagnozą. To wskaźnik do obserwacji własnej
 * i ewentualnej rozmowy ze specjalistą.
 */

export type MentalTestId = "who5" | "gad7" | "phq9";

export type BandTone = "good" | "warning" | "critical";

export type TestBand = {
  /** Górna granica przedziału (włącznie) w punktach wyniku prezentowanego. */
  upTo: number;
  label: string;
  tone: BandTone;
  advice: string;
};

export type MentalTest = {
  id: MentalTestId;
  name: string;
  /** Co mierzy — jedno zdanie. */
  measures: string;
  /** Nagłówek nad pytaniami, np. okno czasowe. */
  prompt: string;
  /** Odpowiedzi wspólne dla wszystkich pytań: etykieta i punkty. */
  options: Array<{ label: string; value: number }>;
  items: string[];
  /** Ile dni między kolejnymi wypełnieniami — WHO-5 częściej, reszta rzadziej. */
  cadenceDays: number;
  /** Maksimum prezentowanego wyniku (WHO-5 pokazujemy w skali 0–100). */
  displayMax: number;
  /** Czy wyższy wynik jest lepszy (WHO-5) czy gorszy (GAD-7, PHQ-9). */
  higherIsBetter: boolean;
  bands: TestBand[];
  source: { label: string; url: string };
  /** Indeks pytania, którego dodatnia odpowiedź wymaga natychmiastowej reakcji. */
  riskItemIndex?: number;
};

const FREQUENCY_0_3 = [
  { label: "Wcale", value: 0 },
  { label: "Kilka dni", value: 1 },
  { label: "Więcej niż połowę dni", value: 2 },
  { label: "Prawie codziennie", value: 3 },
];

export const MENTAL_TESTS: Record<MentalTestId, MentalTest> = {
  who5: {
    id: "who5",
    name: "WHO-5 — dobrostan",
    measures: "Ogólny dobrostan psychiczny w ostatnich dwóch tygodniach.",
    prompt: "Zaznacz, jak często w ciągu ostatnich dwóch tygodni czułeś się w opisany sposób.",
    options: [
      { label: "Nigdy", value: 0 },
      { label: "Sporadycznie", value: 1 },
      { label: "Rzadziej niż połowę czasu", value: 2 },
      { label: "Więcej niż połowę czasu", value: 3 },
      { label: "Przez większość czasu", value: 4 },
      { label: "Cały czas", value: 5 },
    ],
    items: [
      "Byłem pogodny i w dobrym nastroju.",
      "Byłem spokojny i odprężony.",
      "Byłem aktywny i pełen energii.",
      "Budziłem się wypoczęty i pełen sił.",
      "Mój codzienny dzień był wypełniony rzeczami, które mnie interesują.",
    ],
    cadenceDays: 7,
    displayMax: 100,
    higherIsBetter: true,
    bands: [
      {
        upTo: 28,
        label: "Niski dobrostan",
        tone: "critical",
        advice:
          "Wynik na poziomie spotykanym przy depresji. To sygnał, żeby porozmawiać z lekarzem albo psychoterapeutą — nie żeby przeczekać.",
      },
      {
        upTo: 50,
        label: "Obniżony dobrostan",
        tone: "warning",
        advice:
          "Zalecany próg do dalszego sprawdzenia. Warto wypełnić PHQ-9 i przyjrzeć się snu, obciążeniu i wsparciu wokół siebie.",
      },
      {
        upTo: 100,
        label: "Dobrostan w normie",
        tone: "good",
        advice: "Wynik powyżej progu przesiewowego. Powtórz test za tydzień, żeby widzieć tendencję.",
      },
    ],
    source: {
      label: "WHO-5 Well-Being Index — przegląd systematyczny (Topp i in., 2015)",
      url: "https://karger.com/pps/article/84/3/167/282903/The-WHO-5-Well-Being-Index-A-Systematic-Review-of",
    },
  },

  gad7: {
    id: "gad7",
    name: "GAD-7 — lęk",
    measures: "Nasilenie objawów lękowych w ostatnich dwóch tygodniach.",
    prompt: "Jak często w ciągu ostatnich dwóch tygodni dokuczały Ci poniższe problemy?",
    options: FREQUENCY_0_3,
    items: [
      "Zdenerwowanie, niepokój lub napięcie.",
      "Niemożność przerwania zamartwiania się lub zapanowania nad nim.",
      "Zbyt intensywne zamartwianie się różnymi sprawami.",
      "Trudność z odprężeniem się.",
      "Taki niepokój, że trudno usiedzieć w miejscu.",
      "Łatwe wpadanie w irytację lub rozdrażnienie.",
      "Uczucie lęku, jakby miało się wydarzyć coś złego.",
    ],
    cadenceDays: 30,
    displayMax: 21,
    higherIsBetter: false,
    bands: [
      { upTo: 4, label: "Minimalny lęk", tone: "good", advice: "Objawy na poziomie minimalnym." },
      {
        upTo: 9,
        label: "Łagodny lęk",
        tone: "good",
        advice: "Objawy łagodne. Warto obserwować, czy wynik rośnie w kolejnych miesiącach.",
      },
      {
        upTo: 14,
        label: "Umiarkowany lęk",
        tone: "warning",
        advice: "Od 10 punktów zalecana jest konsultacja — to próg dalszej diagnostyki, nie diagnoza.",
      },
      {
        upTo: 21,
        label: "Nasilony lęk",
        tone: "critical",
        advice: "Wynik wysoki. Umów rozmowę ze specjalistą — lekarzem rodzinnym, psychiatrą albo psychoterapeutą.",
      },
    ],
    source: {
      label: "GAD-7 (Spitzer i in.) — udostępniony bez ograniczeń licencyjnych",
      url: "https://www.pfizer.com/news/press-release/press-release-detail/pfizer_to_offer_free_public_access_to_mental_health_assessment_tools_to_improve_diagnosis_and_patient_care",
    },
  },

  phq9: {
    id: "phq9",
    name: "PHQ-9 — objawy depresyjne",
    measures: "Nasilenie objawów depresyjnych w ostatnich dwóch tygodniach.",
    prompt: "Jak często w ciągu ostatnich dwóch tygodni dokuczały Ci poniższe problemy?",
    options: FREQUENCY_0_3,
    items: [
      "Mała radość lub przyjemność z wykonywania czynności.",
      "Przygnębienie, dołujący nastrój lub poczucie beznadziei.",
      "Kłopoty z zaśnięciem, przerywany sen lub zbyt długi sen.",
      "Zmęczenie lub poczucie braku energii.",
      "Brak apetytu lub przejadanie się.",
      "Złe myślenie o sobie — poczucie porażki lub zawiedzenia siebie i bliskich.",
      "Trudności ze skupieniem się, na przykład przy czytaniu albo oglądaniu telewizji.",
      "Poruszanie się lub mówienie tak wolno, że inni mogli to zauważyć — albo przeciwnie, taki niepokój, że kręciłeś się bardziej niż zwykle.",
      "Myśli, że lepiej byłoby nie żyć albo o zrobieniu sobie krzywdy.",
    ],
    cadenceDays: 30,
    displayMax: 27,
    higherIsBetter: false,
    riskItemIndex: 8,
    bands: [
      { upTo: 4, label: "Objawy minimalne", tone: "good", advice: "Objawy na poziomie minimalnym." },
      {
        upTo: 9,
        label: "Objawy łagodne",
        tone: "good",
        advice: "Objawy łagodne. Warto powtórzyć test za miesiąc i obserwować kierunek.",
      },
      {
        upTo: 14,
        label: "Objawy umiarkowane",
        tone: "warning",
        advice: "Od 10 punktów zalecana jest konsultacja — to próg dalszej diagnostyki, nie diagnoza.",
      },
      {
        upTo: 19,
        label: "Objawy umiarkowanie ciężkie",
        tone: "critical",
        advice: "Wynik wysoki. Umów rozmowę ze specjalistą.",
      },
      {
        upTo: 27,
        label: "Objawy ciężkie",
        tone: "critical",
        advice: "Wynik bardzo wysoki. Nie odkładaj kontaktu z lekarzem albo psychoterapeutą.",
      },
    ],
    source: {
      label: "PHQ-9 (Kroenke, Spitzer, Williams) — udostępniony bez ograniczeń licencyjnych",
      url: "https://www.pfizer.com/news/press-release/press-release-detail/pfizer_to_offer_free_public_access_to_mental_health_assessment_tools_to_improve_diagnosis_and_patient_care",
    },
  },
};

export const MENTAL_TEST_IDS = Object.keys(MENTAL_TESTS) as MentalTestId[];

export function isMentalTestId(value: string): value is MentalTestId {
  return (MENTAL_TEST_IDS as string[]).includes(value);
}

export type AssessmentResult = {
  testId: MentalTestId;
  /** Suma punktów z odpowiedzi. */
  raw: number;
  /** Wynik pokazywany użytkownikowi — dla WHO-5 przeskalowany do 0–100. */
  score: number;
  max: number;
  band: TestBand;
  /** Dodatnia odpowiedź w pytaniu o myśli samobójcze — wymaga reakcji, nie punktacji. */
  riskFlag: boolean;
};

/**
 * Punktacja testu. Odpowiedzi muszą być kompletne — niepełny zestaw daje null,
 * bo częściowy wynik nie jest porównywalny z progami z badań.
 */
export function scoreAssessment(testId: MentalTestId, answers: number[]): AssessmentResult | null {
  const test = MENTAL_TESTS[testId];
  if (answers.length !== test.items.length) return null;

  const maxOption = Math.max(...test.options.map((option) => option.value));
  if (answers.some((value) => !Number.isInteger(value) || value < 0 || value > maxOption)) return null;

  const raw = answers.reduce((sum, value) => sum + value, 0);
  // WHO-5 przelicza się na skalę 0–100; pozostałe testy pokazujemy w punktach.
  const score = testId === "who5" ? raw * 4 : raw;

  const band = test.bands.find((candidate) => score <= candidate.upTo) ?? test.bands[test.bands.length - 1];
  const riskFlag = test.riskItemIndex !== undefined && answers[test.riskItemIndex] > 0;

  return { testId, raw, score, max: test.displayMax, band, riskFlag };
}

/** Kiedy wypada kolejne wypełnienie. Null, gdy testu jeszcze nie było — czyli od razu. */
export function nextDueDate(testId: MentalTestId, lastDate: string | null): string | null {
  if (!lastDate) return null;
  const days = MENTAL_TESTS[testId].cadenceDays;
  const date = new Date(`${lastDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isDue(testId: MentalTestId, lastDate: string | null, today: string): boolean {
  const due = nextDueDate(testId, lastDate);
  return due === null || due <= today;
}

/**
 * Porównanie dwóch wyników tego samego testu z uwzględnieniem kierunku skali:
 * w WHO-5 wzrost jest poprawą, w GAD-7 i PHQ-9 — pogorszeniem.
 */
export function compareScores(
  testId: MentalTestId,
  current: number,
  previous: number | null,
): { delta: number; improved: boolean | null } {
  if (previous === null) return { delta: 0, improved: null };
  const delta = current - previous;
  if (delta === 0) return { delta, improved: null };
  return { delta, improved: MENTAL_TESTS[testId].higherIsBetter ? delta > 0 : delta < 0 };
}

/** Numery, które muszą być widoczne przy każdym niepokojącym wyniku. */
export const CRISIS_CONTACTS = [
  { label: "Centrum Wsparcia — całodobowo", number: "800 70 2222" },
  { label: "Kryzysowy telefon zaufania", number: "116 123" },
  { label: "Numer alarmowy przy zagrożeniu życia", number: "112" },
];
