/**
 * Dane pokazowe do oglądania kokpitu lokalnie.
 *
 * Bez tego pierwsze uruchomienie kończy się pustym dashboardem i kreatorem na
 * 15 kroków, więc nie widać, jak aplikacja wygląda w działaniu. Skrypt zakłada
 * konto demo, wypełnia konfigurację i dokłada ponad miesiąc historii.
 *
 * Wszystkie daty liczone są od dzisiaj, więc dane nigdy nie są przeterminowane.
 * Liczby są deterministyczne (sinus zamiast losowania), więc kolejne
 * uruchomienie daje ten sam obraz.
 *
 *   node scripts/seed-demo.mjs
 *
 * Skrypt kasuje dane konta demo i zapisuje je od nowa. Nie dotyka innych kont.
 * Odmawia pracy na bazie spoza localhost — chyba że dostanie --force.
 */

import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import postgres from "postgres";

const EMAIL = "demo@kokpit.local";
const PASSWORD = "demo12345";
const FORCE = process.argv.includes("--force");

/* --------------------------------------------------------- połączenie */

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const line = readFileSync(new URL("../.env", import.meta.url), "utf8")
      .split("\n")
      .find((entry) => entry.startsWith("DATABASE_URL="));
    if (line) return line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
  } catch {
    /* brak .env — spadamy do komunikatu poniżej */
  }
  return null;
}

const url = databaseUrl();
if (!url) {
  console.error("Brak DATABASE_URL. Skopiuj .env.example do .env albo podaj zmienną w środowisku.");
  process.exit(1);
}
if (!FORCE && !/@(localhost|127\.0\.0\.1|db|postgres)[:/]/.test(url)) {
  console.error("To są dane pokazowe — baza nie wygląda na lokalną. Uruchom z --force, jeśli wiesz, co robisz.");
  process.exit(1);
}

const sql = postgres(url);

/* ------------------------------------------------------------- daty */

const TODAY = new Date().toISOString().slice(0, 10);
const HISTORY_DAYS = 36;

function addDays(iso, n) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}
/** Data oddalona o n dni od dzisiaj — ujemne w przeszłość. */
function day(n) {
  return addDays(TODAY, n);
}
/** Dzień i miesiąc z przesunięcia względem dzisiaj, ale w podanym roku — do urodzin. */
function anniversary(year, offsetDays) {
  return `${year}${day(offsetDays).slice(4)}`;
}
function isoWeekday(iso) {
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}
/** Ten sam dzień miesiąca, ale n miesięcy wstecz — do pierwszych terminów rachunków. */
function monthsAgo(n, dayOfMonth) {
  const date = new Date(`${TODAY}T00:00:00Z`);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - n);
  return `${date.toISOString().slice(0, 8)}${String(dayOfMonth).padStart(2, "0")}`;
}

// Deterministyczny „szum": ten sam wynik przy każdym uruchomieniu.
function rnd(i, salt = 0) {
  const value = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}
function pick(i, salt, list) {
  return list[Math.floor(rnd(i, salt) * list.length) % list.length];
}
function between(i, salt, min, max) {
  return min + rnd(i, salt) * (max - min);
}

const dates = [];
for (let d = day(-(HISTORY_DAYS - 1)); d <= TODAY; d = addDays(d, 1)) dates.push(d);

/* ----------------------------------------------------------- konto demo */

const [existing] = await sql`select id from users where lower(email) = lower(${EMAIL}) limit 1`;
let uid = existing?.id;

if (!uid) {
  const [created] = await sql`
    insert into users (email, password_hash, name, onboarded_at, onboarding_step)
    values (${EMAIL}, ${await bcrypt.hash(PASSWORD, 10)}, 'Michał', now(), 99)
    returning id`;
  uid = created.id;
} else {
  await sql`update users set onboarded_at = now(), onboarding_step = 99 where id = ${uid}`;
}

await sql`
  insert into settings (
    user_id, timezone, currency, week_starts_on, water_goal_ml, water_good_pct, water_ok_pct,
    family_gestures_per_week, weight_start_kg, weight_start_date, weight_target_kg, weight_target_date,
    goal_calls_per_day, goal_meetings_scheduled_per_day, goal_meetings_held_per_day,
    goal_contracts_per_week, monthly_revenue_goal_pln
  )
  values (
    ${uid}, 'Europe/Warsaw', 'PLN', 1, 3000, 100, 80,
    2, 85, ${day(-208)}, 78, ${day(157)},
    20, 4, 3, 2, 40000
  )
  on conflict (user_id) do update set
    water_goal_ml = excluded.water_goal_ml,
    weight_start_kg = excluded.weight_start_kg,
    weight_start_date = excluded.weight_start_date,
    weight_target_kg = excluded.weight_target_kg,
    weight_target_date = excluded.weight_target_date,
    goal_calls_per_day = excluded.goal_calls_per_day,
    goal_meetings_scheduled_per_day = excluded.goal_meetings_scheduled_per_day,
    goal_meetings_held_per_day = excluded.goal_meetings_held_per_day,
    goal_contracts_per_week = excluded.goal_contracts_per_week,
    monthly_revenue_goal_pln = excluded.monthly_revenue_goal_pln`;

/* ------------------------------------------------------------ czyszczenie */

for (const table of [
  "daily_logs",
  "sales_daily",
  "contracts",
  "medication_logs",
  "medications",
  "tasks",
  "training_logs",
  "training_plans",
  "learning_logs",
  "learning_plan_week",
  "learning_plan_year",
  "personal_records",
  "project_milestones",
  "projects",
  "report_submissions",
  "recommendations",
  "savings_contributions",
  "savings_goals",
  "obligation_payments",
  "obligations",
  "countdowns",
  "deals",
  "family_gesture_logs",
  "family_events",
  "family_members",
  "mental_assessments",
]) {
  await sql`delete from ${sql(table)} where user_id = ${uid}`;
}

/* ------------------------------------------------------ lejek do podpisania */

for (const [i, d] of [
  { client: "Nowak Sp. z o.o.", value: 48000, date: day(18), stage: "do-podpisania" },
  { client: "AgroTech Kowalczyk", value: 22500, date: day(9), stage: "do-podpisania" },
  { client: "Delta Logistyka", value: 61000, date: day(65), stage: "do-podpisania" },
  { client: "Horizon Media", value: 17800, date: day(26), stage: "do-podpisania" },
  { client: "Gospodarstwo Wiśniewski", value: 34200, date: null, stage: "do-podpisania" },
  { client: "Zieliński Consulting", value: 30200, date: day(-33), stage: "podpisana" },
  { client: "Firma XYZ", value: 9000, date: null, stage: "przepadla" },
].entries()) {
  await sql`
    insert into deals (user_id, client_name, value_pln, expected_date, stage, position)
    values (${uid}, ${d.client}, ${d.value}, ${d.date}, ${d.stage}, ${i})`;
}

/* --------------------------------------------------------------- rodzina */

for (const [i, m] of [
  { name: "Ania", relation: "partnerka", birth: anniversary(1991, 18), note: "kawa z mlekiem owsianym" },
  { name: "Zosia", relation: "córka", birth: anniversary(2018, 99), note: null },
  { name: "Janek", relation: "syn", birth: anniversary(2021, 207), note: null },
  { name: "Mama", relation: "mama", birth: anniversary(1962, 304), note: null },
].entries()) {
  await sql`
    insert into family_members (user_id, name, relation, birth_date, note, position)
    values (${uid}, ${m.name}, ${m.relation}, ${m.birth}, ${m.note}, ${i})`;
}

for (const [i, e] of [
  { name: "Rocznica ślubu", date: anniversary(2017, 43), kind: "rocznica", recurring: true, note: null },
  { name: "Randka — kolacja w mieście", date: day(5), kind: "randka", recurring: false, note: "stolik na 19:00" },
  { name: "Weekend w Karkonoszach", date: day(25), kind: "wyjazd", recurring: false, note: "dzieci u babci" },
].entries()) {
  await sql`
    insert into family_events (user_id, name, date, kind, recurring, note, position)
    values (${uid}, ${e.name}, ${e.date}, ${e.kind}, ${e.recurring}, ${e.note}, ${i})`;
}

/* ------------------------------------------------------------- odliczanie */

for (const [i, c] of [
  { name: "wakacje Włochy", date: day(342), note: "Toskania, wylot z Katowic" },
  { name: "egzamin B1 z hiszpańskiego", date: day(138), note: null },
  { name: "koniec leasingu auta", date: day(1054), note: null },
].entries()) {
  await sql`
    insert into countdowns (user_id, name, target_date, note, position)
    values (${uid}, ${c.name}, ${c.date}, ${c.note}, ${i})`;
}

/* -------------------------------------------------- konfiguracja: apteczka */

const meds = [
  { name: "Magnez", kind: "suplement", amount: 2, unit: "tabletka", slots: ["rano", "wieczór"], days: [] },
  { name: "Witamina D", kind: "suplement", amount: 2000, unit: "IU", slots: ["rano"], days: [] },
  { name: "Omega-3", kind: "suplement", amount: 1000, unit: "mg", slots: ["południe"], days: [] },
  { name: "Kreatyna", kind: "suplement", amount: 5, unit: "g", slots: ["popołudnie"], days: [1, 4, 6] },
  { name: "Tarczyca (lek)", kind: "lek", amount: 1, unit: "tabletka", slots: ["rano"], days: [] },
];
const medRows = [];
for (const [i, m] of meds.entries()) {
  const [row] = await sql`
    insert into medications (user_id, name, kind, dose_amount, dose_unit, times_of_day, days_of_week, position)
    values (${uid}, ${m.name}, ${m.kind}, ${m.amount}, ${m.unit}, ${sql.json(m.slots)}, ${sql.json(m.days)}, ${i})
    returning id`;
  medRows.push({ ...row, slots: m.slots, days: m.days });
}

/* --------------------------------------------------- konfiguracja: trening */

const planRows = [];
for (const [i, p] of [
  { weekday: 1, discipline: "siłownia", title: "push", start: "18:00", min: 60 },
  { weekday: 2, discipline: "basen", title: "technika kraula", start: "07:00", min: 45 },
  { weekday: 4, discipline: "siłownia", title: "pull", start: "18:00", min: 60 },
  { weekday: 5, discipline: "basen", title: "sprinty", start: "07:00", min: 45 },
  { weekday: 6, discipline: "rower", title: "długi wyjazd", start: "09:00", min: 120 },
  { weekday: 7, discipline: "rower", title: "interwały", start: "18:00", min: 60 },
].entries()) {
  const [row] = await sql`
    insert into training_plans (user_id, weekday, discipline, title, start_time, duration_min, position)
    values (${uid}, ${p.weekday}, ${p.discipline}, ${p.title}, ${p.start}, ${p.min}, ${i})
    returning id, weekday, discipline, title, duration_min`;
  planRows.push(row);
}

/* ----------------------------------------------------- konfiguracja: nauka */

const learnRows = [];
for (const [i, p] of [
  { weekday: 1, skill: "hiszpański", start: "20:00", min: 45 },
  { weekday: 2, skill: "rolnictwo", start: "20:00", min: 45 },
  { weekday: 3, skill: "narzędzia AI", start: "20:00", min: 60 },
  { weekday: 4, skill: "hiszpański", start: "20:00", min: 45 },
  { weekday: 5, skill: "rolnictwo", start: "20:00", min: 45 },
].entries()) {
  const [row] = await sql`
    insert into learning_plan_week (user_id, weekday, skill, start_time, duration_min, position)
    values (${uid}, ${p.weekday}, ${p.skill}, ${p.start}, ${p.min}, ${i})
    returning id, weekday, skill, duration_min`;
  learnRows.push(row);
}

for (const y of [
  { skill: "hiszpański", focus: "czasy przeszłe", target: "rozmowa 15 minut bez notatek" },
  { skill: "rolnictwo", focus: "nawadnianie i gleba", target: "plan nawadniania na sezon" },
  { skill: "narzędzia AI", focus: "automatyzacje", target: "dwa procesy w firmie zautomatyzowane" },
]) {
  await sql`
    insert into learning_plan_year (user_id, period_start, period_end, skill, focus, target)
    values (${uid}, ${day(-45)}, ${day(65)}, ${y.skill}, ${y.focus}, ${y.target})`;
}

/* -------------------------------------------------- konfiguracja: projekty */

for (const [i, p] of [
  {
    name: "Wdrożenie CRM w firmie",
    goal: "Cały lejek sprzedaży w jednym narzędziu",
    deadline: day(18),
    next: "Zebrać wymagania od handlowców",
    milestones: [
      { title: "Import bazy klientów", due: day(-27), done: true },
      { title: "Szkolenie zespołu", due: day(3), done: false },
      { title: "Wyłączenie arkuszy", due: day(18), done: false },
    ],
  },
  {
    name: "Nawadnianie kroplowe w ogrodzie",
    goal: "Podlewanie bez mojego udziału do końca sezonu",
    deadline: day(36),
    next: "Kupić sterownik z czujnikiem wilgotności",
    milestones: [
      { title: "Projekt rozmieszczenia linii", due: day(-14), done: true },
      { title: "Zakup sterownika", due: day(-3), done: true },
      { title: "Montaż i test", due: day(26), done: false },
    ],
  },
  {
    name: "Hiszpański na poziom B1",
    goal: "Egzamin B1 do końca roku",
    deadline: day(146),
    next: "Umówić lekcję próbną z lektorem",
    milestones: [{ title: "Test poziomujący", due: day(12), done: false }],
  },
].entries()) {
  const [project] = await sql`
    insert into projects (user_id, name, goal, status, deadline, next_action, position)
    values (${uid}, ${p.name}, ${p.goal}, 'aktywny', ${p.deadline}, ${p.next}, ${i})
    returning id`;
  for (const [j, m] of p.milestones.entries()) {
    await sql`
      insert into project_milestones (user_id, project_id, title, due_date, done, position)
      values (${uid}, ${project.id}, ${m.title}, ${m.due}, ${m.done}, ${j})`;
  }
}

/* --------------------------------------------------- cele oszczędnościowe */

const goalRows = [];
for (const [i, g] of [
  { name: "Poduszka bezpieczeństwa", target: 60000, initial: 18000, deadline: day(338), note: "6 miesięcy kosztów" },
  { name: "Wakacje w Hiszpanii", target: 12000, initial: 1500, deadline: day(278), note: null },
  { name: "Wymiana auta", target: 90000, initial: 22000, deadline: day(612), note: "dopłata do nowego" },
].entries()) {
  const [row] = await sql`
    insert into savings_goals (user_id, name, target_pln, initial_pln, deadline, note, position)
    values (${uid}, ${g.name}, ${g.target}, ${g.initial}, ${g.deadline}, ${g.note}, ${i})
    returning id`;
  goalRows.push(row);
}

/* ---------------------------------------------- płatności i koszty stałe */

const obligationRows = [];
for (const [i, o] of [
  { name: "Czynsz", amount: 2350, category: "mieszkanie", cadence: "miesiecznie", dayOfMonth: 10, end: null },
  { name: "Rata kredytu hipotecznego", amount: 3180, category: "kredyty i raty", cadence: "miesiecznie", dayOfMonth: 5, end: day(5600) },
  { name: "Prąd i gaz", amount: 480, category: "media", cadence: "miesiecznie", dayOfMonth: 18, end: null },
  { name: "Internet i telefon", amount: 149, category: "media", cadence: "miesiecznie", dayOfMonth: 22, end: null },
  { name: "Leasing auta", amount: 1890, category: "auto", cadence: "miesiecznie", dayOfMonth: 15, end: day(1054) },
  { name: "OC i AC", amount: 3200, category: "ubezpieczenia", cadence: "rocznie", dayOfMonth: 12, end: null },
  { name: "Księgowość", amount: 850, category: "firma", cadence: "miesiecznie", dayOfMonth: 12, end: null },
  { name: "Subskrypcje (streaming, chmura)", amount: 190, category: "subskrypcje", cadence: "miesiecznie", dayOfMonth: 27, end: null },
  { name: "Podatek kwartalny", amount: 6400, category: "firma", cadence: "kwartalnie", dayOfMonth: 20, end: null },
].entries()) {
  // Rachunki biegną od pół roku wstecz — dzięki temu widać i historię, i najbliższe terminy.
  const first = monthsAgo(o.cadence === "rocznie" ? 10 : 6, o.dayOfMonth);
  const [row] = await sql`
    insert into obligations (user_id, name, amount_pln, category, cadence, first_due_date, end_date, position)
    values (${uid}, ${o.name}, ${o.amount}, ${o.category}, ${o.cadence}, ${first}, ${o.end}, ${i})
    returning id, name, amount_pln`;
  obligationRows.push({ ...row, cadence: o.cadence, first });
}

/* ------------------------------------------------------------ rekordy (PR) */

for (const r of [
  { d: "rower", m: "dystans", v: 120, u: "km", hib: true, on: day(-56) },
  { d: "rower", m: "dystans", v: 138, u: "km", hib: true, on: day(-16) },
  { d: "pływanie", m: "czas na 1 km", v: 22.4, u: "min", hib: false, on: day(-44) },
  { d: "pływanie", m: "czas na 1 km", v: 21.5, u: "min", hib: false, on: day(-17) },
  { d: "siłownia", m: "ciężar", v: 95, u: "kg", hib: true, on: day(-32) },
  { d: "siłownia", m: "ciężar", v: 102.5, u: "kg", hib: true, on: day(-11) },
]) {
  await sql`
    insert into personal_records (user_id, discipline, metric, value, unit, higher_is_better, achieved_on)
    values (${uid}, ${r.d}, ${r.m}, ${r.v}, ${r.u}, ${r.hib}, ${r.on})`;
}

/* -------------------------------------------------- testy stanu psychicznego */

// WHO-5 co tydzień z rosnącym wynikiem, GAD-7 przeterminowany (widać przypomnienie),
// PHQ-9 świeży. Pytanie 9 zerowe, więc bez ścieżki kryzysowej.
for (const [test, rows, scale] of [
  [
    "who5",
    [
      [day(-35), [2, 2, 2, 2, 3]],
      [day(-28), [2, 2, 2, 2, 2]],
      [day(-21), [3, 2, 3, 2, 3]],
      [day(-14), [3, 3, 3, 3, 3]],
      [day(-7), [4, 3, 4, 3, 3]],
      [TODAY, [4, 4, 3, 4, 3]],
    ],
    4,
  ],
  [
    "gad7",
    [
      [day(-52), [3, 2, 3, 2, 2, 2, 2]],
      [day(-32), [2, 2, 2, 2, 1, 1, 1]],
    ],
    1,
  ],
  [
    "phq9",
    [
      [day(-32), [2, 2, 2, 2, 1, 1, 1, 1, 0]],
      [day(-2), [1, 1, 1, 1, 1, 1, 0, 0, 0]],
    ],
    1,
  ],
]) {
  for (const [date, answers] of rows) {
    const score = answers.reduce((sum, value) => sum + value, 0) * scale;
    const note = date === TODAY ? "Trzy treningi w tygodniu, wcześniejsze wstawanie." : null;
    await sql`
      insert into mental_assessments (user_id, date, test, answers, score, note)
      values (${uid}, ${date}, ${test}, ${sql.json(answers)}, ${score}, ${note})`;
  }
}

/* ---------------------------------------------------------- dzień po dniu */

const THOUGHTS = [
  "Dużo myśli o tym, czy nie biorę na siebie za dużo naraz.",
  "Wraca temat rozmowy z zespołem — trzeba ją w końcu odbyć.",
  "Spokojny dzień, głowa wreszcie odpuściła.",
  "Trochę niepokoju o przyszły kwartał, ale bez paniki.",
  "Zmęczenie bardziej z rozproszenia niż z pracy.",
];
const GOOD = [
  "Klient sam oddzwonił i chce spotkanie.",
  "Trening wyszedł lepiej, niż zakładałem.",
  "Wieczór bez telefonu, przeczytałem 30 stron.",
  "Rozmowa z synem przy kolacji, bez pośpiechu.",
  "Ogarnąłem zaległą fakturę, która wisiała od tygodnia.",
  "Udało się skończyć dzień przed 18:00.",
];
const PRIORITIES = [
  "Zadzwonić do 10 klientów z listy",
  "Przygotować ofertę dla Nowak Sp. z o.o.",
  "Domknąć umowę z Firmą ABC",
  "Przegląd finansów miesiąca",
  "Spotkanie z zespołem — plan tygodnia",
  "Zebrać wymagania do CRM",
  "Odpowiedzieć na zaległe maile",
  "Przygotować materiały na szkolenie",
  "Rozliczyć delegację",
  "Zaplanować kolejny tydzień",
];
const SIDE = [
  "Zamówić witaminy",
  "Umyć rower po deszczu",
  "Odebrać paczkę",
  "Zapisać syna na basen",
  "Wymienić opony w aucie",
];
const CLIENTS = [
  "Nowak Sp. z o.o.",
  "Firma ABC",
  "Zieliński Consulting",
  "AgroTech Kowalczyk",
  "Delta Logistyka",
  "Marek Wiśniewski — gospodarstwo",
  "Horizon Media",
];

let balance = 15400;
const contractsToInsert = [];

for (const [i, date] of dates.entries()) {
  const weekday = isoWeekday(date);
  const weekend = weekday >= 6;
  const dayOfMonth = Number(date.slice(8, 10));

  /* --- finanse --- */
  let expenses = weekend ? between(i, 1, 90, 480) : between(i, 1, 45, 320);
  if (dayOfMonth === 1 || dayOfMonth === 10) expenses += between(i, 2, 900, 1600); // rachunki i rata
  expenses = Math.round(expenses * 100) / 100;

  // Wpływy tylko w dniach, w których faktycznie coś przyszło — reszta zostaje bez wpisu.
  const hasIncome = !weekend && rnd(i, 3) > 0.62;
  const income = hasIncome ? Math.round(between(i, 4, 1400, 9200) * 100) / 100 : null;
  balance = Math.round((balance + (income ?? 0) - expenses) * 100) / 100;

  const weight = Math.round((83.6 - i * 0.043 + (rnd(i, 5) - 0.5) * 0.5) * 10) / 10;
  const water = Math.round((weekend ? between(i, 6, 1500, 2600) : between(i, 6, 2100, 3400)) / 50) * 50;
  const sleep = Math.round(between(i, 7, 6.1, 8.4) * 10) / 10;
  const withNotes = rnd(i, 11) > 0.62;

  await sql`
    insert into daily_logs (user_id, date, cash_balance_pln, expenses_pln, income_pln, weight_kg, water_ml, sleep_h, mood, energy, stress, thoughts, good_things)
    values (${uid}, ${date}, ${balance}, ${expenses}, ${income}, ${weight}, ${water}, ${sleep},
            ${3 + Math.round(rnd(i, 8) * 2)}, ${2 + Math.round(rnd(i, 9) * 3)}, ${1 + Math.round(rnd(i, 10) * 3)},
            ${withNotes ? pick(i, 12, THOUGHTS) : null}, ${withNotes ? pick(i, 13, GOOD) : null})`;

  /* --- sprzedaż --- */
  if (!weekend) {
    await sql`
      insert into sales_daily (user_id, date, calls, meetings_scheduled, meetings_held)
      values (${uid}, ${date}, ${Math.round(between(i, 14, 11, 29))}, ${Math.round(between(i, 15, 1, 6))},
              ${Math.round(between(i, 16, 1, 4))})`;

    if (rnd(i, 17) > 0.74) {
      contractsToInsert.push({
        date,
        client: pick(i, 18, CLIENTS),
        value: Math.round(between(i, 19, 7800, 34000) / 100) * 100,
        status: rnd(i, 20) > 0.82 ? "negocjacje" : "podpisana",
      });
    }
  }

  /* --- apteczka --- */
  for (const med of medRows) {
    if (med.days.length > 0 && !med.days.includes(weekday)) continue;
    for (const slot of med.slots) {
      const taken = rnd(i + slot.length, 21) > 0.14;
      await sql`
        insert into medication_logs (user_id, medication_id, date, slot, taken, taken_at)
        values (${uid}, ${med.id}, ${date}, ${slot}, ${taken}, ${taken ? new Date(`${date}T08:00:00Z`) : null})`;
    }
  }

  /* --- zadania --- */
  if (!weekend) {
    for (let p = 0; p < 3; p += 1) {
      const done = rnd(i + p * 7, 22) > 0.28;
      await sql`
        insert into tasks (user_id, date, title, kind, position, done, done_at)
        values (${uid}, ${date}, ${pick(i + p * 3, 23, PRIORITIES)}, 'priorytet', ${p + 1}, ${done},
                ${done ? new Date(`${date}T17:00:00Z`) : null})`;
    }
    if (rnd(i, 24) > 0.45) {
      const done = rnd(i, 25) > 0.5;
      await sql`
        insert into tasks (user_id, date, title, kind, position, done, done_at)
        values (${uid}, ${date}, ${pick(i, 26, SIDE)}, 'side', 0, ${done}, ${done ? new Date(`${date}T19:00:00Z`) : null})`;
    }
  }

  /* --- trening --- */
  const plan = planRows.find((p) => p.weekday === weekday);
  if (plan && rnd(i, 27) > 0.22) {
    const distance =
      plan.discipline === "rower"
        ? Math.round(between(i, 29, 28, 70) * 10) / 10
        : plan.discipline === "basen"
          ? Math.round(between(i, 29, 1.2, 2.6) * 10) / 10
          : null;
    await sql`
      insert into training_logs (user_id, date, discipline, title, done, duration_min, distance_km, rpe, plan_id)
      values (${uid}, ${date}, ${plan.discipline}, ${plan.title}, true,
              ${plan.duration_min + Math.round(between(i, 28, -10, 15))}, ${distance},
              ${5 + Math.round(rnd(i, 30) * 4)}, ${plan.id})`;
  }

  /* --- nauka --- */
  const block = learnRows.find((p) => p.weekday === weekday);
  if (block && rnd(i, 31) > 0.3) {
    await sql`
      insert into learning_logs (user_id, date, skill, minutes, done, plan_id)
      values (${uid}, ${date}, ${block.skill}, ${block.duration_min + Math.round(between(i, 32, -10, 20))}, true, ${block.id})`;
  }

  /* --- dopłaty na cele --- */
  if (rnd(i, 40) > 0.72) {
    const goal = goalRows[Math.floor(rnd(i, 41) * goalRows.length) % goalRows.length];
    await sql`
      insert into savings_contributions (user_id, goal_id, date, amount_pln)
      values (${uid}, ${goal.id}, ${date}, ${Math.round(between(i, 42, 200, 2500) / 50) * 50})
      on conflict (goal_id, date) do update set amount_pln = excluded.amount_pln`;
  }
}

/* ------------------------------------------------------ zapłacone rachunki */

// Wszystko wstecz zapłacone poza dwiema pozycjami z tego miesiąca — żeby było widać zaległość.
const ZALEGLE = ["Prąd i gaz", "Subskrypcje (streaming, chmura)"];
for (const o of obligationRows) {
  const step = o.cadence === "miesiecznie" ? 1 : o.cadence === "kwartalnie" ? 3 : 12;
  const dayOfMonth = Number(o.first.slice(8, 10));

  for (let back = 6; back >= 0; back -= 1) {
    const due = monthsAgo(back, dayOfMonth);
    if (due < o.first || due > TODAY) continue;
    const monthsFromFirst =
      (Number(due.slice(0, 4)) - Number(o.first.slice(0, 4))) * 12 +
      (Number(due.slice(5, 7)) - Number(o.first.slice(5, 7)));
    if (monthsFromFirst % step !== 0) continue;
    if (back === 0 && ZALEGLE.includes(o.name)) continue;

    await sql`
      insert into obligation_payments (user_id, obligation_id, due_date, paid_on, amount_pln)
      values (${uid}, ${o.id}, ${due}, ${due}, ${o.amount_pln})
      on conflict (obligation_id, due_date) do update set paid_on = excluded.paid_on`;
  }
}

for (const c of contractsToInsert) {
  await sql`
    insert into contracts (user_id, signed_on, client_name, value_pln, status)
    values (${uid}, ${c.date}, ${c.client}, ${c.value}, ${c.status})`;
}

console.log(
  [
    `Konto demo: ${EMAIL} / ${PASSWORD}`,
    `Historia: ${dates.length} dni (${dates[0]} → ${dates.at(-1)})`,
    `Umowy: ${contractsToInsert.length} · saldo dziś: ${balance.toFixed(2)} zł`,
    "",
    "Zaloguj się na http://localhost:3000/login",
  ].join("\n"),
);

await sql.end();
