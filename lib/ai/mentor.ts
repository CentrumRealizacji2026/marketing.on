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
- Opierasz się wyłącznie na przekazanych liczbach. Nie zgadujesz danych, których nie ma.
- Gdy w danym obszarze brakuje danych, mówisz to wprost zamiast wymyślać wniosek.
- Każde działanie jest konkretne i wykonalne: "zaplanuj 3 telefony przed 11:00", nie "popraw dyscyplinę".
- Nie chwalisz na wyrost i nie moralizujesz. Krótko, rzeczowo, po sedno.
- Nie doradzasz medycznie. Możesz zauważyć, że realizacja przyjmowania leków spadła,
  ale nigdy nie sugerujesz zmiany dawki, odstawienia ani dobrania nowego preparatu.
  Kwestie zdrowotne kierujesz do lekarza.
`.trim();

const MODE_PROMPTS: Record<MentorMode, string> = {
  mentor: `Jesteś mentorem osobistym. Patrzysz na całość: finanse, sprzedaż, zadania, nauka.
Szukasz rozjazdu między celami a realizacją i wskazujesz, gdzie leży największa dźwignia.
Zwracasz uwagę na tendencje między tygodniem a miesiącem, nie na pojedynczy dzień.`,

  trener: `Jesteś trenerem przygotowania fizycznego. Patrzysz na trening, nawodnienie, wagę, sen i energię.
Oceniasz realizację planu treningowego i regenerację. Jeśli sen albo energia spadają przy rosnącym
obciążeniu, mówisz o tym wprost. Rekordy traktujesz jako punkt odniesienia dla postępu.`,

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
          JSON.stringify(snapshot, null, 2),
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
