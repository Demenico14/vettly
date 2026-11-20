/**
 * The candidate's own test link. A candidate proves it's them with a code sent to their email; after that a
 * signed cookie for this invitation lets them take the tests. Candidates never get an account.
 */
import "server-only";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import type { CandidateAccessService } from "@/services/contracts";
import type { CandidateTestAccess } from "@/types";
import { AuthError } from "@/types";
import { sampleItems, tests } from "@/mocks/psychometrics";
import { db, ready, schema, sql } from "../db";
import { sha256, sixDigits } from "../crypto";
import { sendMail } from "../mail";
import { withOrg } from "../store";
import { profileSnapshot } from "./candidates";
import { recordConsent, recordOpen, runFor, saveProgress, submitTest } from "./assessments";

const FAMILY_TYPE: Record<string, CandidateTestAccess["tests"][number]["type"]> = {
  personality: "personality",
  sjt: "situational_judgement",
  integrity: "integrity",
  emotional_intelligence: "personality",
  motivation: "personality",
};

const cookieName = (token: string) => `vettly_c_${sha256(token).slice(0, 16)}`;

/** Which organisation an invitation token belongs to. */
async function orgOf(token: string) {
  await ready();
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) throw new AuthError("token_invalid", "This test link is not valid.");
  const [row] = await sql<{ organisation_id: string }[]>`select organisation_id from records where kind = 'invitation' and data->>'token' = ${token} limit 1`;
  if (!row) throw new AuthError("token_invalid", "This test link is not valid.");
  return row.organisation_id;
}

async function verified(token: string) {
  const jar = await cookies();
  return jar.get(cookieName(token))?.value === sha256(`ok:${token}:${process.env.SESSION_SECRET ?? "vettly"}`);
}

async function requireVerified(token: string) {
  if (!(await verified(token))) throw new AuthError("token_invalid", "Confirm it's you first: enter the code we emailed you.");
}

function emailOf(candidateId: string) {
  return profileSnapshot().find((c) => c.id === candidateId)?.email ?? "";
}

export const candidateAccessService: CandidateAccessService = {
  async open(token) {
    const org = await orgOf(token);
    return withOrg(org, null, () => {
      const run = runFor(token);
      if (!run) throw new AuthError("token_invalid", "This test link is not valid.");
      const r = run.record;
      if (r.status === "sent" || r.status === "opened") recordOpen(r);
      const extra = Math.max(0, ...r.accommodations.map((a) => a.extraTimePercent ?? 0));
      const [local = "", domain = ""] = emailOf(r.candidateId).split("@");
      return {
        token,
        status: r.status === "completed" ? "completed" : r.status === "expired" ? "expired" : r.status === "cancelled" ? "cancelled" : r.status === "in_progress" ? "in_progress" : "ready",
        candidateName: r.candidateName,
        candidateEmailMasked: local ? `${local.charAt(0)}•••••@${domain}` : "your email",
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
      } satisfies CandidateTestAccess;
    });
  },

  async sendCode(token) {
    const org = await orgOf(token);
    const { email, name } = await withOrg(org, null, () => {
      const run = runFor(token);
      return { email: run ? emailOf(run.record.candidateId) : "", name: run?.record.candidateName ?? "" };
    });
    if (!email) throw new AuthError("token_invalid", "There's no email address for this invitation. Contact the organisation that sent it.");
    const code = sixDigits();
    const id = sha256(`candidate_code:${token}`);
    await db.delete(schema.tokens).where(eq(schema.tokens.id, id));
    await db.insert(schema.tokens).values({ id, purpose: "candidate_code", email, organisationId: org, codeHash: sha256(code), expiresAt: new Date(Date.now() + 15 * 60_000) });
    await sendMail(email, `${code} is your code for your tests`, `Hello ${name.split(" ")[0]},\n\nYour code to start your tests is ${code}. It expires in 15 minutes.\n\nIf you didn't ask for it, ignore this email.`);
  },

  async verify(token, code) {
    await orgOf(token);
    const id = sha256(`candidate_code:${token}`);
    const [t] = await db.select().from(schema.tokens).where(and(eq(schema.tokens.id, id), eq(schema.tokens.purpose, "candidate_code")));
    if (!t || t.usedAt) throw new AuthError("invalid_code", "That code is incorrect. Ask for a new one.");
    if (t.expiresAt < new Date() || t.attempts >= 5) throw new AuthError("code_expired", "That code has expired. Ask for a new one.");
    if (t.codeHash !== sha256(code.trim())) {
      await db.update(schema.tokens).set({ attempts: t.attempts + 1 }).where(eq(schema.tokens.id, id));
      throw new AuthError("invalid_code", "That code is incorrect.");
    }
    await db.update(schema.tokens).set({ usedAt: new Date() }).where(eq(schema.tokens.id, id));
    const jar = await cookies();
    jar.set(cookieName(token), sha256(`ok:${token}:${process.env.SESSION_SECRET ?? "vettly"}`), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 14, secure: process.env.NODE_ENV === "production" && (process.env.APP_URL ?? "").startsWith("https:") });
  },

  async recordConsent(token) {
    await requireVerified(token);
    const org = await orgOf(token);
    await withOrg(org, null, () => {
      const run = runFor(token);
      if (run && !run.record.consent) recordConsent(run.record);
    });
  },

  async loadTest(token, testId) {
    await requireVerified(token);
    const org = await orgOf(token);
    return withOrg(org, null, () => {
      const run = runFor(token);
      const t = run?.tests.find((x) => x.id === testId);
      if (!run || !t) throw new AuthError("token_invalid", "This test isn't part of your invitation.");
      if (!run.record.consent) throw new AuthError("token_invalid", "Agree to how your results are used before starting.");
      const own = run.items[testId] ?? [];
      // The item bank holds a short form of each test, topped up from sibling tests of the same kind.
      const siblings = tests.filter((x) => x.id !== t.id && (x.shortName === t.shortName || (x.family === t.family && x.itemFormat === t.itemFormat)));
      const borrowed = sampleItems.filter((i) => siblings.some((x) => x.id === i.testId) && (i.answer !== undefined || i.keyed || i.effectiveness));
      const items = [...own, ...borrowed].slice(0, 6);
      const practice = items.filter((i) => i.practice && i.answer !== undefined).slice(0, Math.max(1, Math.min(2, t.practiceItems)));
      const rest = items.filter((i) => !practice.includes(i));
      const questions = rest.length ? rest : items;
      // Answer keys never leave the server.
      // Scored questions also lose the explanation, the scoring direction and the effectiveness key.
      const strip = <T extends { answer?: unknown }>(i: T) => ({ ...i, answer: undefined, explanation: undefined, keyed: undefined, effectiveness: undefined });
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
        questions: (t.timeLimitMin ? questions : items).map(strip),
        fullLength: t.items,
      };
    });
  },

  async saveProgress(token, testId, answered) {
    await requireVerified(token);
    const org = await orgOf(token);
    await withOrg(org, null, () => {
      const run = runFor(token);
      if (run) saveProgress(run.record, testId, answered);
    });
  },

  async submit(token, testId, answers, minutes) {
    await requireVerified(token);
    const org = await orgOf(token);
    return withOrg(org, null, () => {
      const run = runFor(token);
      if (!run) throw new AuthError("token_invalid", "This test link is not valid.");
      if (run.record.status === "expired" || run.record.status === "cancelled") throw new AuthError("token_expired", "This invitation has closed.");
      if (!run.tests.some((t) => t.id === testId)) throw new AuthError("token_invalid", "This test isn't part of your invitation.");
      if (run.record.results.some((r) => r.testId === testId)) throw new AuthError("token_expired", "You've already finished this test.");
      return submitTest(run.record, testId, answers, Math.max(1, Math.min(240, Math.round(minutes))), "desktop");
    });
  },
};
