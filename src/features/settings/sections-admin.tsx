"use client";

import * as React from "react";
import { Check, Download, Search } from "@/components/icons";
import { Badge, Button, Card, EmptyState, Input, Pagination, Progress, Skeleton, Table, TBody, TD, TH, THead, TR, toast, usePagination } from "@/components/ui";
import { FilterSelect } from "@/components/ui/filter-select";
import { services } from "@/services";
import type { AuditCategory, AuditEvent, Subscription } from "@/types/settings";
import { downloadCsv } from "@/features/analytics/charts";
import { cn } from "@/lib/utils";
import { Group, ReadOnlyNote, SectionSkeleton } from "./settings-shell";

const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const stamp = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Harare" });

const PLANS = [
  { id: "starter", name: "Starter", price: "US$1,200 a year", points: ["5 seats", "100 test credits", "Careers page and pipeline"] },
  { id: "growth", name: "Growth", price: "US$4,800 a year", points: ["20 seats", "500 test credits", "Talent pool, analytics and fairness reports"] },
  { id: "enterprise", name: "Enterprise", price: "Priced with you", points: ["Unlimited seats", "Test credits in bulk", "Single sign-on, API and a named contact"] },
];

export function BillingSection() {
  const [sub, setSub] = React.useState<Subscription | null>(null);
  React.useEffect(() => {
    services.settings.subscription().then(setSub);
  }, []);
  if (!sub) return <SectionSkeleton />;
  const meters = [
    { label: "Seats", used: sub.seatsUsed, total: sub.seatsTotal, note: "Active people and pending invitations" },
    { label: "Test credits", used: sub.testCreditsUsed, total: sub.testCreditsTotal, note: "One per candidate per test, this plan year" },
    { label: "CV processing", used: sub.cvCreditsUsed, total: sub.cvCreditsTotal, note: "CVs read and extracted, this plan year" },
  ];
  return (
    <div className="flex flex-col gap-5">
      <ReadOnlyNote>Only organisation admins can change the plan or payment details. Chenai Mutizwa is your organisation admin.</ReadOnlyNote>
      <Group title="Usage" description={`Growth plan, billed annually. Renews ${longDate(sub.renewsAt)}.`}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {meters.map((m) => {
            const pct = Math.round((100 * m.used) / m.total);
            return (
              <div key={m.label}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-fg">{m.label}</span>
                  <span className="text-sm text-fg-muted tabular">
                    <span className="font-semibold text-fg">{m.used.toLocaleString("en-GB")}</span> of {m.total.toLocaleString("en-GB")}
                  </span>
                </div>
                <Progress value={pct} label={`${m.label} used`} tone={pct >= 90 ? "danger" : pct >= 75 ? "warning" : "primary"} className="mt-2" />
                <p className="mt-1.5 text-xs text-fg-subtle">{m.note}</p>
              </div>
            );
          })}
        </div>
      </Group>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {PLANS.map((p) => {
          const current = p.id === sub.plan;
          return (
            <Card key={p.id} className={cn("flex flex-col p-5", current && "ring-2 ring-primary-500")}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-md font-semibold text-fg">{p.name}</span>
                {current && <Badge tone="primary" size="sm">Your plan</Badge>}
              </div>
              <span className="mt-1 text-sm text-fg-muted">{p.price}</span>
              <ul className="mt-3 flex flex-col gap-1.5">
                {p.points.map((x) => (
                  <li key={x} className="flex items-start gap-2 text-sm text-fg">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary-600" />
                    {x}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
      <Group title="Invoices" description={`Paid by ${sub.paymentMethod}.`}>
        <div className="-mx-5 -mb-5 overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Invoice</TH>
                <TH>Date</TH>
                <TH className="text-right">Amount</TH>
                <TH>Status</TH>
                <TH className="w-12">
                  <span className="sr-only">Download</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {sub.invoices.map((i) => (
                <TR key={i.id}>
                  <TD className="font-mono text-sm text-fg">{i.id}</TD>
                  <TD className="text-sm text-fg-muted">{longDate(i.date)}</TD>
                  <TD className="text-right text-sm text-fg tabular">US${i.amountUsd.toLocaleString("en-GB")}</TD>
                  <TD>
                    <Badge tone="success" size="sm">
                      Paid
                    </Badge>
                  </TD>
                  <TD>
                    <Button size="icon-sm" variant="ghost" aria-label={`Download ${i.id}`} onClick={() => toast.info(`${i.id}.pdf`, "Invoices download once billing is connected. This is a mock.")}>
                      <Download />
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </Group>
    </div>
  );
}

const CATEGORY: Record<AuditCategory, string> = { settings: "Settings", users: "Users", candidates: "Candidates", offers: "Offers", assessments: "Assessments", security: "Security", data: "Data and privacy" };

export function AuditSection() {
  const [rows, setRows] = React.useState<AuditEvent[] | null>(null);
  const [query, setQuery] = React.useState("");
  const [cats, setCats] = React.useState<string[]>([]);
  const [actors, setActors] = React.useState<string[]>([]);
  const [denied, setDenied] = React.useState<string | null>(null);
  React.useEffect(() => {
    services.settings
      .audit()
      .then(setRows)
      .catch((e: unknown) => setDenied(e instanceof Error ? e.message : "The audit log couldn't be loaded."));
  }, []);
  const shown = (rows ?? []).filter((r) => (!cats.length || cats.includes(r.category)) && (!actors.length || actors.includes(r.actor)) && (!query || `${r.action} ${r.detail} ${r.actor}`.toLowerCase().includes(query.toLowerCase())));
  const pager = usePagination(shown, { resetKey: JSON.stringify([query, cats, actors]) });
  if (denied) return <p className="text-sm text-fg-muted">{denied}</p>;
  if (!rows) return <Skeleton className="h-96 rounded-lg" />;
  const people = [...new Set(rows.map((r) => r.actor))].sort();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-fg-muted">Every change to settings, users, candidates, offers and data, kept for 7 years. Entries can&rsquo;t be edited or deleted.</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="w-full sm:max-w-xs">
          <Input leading={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the log" aria-label="Search the audit log" />
        </div>
        <FilterSelect label="Area" value={cats} onChange={setCats} options={(Object.keys(CATEGORY) as AuditCategory[]).map((c) => ({ value: c, label: CATEGORY[c], count: rows.filter((r) => r.category === c).length }))} />
        <FilterSelect label="Person" value={actors} onChange={setActors} options={people.map((p) => ({ value: p, label: p }))} />
        <Button
          variant="secondary"
          className="sm:ml-auto"
          onClick={() => {
            downloadCsv("audit-log", shown.map((r) => ({ time: r.at, person: r.actor, area: CATEGORY[r.category], action: r.action, detail: r.detail, ip_address: r.ip })));
            toast.success("Audit log exported", `${shown.length} entries. The export itself is logged.`);
          }}
        >
          <Download />
          Export CSV
        </Button>
      </div>
      <Card className="overflow-hidden">
        {shown.length === 0 ? (
          <EmptyState icon={<Search />} title="Nothing matches" description="Clear the filters to see the whole log." />
        ) : (
          <ul className="divide-y divide-line">
            {pager.items.map((r) => (
              <li key={r.id} className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto] sm:gap-4">
                <span className="text-xs whitespace-nowrap text-fg-subtle tabular sm:pt-0.5">{stamp(r.at)}</span>
                <span className="min-w-0">
                  <span className="block text-sm text-fg">
                    <span className="font-semibold">{r.actor}</span> · {r.action}
                  </span>
                  <span className="block text-sm text-fg-muted">{r.detail}</span>
                </span>
                <span className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                  <Badge tone={r.category === "security" && /Failed/.test(r.action) ? "accent" : "neutral"} size="sm">
                    {CATEGORY[r.category]}
                  </Badge>
                  <span className="font-mono text-2xs text-fg-subtle">{r.ip}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {shown.length > 0 && (
          <div className="border-t border-line px-4 py-2.5">
            <Pagination p={pager} noun={["entry", "entries"]} />
          </div>
        )}
      </Card>
    </div>
  );
}
