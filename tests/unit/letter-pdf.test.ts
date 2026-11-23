import { describe, expect, it } from "vitest";
import { letterPdf, standardLetterHtml } from "@/server/letter-pdf";
import type { Letterhead } from "@/lib/letterhead";

const head: Letterhead = { organisationId: "org_x", name: "Acme Freight", colour: "#16624F", logoFileId: null, showName: true, contact: ["12 Samora Machel Ave, Harare", "+263 24 270 0000 · acme.example"], footer: "Acme Freight (Pvt) Ltd · Registration no. 1234/2019" };

/** Each page's text, read back with the same PDF reader Vettly uses for CVs. */
async function pdfPages(pdf: Buffer) {
  const { getDocumentProxy, extractText } = await import("unpdf");
  const doc = await getDocumentProxy(new Uint8Array(pdf));
  return (await extractText(doc, { mergePages: false })).text as string[];
}

describe("offer letter PDF", () => {
  it("renders a real PDF with the letterhead on it", async () => {
    const pdf = await letterPdf({ title: "Offer", html: "<p>Dear <strong>Tariro</strong>,</p><h2>Your package</h2><ul><li>Basic salary</li></ul>", head, logo: null });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1500);
    const [page] = await pdfPages(pdf);
    expect(page).toMatch(/Acme Freight/);
    expect(page).toMatch(/Private and confidential/);
    expect(page).toMatch(/12 Samora Machel Ave, Harare/);
    expect(page).toMatch(/Dear Tariro/);
    expect(page).toMatch(/Your package/);
    expect(page).toMatch(/Registration no\. 1234\/2019/);
  });

  it("puts the header and footer on every page of a long letter", async () => {
    const long = Array.from({ length: 120 }, (_, i) => `<p>Clause ${i + 1}: the terms of this offer are as set out above and in the staff handbook.</p>`).join("");
    const pdf = await letterPdf({ title: "Offer", html: long, head, logo: null });
    const pages = await pdfPages(pdf);
    expect(pages.length).toBeGreaterThan(1);
    pages.forEach((p, i) => {
      expect(p).toMatch(/Acme Freight/);
      expect(p).toMatch(/Registration no/);
      expect(p).toMatch(new RegExp(`Page ${i + 1} of ${pages.length}`));
    });
  });
});

describe("standard letter as HTML", () => {
  it("escapes text, keeps line breaks and turns bullet lines into a list", () => {
    expect(standardLetterHtml([{ heading: null, body: "Dear A & B," }, { heading: "Benefits", body: "• Medical aid\n• Pension" }, { heading: "Terms", body: "Start: Monday.\nProbation: 3 months." }])).toBe(
      "<p>Dear A &amp; B,</p><h2>Benefits</h2><ul><li>Medical aid</li><li>Pension</li></ul><h2>Terms</h2><p>Start: Monday.<br>Probation: 3 months.</p>",
    );
  });
});
