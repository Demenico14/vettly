"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Plus, RefreshCw, Search, SearchX, X } from "@/components/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  EmptyState,
  Input,
  Segmented,
  Select,
  Skeleton,
  SortableTH,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  type SortDirection,
} from "@/components/ui";
import { VacancyStatusBadge } from "@/components/domain/status-badge";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { services, MOCK_NOW } from "@/services";
import { DEPARTMENTS, LOCATIONS } from "@/mocks/vacancies";
import type { Vacancy, VacancyStatus } from "@/types";
import { cn, timeAgo } from "@/lib/utils";
import { StatusDialog, VacancyActionsMenu } from "./status-actions";

type View = "all" | "open" | "draft" | "paused" | "ended";
type SortKey = "title" | "applicants" | "closesAt" | "updatedAt";

const NOW = new Date(MOCK_NOW);
const VIEW_MATCH: Record<View, (s: VacancyStatus) => boolean> = {
  all: () => true,
  open: (s) => s === "open",
  draft: (s) => s === "draft",
  paused: (s) => s === "paused",
  ended: (s) => s === "closed" || s === "filled",
};

export function VacancyList() {
  const router = useRouter();
  const [rows, setRows] = React.useState<Vacancy[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [view, setView] = React.useState<View>("all");
  const [query, setQuery] = React.useState("");
  const [dept, setDept] = React.useState("all");
  const [loc, setLoc] = React.useState("all");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: SortDirection }>({ key: "updatedAt", dir: "desc" });
  const [move, setMove] = React.useState<{ v: Vacancy; to: VacancyStatus } | null>(null);

  React.useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before refetching
    setError(null);
    services.vacancies
      .list()
      .then((r) => alive && setRows(r))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [reload]);

  const counts = React.useMemo(() => {
    const c: Record<View, number> = { all: 0, open: 0, draft: 0, paused: 0, ended: 0 };
    (rows ?? []).forEach((r) => (Object.keys(VIEW_MATCH) as View[]).forEach((v) => VIEW_MATCH[v](r.status) && c[v]++));
    return c;
  }, [rows]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (rows ?? []).filter(
      (r) =>
        VIEW_MATCH[view](r.status) &&
        (dept === "all" || r.department === dept) &&
        (loc === "all" || r.location === loc) &&
        (!q || `${r.title} ${r.reference} ${r.department} ${r.location} ${r.hiringManager}`.toLowerCase().includes(q)),
    );
    const dir = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      const av = a[sort.key] ?? "";
      const bv = b[sort.key] ?? "";
      if (sort.key === "closesAt") {
        if (!a.closesAt) return 1;
        if (!b.closesAt) return -1;
      }
      return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))) * dir;
    });
  }, [rows, view, query, dept, loc, sort]);

  const filtersOn = view !== "all" || query || dept !== "all" || loc !== "all";
  const clear = () => {
    setView("all");
    setQuery("");
    setDept("all");
    setLoc("all");
  };
  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "title" || key === "closesAt" ? "asc" : "desc" }));
  const replace = (v: Vacancy) => setRows((r) => r?.map((x) => (x.id === v.id ? v : x)) ?? null);

  return (
    <PageContainer
      header={
        <PageHeader
          title="Vacancies"
          description="Every role you're hiring for, its status, and how far candidates have progressed."
          actions={
            <Button asChild>
              <Link href="/vacancies/new">
                <Plus />
                New vacancy
              </Link>
            </Button>
          }
        />
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            label="Vacancy status"
            value={view}
            onChange={setView}
            className="self-start overflow-x-auto"
            options={[
              { value: "all", label: `All ${rows ? counts.all : ""}` },
              { value: "open", label: `Open ${rows ? counts.open : ""}` },
              { value: "draft", label: `Drafts ${rows ? counts.draft : ""}` },
              { value: "paused", label: `Paused ${rows ? counts.paused : ""}` },
              { value: "ended", label: `Closed & filled ${rows ? counts.ended : ""}` },
            ]}
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_11rem_10rem] lg:w-[38rem]">
            <Input
              aria-label="Search vacancies"
              leading={<Search />}
              placeholder="Search title, reference or manager"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              trailing={
                query ? (
                  <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="grid size-6 place-items-center rounded-xs hover:bg-ink-100">
                    <X className="size-3.5" />
                  </button>
                ) : undefined
              }
            />
            <Select aria-label="Department" value={dept} onValueChange={setDept} options={[{ value: "all", label: "All departments" }, ...DEPARTMENTS.map((d) => ({ value: d, label: d }))]} />
            <Select aria-label="Location" value={loc} onValueChange={setLoc} options={[{ value: "all", label: "All locations" }, ...LOCATIONS.map((d) => ({ value: d, label: d }))]} />
          </div>
        </div>

        {error ? (
          <Alert
            tone="danger"
            title="Vacancies could not be loaded"
            action={
              <Button size="sm" variant="secondary" onClick={() => setReload((r) => r + 1)}>
                <RefreshCw />
                Try again
              </Button>
            }
          >
            {error}
          </Alert>
        ) : (
          <Card className="overflow-hidden">
            {!rows ? (
              <div className="flex flex-col gap-4 p-5" aria-busy="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="hidden h-3 w-20 md:block" />
                    <Skeleton className="hidden h-3 w-24 md:block" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={rows.length ? <SearchX /> : <Briefcase />}
                title={rows.length ? "No vacancies match these filters" : "No vacancies yet"}
                description={rows.length ? "Try another status or search, or clear the filters." : "Create a vacancy with its requirements and Vettly scores every application against them."}
                action={
                  rows.length ? (
                    <Button variant="secondary" size="sm" onClick={clear}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button size="sm" asChild>
                      <Link href="/vacancies/new">New vacancy</Link>
                    </Button>
                  )
                }
              />
            ) : (
              <>
                <ul className="md:hidden">
                  {filtered.map((v) => (
                    <li key={v.id} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
                      <Link href={`/vacancies/${v.id}`} className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-fg">{v.title}</span>
                          <VacancyStatusBadge status={v.status} size="sm" />
                        </span>
                        <span className="block truncate text-xs text-fg-subtle">
                          {v.location} · {v.applicants} applicants · {v.shortlisted} shortlisted
                        </span>
                      </Link>
                      <VacancyActionsMenu
                        vacancy={v}
                        onMove={(to) => (to === "open" && v.status === "draft" ? router.push(`/vacancies/${v.id}/edit`) : setMove({ v, to }))}
                        onDuplicated={(c) => setRows((r) => (r ? [c, ...r] : r))}
                        onDeleted={(id) => setRows((r) => r?.filter((x) => x.id !== id) ?? null)}
                      />
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto md:block">
                  <Table className="min-w-[56rem]">
                    <THead>
                      <TR>
                        <SortableTH label="Vacancy" active={sort.key === "title"} direction={sort.dir} onSort={() => toggleSort("title")} />
                        <TH>Status</TH>
                        <TH>Location</TH>
                        <SortableTH label="Applicants" active={sort.key === "applicants"} direction={sort.dir} onSort={() => toggleSort("applicants")} />
                        <TH>Progress</TH>
                        <TH>Hiring manager</TH>
                        <SortableTH label="Closes" active={sort.key === "closesAt"} direction={sort.dir} onSort={() => toggleSort("closesAt")} />
                        <SortableTH label="Updated" active={sort.key === "updatedAt"} direction={sort.dir} onSort={() => toggleSort("updatedAt")} />
                        <TH className="w-10">
                          <span className="sr-only">Actions</span>
                        </TH>
                      </TR>
                    </THead>
                    <TBody>
                      {filtered.map((v) => {
                        const soon = v.closesAt && v.status === "open" && new Date(v.closesAt).getTime() - NOW.getTime() < 3 * 86400000;
                        return (
                          <TR key={v.id} className="cursor-pointer" onClick={() => router.push(`/vacancies/${v.id}`)}>
                            <TD>
                              <Link href={`/vacancies/${v.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-fg hover:underline">
                                {v.title}
                              </Link>
                              <p className="text-xs text-fg-subtle">
                                {v.reference} · {v.department}
                              </p>
                            </TD>
                            <TD>
                              <VacancyStatusBadge status={v.status} size="sm" />
                            </TD>
                            <TD className="whitespace-nowrap text-fg-muted">
                              {v.location}
                              <span className="block text-xs text-fg-subtle">{v.workMode}</span>
                            </TD>
                            <TD>
                              <span className="font-semibold">{v.applicants}</span>
                              {v.newApplicants > 0 && <span className="ml-1 text-xs font-semibold text-primary-700">+{v.newApplicants} new</span>}
                            </TD>
                            <TD className="text-xs whitespace-nowrap text-fg-muted">
                              {v.shortlisted} shortlisted
                              <span className="block">{v.interviewing} interviewing</span>
                            </TD>
                            <TD>
                              <span className="flex items-center gap-2 whitespace-nowrap">
                                <Avatar name={v.hiringManager} size="xs" />
                                <span className="text-fg-muted">{v.hiringManager}</span>
                              </span>
                            </TD>
                            <TD className={cn("whitespace-nowrap", soon ? "font-semibold text-warning-700" : "text-fg-muted")}>
                              {v.status === "draft" ? "Not set" : v.status === "filled" || v.status === "closed" ? "Closed" : v.closesAt ? timeAgo(v.closesAt, NOW) : "Open-ended"}
                            </TD>
                            <TD className="whitespace-nowrap text-fg-subtle">{timeAgo(v.updatedAt, NOW)}</TD>
                            <TD onClick={(e) => e.stopPropagation()}>
                              <VacancyActionsMenu
                                vacancy={v}
                                onMove={(to) => (to === "open" && v.status === "draft" ? router.push(`/vacancies/${v.id}/edit`) : setMove({ v, to }))}
                                onDuplicated={(c) => setRows((r) => (r ? [c, ...r] : r))}
                                onDeleted={(id) => setRows((r) => r?.filter((x) => x.id !== id) ?? null)}
                              />
                            </TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                </div>
                <p className="border-t border-line px-4 py-2.5 text-xs text-fg-subtle" aria-live="polite">
                  {filtered.length} of {rows.length} vacancies{filtersOn ? " match your filters" : ""}
                  {filtersOn && (
                    <button type="button" onClick={clear} className="ml-2 font-semibold text-primary-700 hover:underline">
                      Clear
                    </button>
                  )}
                </p>
              </>
            )}
          </Card>
        )}
      </div>
      <StatusDialog vacancy={move?.v ?? null} to={move?.to ?? null} onClose={() => setMove(null)} onChanged={replace} />
    </PageContainer>
  );
}
