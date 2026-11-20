"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, MoreHorizontal, Search, ShieldCheck } from "@/components/icons";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Drawer,
  EmptyState,
  Field,
  Input,
  Pagination,
  Progress,
  Select,
  Skeleton,
  Table, TableScroll,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
  usePagination,
} from "@/components/ui";
import { FilterSelect } from "@/components/ui/filter-select";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { useSession } from "@/components/layout/session-provider";
import { services, PLAN_LIMITS } from "@/services";
import type { PlanId, PlatformSnapshot, PlatformUser, Tenant } from "@/types/platform";
import { BarList } from "@/features/analytics/charts";
import { ReasonDialog, TenantBadge, date, daysUntil, stamp, usd } from "./shared";
import { AiTab, AssessmentsTab, AuditTab, HealthTab } from "./admin-sections";

type Tab = "overview" | "organisations" | "users" | "ai" | "assessments" | "health" | "audit";
const TABS: [Tab, string][] = [
  ["overview", "Overview"],
  ["organisations", "Organisations"],
  ["users", "Users"],
  ["assessments", "Assessments"],
  ["ai", "AI models"],
  ["health", "System health"],
  ["audit", "Audit log"],
];
const PLAN_LABEL: Record<PlanId, string> = { starter: "Starter", growth: "Growth", enterprise: "Enterprise" };

export function AdminPage() {
  const { user } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as Tab) || "overview";
  const [snap, setSnap] = React.useState<PlatformSnapshot | null>(null);
  const [reload, setReload] = React.useState(0);
  const allowed = user?.role === "super_admin";

  React.useEffect(() => {
    if (allowed) services.platform.snapshot().then(setSnap);
  }, [allowed, reload]);

  if (!user) return <PageContainer header={<Skeleton className="h-16 w-80 rounded-md" />}>{null}</PageContainer>;
  if (!allowed)
    return (
      <PageContainer header={<PageHeader title="Platform admin" />}>
        <Card>
          <EmptyState
            icon={<Lock />}
            title="Only Vettly platform administrators can open this"
            description="It manages every organisation on Vettly: plans, system health, AI models and assessment providers. Organisation settings are under Settings."
          />
        </Card>
      </PageContainer>
    );

  const refresh = () => setReload((r) => r + 1);
  const go = (t: Tab) => router.replace(t === "overview" ? "/admin" : `/admin?tab=${t}`, { scroll: false });
  const degraded = snap?.services.filter((s) => s.status !== "operational").length ?? 0;

  return (
    <PageContainer
      header={
        <PageHeader
          title="Platform admin"
          description="Every organisation on Vettly. You see plans, usage and health, never candidates: support access needs the organisation's permission and expires."
        />
      }
    >
      <Tabs value={tab} onValueChange={(v) => go(v as Tab)}>
        <TabsList>
          {TABS.map(([k, label]) => (
            <TabsTrigger key={k} value={k}>
              {label}
              {k === "health" && degraded > 0 && <span className="rounded-full bg-warning-50 px-1.5 text-2xs leading-4 font-bold text-warning-700 tabular">{degraded} degraded</span>}
            </TabsTrigger>
          ))}
        </TabsList>
        {!snap ? (
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
            <Skeleton className="col-span-full h-80 rounded-lg" />
          </div>
        ) : (
          <>
            <TabsContent value="overview">
              <Overview s={snap} go={go} />
            </TabsContent>
            <TabsContent value="organisations">
              <Organisations s={snap} onChanged={refresh} />
            </TabsContent>
            <TabsContent value="users">
              <Users s={snap} onChanged={refresh} />
            </TabsContent>
            <TabsContent value="assessments">
              <AssessmentsTab s={snap} onChanged={refresh} />
            </TabsContent>
            <TabsContent value="ai">
              <AiTab s={snap} onChanged={refresh} />
            </TabsContent>
            <TabsContent value="health">
              <HealthTab s={snap} />
            </TabsContent>
            <TabsContent value="audit">
              <AuditTab key={reload} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </PageContainer>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="px-4 py-3.5">
      <span className="block text-xs font-medium text-fg-muted">{label}</span>
      <span className="mt-1 block text-2xl font-bold text-fg tabular">{value}</span>
      {note && <span className="mt-0.5 block text-xs text-fg-subtle">{note}</span>}
    </Card>
  );
}

function Overview({ s, go }: { s: PlatformSnapshot; go: (t: Tab) => void }) {
  const live = s.tenants.filter((t) => t.status !== "suspended");
  const arr = s.tenants.filter((t) => t.status === "active" || t.status === "past_due").reduce((a, t) => a + t.arrUsd, 0);
  const attention = [
    ...s.tenants.filter((t) => t.status === "past_due").map((t) => ({ key: `due${t.id}`, text: `${t.name}: payment overdue`, tab: "organisations" as Tab })),
    ...s.tenants.filter((t) => t.status !== "suspended" && t.testCreditsUsed / t.testCreditsTotal >= 0.9).map((t) => ({ key: `cr${t.id}`, text: `${t.name}: ${Math.round((100 * t.testCreditsUsed) / t.testCreditsTotal)}% of test credits used`, tab: "organisations" as Tab })),
    ...s.tenants.filter((t) => t.status === "trial").map((t) => ({ key: `tr${t.id}`, text: `${t.name}: trial ends in ${daysUntil(t.renewsAt)} days`, tab: "organisations" as Tab })),
    ...s.tenants.filter((t) => t.status === "active" && daysUntil(t.renewsAt) <= 30 && daysUntil(t.renewsAt) >= 0).map((t) => ({ key: `rn${t.id}`, text: `${t.name}: renews in ${daysUntil(t.renewsAt)} days`, tab: "organisations" as Tab })),
    ...s.incidents.filter((i) => i.status !== "resolved").map((i) => ({ key: i.id, text: `Incident: ${i.title}`, tab: "health" as Tab })),
    ...(s.ai.policy.spentThisMonthUsd / s.ai.policy.monthlyBudgetUsd >= 0.6 ? [{ key: "ai", text: `AI spend at ${Math.round((100 * s.ai.policy.spentThisMonthUsd) / s.ai.policy.monthlyBudgetUsd)}% of this month's budget`, tab: "ai" as Tab }] : []),
  ];
  const plans = (["starter", "growth", "enterprise"] as PlanId[]).map((p) => ({ key: p, label: PLAN_LABEL[p], value: live.filter((t) => t.plan === p).length }));
  const busiest = [...live].sort((a, b) => b.applications30d - a.applications30d).slice(0, 6);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Annual recurring revenue" value={usd(arr)} note="Paying organisations, excluding trials" />
        <Stat label="Organisations" value={String(live.length)} note={`${s.tenants.filter((t) => t.status === "trial").length} on trial, ${s.tenants.filter((t) => t.status === "suspended").length} suspended`} />
        <Stat label="Applications, 30 days" value={live.reduce((a, t) => a + t.applications30d, 0).toLocaleString("en-GB")} note="Across every organisation" />
        <Stat label="Seats in use" value={live.reduce((a, t) => a + t.seatsUsed, 0).toLocaleString("en-GB")} note={`of ${live.reduce((a, t) => a + t.seatsTotal, 0)} paid for`} />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <h2 className="text-md font-semibold text-fg">Needs attention</h2>
          {attention.length === 0 ? (
            <p className="mt-3 text-sm text-fg-subtle">Nothing right now.</p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-line">
              {attention.map((a) => (
                <li key={a.key} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="size-1.5 shrink-0 rounded-full bg-accent-500" aria-hidden />
                  <span className="min-w-0 flex-1 text-sm text-fg">{a.text}</span>
                  <Button size="sm" variant="ghost" onClick={() => go(a.tab)}>
                    Open
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 text-md font-semibold text-fg">Organisations by plan</h2>
          <BarList rows={plans} />
          <h2 className="mt-6 mb-4 text-md font-semibold text-fg">Busiest, applications in 30 days</h2>
          <BarList rows={busiest.map((t) => ({ key: t.id, label: t.name, value: t.applications30d }))} />
        </Card>
      </div>
    </div>
  );
}

function Organisations({ s, onChanged }: { s: PlatformSnapshot; onChanged: () => void }) {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<string[]>([]);
  const [plan, setPlan] = React.useState<string[]>([]);
  const [open, setOpen] = React.useState<string | null>(null);
  const shown = s.tenants.filter((t) => (!query || `${t.name} ${t.country} ${t.industry} ${t.adminName}`.toLowerCase().includes(query.toLowerCase())) && (!status.length || status.includes(t.status)) && (!plan.length || plan.includes(t.plan)));
  const current = s.tenants.find((t) => t.id === open) ?? null;
  const pager = usePagination(shown, { resetKey: JSON.stringify([query, status, plan]) });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-xs">
          <Input leading={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search organisations" aria-label="Search organisations" />
        </div>
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[["active", "Active"], ["trial", "Trial"], ["past_due", "Payment overdue"], ["suspended", "Suspended"]].map(([v, l]) => ({ value: v!, label: l!, count: s.tenants.filter((t) => t.status === v).length }))} />
        <FilterSelect label="Plan" value={plan} onChange={setPlan} options={(["starter", "growth", "enterprise"] as PlanId[]).map((p) => ({ value: p, label: PLAN_LABEL[p], count: s.tenants.filter((t) => t.plan === p).length }))} />
      </div>
      <Card className="overflow-hidden">
        <TableScroll>
          <Table>
            <THead sticky>
              <TR>
                <TH>Organisation</TH>
                <TH>Plan</TH>
                <TH>Status</TH>
                <TH className="text-right">Seats</TH>
                <TH className="min-w-40">Test credits</TH>
                <TH className="text-right">ARR</TH>
                <TH>Renews</TH>
              </TR>
            </THead>
            <TBody>
              {pager.items.map((t) => {
                const pct = Math.round((100 * t.testCreditsUsed) / t.testCreditsTotal);
                return (
                  <TR key={t.id}>
                    <TD className="min-w-56">
                      <button type="button" onClick={() => setOpen(t.id)} className="text-left">
                        <span className="block text-sm font-semibold text-fg hover:underline">{t.name}</span>
                        <span className="block text-xs text-fg-subtle">
                          {t.industry} · {t.country}
                        </span>
                      </button>
                    </TD>
                    <TD className="text-sm text-fg">{PLAN_LABEL[t.plan]}</TD>
                    <TD>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <TenantBadge status={t.status} />
                        {t.supportAccessUntil && (
                          <Badge tone="secondary" size="sm">
                            <ShieldCheck />
                            Support access
                          </Badge>
                        )}
                      </span>
                    </TD>
                    <TD className="text-right text-sm text-fg-muted tabular">
                      {t.seatsUsed}/{t.seatsTotal}
                    </TD>
                    <TD>
                      <Progress value={pct} label={`${t.name} test credits used`} tone={pct >= 90 ? "danger" : pct >= 75 ? "warning" : "primary"} />
                      <span className="mt-1 block text-2xs text-fg-subtle tabular">
                        {t.testCreditsUsed.toLocaleString("en-GB")} of {t.testCreditsTotal.toLocaleString("en-GB")}
                      </span>
                    </TD>
                    <TD className="text-right text-sm text-fg tabular">{t.arrUsd ? usd(t.arrUsd) : <span className="text-fg-subtle">Free</span>}</TD>
                    <TD className="text-sm whitespace-nowrap text-fg-muted">{date(t.renewsAt)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableScroll>
        <div className="border-t border-line px-4 py-2.5">
          <Pagination p={pager} noun={["organisation", "organisations"]} />
        </div>
      </Card>
      <TenantDrawer t={current} onOpenChange={(o) => !o && setOpen(null)} onChanged={onChanged} />
    </div>
  );
}

type Action = "plan" | "credits" | "suspend" | "restore" | "trial" | null;

function TenantDrawer({ t, onOpenChange, onChanged }: { t: Tenant | null; onOpenChange: (o: boolean) => void; onChanged: () => void }) {
  const [action, setAction] = React.useState<Action>(null);
  const [plan, setPlan] = React.useState<PlanId>("growth");
  const [credits, setCredits] = React.useState("200");
  const [days, setDays] = React.useState("14");
  if (!t) return <Drawer open={false} onOpenChange={onOpenChange} title="Organisation">{null}</Drawer>;
  const done = (msg: string) => (toast.success(msg, "Recorded in the platform audit log."), onChanged());
  return (
    <Drawer open={!!t} onOpenChange={onOpenChange} title={t.name} className="w-[min(30rem,94vw)]">
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <TenantBadge status={t.status} />
          <Badge tone="outline" size="sm">
            {PLAN_LABEL[t.plan]}, {t.billing}
          </Badge>
        </div>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-fg-subtle">Admin</dt>
          <dd className="text-fg">
            {t.adminName}
            <span className="block text-xs text-fg-subtle">{t.adminEmail}</span>
          </dd>
          <dt className="text-fg-subtle">Customer since</dt>
          <dd className="text-fg">{date(t.createdAt)}</dd>
          <dt className="text-fg-subtle">{t.status === "trial" ? "Trial ends" : "Renews"}</dt>
          <dd className="text-fg">{date(t.renewsAt)}</dd>
          <dt className="text-fg-subtle">Last active</dt>
          <dd className="text-fg">{stamp(t.lastActiveAt)}</dd>
          <dt className="text-fg-subtle">Tests from</dt>
          <dd className="text-fg">{t.assessmentProvider}</dd>
          <dt className="text-fg-subtle">30 days</dt>
          <dd className="text-fg tabular">
            {t.applications30d.toLocaleString("en-GB")} applications, {t.cvProcessed30d.toLocaleString("en-GB")} CVs read
          </dd>
        </dl>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-fg-muted">Seats</span>
            <Progress value={(100 * t.seatsUsed) / t.seatsTotal} label="Seats used" className="mt-1" />
            <span className="mt-1 block text-xs text-fg-subtle tabular">
              {t.seatsUsed} of {t.seatsTotal}
            </span>
          </div>
          <div>
            <span className="text-xs text-fg-muted">Test credits</span>
            <Progress value={(100 * t.testCreditsUsed) / t.testCreditsTotal} label="Test credits used" className="mt-1" />
            <span className="mt-1 block text-xs text-fg-subtle tabular">
              {t.testCreditsUsed} of {t.testCreditsTotal}
            </span>
          </div>
        </div>
        {t.supportAccessUntil && (
          <Alert
            tone="info"
            title={`Support access until ${stamp(t.supportAccessUntil)}`}
            className="mt-5"
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await services.platform.endSupportAccess(t.id);
                  done("Support access ended");
                }}
              >
                End now
              </Button>
            }
          >
            {t.adminName} granted it. Staff can see settings and processing queues, not candidate records.
          </Alert>
        )}
        {t.notes.length > 0 && (
          <section className="mt-5">
            <h3 className="mb-2 text-xs font-semibold text-fg-muted">Notes</h3>
            <ul className="flex flex-col gap-2">
              {t.notes.map((n) => (
                <li key={n} className="rounded-md bg-ink-50 px-3 py-2 text-sm text-fg">
                  {n}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
        <Button size="sm" variant="secondary" onClick={() => (setPlan(t.plan), setAction("plan"))}>
          Change plan
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setAction("credits")}>
          Add test credits
        </Button>
        {t.status === "trial" && (
          <Button size="sm" variant="secondary" onClick={() => setAction("trial")}>
            Extend trial
          </Button>
        )}
        {t.status === "suspended" ? (
          <Button size="sm" onClick={() => setAction("restore")} className="ml-auto">
            Restore
          </Button>
        ) : (
          <Button size="sm" variant="ghost" className="ml-auto text-danger-700" onClick={() => setAction("suspend")}>
            Suspend
          </Button>
        )}
      </div>

      <ReasonDialog open={action === "plan"} onOpenChange={(o) => !o && setAction(null)} title={`Change ${t.name}'s plan`} confirmLabel="Change plan" onConfirm={async (r) => (await services.platform.changePlan(t.id, plan, r), done(`${t.name} moved to ${PLAN_LABEL[plan]}`))}>
        <Field label="Plan">
          <Select value={plan} onValueChange={(v) => setPlan(v as PlanId)} options={(["starter", "growth", "enterprise"] as PlanId[]).map((p) => ({ value: p, label: PLAN_LABEL[p], description: `${PLAN_LIMITS[p].seats} seats, ${PLAN_LIMITS[p].tests} test credits, ${usd(PLAN_LIMITS[p].price)} a year` }))} />
        </Field>
      </ReasonDialog>
      <ReasonDialog open={action === "credits"} onOpenChange={(o) => !o && setAction(null)} title="Add test credits" description="Added to this plan year. Invoice separately if they're paid for." confirmLabel="Add credits" onConfirm={async (r) => (await services.platform.addCredits(t.id, Number(credits), r), done(`${credits} test credits added`))}>
        <Field label="Credits">
          <Input type="number" min={1} max={5000} value={credits} onChange={(e) => setCredits(e.target.value)} className="max-w-32" />
        </Field>
      </ReasonDialog>
      <ReasonDialog open={action === "trial"} onOpenChange={(o) => !o && setAction(null)} title="Extend trial" confirmLabel="Extend" onConfirm={async (r) => (await services.platform.extendTrial(t.id, Number(days), r), done(`Trial extended by ${days} days`))}>
        <Field label="Extra days">
          <Select value={days} onValueChange={setDays} options={["7", "14", "30"].map((d) => ({ value: d, label: `${d} days` }))} />
        </Field>
      </ReasonDialog>
      <ReasonDialog
        open={action === "suspend"}
        onOpenChange={(o) => !o && setAction(null)}
        title={`Suspend ${t.name}?`}
        description="Everyone in the organisation is signed out and can't sign in. Candidates' test links stop working. Data is kept for 90 days."
        confirmLabel="Suspend"
        tone="danger"
        onConfirm={async (r) => (await services.platform.setStatus(t.id, "suspended", r), done(`${t.name} suspended`))}
      />
      <ReasonDialog open={action === "restore"} onOpenChange={(o) => !o && setAction(null)} title={`Restore ${t.name}?`} description="Its people can sign in again straight away." confirmLabel="Restore" onConfirm={async (r) => (await services.platform.setStatus(t.id, "active", r), done(`${t.name} restored`))} />
    </Drawer>
  );
}

function Users({ s, onChanged }: { s: PlatformSnapshot; onChanged: () => void }) {
  const [query, setQuery] = React.useState("");
  const [kind, setKind] = React.useState<string[]>([]);
  const [act, setAct] = React.useState<{ u: PlatformUser; kind: "lock" | "unlock" | "2fa" } | null>(null);
  const shown = s.users.filter((u) => (!query || `${u.name} ${u.email} ${u.tenant ?? ""}`.toLowerCase().includes(query.toLowerCase())) && (!kind.length || kind.includes(u.kind)));
  const pager = usePagination(shown, { resetKey: JSON.stringify([query, kind]) });
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-fg-muted">Vettly staff and each organisation&rsquo;s admins. Organisations manage their other users themselves.</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-xs">
          <Input leading={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or organisation" aria-label="Search users" />
        </div>
        <FilterSelect label="Type" value={kind} onChange={setKind} options={[{ value: "staff", label: "Vettly staff" }, { value: "tenant_admin", label: "Organisation admins" }]} />
      </div>
      <Card className="overflow-hidden">
        <TableScroll>
          <Table>
            <THead sticky>
              <TR>
                <TH>Person</TH>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH>Last sign-in</TH>
                <TH className="w-12">
                  <span className="sr-only">Actions</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {pager.items.map((u) => (
                <TR key={u.id}>
                  <TD className="min-w-56">
                    <span className="flex items-center gap-3">
                      <Avatar name={u.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-fg">{u.name}</span>
                        <span className="block truncate text-xs text-fg-subtle">{u.email}</span>
                      </span>
                    </span>
                  </TD>
                  <TD className="text-sm text-fg">
                    {u.role}
                    {u.tenant && <span className="block text-xs text-fg-subtle">{u.tenant}</span>}
                  </TD>
                  <TD>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="status" size="sm" dot dotClassName={u.status === "active" ? "bg-success-500" : u.status === "locked" ? "bg-danger-500" : "bg-warning-500"}>
                        {u.status === "active" ? "Active" : u.status === "locked" ? "Locked" : "Invited"}
                      </Badge>
                      {u.twoFactor && <ShieldCheck className="size-4 text-success-600" aria-label="Two-step verification on" />}
                    </span>
                  </TD>
                  <TD className="text-sm whitespace-nowrap text-fg-muted">{u.lastSignInAt ? stamp(u.lastSignInAt) : "Never"}</TD>
                  <TD>
                    {u.id !== "pu_grace" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${u.name}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {u.status === "locked" ? (
                            <DropdownMenuItem onSelect={() => setAct({ u, kind: "unlock" })}>Unlock account</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem tone="danger" onSelect={() => setAct({ u, kind: "lock" })}>
                              <Lock />
                              Lock account
                            </DropdownMenuItem>
                          )}
                          {u.twoFactor && <DropdownMenuItem onSelect={() => setAct({ u, kind: "2fa" })}>Reset two-step verification</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableScroll>
        <div className="border-t border-line px-4 py-2.5">
          <Pagination p={pager} noun={["account", "accounts"]} />
        </div>
      </Card>
      <ReasonDialog
        open={!!act}
        onOpenChange={(o) => !o && setAct(null)}
        title={act?.kind === "lock" ? `Lock ${act.u.name}'s account?` : act?.kind === "unlock" ? `Unlock ${act.u.name}'s account?` : `Reset ${act?.u.name}'s two-step verification?`}
        description={act?.kind === "2fa" ? "Only after confirming who they are by a second channel, such as a call to the number on file." : act?.kind === "lock" ? "They're signed out everywhere and can't sign in until unlocked." : undefined}
        confirmLabel={act?.kind === "lock" ? "Lock" : act?.kind === "unlock" ? "Unlock" : "Reset"}
        tone={act?.kind === "lock" ? "danger" : "primary"}
        onConfirm={async (r) => {
          const a = act!;
          if (a.kind === "2fa") await services.platform.resetTwoFactor(a.u.id, r);
          else await services.platform.setUserLocked(a.u.id, a.kind === "lock", r);
          toast.success(a.kind === "2fa" ? "Two-step verification reset" : a.kind === "lock" ? "Account locked" : "Account unlocked", a.u.name);
          onChanged();
        }}
      />
    </div>
  );
}

