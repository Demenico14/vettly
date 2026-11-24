import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { emptyDraft } from "@/lib/workflow";
import { cleanUp, email, newOrganisation, pdf } from "../support/api";

/** A newer CV for an existing candidate: added as a document only, or used to update their profile. */
let org: Awaited<ReturnType<typeof newOrganisation>>;
const address = email("tendai");
let vacancyId: string;
let candidateId: string;

type Profile = { headline: string; experience: { title: string; company: string }[]; skills: { name: string; level: string }[]; notes: { body: string }[]; documents: unknown[]; applications: { stage: string }[] };

async function read(lines: string[]) {
  const cv = await org.client.upload("cv.pdf", pdf(lines), "application/pdf");
  const batch = await org.client.ok<{ files: { id: string }[] }>("cv", "upload", vacancyId, "Fleet Controller", [{ name: cv.name, sizeKb: cv.sizeKb, fileId: cv.fileId }]);
  let file: { status: string; extraction: unknown; duplicateOf?: { id: string } } = { status: "", extraction: null };
  for (let i = 0; i < 720 && !["ready", "needs_review"].includes(file.status); i++) {
    await new Promise((r) => setTimeout(r, 250));
    file = (await org.client.ok<{ file: typeof file }>("cv", "getFile", batch.files[0]!.id)).file;
  }
  return { id: batch.files[0]!.id, ...file };
}

const OLD = ["Tendai Moyo", "Dispatch Clerk", `${address} | +263 77 555 0300`, "", "Work experience", "Dispatch Clerk, Unifreight Africa", "January 2018 - Present", "Planned daily routes."];
const NEW = ["Tendai Moyo", "Fleet Supervisor", `${address} | +263 77 555 0300`, "", "Work experience", "Fleet Supervisor, Swift Transport", "March 2022 - Present", "Managed 40 trucks.", "Dispatch Clerk, Unifreight Africa", "January 2018 - February 2022", "Planned daily routes.", "", "Skills", "Fleet management, SAP, Excel"];

beforeAll(async () => {
  org = await newOrganisation("upd", "Update Org");
  vacancyId = (await org.client.ok<{ id: string }>("vacancies", "create", { ...emptyDraft(), title: "Fleet Controller", department: "Operations", location: "Harare" }, true)).id;
  const first = await read(OLD);
  candidateId = await org.client.ok<string>("cv", "confirm", first.id, first.extraction);
  await org.client.ok("profiles", "addNote", candidateId, "Strong phone screen");
});

afterAll(cleanUp);

describe("a newer CV for an existing candidate", () => {
  it("is recognised as the same person", async () => {
    const next = await read(NEW);
    expect(next.duplicateOf?.id).toBe(candidateId);
  });

  it("can be added as a document only, leaving the profile as it was", async () => {
    const before = await org.client.ok<Profile>("profiles", "get", candidateId);
    const next = await read(NEW);
    await org.client.ok("cv", "confirm", next.id, next.extraction, candidateId, false);
    const after = await org.client.ok<Profile>("profiles", "get", candidateId);
    expect(after.documents.length).toBe(before.documents.length + 1);
    expect(after.experience).toEqual(before.experience);
    expect(after.headline).toBe(before.headline);
  });

  it("can update the profile, keeping notes, stage and applications", async () => {
    const before = await org.client.ok<Profile>("profiles", "get", candidateId);
    const next = await read(NEW);
    await org.client.ok("cv", "confirm", next.id, next.extraction, candidateId, true);
    const after = await org.client.ok<Profile>("profiles", "get", candidateId);
    expect(after.experience.map((e) => e.company)).toEqual(["Swift Transport", "Unifreight Africa"]);
    expect(after.skills.map((s) => s.name)).toEqual(expect.arrayContaining(["SAP", "Excel"]));
    expect(after.notes.map((n) => n.body)).toEqual(before.notes.map((n) => n.body));
    expect(after.applications.map((a) => a.stage)).toEqual(before.applications.map((a) => a.stage));
    const audit = await org.client.ok<{ entries: { action: string; detail: string }[] } | { action: string; detail: string }[]>("settings", "audit");
    const entries = Array.isArray(audit) ? audit : audit.entries;
    expect(entries.some((e) => e.action === "Updated a profile from a newer CV" && e.detail.startsWith("Tendai Moyo"))).toBe(true);
  });
});
