import { describe, expect, it } from "vitest";
import { cleanCvText } from "@/server/engine/cv-parser";

describe("cleanCvText", () => {
  it("joins letter-spaced headings into words", () => {
    expect(cleanCvText("P R O F E S S I O N A L E X P E R I E N C E")).toBe("Professional Experience");
    expect(cleanCvText("E D U C AT I O N & C E R T I F I C AT I O N S")).toBe("Education & Certifications");
    expect(cleanCvText("K E Y P R O J E C T S\nR E F E R E N C E S")).toBe("Key Projects\nReferences");
  });
  it("leaves ordinary lines and short capitals alone", () => {
    expect(cleanCvText("BSc (Hons) Computer Science, UZ")).toBe("BSc (Hons) Computer Science, UZ");
    expect(cleanCvText("IT HR QA")).toBe("IT HR QA");
  });
  it("rejoins words hyphenated across lines", () => {
    expect(cleanCvText("security by implement-\ning OAuth 2.0")).toBe("security by implementing\nOAuth 2.0");
    expect(cleanCvText("Month-\nEnd close")).toBe("Month-\nEnd close");
  });
});

describe("dateRangeIn", () => {
  it("reads open-ended ranges written as 'to date'", async () => {
    const { dateRangeIn } = await import("@/server/engine/cv-parser");
    expect(dateRangeIn("2021 to date ... Fleet Supervisor")).toMatchObject({ start: "2021-01", end: null });
    expect(dateRangeIn("Nov 2024 – Nov 2025")).toMatchObject({ start: "2024-11", end: "2025-11" });
  });
});
