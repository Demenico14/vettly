import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import type { OrgState } from "./store";

/** The signed-in person a request acts for. */
export interface Actor {
  userId: string;
  name: string;
  email: string;
  title: string;
  /** Role in the active organisation; "super_admin" for platform staff working outside one. */
  role: "org_admin" | "hr_manager" | "recruiter" | "hiring_manager" | "super_admin";
  isSuperAdmin: boolean;
}

export interface RequestContext {
  orgId: string;
  state: OrgState;
  actor: Actor | null;
  /** Work to run once the request's changes are saved, such as sending email. */
  after: (() => Promise<void>)[];
}

const als = new AsyncLocalStorage<RequestContext>();

export function context(): RequestContext {
  const c = als.getStore();
  if (!c) throw new Error("This needs an organisation context.");
  return c;
}

export const hasContext = () => !!als.getStore();
export const runInContext = <T,>(c: RequestContext, fn: () => T) => als.run(c, fn);

/** The person acting, for "added by" fields and the audit log. Background work is attributed to Vettly. */
export const actorName = () => als.getStore()?.actor?.name ?? "Vettly";
export const actor = () => context().actor;

/** Runs `fn` after the current request's changes are saved; failures are logged, not thrown. */
export function afterCommit(fn: () => Promise<void>) {
  const c = als.getStore();
  if (c) c.after.push(fn);
  else void fn().catch((e) => console.error("[after]", e));
}
export const orgId = () => context().orgId;

/** Current time as an ISO string. */
export const now = () => new Date().toISOString();

/** Short, URL-safe, unguessable ids such as `cnd_k3j9x0q2m4ab`. */
export function newId(prefix: string) {
  return `${prefix}_${randomBytes(9).toString("base64url").toLowerCase().replace(/[-_]/g, "x")}`;
}
