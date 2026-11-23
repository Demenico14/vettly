import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { emptyDraft } from "@/lib/workflow";
import { Client, PASSWORD, cleanUp, email, mailTo, newOrganisation } from "../support/api";

/** The workspace around the work: activity feed, notifications, the team list and plan and billing. */
let admin: Client;
const recruiter = new Client();
let vacancyId: string;

beforeAll(async () => {
  ({ client: admin } = await newOrganisation("ruvimbo", "Workspace Org"));
  const address = email("kuda");
  await admin.ok("settings", "invite", [{ name: "Kuda Tester", email: address, role: "recruiter", department: "" }]);
  const token = (await mailTo(address, /invited you/)).text.match(/\/invite\/([A-Za-z0-9_-]+)/)![1]!;
  await recruiter.ok("auth", "acceptInvitation", token, { name: "Kuda Tester", password: PASSWORD });
  // The recruiter opens a vacancy, so the admin has something from someone else.
  vacancyId = (await recruiter.ok<{ id: string }>("vacancies", "create", { ...emptyDraft(), title: "Yard Planner", department: "Operations", location: "Bulawayo" }, true)).id;
});

afterAll(cleanUp);

type Note = { id: string; title: string; href?: string };

describe("activity and notifications", () => {
  it("gives every activity event its own id and a page to open", async () => {
    const snap = await admin.ok<{ activity: { id: string; href?: string }[] }>("dashboard", "getSnapshot", "30d");
    expect(snap.activity.length).toBeGreaterThan(0);
    expect(new Set(snap.activity.map((a) => a.id)).size).toBe(snap.activity.length);
    expect(snap.activity.every((a) => a.href?.startsWith("/"))).toBe(true);
  });

  it("tells people what others did, linked to it, and not what they did themselves", async () => {
    const mine = await admin.ok<Note[]>("notifications", "list");
    expect(mine.some((n) => n.href === `/vacancies/${vacancyId}`)).toBe(true);
    const theirs = await recruiter.ok<Note[]>("notifications", "list");
    expect(theirs.some((n) => n.href === `/vacancies/${vacancyId}`)).toBe(false);
  });
});

describe("team and billing", () => {
  it("shows when people were last active", async () => {
    const { members } = await admin.ok<{ members: { email: string; lastActiveAt: string | null }[] }>("settings", "members");
    expect(members.every((m) => m.lastActiveAt)).toBe(true);
  });

  it("describes the free trial and names the organisation's real admins", async () => {
    const sub = await recruiter.ok<{ trial: boolean; admins: string[]; paymentMethod: unknown }>("settings", "subscription");
    expect(sub.trial).toBe(true);
    expect(sub.admins.length).toBe(1);
    expect(sub.admins.join()).not.toContain("Kuda");
    expect(sub.paymentMethod ?? null).toBeFalsy();
  });
});

describe("pages", () => {
  it("sends a new offer without a candidate to the picker", async () => {
    const res = await admin.raw("/offers/new");
    expect([307, 308]).toContain(res.status);
    expect(res.headers.get("location")).toContain("/offers?new=1");
  });
});
