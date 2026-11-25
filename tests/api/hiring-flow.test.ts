import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { emptyDraft } from "@/lib/workflow";
import { Client, cleanUp, codeIn, email, mailTo, newOrganisation, pdf } from "../support/api";

/**
 * The whole hiring flow, the way HR and a candidate use it: vacancy → CV → match → shortlist (tests go out
 * automatically) → candidate takes the tests → interview → offer → approval → acceptance → hire.
 * Steps run in order and share state, so a failure stops the rest.
 */
let hr: Client;
let hrEmail: string;
const candidateEmail = email("tariro");
const s: { vacancyId?: string; cvId?: string; candidateId?: string; applicationId?: string; token?: string; offerId?: string } = {};

const CV = [
  "Tariro Ncube",
  "Fleet Controller",
  "Bulawayo, Zimbabwe",
  `${candidateEmail} | +263 77 123 4567`,
  "",
  "Work experience",
  "Fleet Controller, Kopje Freight",
  "March 2019 - Present",
  "Ran fleet management for 60 trucks and cut fuel use by 12%.",
  "Transport Officer, Acme Logistics",
  "Jan 2015 - Feb 2019",
  "Scheduled routes and handled customs clearance at Beitbridge.",
  "",
  "Education",
  "BCom (Hons) Supply Chain Management",
  "National University of Science and Technology, 2014",
  "",
  "Certifications",
  "Certificate in Logistics and Transport, CILT, 2018",
  "",
  "Skills",
  "Fleet management, Logistics, Excel, Team leadership",
];

beforeAll(async () => {
  ({ client: hr, email: hrEmail } = await newOrganisation("nokuthula", "Flow Freight"));
});

afterAll(cleanUp);

describe.sequential("hiring flow", () => {
  it("opens a vacancy with requirements", async () => {
    const v = await hr.ok<{ id: string; status: string; assessment: { autoSendOnShortlist: boolean } }>(
      "vacancies",
      "create",
      {
        ...emptyDraft(),
        title: "Fleet Controller",
        department: "Operations",
        location: "Bulawayo",
        summary: "Run our regional fleet.",
        requirements: [
          { id: "r1", kind: "skill", text: "Fleet management", priority: "essential" },
          { id: "r2", kind: "experience", text: "Operations experience", years: 3, priority: "essential" },
          { id: "r3", kind: "skill", text: "Customs clearance", priority: "desirable" },
        ],
      },
      true,
    );
    expect(v.status).toBe("open");
    expect(v.assessment.autoSendOnShortlist).toBe(true);
    s.vacancyId = v.id;
  });

  it("reads an uploaded PDF CV into a profile for review", async () => {
    const stored = await hr.upload("Tariro_Ncube_CV.pdf", pdf(CV), "application/pdf");
    const batch = await hr.ok<{ files: { id: string }[] }>("cv", "upload", s.vacancyId, "Fleet Controller", [{ name: stored.name, sizeKb: stored.sizeKb, fileId: stored.fileId }]);
    s.cvId = batch.files[0]!.id;
    let status = "";
    for (let i = 0; i < 720 && !["ready", "needs_review", "failed"].includes(status); i++) {
      await new Promise((r) => setTimeout(r, 250));
      status = (await hr.ok<{ file: { status: string } }>("cv", "getFile", s.cvId)).file.status;
    }
    expect(["ready", "needs_review"]).toContain(status);
    const { file } = await hr.ok<{ file: { extraction: { name: { value: string }; email: { value: string }; experience: unknown[] } } }>("cv", "getFile", s.cvId);
    expect(file.extraction.name.value).toBe("Tariro Ncube");
    expect(file.extraction.email.value).toBe(candidateEmail);
    expect(file.extraction.experience.length).toBeGreaterThanOrEqual(2);
    s.candidateId = await hr.ok<string>("cv", "confirm", s.cvId, file.extraction);
    const profile = await hr.ok<{ certifications: { name: string; issuer: string; year: number }[] }>("profiles", "get", s.candidateId);
    expect(profile.certifications).toEqual([{ name: "Certificate in Logistics and Transport", issuer: "CILT", year: 2018 }]);
  });

  it("refuses to add the same CV twice", async () => {
    const { file } = await hr.ok<{ file: { extraction: unknown } }>("cv", "getFile", s.cvId);
    expect((await hr.call("cv", "confirm", s.cvId, file.extraction)).ok).toBe(false);
  });

  it("matches the candidate against each requirement, with evidence", async () => {
    const { assessments } = await hr.ok<{ assessments: { candidateId: string; applicationId: string; score: number; requirements: { outcome: string; evidence: unknown[] }[] }[] }>("matching", "rank", s.vacancyId);
    const a = assessments.find((x) => x.candidateId === s.candidateId)!;
    s.applicationId = a.applicationId;
    expect(a.score).toBeGreaterThan(50);
    expect(a.requirements.map((r) => r.outcome)).toEqual(["met", "met", "met"]);
    expect(a.requirements.every((r) => r.evidence.length > 0)).toBe(true);
  });

  it("sends the tests automatically when the candidate is shortlisted", async () => {
    const r = await hr.ok<{ moved: number; testsSent: number }>("pipeline", "move", [{ candidateId: s.candidateId, applicationId: s.applicationId }], "shortlisted", "Strong fleet evidence");
    expect(r).toMatchObject({ moved: 1, testsSent: 1 });
    const mail = await mailTo(candidateEmail, /online tests/);
    s.token = mail.text.match(/\/t\/([A-Za-z0-9_-]+)/)![1]!;
    expect(mail.text).toContain("Flow Freight");
    expect(mail.text).not.toMatch(/\{\{|Your organisation/);
  });

  it("lets the candidate in only after they confirm the emailed code", async () => {
    const cand = new Client();
    const access = await cand.ok<{ candidateName: string; tests: { id: string }[] }>("candidateAccess", "open", s.token);
    expect(access.candidateName).toBe("Tariro Ncube");
    expect((await cand.call("candidateAccess", "loadTest", s.token, access.tests[0]!.id)).ok).toBe(false);
    await cand.ok("candidateAccess", "sendCode", s.token);
    const code = codeIn((await mailTo(candidateEmail, /code/)).subject);
    expect((await cand.call("candidateAccess", "verify", s.token, code === "000000" ? "111111" : "000000")).code).toBe("invalid_code");
    await cand.ok("candidateAccess", "verify", s.token, code);
    // Consent comes before any test.
    expect((await cand.call("candidateAccess", "loadTest", s.token, access.tests[0]!.id)).ok).toBe(false);
    await cand.ok("candidateAccess", "recordConsent", s.token);

    let finished = false;
    for (const t of access.tests) {
      const test = await cand.ok<{ questions: Record<string, unknown>[]; practice: Record<string, unknown>[] }>("candidateAccess", "loadTest", s.token, t.id);
      for (const q of test.questions) for (const key of ["answer", "explanation", "keyed", "effectiveness"]) expect(q[key], `${t.id} leaks ${key}`).toBeUndefined();
      const answers = Object.fromEntries(test.questions.map((q) => [q.id as string, 1]));
      // The first test reports what the browser noticed, with values a tampered browser might send.
      const noticed = t === access.tests[0] ? [{ leftWindow: 2, awaySeconds: 40.4, pasteBlocked: -3, copyBlocked: "lots", shortcutsBlocked: 1e12, contextMenuBlocked: 1 }, 2] : [];
      finished = await cand.ok<boolean>("candidateAccess", "submit", s.token, t.id, answers, 10, ...noticed);
    }
    expect(finished).toBe(true);

    // Another browser with the same link but no code still can't load anything.
    expect((await new Client().call("candidateAccess", "loadTest", s.token, access.tests[0]!.id)).ok).toBe(false);
  });

  it("scores the tests and feeds them into the match", async () => {
    const list = await hr.ok<{ record: { id: string; candidateId: string; status: string } }[]>("assessments", "invitations");
    const inv = list.find((x) => x.record.candidateId === s.candidateId)!;
    expect(inv.record.status).toBe("completed");
    const { results, view } = await hr.ok<{
      results: unknown[];
      view: { record: { attempts: { testId: string; integrity?: Record<string, number>; fastResponseFlags: number }[]; audit: { action: string; detail?: string }[] } };
    }>("assessments", "invitation", inv.record.id);
    expect(results.length).toBeGreaterThan(0);
    // What the browser noticed is cleaned (whole numbers, 0 to a cap) and kept on the attempt for HR.
    const flagged = view.record.attempts.find((a) => a.integrity?.leftWindow)!;
    expect(flagged.integrity).toEqual({ leftWindow: 2, awaySeconds: 40, pasteBlocked: 0, copyBlocked: 0, shortcutsBlocked: 10_000, contextMenuBlocked: 1, cameraOff: 0 });
    expect(flagged.fastResponseFlags).toBe(2);
    const note = view.record.audit.find((e) => e.action === "noticed");
    expect(note?.detail).toContain("left the test window twice (40 s away)");
    expect(note?.detail).toContain("2 answers given in under two seconds");
    const { assessments } = await hr.ok<{ assessments: { candidateId: string; testScore: number | null }[] }>("matching", "rank", s.vacancyId);
    expect(assessments.find((x) => x.candidateId === s.candidateId)!.testScore).not.toBeNull();
  });

  it("schedules an interview, invites the candidate, and holds scorecards until it has happened", async () => {
    const { members } = await hr.ok<{ members: { id: string; email: string }[] }>("settings", "members");
    const me = members.find((m) => m.email === hrEmail)!;
    const sets = await hr.ok<{ id: string }[]>("interviews", "questionSets");
    const start = new Date(Date.now() + 3 * 86_400_000);
    start.setUTCHours(8, 0, 0, 0);
    const iv = await hr.ok<{ id: string; status: string }>("interviews", "schedule", {
      candidateId: s.candidateId,
      vacancyId: s.vacancyId,
      round: "First interview",
      kind: "first_interview",
      startsAt: start.toISOString(),
      durationMin: 45,
      format: "Video",
      location: "https://meet.example.org/flow",
      panel: [{ interviewerId: me.id, role: "lead" }],
      questionSetId: sets.at(-1)!.id,
      message: "",
      acknowledgeConflicts: true,
    });
    expect(iv.status).toBe("scheduled");
    await mailTo(candidateEmail, /Interview for Fleet Controller/);
    const early = await hr.call("interviews", "saveScorecard", iv.id, { ratings: [], recommendation: "yes", summary: "" }, true);
    expect(early.error).toMatch(/after the interview/);
    expect((await hr.call("interviews", "decide", iv.id, "advance", "Too early", "offer")).ok).toBe(false);
  });

  it("makes an offer that needs approval before it can be sent", async () => {
    await hr.ok("pipeline", "move", [{ candidateId: s.candidateId, applicationId: s.applicationId }], "offer", "Moving to offer");
    const { terms } = await hr.ok<{ terms: Record<string, unknown> }>("offers", "defaults", s.candidateId, s.vacancyId);
    const start = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10);
    const offer = await hr.ok<{ id: string; status: string; approvals: { step: number }[] }>("offers", "create", s.candidateId, s.vacancyId, { ...terms, baseSalary: 1800, startDate: start }, true);
    s.offerId = offer.id;
    expect(offer.status).toBe("pending_approval");
    expect((await hr.call("offers", "send", offer.id)).ok).toBe(false);
    let o = offer;
    for (const a of offer.approvals) o = await hr.ok("offers", "approve", offer.id, a.step, "Within band");
    expect(o.status).toBe("approved");
    await hr.ok("offers", "send", offer.id);
    await mailTo(candidateEmail, /Your offer/);
  });

  it("only hires once the candidate accepts and the pre-hire checks are done, then fills the vacancy", async () => {
    expect((await hr.call("offers", "hire", s.offerId)).ok).toBe(false);
    await hr.ok("offers", "respond", s.offerId, { outcome: "accepted", note: "Accepted by phone", recordedBy: "HR" }, false);
    const blocked = await hr.call("offers", "hire", s.offerId);
    expect(blocked.error).toMatch(/pre-hire checks/);
    const { view } = await hr.ok<{ view: { offer: { checklist: { id: string; required: boolean; phase: string }[] } } }>("offers", "get", s.offerId);
    for (const item of view.offer.checklist) await hr.ok("offers", "setChecklist", s.offerId, item.id, true);
    const hired = await hr.ok<{ filled: boolean }>("offers", "hire", s.offerId);
    expect(hired.filled).toBe(true);
    expect((await hr.ok<{ status: string }>("vacancies", "get", s.vacancyId)).status).toBe("filled");
    const profile = await hr.ok<{ applications: { stage: string }[] }>("profiles", "get", s.candidateId);
    expect(profile.applications[0]!.stage).toBe("hired");
  });

  it("shows the hire on the dashboard and in analytics", async () => {
    const report = await hr.ok<{ kpis: { id: string; value: number }[] }>("analytics", "report", { period: "30d", department: "all", vacancyId: "all" });
    expect(report.kpis.find((k) => k.id === "hires")!.value).toBe(1);
    const snap = await hr.ok<{ kpis: { id: string; value: number }[] }>("dashboard", "getSnapshot", "30d");
    expect(snap.kpis.find((k) => k.id === "open")!.value).toBe(0);
  });
});
