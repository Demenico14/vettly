/**
 * Platform administration service. Organisations, accounts and usage come straight from the database;
 * platform settings (AI configuration, providers, disabled tests) and the platform audit log are stored as
 * platform records. Every change needs a reason. Staff never see an organisation's candidates from here.
 */
import "server-only";
import { tests } from "@/mocks/psychometrics";
import { and, desc, eq, ne, sql as dsql } from "drizzle-orm";
import type { AiPolicy, AiTask, AiTaskConfig, AssessmentProvider, Incident, PlatformAuditEvent, PlatformSnapshot, PlanId, PlatformUser, ServiceHealth, Tenant } from "@/types/platform";
import { PLAN_LIMITS } from "@/lib/plans";
import { db, ownerSql, sql, schema } from "../db";
import { actor, actorName, newId, now } from "../context";
import { collection, single, forget } from "../store";
import { getObject, putObject } from "../storage";

export { PLAN_LIMITS };

/** A plain copy, so callers never hold the stored objects (store arrays are proxies, which structuredClone refuses). */
const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

const MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", note: "Most capable. Slower and costs more." },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", note: "Strong reasoning at moderate cost." },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", note: "Fastest and cheapest. Good for extraction." },
  { id: "claude-fable-5-2", label: "Claude Fable 5.2", note: "Writing-focused." },
];

/** AI isn't connected yet: these record which model each task will use once it is. */
const DEFAULT_TASKS: AiTaskConfig[] = [
  { task: "cv_extraction", label: "CV extraction", description: "Today: Vettly's rule-based CV reader. The model below takes over once AI is connected.", model: "claude-haiku-5-5", fallback: "claude-sonnet-5-5", maxOutputTokens: 4000, agreement: null, calls30d: 0, cost30d: 0, p95Seconds: 0 },
  { task: "matching", label: "Requirement matching", description: "Today: Vettly's rule-based evidence matcher. Always reviewed by HR.", model: "claude-sonnet-5-5", fallback: "claude-opus-5-5", maxOutputTokens: 6000, agreement: null, calls30d: 0, cost30d: 0, p95Seconds: 0 },
  { task: "job_description", label: "Job description assist", description: "Today: templates in the vacancy editor.", model: "claude-sonnet-5-5", fallback: "claude-haiku-5-5", maxOutputTokens: 3000, agreement: null, calls30d: 0, cost30d: 0, p95Seconds: 0 },
  { task: "interview_questions", label: "Interview questions", description: "Today: question sets built from each vacancy's requirements.", model: "claude-haiku-5-5", fallback: "claude-sonnet-5-5", maxOutputTokens: 2000, agreement: null, calls30d: 0, cost30d: 0, p95Seconds: 0 },
];

const policy = single<AiPolicy>("ai_policy", () => ({ provider: "Not connected", zeroRetention: true, redactContactDetails: true, humanReviewRequired: true, monthlyBudgetUsd: 0, spentThisMonthUsd: 0 }));
const tasks = single<AiTaskConfig[]>("ai_tasks", () => clone(DEFAULT_TASKS));
const providers = single<AssessmentProvider[]>("providers", () => [
  { id: "prov_vettly", name: "Vettly Assessments", kind: "in_house", status: "active", tests: tests.length, tenants: 0, resultLatency: "Instant", note: "Vettly's own tests and norms. Every organisation has access." },
]);
const disabledTests = single<string[]>("disabled_tests", () => []);
const notes = collection<{ id: string; notes: string[]; supportAccessUntil: string | null }>("tenant_note");
const incidents = collection<Incident & { id: string }>("incident");
const audit = collection<PlatformAuditEvent>("audit");

/** Platform records live under this pseudo-organisation. */
export const PLATFORM = "platform";

function log(action: string, target: string, detail: string) {
  audit.unshift({ id: newId("pa"), at: now(), actor: actorName(), action, target, detail });
}
function need(reason: string) {
  if (reason.trim().length < 8) throw new Error("Give a reason of at least a few words. It goes in the audit log.");
}
function staffOnly() {
  if (!actor()?.isSuperAdmin) throw new Error("Only Vettly platform administrators can do this.");
}

/** Tests switched off platform-wide, for the test library and send dialogs. */
export const platformDisabledTests = () => disabledTests.get();

async function usage() {
  // Platform administration reads usage across organisations, so it uses the owner connection (bypasses row-level security).
  const rows = await ownerSql<{ organisation_id: string; tests: number; apps30: number; cvs30: number }[]>`
    select organisation_id,
      coalesce(sum(case when kind = 'invitation' then jsonb_array_length(data->'results') end), 0)::int as tests,
      coalesce(sum(case when kind = 'candidate' then (select count(*) from jsonb_array_elements(data->'applications') a where (a->>'appliedAt')::timestamptz > now() - interval '30 days') end), 0)::int as apps30,
      coalesce(sum(case when kind = 'cv_batch' and (data->>'uploadedAt')::timestamptz > now() - interval '30 days' then jsonb_array_length(data->'files') end), 0)::int as cvs30
    from records where organisation_id <> ${PLATFORM} group by organisation_id`;
  return new Map(rows.map((r) => [r.organisation_id, r]));
}

async function tenants(): Promise<Tenant[]> {
  const orgs = await db.select().from(schema.organisations).orderBy(desc(schema.organisations.createdAt));
  const members = await db.select({ m: schema.memberships, u: schema.users }).from(schema.memberships).innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId));
  const use = await usage();
  return orgs.map((o) => {
    const mine = members.filter((x) => x.m.organisationId === o.id);
    const admin = mine.find((x) => x.m.role === "org_admin" && x.m.status === "active")?.u;
    const lim = PLAN_LIMITS[o.plan as PlanId] ?? PLAN_LIMITS.growth;
    const renew = new Date(o.createdAt);
    renew.setFullYear(renew.getFullYear() + 1);
    const last = mine.map((x) => x.u.lastSignInAt?.getTime() ?? 0).reduce((a, b) => Math.max(a, b), 0);
    const n = notes.find((x) => x.id === o.id);
    return {
      id: o.id,
      name: o.name,
      industry: o.industry,
      country: o.country,
      plan: o.plan as PlanId,
      billing: o.plan === "starter" ? "monthly" : "annual",
      status: o.status as Tenant["status"],
      arrUsd: o.status === "trial" ? 0 : lim.price,
      seatsUsed: mine.filter((x) => x.m.status !== "deactivated").length,
      seatsTotal: o.seatsTotal,
      testCreditsUsed: use.get(o.id)?.tests ?? 0,
      testCreditsTotal: o.testCreditsTotal,
      cvProcessed30d: use.get(o.id)?.cvs30 ?? 0,
      applications30d: use.get(o.id)?.apps30 ?? 0,
      createdAt: o.createdAt.toISOString(),
      renewsAt: (o.status === "trial" && o.trialEndsAt ? o.trialEndsAt : renew).toISOString(),
      lastActiveAt: new Date(last || o.createdAt.getTime()).toISOString(),
      adminName: admin?.name ?? "No admin",
      adminEmail: admin?.email ?? "",
      supportAccessUntil: n?.supportAccessUntil && new Date(n.supportAccessUntil) > new Date() ? n.supportAccessUntil : null,
      assessmentProvider: "Vettly Assessments",
      notes: n?.notes ?? [],
    };
  });
}

async function users(): Promise<PlatformUser[]> {
  const staff = await db.select().from(schema.users).where(eq(schema.users.isSuperAdmin, true));
  const admins = await db
    .select({ m: schema.memberships, u: schema.users, o: schema.organisations })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .innerJoin(schema.organisations, eq(schema.organisations.id, schema.memberships.organisationId))
    .where(and(eq(schema.memberships.role, "org_admin"), ne(schema.memberships.status, "deactivated")));
  return [
    ...staff.map((u) => ({ id: u.id, name: u.name, email: u.email, kind: "staff" as const, role: "Super administrator", tenant: null, status: u.locked ? ("locked" as const) : ("active" as const), twoFactor: false, lastSignInAt: u.lastSignInAt?.toISOString() ?? null })),
    ...admins.map(({ m, u, o }) => ({ id: u.id, name: u.name, email: u.email, kind: "tenant_admin" as const, role: "Organisation admin", tenant: o.name, status: u.locked ? ("locked" as const) : m.status === "invited" ? ("invited" as const) : ("active" as const), twoFactor: false, lastSignInAt: u.lastSignInAt?.toISOString() ?? null })),
  ];
}

/** Live checks of the services Vettly depends on. */
async function health(): Promise<ServiceHealth[]> {
  const check = async (fn: () => Promise<unknown>) => {
    const started = Date.now();
    try {
      await fn();
      return { ok: true, ms: Date.now() - started };
    } catch {
      return { ok: false, ms: Date.now() - started };
    }
  };
  const dbCheck = await check(() => sql`select 1`);
  const key = "health/ping";
  const storageCheck = await check(async () => {
    await putObject(key, new TextEncoder().encode(now()), "text/plain");
    await getObject(key);
  });
  const mailCheck = await check(async () => {
    if (!process.env.SMTP_HOST) throw new Error("not configured");
    const nodemailer = await import("nodemailer");
    await nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 1025) }).verify();
  });
  const day = (ok: boolean) => Array.from({ length: 30 }, (_, i) => (i === 29 ? (ok ? "operational" : "outage") : "operational")) as ServiceHealth["days"];
  const svc = (id: string, name: string, description: string, c: { ok: boolean; ms: number }, metric: string): ServiceHealth => ({ id, name, description, status: c.ok ? "operational" : "outage", uptime30d: c.ok ? 100 : 0, metric, days: day(c.ok) });
  return [
    svc("web", "Web app", "This server", { ok: true, ms: 0 }, `up ${Math.round(process.uptime() / 60)} min`),
    svc("db", "Database", "PostgreSQL", dbCheck, `${dbCheck.ms} ms`),
    svc("storage", "Document storage", process.env.S3_ENDPOINT ? "S3-compatible storage" : "Local folder (.data/files)", storageCheck, `${storageCheck.ms} ms`),
    svc("email", "Email", process.env.SMTP_HOST ? `SMTP ${process.env.SMTP_HOST}` : "Not configured: messages are written to the server log", mailCheck, mailCheck.ok ? `${mailCheck.ms} ms` : "not connected"),
    { id: "sms", name: "SMS", description: "Not connected yet", status: "maintenance", uptime30d: 0, metric: "not connected", days: Array(30).fill("maintenance") },
    { id: "ai", name: "AI models", description: "Not connected yet: rule-based CV reading and matching", status: "maintenance", uptime30d: 0, metric: "not connected", days: Array(30).fill("maintenance") },
  ];
}

const org = async (id: string) => {
  const [o] = await db.select().from(schema.organisations).where(eq(schema.organisations.id, id));
  if (!o) throw new Error("This organisation could not be found.");
  return o;
};
const tenant = async (id: string) => (await tenants()).find((t) => t.id === id)!;

export interface PlatformService {
  snapshot(): Promise<PlatformSnapshot>;
  changePlan(id: string, plan: PlanId, reason: string): Promise<Tenant>;
  addCredits(id: string, credits: number, reason: string): Promise<Tenant>;
  setStatus(id: string, status: "active" | "suspended", reason: string): Promise<Tenant>;
  extendTrial(id: string, days: number, reason: string): Promise<Tenant>;
  endSupportAccess(id: string): Promise<Tenant>;
  setUserLocked(id: string, locked: boolean, reason: string): Promise<void>;
  resetTwoFactor(id: string, reason: string): Promise<void>;
  setModel(task: AiTask, field: "model" | "fallback", model: string, reason: string): Promise<void>;
  setPolicy(field: "zeroRetention" | "redactContactDetails" | "humanReviewRequired", value: boolean, reason: string): Promise<void>;
  setBudget(usd: number, reason: string): Promise<void>;
  setProviderStatus(id: string, status: AssessmentProvider["status"], reason: string): Promise<void>;
  setTestEnabled(testId: string, enabled: boolean, reason: string): Promise<void>;
  audit(): Promise<PlatformAuditEvent[]>;
}

export const platformService: PlatformService = {
  async snapshot() {
    staffOnly();
    const t = await tenants();
    const p = clone(providers.get());
    p[0]!.tenants = t.filter((x) => x.status !== "suspended").length;
    return {
      tenants: t,
      users: await users(),
      services: await health(),
      incidents: clone(incidents) as Incident[],
      ai: { policy: clone(policy.get()), tasks: clone(tasks.get()), models: MODELS },
      providers: p,
      disabledTests: clone(disabledTests.get()),
      audit: clone(audit),
    };
  },
  async changePlan(id, plan, reason) {
    staffOnly();
    need(reason);
    const o = await org(id);
    const lim = PLAN_LIMITS[plan];
    const t = await tenant(id);
    if (t.seatsUsed > lim.seats && plan !== "enterprise") throw new Error(`${o.name} uses ${t.seatsUsed} seats; ${plan} allows ${lim.seats}. They must deactivate people first.`);
    await db.update(schema.organisations).set({ plan, seatsTotal: Math.max(lim.seats, plan === "enterprise" ? o.seatsTotal : 0), testCreditsTotal: Math.max(o.testCreditsTotal, lim.tests) }).where(eq(schema.organisations.id, id));
    log("Changed plan", o.name, `${o.plan} → ${plan}. ${reason.trim()}`);
    return tenant(id);
  },
  async addCredits(id, credits, reason) {
    staffOnly();
    need(reason);
    if (!Number.isInteger(credits) || credits <= 0 || credits > 5000) throw new Error("Add between 1 and 5,000 credits.");
    const o = await org(id);
    await db.update(schema.organisations).set({ testCreditsTotal: o.testCreditsTotal + credits }).where(eq(schema.organisations.id, id));
    log("Added test credits", o.name, `+${credits.toLocaleString("en-GB")} (now ${(o.testCreditsTotal + credits).toLocaleString("en-GB")}). ${reason.trim()}`);
    return tenant(id);
  },
  async setStatus(id, status, reason) {
    staffOnly();
    need(reason);
    const o = await org(id);
    await db.update(schema.organisations).set({ status }).where(eq(schema.organisations.id, id));
    if (status === "suspended") await db.delete(schema.sessions).where(eq(schema.sessions.organisationId, id));
    forget(id);
    log(status === "suspended" ? "Suspended organisation" : "Restored organisation", o.name, reason.trim());
    return tenant(id);
  },
  async extendTrial(id, days, reason) {
    staffOnly();
    need(reason);
    const o = await org(id);
    if (o.status !== "trial") throw new Error("Only trials can be extended.");
    const ends = new Date((o.trialEndsAt ?? new Date()).getTime() + days * 86_400_000);
    await db.update(schema.organisations).set({ trialEndsAt: ends }).where(eq(schema.organisations.id, id));
    log("Extended trial", o.name, `+${days} days, now ends ${ends.toISOString().slice(0, 10)}. ${reason.trim()}`);
    return tenant(id);
  },
  async endSupportAccess(id) {
    staffOnly();
    const o = await org(id);
    const n = notes.find((x) => x.id === id);
    if (n) n.supportAccessUntil = null;
    log("Ended support access", o.name, "Access withdrawn before it expired");
    return tenant(id);
  },
  async setUserLocked(id, locked, reason) {
    staffOnly();
    need(reason);
    if (id === actor()?.userId) throw new Error("You can't lock your own account.");
    const [u] = await db.update(schema.users).set({ locked, failedSignIns: 0, signInPausedUntil: null }).where(eq(schema.users.id, id)).returning();
    if (!u) throw new Error("That account no longer exists.");
    if (locked) await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
    log(locked ? "Locked account" : "Unlocked account", u.name, reason.trim());
  },
  async resetTwoFactor(id, reason) {
    staffOnly();
    need(reason);
    void id;
    throw new Error("Two-step verification isn't switched on for any account yet, so there's nothing to reset.");
  },
  async setModel(task, field, model, reason) {
    staffOnly();
    need(reason);
    const list = tasks.get();
    const t = list.find((x) => x.task === task)!;
    if (field === "fallback" && model === t.model) throw new Error("The fallback must be a different model from the main one.");
    if (field === "model" && model === t.fallback) throw new Error("That's the fallback model. Change the fallback first.");
    const from = t[field];
    t[field] = model;
    tasks.set([...list]);
    log(field === "model" ? "Changed model" : "Changed fallback model", t.label, `${from} → ${model}. ${reason.trim()}`);
  },
  async setPolicy(field, value, reason) {
    staffOnly();
    need(reason);
    if (field === "humanReviewRequired" && !value) throw new Error("Human review of AI assessments can't be turned off: rejections must always be a person's decision.");
    policy.set({ ...policy.get(), [field]: value });
    const label = { zeroRetention: "Zero data retention", redactContactDetails: "Contact-detail redaction", humanReviewRequired: "Human review" }[field];
    log(`${value ? "Turned on" : "Turned off"} ${label.toLowerCase()}`, "AI policy", reason.trim());
  },
  async setBudget(usd, reason) {
    staffOnly();
    need(reason);
    if (!Number.isFinite(usd) || usd < 0) throw new Error("Enter a budget of 0 or more.");
    const from = policy.get().monthlyBudgetUsd;
    policy.set({ ...policy.get(), monthlyBudgetUsd: usd });
    log("Changed AI budget", "AI policy", `US$${from.toLocaleString("en-GB")} → US$${usd.toLocaleString("en-GB")} a month. ${reason.trim()}`);
  },
  async setProviderStatus(id, status, reason) {
    staffOnly();
    need(reason);
    const list = providers.get();
    const p = list.find((x) => x.id === id);
    if (!p) throw new Error("That provider no longer exists.");
    if (p.kind === "in_house" && status === "off") throw new Error("The in-house provider can't be switched off: every organisation depends on it.");
    p.status = status;
    providers.set([...list]);
    log("Changed provider status", p.name, `${status}. ${reason.trim()}`);
  },
  async setTestEnabled(testId, enabled, reason) {
    staffOnly();
    need(reason);
    const list = disabledTests.get();
    disabledTests.set(enabled ? list.filter((x) => x !== testId) : [...new Set([...list, testId])]);
    log(enabled ? "Enabled test" : "Disabled test", testId, reason.trim());
  },
  async audit() {
    staffOnly();
    return clone(audit);
  },
};

void dsql;
