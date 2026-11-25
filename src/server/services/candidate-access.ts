/**
 * The candidate's own test link. A candidate proves it's them with a code sent to their email; after that a
 * signed cookie for this invitation lets them take the tests. Candidates never get an account.
 */
import "server-only";
import { currentLetterhead, sendBranded } from "../org-mail";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import type { CandidateAccessService } from "@/services/contracts";
import type { CandidateTestAccess } from "@/types";
import type { TestIntegrity } from "@/types/psychometrics";
import { AuthError } from "@/types";
import { sampleItems, tests } from "@/mocks/psychometrics";
import { db, ready, schema, sql } from "../db";
import { sha256, sixDigits } from "../crypto";
import { withOrg } from "../store";
import { profileSnapshot } from "./candidates";
import { recordConsent, recordOpen, runFor, saveProgress, submitTest } from "./assessments";
import { MAX_PIECE_BYTES, MAX_RECORDING_BYTES, RECORDING_TYPES, candidateRecordingView, ensureRecording, recordingGate, recordingKey } from "./recordings";
import { deleteObject, putObject } from "../storage";

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
  // A narrow database function: the app's own role can't read across organisations.
  const [row] = await sql<{ org: string | null }[]>`select vettly_invitation_org(${token}) as org`;
  if (!row?.org) throw new AuthError("token_invalid", "This test link is not valid.");
  return row.org;
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

/** A whole number from 0 to `max`, whatever the browser sent: the browser is never trusted. */
function count(v: unknown, max = 10_000) {
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : 0;
}

function cleanIntegrity(v: unknown): TestIntegrity | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  return {
    leftWindow: count(o.leftWindow),
    awaySeconds: count(o.awaySeconds, 24 * 3600),
    pasteBlocked: count(o.pasteBlocked),
    copyBlocked: count(o.copyBlocked),
    shortcutsBlocked: count(o.shortcutsBlocked),
    contextMenuBlocked: count(o.contextMenuBlocked),
    cameraOff: count(o.cameraOff),
  };
}

export const candidateAccessService: CandidateAccessService = {
  async open(token) {
    const org = await orgOf(token);
    return withOrg(org, null, () => {
      const run = runFor(token);
      if (!run) throw new AuthError("token_invalid", "This test link is not valid.");
      const r = run.record;
      if (r.status === "sent" || r.status === "opened") recordOpen(r);
      ensureRecording(r);
      const extra = Math.max(0, ...r.accommodations.map((a) => a.extraTimePercent ?? 0));
      const [local = "", domain = ""] = emailOf(r.candidateId).split("@");
      return {
        token,
        status: r.status === "completed" ? "completed" : r.status === "expired" ? "expired" : r.status === "cancelled" ? "cancelled" : r.status === "in_progress" ? "in_progress" : "ready",
        candidateName: r.candidateName,
        candidateEmailMasked: local ? `${local.charAt(0)}•••••@${domain}` : "your email",
        organisationName: run.organisationName,
        organisationColour: run.organisationColour,
        organisationLogoUrl: run.organisationLogoUrl,
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
        recording: candidateRecordingView(r),
      } satisfies CandidateTestAccess;
    });
  },

  async sendCode(token) {
    const org = await orgOf(token);
    const { email, name, head } = await withOrg(org, null, () => {
      const run = runFor(token);
      return { email: run ? emailOf(run.record.candidateId) : "", name: run?.record.candidateName ?? "", head: currentLetterhead() };
    });
    if (!email) throw new AuthError("token_invalid", "There's no email address for this invitation. Contact the organisation that sent it.");
    const code = sixDigits();
    const id = sha256(`candidate_code:${token}`);
    await db.delete(schema.tokens).where(eq(schema.tokens.id, id));
    await db.insert(schema.tokens).values({ id, purpose: "candidate_code", email, organisationId: org, codeHash: sha256(code), expiresAt: new Date(Date.now() + 15 * 60_000) });
    await sendBranded(head, { to: email, subject: `${code} is your code for your tests`, text: `Hello ${name.split(" ")[0]},\n\nYour code to start your tests is ${code}. It expires in 15 minutes.\n\nIf you didn't ask for it, ignore this email.` });
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
      const gate = recordingGate(run.record);
      if (gate === "choose") throw new AuthError("token_invalid", "Choose whether you agree to be recorded before starting.");
      if (gate === "declined") throw new AuthError("token_invalid", `You chose not to be recorded. ${run.organisationName} will be in touch about another way to take this test.`);
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
        recording: gate === "record" && run.record.recording ? { mode: run.record.recording.mode, audio: run.record.recording.audio } : null,
      };
    });
  },

  async recordingChoice(token, agree) {
    await requireVerified(token);
    const org = await orgOf(token);
    await withOrg(org, null, () => {
      const run = runFor(token);
      if (!run) throw new AuthError("token_invalid", "This test link is not valid.");
      const r = run.record;
      ensureRecording(r);
      const rec = r.recording;
      if (!rec || rec.deleted) return;
      // A candidate can change their mind towards agreeing; declining stays possible until they've been recorded.
      if (agree === true) {
        rec.choice = "agreed";
        rec.choiceAt = new Date().toISOString();
        r.audit.push({ at: rec.choiceAt, by: r.candidateName, action: "recording", detail: `Agreed in writing to ${rec.mode === "photos" ? "photos every 20 seconds" : rec.audio ? "video with sound" : "video without sound"} during the tests` });
      } else if (rec.pieces.length === 0) {
        rec.choice = "declined";
        rec.choiceAt = new Date().toISOString();
        r.audit.push({ at: rec.choiceAt, by: r.candidateName, action: "recording", detail: "Declined recording. Let them take the tests without it, or arrange a supervised session." });
      }
    });
  },

  async uploadRecording(token, testId, seq, mime, data) {
    await requireVerified(token);
    const org = await orgOf(token);
    if (typeof testId !== "string" || typeof mime !== "string" || typeof data !== "string") throw new TypeError("Bad recording piece.");
    if (!Number.isInteger(seq) || seq < 0 || seq > 20_000) throw new TypeError("Bad recording piece number.");
    const type = mime.split(";")[0]!.trim().toLowerCase();
    const allowed = RECORDING_TYPES[type];
    if (!allowed) throw new Error("This kind of recording isn't accepted.");
    const bytes = new Uint8Array(Buffer.from(data, "base64"));
    if (bytes.byteLength === 0) return;
    if (bytes.byteLength > MAX_PIECE_BYTES) throw new Error("That piece of the recording is too large.");
    // Photos each start a new file; video continues one stream, so only its first piece carries the header.
    if ((type === "image/jpeg" || seq === 0) && allowed.first && !allowed.first(bytes)) throw new Error("That piece of the recording isn't a valid file.");

    const key = await withOrg(org, null, () => {
      const run = runFor(token);
      if (!run) throw new AuthError("token_invalid", "This test link is not valid.");
      const r = run.record;
      const rec = r.recording;
      if (!rec || recordingGate(r) !== "record") throw new AuthError("token_invalid", "These tests aren't being recorded.");
      if (!run.tests.some((t) => t.id === testId)) throw new AuthError("token_invalid", "This test isn't part of your invitation.");
      if ((rec.mode === "photos") !== (type === "image/jpeg")) throw new Error("This kind of recording isn't accepted.");
      // The last piece can arrive just after the answers; nothing comes in long after a test is finished.
      const finished = r.attempts.find((a) => a.testId === testId)?.completedAt;
      if (finished && Date.now() - new Date(finished).getTime() > 2 * 60_000) throw new Error("This test is finished.");
      if (rec.pieces.some((p) => p.testId === testId && p.seq === seq)) return null;
      if (rec.pieces.reduce((n, p) => n + p.bytes, 0) + bytes.byteLength > MAX_RECORDING_BYTES) throw new Error("The recording has reached its size limit.");
      return { key: recordingKey(org, r.id, { testId, seq }), id: r.id };
    });
    if (!key) return;
    await putObject(key.key, bytes, type);
    const kept = await withOrg(org, null, () => {
      const run = runFor(token);
      const rec = run?.record.recording;
      if (!rec || rec.deleted) return false;
      if (!rec.pieces.some((p) => p.testId === testId && p.seq === seq)) rec.pieces.push({ testId, seq, mime: type, bytes: bytes.byteLength, at: new Date().toISOString() });
      return true;
    });
    // Deleted while this piece was being stored: don't leave it behind.
    if (!kept) await deleteObject(key.key).catch(() => {});
  },

  async saveProgress(token, testId, answered) {
    await requireVerified(token);
    const org = await orgOf(token);
    await withOrg(org, null, () => {
      const run = runFor(token);
      if (run) saveProgress(run.record, testId, answered);
    });
  },

  async submit(token, testId, answers, minutes, integrity, fastAnswers) {
    await requireVerified(token);
    const org = await orgOf(token);
    return withOrg(org, null, () => {
      const run = runFor(token);
      if (!run) throw new AuthError("token_invalid", "This test link is not valid.");
      if (run.record.status === "expired" || run.record.status === "cancelled") throw new AuthError("token_expired", "This invitation has closed.");
      if (!run.tests.some((t) => t.id === testId)) throw new AuthError("token_invalid", "This test isn't part of your invitation.");
      if (run.record.results.some((r) => r.testId === testId)) throw new AuthError("token_expired", "You've already finished this test.");
      return submitTest(run.record, testId, answers, Math.max(1, Math.min(240, Math.round(minutes))), "desktop", cleanIntegrity(integrity), count(fastAnswers));
    });
  },
};
