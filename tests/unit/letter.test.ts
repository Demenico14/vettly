import { describe, expect, it } from "vitest";
import { STANDARD_TEMPLATE, fillLetter, letterText, mergeValues, unknownFields } from "@/lib/letter";
import { cleanLetter } from "@/server/letter-html";
import type { OfferTerms } from "@/types/offers";

const terms = {
  jobTitle: "Fleet Controller",
  department: "Operations",
  location: "Bulawayo",
  workMode: "On-site",
  reportsTo: "Head of Operations",
  contractType: "Permanent",
  startDate: "2031-02-02",
  probationMonths: 3,
  noticePeriodMonths: 1,
  currency: "USD",
  baseSalary: 1800,
  payPeriod: "month",
  allowances: [{ name: "Transport", amount: 200 }],
  benefits: [],
  validDays: 7,
  personalNote: "",
} as OfferTerms;
const values = mergeValues({ candidateName: "Tariro Ncube", terms, expiresAt: null }, "Acme Freight", { name: "Jane Doe", title: "HR Manager" });

describe("merge fields", () => {
  it("fills every field the standard template uses", () => {
    const out = fillLetter(STANDARD_TEMPLATE, values);
    expect(out).not.toMatch(/\{\{/);
    expect(out).toContain("Dear Tariro,");
    expect(out).toContain("USD 2");
    expect(out).toContain("2 February 2031");
    expect(out).toContain("Acme Freight");
  });

  it("escapes values, so a name can't inject markup", () => {
    const v = mergeValues({ candidateName: '<img src=x onerror="alert(1)"> Doe', terms, expiresAt: null }, "Org", { name: "", title: "" });
    expect(fillLetter("<p>{{candidate_name}}</p>", v)).toBe('<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt; Doe</p>');
  });

  it("leaves unknown fields visible and reports them", () => {
    expect(fillLetter("<p>{{fist_name}}</p>", values)).toBe("<p>{{fist_name}}</p>");
    expect(unknownFields("<p>{{first_name}} {{fist_name}} {{ salary }}</p>")).toEqual(["fist_name", "salary"]);
  });

  it("names a reply-by date: the would-be deadline before sending, the real one after", () => {
    expect(values.respond_by).toMatch(/^[A-Z][a-z]+day \d{1,2} [A-Z][a-z]+$/);
    const sent = mergeValues({ candidateName: "A B", terms, expiresAt: "2031-01-20T15:00:00Z" }, "Org", { name: "", title: "" });
    expect(sent.respond_by).toMatch(/January/);
  });
});

describe("cleaning letter HTML", () => {
  it("keeps text formatting", () => {
    expect(cleanLetter("<h2>Pay</h2><p><strong>Basic</strong> and <em>more</em></p><ul><li>One</li></ul>")).toBe("<h2>Pay</h2><p><strong>Basic</strong> and <em>more</em></p><ul><li>One</li></ul>");
  });

  it("removes scripts, styles, event handlers, links, images and attributes", () => {
    const dirty = `<p onclick="steal()" style="color:red" class="x">Hi</p><script>alert(1)</script><style>p{}</style><img src=x onerror=alert(1)><a href="javascript:alert(1)">click</a><iframe src="https://evil.example"></iframe>`;
    const clean = cleanLetter(dirty);
    expect(clean).toBe("<p>Hi</p>click");
    expect(clean).not.toMatch(/script|onerror|onclick|style|href|iframe|img/i);
  });

  it("normalises Word's tags and drops empty paragraphs", () => {
    expect(cleanLetter("<h1>Title</h1><p><b>B</b><i>I</i></p><p> </p>")).toBe("<h2>Title</h2><p><strong>B</strong><em>I</em></p>");
  });

  it("refuses letters that are far too long", () => {
    expect(() => cleanLetter(`<p>${"x".repeat(70_000)}</p>`)).toThrow(/too long/);
  });
});

describe("email text", () => {
  it("turns letter HTML into readable plain text", () => {
    expect(letterText("<p>Dear Tariro,</p><h2>Pay</h2><ul><li>Basic &amp; more</li><li>Transport</li></ul><p>Line one<br>Line two</p>")).toBe(
      "Dear Tariro,\n\nPay\n\n• Basic & more\n• Transport\n\nLine one\nLine two",
    );
  });
});
