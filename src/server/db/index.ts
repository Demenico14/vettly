import "server-only";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "postgres://vettly:vettly-dev-password@localhost:5432/vettly";

// One pool per server process, kept across hot reloads in development.
const g = globalThis as unknown as { __vettlySql?: postgres.Sql; __vettlyMigrated?: Promise<void> };
export const sql = g.__vettlySql ?? postgres(url, { max: 10, idle_timeout: 30, onnotice: () => {} });
g.__vettlySql = sql;

export const db = drizzle(sql, { schema });
export { schema };

/** Applies pending migrations once per process. Every server entry point awaits this before touching data. */
export function ready(): Promise<void> {
  g.__vettlyMigrated ??= migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") }).catch((e) => {
    g.__vettlyMigrated = undefined;
    throw e;
  });
  return g.__vettlyMigrated;
}
