import { describe, expect, it } from "vitest";
import { brandedHtml, emailStyled, textToHtml } from "@/server/org-mail";
import type { Letterhead } from "@/lib/letterhead";

const head: Letterhead = { organisationId: "org_x", name: 'Acme & "Sons"', colour: "#16624F", logoFileId: null, showName: true, contact: ["12 Samora Machel Ave"], footer: "Acme <Pvt> Ltd" };

describe("branded email", () => {
  it("turns text into paragraphs with line breaks and links, escaping everything else", () => {
    expect(textToHtml("Hello <b>Tariro</b>,\n\nStart here:\nhttps://vettly.example/t/abc123.\nThanks")).toBe(
      '<p style="margin:0 0 14px">Hello &lt;b&gt;Tariro&lt;/b&gt;,</p><p style="margin:0 0 14px">Start here:<br><a href="https://vettly.example/t/abc123" style="color:inherit;font-weight:600">https://vettly.example/t/abc123</a>.<br>Thanks</p>',
    );
  });

  it("escapes the organisation's name and footer, and uses initials without a logo", () => {
    const html = brandedHtml(head, false, "<p>Body</p>", "Subject");
    expect(html).toContain("Acme &amp; &quot;Sons&quot;");
    expect(html).toContain("Acme &lt;Pvt&gt; Ltd");
    expect(html).not.toContain("cid:logo");
    expect(html).toContain(">A&amp;</div>"); // the initials of 'Acme & "Sons"', escaped
  });

  it("references the logo sent inside the email when there is one", () => {
    expect(brandedHtml(head, true, "<p>Body</p>", "Subject")).toContain('src="cid:logo"');
  });

  it("styles letter tags inline, since many email apps ignore style sheets", () => {
    expect(emailStyled("<h2>Pay</h2><p>Text</p><ul><li>One</li></ul>")).toBe(
      '<h2 style="font-size:17px;line-height:1.3;margin:20px 0 6px">Pay</h2><p style="margin:0 0 12px">Text</p><ul style="margin:0 0 12px;padding-left:22px"><li style="margin:0 0 4px">One</li></ul>',
    );
  });
});
