import { describe, expect, it } from "vitest";
import { parseCv } from "@/server/engine/cv-parser";

const CV = `Tariro Ncube
Fleet Controller
Bulawayo, Zimbabwe
tariro.ncube@mail.test | +263 77 123 4567

Profile
Logistics professional with eight years running mixed fleets across the region.

Work experience
Fleet Controller, Kopje Freight
March 2021 - Present
Ran fleet management for 60 trucks and cut fuel use by 12%.

Transport Officer, Acme Logistics
Jan 2016 - Feb 2021
Scheduled routes and handled customs clearance at Beitbridge.

Education
BCom (Hons) Supply Chain Management
National University of Science and Technology, 2015

Skills
Fleet management, Logistics, Excel, Team leadership
`;

describe("CV parser", () => {
  const { extraction: x, looksLikeCv, confident } = parseCv(CV, 1);

  it("recognises a CV and is confident when name, contact and history are present", () => {
    expect(looksLikeCv).toBe(true);
    expect(confident).toBe(true);
  });

  it("reads contact details", () => {
    expect(x.name.value).toBe("Tariro Ncube");
    expect(x.email.value).toBe("tariro.ncube@mail.test");
    expect(x.phone.value.replace(/\s/g, "")).toContain("+263771234567");
    expect(x.location.value).toContain("Bulawayo");
  });

  it("reads work history with dates, newest first, and a current role as ongoing", () => {
    expect(x.experience.length).toBeGreaterThanOrEqual(2);
    const [current, previous] = x.experience;
    expect(current!.title).toMatch(/Fleet Controller/);
    expect(current!.start).toBe("2021-03");
    expect(current!.end).toBeNull();
    expect(previous!.start).toBe("2016-01");
    expect(previous!.end).toBe("2021-02");
  });

  it("keeps what each role involved, under the right role", () => {
    const [current, previous] = x.experience;
    expect(current!.bullets).toEqual(["Ran fleet management for 60 trucks and cut fuel use by 12%."]);
    expect(previous!.bullets).toEqual(["Scheduled routes and handled customs clearance at Beitbridge."]);
  });

  it("strips bullet marks and stops at the next section", () => {
    const r = parseCv("Jane Doe\njane@mail.test\n\nExperience\nClerk, Acme\n2019 - 2021\n• Filed invoices\n- Answered calls\nEducation\nBCom, University of Zimbabwe, 2018", 1);
    expect(r.extraction.experience[0]!.bullets).toEqual(["Filed invoices", "Answered calls"]);
  });

  it("separates the qualification from the institution", () => {
    const e = x.education[0]!;
    expect(e.qualification).toMatch(/BCom/);
    expect(e.qualification).not.toMatch(/University/);
    expect(e.institution).toMatch(/University/);
    expect(e.end).toBe(2015);
  });

  it("finds known skills", () => {
    expect(x.skills).toEqual(expect.arrayContaining(["Fleet management", "Excel", "Team leadership"]));
  });

  it("accepts a short CV with contact details and one dated role", () => {
    const r = parseCv("Jane Doe\njane@mail.test\nWork experience\nClerk, Acme\n2019 - Present", 1);
    expect(r.looksLikeCv).toBe(true);
  });

  it("reads a certifications section: the award, the issuing body and the year", () => {
    const r = parseCv(
      "Jane Doe\njane@mail.test\n\nExperience\nAccountant, Acme\n2019 - Present\n\nCertifications\nChartered Accountant CA(Z), ICAZ, 2019\n• PMP (2021) - PMI\nFirst aid certificate\n\nSkills\nExcel",
      1,
    );
    expect(r.extraction.certifications).toEqual([
      { id: "c1", name: "Chartered Accountant CA(Z)", issuer: "ICAZ", year: 2019 },
      { id: "c2", name: "PMP", issuer: "PMI", year: 2021 },
      { id: "c3", name: "First aid certificate", issuer: "", year: null, flag: "Issuing body not found" },
    ]);
  });

  it("has no certifications when the CV has no such section", () => {
    expect(parseCv(CV, 1).extraction.certifications).toEqual([]);
  });

  it("does not treat a document that isn't a CV as one", () => {
    const r = parseCv("Minutes of the board meeting held on 3 March.\nApologies were received.", 1);
    expect(r.looksLikeCv).toBe(false);
    expect(r.confident).toBe(false);
  });

  it("flags missing contact details for HR to check", () => {
    const r = parseCv("Tariro Ncube\nFleet Controller\n\nWork experience\nFleet Controller, Kopje Freight\n2021 - Present", 1);
    expect(r.extraction.email.value).toBe("");
    expect(r.extraction.email.flag).toBeTruthy();
  });
});

describe("personal-details blocks", () => {
  it("reads a labelled name, not the block's heading", () => {
    const cv = "CURRICULUM VITAE\nPersonal Details\nFull Name: Tinashe Dube\nCell: 0778 123 456\nEmail: tdube@example.com\nWork Experience\nJan 2022 – Present Motor Mechanic, Zimoco Gweru";
    expect(parseCv(cv, 1).extraction.name.value).toBe("Tinashe Dube");
  });
});
