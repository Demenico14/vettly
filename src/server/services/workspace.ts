/**
 * Session, notifications, search and candidate summaries for the app shell.
 */
import "server-only";
import { ROLE_LABEL } from "@/lib/settings-defaults";
import { and, eq, ne } from "drizzle-orm";
import type { AppNotification, CandidateSummary, Organisation, User } from "@/types";
import type { CandidateService, NotificationService, SearchResult, SearchService, SessionService } from "@/services/contracts";
import { db, schema } from "../db";
import { actor, context } from "../context";
import { single } from "../store";
import { destroySession, readSession, setSessionOrganisation } from "../session";
import { profileSnapshot } from "./candidates";
import { vacancySnapshot } from "./vacancies";
import { dashboardService } from "./dashboard";

async function orgRow(id: string): Promise<Organisation> {
  const [o] = await db.select().from(schema.organisations).where(eq(schema.organisations.id, id));
  if (!o) throw new Error("This organisation no longer exists.");
  const seats = await db.select().from(schema.memberships).where(and(eq(schema.memberships.organisationId, id), ne(schema.memberships.status, "deactivated")));
  return { id: o.id, name: o.name, shortName: o.shortName, industry: o.industry, city: o.city, country: o.country, plan: o.plan as Organisation["plan"], seatsUsed: seats.length, seatsTotal: o.seatsTotal };
}

export const sessionService: SessionService = {
  async getCurrentUser(): Promise<User> {
    const s = await readSession();
    if (!s) throw new Error("Your session has ended. Sign in again.");
    return { id: s.user.id, name: s.user.name, email: s.user.email, title: s.user.title || ROLE_LABEL[s.membership?.role as keyof typeof ROLE_LABEL] || "", role: (s.membership?.role as User["role"]) ?? (s.user.isSuperAdmin ? "super_admin" : "recruiter") };
  },
  async getOrganisations() {
    const s = await readSession();
    if (!s) return [];
    const ms = await db.select().from(schema.memberships).where(and(eq(schema.memberships.userId, s.user.id), eq(schema.memberships.status, "active")));
    return Promise.all(ms.map((m) => orgRow(m.organisationId)));
  },
  async getActiveOrganisation() {
    const s = await readSession();
    if (!s?.organisationId) throw new Error("No organisation is selected.");
    return orgRow(s.organisationId);
  },
  async switchOrganisation(id) {
    const s = await readSession();
    if (!s) throw new Error("Your session has ended. Sign in again.");
    const [m] = await db.select().from(schema.memberships).where(and(eq(schema.memberships.userId, s.user.id), eq(schema.memberships.organisationId, id), eq(schema.memberships.status, "active")));
    if (!m) throw new Error("You're not a member of that organisation.");
    await setSessionOrganisation(s.sessionId, id);
    return orgRow(id);
  },
  async signOut() {
    await destroySession();
  },
};

/** Which activity items each person has read. */
const readState = single<Record<string, string[]>>("notification_reads", () => ({}));

export const notificationService: NotificationService = {
  async list() {
    const me = actor();
    const snap = await dashboardService.getSnapshot("30d");
    const read = new Set(readState.get()[me?.userId ?? ""] ?? []);
    const kindOf: Record<string, AppNotification["kind"]> = { application: "application", stage: "system", assessment: "assessment", interview: "interview", offer: "offer", vacancy: "system", ai: "processing" };
    return snap.activity
      .filter((e) => e.actor !== me?.name)
      .slice(0, 15)
      .map((e) => ({ id: e.id, kind: kindOf[e.kind] ?? "system", title: `${e.actor} ${e.text}`, body: e.context, createdAt: e.at, read: read.has(e.id), href: undefined }));
  },
  async markRead(id) {
    const me = actor()?.userId ?? "";
    const all = readState.get();
    readState.set({ ...all, [me]: [...new Set([...(all[me] ?? []), id])].slice(-200) });
  },
  async markAllRead() {
    const me = actor()?.userId ?? "";
    const ids = (await notificationService.list()).map((n) => n.id);
    const all = readState.get();
    readState.set({ ...all, [me]: [...new Set([...(all[me] ?? []), ...ids])].slice(-200) });
  },
};

export const searchService: SearchService = {
  async search(query) {
    void context();
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const cands: SearchResult[] = profileSnapshot()
      .filter((c) => `${c.name} ${c.headline} ${c.email} ${c.skills.map((s) => s.name).join(" ")}`.toLowerCase().includes(q))
      .slice(0, 8)
      .map((c) => ({ id: c.id, type: "candidate", title: c.name, subtitle: `${c.headline} · ${c.location}`, href: `/candidates/${c.id}` }));
    const vacs: SearchResult[] = vacancySnapshot()
      .filter((v) => `${v.title} ${v.department} ${v.location} ${v.reference}`.toLowerCase().includes(q))
      .slice(0, 5)
      .map((v) => ({ id: v.id, type: "vacancy", title: v.title, subtitle: `${v.department} · ${v.location} · ${v.status}`, href: `/vacancies/${v.id}` }));
    return [...cands, ...vacs];
  },
};

export const candidateSummaryService: CandidateService = {
  async listSummaries(): Promise<CandidateSummary[]> {
    return profileSnapshot().map((c) => {
      const a = c.applications[0];
      return { id: c.id, name: c.name, headline: c.headline, location: c.location, appliedFor: a?.vacancyTitle ?? "", stage: a?.stage ?? "applied", matchScore: a?.matchScore ?? 0, provenance: a?.provenance ?? "ai_illustrative", appliedAt: a?.appliedAt ?? "", topSkills: c.skills.slice(0, 3).map((s) => s.name) };
    });
  },
};
