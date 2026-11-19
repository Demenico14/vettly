"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal, RefreshCw, Search, SearchX, UsersRound, X } from "@/components/icons";
import {
  Alert,
  Avatar,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  Segmented,
  Select,
  Skeleton,
  SortableTH,
  Table,
  TableContainer,
  TBody,
  TD,
  TH,
  THead,
  TR,
  toast,
  type SortDirection,
} from "@/components/ui";
import { StageBadge, STAGE_META } from "@/components/domain/status-badge";
import { MatchScore, IllustrativeNotice } from "@/components/domain/assessment";
import { services, MOCK_NOW } from "@/services";
import type { ApplicationStage, CandidateSummary } from "@/types";
import { formatDate, timeAgo } from "@/lib/utils";
import { DSSection } from "./specimen";

type SortKey = "name" | "matchScore" | "appliedAt";
type LoadState = "loading" | "ready" | "error";

const PAGE_SIZE = 5;

export function TableSection() {
  const [rows, setRows] = React.useState<CandidateSummary[]>([]);
  const [state, setState] = React.useState<LoadState>("loading");
  const [query, setQuery] = React.useState("");
  const [stage, setStage] = React.useState<"all" | ApplicationStage>("all");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: SortDirection }>({ key: "matchScore", dir: "desc" });
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(0);
  const [simulate, setSimulate] = React.useState<"normal" | "error">("normal");

  const load = React.useCallback(async (mode: "normal" | "error") => {
    setState("loading");
    setSelected(new Set());
    const data = await services.candidates.listSummaries();
    if (mode === "error") {
      setState("error");
      return;
    }
    setRows(data);
    setState("ready");
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch from the mock service
    load("normal");
  }, [load]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        (stage === "all" || r.stage === stage) &&
        (!q || `${r.name} ${r.appliedFor} ${r.location} ${r.topSkills.join(" ")}`.toLowerCase().includes(q)),
    );
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))) * dir;
    });
  }, [rows, query, stage, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.id));
  const someVisibleSelected = visible.some((r) => selected.has(r.id));

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }));

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((r) => next.delete(r.id));
      else visible.forEach((r) => next.add(r.id));
      return next;
    });

  const moveSelected = (to: ApplicationStage, only?: string) => {
    const ids = only ? new Set([only]) : new Set(selected);
    const before = rows;
    setRows((prev) => prev.map((r) => (ids.has(r.id) ? { ...r, stage: to } : r)));
    if (!only) setSelected(new Set());
    toast.withUndo(`${ids.size} candidate${ids.size === 1 ? "" : "s"} moved to ${STAGE_META[to].label}`, () => setRows(before));
  };

  const resetFilters = () => {
    setQuery("");
    setStage("all");
    setPage(0);
  };

  return (
    <DSSection
      id="tables"
      title="Tables"
      description="The workhorse layout for screening. Sortable headers, row selection with a bulk action bar, filters that report what they scope, and explicit loading, empty and error states."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <IllustrativeNotice />
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-subtle">Simulate</span>
          <Segmented
            label="Simulate data state"
            value={simulate}
            onChange={(v) => {
              setSimulate(v);
              load(v);
            }}
            options={[
              { value: "normal", label: "Success" },
              { value: "error", label: "Error" },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="sm:w-72">
            <Input
              aria-label="Search candidates"
              leading={<Search />}
              placeholder="Search name, vacancy or skill"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              trailing={
                query ? (
                  <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="grid size-6 place-items-center rounded-xs hover:bg-ink-100">
                    <X className="size-3.5" />
                  </button>
                ) : undefined
              }
            />
          </div>
          <div className="sm:w-48">
            <Select
              aria-label="Filter by stage"
              value={stage}
              onValueChange={(v) => {
                setStage(v as typeof stage);
                setPage(0);
              }}
              options={[
                { value: "all", label: "All stages" },
                ...(Object.keys(STAGE_META) as ApplicationStage[]).map((s) => ({ value: s, label: STAGE_META[s].label })),
              ]}
            />
          </div>
          <p className="text-xs text-fg-subtle sm:ml-auto" aria-live="polite">
            {state === "ready" && `${filtered.length} of ${rows.length} candidates`}
          </p>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-ink-900 px-3 py-2 text-sm text-white animate-pop-in" role="region" aria-label="Bulk actions">
            <span className="font-semibold tabular">{selected.size} selected</span>
            <span className="mx-1 h-4 w-px bg-ink-700" aria-hidden />
            <Button size="sm" variant="ghost" className="text-white hover:bg-ink-800 hover:text-white" onClick={() => moveSelected("shortlisted")}>
              Shortlist
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-ink-800 hover:text-white" onClick={() => moveSelected("interview")}>
              Move to interview
            </Button>
            <Button size="sm" variant="ghost" className="text-danger-100 hover:bg-ink-800 hover:text-white" onClick={() => moveSelected("rejected")}>
              Reject
            </Button>
            <Button size="sm" variant="ghost" className="ml-auto text-ink-300 hover:bg-ink-800 hover:text-white" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        )}

        {state === "error" ? (
          <Alert
            tone="danger"
            title="Candidates could not be loaded"
            action={
              <Button size="sm" variant="secondary" onClick={() => { setSimulate("normal"); load("normal"); }}>
                <RefreshCw />
                Retry
              </Button>
            }
          >
            The connection timed out after 30 seconds. Check your network, then retry. Nothing was changed.
          </Alert>
        ) : (
          <TableContainer>
            <Table className="min-w-[50rem]">
              <THead>
                <TR>
                  <TH className="w-10 pr-0">
                    <Checkbox
                      aria-label="Select all candidates on this page"
                      checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
                      onCheckedChange={toggleAll}
                      disabled={state !== "ready" || visible.length === 0}
                    />
                  </TH>
                  <SortableTH label="Candidate" active={sort.key === "name"} direction={sort.dir} onSort={() => toggleSort("name")} />
                  <TH>Applied for</TH>
                  <TH>Stage</TH>
                  <SortableTH label="Match" active={sort.key === "matchScore"} direction={sort.dir} onSort={() => toggleSort("matchScore")} />
                  <SortableTH label="Applied" active={sort.key === "appliedAt"} direction={sort.dir} onSort={() => toggleSort("appliedAt")} />
                  <TH className="w-10">
                    <span className="sr-only">Actions</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {state === "loading" &&
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <TR key={i}>
                      <TD className="pr-0"><Skeleton className="size-4" /></TD>
                      <TD>
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-8 rounded-full" />
                          <div className="flex flex-col gap-1.5"><Skeleton className="h-3 w-32" /><Skeleton className="h-2.5 w-24" /></div>
                        </div>
                      </TD>
                      <TD><Skeleton className="h-3 w-28" /></TD>
                      <TD><Skeleton className="h-5 w-20 rounded-full" /></TD>
                      <TD><Skeleton className="h-3 w-24" /></TD>
                      <TD><Skeleton className="h-3 w-16" /></TD>
                      <TD />
                    </TR>
                  ))}
                {state === "ready" &&
                  visible.map((r) => (
                    <TR key={r.id} selected={selected.has(r.id)}>
                      <TD className="pr-0">
                        <Checkbox aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} />
                      </TD>
                      <TD>
                        <div className="flex items-center gap-3">
                          <Avatar name={r.name} size="sm" />
                          <div className="min-w-0 max-w-56">
                            <p className="truncate font-semibold">{r.name}</p>
                            <p className="truncate text-xs text-fg-subtle">{r.headline} · {r.location}</p>
                          </div>
                        </div>
                      </TD>
                      <TD className="whitespace-nowrap text-fg-muted">{r.appliedFor}</TD>
                      <TD><StageBadge stage={r.stage} size="sm" /></TD>
                      <TD><MatchScore score={r.matchScore} provenance={r.provenance} size="sm" /></TD>
                      <TD>
                        <span className="whitespace-nowrap text-fg-muted" title={formatDate(r.appliedAt)}>{timeAgo(r.appliedAt, new Date(MOCK_NOW))}</span>
                      </TD>
                      <TD>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${r.name}`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => toast.info("Profiles arrive in Module 5", r.name)}>View profile</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => moveSelected("shortlisted", r.id)}>Shortlist</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => toast.info("Scheduling arrives in Module 9", r.name)}>Schedule interview</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem tone="danger" onSelect={() => {
                              const before = rows;
                              setRows((p) => p.map((x) => (x.id === r.id ? { ...x, stage: "rejected" } : x)));
                              toast.withUndo(`${r.name} rejected`, () => setRows(before));
                            }}>
                              Reject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TD>
                    </TR>
                  ))}
              </TBody>
            </Table>
            {state === "ready" && filtered.length === 0 && (
              <EmptyState
                icon={rows.length ? <SearchX /> : <UsersRound />}
                title={rows.length ? "No candidates match these filters" : "No candidates yet"}
                description={
                  rows.length
                    ? `Nothing matches “${query || STAGE_META[stage as ApplicationStage]?.label}”. Try a different skill or clear the filters.`
                    : "Upload CVs or publish a vacancy to start receiving applications."
                }
                action={<Button variant="secondary" size="sm" onClick={resetFilters}>Clear filters</Button>}
              />
            )}
            {state === "ready" && filtered.length > 0 && (
              <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-fg-subtle">
                <span className="tabular">
                  Showing {current * PAGE_SIZE + 1}–{Math.min(filtered.length, (current + 1) * PAGE_SIZE)} of {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)}>
                    <ChevronLeft />
                  </Button>
                  <span className="px-1 tabular">
                    {current + 1} / {pageCount}
                  </span>
                  <Button variant="ghost" size="icon-sm" aria-label="Next page" disabled={current >= pageCount - 1} onClick={() => setPage(current + 1)}>
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            )}
          </TableContainer>
        )}
      </div>
    </DSSection>
  );
}
