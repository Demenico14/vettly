import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { emptyDraft } from "@/lib/workflow";
import { Client, cleanUp, newOrganisation, pdf } from "../support/api";

/**
 * Two organisations side by side. Whatever one creates must be invisible and untouchable from the other,
 * from a signed-out browser, and from a candidate's test link.
 */
let a: Awaited<ReturnType<typeof newOrganisation>>;
let b: Awaited<ReturnType<typeof newOrganisation>>;
let vacancyId: string;
let fileId: string;

beforeAll(async () => {
  a = await newOrganisation("ayanda", "Isolation Alpha");
  b = await newOrganisation("bongani", "Isolation Beta");
  const v = await a.client.ok<{ id: string }>("vacancies", "create", { ...emptyDraft(), title: "Alpha Secret Role", department: "Operations", location: "Harare" }, true);
  vacancyId = v.id;
  fileId = (await a.client.upload("alpha.pdf", pdf(["Alpha confidential document"]), "application/pdf")).fileId;
});

afterAll(cleanUp);

describe("one organisation can't reach another's data", () => {
  it("doesn't list the other organisation's vacancies", async () => {
    const mine = await b.client.ok<{ id: string }[]>("vacancies", "list");
    expect(mine.map((v) => v.id)).not.toContain(vacancyId);
    expect((await a.client.ok<{ id: string }[]>("vacancies", "list")).map((v) => v.id)).toContain(vacancyId);
  });

  it("can't open, change or rank another organisation's vacancy by id", async () => {
    for (const [s, m, args] of [
      ["vacancies", "get", [vacancyId]],
      ["vacancies", "setStatus", [vacancyId, "paused", "test"]],
      ["vacancies", "candidatesFor", [vacancyId]],
      ["matching", "rank", [vacancyId]],
      ["pipeline", "board", [vacancyId]],
    ] as const) {
      const r = await b.client.call(s, m, ...args);
      expect(r.ok, `${s}.${m} should fail`).toBe(false);
    }
    const still = await a.client.ok<{ status: string }>("vacancies", "get", vacancyId);
    expect(still.status).toBe("open");
  });

  it("doesn't find the other organisation's records in search", async () => {
    const hits = await b.client.ok<{ id: string }[]>("search", "search", "Alpha Secret");
    expect(hits.map((h) => h.id)).not.toContain(vacancyId);
  });

  it("can't download another organisation's file", async () => {
    expect((await b.client.raw(`/api/files/${fileId}`)).status).toBe(404);
    expect((await a.client.raw(`/api/files/${fileId}`)).status).toBe(200);
  });

  it("can't attach another organisation's file to its own records", async () => {
    const own = (await b.client.ok<{ id: string }>("vacancies", "create", { ...emptyDraft(), title: "Beta Role", department: "Operations", location: "Harare" }, true)).id;
    const r = await b.client.call("cv", "upload", own, "Beta Role", [{ name: "alpha.pdf", sizeKb: 1, fileId }]);
    expect(r.ok).toBe(false);
  });

  it("can't send its own CVs into another organisation's vacancy", async () => {
    const mine = await b.client.upload("beta.pdf", pdf(["Beta CV"]), "application/pdf");
    const r = await b.client.call("cv", "upload", vacancyId, "Alpha Secret Role", [{ name: "beta.pdf", sizeKb: 1, fileId: mine.fileId }]);
    expect(r.ok).toBe(false);
  });

  it("sees only its own team and audit log", async () => {
    const members = await b.client.ok<{ members: { email: string }[] }>("settings", "members");
    expect(members.members.map((m) => m.email)).toEqual([b.email]);
    const audit = await b.client.ok<unknown[]>("settings", "audit");
    expect(JSON.stringify(audit)).not.toContain("Isolation Alpha");
  });
});

describe("outsiders", () => {
  it("signed out: every organisation action and file is refused", async () => {
    const anon = new Client();
    for (const [s, m] of [["vacancies", "list"], ["settings", "get"], ["session", "getCurrentUser"], ["platform", "snapshot"]] as const) {
      const r = await anon.call(s, m);
      expect(r.status, `${s}.${m}`).toBe(401);
    }
    expect((await anon.raw(`/api/files/${fileId}`)).status).toBe(401);
    expect((await anon.raw("/api/files", { method: "POST", body: new FormData() })).status).toBe(401);
  });

  it("a normal admin can't use platform administration", async () => {
    const r = await a.client.call("platform", "snapshot");
    expect(r.status).toBe(403);
  });

  it("only a service's own methods can be called", async () => {
    for (const path of ["vacancies/constructor", "vacancies/__proto__", "vacancies/toString", "constructor/x", "__proto__/x", "vacancies/assist", "cv/subscribe"]) {
      const res = await a.client.raw(`/api/rpc/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: '{"args":[]}' });
      expect(res.status, path).toBe(404);
    }
  });

  it("an invalid candidate link reveals nothing", async () => {
    const r = await new Client().call("candidateAccess", "open", "not-a-real-token-1234567890");
    expect(r.ok).toBe(false);
    expect(r.code).toBe("token_invalid");
  });
});
