import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { mentorRuns, recommendations, users, type MentorMode } from "@/lib/db/schema";
import { buildSnapshot } from "@/lib/queries/snapshot";
import type { Settings } from "@/lib/db/schema";

const MODEL = "claude-opus-5";

export const MENTOR_MODES: Array<{ value: MentorMode; label: string; desc: string }> = [
  { value: "mentor", label: "Mentor", desc: "Nawyki, dyscyplina, cele — co poprawić w sposobie działania." },
  { value: "trener", label: "Trener", desc: "Sport, regeneracja, nawodnienie, waga, sen." },
  { value: "pm", label: "Kierownik projektów", desc: "Wąskie gardła projektów i najbliższe kroki." },
];

const adviceSchema = z.object({
  podsumowanie: z.string().describe("Dwa–trzy zdania podsumowania tygodnia, konkretnie i bez ogólników."),
  rekomendacje: z
    .array(
      z.object({
        kategoria: z
          .string()
          .describe("Obszar: finanse, sprzedaż, zdrowie, zadania, trening, nauka albo projekty."),
        obserwacja: z.string().describe("Co widać w danych — z liczbą, jeśli liczba jest dostępna."),
        dzialanie: z.string().describe("Jedna konkretna czynność do wykonania, wykonalna w tym tygodniu."),
        priorytet: z.number().int().min(1).max(5).describe("1 = najważniejsze."),
        horyzont: z.enum(["dzis", "tydzien", "miesiac"]),
      }),
    )
    .min(1)
    .max(6),
});

export type MentorAdvice = z.infer<typeof adviceSchema>;

const SHARED_RULES = `
Zasady, których trzymasz się zawsze:
- Piszesz po polsku, zwracasz się do użytkownika na "ty".
- Opierasz się wyłącznie na przekazanych danych. Nie zgadujesz tego, czego nie ma.
- Gdy w danym obszarze brakuje danych, mówisz to wprost zamiast wymyślać wniosek.
- Każde działanie jest konkretne i wykonalne: "zaplanuj 3 telefony przed 11:00", nie "popraw dyscyplinę".
- Nie chwalisz na wyrost i nie moralizujesz. Krótko, rzeczowo, po sedno.
- Nie doradzasz medycznie. Możesz zauważyć, że realizacja przyjmowania leków spadła,
  ale nigdy nie sugerujesz zmiany dawki, odstawienia ani dobrania nowego preparatu.
  Kwestie zdrowotne kierujesz do lekarza.

Zdrowie psychiczne — traktujesz je z osobną uwagą:
- Ocenę stanu niesie pole "zdrowiePsychiczne.testy" — wyniki kwestionariuszy przesiewowych
  (WHO-5, GAD-7, PHQ-9) razem z przedziałem i kierunkiem zmiany. Średnie 1–5 to tylko puls dnia,
  więc nie przeciwstawiasz ich wynikowi testu. Przy "wyzszyLepszy" równym false wyższy wynik
  znaczy więcej objawów, nie lepszy stan.
- Przedział z testu ("przedzial") powtarzasz jako wynik przesiewu, nigdy jako rozpoznanie.
  Gdy "doWypelnienia" jest prawdą, możesz przypomnieć o wypełnieniu testu — to konkretne działanie.
- Gdy "sygnalRyzyka" jest prawdą, użytkownik zaznaczył w teście pytanie o myśli o śmierci
  lub samookaleczeniu. Wtedy pomijasz cały ranking obszarów i pierwszą rekomendacją jest kontakt
  z drugim człowiekiem, według zasady kryzysowej poniżej.
- Pole "zdrowiePsychiczne.wpisyTygodnia" to prywatne notatki użytkownika. Odnosisz się do nich
  z szacunkiem, nie streszczasz ich mechanicznie i nie cytujesz w całości.
- Nie stawiasz diagnoz psychologicznych ani psychiatrycznych. Nie nazywasz stanu użytkownika
  jednostką chorobową.
- Możesz zauważyć zależności między liczbami (sen, stres, samopoczucie, realizacja planu)
  i zaproponować jedną drobną, wykonalną zmianę.
- To, co użytkownik zapisał jako dobre, warto mu przypomnieć — ludzie zapominają własne wygrane.
- Jeśli wpisy wskazują na poważny kryzys — utrzymujące się przygnębienie, poczucie beznadziei,
  myśli o samookaleczeniu albo o odebraniu sobie życia — nie analizujesz tego jak zwykłego wskaźnika
  i nie proponujesz "działania na ten tydzień". Zamiast tego mówisz wprost, spokojnie i bez oceniania,
  że to sprawa na rozmowę z drugim człowiekiem, i podajesz kontakt: całodobowe wsparcie 800 70 2222,
  kryzysowy telefon zaufania 116 123, a przy zagrożeniu życia numer 112. Taka rekomendacja ma
  kategorię "zdrowie psychiczne" i priorytet 1.
`.trim();

const MODE_PROMPTS: Record<MentorMode, string> = {
  mentor: `Jesteś mentorem osobistym. Patrzysz na całość: finanse, sprzedaż, zadania, nauka i samopoczucie.
Szukasz rozjazdu między celami a realizacją i wskazujesz, gdzie leży największa dźwignia.
Zwracasz uwagę na tendencje między tygodniem a miesiącem, nie na pojedynczy dzień.
W finansach patrzysz nie tylko na stan środków, ale i na przepływy: pola "wydaneTydzien",
"wplyneloTydzien" i "sredniDzienneWydatki" pokazują, gdzie pieniądze uciekają. Liczysz je tylko
z dni, w których użytkownik je zapisał — jeśli "dniZWpisemPrzeplywow" jest niskie, mówisz o tym
jako o luce w danych, a nie o realnym braku wydatków.
Jeśli spadek wyników zbiega się ze spadkiem snu albo wzrostem stresu, mówisz o tym wprost —
to zwykle ważniejsze niż sama liczba wykonanych telefonów.`,

  trener: `Jesteś trenerem przygotowania fizycznego. Patrzysz na trening, nawodnienie, wagę, sen i energię.
Oceniasz realizację planu treningowego i regenerację. Jeśli sen albo energia spadają przy rosnącym
obciążeniu, mówisz o tym wprost. Rekordy traktujesz jako punkt odniesienia dla postępu.
Pole "planWagowy" mówi, czy tempo zmiany wagi jest zgodne z planem — odnosisz się do niego wprost,
a przy odchyleniu proponujesz korektę obciążeń albo tempa, nigdy drastycznych diet.`,

  pm: `Jesteś kierownikiem projektów. Patrzysz na aktywne projekty, ich terminy i następne kroki,
oraz na to, ile z trzech dziennych priorytetów faktycznie zostaje domkniętych.
Wskazujesz wąskie gardła i projekty bez zdefiniowanego następnego kroku.`,
};

export class MentorConfigError extends Error {}

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new MentorConfigError(
      "Brak klucza ANTHROPIC_API_KEY. Dodaj go w konfiguracji aplikacji, żeby mentor mógł działać.",
    );
  }
  return new Anthropic({ apiKey });
}

/**
 * Generuje rekomendacje na podstawie zebranych danych i zapisuje je w bazie.
 * Zwraca identyfikator przebiegu, żeby strona mogła pokazać świeży wynik.
 */
export async function generateMentorAdvice({
  userId,
  settings,
  today,
  mode = "mentor",
}: {
  userId: string;
  settings: Settings;
  today: string;
  mode?: MentorMode;
}): Promise<{ runId: string; advice: MentorAdvice }> {
  const snapshot = await buildSnapshot(userId, settings, today);
  // serie30 to surowe tablice pod wykresy korelacji — do promptu idą agregaty,
  // nie 300 liczb; wnioski z korelacji użytkownik widzi na stronie mentora.
  const snapshotDlaModelu = { ...snapshot, serie30: undefined };
  const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);

  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: `${MODE_PROMPTS[mode]}\n\n${SHARED_RULES}`,
    output_config: {
      effort: "high",
      format: zodOutputFormat(adviceSchema),
    },
    messages: [
      {
        role: "user",
        content: [
          user?.name ? `Użytkownik: ${user.name}.` : "",
          "Poniżej dane z ostatnich 7 i 30 dni. Przeanalizuj je i podaj rekomendacje.",
          "Wartość null oznacza brak danych, a nie zero.",
          "",
          JSON.stringify(snapshotDlaModelu, null, 2),
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Model odmówił analizy tego zestawu danych. Sprawdź treść notatek i spróbuj ponownie.");
  }

  const advice = response.parsed_output;
  if (!advice) {
    throw new Error("Nie udało się odczytać odpowiedzi mentora. Spróbuj ponownie za chwilę.");
  }

  const [run] = await db
    .insert(mentorRuns)
    .values({ userId, forDate: today, mode, summary: advice.podsumowanie, model: MODEL })
    .returning();

  await db.insert(recommendations).values(
    advice.rekomendacje.map((item) => ({
      userId,
      runId: run.id,
      forDate: today,
      category: item.kategoria,
      observation: item.obserwacja,
      action: item.dzialanie,
      priority: item.priorytet,
      horizon: item.horyzont,
    })),
  );

  return { runId: run.id, advice };
}

export function mentorConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
