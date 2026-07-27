import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __sql?: ReturnType<typeof postgres>;
  __db?: Db;
};

function getDb(): Db {
  if (globalForDb.__db) return globalForDb.__db;

  // Integracje hostingowe (Neon na Vercelu) wstrzykują connection string pod
  // różnymi nazwami — sprawdzamy wszystkie, żeby nie wymagać ręcznego kopiowania.
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    "";

  if (!url) {
    throw new Error(
      "Brak zmiennej DATABASE_URL. Skopiuj .env.example do .env i uzupełnij connection string do Postgresa.",
    );
  }

  // Serverless mnoży procesy, więc każdy trzyma jedno połączenie — inaczej kilkanaście
  // równoległych wywołań wyczerpuje limit bazy. Lokalnie jeden proces obsługuje wszystko,
  // więc pool może być większy.
  const serverless = Boolean(process.env.VERCEL);

  // prepare: false jest konieczne za poolerem (pgbouncer) — prepared statements go rozkładają.
  globalForDb.__sql ??= postgres(url, {
    max: serverless ? 1 : 5,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 15,
  });
  globalForDb.__db = drizzle(globalForDb.__sql, { schema });
  return globalForDb.__db;
}

/**
 * Połączenie tworzone leniwie, przy pierwszym zapytaniu — dzięki temu `next build`
 * nie wymaga działającej bazy.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
