import "server-only";
import { passwordProblem } from "@/lib/passwords";
import { ROLE_LABEL } from "@/lib/settings-defaults";
import { and, desc, eq, isNull, lt } from "drizzle-orm";
import type { AuthService } from "@/services/contracts";
import type { OrganisationSize, Role, Session, TeamInvitation, User } from "@/types";
import { AuthError } from "@/types";
import { db, ready, schema } from "../db";
import { hashPassword, randomToken, sha256, sixDigits, verifyPassword } from "../crypto";
import { appUrl, sendMail } from "../mail";
import { createSession, readSession, setSessionOrganisation } from "../session";
import { newId } from "../context";
import { withOrg } from "../store";
import { applySetup, initialiseSettings } from "./settings";

const MINUTE = 60_000;
const SIZE_LABEL: Record<OrganisationSize, string> = { "1-50": "1–50 employees", "51-200": "51–200 employees", "201-1000": "201–500 employees", "1000+": "Over 2,000 employees" };
const superAdmins = () => (process.env.VETTLY_SUPER_ADMINS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const norm = (email: string) => email.trim().toLowerCase();

function toUser(u: typeof schema.users.$inferSelect, role: Role): User {
  return { id: u.id, name: u.name, email: u.email, role, title: u.title || (role === "super_admin" ? "Vettly staff" : ROLE_LABEL[role as keyof typeof ROLE_LABEL]) || "" };
}

async function sessionPayload(u: typeof schema.users.$inferSelect): Promise<Session> {
  const [m] = await db
    .select()
    .from(schema.memberships)
    .where(and(eq(schema.memberships.userId, u.id), eq(schema.memberships.status, "active")))
    .orderBy(desc(schema.memberships.createdAt));
  const [org] = m ? await db.select().from(schema.organisations).where(eq(schema.organisations.id, m.organisationId)) : [];
  const role = (m?.role as Role) ?? (u.isSuperAdmin ? "super_admin" : "org_admin");
  return { user: toUser(u, role), organisationId: m?.organisationId ?? null, needsOnboarding: !u.isSuperAdmin && (!m || (org ? !org.setupComplete && m.role === "org_admin" : true)) };
}

async function issueCode(email: string, purpose: "verify_email") {
  const code = sixDigits();
  await db.delete(schema.tokens).where(and(eq(schema.tokens.email, email), eq(schema.tokens.purpose, purpose)));
  await db.insert(schema.tokens).values({ id: sha256(`${purpose}:${email}`), purpose, email, codeHash: sha256(code), expiresAt: new Date(Date.now() + 15 * MINUTE) });
  await sendMail(email, `${code} is your Vettly code`, `Your Vettly verification code is ${code}.\n\nIt expires in 15 minutes. If you didn't ask for it, you can ignore this email.`);
}

async function checkCode(email: string, purpose: string, code: string) {
  const [t] = await db.select().from(schema.tokens).where(eq(schema.tokens.id, sha256(`${purpose}:${email}`)));
  if (!t || t.usedAt) throw new AuthError("invalid_code", "That code is incorrect. Ask for a new one.");
  if (t.expiresAt < new Date()) throw new AuthError("code_expired", "That code has expired. Ask for a new one.");
  if (t.attempts >= 5) throw new AuthError("code_expired", "Too many attempts. Ask for a new code.");
  if (t.codeHash !== sha256(code.trim())) {
    await db.update(schema.tokens).set({ attempts: t.attempts + 1 }).where(eq(schema.tokens.id, t.id));
    throw new AuthError("invalid_code", "That code is incorrect.");
  }
  await db.update(schema.tokens).set({ usedAt: new Date() }).where(eq(schema.tokens.id, t.id));
}

async function findInvite(token: string) {
  const [t] = await db.select().from(schema.tokens).where(and(eq(schema.tokens.id, sha256(token)), eq(schema.tokens.purpose, "invite")));
  if (!t) throw new AuthError("token_invalid", "This invitation link is not valid.");
  return t;
}

export const authService: AuthService = {
  async signIn(email, password, remember) {
    await ready();
    const [u] = await db.select().from(schema.users).where(eq(schema.users.email, norm(email)));
    // A lock set by Vettly staff; only they can lift it.
    if (u?.locked) throw new AuthError("account_locked", "This account is locked. Contact Vettly support.");
    // Throttling, not a hard lock, so nobody can lock someone else out by guessing wrong on purpose.
    if (u?.signInPausedUntil && u.signInPausedUntil > new Date()) {
      const minutes = Math.ceil((u.signInPausedUntil.getTime() - Date.now()) / 60_000);
      throw new AuthError("account_locked", `Too many failed attempts. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}, or reset your password.`);
    }
    if (!u || !(await verifyPassword(password, u.passwordHash))) {
      if (u) {
        const failed = u.failedSignIns + 1;
        // From the 5th failure: 15 minutes, doubling each time, at most a day.
        const pause = failed >= 5 ? new Date(Date.now() + Math.min(24 * 60, 15 * 2 ** (failed - 5)) * MINUTE) : null;
        await db.update(schema.users).set({ failedSignIns: failed, signInPausedUntil: pause }).where(eq(schema.users.id, u.id));
        console.warn(JSON.stringify({ event: "sign_in_failed", at: new Date().toISOString(), user: u.id, failed, paused: !!pause }));
      }
      throw new AuthError("invalid_credentials", "That email and password don't match.");
    }
    if (!u.emailVerifiedAt) {
      await issueCode(u.email, "verify_email");
      throw new AuthError("email_unverified", "Confirm your email first. We've sent you a new code.");
    }
    // The environment list is the source of truth: removing someone from it removes their access at next sign-in.
    const superAdmin = superAdmins().includes(u.email);
    await db.update(schema.users).set({ failedSignIns: 0, signInPausedUntil: null, lastSignInAt: new Date(), isSuperAdmin: superAdmin }).where(eq(schema.users.id, u.id));
    const session = await sessionPayload({ ...u, isSuperAdmin: superAdmin });
    await createSession(u.id, session.organisationId, remember);
    return session;
  },

  async signInWithProvider() {
    throw new AuthError("unavailable", "Single sign-on isn't set up for this installation yet. Sign in with your email and password.");
  },

  async register({ name, email, password }) {
    await ready();
    const e = norm(email);
    const weak = passwordProblem(password, [e, name]);
    if (weak) throw new AuthError("invalid_credentials", weak);
    const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, e));
    if (existing?.emailVerifiedAt) throw new AuthError("email_taken", "An account with this email already exists. Sign in instead.");
    const passwordHash = await hashPassword(password);
    if (existing) await db.update(schema.users).set({ name: name.trim(), passwordHash }).where(eq(schema.users.id, existing.id));
    else await db.insert(schema.users).values({ id: newId("usr"), email: e, name: name.trim(), passwordHash, isSuperAdmin: superAdmins().includes(e) });
    await issueCode(e, "verify_email");
    return { email: e };
  },

  async verifyEmail(email, code) {
    await ready();
    const e = norm(email);
    await checkCode(e, "verify_email", code);
    const [u] = await db.update(schema.users).set({ emailVerifiedAt: new Date() }).where(eq(schema.users.email, e)).returning();
    if (u) await createSession(u.id, null, true);
  },

  async resendCode(email) {
    await ready();
    const e = norm(email);
    const [u] = await db.select().from(schema.users).where(eq(schema.users.email, e));
    if (u && !u.emailVerifiedAt) await issueCode(e, "verify_email");
  },

  async requestPasswordReset(email) {
    await ready();
    const e = norm(email);
    const [u] = await db.select().from(schema.users).where(eq(schema.users.email, e));
    // Same response either way, so the screen never reveals whether an account exists.
    if (!u) return;
    const token = randomToken();
    await db.insert(schema.tokens).values({ id: sha256(token), purpose: "reset", email: e, ref: u.id, expiresAt: new Date(Date.now() + 60 * MINUTE) });
    await sendMail(e, "Reset your Vettly password", `Someone asked to reset the password for ${e}.\n\nReset it here (the link works for one hour):\n${appUrl()}/reset-password?token=${token}\n\nIf it wasn't you, ignore this email; your password stays the same.`);
  },

  async checkResetToken(token) {
    await ready();
    const [t] = await db.select().from(schema.tokens).where(and(eq(schema.tokens.id, sha256(token)), eq(schema.tokens.purpose, "reset")));
    if (!t || t.usedAt) throw new AuthError("token_invalid", "This reset link is not valid.");
    if (t.expiresAt < new Date()) throw new AuthError("token_expired", "This reset link has expired.");
    return { email: t.email };
  },

  async resetPassword(token, password) {
    const { email } = await authService.checkResetToken(token);
    const weak = passwordProblem(password, [email]);
    if (weak) throw new AuthError("invalid_credentials", weak);
    // Clears the failed-attempt pause, but never a lock set by Vettly staff.
    await db.update(schema.users).set({ passwordHash: await hashPassword(password), failedSignIns: 0, signInPausedUntil: null, emailVerifiedAt: new Date() }).where(eq(schema.users.email, email));
    // Every other reset link for this account stops working too.
    await db.update(schema.tokens).set({ usedAt: new Date() }).where(and(eq(schema.tokens.email, email), eq(schema.tokens.purpose, "reset"), isNull(schema.tokens.usedAt)));
    await db.update(schema.tokens).set({ usedAt: new Date() }).where(eq(schema.tokens.id, sha256(token)));
    const [u] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    if (u) await db.delete(schema.sessions).where(eq(schema.sessions.userId, u.id));
  },

  async getInvitation(token): Promise<TeamInvitation> {
    await ready();
    const t = await findInvite(token);
    const d = (t.data ?? {}) as { role: Role; invitedBy: string; invitedByTitle: string };
    const [org] = await db.select().from(schema.organisations).where(eq(schema.organisations.id, t.organisationId!));
    return {
      token,
      organisationName: org?.name ?? "Your organisation",
      organisationCity: org?.city ?? "",
      invitedBy: d.invitedBy,
      invitedByTitle: d.invitedByTitle,
      email: t.email,
      role: d.role,
      expiresAt: t.expiresAt.toISOString(),
      status: t.usedAt ? "accepted" : t.expiresAt < new Date() ? "expired" : "pending",
    };
  },

  async acceptInvitation(token, { name, password }) {
    const inv = await authService.getInvitation(token);
    if (inv.status !== "pending") throw new AuthError("token_expired", "This invitation can no longer be used. Ask for a new one.");
    const weak = passwordProblem(password, [inv.email, name]);
    if (weak) throw new AuthError("invalid_credentials", weak);
    const t = await findInvite(token);
    const passwordHash = await hashPassword(password);
    const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, inv.email));
    const userId = existing?.id ?? newId("usr");
    if (existing) await db.update(schema.users).set({ name: name.trim() || existing.name, passwordHash, emailVerifiedAt: new Date() }).where(eq(schema.users.id, userId));
    else await db.insert(schema.users).values({ id: userId, email: inv.email, name: name.trim(), passwordHash, emailVerifiedAt: new Date() });
    await db
      .update(schema.memberships)
      .set({ userId, status: "active" })
      .where(and(eq(schema.memberships.organisationId, t.organisationId!), eq(schema.memberships.userId, t.ref!)));
    await db.update(schema.tokens).set({ usedAt: new Date() }).where(eq(schema.tokens.id, t.id));
    await createSession(userId, t.organisationId, true);
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
    return { user: toUser(u!, inv.role), organisationId: t.organisationId, needsOnboarding: false };
  },

  async checkSlug(slug) {
    await ready();
    const s = slug.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(s) || ["admin", "app", "api", "www", "vettly"].includes(s)) return false;
    const [o] = await db.select({ id: schema.organisations.id }).from(schema.organisations).where(eq(schema.organisations.slug, s));
    return !o;
  },

  async createOrganisation(draft) {
    const s = await readSession();
    if (!s) throw new AuthError("token_invalid", "Your session has ended. Sign in again.");
    if (!(await authService.checkSlug(draft.slug))) throw new AuthError("email_taken", "That web address is taken. Choose another.");
    const id = newId("org");
    const name = draft.name.trim();
    await db.insert(schema.organisations).values({
      id,
      name,
      shortName: name.replace(/\s+(Group|Holdings|Limited|Ltd|\(Private\) Limited|Pvt Ltd)$/i, ""),
      slug: draft.slug.trim().toLowerCase(),
      industry: draft.industry,
      city: draft.city,
      country: draft.country,
      size: SIZE_LABEL[draft.size] ?? draft.size,
      status: "trial",
      trialEndsAt: new Date(Date.now() + 30 * 86_400_000),
    });
    await db.insert(schema.memberships).values({ userId: s.user.id, organisationId: id, role: "org_admin" });
    await setSessionOrganisation(s.sessionId, id);
    await withOrg(id, null, () => initialiseSettings({ name, city: draft.city, country: draft.country, industry: draft.industry, size: SIZE_LABEL[draft.size] ?? draft.size }));
    return { id };
  },

  async completeSetup(_orgId, setup) {
    const s = await readSession();
    if (!s?.organisationId) throw new AuthError("token_invalid", "Your session has ended. Sign in again.");
    const orgId = s.organisationId;
    const actor = { userId: s.user.id, name: s.user.name, email: s.user.email, title: s.user.title, role: "org_admin" as const, isSuperAdmin: s.user.isSuperAdmin };
    await withOrg(orgId, actor, () => applySetup(setup));
    for (const inv of setup.invites.filter((i) => i.email.trim())) {
      const { inviteMember } = await import("./settings");
      await withOrg(orgId, actor, () => inviteMember({ name: "", email: inv.email, role: inv.role as never, department: "" })).catch(() => undefined);
    }
    await db.update(schema.organisations).set({ setupComplete: true }).where(eq(schema.organisations.id, orgId));
  },
};

/** Removes expired, unused tokens. Safe to run any time. */
export async function pruneTokens() {
  await db.delete(schema.tokens).where(and(isNull(schema.tokens.usedAt), lt(schema.tokens.expiresAt, new Date())));
}
