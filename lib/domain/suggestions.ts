/**
 * Podpowiedzi do pól tekstowych w kreatorze i panelu zarządzania.
 *
 * To wyłącznie sugestie w <datalist> — żadna z tych list niczego nie ogranicza.
 * Użytkownik wpisuje własne dyscypliny, dziedziny nauki i jednostki, a aplikacja
 * przyjmuje je bez zmian.
 */

export const DISCIPLINE_SUGGESTIONS = [
  "rower",
  "pływanie",
  "bieganie",
  "siłownia",
  "spacer",
  "rozciąganie",
];

export const SKILL_SUGGESTIONS = [
  "hiszpański",
  "angielski",
  "rolnictwo",
  "narzędzia AI",
  "sprzedaż",
  "zarządzanie",
];

export const DOSE_UNIT_SUGGESTIONS = ["mg", "g", "ml", "IU", "tabletka", "kapsułka", "miarka", "kropla"];

export const RECORD_METRIC_SUGGESTIONS = [
  { metric: "dystans", unit: "km", higherIsBetter: true },
  { metric: "czas", unit: "min", higherIsBetter: false },
  { metric: "tempo na 1 km", unit: "min/km", higherIsBetter: false },
  { metric: "ciężar", unit: "kg", higherIsBetter: true },
  { metric: "powtórzenia", unit: "szt.", higherIsBetter: true },
];

export const MATERIAL_TYPE_OPTIONS = [
  { value: "wideo", label: "Wideo" },
  { value: "pdf", label: "PDF" },
  { value: "kurs", label: "Kurs" },
  { value: "ksiazka", label: "Książka" },
  { value: "inne", label: "Inne" },
] as const;

export const CONTRACT_STATUS_OPTIONS = [
  { value: "podpisana", label: "Podpisana" },
  { value: "negocjacje", label: "W negocjacjach" },
  { value: "anulowana", label: "Anulowana" },
] as const;

export const PROJECT_STATUS_OPTIONS = [
  { value: "aktywny", label: "Aktywny" },
  { value: "wstrzymany", label: "Wstrzymany" },
  { value: "zakonczony", label: "Zakończony" },
] as const;

/** Kategorie kosztów stałych — podpowiedzi, nie zamknięta lista. */
export const OBLIGATION_CATEGORY_SUGGESTIONS = [
  "mieszkanie",
  "media",
  "auto",
  "kredyty i raty",
  "ubezpieczenia",
  "subskrypcje",
  "dzieci",
  "zdrowie",
  "firma",
];

/** Podpowiedzi „kim jest ta osoba" — wpisać można cokolwiek. */
export const FAMILY_RELATION_SUGGESTIONS = [
  "partnerka",
  "partner",
  "żona",
  "mąż",
  "córka",
  "syn",
  "mama",
  "tata",
  "siostra",
  "brat",
  "teściowa",
  "teść",
  "przyjaciel",
];
