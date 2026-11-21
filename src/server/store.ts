import "server-only";
import { asOrg, ownerSql, ready } from "./db";
import { context, runInContext, type Actor } from "./context";

/**
 * Organisation-scoped record store.
 *
 * Each organisation's records are loaded from Postgres once, kept in this server process, and written
 * back after every request: only the records that changed are upserted, and removed records are deleted,
 * in one transaction. Requests for the same organisation run one at a time, so they never interleave.
 * If a request fails, the organisation's in-memory copy is dropped and reloaded from the database, so a
 * half-finished change is never saved.
 *
 * This assumes a single app process (the Docker setup). Running several replicas needs the records
 * moved into relational tables first (docs/BACKEND_PLAN.md, phase 7).
 */
export interface OrgState {
  orgId: string;
  cols: Map<string, { id: string }[]>;
  singles: Map<string, unknown>;
  /** JSON of each record as last saved, keyed `kind\u0000id`. */
  saved: Map<string, string>;
}

const g = globalThis as unknown as { __vettlyOrgs?: Map<string, Promise<OrgState>>; __vettlyLocks?: Map<string, Promise<unknown>> };
const cache = (g.__vettlyOrgs ??= new Map());
const locks = (g.__vettlyLocks ??= new Map());

const SINGLE = "_";
const key = (kind: string, id: string) => `${kind}\u0000${id}`;

async function load(orgId: string): Promise<OrgState> {
  const rows = await asOrg(orgId, (tx) => tx<{ kind: string; id: string; data: unknown }[]>`select kind, id, data from records where organisation_id = ${orgId}`);
  const state: OrgState = { orgId, cols: new Map(), singles: new Map(), saved: new Map() };
  for (const r of rows) {
    if (r.id === SINGLE) state.singles.set(r.kind, r.data);
    else {
      const list = state.cols.get(r.kind) ?? [];
      list.push(r.data as { id: string });
      state.cols.set(r.kind, list);
    }
    state.saved.set(key(r.kind, r.id), JSON.stringify(r.data));
  }
  return state;
}

function stateFor(orgId: string) {
  let p = cache.get(orgId);
  if (!p) {
    p = load(orgId);
    cache.set(orgId, p);
    p.catch(() => cache.delete(orgId));
  }
  return p;
}

async function persist(state: OrgState) {
  const seen = new Set<string>();
  const upserts: { organisationId: string; kind: string; id: string; data: unknown }[] = [];
  const write = (kind: string, id: string, data: unknown) => {
    const k = key(kind, id);
    seen.add(k);
    const json = JSON.stringify(data);
    if (state.saved.get(k) !== json) upserts.push({ organisationId: state.orgId, kind, id, data: JSON.parse(json) });
  };
  for (const [kind, list] of state.cols) for (const doc of list) write(kind, doc.id, doc);
  for (const [kind, value] of state.singles) if (value !== undefined) write(kind, SINGLE, value);
  const removed = [...state.saved.keys()].filter((k) => !seen.has(k)).map((k) => k.split("\u0000") as [string, string]);
  if (!upserts.length && !removed.length) return;

  await asOrg(state.orgId, async (tx) => {
    for (const u of upserts) {
      await tx`insert into records (organisation_id, kind, id, data, updated_at)
               values (${u.organisationId}, ${u.kind}, ${u.id}, ${JSON.stringify(u.data)}::jsonb, now())
               on conflict (organisation_id, kind, id) do update set data = excluded.data, updated_at = now()`;
    }
    for (const [kind, id] of removed) {
      await tx`delete from records where organisation_id = ${state.orgId} and kind = ${kind} and id = ${id}`;
    }
  });
  for (const u of upserts) state.saved.set(key(u.kind, u.id), JSON.stringify(u.data));
  for (const [kind, id] of removed) state.saved.delete(key(kind, id));
}

/** Runs `fn` with the organisation's records, one request at a time per organisation, then saves what changed. */
export async function withOrg<T>(orgId: string, actor: Actor | null, fn: () => Promise<T> | T): Promise<T> {
  const previous = locks.get(orgId) ?? Promise.resolve();
  let release!: () => void;
  const mine = new Promise<void>((r) => (release = r));
  const chained = previous.then(() => mine);
  locks.set(orgId, chained);
  await previous;
  try {
    const state = await stateFor(orgId);
    const after: (() => Promise<void>)[] = [];
    try {
      const result = await runInContext({ orgId, state, actor, after }, fn);
      await persist(state);
      for (const job of after) void job().catch((e) => console.error("[after]", e));
      return result;
    } catch (e) {
      cache.delete(orgId);
      throw e;
    }
  } finally {
    release();
    if (locks.get(orgId) === chained) locks.delete(orgId);
  }
}

/** Drops an organisation's cached records, e.g. after it is deleted. */
export function forget(orgId: string) {
  cache.delete(orgId);
}

/** Reads records of one kind across every organisation. Platform administration only: it bypasses row-level security. */
export async function recordsAcrossOrgs<T>(kind: string): Promise<{ organisationId: string; data: T }[]> {
  await ready();
  return ownerSql<{ organisationId: string; data: T }[]>`select organisation_id as "organisationId", data from records where kind = ${kind}`;
}

export async function deleteOrgRecords(orgId: string, kinds: string[]) {
  await asOrg(orgId, (tx) => tx`delete from records where organisation_id = ${orgId} and kind in ${tx(kinds)}`);
  forget(orgId);
}

function current(kind: string) {
  const { state } = context();
  let list = state.cols.get(kind);
  if (!list) {
    list = [];
    state.cols.set(kind, list);
  }
  return list;
}

/**
 * An array of the active organisation's records of one kind. It behaves like a normal array (find, filter,
 * push, splice, index) and always reads the organisation of the current request.
 */
export function collection<T extends { id: string }>(kind: string): T[] {
  return new Proxy([] as T[], {
    get(_t, p) {
      const list = current(kind);
      const v = Reflect.get(list, p, list);
      return typeof v === "function" ? v.bind(list) : v;
    },
    set(_t, p, v) {
      return Reflect.set(current(kind), p, v);
    },
    has(_t, p) {
      return Reflect.has(current(kind), p);
    },
    deleteProperty(_t, p) {
      return Reflect.deleteProperty(current(kind), p);
    },
  });
}

/** One record per organisation, such as settings. */
export function single<T>(kind: string, initial: () => T) {
  return {
    get(): T {
      const { state } = context();
      if (!state.singles.has(kind)) state.singles.set(kind, initial());
      return state.singles.get(kind) as T;
    },
    set(value: T) {
      context().state.singles.set(kind, value);
    },
  };
}

/** Replaces every record of a kind (for bulk resets). */
export function replaceAll<T extends { id: string }>(kind: string, list: T[]) {
  context().state.cols.set(kind, list);
}
