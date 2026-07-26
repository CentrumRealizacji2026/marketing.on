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

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Brak zmiennej DATABASE_URL. Skopiuj .env.example do .env i uzupełnij connection string do Postgresa.",
    );
  }

  // Jeden pool na proces — Next w trybie dev przeładowuje moduły przy każdej zmianie.
  globalForDb.__sql ??= postgres(url, { max: 5, prepare: false });
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
