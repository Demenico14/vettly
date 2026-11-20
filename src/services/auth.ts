/**
 * Authentication, onboarding and candidate-access services.
 * Phase 1: mock implementation with simulated latency and the rules documented in src/mocks/auth.ts.
 * Phase 2: replace `mockAuth` with an API client implementing the same interface.
 */
import type {
  CandidateTestAccess,
  OrganisationDraft,
  OrganisationSetup,
  Session,
  TeamInvitation,
} from "@/types";
import { AuthError } from "@/types";
import { users } from "@/mocks/data";
import { MOCK_OTP, invitations } from "@/mocks/auth";
import { candidateProfiles } from "@/mocks/candidates";

export interface AuthService {
  signIn(email: string, password: string, remember: boolean): Promise<Session>;
  signInWithProvider(provider: "google" | "microsoft"): Promise<Session>;
  register(input: { name: string; email: string; password: string }): Promise<{ email: string }>;
  verifyEmail(email: string, code: string): Promise<void>;
  resendCode(email: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  checkResetToken(token: string): Promise<{ email: string }>;
  resetPassword(token: string, password: string): Promise<void>;
  getInvitation(token: string): Promise<TeamInvitation>;
  acceptInvitation(token: string, input: { name: string; password: string }): Promise<Session>;
  checkSlug(slug: string): Promise<boolean>;
  createOrganisation(draft: OrganisationDraft): Promise<{ id: string }>;
  completeSetup(orgId: string, setup: OrganisationSetup): Promise<void>;
}

export interface CandidateAccessService {
  open(token: string): Promise<CandidateTestAccess>;
  sendCode(token: string): Promise<void>;
  verify(token: string, code: string): Promise<void>;
  recordConsent(token: string): Promise<void>;
  /** The test a candidate is about to take: instructions, practice and questions. */
  loadTest(token: string, testId: string): Promise<CandidateTest>;
  /** Saves progress on an untimed test so the candidate can come back. */
  saveProgress(token: string, testId: string, answered: number): Promise<void>;
  /** Submits answers. Returns true when every test in the invitation is finished. */
  submit(token: string, testId: string, answers: Record<string, number>, minutes: number): Promise<boolean>;
}

export interface CandidateTest {
  id: string;
  name: string;
  family: string;
  instructions: string;
  timeLimitMin: number | null;
  extraTimePercent: number;
  calculatorAllowed: boolean;
  itemFormat: string;
  practice: import("@/types/psychometrics").SampleItem[];
  questions: import("@/types/psychometrics").SampleItem[];
  /** Real length, for the "shortened for the prototype" note. */
  fullLength: number;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TAKEN_SLUGS = ["msasa", "matobo", "vettly", "admin", "app"];

function sessionFor(email: string): Session {
  const known = users.find((u) => u.email === email.toLowerCase());
  const user = known ?? {
    id: "usr_new",
    name: email.split("@")[0]!.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    email,
    role: "org_admin" as const,
    title: "HR Manager",
  };
  return { user, organisationId: known ? "org_msasa" : null, needsOnboarding: !known };
}

export const mockAuth: AuthService = {
  async signIn(email, password) {
    await wait(900);
    if (email.toLowerCase() === "locked@msasafinancial.example") {
      throw new AuthError("account_locked", "This account is locked after 5 failed attempts.");
    }
    if (password.toLowerCase().includes("wrong")) {
      throw new AuthError("invalid_credentials", "That email and password don't match.");
    }
    return sessionFor(email);
  },
  async signInWithProvider() {
    await wait(1200);
    return sessionFor(users[0]!.email);
  },
  async register({ email }) {
    await wait(1000);
    if (email.toLowerCase() === "taken@msasafinancial.example") {
      throw new AuthError("email_taken", "An account with this email already exists.");
    }
    return { email };
  },
  async verifyEmail(_email, code) {
    await wait(800);
    if (code !== MOCK_OTP) throw new AuthError("invalid_code", "That code is incorrect.");
  },
  async resendCode() {
    await wait(600);
  },
  async requestPasswordReset() {
    // Always succeeds so the screen never reveals whether an account exists.
    await wait(900);
  },
  async checkResetToken(token) {
    await wait(500);
    if (token === "expired-reset") throw new AuthError("token_expired", "This reset link has expired.");
    if (token !== "valid-reset") throw new AuthError("token_invalid", "This reset link is not valid.");
    return { email: "tendai.moyo@msasafinancial.example" };
  },
  async resetPassword() {
    await wait(900);
  },
  async getInvitation(token) {
    await wait(500);
    const inv = invitations.find((i) => i.token === token);
    if (!inv) throw new AuthError("token_invalid", "This invitation link is not valid.");
    return inv;
  },
  async acceptInvitation(token) {
    await wait(1000);
    const inv = invitations.find((i) => i.token === token);
    if (!inv || inv.status !== "pending") throw new AuthError("token_expired", "This invitation can no longer be used.");
    return sessionFor(inv.email);
  },
  async checkSlug(slug) {
    await wait(350);
    return !TAKEN_SLUGS.includes(slug);
  },
  async createOrganisation() {
    await wait(1100);
    return { id: "org_new" };
  },
  async completeSetup() {
    await wait(1200);
  },
};

const FAMILY_TYPE: Record<string, CandidateTestAccess["tests"][number]["type"]> = {
  personality: "personality",
  sjt: "situational_judgement",
  integrity: "integrity",
  emotional_intelligence: "personality",
  motivation: "personality",
};

/** The candidate's view of an invitation, from the shared assessments store. */
async function accessFor(token: string): Promise<CandidateTestAccess> {
  const { runFor, recordOpen } = await import("./assessments");
  const run = runFor(token);
  if (!run) throw new AuthError("token_invalid", "This test link is not valid.");
  const r = run.record;
  if (r.status === "sent" || r.status === "opened") recordOpen(r);
  const extra = Math.max(0, ...r.accommodations.map((a) => a.extraTimePercent ?? 0));
  const [local, domain] = (profileEmail(r.candidateId) ?? "candidate@example.com").split("@");
  return {
    token,
    status: r.status === "completed" ? "completed" : r.status === "expired" ? "expired" : r.status === "cancelled" ? "cancelled" : r.status === "in_progress" ? "in_progress" : "ready",
    candidateName: r.candidateName,
    candidateEmailMasked: `${local!.charAt(0)}•••••@${domain}`,
    organisationName: run.organisationName,
    organisationColour: run.organisationColour,
    vacancyTitle: r.vacancyTitle,
    deadline: r.deadline,
    tests: run.tests.map((t) => ({
      id: t.id,
      done: r.results.some((x) => x.testId === t.id),
      saved: r.progress?.[t.id],
      name: t.name.replace(/ · .*$/, ""),
      type: t.id.includes("num") ? "numerical" : t.id.includes("verb") ? "verbal" : FAMILY_TYPE[t.family] ?? "cognitive",
      minutes: t.timeLimitMin ?? t.medianCompletionMin,
      timed: t.timeLimitMin !== null,
    })),
    extraTimePercent: extra,
    consented: !!r.consent,
  };
}

function profileEmail(candidateId: string) {
  return candidateProfiles.find((c) => c.id === candidateId)?.email ?? null;
}

export const mockCandidateAccess: CandidateAccessService = {
  async open(token) {
    await wait(600);
    return accessFor(token);
  },
  async sendCode() {
    await wait(700);
  },
  async verify(_token, code) {
    await wait(800);
    if (code !== MOCK_OTP) throw new AuthError("invalid_code", "That code is incorrect.");
  },
  async recordConsent(token) {
    await wait(500);
    const { runFor, recordConsent } = await import("./assessments");
    const run = runFor(token);
    if (run && !run.record.consent) recordConsent(run.record);
  },
  async loadTest(token, testId) {
    await wait(400);
    const { runFor } = await import("./assessments");
    const run = runFor(token);
    const t = run?.tests.find((x) => x.id === testId);
    if (!run || !t) throw new AuthError("token_invalid", "This test isn't part of your invitation.");
    const { sampleItems, tests } = await import("@/mocks/psychometrics");
    const own = run.items[testId] ?? [];
    // The prototype holds only a few sample items per test, so borrow from sibling tests (same name, then same family and format).
    const siblings = tests.filter((x) => x.id !== t.id && (x.shortName === t.shortName || (x.family === t.family && x.itemFormat === t.itemFormat)));
    const borrowed = sampleItems.filter((i) => siblings.some((x) => x.id === i.testId) && (i.answer !== undefined || i.keyed || i.effectiveness));
    const items = [...own, ...borrowed].slice(0, 6);
    const practice = items.filter((i) => i.practice && i.answer !== undefined).slice(0, Math.max(1, Math.min(2, t.practiceItems)));
    const rest = items.filter((i) => !practice.includes(i));
    const questions = rest.length ? rest : items;
    return {
      id: t.id,
      name: t.name.replace(/ · .*$/, ""),
      family: t.family,
      instructions: t.candidateDescription,
      timeLimitMin: t.timeLimitMin,
      extraTimePercent: Math.max(0, ...run.record.accommodations.map((a) => a.extraTimePercent ?? 0)),
      calculatorAllowed: t.calculatorAllowed,
      itemFormat: t.itemFormat,
      practice: t.timeLimitMin ? practice : [],
      questions: t.timeLimitMin ? questions : items,
      fullLength: t.items,
    };
  },
  async saveProgress(token, testId, answered) {
    await wait(300);
    const { runFor, saveProgress } = await import("./assessments");
    const run = runFor(token);
    if (run) saveProgress(run.record, testId, answered);
  },
  async submit(token, testId, answers, minutes) {
    await wait(900);
    const { runFor, submitTest } = await import("./assessments");
    const run = runFor(token);
    if (!run) throw new AuthError("token_invalid", "This test link is not valid.");
    if (run.record.status === "expired" || run.record.status === "cancelled") throw new AuthError("token_expired", "This invitation has closed.");
    const device = typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop";
    return submitTest(run.record, testId, answers, minutes, device);
  },
};
