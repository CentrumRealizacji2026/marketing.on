import type { FieldSpec } from "./rows-editor";
import {
  DISCIPLINE_SUGGESTIONS,
  DOSE_UNIT_SUGGESTIONS,
  MATERIAL_TYPE_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  RECORD_METRIC_SUGGESTIONS,
  SKILL_SUGGESTIONS,
} from "@/lib/domain/suggestions";
import { SLOT_SUGGESTIONS } from "@/lib/domain/medication";

/**
 * Opisy pól używane jednocześnie przez kreator profilu i panel zarządzania —
 * jeden formularz, dwa miejsca. Zmiana etykiety w jednym miejscu zmienia ją wszędzie.
 */

/* ------------------------------------------------------------------ leki */

export const medicationFields: FieldSpec[] = [
  { name: "name", label: "Nazwa", type: "text", span: 2, placeholder: "np. Magnez" },
  {
    name: "kind",
    label: "Typ",
    type: "select",
    span: 1,
    options: [
      { value: "lek", label: "Lek" },
      { value: "suplement", label: "Suplement" },
    ],
  },
  { name: "doseAmount", label: "Dawka", type: "number", span: 1, placeholder: "1" },
  {
    name: "doseUnit",
    label: "Jednostka",
    type: "text",
    span: 2,
    suggestions: DOSE_UNIT_SUGGESTIONS,
    placeholder: "tabletka",
  },
  {
    name: "timesOfDay",
    label: "Pory dnia",
    type: "list",
    span: 3,
    placeholder: "rano, wieczór",
    suggestions: SLOT_SUGGESTIONS,
    hint: "Kilka pór oddziel przecinkiem. Zamiast nazwy możesz wpisać godzinę, np. 07:30.",
  },
  {
    name: "daysOfWeek",
    label: "Dni tygodnia",
    type: "days",
    span: 3,
    hint: "Nic nie zaznaczone = codziennie.",
  },
  { name: "startDate", label: "Przyjmuję od", type: "date", span: 2 },
  { name: "endDate", label: "Do kiedy", type: "date", span: 2, hint: "Puste = bezterminowo." },
  { name: "notes", label: "Uwagi", type: "text", span: 2, placeholder: "np. po posiłku" },
];

export const medicationDefault = {
  name: "",
  kind: "lek",
  doseAmount: "",
  doseUnit: "",
  timesOfDay: "",
  daysOfWeek: [] as number[],
  startDate: "",
  endDate: "",
  notes: "",
};

export function medicationToRow(row: {
  id: string;
  name: string;
  kind: string;
  doseAmount: number | null;
  doseUnit: string | null;
  timesOfDay: string[];
  daysOfWeek: number[];
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    doseAmount: row.doseAmount ?? "",
    doseUnit: row.doseUnit ?? "",
    timesOfDay: row.timesOfDay.join(", "),
    daysOfWeek: row.daysOfWeek,
    startDate: row.startDate ?? "",
    endDate: row.endDate ?? "",
    notes: row.notes ?? "",
  };
}

/* --------------------------------------------------------------- trening */

export const trainingFields: FieldSpec[] = [
  { name: "weekday", label: "Dzień tygodnia", type: "weekday", span: 2 },
  {
    name: "discipline",
    label: "Dyscyplina",
    type: "text",
    span: 2,
    suggestions: DISCIPLINE_SUGGESTIONS,
    placeholder: "np. rower",
  },
  { name: "title", label: "Nazwa jednostki", type: "text", span: 2, placeholder: "np. interwały" },
  { name: "startTime", label: "Godzina", type: "time", span: 2 },
  { name: "durationMin", label: "Czas (min)", type: "number", span: 2, step: "1", placeholder: "60" },
  { name: "note", label: "Opis", type: "text", span: 2, placeholder: "np. 5 × 3 min na progu" },
];

export const trainingDefault = {
  weekday: 1,
  discipline: "",
  title: "",
  startTime: "",
  durationMin: "",
  note: "",
};

export function trainingToRow(row: {
  id: string;
  weekday: number;
  discipline: string;
  title: string | null;
  startTime: string | null;
  durationMin: number | null;
  note: string | null;
}) {
  return {
    id: row.id,
    weekday: row.weekday,
    discipline: row.discipline,
    title: row.title ?? "",
    startTime: row.startTime ? row.startTime.slice(0, 5) : "",
    durationMin: row.durationMin ?? "",
    note: row.note ?? "",
  };
}

/* --------------------------------------------------------------- rekordy */

export const recordFields: FieldSpec[] = [
  {
    name: "discipline",
    label: "Dyscyplina",
    type: "text",
    span: 2,
    suggestions: DISCIPLINE_SUGGESTIONS,
    placeholder: "np. pływanie",
  },
  {
    name: "metric",
    label: "Metryka",
    type: "text",
    span: 2,
    suggestions: RECORD_METRIC_SUGGESTIONS.map((m) => m.metric),
    placeholder: "np. dystans",
  },
  { name: "unit", label: "Jednostka", type: "text", span: 1, placeholder: "km" },
  { name: "value", label: "Wynik", type: "number", span: 1, placeholder: "120" },
  { name: "achievedOn", label: "Data", type: "date", span: 3 },
  {
    name: "higherIsBetter",
    label: "Kierunek",
    type: "checkbox",
    span: 3,
    placeholder: "Wyższa wartość jest lepsza",
    hint: "Odznacz dla czasu i tempa, gdzie lepszy jest wynik niższy.",
  },
  { name: "note", label: "Uwagi", type: "text", span: 6 },
];

export const recordDefault = {
  discipline: "",
  metric: "",
  unit: "",
  value: "",
  achievedOn: "",
  higherIsBetter: true,
  note: "",
};

export function recordToRow(row: {
  id: string;
  discipline: string;
  metric: string;
  unit: string | null;
  value: number;
  higherIsBetter: boolean;
  achievedOn: string;
  note: string | null;
}) {
  return {
    id: row.id,
    discipline: row.discipline,
    metric: row.metric,
    unit: row.unit ?? "",
    value: row.value,
    higherIsBetter: row.higherIsBetter,
    achievedOn: row.achievedOn,
    note: row.note ?? "",
  };
}

/* ----------------------------------------------------------------- nauka */

export const learningWeekFields: FieldSpec[] = [
  { name: "weekday", label: "Dzień tygodnia", type: "weekday", span: 2 },
  {
    name: "skill",
    label: "Dziedzina",
    type: "text",
    span: 2,
    suggestions: SKILL_SUGGESTIONS,
    placeholder: "np. hiszpański",
  },
  { name: "startTime", label: "Godzina bloku", type: "time", span: 1 },
  { name: "durationMin", label: "Czas (min)", type: "number", span: 1, step: "5", placeholder: "60" },
];

export const learningWeekDefault = { weekday: 1, skill: "", startTime: "", durationMin: "" };

export function learningWeekToRow(row: {
  id: string;
  weekday: number;
  skill: string;
  startTime: string | null;
  durationMin: number | null;
}) {
  return {
    id: row.id,
    weekday: row.weekday,
    skill: row.skill,
    startTime: row.startTime ? row.startTime.slice(0, 5) : "",
    durationMin: row.durationMin ?? "",
  };
}

export const learningYearFields: FieldSpec[] = [
  { name: "periodStart", label: "Okres od", type: "date", span: 2 },
  { name: "periodEnd", label: "Okres do", type: "date", span: 2 },
  { name: "skill", label: "Dziedzina", type: "text", span: 2, suggestions: SKILL_SUGGESTIONS },
  {
    name: "focus",
    label: "Zakres w tym okresie",
    type: "text",
    span: 3,
    placeholder: "np. czasy przeszłe",
    hint: "To pojawi się przy bloku nauki w tym okresie.",
  },
  { name: "target", label: "Cel okresu", type: "text", span: 3, placeholder: "np. swobodna rozmowa o przeszłości" },
];

export const learningYearDefault = { periodStart: "", periodEnd: "", skill: "", focus: "", target: "" };

export function learningYearToRow(row: {
  id: string;
  periodStart: string;
  periodEnd: string;
  skill: string;
  focus: string | null;
  target: string | null;
}) {
  return {
    id: row.id,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    skill: row.skill,
    focus: row.focus ?? "",
    target: row.target ?? "",
  };
}

/* ------------------------------------------------------------ materiały */

export const materialFields: FieldSpec[] = [
  { name: "title", label: "Tytuł", type: "text", span: 3, placeholder: "np. szkolenie o zarządzaniu" },
  { name: "skill", label: "Dziedzina", type: "text", span: 2, suggestions: SKILL_SUGGESTIONS },
  { name: "type", label: "Rodzaj", type: "select", span: 1, options: MATERIAL_TYPE_OPTIONS },
  { name: "url", label: "Link", type: "text", span: 4, placeholder: "https://…" },
  { name: "progressPct", label: "Postęp (%)", type: "number", span: 2, step: "5" },
  { name: "note", label: "Notatka", type: "text", span: 6 },
];

export const materialDefault = { title: "", skill: "", type: "inne", url: "", progressPct: 0, note: "" };

export function materialToRow(row: {
  id: string;
  skill: string;
  title: string;
  type: string;
  url: string | null;
  progressPct: number;
  note: string | null;
}) {
  return {
    id: row.id,
    skill: row.skill,
    title: row.title,
    type: row.type,
    url: row.url ?? "",
    progressPct: row.progressPct,
    note: row.note ?? "",
  };
}

/* -------------------------------------------------------------- projekty */

export const projectFields: FieldSpec[] = [
  { name: "name", label: "Nazwa projektu", type: "text", span: 3 },
  { name: "status", label: "Status", type: "select", span: 1, options: PROJECT_STATUS_OPTIONS },
  { name: "deadline", label: "Termin", type: "date", span: 2 },
  { name: "goal", label: "Cel", type: "text", span: 3, placeholder: "Po czym poznasz, że projekt się udał?" },
  { name: "nextAction", label: "Następny krok", type: "text", span: 3, placeholder: "Najbliższa konkretna czynność" },
];

export const projectDefault = { name: "", status: "aktywny", deadline: "", goal: "", nextAction: "" };

export function projectToRow(row: {
  id: string;
  name: string;
  goal: string | null;
  status: string;
  deadline: string | null;
  nextAction: string | null;
}) {
  return {
    id: row.id,
    name: row.name,
    goal: row.goal ?? "",
    status: row.status,
    deadline: row.deadline ?? "",
    nextAction: row.nextAction ?? "",
  };
}
