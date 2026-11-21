import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { emptyDraft } from "@/lib/workflow";
import { Client, PASSWORD, cleanUp, email, mailTo, newOrganisation } from "../support/api";

/** Invites a recruiter and a hiring manager, and checks each role is refused what it isn't allowed to do. */
let admin: Client;
const recruiter = new Client();
const manager = new Client();
let recruiterId: string;
let vacancyId: string;

async function join(c: Client, who: string, role: string) {
  const address = email(who);
  await admin.ok("settings", "invite", [{ name: `${who} Tester`, email: address, role, department: "" }]);
  const mail = await mailTo(address, /invited you/);
  const token = mail.text.match(/\/invite\/([A-Za-z0-9_-]+)/)![1]!;
  const inv = await c.ok<{ role: string; email: string }>("auth", "getInvitation", token);
  expect(inv).toMatchObject({ role, email: address });
  const s = await c.ok<{ user: { id: string; role: string } }>("auth", "acceptInvitation", token, { name: `${who} Tester`, password: PASSWORD });
  expect(s.user.role).toBe(role);
  // The link works once.
  expect((await new Client().call("auth", "acceptInvitation", token, { name: "Again", password: PASSWORD })).ok).toBe(false);
  return s.user.id;
}

beforeAll(async () => {
  ({ client: admin } = await newOrganisation("thandi", "Roles Org"));
  vacancyId = (await admin.ok<{ id: string }>("vacancies", "create", { ...emptyDraft(), title: "Depot Supervisor", department: "Operations", location: "Gweru" }, true)).id;
  recruiterId = await join(recruiter, "rufaro", "recruiter");
  await join(manager, "mandla", "hiring_manager");
});

afterAll(cleanUp);

const refused = async (c: Client, service: string, method: string, ...args: unknown[]) => {
  const r = await c.call(service, method, ...args);
  expect(r.ok, `${service}.${method} should be refused`).toBe(false);
  expect(r.error).toMatch(/Your role can't/);
};

describe("recruiter", () => {
  it("can work with vacancies and candidates", async () => {
    expect((await recruiter.ok<{ id: string }[]>("vacancies", "list")).map((v) => v.id)).toContain(vacancyId);
    await recruiter.ok("analytics", "report", { period: "90d", department: "all", vacancyId: "all" });
  });

  it("can't approve offers, manage people or change organisation settings", async () => {
    await refused(recruiter, "offers", "approve", "off_x", 1, "");
    await refused(recruiter, "settings", "invite", [{ name: "X", email: email("x"), role: "org_admin", department: "" }]);
    await refused(recruiter, "settings", "setPermission", "recruiter", "approve_offers", true);
    const s = await admin.ok<Record<string, unknown>>("settings", "get");
    await refused(recruiter, "settings", "save", "recruitment", s.recruitment);
  });

  it("can still change their own notification preferences", async () => {
    const s = await recruiter.ok<{ notifications: unknown }>("settings", "get");
    await recruiter.ok("settings", "save", "notifications", s.notifications);
  });
});

describe("hiring manager", () => {
  it("can't create vacancies, move candidates, send tests, make offers or see analytics", async () => {
    await refused(manager, "vacancies", "create", { ...emptyDraft(), title: "Not allowed" }, false);
    await refused(manager, "pipeline", "move", [{ candidateId: "cnd_x", applicationId: "app_x" }], "shortlisted", "");
    await refused(manager, "assessments", "send", {});
    await refused(manager, "offers", "create", "cnd_x", vacancyId, {}, false);
    await refused(manager, "analytics", "report", { period: "90d", department: "all", vacancyId: "all" });
  });

  it("gets past the permission check for approving offers", async () => {
    const r = await manager.call("offers", "approve", "off_missing", 1, "");
    expect(r.ok).toBe(false);
    expect(r.error).not.toMatch(/Your role can't/);
  });
});

describe("admin controls", () => {
  it("changes to a role's permissions apply immediately, both ways", async () => {
    const q = { period: "90d", department: "all", vacancyId: "all" };
    await admin.ok("settings", "setPermission", "recruiter", "view_analytics", false);
    await refused(recruiter, "analytics", "report", q);
    await admin.ok("settings", "setPermission", "recruiter", "view_analytics", true);
    await recruiter.ok("analytics", "report", q);
  });

  it("can't deactivate themselves or leave the organisation without an admin", async () => {
    const { me } = await admin.ok<{ me: string }>("settings", "members");
    expect((await admin.call("settings", "deactivate", me)).ok).toBe(false);
    expect((await admin.call("settings", "setRole", me, "recruiter")).ok).toBe(false);
  });

  it("a deactivated member is signed out straight away and can't sign in; once reactivated they can", async () => {
    await admin.ok("settings", "deactivate", recruiterId);
    const r = await recruiter.call("vacancies", "list");
    expect(r.ok).toBe(false);
    expect([401, 403]).toContain(r.status);
    const again = new Client();
    await again.call("auth", "signIn", email("rufaro"), PASSWORD, false);
    expect((await again.call("vacancies", "list")).ok).toBe(false);
    await admin.ok("settings", "reactivate", recruiterId);
    await again.ok("auth", "signIn", email("rufaro"), PASSWORD, false);
    await again.ok("vacancies", "list");
  });
});
