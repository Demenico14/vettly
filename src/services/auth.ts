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
import { MOCK_OTP, candidateTestLinks, invitations } from "@/mocks/auth";

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

export const mockCandidateAccess: CandidateAccessService = {
  async open(token) {
    await wait(600);
    const link = candidateTestLinks.find((l) => l.token === token);
    if (!link) throw new AuthError("token_invalid", "This test link is not valid.");
    return { ...link };
  },
  async sendCode() {
    await wait(700);
  },
  async verify(_token, code) {
    await wait(800);
    if (code !== MOCK_OTP) throw new AuthError("invalid_code", "That code is incorrect.");
  },
  async recordConsent() {
    await wait(500);
  },
};
