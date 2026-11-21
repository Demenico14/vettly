import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { emptyDraft } from "@/lib/workflow";
import { Client, cleanUp, docx, email, mailTo, newOrganisation, pdf } from "../support/api";

/** HR replaces the standard offer letter with their own Word letter, edits it, and sends it. */
let hr: Client;
const candidateEmail = email("rutendo");
const s: { vacancyId?: string; candidateId?: string; offerId?: string; letter?: string } = {};

beforeAll(async () => {
  ({ client: hr } = await newOrganisation("letters", "Letter Freight"));
  s.vacancyId = (await hr.ok<{ id: string }>("vacancies", "create", { ...emptyDraft(), title: "Fleet Controller", department: "Operations", location: "Bulawayo" }, true)).id;
  const cv = await hr.upload("cv.pdf", pdf(["Rutendo Moyo", "Fleet Controller", `${candidateEmail} | +263 77 555 0101`, "", "Work experience", "Fleet Controller, Kopje Freight", "March 2019 - Present", "Ran the fleet."]), "application/pdf");
  const batch = await hr.ok<{ files: { id: string }[] }>("cv", "upload", s.vacancyId, "Fleet Controller", [{ name: cv.name, sizeKb: cv.sizeKb, fileId: cv.fileId }]);
  const id = batch.files[0]!.id;
  let file: { status: string; extraction: unknown } = { status: "", extraction: null };
  for (let i = 0; i < 40 && !["ready", "needs_review"].includes(file.status); i++) {
    await new Promise((r) => setTimeout(r, 250));
    file = (await hr.ok<{ file: typeof file }>("cv", "getFile", id)).file;
  }
  s.candidateId = await hr.ok<string>("cv", "confirm", id, file.extraction);
});

afterAll(cleanUp);

const termsFor = async (letterHtml: string | null, letterSource: string | null = null) => {
  const { terms } = await hr.ok<{ terms: Record<string, unknown> }>("offers", "defaults", s.candidateId, s.vacancyId);
  return { ...terms, baseSalary: 1800, startDate: new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10), letterHtml, letterSource };
};

describe.sequential("custom offer letter", () => {
  it("imports a Word letter, keeping headings, bold and merge fields", async () => {
    const file = await hr.upload(
      "Letter Freight offer.docx",
      docx([
        { runs: [{ text: "Dear {{first_name}}," }] },
        { style: "Heading1", runs: [{ text: "Your package" }] },
        { runs: [{ text: "Basic salary: " }, { text: "{{basic_salary}}", bold: true }, { text: " per {{pay_period}}." }] },
        { runs: [{ text: "Please reply by {{respond_by}}. <script>alert(1)</script>" }] },
      ]),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    const r = await hr.ok<{ html: string; name: string }>("offers", "importLetter", file.fileId);
    expect(r.name).toBe("Letter Freight offer.docx");
    expect(r.html).toContain("<h2>Your package</h2>");
    expect(r.html).toContain("<strong>{{basic_salary}}</strong>");
    expect(r.html).not.toContain("<script>");
    s.letter = r.html;
  });

  it("only imports Word documents", async () => {
    const file = await hr.upload("letter.pdf", pdf(["Not Word"]), "application/pdf");
    expect((await hr.call("offers", "importLetter", file.fileId)).error).toMatch(/Word document/);
  });

  it("refuses merge fields it doesn't recognise", async () => {
    const r = await hr.call("offers", "create", s.candidateId, s.vacancyId, await termsFor("<p>Dear {{fist_name}},</p>"), false);
    expect(r.error).toMatch(/\{\{fist_name\}\}/);
  });

  it("cleans the letter on the server, whatever the browser sends", async () => {
    const dirty = `${s.letter}<p onclick="steal()">Welcome aboard.</p><img src=x onerror=alert(1)><a href="javascript:alert(1)">link</a>`;
    const o = await hr.ok<{ id: string; terms: { letterHtml: string; letterSource: string } }>("offers", "create", s.candidateId, s.vacancyId, await termsFor(dirty, "Letter Freight offer.docx"), true);
    s.offerId = o.id;
    expect(o.terms.letterHtml).toContain("<p>Welcome aboard.</p>");
    expect(o.terms.letterHtml).not.toMatch(/onclick|onerror|<img|href|javascript/);
    expect(o.terms.letterSource).toBe("Letter Freight offer.docx");
  });

  it("shows the letter filled in from the offer", async () => {
    const { letterHtml } = await hr.ok<{ letterHtml: string }>("offers", "get", s.offerId);
    expect(letterHtml).toContain("Dear Rutendo,");
    expect(letterHtml).toContain("<strong>USD 1");
    expect(letterHtml).not.toMatch(/\{\{/);
  });

  it("emails the custom wording, with the real reply-by date", async () => {
    const { view } = await hr.ok<{ view: { offer: { approvals: { step: number }[] } } }>("offers", "get", s.offerId);
    for (const a of view.offer.approvals) await hr.ok("offers", "approve", s.offerId, a.step, "Fine");
    await hr.ok("offers", "send", s.offerId);
    const mail = await mailTo(candidateEmail, /Your offer/);
    expect(mail.text).toContain("Dear Rutendo,");
    expect(mail.text).toContain("Your package");
    expect(mail.text).toContain("Welcome aboard.");
    // Plain text: no merge fields or formatting tags left (text the Word file itself contained stays as text).
    expect(mail.text).not.toMatch(/\{\{|<\/?(p|h2|strong|em|ul|li|br)\b/);
    expect(mail.text).not.toContain("within 7 days");
  });
});
