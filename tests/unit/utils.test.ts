import { describe, expect, it } from "vitest";
import { dotted } from "@/lib/utils";

describe("dotted", () => {
  it("joins the parts that have text, with no stray separators", () => {
    expect(dotted("Finance Manager", "Harare")).toBe("Finance Manager · Harare");
    expect(dotted("", "Harare")).toBe("Harare");
    expect(dotted("Finance Manager", null, undefined, false, "  ")).toBe("Finance Manager");
    expect(dotted()).toBe("");
  });
});
