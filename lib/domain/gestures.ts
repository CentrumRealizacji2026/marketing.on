import { addDays, isoWeekday, startOfWeek } from "./dates";

/**
 * Drobne gesty dla bliskiej osoby, planowane automatycznie na tydzień.
 *
 * Katalog nie jest zbiorem „romantycznych porad” z internetu — każda pozycja
 * wynika z jednego z czterech mechanizmów opisanych w badaniach nad związkami:
 *
 * 1. Zwracanie się ku drugiej osobie (Gottman). W obserwacjach nowożeńców pary,
 *    które przetrwały, odpowiadały na drobne zaczepki partnera w 86% przypadków,
 *    a te, które się rozstały — w 33%. Stąd nacisk na małe, częste reakcje
 *    zamiast wielkich gestów raz na kwartał („small things often”).
 * 2. Wdzięczność wypowiedziana wprost (Algoe). Teoria find–remind–and–bind mówi,
 *    że wdzięczność zbliża, ale badanie „Putting the You in Thank You” pokazało,
 *    że działa ta jej odmiana, która mówi o d r u g i e j  o s o b i e („to
 *    pokazuje, jaki jesteś"), a nie o własnej korzyści („bardzo mi pomogłeś”).
 * 3. Wspólna nowość (Aron, self-expansion). Pary robiące razem rzeczy nowe
 *    i pobudzające deklarują mniej nudy i większą bliskość niż te robiące
 *    rzeczy rutynowe — liczy się nowość, nie koszt.
 * 4. Rytuały i mapa drugiej osoby (Gottman). Powtarzalne momenty (powitanie,
 *    pożegnanie, rozmowa o dniu bez doradzania) i aktualna wiedza o tym, czym
 *    druga osoba żyje.
 *
 * Świadomie NIE opieramy tego na „językach miłości”: przegląd Impett, Park
 * i Muise (2024) pokazuje, że trzy założenia tej koncepcji — jeden dominujący
 * język, dokładnie pięć języków i wyższa satysfakcja przy dopasowaniu — nie mają
 * mocnego wsparcia w danych. Nowsze prace sugerują, że okazywanie bliskości
 * w dowolnej formie działa lepiej niż zgadywanie „właściwego” kanału.
 */

export type GestureMechanism = "zwrot" | "wdziecznosc" | "nowosc" | "rytual" | "mapa";

export const MECHANISM_LABEL: Record<GestureMechanism, string> = {
  zwrot: "Zwrócenie uwagi",
  wdziecznosc: "Wdzięczność",
  nowosc: "Wspólna nowość",
  rytual: "Rytuał",
  mapa: "Poznawanie",
};

export type SourceKey = "gottman-bids" | "algoe-gratitude" | "aron-expansion" | "gottman-rituals";

export const GESTURE_SOURCES: Record<SourceKey, { label: string; url: string }> = {
  "gottman-bids": {
    label: "Gottman Institute — „małe rzeczy, często” i reakcje na zaczepki (86% vs 33%)",
    url: "https://www.gottman.com/blog/the-magic-ratio-the-key-to-relationship-satisfaction/",
  },
  "algoe-gratitude": {
    label: "Algoe, Kurtz, Hilaire (2016) — „Putting the «You» in «Thank You»”",
    url: "https://journals.sagepub.com/doi/full/10.1177/1948550616651681",
  },
  "aron-expansion": {
    label: "Aron, Tomlinson — „Love as Expansion of the Self” (wspólne nowe aktywności)",
    url: "https://assets.cambridge.org/97811084/75686/excerpt/9781108475686_excerpt.pdf",
  },
  "gottman-rituals": {
    label: "Gottman Institute — rytuały powitania i rozmowa o dniu bez doradzania",
    url: "https://www.gottman.com/blog/the-magic-ratio-the-key-to-relationship-satisfaction/",
  },
};

/** Zastrzeżenie pokazywane przy planie — żeby było jasne, czym to jest, a czym nie. */
export const GESTURES_DISCLAIMER =
  "Podpowiedzi wynikają z badań nad utrzymywaniem bliskości, nie z „języków miłości” — przegląd Impett, " +
  "Park i Muise (2024) pokazał, że ta popularna koncepcja nie ma mocnego wsparcia w danych. To pomysły " +
  "na drobne rzeczy, nie recepta ani terapia.";

export type Gesture = {
  id: string;
  /** Instrukcja: co konkretnie zrobić. */
  text: string;
  /** Dlaczego akurat to — jedno zdanie, żeby nie było „bo tak”. */
  why: string;
  mechanism: GestureMechanism;
  /** Ile to zajmuje w minutach — plan ma nie wymagać wolnego popołudnia. */
  minutes: number;
  source: SourceKey;
};

export const GESTURES: Gesture[] = [
  {
    id: "sms-co-cenie",
    text: "Wyślij wiadomość, w której nazywasz jedną konkretną rzecz, którą cenisz w tej osobie — nie za to, co dla Ciebie zrobiła, tylko jaka jest.",
    why: "Wdzięczność mówiąca o drugiej osobie zbliża mocniej niż ta mówiąca o własnej korzyści.",
    mechanism: "wdziecznosc",
    minutes: 3,
    source: "algoe-gratitude",
  },
  {
    id: "dziekuje-konkret",
    text: "Podziękuj za coś zwykłego z ostatnich dni i dopowiedz, co to mówi o niej albo o nim.",
    why: "Nazwanie cechy zamiast samego „dzięki” zamienia uprzejmość w sygnał, że widzisz drugą osobę.",
    mechanism: "wdziecznosc",
    minutes: 3,
    source: "algoe-gratitude",
  },
  {
    id: "powitanie-6-sekund",
    text: "Przy powitaniu odłóż telefon i przywitaj się uważnie — spójrz, przytul, zapytaj o jedną rzecz z dnia.",
    why: "Rytuały powitania i pożegnania to najczęściej powtarzany moment dnia — ustawiają jego ton.",
    mechanism: "rytual",
    minutes: 5,
    source: "gottman-rituals",
  },
  {
    id: "rozmowa-o-dniu",
    text: "Zrób 20 minut rozmowy o dniu, w której tylko słuchasz i dopytujesz. Żadnych rozwiązań, chyba że ktoś o nie poprosi.",
    why: "Rozładowanie stresu z zewnątrz działa wtedy, gdy druga strona nie doradza, tylko jest po Twojej stronie.",
    mechanism: "rytual",
    minutes: 20,
    source: "gottman-rituals",
  },
  {
    id: "odpowiedz-na-zaczepke",
    text: "Dziś, gdy usłyszysz „zobacz…”, „wiesz co…” albo zwykłe zagajenie — przerwij to, co robisz, i odpowiedz uważnie.",
    why: "Pary, które przetrwały, reagowały na takie drobne zaczepki w 86% przypadków; te, które się rozstały — w 33%.",
    mechanism: "zwrot",
    minutes: 2,
    source: "gottman-bids",
  },
  {
    id: "male-zaskoczenie",
    text: "Zrób małą niespodziankę bez okazji: ulubiona kawa, drobiazg ze sklepu, zrobiona rzecz, o którą nie musiała prosić.",
    why: "Częstotliwość drobnych pozytywnych momentów liczy się bardziej niż ich rozmach.",
    mechanism: "zwrot",
    minutes: 15,
    source: "gottman-bids",
  },
  {
    id: "nowe-wspolne",
    text: "Zaproponuj coś, czego nigdy razem nie robiliście — nowa trasa, nowa kuchnia, coś niedorzecznego na godzinę.",
    why: "Wspólne nowe i pobudzające zajęcia podnoszą poczucie bliskości mocniej niż powtarzalna rozrywka.",
    mechanism: "nowosc",
    minutes: 60,
    source: "aron-expansion",
  },
  {
    id: "randka-bez-telefonow",
    text: "Umów randkę i ustalcie jedną zasadę: telefony zostają w kieszeni.",
    why: "Wspólny czas bez rozproszeń daje szansę na te momenty uwagi, z których składa się bliskość.",
    mechanism: "nowosc",
    minutes: 90,
    source: "aron-expansion",
  },
  {
    id: "pytanie-o-plany",
    text: "Zapytaj o jedno marzenie albo plan na najbliższy rok i wysłuchaj bez oceniania.",
    why: "Wiedza o tym, czym druga osoba żyje teraz, dezaktualizuje się szybciej, niż się wydaje.",
    mechanism: "mapa",
    minutes: 15,
    source: "gottman-rituals",
  },
  {
    id: "wsparcie-celu",
    text: "Zapytaj o cel, na którym tej osobie zależy, i zaproponuj jedną konkretną rzecz, którą możesz w nim odciążyć.",
    why: "Aktywne wspieranie rozwoju partnera działa lepiej niż samo „trzymam kciuki”.",
    mechanism: "nowosc",
    minutes: 10,
    source: "aron-expansion",
  },
  {
    id: "przypomnij-wspomnienie",
    text: "Przypomnij wspólne wspomnienie — zdjęcie, miejsce, historia sprzed lat — i powiedz, co z niego pamiętasz najlepiej.",
    why: "Wracanie do dobrych wspólnych chwil podtrzymuje pozytywny bilans, z którego czerpie się w gorszych tygodniach.",
    mechanism: "rytual",
    minutes: 5,
    source: "gottman-rituals",
  },
  {
    id: "przejmij-obowiazek",
    text: "Weź na siebie jedną rzecz z listy drugiej osoby — bez zapowiadania i bez punktów do odebrania później.",
    why: "Zdjęcie ciężaru bez targowania się jest odbierane jako troska, nie transakcja.",
    mechanism: "zwrot",
    minutes: 30,
    source: "gottman-bids",
  },
  {
    id: "pytanie-otwarte",
    text: "Zadaj pytanie, na które nie da się odpowiedzieć „tak” ani „nie” — np. co ostatnio Cię zaskoczyło.",
    why: "Pytania otwarte odświeżają wiedzę o drugiej osobie zamiast potwierdzać stare założenia.",
    mechanism: "mapa",
    minutes: 10,
    source: "gottman-rituals",
  },
  {
    id: "pochwal-przy-innych",
    text: "Powiedz przy kimś trzecim coś dobrego o tej osobie — tak, żeby usłyszała.",
    why: "Docenienie wypowiedziane publicznie niesie więcej niż to samo zdanie powiedziane na osobności.",
    mechanism: "wdziecznosc",
    minutes: 2,
    source: "algoe-gratitude",
  },
  {
    id: "wspolne-sniadanie",
    text: "Zjedzcie jeden posiłek razem bez ekranu w tle — wystarczy śniadanie.",
    why: "Powtarzalny wspólny moment w tygodniu jest łatwiejszy do utrzymania niż wielkie plany.",
    mechanism: "rytual",
    minutes: 30,
    source: "gottman-rituals",
  },
  {
    id: "zapytaj-o-obciazenie",
    text: "Zapytaj wprost, co w tym tygodniu najbardziej ją albo go obciąża — i tylko wysłuchaj.",
    why: "Bycie po czyjejś stronie w rzeczach spoza związku wzmacnia sam związek.",
    mechanism: "zwrot",
    minutes: 15,
    source: "gottman-rituals",
  },
  {
    id: "list-recznie",
    text: "Napisz kilka zdań ręcznie i zostaw tam, gdzie zostaną znalezione bez Ciebie.",
    why: "Zapisane słowa zostają — można do nich wrócić w gorszym dniu.",
    mechanism: "wdziecznosc",
    minutes: 10,
    source: "algoe-gratitude",
  },
  {
    id: "wspolny-spacer",
    text: "Wyjdźcie na spacer bez celu i bez agendy — rozmowa układa się inaczej w ruchu.",
    why: "Wspólna aktywność daje kontakt bez presji „poważnej rozmowy”.",
    mechanism: "nowosc",
    minutes: 40,
    source: "aron-expansion",
  },
];

export type PlannedGesture = {
  date: string;
  gesture: Gesture;
};

/**
 * Plan gestów na tydzień. Wybór jest deterministyczny — ten sam tydzień daje ten
 * sam plan, więc odświeżenie strony niczego nie podmienia — i przesuwa się przez
 * katalog, żeby propozycje nie zaczęły się powtarzać po dwóch tygodniach.
 *
 * `seed` (np. skrót identyfikatora użytkownika) sprawia, że dwie osoby w tym
 * samym tygodniu nie dostają tej samej listy.
 */
export function planGesturesForWeek(
  weekStartDate: string,
  perWeek: number,
  seed = 0,
  catalogue: Gesture[] = GESTURES,
): PlannedGesture[] {
  const count = Math.max(0, Math.min(perWeek, 7));
  if (count === 0 || catalogue.length === 0) return [];

  // Numer tygodnia od stałej daty — rośnie o 1 co tydzień, więc katalog się przesuwa.
  const weekIndex = Math.floor(
    (Date.UTC(
      Number(weekStartDate.slice(0, 4)),
      Number(weekStartDate.slice(5, 7)) - 1,
      Number(weekStartDate.slice(8, 10)),
    ) -
      Date.UTC(2020, 0, 6)) /
      (7 * 86_400_000),
  );

  // Dni rozłożone równo w tygodniu: przy 2 gestach wypadają w 1. i 4. dniu.
  const step = Math.max(1, Math.floor(7 / count));

  return Array.from({ length: count }, (_, i) => {
    const index = (((weekIndex * count + i + seed) % catalogue.length) + catalogue.length) % catalogue.length;
    return {
      date: addDays(weekStartDate, Math.min(i * step, 6)),
      gesture: catalogue[index],
    };
  });
}

/** Plan na tydzień, w którym wypada `date`, z uwzględnieniem początku tygodnia użytkownika. */
export function planGesturesAround(
  date: string,
  perWeek: number,
  weekStartsOn = 1,
  seed = 0,
): PlannedGesture[] {
  return planGesturesForWeek(startOfWeek(date, weekStartsOn), perWeek, seed);
}

/** Gesty zaplanowane dokładnie na wskazany dzień. */
export function gesturesForDate(date: string, perWeek: number, weekStartsOn = 1, seed = 0): PlannedGesture[] {
  return planGesturesAround(date, perWeek, weekStartsOn, seed).filter((entry) => entry.date === date);
}

/** Prosty, stabilny skrót tekstu na liczbę — do zróżnicowania planu między kontami. */
export function seedFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 100_000;
  return hash;
}

/** Dzień tygodnia gestu — używane przy opisie planu. */
export function gestureWeekday(entry: PlannedGesture): number {
  return isoWeekday(entry.date);
}
