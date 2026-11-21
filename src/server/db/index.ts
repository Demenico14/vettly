import "server-only";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import * as schema from "./schema";

/**
 * Two database users:
 * - The owner (MIGRATION_DATABASE_URL) runs migrations and the few platform-administration queries that must
 *   read across organisations. It bypasses row-level security.
 * - The app (DATABASE_URL) runs everything else. It is created here with no superuser or BYPASSRLS rights, so
 *   the row-level security policies on records and files always apply to it.
 * When only DATABASE_URL is set, both are the same user and the policies protect nothing; a warning says so.
 */
const appUrl = process.env.DATABASE_URL ?? "postgres://vettly_app:vettly-app-dev-password@localhost:5432/vettly";
const ownerUrl = process.env.MIGRATION_DATABASE_URL ?? appUrl;

type G = { __vettlySql?: postgres.Sql; __vettlyOwnerSql?: postgres.Sql; __vettlyMigrated?: Promise<void> };
const g = globalThis as unknown as G;
const options = { max: 10, idle_timeout: 30, onnotice: () => {} };

// One pool per server process, kept across hot reloads in development.
export const sql = (g.__vettlySql ??= postgres(appUrl, options));
/** Bypasses row-level security. Use only for migrations and platform administration. */
export const ownerSql = (g.__vettlyOwnerSql ??= ownerUrl === appUrl ? sql : postgres(ownerUrl, { ...options, max: 3 }));

export const db = drizzle(sql, { schema });
export const ownerDb = drizzle(ownerSql, { schema });
export { schema };

/**
 * Runs `fn` in a transaction scoped to one organisation: row-level security shows and accepts only that
 * organisation's records and files. The setting lasts for this transaction only, so a pooled connection
 * never carries it into the next request.
 */
export async function asOrg<T>(organisationId: string, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  if (!organisationId) throw new Error("No organisation to scope this query to.");
  await ready();
  return sql.begin(async (tx) => {
    await tx`select set_config('app.org', ${organisationId}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

const literal = (s: string) => `'${s.replace(/'/g, "''")}'`;

/** Creates the app's database user if needed and gives it data access only: no ownership, no bypass rights. */
async function provisionAppRole() {
  if (ownerUrl === appUrl) {
    console.warn("[db] DATABASE_URL and MIGRATION_DATABASE_URL are the same user, so row-level security is not enforced. Set both (see .env.example).");
    return;
  }
  const app = new URL(appUrl);
  const role = decodeURIComponent(app.username);
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(role)) throw new Error("The app database user name may only use lower-case letters, digits and underscores.");
  const [exists] = await ownerSql`select 1 from pg_roles where rolname = ${role}`;
  const password = literal(decodeURIComponent(app.password));
  await ownerSql.unsafe(exists ? `alter role ${role} login password ${password}` : `create role ${role} login password ${password}`);
  await ownerSql.unsafe(`alter role ${role} nosuperuser nobypassrls nocreatedb nocreaterole`);
  await ownerSql.unsafe(`grant usage on schema public to ${role}`);
  await ownerSql.unsafe(`grant select, insert, update, delete on all tables in schema public to ${role}`);
  await ownerSql.unsafe(`grant usage, select on all sequences in schema public to ${role}`);
  await ownerSql.unsafe(`grant execute on function vettly_invitation_org(text) to ${role}`);
}

/** Applies pending migrations and sets up the app's database user, once per process. Every server entry point awaits this. */
export function ready(): Promise<void> {
  g.__vettlyMigrated ??= (async () => {
    await migrate(ownerDb, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    await provisionAppRole();
  })().catch((e) => {
    g.__vettlyMigrated = undefined;
    throw e;
  });
  return g.__vettlyMigrated;
}
