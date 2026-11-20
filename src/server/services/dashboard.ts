/**
 * Dashboard: every figure is worked out from the organisation's own records.
 */
import "server-only";
import type { ActivityEvent, ApplicationStage, AttentionItem, CandidateProfile, DashboardPeriod, DashboardSnapshot, FunnelStep, Kpi, RecentApplication } from "@/types";
import { HISTORY_LABEL } from "@/lib/dashboard";
import { profileSnapshot } from "./candidates";
import { vacancySnapshot } from "./vacancies";
import { invitationStore, summaryOf } from "./assessments";
import { upcomingSlots, nameOf, loadInterviewersForDashboard } from "./interviews";
import { batchStore } from "./cv";
import { offerStore } from "./offers";
import { auditLog } from "./settings";


export interface DashboardService {
  getSnapshot(period: DashboardPeriod): Promise<DashboardSnapshot>;
  getFunnel(period: DashboardPeriod, vacancyId: string | "all"): Promise<FunnelStep[]>;
}

const DAY = 86_400_000;
const SPAN: Record<DashboardPeriod, number> = { "7d": 7 * DAY, "30d": 30 * DAY, "90d": 90 * DAY };
const BUCKET: Record<DashboardPeriod, number> = { "7d": DAY, "30d": 7 * DAY, "90d": 30 * DAY };
const FUNNEL: ApplicationStage[] = ["applied", "screening", "shortlisted", "assessment", "interview", "offer", "hired"];
const t = (iso: string) => new Date(iso).getTime();

function apps() {
  return profileSnapshot().flatMap((c) => c.applications.map((a) => ({ c, a })));
}

/** When an application first reached a stage (or a later one), if it did. */
function reachedAt(a: CandidateProfile["applications"][number], stage: ApplicationStage) {
  if (stage === "applied") return a.appliedAt;
  const order = FUNNEL.indexOf(stage);
  const e = a.history.find((h) => FUNNEL.indexOf(h.stage) >= order);
  return e?.at ?? null;
}

function countIn(times: (string | null)[], from: number, to: number) {
  return times.filter((x) => x && t(x) > from && t(x) <= to).length;
}

function history(times: (string | null)[], period: DashboardPeriod) {
  const now = Date.now();
  return Array.from({ length: 8 }, (_, i) => {
    const end = now - (7 - i) * BUCKET[period];
    return countIn(times, end - BUCKET[period], end);
  });
}

function median(xs: number[]) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2);
}

function kpis(period: DashboardPeriod): Kpi[] {
  const now = Date.now();
  const span = SPAN[period];
  const all = apps();
  const applied = all.map(({ a }) => a.appliedAt);
  const shortlisted = all.map(({ a }) => reachedAt(a, "shortlisted"));
  const hires = all.map(({ a }) => ({ applied: a.appliedAt, hired: a.history.find((h) => h.stage === "hired")?.at ?? null })).filter((h) => h.hired);
  const tth = (from: number, to: number) => median(hires.filter((h) => t(h.hired!) > from && t(h.hired!) <= to).map((h) => (t(h.hired!) - t(h.applied)) / DAY));
  const openNow = vacancySnapshot().filter((v) => v.status === "open");
  const openAt = (when: number) => vacancySnapshot().filter((v) => v.history.some((h) => h.status === "open" && t(h.at) <= when) && !v.history.some((h) => (h.status === "closed" || h.status === "filled") && t(h.at) <= when)).length;
  const pct = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 100) : 0);
  const appsNow = countIn(applied, now - span, now);
  const appsPrev = countIn(applied, now - 2 * span, now - span);
  const slNow = countIn(shortlisted, now - span, now);
  const slPrev = countIn(shortlisted, now - 2 * span, now - span);
  const testsOpen = invitationStore.filter((r) => ["sent", "opened", "in_progress"].includes(r.status));
  const upcoming = upcomingSlots(7);
  const label = HISTORY_LABEL[period];
  const tthNow = tth(now - span, now);
  return [
    { id: "open", label: "Open vacancies", value: openNow.length, delta: openNow.length - openAt(now - span), better: "none", history: Array.from({ length: 8 }, (_, i) => openAt(now - (7 - i) * BUCKET[period])), historyLabel: label, href: "/vacancies" },
    { id: "applications", label: "Applications", value: appsNow, delta: pct(appsNow, appsPrev), deltaUnit: "%", better: "up", history: history(applied, period), historyLabel: label, href: "/candidates" },
    { id: "shortlisted", label: "Shortlisted", value: slNow, delta: slNow - slPrev, better: "up", history: history(shortlisted, period), historyLabel: label, href: "/pipeline" },
    { id: "tests", label: "Tests awaiting completion", value: testsOpen.length, delta: 0, better: "down", history: history(testsOpen.map((r) => r.sentAt), period), historyLabel: label, href: "/assessments" },
    { id: "interviews", label: "Interviews next 7 days", value: upcoming.length, delta: 0, better: "none", history: Array.from({ length: 8 }, (_, i) => (i === 7 ? upcoming.length : 0)), historyLabel: label, href: "/interviews" },
    {
      id: "tth",
      label: "Median time to hire",
      value: tthNow,
      unit: "days",
      delta: tthNow - tth(now - 2 * span, now - span),
      better: "down",
      history: Array.from({ length: 8 }, (_, i) => {
        const end = now - (7 - i) * BUCKET[period];
        return tth(end - BUCKET[period], end);
      }),
      historyLabel: label,
      href: "/analytics",
    },
  ];
}

function attention(): AttentionItem[] {
  const out: AttentionItem[] = [];
  const toReview = apps().filter(({ a }) => a.provenance === "ai_illustrative" && a.matchScore > 0 && !["rejected", "withdrawn", "hired"].includes(a.stage));
  if (toReview.length) {
    const byVac = new Map<string, number>();
    toReview.forEach(({ a }) => byVac.set(a.vacancyTitle, (byVac.get(a.vacancyTitle) ?? 0) + 1));
    out.push({ id: "att_ai", kind: "ai_review", title: "Automatic assessments awaiting your review", detail: [...byVac].map(([v, n]) => `${v} (${n})`).slice(0, 3).join(" and "), count: toReview.length, href: "/matching" });
  }
  const results = invitationStore.filter((r) => r.status === "completed" && !r.review.reviewed);
  if (results.length) out.push({ id: "att_tests", kind: "test_results", title: "Test results ready", detail: results.slice(0, 3).map((r) => r.candidateName).join(", "), count: results.length, href: "/assessments" });
  const cvs = batchStore.flatMap((b) => b.files.filter((f) => f.status === "failed" || f.status === "needs_review").map((f) => ({ f, b })));
  if (cvs.length) out.push({ id: "att_cv", kind: "cv_failed", title: "CVs need checking", detail: [...new Set(cvs.map((x) => x.b.vacancyTitle))].join(", "), count: cvs.length, href: "/cv-processing" });
  for (const o of offerStore.filter((x) => x.status === "sent" || x.status === "viewed")) {
    out.push({ id: `att_offer_${o.id}`, kind: "offer_pending", title: "Offer awaiting candidate response", detail: `${o.candidateName}, ${o.vacancyTitle}`, count: 1, href: `/offers/${o.id}` });
  }
  const soon = vacancySnapshot().filter((v) => v.status === "open" && v.closesAt && t(v.closesAt) > Date.now() && t(v.closesAt) - Date.now() < 3 * DAY);
  for (const v of soon) out.push({ id: `att_close_${v.id}`, kind: "closing_soon", title: `${v.title} closes soon`, detail: new Date(v.closesAt!).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }), count: 1, href: `/vacancies/${v.id}` });
  return out;
}

function activity(): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const { c, a } of apps()) {
    for (const h of a.history) {
      events.push({
        id: `act_${a.id}_${h.at}_${h.stage}`,
        kind: h.stage === "applied" ? "application" : "stage",
        actor: h.stage === "applied" ? c.name : h.by,
        text: h.stage === "applied" ? `applied for ${a.vacancyTitle}` : `moved ${c.name} to ${h.stage}`,
        context: h.note ? `${a.vacancyTitle} · “${h.note.slice(0, 80)}”` : a.vacancyTitle,
        at: h.at,
      });
    }
  }
  for (const r of invitationStore) {
    const done = r.status === "completed" ? r.audit.filter((e) => e.action === "completed").at(-1) : undefined;
    if (done) events.push({ id: `act_tst_${r.id}`, kind: "assessment", actor: r.candidateName, text: "completed their tests", context: r.vacancyTitle, at: done.at });
    events.push({ id: `act_snt_${r.id}`, kind: "assessment", actor: r.sentBy, text: `sent tests to ${r.candidateName}`, context: r.vacancyTitle, at: r.sentAt });
  }
  for (const o of offerStore)
    for (const h of o.history) {
      // Steps Vettly takes itself read as "<candidate>'s offer: fully approved"; people's steps as "<person> approved (<candidate>)".
      const system = h.by === "Vettly";
      const text = `${h.text.charAt(0).toLowerCase()}${h.text.slice(1)}`.replace(/\.\s*Ready to send\.$/, ", ready to send").replace(/\.$/, "");
      events.push({ id: `act_off_${o.id}_${h.at}`, kind: "offer", actor: system ? `${o.candidateName}'s offer:` : h.by, text: system ? text : `${text} (${o.candidateName})`, context: o.vacancyTitle, at: h.at });
    }
  for (const v of vacancySnapshot()) for (const h of v.history.filter((x) => x.status !== "draft")) events.push({ id: `act_vac_${v.id}_${h.at}_${h.status}`, kind: "vacancy", actor: h.by, text: `${h.status === "open" ? "opened" : h.status} ${v.title}`, context: h.reason ? `“${h.reason}”` : v.reference, at: h.at });
  void auditLog;
  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20);
}

export const dashboardService: DashboardService = {
  async getSnapshot(period) {
    await loadInterviewersForDashboard();
    const recent: RecentApplication[] = apps()
      .sort((x, y) => y.a.appliedAt.localeCompare(x.a.appliedAt))
      .slice(0, 8)
      .map(({ c, a }) => ({ id: c.id, name: c.name, headline: c.headline, location: c.location, appliedFor: a.vacancyTitle, stage: a.stage, matchScore: a.matchScore, provenance: a.provenance, appliedAt: a.appliedAt, topSkills: c.skills.slice(0, 3).map((s) => s.name), source: a.source as RecentApplication["source"] }));
    const counts = (vacId: string) => {
      const list = apps().filter(({ a }) => a.vacancyId === vacId);
      return {
        applicants: list.length,
        newApplicants: list.filter(({ a }) => a.stage === "applied" && Date.now() - t(a.appliedAt) < 7 * DAY).length,
        shortlisted: list.filter(({ a }) => ["shortlisted", "assessment", "interview", "offer", "hired"].includes(a.stage)).length,
        interviewing: list.filter(({ a }) => a.stage === "interview").length,
      };
    };
    return {
      period,
      kpis: kpis(period),
      attention: attention(),
      vacancies: vacancySnapshot()
        .filter((v) => v.status === "open" || v.status === "paused")
        .map((v) => ({ id: v.id, title: v.title, department: v.department, location: v.location, status: v.status, openedAt: v.openedAt, closesAt: v.closesAt, hiringManager: v.hiringManager, ...counts(v.id) })),
      interviews: upcomingSlots(7).map((iv) => ({
        id: iv.id,
        candidateName: iv.candidateName,
        candidateHeadline: profileSnapshot().find((c) => c.id === iv.candidateId)?.headline ?? "",
        vacancyTitle: iv.vacancyTitle,
        startsAt: iv.startsAt,
        durationMin: iv.durationMin,
        format: iv.format,
        location: iv.location,
        panel: iv.panel.map((p) => nameOf(p.interviewerId)),
        round: iv.round,
      })),
      tests: invitationStore.filter((r) => r.status !== "cancelled").map(summaryOf),
      applications: recent,
      activity: activity(),
    };
  },
  async getFunnel(period, vacancyId) {
    const now = Date.now();
    const list = apps().filter(({ a }) => (vacancyId === "all" || a.vacancyId === vacancyId) && t(a.appliedAt) > now - SPAN[period]);
    return FUNNEL.map((stage) => ({ stage, count: list.filter(({ a }) => reachedAt(a, stage)).length }));
  },
};
