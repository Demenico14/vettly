/**
 * Helpers for API tests. They drive a running Vettly (VETTLY_TEST_URL, default http://localhost:3000) the way the
 * screens do, read emails from Mailpit (MAILPIT_URL), and remove everything they created from Postgres
 * (DATABASE_URL_TEST, default the local Docker database). Test accounts use the @vettly-test.local domain.
 */
import postgres from "postgres";
import { crc32 } from "node:zlib";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const BASE = process.env.VETTLY_TEST_URL ?? "http://localhost:3000";
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";
const DB = process.env.DATABASE_URL_TEST ?? "postgres://vettly:vettly-dev-password@localhost:5432/vettly";
export const TEST_DOMAIN = "vettly-test.local";

const run = Math.random().toString(36).slice(2, 8);
export const email = (who: string) => `${who}.${run}@${TEST_DOMAIN}`;
export const PASSWORD = "Granite-Kopje-2031!";

export type Reply<T = unknown> = { status: number; ok: boolean; data: T; error?: string; code?: string };

/** One browser: keeps its own cookies. */
export class Client {
  private jar = new Map<string, string>();
  /** Each test browser looks like its own client, so repeated runs don't share rate-limit buckets. */
  constructor(public address = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`) {}

  private remember(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const [k, ...v] = pair!.split("=");
      const value = v.join("=");
      if (/max-age=0|expires=thu, 01 jan 1970/i.test(c) || value === "") this.jar.delete(k!.trim());
      else this.jar.set(k!.trim(), value);
    }
  }

  get cookie() {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  async raw(path: string, init: RequestInit = {}) {
    const res = await fetch(`${BASE}${path}`, { ...init, redirect: "manual", headers: { "x-forwarded-for": this.address, ...(init.headers ?? {}), ...(this.jar.size ? { cookie: this.cookie } : {}) } });
    this.remember(res);
    return res;
  }

  async call<T = unknown>(service: string, method: string, ...args: unknown[]): Promise<Reply<T>> {
    const res = await this.raw(`/api/rpc/${service}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ args }) });
    const body = (await res.json()) as { ok: boolean; data?: T; error?: string; code?: string };
    return { status: res.status, ok: body.ok, data: body.data as T, error: body.error, code: body.code };
  }

  /** Calls and fails the test with the server's message if it didn't work. */
  async ok<T = unknown>(service: string, method: string, ...args: unknown[]): Promise<T> {
    const r = await this.call<T>(service, method, ...args);
    if (!r.ok) throw new Error(`${service}.${method} failed (${r.status}): ${r.error}`);
    return r.data;
  }

  async upload(name: string, bytes: Uint8Array<ArrayBuffer>, type: string) {
    const form = new FormData();
    form.append("file", new File([bytes], name, { type }));
    const res = await this.raw("/api/files", { method: "POST", body: form });
    const body = (await res.json()) as { ok: boolean; data?: { fileId: string; name: string; sizeKb: number }; error?: string };
    if (!body.ok || !body.data) throw new Error(`upload failed: ${body.error}`);
    return body.data;
  }
}

type MailSummary = { ID: string; Subject: string; To: { Address: string }[]; Created: string };

/** Waits for the newest email to `to` whose subject matches, and returns its subject and text. */
export async function mailTo(to: string, subject: RegExp, timeoutMs = 10_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}&limit=20`);
    const list = (await res.json()) as { messages: MailSummary[] };
    const m = list.messages.find((x) => subject.test(x.Subject));
    if (m) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json()) as { Subject: string; Text: string };
      return { subject: full.Subject, text: full.Text };
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`No email to ${to} matching ${subject} within ${timeoutMs} ms`);
}

export const codeIn = (s: string) => s.match(/\b(\d{6})\b/)![1]!;

/** Registers, verifies the email, creates an organisation and finishes setup. Returns the signed-in client. */
export async function newOrganisation(who: string, orgName: string) {
  const c = new Client();
  const address = email(who);
  await c.ok("auth", "register", { name: `${who[0]!.toUpperCase()}${who.slice(1)} Tester`, email: address, password: PASSWORD });
  const mail = await mailTo(address, /code/);
  await c.ok("auth", "verifyEmail", address, codeIn(mail.subject));
  await c.ok("auth", "signIn", address, PASSWORD, false);
  const slug = `${orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${run}`;
  const { id } = await c.ok<{ id: string }>("auth", "createOrganisation", { name: orgName, industry: "Transport & logistics", size: "51-200", country: "Zimbabwe", city: "Bulawayo", slug });
  await c.ok("auth", "completeSetup", id, {
    brandColour: "#16624F",
    logoFileName: null,
    currency: "USD",
    timezone: "Africa/Harare",
    stages: [],
    defaultTestDeadlineDays: 5,
    sendTestsOnShortlist: true,
    defaultBattery: null,
    invites: [],
  });
  return { client: c, email: address, organisationId: id };
}

/** A small, valid one-page PDF containing the given lines of text. */
export function pdf(lines: string[]) {
  const esc = (s: string) => s.replace(/[\\()]/g, (m) => `\\${m}`);
  const stream = ["BT", "/F1 11 Tf", "14 TL", "50 780 Td", ...lines.map((l) => `(${esc(l)}) Tj T*`), "ET"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(out, "latin1")) as Uint8Array<ArrayBuffer>;
}

/** Deletes every organisation, account and stored file the tests created. Mailpit messages are left for inspection. */
export async function cleanUp() {
  const sql = postgres(DB, { max: 1, onnotice: () => {} });
  try {
    const users = await sql<{ id: string }[]>`select id from users where email like ${"%@" + TEST_DOMAIN}`;
    const ids = users.map((u) => u.id);
    if (!ids.length) return;
    const orgs = await sql<{ organisation_id: string }[]>`select distinct organisation_id from memberships where user_id in ${sql(ids)}`;
    const orgIds = orgs.map((o) => o.organisation_id);
    const keys = orgIds.length ? await sql<{ storage_key: string }[]>`select storage_key from files where organisation_id in ${sql(orgIds)}` : [];
    await sql.begin(async (tx) => {
      if (orgIds.length) {
        await tx`delete from sessions where organisation_id in ${tx(orgIds)}`;
        await tx`delete from tokens where organisation_id in ${tx(orgIds)}`;
        await tx`delete from records where organisation_id in ${tx(orgIds)}`;
        await tx`delete from files where organisation_id in ${tx(orgIds)}`;
        await tx`delete from memberships where organisation_id in ${tx(orgIds)}`;
      }
      await tx`delete from sessions where user_id in ${tx(ids)}`;
      await tx`delete from tokens where email like ${"%@" + TEST_DOMAIN}`;
      await tx`delete from memberships where user_id in ${tx(ids)}`;
      await tx`delete from users where id in ${tx(ids)}`;
      if (orgIds.length) await tx`delete from organisations where id in ${tx(orgIds)}`;
    });
    await removeObjects(keys.map((k) => k.storage_key));
  } finally {
    await sql.end();
  }
}

async function removeObjects(keys: string[]) {
  const endpoint = process.env.S3_ENDPOINT_TEST ?? "http://localhost:8333";
  if (!keys.length) return;
  const s3 = new S3Client({
    endpoint,
    region: "af-south-1",
    forcePathStyle: true,
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY ?? "vettly", secretAccessKey: process.env.S3_SECRET_KEY ?? "vettly-dev-secret" },
  });
  for (const Key of keys) await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET ?? "vettly-documents", Key })).catch(() => undefined);
}

/** A minimal, valid .docx built from paragraphs. Each paragraph is a list of runs; style names a Word paragraph style. */
export function docx(paragraphs: { style?: string; runs: { text: string; bold?: boolean }[] }[]) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = paragraphs
    .map((p) => `<w:p>${p.style ? `<w:pPr><w:pStyle w:val="${p.style}"/></w:pPr>` : ""}${p.runs.map((r) => `<w:r>${r.bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${esc(r.text)}</w:t></w:r>`).join("")}</w:p>`)
    .join("");
  const files: [string, string][] = [
    ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`],
    ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
    ["word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`],
  ];
  return zip(files.map(([name, text]) => [name, Buffer.from(text, "utf8")]));
}

/** A zip archive with stored (uncompressed) entries. */
function zip(entries: [string, Buffer][]) {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, data] of entries) {
    const n = Buffer.from(name, "utf8");
    const crc = crc32(data) >>> 0;
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(data.length, 18);
    head.writeUInt32LE(data.length, 22);
    head.writeUInt16LE(n.length, 26);
    local.push(head, n, data);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(data.length, 20);
    dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(n.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, n);
    offset += 30 + n.length + data.length;
  }
  const size = central.reduce((s, b) => s + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(size, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...local, ...central, end])) as Uint8Array<ArrayBuffer>;
}
