/**
 * Recording candidates during psychometric tests: photos every 20 seconds or video, only when the organisation
 * turns it on and the candidate agrees in writing. Recordings live in Vettly's own storage under
 * {org}/recordings/, never in the general files table, and are served only to people who can see test reports.
 *
 * Retention: deleted `keepDays` (7 to 30) after the candidate's application closes (hired, rejected or
 * withdrawn), or after the invitation is cancelled; and at the latest six months after the last piece. HR can
 * hold a recording for up to 90 days while looking into a concern, with a reason. See
 * docs/reports/reports/Test video recording - storage and retention.md.
 */
import "server-only";
import type { InvitationRecord, RecordingPiece, TestRecording } from "@/types/psychometrics";
import { recordingSettings } from "@/lib/settings-defaults";
import type { RecordingSummary, RecordingsService } from "@/services/contracts";
import { actorName, afterCommit, now, orgId } from "../context";
import { deleteObject } from "../storage";
import { withOrg } from "../store";
import { invitationStore } from "./assessments";
import { profileSnapshot } from "./candidates";
import { orgSettings, requirePermission } from "./settings";

const DAY = 86_400_000;
/** However long an application stays open, a recording goes this long after its last piece. */
export const LATEST_KEEP_DAYS = 183;
/** The longest a hold can run from the day it's placed. */
export const MAX_HOLD_DAYS = 90;

/** Allowed types, with the bytes a first piece must start with. Later video pieces continue the stream. */
export const RECORDING_TYPES: Record<string, { first?: (b: Uint8Array) => boolean }> = {
  "image/jpeg": { first: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "video/webm": { first: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  "video/mp4": { first: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 },
};
export const MAX_PIECE_BYTES = 2 * 1024 * 1024;
export const MAX_RECORDING_BYTES = 400 * 1024 * 1024;

export const recordingKey = (org: string, invitationId: string, p: Pick<RecordingPiece, "testId" | "seq">) => `${org}/recordings/${invitationId}/${p.testId}/${p.seq}`;

const audit = (r: InvitationRecord, detail: string, by: string) => r.audit.push({ at: now(), by, action: "recording", detail });

/**
 * Sets up recording on an invitation the first time the candidate opens it, if the organisation records and the
 * invitation isn't finished. The settings at that moment stay with the invitation.
 */
export function ensureRecording(r: InvitationRecord) {
  if (r.recording || r.status === "completed" || r.status === "cancelled" || r.status === "expired") return;
  const s = recordingSettings(orgSettings().assessments);
  if (s.mode === "off") return;
  r.recording = { mode: s.mode, audio: s.mode === "video" && s.audio, keepDays: s.keepDays, choice: null, pieces: [] };
}

/** What the candidate must do before a test: nothing, choose, or wait for HR because they declined. */
export function recordingGate(r: InvitationRecord): "none" | "record" | "choose" | "declined" {
  const rec = r.recording;
  if (!rec || rec.deleted) return "none";
  if (rec.waived) return "none";
  if (rec.choice === "agreed") return "record";
  return rec.choice === "declined" ? "declined" : "choose";
}

/** When the candidate's application for this vacancy closed, or null while it's open. */
function closedAt(r: InvitationRecord): number | null {
  if (r.status === "cancelled") {
    const at = [...r.audit].reverse().find((e) => e.action === "cancelled")?.at;
    if (at) return new Date(at).getTime();
  }
  const app = profileSnapshot()
    .find((c) => c.id === r.candidateId)
    ?.applications.find((a) => a.vacancyId === r.vacancyId);
  if (!app || !["hired", "rejected", "withdrawn"].includes(app.stage)) return null;
  const last = [...app.history].reverse().find((h) => h.stage === app.stage);
  return new Date(last?.at ?? app.appliedAt).getTime();
}

/** The day this recording will be deleted, or null when there's nothing to delete. Holds push it back. */
export function deletesOn(r: InvitationRecord): Date | null {
  const rec = r.recording;
  if (!rec || rec.deleted || rec.pieces.length === 0) return null;
  const lastPiece = Math.max(...rec.pieces.map((p) => new Date(p.at).getTime()));
  const closed = closedAt(r);
  let when = lastPiece + LATEST_KEEP_DAYS * DAY;
  if (closed !== null) when = Math.min(when, closed + rec.keepDays * DAY);
  if (rec.hold) when = Math.max(when, new Date(rec.hold.until).getTime());
  return new Date(when);
}

/** Deletes a recording's pieces from storage once the change is saved. */
export function deleteRecording(r: InvitationRecord, why: string, by = "Vettly") {
  const rec = r.recording;
  if (!rec || rec.deleted) return;
  const org = orgId();
  const keys = rec.pieces.map((p) => recordingKey(org, r.id, p));
  rec.deleted = { at: now(), why, pieces: rec.pieces.length };
  rec.pieces = [];
  rec.hold = undefined;
  audit(r, `Recording deleted: ${why}`, by);
  afterCommit(async () => {
    for (const k of keys) await deleteObject(k).catch((e) => console.error("[recordings] delete", k, e));
  });
}

/** Deletes every recording whose time is up. Call inside the organisation's records. Returns how many went. */
export function sweepRecordings(at = Date.now()) {
  let n = 0;
  for (const r of invitationStore) {
    const when = deletesOn(r);
    if (when && when.getTime() <= at) {
      const held = r.recording?.hold && new Date(r.recording.hold.until).getTime() > at;
      if (held) continue;
      deleteRecording(r, "retention period ended");
      n++;
    }
  }
  return n;
}

const EVERY = 3 * 3_600_000;
const g = globalThis as unknown as { __vettlyRecordingSweeps?: Map<string, number> };
const swept: Map<string, number> = (g.__vettlyRecordingSweeps ??= new Map());

/** Runs the recording clean-up for an organisation if it hasn't run in this process for a few hours. Never blocks a request. */
export function scheduleRecordingSweep(organisationId: string) {
  if ((swept.get(organisationId) ?? 0) > Date.now() - EVERY) return;
  swept.set(organisationId, Date.now());
  setTimeout(() => {
    withOrg(organisationId, null, () => sweepRecordings()).catch((e) => console.error("[recordings] sweep", organisationId, e));
  }, 1_500);
}

/** For the candidate's view of their invitation. */
export function candidateRecordingView(r: InvitationRecord) {
  const rec: TestRecording | undefined = r.recording;
  if (!rec || rec.deleted) return null;
  return { mode: rec.mode, audio: rec.audio, keepDays: rec.keepDays, choice: rec.choice, waived: !!rec.waived };
}

/* ---------- HR ---------- */

function invitation(id: string) {
  const r = invitationStore.find((x) => x.id === id);
  if (!r) throw new Error("This invitation could not be found.");
  return r;
}

const reasonOf = (reason: unknown) => {
  const t = typeof reason === "string" ? reason.trim() : "";
  if (t.length < 5) throw new Error("Give a short reason, so the record shows why.");
  return t.slice(0, 300);
};

function summaryOf(r: InvitationRecord): RecordingSummary | null {
  const rec = r.recording;
  if (!rec) return null;
  const tests = new Map<string, RecordingSummary["tests"][number]>();
  for (const p of rec.pieces) {
    const t = tests.get(p.testId) ?? { testId: p.testId, pieces: 0, bytes: 0, firstAt: p.at, lastAt: p.at };
    t.pieces++;
    t.bytes += p.bytes;
    if (p.at < t.firstAt) t.firstAt = p.at;
    if (p.at > t.lastAt) t.lastAt = p.at;
    tests.set(p.testId, t);
  }
  return {
    mode: rec.mode,
    audio: rec.audio,
    keepDays: rec.keepDays,
    choice: rec.choice,
    choiceAt: rec.choiceAt,
    waived: rec.waived,
    tests: [...tests.values()],
    deletesOn: deletesOn(r)?.toISOString() ?? null,
    hold: rec.hold,
    deleted: rec.deleted,
  };
}

export const recordingsService: RecordingsService = {
  async summary(invitationId) {
    return structuredClone(summaryOf(invitation(invitationId)));
  },

  async playback(invitationId, testId) {
    const r = invitation(invitationId);
    const pieces = (r.recording?.pieces ?? []).filter((p) => p.testId === testId).sort((a, b) => a.seq - b.seq);
    if (!pieces.length) throw new Error(r.recording?.deleted ? "This recording has been deleted." : "There's no recording for this test.");
    audit(r, `Recording of ${testId} opened`, actorName());
    return {
      mime: pieces[0]!.mime,
      pieces: pieces.map((p) => ({ seq: p.seq, at: p.at, url: `/api/recordings/${r.id}/${encodeURIComponent(p.testId)}/${p.seq}` })),
    };
  },

  async hold(invitationId, days, reason) {
    const r = invitation(invitationId);
    const rec = r.recording;
    if (!rec || rec.deleted || !rec.pieces.length) throw new Error("There's no recording to keep.");
    const n = Math.round(Number(days));
    if (!Number.isFinite(n) || n < 1 || n > MAX_HOLD_DAYS) throw new Error(`Keep it for 1 to ${MAX_HOLD_DAYS} days.`);
    const why = reasonOf(reason);
    rec.hold = { by: actorName(), at: now(), until: new Date(Date.now() + n * DAY).toISOString(), reason: why };
    audit(r, `Recording kept for ${n} more day${n === 1 ? "" : "s"}: ${why}`, actorName());
    return structuredClone(summaryOf(r)!);
  },

  async releaseHold(invitationId) {
    const r = invitation(invitationId);
    if (r.recording?.hold) {
      r.recording.hold = undefined;
      audit(r, "Hold on the recording released", actorName());
    }
    return structuredClone(summaryOf(r)!);
  },

  async waive(invitationId, reason) {
    const r = invitation(invitationId);
    const rec = r.recording;
    if (!rec) throw new Error("These tests aren't recorded.");
    if (rec.choice !== "declined") throw new Error("Only candidates who declined recording need this.");
    const why = reasonOf(reason);
    rec.waived = { by: actorName(), at: now(), reason: why };
    audit(r, `Candidate can take the tests without recording: ${why}`, actorName());
    return structuredClone(summaryOf(r)!);
  },

  async remove(invitationId, reason) {
    requirePermission("manage_settings", "delete a recording");
    const r = invitation(invitationId);
    if (!r.recording || r.recording.deleted || !r.recording.pieces.length) throw new Error("There's no recording to delete.");
    deleteRecording(r, reasonOf(reason), actorName());
    return structuredClone(summaryOf(r)!);
  },
};
