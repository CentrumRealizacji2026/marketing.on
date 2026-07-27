/**
 * Migracje wykonywane w trakcie builda na hostingu.
 *
 * Na Vercelu nie ma gdzie ręcznie odpalić `npm run db:migrate` — build jest
 * jedynym momentem, w którym kod i connection string spotykają się na jednej
 * maszynie. Migracje Drizzle są idempotentne (tabela `__drizzle_migrations`
 * pilnuje, co już poszło), więc powtórzenie przy kolejnym deployu nic nie psuje.
 *
 * Bez DATABASE_URL skrypt kończy się powodzeniem i nie blokuje builda — tak,
 * żeby pierwszy deploy przeszedł jeszcze przed podpięciem bazy.
 */

import { spawnSync } from "node:child_process";

// Integracja Neon na Vercelu wstrzykuje kilka nazw naraz; bierzemy pierwszą, która jest.
const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "";

if (!url) {
  console.log("• Brak DATABASE_URL — pomijam migracje. Podepnij bazę i uruchom deploy ponownie.");
  process.exit(0);
}

// Migracje idą po połączeniu bezpośrednim: pooler potrafi zrywać długie DDL.
const direct = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || url;

console.log("• Wykonuję migracje bazy…");
const result = spawnSync("npx", ["drizzle-kit", "migrate"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: direct },
});

if (result.status !== 0) {
  console.error("✗ Migracje nie przeszły — przerywam build, żeby nie wypuścić aplikacji na niepełną bazę.");
  process.exit(1);
}

console.log("• Migracje gotowe.");
