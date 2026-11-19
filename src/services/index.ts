/**
 * Frontend service layer. UI talks to these interfaces only.
 * Phase 1 binds them to in-memory mock implementations; Phase 2 swaps in API clients
 * with the same signatures, so components do not change.
 */
import type { AppNotification, CandidateSummary, Organisation, User } from "@/types";
import * as mock from "@/mocks/data";
import { mockAuth, mockCandidateAccess } from "./auth";
import { mockDashboard } from "./dashboard";
import { mockVacancies } from "./vacancies";
import { mockCandidateProfiles } from "./candidates";

export type { CandidateProfileService } from "./candidates";

export type { VacancyService, AssistAction } from "./vacancies";
export { STATUS_MOVES, emptyDraft, toDraft } from "./vacancies";

export type { DashboardService, DashboardScenario } from "./dashboard";

export type { AuthService, CandidateAccessService } from "./auth";

export interface SessionService {
  getCurrentUser(): Promise<User>;
  getOrganisations(): Promise<Organisation[]>;
  getActiveOrganisation(): Promise<Organisation>;
  switchOrganisation(id: string): Promise<Organisation>;
  signOut(): Promise<void>;
}

export interface NotificationService {
  list(): Promise<AppNotification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
}

export interface SearchResult {
  id: string;
  type: "candidate" | "vacancy";
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchService {
  search(query: string): Promise<SearchResult[]>;
}

export interface CandidateService {
  listSummaries(): Promise<CandidateSummary[]>;
}

/* ---------- Mock implementations ---------- */

const latency = (ms = 250) => new Promise((r) => setTimeout(r, ms));

let activeOrgId = mock.organisations[0]!.id;
const notificationState = mock.notifications.map((n) => ({ ...n }));

const mockSession: SessionService = {
  async getCurrentUser() {
    await latency(120);
    return mock.users[0]!;
  },
  async getOrganisations() {
    await latency(120);
    return mock.organisations;
  },
  async getActiveOrganisation() {
    await latency(80);
    return mock.organisations.find((o) => o.id === activeOrgId)!;
  },
  async switchOrganisation(id) {
    await latency(400);
    const org = mock.organisations.find((o) => o.id === id);
    if (!org) throw new Error("Organisation not found");
    activeOrgId = id;
    return org;
  },
  async signOut() {
    await latency(500);
  },
};

const mockNotifications: NotificationService = {
  async list() {
    await latency(300);
    return notificationState.map((n) => ({ ...n }));
  },
  async markRead(id) {
    const n = notificationState.find((x) => x.id === id);
    if (n) n.read = true;
  },
  async markAllRead() {
    notificationState.forEach((n) => (n.read = true));
  },
};

const mockSearch: SearchService = {
  async search(query) {
    await latency(150);
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const cands: SearchResult[] = mock.candidates
      .filter((c) => `${c.name} ${c.headline} ${c.topSkills.join(" ")}`.toLowerCase().includes(q))
      .map((c) => ({
        id: c.id,
        type: "candidate",
        title: c.name,
        subtitle: `${c.headline} · ${c.location}`,
        href: `/candidates/${c.id}`,
      }));
    const vacs: SearchResult[] = mock.vacancies
      .filter((v) => v.title.toLowerCase().includes(q))
      .map((v) => ({ id: v.id, type: "vacancy", title: v.title, subtitle: v.location, href: `/vacancies/${v.id}` }));
    return [...vacs, ...cands].slice(0, 8);
  },
};

const mockCandidates: CandidateService = {
  async listSummaries() {
    await latency(700);
    return mock.candidates.map((c) => ({ ...c }));
  },
};

export const services = {
  auth: mockAuth,
  dashboard: mockDashboard,
  vacancies: mockVacancies,
  profiles: mockCandidateProfiles,
  candidateAccess: mockCandidateAccess,
  session: mockSession,
  notifications: mockNotifications,
  search: mockSearch,
  candidates: mockCandidates,
};

export { MOCK_NOW } from "@/mocks/data";
