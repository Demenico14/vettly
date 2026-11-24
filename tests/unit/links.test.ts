import { describe, expect, it } from "vitest";
import { displayUrl, externalUrl, linksIn, onlyLinks } from "@/lib/links";

describe("externalUrl", () => {
  it("makes addresses written without https absolute, so they don't open inside Vettly", () => {
    expect(externalUrl("linkedin.com/in/jane-doe")).toBe("https://linkedin.com/in/jane-doe");
    expect(externalUrl("www.example.co.zw")).toBe("https://www.example.co.zw/");
    expect(externalUrl("https://github.com/jane")).toBe("https://github.com/jane");
  });
  it("refuses anything that isn't a web address", () => {
    expect(externalUrl("javascript:alert(1)")).toBeNull();
    expect(externalUrl("mailto:jane@example.com")).toBeNull();
    expect(externalUrl("not a link")).toBeNull();
    expect(externalUrl("")).toBeNull();
  });
  it("shortens links for display", () => {
    expect(displayUrl("https://www.example.co.zw/")).toBe("example.co.zw");
  });
});

describe("linksIn", () => {
  it("finds LinkedIn, GitHub and a website on the usual contact line", () => {
    const cv = "Dominic Example\n+263 77 000 0000 · dom@gmail.com · Harare\nlinkedin.com/in/domexample · github.com/domexample · moderndigitallabs.co.zw";
    expect(linksIn(cv)).toEqual({
      linkedin: "https://linkedin.com/in/domexample",
      github: "https://github.com/domexample",
      website: "https://moderndigitallabs.co.zw/",
    });
  });
  it("doesn't take an email domain, a version number or a file for a website", () => {
    expect(linksIn("jane@outlook.com · OAuth 2.0 · Node 18.2.1 · report.pdf").website).toBeNull();
  });
  it("returns nothing when a CV lists no links", () => {
    expect(linksIn("Jane Doe\nAccountant, Harare")).toEqual({ linkedin: null, github: null, website: null });
  });
});

describe("onlyLinks", () => {
  it("spots a line of links, so it's never taken for a headline", () => {
    expect(onlyLinks("linkedin.com/in/dominicmushayi · github.com/demenico14 · moderndigitallabs.co.zw")).toBe(true);
    expect(onlyLinks("Software Engineering Intern")).toBe(false);
    expect(onlyLinks("Data Engineer at example.com")).toBe(false);
  });
});
