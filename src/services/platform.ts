/**
 * Platform administration service (Module 15). In-memory. Every change needs a reason and is written
 * to the platform audit log. Staff never see tenant candidate data from here.
 */
import type { AiTask, AssessmentProvider, PlatformAuditEvent, PlatformSnapshot, PlanId, Tenant } from "@/types/platform";
import { aiModels, aiTasks, platformSeed } from "@/mocks/platform";
import { MOCK_NOW } from "@/mocks/data";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => structuredClone(v);
const ACTOR = "Grace Nyathi";

const state = clone(platformSeed);
const tasks = clone(aiTasks);
let seq = 100;
let clock = new Date(MOCK_NOW).getTime();

function log(action: string, target: string, detail: string) {
  clock += 60000;
  state.audit.unshift({ id: `pa_${++seq}`, at: new Date(clock).toISOString(), actor: ACTOR, action, target, detail });
}
function need(reason: string) {
  if (reason.trim().length < 8) throw new Error("Give a reason of at least a few words. It goes in the audit log.");
}
const tenant = (id: string) => {
  const t = state.tenants.find((x) => x.id === id);
  if (!t) throw new Error("This organisation could not be found.");
  return t;
};

export const PLAN_LIMITS: Record<PlanId, { seats: number; tests: number; price: number }> = {
  starter: { seats: 5, tests: 100, price: 1200 },
  growth: { seats: 20, tests: 500, price: 4800 },
  enterprise: { seats: 50, tests: 1500, price: 15600 },
};

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

export const mockPlatform: PlatformService = {
  async snapshot() {
    await wait(400);
    const { aiPolicy, ...rest } = state;
    return clone({ ...rest, ai: { policy: aiPolicy, tasks, models: aiModels } });
  },
  async changePlan(id, plan, reason) {
    await wait(400);
    need(reason);
    const t = tenant(id);
    const lim = PLAN_LIMITS[plan];
    if (t.seatsUsed > lim.seats && plan !== "enterprise") throw new Error(`${t.name} uses ${t.seatsUsed} seats; ${plan} allows ${lim.seats}. They must deactivate people first.`);
    const from = t.plan;
    t.plan = plan;
    t.seatsTotal = Math.max(lim.seats, plan === "enterprise" ? t.seatsTotal : 0);
    t.testCreditsTotal = Math.max(t.testCreditsTotal, lim.tests);
    if (t.status !== "trial") t.arrUsd = lim.price;
    log("Changed plan", t.name, `${from} → ${plan}. ${reason.trim()}`);
    return clone(t);
  },
  async addCredits(id, credits, reason) {
    await wait(350);
    need(reason);
    if (!Number.isInteger(credits) || credits <= 0 || credits > 5000) throw new Error("Add between 1 and 5,000 credits.");
    const t = tenant(id);
    t.testCreditsTotal += credits;
    log("Added test credits", t.name, `+${credits.toLocaleString("en-GB")} (now ${t.testCreditsTotal.toLocaleString("en-GB")}). ${reason.trim()}`);
    return clone(t);
  },
  async setStatus(id, status, reason) {
    await wait(400);
    need(reason);
    const t = tenant(id);
    if (t.id === "org_msasa" && status === "suspended") throw new Error("Msasa Financial is the demo organisation. Suspending it would lock you out of the prototype.");
    t.status = status;
    log(status === "suspended" ? "Suspended organisation" : "Restored organisation", t.name, reason.trim());
    return clone(t);
  },
  async extendTrial(id, days, reason) {
    await wait(350);
    need(reason);
    const t = tenant(id);
    if (t.status !== "trial") throw new Error("Only trials can be extended.");
    const d = new Date(t.renewsAt);
    d.setDate(d.getDate() + days);
    t.renewsAt = d.toISOString().slice(0, 10);
    log("Extended trial", t.name, `+${days} days, now ends ${t.renewsAt}. ${reason.trim()}`);
    return clone(t);
  },
  async endSupportAccess(id) {
    await wait(300);
    const t = tenant(id);
    t.supportAccessUntil = null;
    log("Ended support access", t.name, "Access withdrawn before it expired");
    return clone(t);
  },
  async setUserLocked(id, locked, reason) {
    await wait(300);
    need(reason);
    const u = state.users.find((x) => x.id === id)!;
    if (u.id === "pu_grace") throw new Error("You can't lock your own account.");
    u.status = locked ? "locked" : "active";
    log(locked ? "Locked account" : "Unlocked account", u.name, reason.trim());
  },
  async resetTwoFactor(id, reason) {
    await wait(300);
    need(reason);
    const u = state.users.find((x) => x.id === id)!;
    u.twoFactor = false;
    log("Reset two-step verification", u.name, `${reason.trim()} They'll set it up again at next sign-in.`);
  },
  async setModel(task, field, model, reason) {
    await wait(350);
    need(reason);
    const t = tasks.find((x) => x.task === task)!;
    if (field === "fallback" && model === t.model) throw new Error("The fallback must be a different model from the main one.");
    if (field === "model" && model === t.fallback) throw new Error("That's the fallback model. Change the fallback first.");
    const from = t[field];
    t[field] = model;
    log(field === "model" ? "Changed model" : "Changed fallback model", t.label, `${from} → ${model}. ${reason.trim()}`);
  },
  async setPolicy(field, value, reason) {
    await wait(300);
    need(reason);
    if (field === "humanReviewRequired" && !value) throw new Error("Human review of AI assessments can't be turned off: rejections must always be a person's decision.");
    state.aiPolicy[field] = value;
    const label = { zeroRetention: "Zero data retention", redactContactDetails: "Contact-detail redaction", humanReviewRequired: "Human review" }[field];
    log(`${value ? "Turned on" : "Turned off"} ${label.toLowerCase()}`, "AI policy", reason.trim());
  },
  async setBudget(usd, reason) {
    await wait(300);
    need(reason);
    if (usd < state.aiPolicy.spentThisMonthUsd) throw new Error(`This month's spend is already US$${state.aiPolicy.spentThisMonthUsd.toLocaleString("en-GB")}. Set a budget above that.`);
    const from = state.aiPolicy.monthlyBudgetUsd;
    state.aiPolicy.monthlyBudgetUsd = usd;
    log("Changed AI budget", "AI policy", `US$${from.toLocaleString("en-GB")} → US$${usd.toLocaleString("en-GB")} a month. ${reason.trim()}`);
  },
  async setProviderStatus(id, status, reason) {
    await wait(350);
    need(reason);
    const p = state.providers.find((x) => x.id === id)!;
    if (p.kind === "in_house" && status === "off") throw new Error("The in-house provider can't be switched off: every tenant depends on it.");
    if (status === "off" && p.tenants > 0) throw new Error(`${p.tenants} organisation${p.tenants === 1 ? " uses" : "s use"} ${p.name}. Move them to another provider first.`);
    p.status = status;
    log("Changed provider status", p.name, `${status}. ${reason.trim()}`);
  },
  async setTestEnabled(testId, enabled, reason) {
    await wait(300);
    need(reason);
    state.disabledTests = enabled ? state.disabledTests.filter((x) => x !== testId) : [...new Set([...state.disabledTests, testId])];
    log(enabled ? "Enabled test" : "Disabled test", testId, reason.trim());
  },
  async audit() {
    await wait(250);
    return clone(state.audit);
  },
};
