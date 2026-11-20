/**
 * Settings service (Module 14). In-memory, with every change written to the audit log.
 * The signed-in user is Tendai Moyo, an HR manager: she can change settings and users but not billing.
 */
import type { AuditEvent, DataRequest, Member, OrgRole, OrgSettings, Permission, RolePermissions, Subscription } from "@/types/settings";
import { auditSeed, dataRequests as seedRequests, members as seedMembers, rolePermissions as seedRoles, settingsSeed, subscriptionSeed, ROLE_LABEL } from "@/mocks/settings";
import { MOCK_NOW, users } from "@/mocks/data";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(v: T): T => structuredClone(v);
const me = users[0]!.name;
const MY_ID = "usr_tendai";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let settings: OrgSettings = clone(settingsSeed);
let roles: RolePermissions = clone(seedRoles);
const people: Member[] = clone(seedMembers);
const requests: DataRequest[] = clone(seedRequests);
const subscription: Subscription = clone(subscriptionSeed);
const audit: AuditEvent[] = clone(auditSeed);
let seq = 100;
let clock = new Date(MOCK_NOW).getTime();

/** Each change gets a slightly later timestamp so the log stays in order. */
function log(category: AuditEvent["category"], action: string, detail: string) {
  clock += 60000;
  audit.unshift({ id: `aud_${++seq}`, at: new Date(clock).toISOString(), actor: me, category, action, detail, ip: "196.27.112.18" });
}

const SECTION_LABEL: Record<keyof OrgSettings, string> = {
  profile: "organisation profile",
  branding: "branding",
  recruitment: "recruitment settings",
  assessments: "assessment settings",
  notifications: "notification preferences",
  privacy: "privacy settings",
};

/** Short description of which fields changed, for the audit log. */
function changes(before: object, after: object): string {
  const keys = Object.keys(after).filter((k) => JSON.stringify((before as Record<string, unknown>)[k]) !== JSON.stringify((after as Record<string, unknown>)[k]));
  const words = keys.map((k) => k.replace(/([A-Z])/g, " $1").toLowerCase());
  return words.length ? words.slice(0, 4).join(", ") + (words.length > 4 ? ` and ${words.length - 4} more` : "") : "no changes";
}

const seats = () => people.filter((p) => p.status !== "deactivated").length;
const activeAdmins = () => people.filter((p) => p.role === "org_admin" && p.status === "active").length;

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

export const mockSettings: SettingsService = {
  async get() {
    await wait(300);
    return clone(settings);
  },
  async save(section, value) {
    await wait(450);
    if (section === "profile") {
      const p = value as OrgSettings["profile"];
      if (!p.legalName.trim()) throw new Error("Enter the organisation's legal name.");
      if (p.website && !/^https?:\/\//.test(p.website)) throw new Error("Start the website with https://");
    }
    if (section === "branding" && !/^#[0-9a-fA-F]{6}$/.test((value as OrgSettings["branding"]).colour)) throw new Error("Enter a 6-digit hex colour, for example #16624F.");
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
      if (!EMAIL.test(p.dpoEmail)) throw new Error("Enter a valid email for data protection requests.");
    }
    const detail = changes(settings[section], value);
    settings = { ...settings, [section]: clone(value) };
    log("settings", `Changed ${SECTION_LABEL[section]}`, detail.charAt(0).toUpperCase() + detail.slice(1));
    return clone(value);
  },
  async members() {
    await wait(300);
    return { members: clone(people), seatsUsed: seats(), seatsTotal: subscription.seatsTotal, me: MY_ID };
  },
  async invite(input) {
    await wait(500);
    if (seats() + input.length > subscription.seatsTotal) throw new Error(`That needs ${seats() + input.length - subscription.seatsTotal} more seat(s) than your plan has. Deactivate someone or ask an organisation admin to add seats.`);
    const out: Member[] = [];
    for (const i of input) {
      const email = i.email.trim().toLowerCase();
      if (!EMAIL.test(email)) throw new Error(`${i.email || "An email"} isn't a valid email address.`);
      if (people.some((p) => p.email.toLowerCase() === email)) throw new Error(`${email} is already a member.`);
      const name = i.name.trim() || email.split("@")[0]!.split(/[._]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      const m: Member = { id: `usr_new_${++seq}`, name, email, title: "", department: i.department, role: i.role, status: "invited", lastActiveAt: null, invitedAt: new Date(clock).toISOString(), twoFactor: false };
      people.push(m);
      out.push(m);
      log("users", "Invited user", `${name} as ${ROLE_LABEL[i.role]}`);
    }
    subscription.seatsUsed = seats();
    return clone(out);
  },
  async setRole(id, role) {
    await wait(300);
    const m = people.find((p) => p.id === id)!;
    if (id === MY_ID) throw new Error("You can't change your own role. Ask an organisation admin.");
    if (m.role === "org_admin" && role !== "org_admin" && activeAdmins() <= 1) throw new Error("Keep at least one organisation admin.");
    const from = m.role;
    m.role = role;
    log("users", "Changed role", `${m.name}: ${ROLE_LABEL[from]} → ${ROLE_LABEL[role]}`);
    return clone(m);
  },
  async resendInvite(id) {
    await wait(300);
    const m = people.find((p) => p.id === id)!;
    m.invitedAt = new Date(clock).toISOString();
    log("users", "Resent invitation", m.name);
  },
  async cancelInvite(id) {
    await wait(300);
    const i = people.findIndex((p) => p.id === id);
    const [m] = people.splice(i, 1);
    subscription.seatsUsed = seats();
    log("users", "Cancelled invitation", m!.name);
  },
  async deactivate(id) {
    await wait(350);
    if (id === MY_ID) throw new Error("You can't deactivate yourself.");
    const m = people.find((p) => p.id === id)!;
    if (m.role === "org_admin" && activeAdmins() <= 1) throw new Error("Keep at least one organisation admin.");
    m.status = "deactivated";
    subscription.seatsUsed = seats();
    log("users", "Deactivated user", `${m.name}. They can no longer sign in; their history stays.`);
    return clone(m);
  },
  async reactivate(id) {
    await wait(350);
    if (seats() >= subscription.seatsTotal) throw new Error("No seats free. Deactivate someone or add seats first.");
    const m = people.find((p) => p.id === id)!;
    m.status = "active";
    subscription.seatsUsed = seats();
    log("users", "Reactivated user", m.name);
    return clone(m);
  },
  async roles() {
    await wait(250);
    return clone(roles);
  },
  async setPermission(role, permission, on) {
    await wait(250);
    if (role === "org_admin") throw new Error("Organisation admins always have every permission.");
    if (permission === "manage_billing") throw new Error("Only organisation admins can manage billing.");
    const list = new Set(roles[role]);
    if (on) list.add(permission);
    else list.delete(permission);
    roles = { ...roles, [role]: [...list] };
    log("settings", "Changed role permissions", `${ROLE_LABEL[role]}: ${on ? "can now" : "can no longer"} ${permission.replace(/_/g, " ")}`);
    return clone(roles);
  },
  async dataRequests() {
    await wait(250);
    return clone(requests);
  },
  async completeRequest(id) {
    await wait(350);
    const r = requests.find((x) => x.id === id)!;
    r.status = "completed";
    log("data", "Completed data request", `${r.kind.charAt(0).toUpperCase() + r.kind.slice(1)} request for ${r.person}`);
    return clone(r);
  },
  async subscription() {
    await wait(250);
    return clone({ ...subscription, seatsUsed: seats() });
  },
  async audit() {
    await wait(300);
    return clone(audit);
  },
};
