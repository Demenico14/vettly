/**
 * Settings service: organisation settings, members and seats, role permissions, data requests, plan and the
 * audit log. Members are real accounts (users and memberships tables); everything else is stored per organisation.
 */
import "server-only";
import { orgEmail } from "../org-mail";
import { and, eq, inArray, max, ne } from "drizzle-orm";
import type { AuditEvent, DataRequest, Member, OrgRole, OrgSettings, Permission, RolePermissions, Subscription } from "@/types/settings";
import type { OrganisationSetup } from "@/types";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, ROLE_LABEL, defaultSettings } from "@/lib/settings-defaults";
import { PLAN_LIMITS } from "@/lib/plans";
import { db, schema } from "../db";
import { fileFor } from "../files";
import { randomToken, sha256 } from "../crypto";
import { appUrl } from "../mail";
import { actor, actorName, newId, now, orgId } from "../context";
import { collection, single } from "../store";

/** A plain copy, so callers never hold the stored objects (store arrays are proxies, which structuredClone refuses). */
const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const settings = single<OrgSettings>("settings", () => defaultSettings({ name: "Your organisation", city: "", country: "", industry: "", size: "" }));
const roles = single<RolePermissions>("roles", () => clone(DEFAULT_ROLE_PERMISSIONS));
const requests = collection<DataRequest>("data_request");
const audit = collection<AuditEvent>("audit");

/* ---------- Used by other services ---------- */

/** Adds an entry to the organisation's audit log. */
export function logAudit(category: AuditEvent["category"], action: string, detail: string) {
  audit.unshift({ id: newId("aud"), at: now(), actor: actorName(), category, action, detail, ip: "" });
}

export const orgSettings = () => settings.get();
export const auditLog = () => audit;
export const referencePrefix = () => settings.get().recruitment.referencePrefix || "VAC";

/** True when the signed-in person's role has the permission. */
export function can(permission: Permission) {
  const a = actor();
  if (!a) return true; // background work and onboarding
  if (a.role === "super_admin") return false;
  return roles.get()[a.role].includes(permission);
}

export function requirePermission(permission: Permission, what: string) {
  if (!can(permission)) {
    const a = actor();
    console.warn(JSON.stringify({ event: "authz_denied", at: now(), organisation: orgId(), user: a?.userId ?? null, role: a?.role ?? null, permission }));
    throw new Error(`Your role can't ${what}. Ask an organisation admin.`);
  }
}

/**
 * Privilege-escalation guard: you may only give, change or take away a role whose permissions you hold
 * yourself. So an HR manager can manage recruiters and hiring managers, but not organisation admins.
 */
function requireCanManageRole(role: OrgRole, what: string) {
  const a = actor();
  if (!a) return;
  const mine = new Set(roles.get()[a.role as OrgRole] ?? []);
  const theirs = role === "org_admin" ? PERMISSIONS.map((p) => p.id) : roles.get()[role];
  if (a.role !== "org_admin" && !theirs.every((p) => mine.has(p))) throw new Error(`Only an organisation admin can ${what} a ${ROLE_LABEL[role].toLowerCase()}.`);
}

/** A logo must be an image this organisation uploaded, small enough to send in every email. */
export async function checkLogo(fileId: string) {
  const f = await fileFor(orgId(), fileId);
  if (!f) throw new Error("That logo didn't finish uploading. Try again.");
  if (!["image/png", "image/jpeg"].includes(f.mime)) throw new Error("Use a PNG or JPG for the logo.");
  if (f.sizeBytes > 2 * 1024 * 1024) throw new Error("Keep the logo under 2 MB.");
}

/** Fills in a new organisation's settings from its details. */
export function initialiseSettings(org: { name: string; city: string; country: string; industry: string; size: string }) {
  settings.set(defaultSettings(org));
  roles.set(clone(DEFAULT_ROLE_PERMISSIONS));
  logAudit("settings", "Created organisation", org.name);
}

/** Applies the onboarding wizard's choices. */
export function applySetup(setup: OrganisationSetup) {
  const s = clone(settings.get());
  s.branding.colour = setup.brandColour;
  s.branding.logoFileName = setup.logoFileName;
  s.branding.logoFileId = setup.logoFileId ?? null;
  s.profile.currency = setup.currency;
  s.profile.timezone = setup.timezone;
  s.assessments.deadlineDays = setup.defaultTestDeadlineDays;
  s.assessments.sendOnShortlist = setup.sendTestsOnShortlist;
  if (setup.defaultBattery) for (const k of Object.keys(s.assessments.batteries)) s.assessments.batteries[k] = setup.defaultBattery;
  settings.set(s);
  logAudit("settings", "Finished setup", "Branding, recruitment defaults and assessments");
}

/* ---------- Members ---------- */

async function memberRows(): Promise<Member[]> {
  const rows = await db
    .select({ m: schema.memberships, u: schema.users })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(eq(schema.memberships.organisationId, orgId()));
  // Last active: the most recent request on any of their sessions in this organisation, or their last sign-in.
  const seen = rows.length
    ? await db
        .select({ userId: schema.sessions.userId, at: max(schema.sessions.lastSeenAt) })
        .from(schema.sessions)
        .where(and(eq(schema.sessions.organisationId, orgId()), inArray(schema.sessions.userId, rows.map((r) => r.u.id))))
        .groupBy(schema.sessions.userId)
    : [];
  const lastSeen = new Map(seen.map((r) => [r.userId, r.at]));
  return rows.map(({ m, u }) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    title: u.title,
    department: m.department,
    role: m.role as OrgRole,
    status: m.status as Member["status"],
    lastActiveAt: [lastSeen.get(u.id), u.lastSignInAt].filter((d): d is Date => !!d).sort((x, y) => y.getTime() - x.getTime())[0]?.toISOString() ?? null,
    invitedAt: m.status === "invited" ? m.createdAt.toISOString() : null,
    twoFactor: false,
  }));
}

/** Active members, for hiring-manager and panel pickers. */
export async function activeMembers() {
  return (await memberRows()).filter((m) => m.status === "active");
}

async function org() {
  const [o] = await db.select().from(schema.organisations).where(eq(schema.organisations.id, orgId()));
  if (!o) throw new Error("This organisation no longer exists.");
  return o;
}

async function sendInviteEmail(email: string, userId: string, role: OrgRole) {
  const o = await org();
  const token = randomToken();
  await db.delete(schema.tokens).where(and(eq(schema.tokens.purpose, "invite"), eq(schema.tokens.organisationId, o.id), eq(schema.tokens.ref, userId)));
  await db.insert(schema.tokens).values({
    id: sha256(token),
    purpose: "invite",
    email,
    organisationId: o.id,
    ref: userId,
    data: { role, invitedBy: actorName(), invitedByTitle: actor()?.title ?? "" },
    expiresAt: new Date(Date.now() + 7 * 86_400_000),
  });
  orgEmail({
    to: email,
    subject: `${actorName()} invited you to ${o.name} on Vettly`,
    text: `${actorName()} invited you to join ${o.name} on Vettly as ${ROLE_LABEL[role].toLowerCase()}.\n\nAccept the invitation (the link works for 7 days):\n${appUrl()}/invite/${token}`,
  });
}

/** Invites one person. Shared by Settings and the onboarding wizard. */
export async function inviteMember(i: { name: string; email: string; role: OrgRole; department: string }): Promise<Member> {
  const email = i.email.trim().toLowerCase();
  if (!EMAIL.test(email)) throw new Error(`${i.email || "An email"} isn't a valid email address.`);
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing) {
    const [m] = await db.select().from(schema.memberships).where(and(eq(schema.memberships.userId, existing.id), eq(schema.memberships.organisationId, orgId())));
    if (m) throw new Error(`${email} is already a member.`);
  }
  const name = i.name.trim() || existing?.name || email.split("@")[0]!.split(/[._]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const userId = existing?.id ?? newId("usr");
  if (!existing) await db.insert(schema.users).values({ id: userId, email, name });
  await db.insert(schema.memberships).values({ userId, organisationId: orgId(), role: i.role, status: "invited", department: i.department });
  await sendInviteEmail(email, userId, i.role);
  logAudit("users", "Invited user", `${name} as ${ROLE_LABEL[i.role]}`);
  return { id: userId, name, email, title: existing?.title ?? "", department: i.department, role: i.role, status: "invited", lastActiveAt: null, invitedAt: now(), twoFactor: false };
}

async function setMembership(userId: string, patch: Partial<typeof schema.memberships.$inferInsert>) {
  await db.update(schema.memberships).set(patch).where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.organisationId, orgId())));
}

async function seatsUsed() {
  const rows = await db.select().from(schema.memberships).where(and(eq(schema.memberships.organisationId, orgId()), ne(schema.memberships.status, "deactivated")));
  return rows.length;
}

/* ---------- Service ---------- */

const SECTION_LABEL: Record<keyof OrgSettings, string> = {
  profile: "organisation profile",
  branding: "branding",
  recruitment: "recruitment settings",
  assessments: "assessment settings",
  notifications: "notification preferences",
  privacy: "privacy settings",
};

function changes(before: object, after: object): string {
  const keys = Object.keys(after).filter((k) => JSON.stringify((before as Record<string, unknown>)[k]) !== JSON.stringify((after as Record<string, unknown>)[k]));
  const words = keys.map((k) => k.replace(/([A-Z])/g, " $1").toLowerCase());
  return words.length ? words.slice(0, 4).join(", ") + (words.length > 4 ? ` and ${words.length - 4} more` : "") : "no changes";
}

export interface SettingsService {
  get(): Promise<OrgSettings>;
  save<K extends keyof OrgSettings>(section: K, value: OrgSettings[K]): Promise<OrgSettings[K]>;
  members(): Promise<{ members: Member[]; seatsUsed: number; seatsTotal: number; me: string }>;
  invite(input: { name: string; email: string; role: OrgRole; department: string }[]): Promise<Member[]>;
  setRole(id: string, role: OrgRole): Promise<Member>;
  resendInvite(id: string): Promise<void>;
  cancelInvite(id: string): Promise<void>;
  deactivate(id: string): Promise<Member>;
  reactivate(id: string): Promise<Member>;
  roles(): Promise<RolePermissions>;
  setPermission(role: OrgRole, permission: Permission, on: boolean): Promise<RolePermissions>;
  dataRequests(): Promise<DataRequest[]>;
  completeRequest(id: string): Promise<DataRequest>;
  subscription(): Promise<Subscription>;
  audit(): Promise<AuditEvent[]>;
}

export const settingsService: SettingsService = {
  async get() {
    return clone(settings.get());
  },
  async save(section, value) {
    if (section !== "notifications") requirePermission("manage_settings", "change settings");
    if (section === "profile") {
      const p = value as OrgSettings["profile"];
      if (!p.legalName.trim()) throw new Error("Enter the organisation's legal name.");
      if (p.website && !/^https?:\/\//.test(p.website)) throw new Error("Start the website with https://");
    }
    if (section === "branding") {
      const b = value as OrgSettings["branding"];
      if (!/^#[0-9a-fA-F]{6}$/.test(b.colour)) throw new Error("Enter a 6-digit hex colour, for example #16624F.");
      if ((b.letterFooter ?? "").length > 400) throw new Error("Keep the footer to 400 characters.");
      if (b.logoFileId) await checkLogo(b.logoFileId);
    }
    if (section === "assessments") {
      const rec = (value as OrgSettings["assessments"]).recording;
      if (rec) {
        if (!["off", "photos", "video"].includes(rec.mode)) throw new Error("Choose how candidates are recorded.");
        if (!Number.isInteger(rec.keepDays) || rec.keepDays < 7 || rec.keepDays > 30) throw new Error("Keep recordings for 7 to 30 days after the application closes.");
        if (rec.mode !== "video") rec.audio = false;
      }
    }
    if (section === "recruitment") {
      const r = value as OrgSettings["recruitment"];
      const total = Object.values(r.defaultWeights).reduce((s, n) => s + n, 0);
      if (total !== 100) throw new Error(`Screening weights add up to ${total}%. Make them total 100%.`);
      if (!r.rejectionReasons.length) throw new Error("Keep at least one rejection reason: every rejection needs one.");
    }
    if (section === "assessments") {
      const a = value as OrgSettings["assessments"];
      if (!a.inviteEmailBody.includes("{{link}}")) throw new Error("The invitation email must include {{link}}, or candidates can't start.");
      if (!a.inviteSms.includes("{{link}}")) throw new Error("The SMS must include {{link}}.");
      if (a.inviteSms.length > 160) throw new Error("Keep the SMS to 160 characters so it sends as one message.");
    }
    if (section === "privacy") {
      const p = value as OrgSettings["privacy"];
      if (p.dpoEmail && !EMAIL.test(p.dpoEmail)) throw new Error("Enter a valid email for data protection requests.");
    }
    const current = settings.get();
    const detail = changes(current[section], value);
    settings.set({ ...current, [section]: clone(value) });
    if (section === "profile") {
      const p = value as OrgSettings["profile"];
      await db
        .update(schema.organisations)
        .set({ name: p.legalName.trim(), shortName: p.tradingName.trim() || p.legalName.trim(), city: p.city, country: p.country, industry: p.industry, size: p.size })
        .where(eq(schema.organisations.id, orgId()));
    }
    logAudit("settings", `Changed ${SECTION_LABEL[section]}`, detail.charAt(0).toUpperCase() + detail.slice(1));
    return clone(value);
  },
  async members() {
    const o = await org();
    return { members: await memberRows(), seatsUsed: await seatsUsed(), seatsTotal: o.seatsTotal, me: actor()?.userId ?? "" };
  },
  async invite(input) {
    requirePermission("manage_users", "invite people");
    const o = await org();
    const used = await seatsUsed();
    if (used + input.length > o.seatsTotal) throw new Error(`That needs ${used + input.length - o.seatsTotal} more seat(s) than your plan has. Deactivate someone or ask an organisation admin to add seats.`);
    const out: Member[] = [];
    for (const i of input) requireCanManageRole(i.role, "invite");
    for (const i of input) out.push(await inviteMember(i));
    return out;
  },
  async setRole(id, role) {
    requirePermission("manage_users", "change roles");
    if (id === actor()?.userId) throw new Error("You can't change your own role. Ask another organisation admin.");
    const people = await memberRows();
    const m = people.find((p) => p.id === id);
    if (!m) throw new Error("That person isn't in this organisation.");
    requireCanManageRole(m.role, "change the role of");
    requireCanManageRole(role, "make someone");
    if (m.role === "org_admin" && role !== "org_admin" && people.filter((p) => p.role === "org_admin" && p.status === "active").length <= 1) throw new Error("Keep at least one organisation admin.");
    await setMembership(id, { role });
    logAudit("users", "Changed role", `${m.name}: ${ROLE_LABEL[m.role]} → ${ROLE_LABEL[role]}`);
    return { ...m, role };
  },
  async resendInvite(id) {
    requirePermission("manage_users", "invite people");
    const m = (await memberRows()).find((p) => p.id === id && p.status === "invited");
    if (!m) throw new Error("That invitation has already been accepted or cancelled.");
    await sendInviteEmail(m.email, m.id, m.role);
    logAudit("users", "Resent invitation", m.name);
  },
  async cancelInvite(id) {
    requirePermission("manage_users", "cancel invitations");
    const m = (await memberRows()).find((p) => p.id === id && p.status === "invited");
    if (!m) throw new Error("That invitation has already been accepted or cancelled.");
    await db.delete(schema.memberships).where(and(eq(schema.memberships.userId, id), eq(schema.memberships.organisationId, orgId())));
    await db.delete(schema.tokens).where(and(eq(schema.tokens.purpose, "invite"), eq(schema.tokens.ref, id), eq(schema.tokens.organisationId, orgId())));
    logAudit("users", "Cancelled invitation", m.name);
  },
  async deactivate(id) {
    requirePermission("manage_users", "deactivate people");
    if (id === actor()?.userId) throw new Error("You can't deactivate yourself.");
    const people = await memberRows();
    const m = people.find((p) => p.id === id);
    if (!m) throw new Error("That person isn't in this organisation.");
    requireCanManageRole(m.role, "deactivate");
    if (m.role === "org_admin" && people.filter((p) => p.role === "org_admin" && p.status === "active").length <= 1) throw new Error("Keep at least one organisation admin.");
    await setMembership(id, { status: "deactivated" });
    await db.delete(schema.sessions).where(and(eq(schema.sessions.userId, id), eq(schema.sessions.organisationId, orgId())));
    logAudit("users", "Deactivated user", `${m.name}. They can no longer sign in here; their history stays.`);
    return { ...m, status: "deactivated" };
  },
  async reactivate(id) {
    requirePermission("manage_users", "reactivate people");
    const o = await org();
    if ((await seatsUsed()) >= o.seatsTotal) throw new Error("No seats free. Deactivate someone or add seats first.");
    const m = (await memberRows()).find((p) => p.id === id);
    if (!m) throw new Error("That person isn't in this organisation.");
    requireCanManageRole(m.role, "reactivate");
    await setMembership(id, { status: "active" });
    logAudit("users", "Reactivated user", m.name);
    return { ...m, status: "active" };
  },
  async roles() {
    return clone(roles.get());
  },
  async setPermission(role, permission, on) {
    requirePermission("manage_users", "change permissions");
    // Editing what a role can do changes access for everyone in it, so only organisation admins may.
    if (actor() && actor()!.role !== "org_admin") throw new Error("Only an organisation admin can change what a role can do.");
    if (role === "org_admin") throw new Error("Organisation admins always have every permission.");
    if (permission === "manage_billing") throw new Error("Only organisation admins can manage billing.");
    const r = roles.get();
    const list = new Set(r[role]);
    if (on) list.add(permission);
    else list.delete(permission);
    roles.set({ ...r, [role]: [...list] });
    logAudit("settings", "Changed role permissions", `${ROLE_LABEL[role]}: ${on ? "can now" : "can no longer"} ${permission.replace(/_/g, " ")}`);
    return clone(roles.get());
  },
  async dataRequests() {
    requirePermission("manage_settings", "see data requests");
    return clone(requests);
  },
  async completeRequest(id) {
    requirePermission("manage_settings", "complete data requests");
    const r = requests.find((x) => x.id === id);
    if (!r) throw new Error("That request no longer exists.");
    r.status = "completed";
    logAudit("data", "Completed data request", `${r.kind.charAt(0).toUpperCase() + r.kind.slice(1)} request for ${r.person}`);
    return clone(r);
  },
  async subscription() {
    const o = await org();
    const { invitationStore } = await import("./assessments");
    const { batchStore } = await import("./cv");
    const lim = PLAN_LIMITS[o.plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.growth;
    const renew = new Date(o.createdAt);
    renew.setFullYear(renew.getFullYear() + 1);
    return {
      plan: o.plan as Subscription["plan"],
      billing: o.plan === "starter" ? "monthly" : "annual",
      priceUsd: o.status === "trial" ? 0 : lim.price,
      renewsAt: (o.status === "trial" && o.trialEndsAt ? o.trialEndsAt : renew).toISOString(),
      seatsUsed: await seatsUsed(),
      seatsTotal: o.seatsTotal,
      testCreditsUsed: invitationStore.reduce((s, r) => s + r.results.length, 0),
      testCreditsTotal: o.testCreditsTotal,
      cvCreditsUsed: batchStore.reduce((s, b) => s + b.files.length, 0),
      cvCreditsTotal: lim.cvs,
      invoices: [],
      paymentMethod: o.status === "trial" ? "" : "Invoiced by bank transfer",
      trial: o.status === "trial",
      admins: (await activeMembers()).filter((m) => m.role === "org_admin").map((m) => m.name),
    };
  },
  async audit() {
    requirePermission("manage_settings", "see the audit log");
    return clone(audit);
  },
};
