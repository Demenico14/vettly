import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { emptyDraft } from "@/lib/workflow";
import { Client, cleanUp, codeIn, email, mailTo, newOrganisation, pdf } from "../support/api";

/**
 * Recording candidates during tests: off unless the organisation turns it on; a separate written choice that the
 * candidate can decline; uploads checked; playback only for the organisation's report readers and logged;
 * deletion dated from when the application closes; holds and early deletion need a reason.
 */
let hr: Client;
const cand = new Client();
const candidateEmail = email("tendai");
const s: { vacancyId?: string; candidateId?: string; applicationId?: string; token?: string; invitationId?: string; testId?: string; pieceUrl?: string } = {};

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]).toString("base64");

beforeAll(async () => {
  ({ client: hr } = await newOrganisation("rutendo", "Record Freight"));
});

afterAll(cleanUp);

describe.sequential("recording during tests", () => {
  it("is off by default, and keeps recordings 7 to 30 days after the application closes", async () => {
    const settings = await hr.ok<{ assessments: Record<string, unknown> & { recording?: { mode: string } } }>("settings", "get");
    expect(settings.assessments.recording?.mode ?? "off").toBe("off");
    const bad = await hr.call("settings", "save", "assessments", { ...settings.assessments, recording: { mode: "photos", audio: false, keepDays: 60 } });
    expect(bad.error).toMatch(/7 to 30 days/);
    await hr.ok("settings", "save", "assessments", { ...settings.assessments, recording: { mode: "photos", audio: true, keepDays: 7 } });
    const saved = await hr.ok<{ assessments: { recording: { mode: string; audio: boolean; keepDays: number } } }>("settings", "get");
    // Sound only goes with video.
    expect(saved.assessments.recording).toEqual({ mode: "photos", audio: false, keepDays: 7 });
  });

  it("gets a shortlisted candidate to their tests", async () => {
    const v = await hr.ok<{ id: string }>(
      "vacancies",
      "create",
      { ...emptyDraft(), title: "Depot Lead", department: "Operations", location: "Harare", summary: "Run the depot.", requirements: [{ id: "r1", kind: "skill", text: "Fleet management", priority: "essential" }] },
      true,
    );
    s.vacancyId = v.id;
    const lines = ["Tendai Moyo", "Depot Lead", "Harare, Zimbabwe", `${candidateEmail} | +263 77 555 0101`, "", "Work experience", "Depot Lead, Kopje Freight", "March 2019 - Present", "Fleet management for 40 trucks.", "", "Skills", "Fleet management"];
    const stored = await hr.upload("Tendai_Moyo_CV.pdf", pdf(lines), "application/pdf");
    const batch = await hr.ok<{ files: { id: string }[] }>("cv", "upload", s.vacancyId, "Depot Lead", [{ name: stored.name, sizeKb: stored.sizeKb, fileId: stored.fileId }]);
    let status = "";
    for (let i = 0; i < 720 && !["ready", "needs_review", "failed"].includes(status); i++) {
      await new Promise((r) => setTimeout(r, 250));
      status = (await hr.ok<{ file: { status: string } }>("cv", "getFile", batch.files[0]!.id)).file.status;
    }
    const { file } = await hr.ok<{ file: { extraction: unknown } }>("cv", "getFile", batch.files[0]!.id);
    s.candidateId = await hr.ok<string>("cv", "confirm", batch.files[0]!.id, file.extraction);
    const { assessments } = await hr.ok<{ assessments: { candidateId: string; applicationId: string }[] }>("matching", "rank", s.vacancyId);
    s.applicationId = assessments.find((x) => x.candidateId === s.candidateId)!.applicationId;
    await hr.ok("pipeline", "move", [{ candidateId: s.candidateId, applicationId: s.applicationId }], "shortlisted", "Strong depot evidence");
    s.token = (await mailTo(candidateEmail, /online tests/)).text.match(/\/t\/([A-Za-z0-9_-]+)/)![1]!;
    await cand.ok("candidateAccess", "sendCode", s.token);
    await cand.ok("candidateAccess", "verify", s.token, codeIn((await mailTo(candidateEmail, /code/)).subject));
    await cand.ok("candidateAccess", "recordConsent", s.token);
    const access = await cand.ok<{ recording: { mode: string; choice: string | null; keepDays: number }; tests: { id: string }[] }>("candidateAccess", "open", s.token);
    expect(access.recording).toMatchObject({ mode: "photos", choice: null, keepDays: 7 });
    s.testId = access.tests[0]!.id;
    const list = await hr.ok<{ record: { id: string; candidateId: string } }[]>("assessments", "invitations");
    s.invitationId = list.find((x) => x.record.candidateId === s.candidateId)!.record.id;
  });

  it("asks before any test, and holds the tests back if the candidate declines", async () => {
    expect((await cand.call("candidateAccess", "loadTest", s.token, s.testId)).error).toMatch(/agree to be recorded/);
    await cand.ok("candidateAccess", "recordingChoice", s.token, false);
    expect((await cand.call("candidateAccess", "loadTest", s.token, s.testId)).error).toMatch(/chose not to be recorded/);
    expect(await hr.ok<{ choice: string }>("recordings", "summary", s.invitationId)).toMatchObject({ choice: "declined" });
    // They can change their mind before anything is recorded.
    await cand.ok("candidateAccess", "recordingChoice", s.token, true);
    const test = await cand.ok<{ recording: { mode: string } | null }>("candidateAccess", "loadTest", s.token, s.testId);
    expect(test.recording).toEqual({ mode: "photos", audio: false });
  });

  it("checks every piece the browser sends", async () => {
    const fake = await cand.call("candidateAccess", "uploadRecording", s.token, s.testId, 0, "image/jpeg", Buffer.from("not a photo").toString("base64"));
    expect(fake.error).toMatch(/isn't a valid file/);
    const wrongKind = await cand.call("candidateAccess", "uploadRecording", s.token, s.testId, 0, "video/webm", Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0]).toString("base64"));
    expect(wrongKind.error).toMatch(/isn't accepted/);
    await cand.ok("candidateAccess", "uploadRecording", s.token, s.testId, 0, "image/jpeg", JPEG);
    await cand.ok("candidateAccess", "uploadRecording", s.token, s.testId, 0, "image/jpeg", JPEG); // a retry is ignored
    await cand.ok("candidateAccess", "uploadRecording", s.token, s.testId, 1, "image/jpeg", JPEG);
    const sum = await hr.ok<{ tests: { testId: string; pieces: number }[] }>("recordings", "summary", s.invitationId);
    expect(sum.tests).toEqual([expect.objectContaining({ testId: s.testId, pieces: 2 })]);
  });

  it("plays back only for the organisation's report readers, and logs each viewing", async () => {
    const { mime, pieces } = await hr.ok<{ mime: string; pieces: { url: string }[] }>("recordings", "playback", s.invitationId, s.testId);
    expect(mime).toBe("image/jpeg");
    s.pieceUrl = pieces[0]!.url;
    const res = await hr.raw(s.pieceUrl);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect((await new Client().raw(s.pieceUrl)).status).toBe(401);
    const { client: other } = await newOrganisation("farai", "Other Freight");
    expect((await other.raw(s.pieceUrl)).status).toBe(404);
    const { view } = await hr.ok<{ view: { record: { audit: { action: string; detail?: string }[] } } }>("assessments", "invitation", s.invitationId);
    expect(view.record.audit.some((e) => e.action === "recording" && e.detail?.includes("opened"))).toBe(true);
  });

  it("dates deletion from when the application closes, and holds need a reason", async () => {
    await hr.ok("pipeline", "move", [{ candidateId: s.candidateId, applicationId: s.applicationId }], "rejected", "Another candidate was a closer fit");
    const sum = await hr.ok<{ deletesOn: string }>("recordings", "summary", s.invitationId);
    const days = (new Date(sum.deletesOn).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7);
    expect((await hr.call("recordings", "hold", s.invitationId, 120, "Checking a concern")).error).toMatch(/1 to 90 days/);
    expect((await hr.call("recordings", "hold", s.invitationId, 30, "")).error).toMatch(/reason/);
    const held = await hr.ok<{ deletesOn: string; hold: { reason: string } }>("recordings", "hold", s.invitationId, 30, "Checking a concern about the numerical test");
    expect(held.hold.reason).toContain("numerical");
    expect(new Date(held.deletesOn).getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000);
  });

  it("deletes on request, with a reason, and the pieces can't be opened after", async () => {
    const gone = await hr.ok<{ deleted: { why: string; pieces: number }; tests: unknown[] }>("recordings", "remove", s.invitationId, "The candidate asked for deletion");
    expect(gone.deleted).toMatchObject({ why: "The candidate asked for deletion", pieces: 2 });
    expect(gone.tests).toEqual([]);
    expect((await hr.raw(s.pieceUrl!)).status).toBe(404);
  });
});
