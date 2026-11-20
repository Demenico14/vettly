"use client";

import * as React from "react";
import { Download, Search } from "@/components/icons";
import { Alert, Badge, Button, Card, Field, Input, Pagination, Progress, Select, Skeleton, Switch, Table, TBody, TD, TH, THead, TR, Tooltip, toast, usePagination } from "@/components/ui";
import { services } from "@/services";
import { normGroups, normTables, tests as catalogue } from "@/mocks/psychometrics";
import type { AiTask, AssessmentProvider, PlatformAuditEvent, PlatformSnapshot } from "@/types/platform";
import { downloadCsv } from "@/features/analytics/charts";
import { cn } from "@/lib/utils";
import { NOW, ReasonDialog, SERVICE, date, stamp, usd } from "./shared";

export function AiTab({ s, onChanged }: { s: PlatformSnapshot; onChanged: () => void }) {
  const p = s.ai.policy;
  const [change, setChange] = React.useState<{ task: AiTask; field: "model" | "fallback"; to: string } | null>(null);
  const [policy, setPolicy] = React.useState<{ field: "zeroRetention" | "redactContactDetails" | "humanReviewRequired"; value: boolean } | null>(null);
  const [budget, setBudget] = React.useState<string | null>(null);
  const spent = Math.round((100 * p.spentThisMonthUsd) / p.monthlyBudgetUsd);
  const label = (id: string) => s.ai.models.find((m) => m.id === id)?.label ?? id;
  const POLICY = [
    { field: "zeroRetention" as const, label: "Zero data retention", hint: `${p.provider} doesn't store prompts or outputs after responding.` },
    { field: "redactContactDetails" as const, label: "Remove contact details before sending", hint: "Emails, phone numbers and addresses are stripped from CVs sent to the model." },
    { field: "humanReviewRequired" as const, label: "Human review of AI assessments", hint: "Required: AI never rejects anyone. Can't be turned off." },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="p-5">
          <h2 className="text-[0.9375rem] font-semibold text-fg">Data handling</h2>
          <p className="mt-0.5 text-sm text-fg-muted">Provider: {p.provider}. These apply to every organisation.</p>
          <ul className="mt-4 flex flex-col divide-y divide-line">
            {POLICY.map((x) => (
              <li key={x.field} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <span>
                  <span className="block text-sm font-medium text-fg">{x.label}</span>
                  <span className="block text-xs text-fg-subtle">{x.hint}</span>
                </span>
                <Switch checked={p[x.field]} disabled={x.field === "humanReviewRequired"} onCheckedChange={(v) => setPolicy({ field: x.field, value: v })} aria-label={x.label} />
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="text-[0.9375rem] font-semibold text-fg">Spend this month</h2>
          <p className="mt-2 text-2xl font-bold text-fg tabular">
            {usd(p.spentThisMonthUsd)} <span className="text-sm font-medium text-fg-muted">of {usd(p.monthlyBudgetUsd)}</span>
          </p>
          <Progress value={spent} label="AI budget used" tone={spent >= 90 ? "danger" : spent >= 75 ? "warning" : "primary"} className="mt-2" />
          <p className="mt-2 text-xs text-fg-subtle">At the budget, extraction and matching queue until the next month or a raise. Illustrative figures.</p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => setBudget(String(p.monthlyBudgetUsd))}>
            Change budget
          </Button>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-[0.9375rem] font-semibold text-fg">Models by task</h2>
          <p className="mt-0.5 text-sm text-fg-muted">The fallback takes over if the main model times out or is unavailable. Agreement is the share of outputs HR accepted unchanged.</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH className="min-w-56">Task</TH>
                <TH className="min-w-48">Model</TH>
                <TH className="min-w-48">Fallback</TH>
                <TH className="text-right">HR agreement</TH>
                <TH className="text-right">Calls, 30 days</TH>
                <TH className="text-right">p95</TH>
              </TR>
            </THead>
            <TBody>
              {s.ai.tasks.map((t) => (
                <TR key={t.task}>
                  <TD>
                    <span className="block text-sm font-semibold text-fg">{t.label}</span>
                    <span className="block text-xs text-fg-subtle">{t.description}</span>
                  </TD>
                  {(["model", "fallback"] as const).map((f) => (
                    <TD key={f}>
                      <Select size="sm" value={t[f]} onValueChange={(v) => v !== t[f] && setChange({ task: t.task, field: f, to: v })} options={s.ai.models.map((m) => ({ value: m.id, label: m.label, description: m.note }))} />
                    </TD>
                  ))}
                  <TD className="text-right text-sm tabular">{t.agreement === null ? <span className="text-fg-subtle">Not reviewed</span> : <span className="font-semibold text-fg">{t.agreement}%</span>}</TD>
                  <TD className="text-right text-sm text-fg-muted tabular">
                    {t.calls30d.toLocaleString("en-GB")}
                    <span className="block text-2xs text-fg-subtle">{usd(t.cost30d)}</span>
                  </TD>
                  <TD className="text-right text-sm text-fg-muted tabular">{t.p95Seconds} s</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </Card>

      <ReasonDialog
        open={!!change}
        onOpenChange={(o) => !o && setChange(null)}
        title={change ? `${change.field === "model" ? "Change the model" : "Change the fallback"} for ${s.ai.tasks.find((x) => x.task === change.task)?.label.toLowerCase()}?` : ""}
        description={change ? `${label(s.ai.tasks.find((x) => x.task === change.task)![change.field])} → ${label(change.to)}. Applies to every organisation from the next request. Re-run the evaluation set before and after.` : undefined}
        confirmLabel="Change model"
        onConfirm={async (r) => {
          await services.platform.setModel(change!.task, change!.field, change!.to, r);
          toast.success("Model changed", `${label(change!.to)}. Recorded in the audit log.`);
          onChanged();
        }}
      />
      <ReasonDialog
        open={!!policy}
        onOpenChange={(o) => !o && setPolicy(null)}
        title={policy ? `${policy.value ? "Turn on" : "Turn off"} ${POLICY.find((x) => x.field === policy.field)?.label.toLowerCase()}?` : ""}
        description={policy && !policy.value ? "This changes how candidates' personal data is handled for every organisation. Check it against your data processing agreements first." : undefined}
        confirmLabel={policy?.value ? "Turn on" : "Turn off"}
        tone={policy && !policy.value ? "danger" : "primary"}
        onConfirm={async (r) => {
          await services.platform.setPolicy(policy!.field, policy!.value, r);
          toast.success("AI policy changed");
          onChanged();
        }}
      />
      <ReasonDialog
        open={budget !== null}
        onOpenChange={(o) => !o && setBudget(null)}
        title="Change the monthly AI budget"
        confirmLabel="Save budget"
        onConfirm={async (r) => {
          await services.platform.setBudget(Number(budget), r);
          toast.success("Budget changed", usd(Number(budget)));
          onChanged();
        }}
      >
        <Field label="Budget, US$ a month">
          <Input type="number" min={0} step={100} value={budget ?? ""} onChange={(e) => setBudget(e.target.value)} className="max-w-40" />
        </Field>
      </ReasonDialog>
    </div>
  );
}

const STATUS_TONE: Record<AssessmentProvider["status"], { label: string; dot: string }> = {
  active: { label: "Active", dot: "bg-success-500" },
  testing: { label: "Pilot", dot: "bg-secondary-500" },
  off: { label: "Off", dot: "bg-ink-400" },
};

export function AssessmentsTab({ s, onChanged }: { s: PlatformSnapshot; onChanged: () => void }) {
  const [prov, setProv] = React.useState<{ p: AssessmentProvider; to: AssessmentProvider["status"] } | null>(null);
  const [toggle, setToggle] = React.useState<{ id: string; name: string; on: boolean } | null>(null);
  const [query, setQuery] = React.useState("");
  const tests = catalogue.filter((t) => !query || `${t.name} ${t.family}`.toLowerCase().includes(query.toLowerCase()));
  const sessions = (id: string) => normTables.filter((n) => n.testId === id).reduce((a, n) => a + n.n, 0);
  const live = s.tenants.filter((t) => t.status !== "suspended").sort((a, b) => b.testCreditsUsed - a.testCreditsUsed);
  return (
    <div className="flex flex-col gap-5">
      <section>
        <h2 className="mb-3 text-[0.9375rem] font-semibold text-fg">Providers</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {s.providers.map((p) => (
            <Card key={p.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <span>
                  <span className="block text-sm font-semibold text-fg">{p.name}</span>
                  <span className="block text-xs text-fg-subtle">{p.kind === "in_house" ? "In-house" : "Partner"}</span>
                </span>
                <Badge tone="status" size="sm" dot dotClassName={STATUS_TONE[p.status].dot}>
                  {STATUS_TONE[p.status].label}
                </Badge>
              </div>
              <p className="mt-2 flex-1 text-sm text-fg-muted">{p.note}</p>
              <p className="mt-3 text-xs text-fg-subtle tabular">
                {p.tests} tests · {p.tenants} {p.tenants === 1 ? "organisation" : "organisations"} · results {p.resultLatency.toLowerCase()}
              </p>
              <div className="mt-3">
                <Select
                  size="sm"
                  value={p.status}
                  onValueChange={(v) => v !== p.status && setProv({ p, to: v as AssessmentProvider["status"] })}
                  options={[
                    { value: "active", label: "Active for everyone" },
                    { value: "testing", label: "Pilot only" },
                    { value: "off", label: "Off" },
                  ]}
                />
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[0.9375rem] font-semibold text-fg">In-house test catalogue</h2>
            <p className="mt-0.5 text-sm text-fg-muted">Switching a test off hides it from every organisation. Invitations already sent still work.</p>
          </div>
          <div className="w-full sm:w-64">
            <Input leading={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tests" aria-label="Search tests" />
          </div>
        </div>
        <div className="max-h-[28rem] overflow-auto">
          <Table>
            <THead>
              <TR>
                <TH>Test</TH>
                <TH>Type</TH>
                <TH className="text-right">Norm sample</TH>
                <TH className="text-right">Time</TH>
                <TH className="text-center">Available</TH>
              </TR>
            </THead>
            <TBody>
              {tests.map((t) => {
                const on = !s.disabledTests.includes(t.id);
                return (
                  <TR key={t.id} className={on ? undefined : "opacity-60"}>
                    <TD>
                      <span className="block text-sm font-semibold text-fg">{t.name}</span>
                      <span className="block text-xs text-fg-subtle">version {t.version}</span>
                    </TD>
                    <TD className="text-sm text-fg-muted capitalize">{t.family.replace(/_/g, " ")}</TD>
                    <TD className="text-right text-sm text-fg-muted tabular">{sessions(t.id) ? sessions(t.id).toLocaleString("en-GB") : "–"}</TD>
                    <TD className="text-right text-sm text-fg-muted tabular">{t.timeLimitMin ?? t.medianCompletionMin} min</TD>
                    <TD className="text-center">
                      <Switch checked={on} onCheckedChange={(v) => setToggle({ id: t.id, name: t.name, on: v })} aria-label={`${t.name} available`} />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-[0.9375rem] font-semibold text-fg">Norm groups</h2>
          <p className="mt-0.5 text-sm text-fg-muted">The comparison groups scores are reported against. Each is reviewed by a psychometrician at least every three years.</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Group</TH>
                <TH>Region</TH>
                <TH>Data collected</TH>
                <TH>Review due</TH>
              </TR>
            </THead>
            <TBody>
              {normGroups.map((g) => {
                const due = new Date(g.reviewDue).getTime();
                const overdue = due < NOW;
                const soon = !overdue && due - NOW < 180 * 86400000;
                return (
                  <TR key={g.code}>
                    <TD className="min-w-64">
                      <span className="block text-sm font-semibold text-fg">
                        <span className="font-mono text-xs text-fg-muted">{g.code}</span> {g.name}
                      </span>
                      <span className="block text-xs text-fg-subtle">{g.description}</span>
                    </TD>
                    <TD className="text-sm text-fg-muted">{g.region}</TD>
                    <TD className="text-sm whitespace-nowrap text-fg-muted">
                      {g.collectedFrom.slice(0, 4)}–{g.collectedTo.slice(0, 4)}
                    </TD>
                    <TD className="text-sm whitespace-nowrap">
                      {overdue ? (
                        <Badge tone="accent" size="sm" dot>
                          Overdue since {date(g.reviewDue)}
                        </Badge>
                      ) : soon ? (
                        <Badge tone="warning" size="sm">
                          {date(g.reviewDue)}
                        </Badge>
                      ) : (
                        <span className="text-fg-muted">{date(g.reviewDue)}</span>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-[0.9375rem] font-semibold text-fg">Test credits by organisation</h2>
        <p className="mt-0.5 mb-4 text-sm text-fg-muted">This plan year. One credit per candidate per test.</p>
        <ul className="flex flex-col gap-3">
          {live.map((t) => {
            const pct = Math.round((100 * t.testCreditsUsed) / t.testCreditsTotal);
            return (
              <li key={t.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-fg">{t.name}</span>
                  <span className="shrink-0 text-fg-muted tabular">
                    <span className="font-semibold text-fg">{t.testCreditsUsed.toLocaleString("en-GB")}</span> of {t.testCreditsTotal.toLocaleString("en-GB")}
                  </span>
                </div>
                <Progress value={pct} label={`${t.name} credits`} tone={pct >= 90 ? "danger" : pct >= 75 ? "warning" : "primary"} />
              </li>
            );
          })}
        </ul>
      </Card>

      <ReasonDialog
        open={!!prov}
        onOpenChange={(o) => !o && setProv(null)}
        title={prov ? `Set ${prov.p.name} to ${STATUS_TONE[prov.to].label.toLowerCase()}?` : ""}
        confirmLabel="Change"
        tone={prov?.to === "off" ? "danger" : "primary"}
        onConfirm={async (r) => {
          await services.platform.setProviderStatus(prov!.p.id, prov!.to, r);
          toast.success(`${prov!.p.name}: ${STATUS_TONE[prov!.to].label.toLowerCase()}`);
          onChanged();
        }}
      />
      <ReasonDialog
        open={!!toggle}
        onOpenChange={(o) => !o && setToggle(null)}
        title={toggle ? `${toggle.on ? "Make" : "Stop making"} ${toggle.name} available?` : ""}
        description={toggle && !toggle.on ? "Organisations can't send it to new candidates. Batteries that include it will show it as unavailable." : undefined}
        confirmLabel={toggle?.on ? "Make available" : "Switch off"}
        tone={toggle && !toggle.on ? "danger" : "primary"}
        onConfirm={async (r) => {
          await services.platform.setTestEnabled(toggle!.id, toggle!.on, r);
          toast.success(toggle!.on ? "Test available" : "Test switched off", toggle!.name);
          onChanged();
        }}
      />
    </div>
  );
}

export function HealthTab({ s }: { s: PlatformSnapshot }) {
  const open = s.incidents.filter((i) => i.status !== "resolved");
  return (
    <div className="flex flex-col gap-5">
      {open.length === 0 ? (
        <Alert tone="success" title="All systems operational" />
      ) : (
        open.map((i) => (
          <Alert key={i.id} tone="warning" title={`${i.title} · ${i.status === "monitoring" ? "monitoring" : "investigating"}`}>
            {i.updates[0]!.text} <span className="text-xs">Updated {stamp(i.updates[0]!.at)}.</span>
          </Alert>
        ))
      )}
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {s.services.map((svc) => (
            <li key={svc.id} className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] md:items-center md:gap-6">
              <div>
                <span className="block text-sm font-semibold text-fg">{svc.name}</span>
                <span className="block text-xs text-fg-subtle">{svc.description}</span>
              </div>
              <div>
                <div className="flex h-6 gap-[2px]" role="img" aria-label={`${svc.name}: ${svc.uptime30d}% uptime over 30 days`}>
                  {svc.days.map((d, i) => (
                    <Tooltip key={i} content={`${date(new Date(NOW - (29 - i) * 86400000).toISOString())}: ${SERVICE[d].label}`}>
                      <span className={cn("h-full flex-1 rounded-[2px]", SERVICE[d].bar)} />
                    </Tooltip>
                  ))}
                </div>
                <span className="mt-1 flex justify-between text-2xs text-fg-subtle">
                  <span>30 days ago</span>
                  <span className="tabular">{svc.uptime30d}% uptime</span>
                  <span>Today</span>
                </span>
              </div>
              <div className="flex items-center gap-3 md:flex-col md:items-end md:gap-1">
                <Badge tone="status" size="sm" dot dotClassName={SERVICE[svc.status].dot}>
                  {SERVICE[svc.status].label}
                </Badge>
                <span className="text-xs text-fg-muted tabular">{svc.metric}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-5">
        <h2 className="text-[0.9375rem] font-semibold text-fg">Incident history</h2>
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {s.incidents.map((i) => (
            <li key={i.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-fg">{i.title}</span>
                <Badge tone={i.severity === "major" ? "danger" : "neutral"} size="sm">
                  {i.severity === "major" ? "Major" : "Minor"}
                </Badge>
                <Badge tone={i.status === "resolved" ? "success" : "warning"} size="sm">
                  {i.status === "resolved" ? "Resolved" : i.status === "monitoring" ? "Monitoring" : "Investigating"}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-fg-subtle">
                {i.service} · started {stamp(i.startedAt)}
                {i.resolvedAt && ` · resolved ${stamp(i.resolvedAt)}`}
              </p>
              <p className="mt-1 text-sm text-fg-muted">{i.updates[0]!.text}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function AuditTab() {
  const [rows, setRows] = React.useState<PlatformAuditEvent[] | null>(null);
  const [query, setQuery] = React.useState("");
  React.useEffect(() => {
    services.platform.audit().then(setRows);
  }, []);
  const shown = (rows ?? []).filter((r) => !query || `${r.actor} ${r.action} ${r.target} ${r.detail}`.toLowerCase().includes(query.toLowerCase()));
  const pager = usePagination(shown, { resetKey: query });
  if (!rows) return <Skeleton className="h-80 rounded-lg" />;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-xs">
          <Input leading={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the platform log" aria-label="Search the platform audit log" />
        </div>
        <p className="text-xs text-fg-subtle sm:flex-1">Every staff action, with the reason given. Kept for 7 years and can&rsquo;t be edited.</p>
        <Button variant="secondary" onClick={() => downloadCsv("platform-audit-log", shown.map((r) => ({ time: r.at, person: r.actor, action: r.action, target: r.target, detail: r.detail })))}>
          <Download />
          Export CSV
        </Button>
      </div>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
          {pager.items.map((r) => (
            <li key={r.id} className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-4">
              <span className="text-xs whitespace-nowrap text-fg-subtle tabular sm:pt-0.5">{stamp(r.at)}</span>
              <span className="min-w-0">
                <span className="block text-sm text-fg">
                  <span className="font-semibold">{r.actor}</span> · {r.action} · <span className="text-fg-muted">{r.target}</span>
                </span>
                <span className="block text-sm text-fg-muted">{r.detail}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-line px-4 py-2.5">
          <Pagination p={pager} noun={["entry", "entries"]} />
        </div>
      </Card>
    </div>
  );
}
