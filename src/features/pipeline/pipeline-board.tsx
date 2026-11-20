"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarPlus, ClipboardList, DotsSixVertical, FileSignature, MoreHorizontal, Search, Trash2, UserRound, Sparkles, ArrowRight } from "@/components/icons";
import {
  Button,
  Card,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  Select,
  Skeleton,
  Switch,
  toast,
  LoadError,
  BulkAction,
  BulkBar,
} from "@/components/ui";
import { FilterSelect } from "@/components/ui/filter-select";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { MatchScore } from "@/components/domain/assessment";
import { STAGE_META } from "@/components/domain/status-badge";
import { services, MOCK_NOW, PIPELINE_STAGES, CLOSED_STAGES, type PipelineCard, type VacancyMatchSummary } from "@/services";
import type { ApplicationStage, Vacancy } from "@/types";
import { TEST_BATTERIES } from "@/mocks/auth";
import { cn } from "@/lib/utils";
import { MoveDialog, type MoveRequest } from "./move-dialog";
import { ScheduleDialog, type SchedulePreset } from "@/features/interviews/schedule-dialog";
import { CardDrawer } from "./card-drawer";
import { TestLine } from "./test-line";

const NOW = new Date(MOCK_NOW).getTime();
const daysIn = (iso: string) => Math.max(0, Math.floor((NOW - new Date(iso).getTime()) / 86400000));
const key = (c: PipelineCard) => c.applicationId;

const COLUMN_HINT: Partial<Record<ApplicationStage, string>> = {
  applied: "New applications and CV uploads",
  assessment: "Psychometric tests",
  rejected: "Kept for the audit record",
};

const COLUMN_STEP = 20;

export function PipelineBoard() {
  const router = useRouter();
  const params = useSearchParams();
  const [vacancies, setVacancies] = React.useState<VacancyMatchSummary[] | null>(null);
  const [board, setBoard] = React.useState<{ vacancy: Vacancy; cards: PipelineCard[] } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [sources, setSources] = React.useState<string[]>([]);
  const [minMatch, setMinMatch] = React.useState("0");
  const [showClosed, setShowClosed] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [move, setMove] = React.useState<MoveRequest | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState<string[] | null>(null);
  const [over, setOver] = React.useState<ApplicationStage | null>(null);
  const [scheduleFor, setScheduleFor] = React.useState<SchedulePreset | null>(null);
  /** Cards shown per column; long columns grow in steps so the board stays quick to scan. */
  const [limits, setLimits] = React.useState<Partial<Record<ApplicationStage, number>>>({});

  const vacancyId = params.get("vacancy") ?? vacancies?.[0]?.vacancy.id ?? null;

  React.useEffect(() => {
    services.matching
      .vacancies()
      .then((v) => setVacancies(v.filter((x) => x.vacancy.status !== "filled" || x.assessed > 0)))
      .catch((e: Error) => setError(e.message));
  }, [reload]);

  React.useEffect(() => {
    if (!vacancyId) return;
    let alive = true;
    services.pipeline
      .board(vacancyId)
      .then((b) => alive && setBoard(b))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [vacancyId, reload]);

  const switchVacancy = (id: string) => {
    setBoard(null);
    setSelected(new Set());
    router.replace(`/pipeline?vacancy=${id}`, { scroll: false });
  };

  const cards = board?.cards ?? [];
  const shown = cards.filter(
    (c) =>
      (!query || `${c.name} ${c.headline} ${c.location}`.toLowerCase().includes(query.toLowerCase())) &&
      (sources.length === 0 || sources.includes(c.source)) &&
      c.matchScore >= Number(minMatch),
  );
  const filtered = shown.length !== cards.length;
  const closedCount = cards.filter((c) => CLOSED_STAGES.includes(c.stage)).length;
  const columns = showClosed ? [...PIPELINE_STAGES, ...CLOSED_STAGES] : PIPELINE_STAGES;
  const picked = cards.filter((c) => selected.has(key(c)));
  const batteryLabel = board ? (TEST_BATTERIES.find((b) => b.value === board.vacancy.assessment.battery)?.label ?? null) : null;
  const openCard = cards.find((c) => key(c) === open) ?? null;

  const toggle = (c: PipelineCard) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(key(c))) n.delete(key(c));
      else n.add(key(c));
      return n;
    });
  const refresh = () => {
    setSelected(new Set());
    setReload((r) => r + 1);
  };
  const sendTests = async (list: PipelineCard[]) => {
    const r = await services.pipeline.sendTests(list.map((c) => ({ candidateId: c.candidateId, applicationId: c.applicationId })));
    if (r.testsSent) toast.success(`${batteryLabel} sent to ${r.testsSent} ${r.testsSent === 1 ? "candidate" : "candidates"}`, r.skipped.length ? `${r.skipped.length} skipped: ${r.skipped.map((s) => `${s.name.split(" ")[0]} ${s.reason}`).join("; ")}` : `Due in ${board!.vacancy.assessment.deadlineDays} days`);
    else toast.warning("No tests sent", r.skipped.map((s) => `${s.name}: ${s.reason}`).join("; "));
    refresh();
  };

  const dropOn = (stage: ApplicationStage) => {
    const ids = dragging;
    setDragging(null);
    setOver(null);
    if (!ids) return;
    const list = cards.filter((c) => ids.includes(key(c)) && c.stage !== stage);
    if (list.length) setMove({ cards: list, stage });
  };

  return (
    <PageContainer
      className="max-w-none"
      header={
        <PageHeader
          title="Pipeline"
          description="Where every candidate stands for a vacancy. Drag a card to move it, or select several. Each move is saved to the candidate's decision record."
        />
      }
    >
      {error ? (
        <LoadError title="The pipeline didn't load" onRetry={() => (setError(null), setReload((r) => r + 1))}>
          {error}
        </LoadError>
      ) : !vacancies ? (
        <Skeleton className="h-[30rem] rounded-lg" />
      ) : vacancies.length === 0 ? (
        <Card>
          <EmptyState icon={<UserRound />} title="No candidates yet" description="Publish a vacancy or upload CVs, and applications will appear here." />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          <nav aria-label="Vacancies" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ul className="flex gap-2">
              {vacancies.map((s) => {
                const active = s.vacancy.id === vacancyId;
                return (
                  <li key={s.vacancy.id}>
                    <button
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => switchVacancy(s.vacancy.id)}
                      className={cn(
                        "pressable flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
                        active ? "border-primary-600 bg-primary-600 text-white" : "border-line-strong bg-surface text-fg-muted hover:border-ink-400 hover:text-fg",
                      )}
                    >
                      {s.vacancy.title}
                      <span className={cn("text-xs tabular", active ? "text-white/75" : "text-fg-subtle")}>{s.assessed}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="w-full lg:max-w-xs">
              <Input leading={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this pipeline" aria-label="Search candidates in this pipeline" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect
                label="Source"
                value={sources}
                onChange={setSources}
                options={[...new Set(cards.map((c) => c.source))].map((s) => ({ value: s, label: s, count: cards.filter((c) => c.source === s).length }))}
              />
              <div className="w-40">
                <Select
                  size="sm"
                  aria-label="Minimum match"
                  value={minMatch}
                  onValueChange={setMinMatch}
                  options={[
                    { value: "0", label: "Any match" },
                    { value: "50", label: "50% and above" },
                    { value: "70", label: "70% and above" },
                    { value: "80", label: "80% and above" },
                  ]}
                />
              </div>
              {filtered && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setQuery("");
                    setSources([]);
                    setMinMatch("0");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-fg-muted lg:ml-auto">
              <Switch checked={showClosed} onCheckedChange={setShowClosed} />
              Show rejected and withdrawn
              <span className="text-xs text-fg-subtle tabular">({closedCount})</span>
            </label>
          </div>

          {!board ? (
            <div className="flex gap-3 overflow-hidden">
              {PIPELINE_STAGES.slice(0, 5).map((s) => (
                <Skeleton key={s} className="h-80 w-72 shrink-0 rounded-lg" />
              ))}
            </div>
          ) : (
            <>
            <nav aria-label="Jump to stage" className="-mx-4 -mb-2 overflow-x-auto px-4 sm:hidden">
              <ul className="flex gap-1.5">
                {columns.map((stage) => (
                  <li key={stage}>
                    <button
                      type="button"
                      onClick={() => {
                        const col = document.getElementById(`col-${stage}`);
                        const region = col?.closest<HTMLElement>("[role=region]");
                        if (col && region) region.scrollTo({ left: col.offsetLeft - 16, behavior: "smooth" });
                      }}
                      className="flex h-7 items-center gap-1.5 rounded-full bg-ink-100 px-2.5 text-xs font-medium whitespace-nowrap text-fg-muted"
                    >
                      {STAGE_META[stage].label}
                      <span className="text-fg-subtle tabular">{shown.filter((c) => c.stage === stage).length}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="-mx-4 scroll-px-4 overflow-x-auto px-4 pb-4 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12" role="region" aria-label={`${board.vacancy.title} pipeline`}>
              <ol className="relative flex snap-x snap-proximity gap-3 sm:snap-none">
                {columns.map((stage) => {
                  const inCol = shown.filter((c) => c.stage === stage);
                  const total = cards.filter((c) => c.stage === stage).length;
                  const isOver = over === stage && !!dragging;
                  const allPicked = inCol.length > 0 && inCol.every((c) => selected.has(key(c)));
                  return (
                    <li
                      key={stage}
                      id={`col-${stage}`}
                      onDragOver={(e) => {
                        if (!dragging) return;
                        e.preventDefault();
                        if (over !== stage) setOver(stage);
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((o) => (o === stage ? null : o));
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        dropOn(stage);
                      }}
                      className={cn(
                        "flex w-[min(17rem,82vw)] shrink-0 snap-start flex-col rounded-lg transition-colors duration-150",
                        CLOSED_STAGES.includes(stage) ? "bg-ink-100/70" : "bg-ink-100",
                        isOver && "bg-primary-50 ring-2 ring-primary-500/40",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
                        <div className="min-w-0">
                          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                            {STAGE_META[stage].label}
                            <span className="text-xs font-medium text-fg-subtle tabular">{filtered ? `${inCol.length}/${total}` : total}</span>
                          </h2>
                          <p className="truncate text-xs text-fg-subtle">{stage === "assessment" && batteryLabel ? batteryLabel : COLUMN_HINT[stage] ?? " "}</p>
                        </div>
                        {inCol.length > 0 && (
                          <Checkbox
                            aria-label={`Select everyone in ${STAGE_META[stage].label}`}
                            checked={allPicked ? true : inCol.some((c) => selected.has(key(c))) ? "indeterminate" : false}
                            onCheckedChange={() =>
                              setSelected((s) => {
                                const n = new Set(s);
                                inCol.forEach((c) => (allPicked ? n.delete(key(c)) : n.add(key(c))));
                                return n;
                              })
                            }
                            className="mt-0.5"
                          />
                        )}
                      </div>
                      <ul className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                        {inCol.slice(0, limits[stage] ?? COLUMN_STEP).map((c) => (
                          <BoardCard
                            key={key(c)}
                            c={c}
                            vacancyId={board.vacancy.id}
                            selected={selected.has(key(c))}
                            selecting={selected.size > 0}
                            dimmed={!!dragging?.includes(key(c))}
                            canSendTests={!!batteryLabel}
                            onToggle={() => toggle(c)}
                            onOpen={() => setOpen(key(c))}
                            onMoveTo={(s) => setMove({ cards: [c], stage: s })}
                            onSendTests={() => sendTests([c])}
                            onSchedule={() => setScheduleFor({ candidateId: c.candidateId, vacancyId: board.vacancy.id })}
                            onDragStart={() => setDragging(selected.has(key(c)) ? [...selected] : [key(c)])}
                            onDragEnd={() => {
                              setDragging(null);
                              setOver(null);
                            }}
                          />
                        ))}
                        {inCol.length > (limits[stage] ?? COLUMN_STEP) && (
                          <li>
                            <button
                              type="button"
                              onClick={() => setLimits((l) => ({ ...l, [stage]: (l[stage] ?? COLUMN_STEP) + COLUMN_STEP }))}
                              className="pressable w-full rounded-md border border-dashed border-line-strong px-3 py-2 text-xs font-medium text-fg-muted hover:border-primary-500 hover:text-primary-700"
                            >
                              Show {Math.min(COLUMN_STEP, inCol.length - (limits[stage] ?? COLUMN_STEP))} more
                              <span className="text-fg-subtle"> · {inCol.length - (limits[stage] ?? COLUMN_STEP)} hidden</span>
                            </button>
                          </li>
                        )}
                        {inCol.length === 0 && (
                          <li
                            className={cn(
                              "grid flex-1 place-items-center rounded-md border border-dashed px-3 py-6 text-center text-xs",
                              isOver ? "border-primary-500 text-primary-700" : "border-line-strong text-fg-subtle",
                            )}
                          >
                            {dragging ? "Drop here" : filtered && total ? "No one matches the filters" : "No one at this stage"}
                          </li>
                        )}
                      </ul>
                    </li>
                  );
                })}
              </ol>
            </div>
            </>
          )}
        </div>
      )}

      {picked.length > 0 && board && (
        <BulkBar label={`${picked.length} selected`} onClear={() => setSelected(new Set())}>
          <BulkAction primary onClick={() => setMove({ cards: picked })}>
            <ArrowRight />
            Move
          </BulkAction>
          {batteryLabel && (
            <BulkAction onClick={() => sendTests(picked)}>
              <ClipboardList />
              Send tests
            </BulkAction>
          )}
          <BulkAction danger onClick={() => setMove({ cards: picked, stage: "rejected" })}>
            <Trash2 />
            Reject
          </BulkAction>
        </BulkBar>
      )}

      {board && (
        <>
          <ScheduleDialog open={!!scheduleFor} onOpenChange={(o) => !o && setScheduleFor(null)} preset={scheduleFor ?? undefined} onScheduled={refresh} />
          <MoveDialog request={move} vacancy={board.vacancy} batteryLabel={batteryLabel} onClose={() => setMove(null)} onMoved={refresh} />
          <CardDrawer
            card={openCard}
            vacancyId={board.vacancy.id}
            canSendTests={!!batteryLabel}
            onClose={() => setOpen(null)}
            onMove={(c) => setMove({ cards: [c] })}
            onSendTests={(c) => sendTests([c])}
          />
        </>
      )}
    </PageContainer>
  );
}

function BoardCard({
  c,
  vacancyId,
  selected,
  selecting,
  dimmed,
  canSendTests,
  onToggle,
  onOpen,
  onMoveTo,
  onSendTests,
  onSchedule,
  onDragStart,
  onDragEnd,
}: {
  c: PipelineCard;
  vacancyId: string;
  selected: boolean;
  selecting: boolean;
  dimmed: boolean;
  canSendTests: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onMoveTo: (s: ApplicationStage) => void;
  onSendTests: () => void;
  onSchedule: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const days = daysIn(c.stageSince);
  const closed = c.stage === "hired" || c.stage === "withdrawn";
  const last = c.history.at(-1);
  const showTests = !!c.tests && ["assessment", "interview", "shortlisted"].includes(c.stage);
  return (
    <li
      draggable={!closed}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", c.applicationId);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative rounded-md bg-surface p-3 shadow-platter transition-[opacity,box-shadow] duration-150",
        !closed && "cursor-grab active:cursor-grabbing",
        selected && "ring-2 ring-primary-500",
        dimmed && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn("-ml-1 transition-opacity", selected || selecting ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100")}>
          <Checkbox aria-label={`Select ${c.name}`} checked={selected} onCheckedChange={onToggle} />
        </span>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-semibold text-fg hover:underline">{c.name}</span>
          <span className="block truncate text-xs text-fg-subtle">{c.headline}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${c.name}`} className="-mt-1 -mr-1.5 size-7">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {!closed && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowRight />
                  Move to
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {[...PIPELINE_STAGES, "rejected" as const]
                    .filter((s) => s !== c.stage)
                    .map((s) => (
                      <DropdownMenuItem key={s} onSelect={() => onMoveTo(s)} tone={s === "rejected" ? "danger" : undefined}>
                        {STAGE_META[s].label}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {canSendTests && !closed && c.stage !== "rejected" && (!c.tests || ["expired", "cancelled"].includes(c.tests.status)) && (
              <DropdownMenuItem onSelect={onSendTests}>
                <ClipboardList />
                Send tests
              </DropdownMenuItem>
            )}
            {(c.stage === "interview" || c.stage === "offer") && (
              <DropdownMenuItem asChild>
                <Link href={`/offers/new?candidate=${c.candidateId}&vacancy=${vacancyId}`}>
                  <FileSignature />
                  Create offer
                </Link>
              </DropdownMenuItem>
            )}
            {!closed && c.stage !== "rejected" && (
              <DropdownMenuItem onSelect={onSchedule}>
                <CalendarPlus />
                Schedule interview
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/matching/${vacancyId}/${c.candidateId}`}>
                <Sparkles />
                Assessment
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/candidates/${c.candidateId}`}>
                <UserRound />
                Profile
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 pl-6">
        <MatchScore score={c.matchScore} provenance={c.provenance} size="sm" />
        <span className={cn("text-xs tabular", days >= 7 && !CLOSED_STAGES.includes(c.stage) && !closed ? "font-semibold text-warning-700" : "text-fg-subtle")}>
          {days === 0 ? "Today" : `${days}d in stage`}
        </span>
      </div>
      {showTests && <TestLine tests={c.tests!} className="mt-2 pl-6" />}
      {c.stage === "rejected" && last?.note && <p className="mt-2 line-clamp-2 pl-6 text-xs text-fg-muted">{last.note}</p>}
      {!closed && <DotsSixVertical className="absolute top-1/2 right-1 hidden size-3.5 -translate-y-1/2 text-ink-300 opacity-0 transition-opacity group-hover:opacity-100 sm:block" aria-hidden />}
    </li>
  );
}
