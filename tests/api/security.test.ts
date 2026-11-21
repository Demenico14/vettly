import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { Client, PASSWORD, cleanUp, email, mailTo, newOrganisation, pdf } from "../support/api";

/**
 * Security controls from docs/reports/reports/SaaS RBAC and tenant isolation.md: privilege escalation, CSRF,
 * headers, sign-in throttling, rate limits, password rules, file access by role, session idle timeout, and
 * row-level security checked directly as the app's database user.
 */
const OWNER_DB = process.env.DATABASE_URL_TEST ?? "postgres://vettly:vettly-dev-password@localhost:5432/vettly";
const APP_DB = process.env.APP_DATABASE_URL_TEST ?? "postgres://vettly_app:vettly-app-dev-password@localhost:5432/vettly";

let admin: Awaited<ReturnType<typeof newOrganisation>>;
const hr = new Client();
let hrId: string;
const hiring = new Client();
let hiringId: string;
let fileId: string;

async function join(c: Client, who: string, role: string) {
  const address = email(who);
  await admin.client.ok("settings", "invite", [{ name: `${who} Tester`, email: address, role, department: "" }]);
  const token = (await mailTo(address, /invited you/)).text.match(/\/invite\/([A-Za-z0-9_-]+)/)![1]!;
  return (await c.ok<{ user: { id: string } }>("auth", "acceptInvitation", token, { name: `${who} Tester`, password: PASSWORD })).user.id;
}

beforeAll(async () => {
  admin = await newOrganisation("sipho", "Security Org");
  hrId = await join(hr, "hlengiwe", "hr_manager");
  hiringId = await join(hiring, "tafadzwa", "hiring_manager");
  fileId = (await admin.client.upload("cv.pdf", pdf(["Security test CV"]), "application/pdf")).fileId;
});

afterAll(cleanUp);

describe("privilege escalation", () => {
  it("an HR manager can't invite or promote anyone to organisation admin", async () => {
    const invite = await hr.call("settings", "invite", [{ name: "X", email: email("xadmin"), role: "org_admin", department: "" }]);
    expect(invite.error).toMatch(/Only an organisation admin/);
    const promote = await hr.call("settings", "setRole", hiringId, "org_admin");
    expect(promote.error).toMatch(/Only an organisation admin/);
  });

  it("an HR manager can't demote or deactivate an organisation admin", async () => {
    const { me } = await admin.client.ok<{ me: string }>("settings", "members");
    expect((await hr.call("settings", "setRole", me, "recruiter")).error).toMatch(/Only an organisation admin/);
    expect((await hr.call("settings", "deactivate", me)).error).toMatch(/Only an organisation admin/);
  });

  it("an HR manager can't change what roles may do, including their own", async () => {
    expect((await hr.call("settings", "setPermission", "hr_manager", "manage_billing", true)).error).toMatch(/Only an organisation admin/);
    expect((await hr.call("settings", "setPermission", "recruiter", "approve_offers", true)).error).toMatch(/Only an organisation admin/);
  });

  it("an HR manager can still manage roles below their own", async () => {
    await hr.ok("settings", "invite", [{ name: "Rec", email: email("rec"), role: "recruiter", department: "" }]);
  });

  it("nobody can change their own role", async () => {
    expect((await hr.call("settings", "setRole", hrId, "recruiter")).error).toMatch(/your own role/);
  });

  it("privacy requests and the audit log need the settings permission", async () => {
    expect((await hiring.call("settings", "audit")).error).toMatch(/Your role can't/);
    expect((await hiring.call("settings", "dataRequests")).error).toMatch(/Your role can't/);
    await admin.client.ok("settings", "audit");
  });
});

describe("files by role", () => {
  it("a role that can't see candidates can't download their files", async () => {
    expect((await hiring.raw(`/api/files/${fileId}`)).status).toBe(200);
    await admin.client.ok("settings", "setPermission", "hiring_manager", "view_candidates", false);
    try {
      expect((await hiring.raw(`/api/files/${fileId}`)).status).toBe(403);
    } finally {
      await admin.client.ok("settings", "setPermission", "hiring_manager", "view_candidates", true);
    }
  });
});

describe("cross-site requests (CSRF)", () => {
  const post = (c: Client, headers: Record<string, string>, body = '{"args":[]}') => c.raw("/api/rpc/vacancies/list", { method: "POST", headers, body });

  it("refuses API calls from another site, by Fetch Metadata or Origin", async () => {
    expect((await post(admin.client, { "content-type": "application/json", "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await post(admin.client, { "content-type": "application/json", origin: "https://evil.example" })).status).toBe(403);
    expect((await post(admin.client, { "content-type": "application/json", "sec-fetch-site": "same-origin" })).status).toBe(200);
  });

  it("refuses bodies a plain HTML form could send", async () => {
    expect((await post(admin.client, { "content-type": "text/plain" })).status).toBe(415);
    expect((await post(admin.client, { "content-type": "application/x-www-form-urlencoded" }, "args=1")).status).toBe(415);
  });

  it("refuses uploads from another site", async () => {
    const form = new FormData();
    form.append("file", new File([pdf(["x"])], "x.pdf", { type: "application/pdf" }));
    expect((await admin.client.raw("/api/files", { method: "POST", body: form, headers: { "sec-fetch-site": "cross-site" } })).status).toBe(403);
  });
});

describe("headers", () => {
  it("pages forbid framing and sniffing, and don't advertise the framework", async () => {
    const res = await new Client().raw("/login");
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(res.headers.get("content-security-policy")).toContain("object-src 'none'");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(res.headers.get("x-powered-by")).toBeNull();
  });

  it("API responses and files are never cached", async () => {
    const r = await admin.client.raw("/api/rpc/vacancies/list", { method: "POST", headers: { "content-type": "application/json" }, body: '{"args":[]}' });
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect((await admin.client.raw(`/api/files/${fileId}`)).headers.get("cache-control")).toContain("no-store");
  });
});

describe("sign-in and passwords", () => {
  it("refuses short or easily guessed passwords", async () => {
    const c = new Client();
    expect((await c.call("auth", "register", { name: "Short", email: email("short"), password: "Tr0ub4dor&3" })).error).toMatch(/at least 15/);
    expect((await c.call("auth", "register", { name: "Common", email: email("common"), password: "password123456789" })).error).toMatch(/too easy to guess/);
    expect((await c.call("auth", "register", { name: "Same", email: email("same"), password: "aaaaaaaaaaaaaaaaaaaa" })).error).toMatch(/too easy to guess/);
  });

  it("pauses sign-in after repeated failures instead of locking the account, and a reset lifts the pause", async () => {
    const target = email("nyasha");
    const c = new Client();
    await c.ok("auth", "register", { name: "Nyasha Tester", email: target, password: PASSWORD });
    await c.ok("auth", "verifyEmail", target, (await mailTo(target, /code/)).subject.match(/\d{6}/)![0]);
    for (let i = 0; i < 5; i++) await c.call("auth", "signIn", target, "wrong-password-attempt", false);
    const paused = await c.call("auth", "signIn", target, PASSWORD, false);
    expect(paused.ok).toBe(false);
    expect(paused.error).toMatch(/Try again in \d+ minutes/);

    await c.ok("auth", "requestPasswordReset", target);
    const token = (await mailTo(target, /Reset your/)).text.match(/token=([A-Za-z0-9_-]+)/)![1]!;
    const fresh = "Mopani-Baobab-Kariba-2031";
    await c.ok("auth", "resetPassword", token, fresh);
    await c.ok("auth", "signIn", target, fresh, false);
    expect((await c.call("auth", "resetPassword", token, "Another-Long-Passphrase-9")).ok).toBe(false);
  });

  it("rate-limits password reset requests per client", async () => {
    const c = new Client();
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await c.call("auth", "requestPasswordReset", email("nobody")));
    expect(results.slice(0, 5).every((r) => r.ok)).toBe(true);
    expect(results[5]!.status).toBe(429);
    expect(results[5]!.code).toBe("rate_limited");
  });
});

describe("sessions", () => {
  it("ends a session after it has been idle too long", async () => {
    const c = new Client();
    await c.ok("auth", "signIn", admin.email, PASSWORD, false);
    await c.ok("vacancies", "list");
    const owner = postgres(OWNER_DB, { max: 1, onnotice: () => {} });
    try {
      await owner`update sessions set last_seen_at = now() - interval '3 hours' where user_id = (select id from users where email = ${admin.email}) and remember = false`;
    } finally {
      await owner.end();
    }
    expect((await c.call("vacancies", "list")).status).toBe(401);
  });

  it("uses an HttpOnly, SameSite cookie", async () => {
    const res = await new Client().raw("/api/rpc/auth/signIn", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ args: [admin.email, PASSWORD, false] }) });
    const cookie = res.headers.getSetCookie().find((c) => /vettly_session=/.test(c))!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });
});

describe("row-level security in the database", () => {
  it("the app's database user has no superuser or bypass rights", async () => {
    const app = postgres(APP_DB, { max: 1, onnotice: () => {} });
    try {
      const [me] = await app<{ super: boolean; bypass: boolean }[]>`select rolsuper as super, rolbypassrls as bypass from pg_roles where rolname = current_user`;
      expect(me).toEqual({ super: false, bypass: false });
    } finally {
      await app.end();
    }
  });

  it("every tenant table has row-level security enabled and forced", async () => {
    const owner = postgres(OWNER_DB, { max: 1, onnotice: () => {} });
    try {
      const rows = await owner<{ relname: string; on: boolean; forced: boolean }[]>`
        select relname, relrowsecurity as on, relforcerowsecurity as forced from pg_class where relname in ('records', 'files')`;
      expect(rows).toHaveLength(2);
      for (const r of rows) expect(r, r.relname).toMatchObject({ on: true, forced: true });
    } finally {
      await owner.end();
    }
  });

  it("as the app: nothing without an organisation, only its own rows with one, and no writes into another", async () => {
    const app = postgres(APP_DB, { max: 1, onnotice: () => {} });
    try {
      const [unset] = await app<{ n: number }[]>`select count(*)::int as n from records`;
      expect(unset!.n).toBe(0);
      const mine = await app.begin(async (tx) => {
        await tx`select set_config('app.org', ${admin.organisationId}, true)`;
        return tx<{ organisation_id: string }[]>`select distinct organisation_id from records`;
      });
      expect(mine.map((r) => r.organisation_id)).toEqual([admin.organisationId]);
      const write = app.begin(async (tx) => {
        await tx`select set_config('app.org', 'org_someone_else', true)`;
        await tx`insert into records (organisation_id, kind, id, data) values (${admin.organisationId}, 'probe', 'x', '{}')`;
      });
      await expect(write).rejects.toThrow(/row-level security/);
      const [after] = await app<{ v: string | null }[]>`select nullif(current_setting('app.org', true), '') as v`;
      expect(after!.v).toBeNull();
    } finally {
      await app.end();
    }
  });
});
