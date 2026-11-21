import { describe, expect, it } from "vitest";
import { permissionsFor, registry } from "@/server/registry";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/settings-defaults";

const needs = (service: string, method: string) => permissionsFor(service, method).map((p) => p.permission);

describe("permissions map", () => {
  it("guards the actions that change hiring outcomes", () => {
    expect(needs("offers", "approve")).toContain("approve_offers");
    expect(needs("offers", "hire")).toContain("make_offers");
    expect(needs("pipeline", "move")).toContain("move_candidates");
    expect(needs("vacancies", "create")).toContain("manage_vacancies");
    expect(needs("assessments", "send")).toContain("send_tests");
    expect(needs("interviews", "decide")).toContain("interview");
  });

  it("keeps test reports and analytics behind their own permissions", () => {
    expect(needs("assessments", "invitation")).toContain("view_test_reports");
    expect(needs("analytics", "report")).toContain("view_analytics");
  });

  it("applies a service-wide rule to every method of that service", () => {
    expect(needs("talent", "search")).toContain("view_candidates");
    expect(needs("talent", "deleteRecord")).toContain("view_candidates");
  });

  it("only names actions that exist", () => {
    const exists = (key: string) => {
      const [service, method] = key.split(".") as [string, string];
      const entry = registry[service];
      return !!entry && (method === "*" || typeof entry.impl[method] === "function");
    };
    const all = ["profiles", "candidates", "talent", "search", "matching", "cv", "vacancies", "pipeline", "interviews", "offers", "assessments", "analytics"]
      .flatMap((s) => Object.keys(registry[s]!.impl).map((m) => [s, m] as const))
      .filter(([s, m]) => permissionsFor(s, m).length > 0);
    expect(all.length).toBeGreaterThan(40);
    for (const [s, m] of all) expect(exists(`${s}.${m}`)).toBe(true);
  });

  it("matches the default roles: hiring managers approve offers but can't move candidates or send tests", () => {
    const hm = DEFAULT_ROLE_PERMISSIONS.hiring_manager;
    expect(hm).toContain("approve_offers");
    expect(hm).not.toContain("move_candidates");
    expect(hm).not.toContain("send_tests");
    expect(DEFAULT_ROLE_PERMISSIONS.recruiter).not.toContain("approve_offers");
  });

  it("never lets candidate links reach organisation services", () => {
    for (const [name, entry] of Object.entries(registry)) {
      if (name === "candidateAccess") expect(entry.access).toBe("candidate");
      else expect(entry.access).not.toBe("candidate");
    }
  });
});
