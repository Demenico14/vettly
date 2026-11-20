"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, ClipboardList, Download, RefreshCw, Search, SearchX, UsersRound, X } from "@/components/icons";
import { SendTestsDialog } from "@/features/assessments/send-tests-dialog";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Input,
  Select,
  Skeleton,
  SortableTH,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Tag,
  toast,
  type SortDirection,
} from "@/components/ui";
import { FilterSelect } from "@/components/ui/filter-select";
import { StageBadge, STAGE_META } from "@/components/domain/status-badge";
import { MatchScore } from "@/components/domain/assessment";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { services, MOCK_NOW } from "@/services";
import { ALL_LOCATIONS, ALL_SKILLS, ALL_SOURCES } from "@/mocks/candidates";
import type { ApplicationStage, AssessmentProvenance, Availability, CandidateProfile } from "@/types";
import { timeAgo } from "@/lib/utils";

const NOW = new Date(MOCK_NOW);
type SortKey = "appliedAt" | "matchScore" | "name";

interface Filters {
  stages: string[];
  vacancies: string[];
  locations: string[];
  skills: string[];
  sources: string[];
  availability: string[];
  review: string[];
  minMatch: string;
  pool: boolean;
}
const NO_FILTERS: Filters = { stages: [], vacancies: [], locations: [], skills: [], sources: [], availability: [], review: [], minMatch: "0", pool: false };

const REVIEW_LABEL: Record<AssessmentProvenance, string> = {
  ai_illustrative: "AI suggestion, not reviewed",
  hr_confirmed: "Confirmed by HR",
  hr_overridden: "Adjusted by HR",
};
const AVAILABILITY: Availability[] = ["Immediately", "2 weeks' notice", "1 month's notice", "3 months' notice"];

function primary(c: CandidateProfile) {
  return c.applications[0]!;
}

export function CandidateDirectory() {
  const router = useRouter();
  const [rows, setRows] = React.useState<CandidateProfile[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [f, setF] = React.useState<Filters>(NO_FILTERS);
  const [sort, setSort] = React.useState<{ key: SortKey; dir: SortDirection }>({ key: "appliedAt", dir: "desc" });
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [sendingTests, setSendingTests] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before refetching
    setError(null);
    services.profiles
      .list()
      .then((r) => alive && setRows(r))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [reload]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((x) => ({ ...x, [k]: v }));
  const count = (pred: (c: CandidateProfile) => boolean) => (rows ?? []).filter(pred).length;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = Number(f.minMatch);
    const list = (rows ?? []).filter((c) => {
      const app = primary(c);
      const hay = `${c.name} ${c.headline} ${c.email} ${c.location} ${c.currentEmployer ?? ""} ${c.skills.map((s) => s.name).join(" ")} ${c.applications.map((a) => a.vacancyTitle).join(" ")}`.toLowerCase();
      return (
        (!q || hay.includes(q)) &&
        (f.stages.length === 0 || f.stages.includes(app.stage)) &&
        (f.vacancies.length === 0 || c.applications.some((a) => f.vacancies.includes(a.vacancyTitle))) &&
        (f.locations.length === 0 || f.locations.includes(c.location)) &&
        (f.skills.length === 0 || f.skills.every((s) => c.skills.some((x) => x.name === s))) &&
        (f.sources.length === 0 || f.sources.includes(app.source)) &&
        (f.availability.length === 0 || f.availability.includes(c.availability)) &&
        (f.review.length === 0 || f.review.includes(app.provenance)) &&
        app.matchScore >= min &&
        (!f.pool || c.inTalentPool)
      );
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      if (sort.key === "name") return a.name.localeCompare(b.name) * dir;
      if (sort.key === "matchScore") return (primary(a).matchScore - primary(b).matchScore) * dir;
      return primary(a).appliedAt.localeCompare(primary(b).appliedAt) * dir;
    });
  }, [rows, query, f, sort]);

  const activeCount =
    f.stages.length + f.vacancies.length + f.locations.length + f.skills.length + f.sources.length + f.availability.length + f.review.length + (f.minMatch !== "0" ? 1 : 0) + (f.pool ? 1 : 0);
  const clear = () => {
    setF(NO_FILTERS);
    setQuery("");
  };
  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }));
  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  const vacancyOptions = [...new Set((rows ?? []).flatMap((c) => c.applications.map((a) => a.vacancyTitle)))].sort();

  return (
    <PageContainer
      header={
        <PageHeader
          title="Candidates"
          description="Everyone who has applied, with their latest stage and Vettly's match for that vacancy."
          actions={
            <Button variant="secondary" onClick={() => router.push("/cv-processing")}>
              Upload CVs
            </Button>
          }
        />
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_13rem]">
            <Input
              aria-label="Search candidates"
              leading={<Search />}
              placeholder="Search name, skill, employer, email or vacancy"
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
            <Select
              aria-label="Sort candidates"
              value={`${sort.key}:${sort.dir}`}
              onValueChange={(v) => {
                const [key, dir] = v.split(":") as [SortKey, SortDirection];
                setSort({ key, dir });
              }}
              options={[
                { value: "appliedAt:desc", label: "Newest applications" },
                { value: "matchScore:desc", label: "Highest match" },
                { value: "name:asc", label: "Name A–Z" },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
            <FilterSelect
              label="Stage"
              value={f.stages}
              onChange={(v) => set("stages", v)}
              options={(Object.keys(STAGE_META) as ApplicationStage[]).map((s) => ({ value: s, label: STAGE_META[s].label, count: count((c) => primary(c).stage === s) }))}
            />
            <FilterSelect label="Vacancy" value={f.vacancies} onChange={(v) => set("vacancies", v)} options={vacancyOptions.map((v) => ({ value: v, label: v }))} />
            <FilterSelect label="Skills" searchable value={f.skills} onChange={(v) => set("skills", v)} options={ALL_SKILLS.map((s) => ({ value: s, label: s, count: count((c) => c.skills.some((x) => x.name === s)) }))} />
            <FilterSelect label="Location" value={f.locations} onChange={(v) => set("locations", v)} options={ALL_LOCATIONS.map((s) => ({ value: s, label: s, count: count((c) => c.location === s) }))} />
            <FilterSelect label="Availability" value={f.availability} onChange={(v) => set("availability", v)} options={AVAILABILITY.map((s) => ({ value: s, label: s }))} />
            <FilterSelect label="Source" value={f.sources} onChange={(v) => set("sources", v)} options={ALL_SOURCES.map((s) => ({ value: s, label: s }))} />
            <FilterSelect
              label="Assessment"
              value={f.review}
              onChange={(v) => set("review", v)}
              options={(Object.keys(REVIEW_LABEL) as AssessmentProvenance[]).map((s) => ({ value: s, label: REVIEW_LABEL[s], count: count((c) => primary(c).provenance === s) }))}
            />
            <Select
              size="sm"
              aria-label="Minimum match"
              value={f.minMatch}
              onValueChange={(v) => set("minMatch", v)}
              className="h-8 w-auto rounded-full text-xs"
              options={[
                { value: "0", label: "Any match" },
                { value: "50", label: "Match 50%+" },
                { value: "60", label: "Match 60%+" },
                { value: "70", label: "Match 70%+" },
                { value: "80", label: "Match 80%+" },
              ]}
            />
            <button
              type="button"
              aria-pressed={f.pool}
              onClick={() => set("pool", !f.pool)}
              className={
                f.pool
                  ? "pressable inline-flex h-8 items-center gap-1.5 rounded-full border border-primary-500/40 bg-primary-50 px-3 text-xs font-semibold text-primary-800"
                  : "pressable inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-xs font-medium text-fg-muted hover:text-fg"
              }
            >
              <Bookmark className="size-3.5" weight={f.pool ? "fill" : "regular"} />
              Talent pool
            </button>
            {activeCount > 0 && (
              <button type="button" onClick={clear} className="h-8 px-2 text-xs font-semibold text-primary-700 hover:underline">
                Clear all ({activeCount})
              </button>
            )}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-ink-900 px-3 py-2 text-sm text-white animate-pop-in" role="region" aria-label="Bulk actions">
            <span className="font-semibold tabular">{selected.size} selected</span>
            <span className="mx-1 h-4 w-px bg-ink-700" aria-hidden />
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-ink-800 hover:text-white"
              onClick={async () => {
                const ids = [...selected];
                await Promise.all(ids.map((id) => services.profiles.setTalentPool(id, true)));
                setRows((r) => r?.map((c) => (selected.has(c.id) ? { ...c, inTalentPool: true } : c)) ?? null);
                setSelected(new Set());
                toast.success(`${ids.length} added to the talent pool`);
              }}
            >
              <Bookmark />
              Add to talent pool
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-ink-800 hover:text-white"
              onClick={() => toast.success("Export ready (simulated)", `candidates-${selected.size}.csv`)}
            >
              <Download />
              Export CSV
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-ink-800 hover:text-white" onClick={() => setSendingTests(true)}>
              <ClipboardList />
              Send tests
            </Button>
            <Button size="sm" variant="ghost" className="ml-auto text-ink-300 hover:bg-ink-800 hover:text-white" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        )}

        {error ? (
          <Alert
            tone="danger"
            title="Candidates could not be loaded"
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
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-44" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                    <Skeleton className="hidden h-5 w-20 rounded-full md:block" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={rows.length ? <SearchX /> : <UsersRound />}
                title={rows.length ? "No candidates match" : "No candidates yet"}
                description={rows.length ? "Remove a filter or search for something broader." : "Upload CVs or publish a vacancy to start receiving applications."}
                action={
                  rows.length ? (
                    <Button size="sm" variant="secondary" onClick={clear}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => router.push("/cv-processing")}>
                      Upload CVs
                    </Button>
                  )
                }
              />
            ) : (
              <>
                <ul className="md:hidden">
                  {filtered.map((c) => (
                    <li key={c.id}>
                      <Link href={`/candidates/${c.id}`} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0 hover:bg-surface-muted">
                        <Avatar name={c.name} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-fg">{c.name}</span>
                          <span className="block truncate text-xs text-fg-subtle">
                            {primary(c).vacancyTitle} · {c.location}
                          </span>
                          <span className="mt-1.5 block">
                            <StageBadge stage={primary(c).stage} size="sm" />
                          </span>
                        </span>
                        <MatchScore score={primary(c).matchScore} provenance={primary(c).provenance} size="sm" />
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto md:block">
                  <Table className="min-w-[60rem]">
                    <THead>
                      <TR>
                        <TH className="w-10 pr-0">
                          <Checkbox
                            aria-label="Select all candidates shown"
                            checked={allSelected ? true : selected.size > 0 ? "indeterminate" : false}
                            onCheckedChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map((c) => c.id)))}
                          />
                        </TH>
                        <SortableTH label="Candidate" active={sort.key === "name"} direction={sort.dir} onSort={() => toggleSort("name")} />
                        <TH>Applied for</TH>
                        <TH>Stage</TH>
                        <SortableTH label="Match" active={sort.key === "matchScore"} direction={sort.dir} onSort={() => toggleSort("matchScore")} />
                        <TH>Skills</TH>
                        <TH>Availability</TH>
                        <SortableTH label="Applied" active={sort.key === "appliedAt"} direction={sort.dir} onSort={() => toggleSort("appliedAt")} />
                      </TR>
                    </THead>
                    <TBody>
                      {filtered.map((c) => {
                        const app = primary(c);
                        return (
                          <TR key={c.id} selected={selected.has(c.id)} className="cursor-pointer" onClick={() => router.push(`/candidates/${c.id}`)}>
                            <TD className="pr-0" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                aria-label={`Select ${c.name}`}
                                checked={selected.has(c.id)}
                                onCheckedChange={() =>
                                  setSelected((s) => {
                                    const n = new Set(s);
                                    if (n.has(c.id)) n.delete(c.id);
                                    else n.add(c.id);
                                    return n;
                                  })
                                }
                              />
                            </TD>
                            <TD>
                              <span className="flex items-center gap-3">
                                <Avatar name={c.name} size="sm" />
                                <span className="min-w-0 max-w-64">
                                  <Link href={`/candidates/${c.id}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 truncate font-semibold text-fg hover:underline">
                                    {c.name}
                                    {c.inTalentPool && <Bookmark className="size-3.5 shrink-0 text-primary-600" weight="fill" aria-label="In talent pool" />}
                                  </Link>
                                  <span className="block truncate text-xs text-fg-subtle">
                                    {c.headline} · {c.location}
                                  </span>
                                </span>
                              </span>
                            </TD>
                            <TD className="whitespace-nowrap text-fg-muted">
                              {app.vacancyTitle}
                              {c.applications.length > 1 && <span className="block text-xs text-fg-subtle">+{c.applications.length - 1} earlier</span>}
                            </TD>
                            <TD>
                              <StageBadge stage={app.stage} size="sm" />
                            </TD>
                            <TD>
                              <MatchScore score={app.matchScore} provenance={app.provenance} size="sm" />
                            </TD>
                            <TD>
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                <Tag className="h-5 max-w-36 px-1.5 text-2xs">
                                  <span className="truncate">{c.skills[0]?.name}</span>
                                </Tag>
                                {c.skills.length > 1 && (
                                  <span className="text-2xs text-fg-subtle" title={c.skills.slice(1).map((x) => x.name).join(", ")}>
                                    +{c.skills.length - 1}
                                  </span>
                                )}
                              </span>
                            </TD>
                            <TD className="whitespace-nowrap text-fg-muted">{c.availability}</TD>
                            <TD className="whitespace-nowrap text-fg-subtle">{timeAgo(app.appliedAt, NOW)}</TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                </div>
                <p className="border-t border-line px-4 py-2.5 text-xs text-fg-subtle" aria-live="polite">
                  {filtered.length} of {rows.length} candidates
                  {f.skills.length > 1 && ` with all of: ${f.skills.join(", ")}`}
                </p>
              </>
            )}
          </Card>
        )}
      </div>
      <SendTestsDialog
        open={sendingTests}
        onOpenChange={setSendingTests}
        targets={(rows ?? [])
          .filter((c) => selected.has(c.id))
          .map((c) => ({ candidateId: c.id, vacancyId: c.applications[0]!.vacancyId, name: c.name, vacancyTitle: c.applications[0]!.vacancyTitle }))}
        onSent={() => setSelected(new Set())}
      />
    </PageContainer>
  );
}
