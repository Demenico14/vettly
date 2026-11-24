import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { emptyDraft } from "@/lib/workflow";
import { BASE, Client, cleanUp, email, newOrganisation, pdf } from "../support/api";

/** Letterhead: a real logo upload, the public logo address, offer letters as PDF, and branded emails. */
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";
// A valid 1×1 PNG.
const PNG = new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64")) as Uint8Array<ArrayBuffer>;
const FOOTER = "Brand Freight (Pvt) Ltd · Registration no. 2207/2019 · 9 Kwame Nkrumah Ave, Harare";

let org: Awaited<ReturnType<typeof newOrganisation>>;
let other: Awaited<ReturnType<typeof newOrganisation>>;
const candidateEmail = email("chiedza");
const s: { logo?: string; vacancyId?: string; candidateId?: string; applicationId?: string; offerId?: string } = {};

type Mail = { ID: string; Subject: string; HTML: string; Text: string; Attachments: { FileName: string; ContentType: string }[]; Inline: { FileName: string; ContentType: string; ContentID: string }[] };
async function mailFull(to: string, subject: RegExp): Promise<Mail> {
  for (let i = 0; i < 40; i++) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}&limit=20`)).json()) as { messages: { ID: string; Subject: string }[] };
    const m = list.messages.find((x) => subject.test(x.Subject));
    if (m) return (await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json()) as Mail;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`No email to ${to} matching ${subject}`);
}

async function pdfText(bytes: ArrayBuffer) {
  const { getDocumentProxy, extractText } = await import("unpdf");
  return ((await extractText(await getDocumentProxy(new Uint8Array(bytes)), { mergePages: true })).text as string).replace(/\s+/g, " ");
}

beforeAll(async () => {
  org = await newOrganisation("brand", "Brand Freight");
  other = await newOrganisation("plain", "Plain Org");
  const all = await org.client.ok<{ profile: Record<string, unknown> }>("settings", "get");
  await org.client.ok("settings", "save", "profile", { ...all.profile, address: "9 Kwame Nkrumah Ave", city: "Harare", phone: "+263 24 270 1234", website: "https://brandfreight.example" });

  s.vacancyId = (await org.client.ok<{ id: string }>("vacancies", "create", { ...emptyDraft(), title: "Fleet Controller", department: "Operations", location: "Harare" }, true)).id;
  const cv = await org.client.upload("cv.pdf", pdf(["Chiedza Banda", "Fleet Controller", `${candidateEmail} | +263 77 555 0199`, "", "Work experience", "Fleet Controller, Kopje Freight", "March 2019 - Present", "Ran the fleet."]), "application/pdf");
  const batch = await org.client.ok<{ files: { id: string }[] }>("cv", "upload", s.vacancyId, "Fleet Controller", [{ name: cv.name, sizeKb: cv.sizeKb, fileId: cv.fileId }]);
  let file: { status: string; extraction: unknown } = { status: "", extraction: null };
  for (let i = 0; i < 720 && !["ready", "needs_review"].includes(file.status); i++) {
    await new Promise((r) => setTimeout(r, 250));
    file = (await org.client.ok<{ file: typeof file }>("cv", "getFile", batch.files[0]!.id)).file;
  }
  s.candidateId = await org.client.ok<string>("cv", "confirm", batch.files[0]!.id, file.extraction);
  const profile = await org.client.ok<{ applications: { id: string }[] }>("profiles", "get", s.candidateId);
  s.applicationId = profile.applications[0]!.id;
});

afterAll(cleanUp);

describe.sequential("letterhead", () => {
  it("accepts only an image the organisation uploaded as its logo", async () => {
    const { branding } = await org.client.ok<{ branding: Record<string, unknown> }>("settings", "get");
    const doc = await org.client.upload("not-a-logo.pdf", pdf(["x"]), "application/pdf");
    expect((await org.client.call("settings", "save", "branding", { ...branding, logoFileId: doc.fileId })).error).toMatch(/PNG or JPG/);
    const theirs = await other.client.upload("their-logo.png", PNG, "image/png");
    expect((await org.client.call("settings", "save", "branding", { ...branding, logoFileId: theirs.fileId })).error).toMatch(/didn't finish uploading/);

    const logo = await org.client.upload("brand-logo.png", PNG, "image/png");
    s.logo = logo.fileId;
    await org.client.ok("settings", "save", "branding", { ...branding, logoFileId: logo.fileId, logoFileName: logo.name, letterContact: true, letterFooter: FOOTER });
  });

  it("serves the logo publicly, and nothing else through that address", async () => {
    const anon = new Client();
    const ok = await anon.raw(`/api/logo/${org.organisationId}/${s.logo}`);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("image/png");
    const cv = await org.client.upload("private.pdf", pdf(["Private CV"]), "application/pdf");
    expect((await anon.raw(`/api/logo/${org.organisationId}/${cv.fileId}`)).status).toBe(404);
    expect((await anon.raw(`/api/logo/${other.organisationId}/${s.logo}`)).status).toBe(404);
  });

  it("prints the offer letter as a PDF on the letterhead", async () => {
    await org.client.ok("pipeline", "move", [{ candidateId: s.candidateId, applicationId: s.applicationId }], "offer", "Offer", { sendTests: false });
    const { terms } = await org.client.ok<{ terms: Record<string, unknown> }>("offers", "defaults", s.candidateId, s.vacancyId);
    const o = await org.client.ok<{ id: string }>("offers", "create", s.candidateId, s.vacancyId, { ...terms, baseSalary: 1500, startDate: new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10) }, true);
    s.offerId = o.id;
    const res = await org.client.raw(`/api/offers/${o.id}/letter`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("Offer letter - Chiedza Banda.pdf");
    const text = await pdfText(await res.arrayBuffer());
    expect(text).toContain("Brand Freight");
    expect(text).toContain("9 Kwame Nkrumah Ave, Harare");
    expect(text).toContain("Registration no. 2207/2019");
    expect(text).toContain("Dear Chiedza");
    expect(text).toMatch(/Page 1 of 1/);
  });

  it("keeps the PDF to people in the organisation", async () => {
    expect((await new Client().raw(`/api/offers/${s.offerId}/letter`)).status).toBe(401);
    expect((await other.client.raw(`/api/offers/${s.offerId}/letter`)).status).toBe(404);
  });

  it("emails the offer on the letterhead, with the letter attached as a PDF and the logo inside", async () => {
    const { view } = await org.client.ok<{ view: { offer: { approvals: { step: number }[] } } }>("offers", "get", s.offerId);
    for (const a of view.offer.approvals) await org.client.ok("offers", "approve", s.offerId, a.step, "Fine");
    await org.client.ok("offers", "send", s.offerId);
    const m = await mailFull(candidateEmail, /Your offer/);
    expect(m.HTML).toContain("cid:logo");
    expect(m.HTML).toContain(FOOTER.replace(/&/g, "&amp;"));
    expect(m.HTML).toContain("Dear Chiedza");
    expect(m.Text).toContain("Dear Chiedza");
    expect(m.Attachments.map((a) => [a.FileName, a.ContentType])).toContainEqual(["Offer letter - Chiedza Banda.pdf", "application/pdf"]);
    expect(m.Inline.some((a) => a.ContentID === "logo" && a.ContentType === "image/png")).toBe(true);
  });

  it("brands test invitations too, and shows the logo on the candidate's test page", async () => {
    const second = email("farai");
    const cv = await org.client.upload("cv2.pdf", pdf(["Farai Dube", "Analyst", `${second} | +263 77 555 0200`, "", "Work experience", "Analyst, Acme", "2020 - Present", "Analysis."]), "application/pdf");
    const batch = await org.client.ok<{ files: { id: string }[] }>("cv", "upload", s.vacancyId, "Fleet Controller", [{ name: cv.name, sizeKb: cv.sizeKb, fileId: cv.fileId }]);
    let file: { status: string; extraction: unknown } = { status: "", extraction: null };
    for (let i = 0; i < 720 && !["ready", "needs_review"].includes(file.status); i++) {
      await new Promise((r) => setTimeout(r, 250));
      file = (await org.client.ok<{ file: typeof file }>("cv", "getFile", batch.files[0]!.id)).file;
    }
    const id = await org.client.ok<string>("cv", "confirm", batch.files[0]!.id, file.extraction);
    const app = (await org.client.ok<{ applications: { id: string }[] }>("profiles", "get", id)).applications[0]!.id;
    await org.client.ok("pipeline", "move", [{ candidateId: id, applicationId: app }], "shortlisted", "Good");
    const m = await mailFull(second, /online tests/);
    expect(m.HTML).toContain("cid:logo");
    expect(m.HTML).toContain("Registration no. 2207/2019");
    expect(m.HTML).toMatch(/<a href="http[^"]+\/t\/[A-Za-z0-9_-]+"/);
    const token = m.Text.match(/\/t\/([A-Za-z0-9_-]+)/)![1]!;
    const access = await new Client().ok<{ organisationLogoUrl: string | null }>("candidateAccess", "open", token);
    expect(access.organisationLogoUrl).toBe(`/api/logo/${org.organisationId}/${s.logo}`);
    expect((await fetch(`${BASE}${access.organisationLogoUrl}`)).status).toBe(200);
  });
});
