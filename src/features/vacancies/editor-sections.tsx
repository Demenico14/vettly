"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Plus, Sparkles, Trash2 } from "@/components/icons";
import {
  Button,
  CheckboxField,
  Field,
  Input,
  RadioGroup,
  Select,
  SwitchField,
  Textarea,
  toast,
} from "@/components/ui";
import { Slider } from "@/components/ui/slider";
import { ProvenanceTag } from "@/components/domain/assessment";
import { services, type AssistAction } from "@/services";
import { CHANNELS, DEPARTMENTS, LOCATIONS } from "@/lib/catalog";
import { TEST_BATTERIES } from "@/lib/onboarding";
import type { Requirement, RequirementKind, RequirementPriority, ScreeningWeights, VacancyDraft } from "@/types";
import { cn } from "@/lib/utils";
import { REQUIREMENT_KIND, WEIGHT_LABELS } from "./vacancy-meta";

export type Errors = Partial<Record<string, string>>;
export type SetDraft = <K extends keyof VacancyDraft>(k: K, v: VacancyDraft[K]) => void;
type Props = { draft: VacancyDraft; set: SetDraft; errors: Errors };

export function EditorSection({
  id,
  title,
  description,
  children,
  aside,
}: {
  id: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20 rounded-lg bg-surface shadow-platter">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div>
          <h2 id={`${id}-h`} className="text-base font-semibold text-fg">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
        </div>
        {aside}
      </header>
      <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

/* ---------- Basics ---------- */

export function BasicsSection({ draft, set, errors }: Props) {
  const toDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
  const [people, setPeople] = React.useState<string[]>([]);
  React.useEffect(() => {
    services.settings
      .members()
      .then((m) => setPeople(m.members.filter((x) => x.status === "active").map((x) => x.name).sort()))
      .catch(() => undefined);
  }, []);
  const managers = [...new Set([...people, ...(draft.hiringManager ? [draft.hiringManager] : [])])];
  return (
    <EditorSection id="basics" title="Basics" description="Where the role sits and what it pays. Candidates see everything except hidden salary.">
      <Field label="Job title" required error={errors.title} hint="Use the title candidates search for, e.g. “Finance Manager”, not internal grades.">
        <Input value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Finance Manager" autoFocus={!draft.title} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Department" required error={errors.department}>
          <Select value={draft.department} onValueChange={(v) => set("department", v)} placeholder="Choose department" options={DEPARTMENTS.map((d) => ({ value: d, label: d }))} />
        </Field>
        <Field label="Hiring manager" required error={errors.hiringManager} hint="Reviews the shortlist and joins interview panels.">
          <Select value={draft.hiringManager} onValueChange={(v) => set("hiringManager", v)} placeholder="Choose a person" options={managers.map((d) => ({ value: d, label: d }))} />
        </Field>
        <Field label="Location" required error={errors.location}>
          <Select value={draft.location} onValueChange={(v) => set("location", v)} placeholder="Choose location" options={LOCATIONS.map((d) => ({ value: d, label: d }))} />
        </Field>
        <Field label="Work arrangement">
          <Select
            value={draft.workMode}
            onValueChange={(v) => set("workMode", v as VacancyDraft["workMode"])}
            options={["On-site", "Hybrid", "Remote"].map((d) => ({ value: d, label: d }))}
          />
        </Field>
        <Field label="Employment type">
          <Select
            value={draft.employmentType}
            onValueChange={(v) => set("employmentType", v as VacancyDraft["employmentType"])}
            options={["Full-time", "Part-time", "Contract", "Internship"].map((d) => ({ value: d, label: d }))}
          />
        </Field>
        <Field label="Openings" error={errors.openings}>
          <Input type="number" min={1} max={50} inputMode="numeric" value={draft.openings} onChange={(e) => set("openings", Math.max(0, Number(e.target.value)))} />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1.5 text-sm font-semibold text-fg">Monthly salary range</legend>
        <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)]">
          <Select
            aria-label="Currency"
            value={draft.currency}
            onValueChange={(v) => set("currency", v as VacancyDraft["currency"])}
            options={["USD", "ZiG", "ZAR", "BWP", "ZMW"].map((c) => ({ value: c, label: c }))}
          />
          <Input
            aria-label="Minimum salary"
            inputMode="numeric"
            placeholder="Minimum"
            value={draft.salaryMin ?? ""}
            aria-invalid={errors.salary ? true : undefined}
            onChange={(e) => set("salaryMin", e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, "")))}
          />
          <Input
            aria-label="Maximum salary"
            inputMode="numeric"
            placeholder="Maximum"
            value={draft.salaryMax ?? ""}
            aria-invalid={errors.salary ? true : undefined}
            onChange={(e) => set("salaryMax", e.target.value === "" ? null : Number(e.target.value.replace(/\D/g, "")))}
          />
        </div>
        {errors.salary && (
          <p className="text-xs font-medium text-danger-700" role="alert">
            {errors.salary}
          </p>
        )}
        <SwitchField
          checked={draft.salaryVisible}
          onCheckedChange={(c) => set("salaryVisible", c)}
          label="Show salary on the advert"
          description="Adverts with a salary range typically receive more relevant applications."
        />
      </fieldset>
      <Field label="Closing date" required error={errors.closesAt} hint="Applications close at 17:00 on this day (Central Africa Time).">
        <Input
          type="date"
          className="sm:max-w-56"
          value={toDate(draft.closesAt)}
          min="2026-11-19"
          onChange={(e) => set("closesAt", e.target.value ? `${e.target.value}T17:00:00+02:00` : null)}
        />
      </Field>
    </EditorSection>
  );
}

/* ---------- Description with writing assistant ---------- */

const ASSIST_ACTIONS: { action: AssistAction; label: string; needs: "title" | "summary" }[] = [
  { action: "draft", label: "Draft from title", needs: "title" },
  { action: "inclusive", label: "Make more inclusive", needs: "summary" },
  { action: "concise", label: "Make concise", needs: "summary" },
  { action: "formal", label: "More formal", needs: "summary" },
];

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  error?: string;
}) {
  const [draft, setDraft] = React.useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft("");
  };
  const move = (i: number, d: -1 | 1) => {
    const n = items.slice();
    const j = i + d;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j]!, n[i]!];
    onChange(n);
  };
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-fg">{label}</p>
      {items.length > 0 && (
        <ol className="mb-2 divide-y divide-line rounded-md border border-line">
          {items.map((it, i) => (
            <li key={`${i}-${it}`} className="flex items-center gap-2 py-1 pr-1 pl-3">
              <span className="w-4 shrink-0 text-xs text-fg-subtle tabular">{i + 1}</span>
              <input
                aria-label={`${label} ${i + 1}`}
                value={it}
                onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
                className="h-8 min-w-0 flex-1 rounded-sm bg-transparent px-1.5 text-sm text-fg outline-none focus-visible:bg-surface-muted"
              />
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move item ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move item ${i + 1} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove item ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex gap-2">
        <Input
          aria-label={`Add to ${label.toLowerCase()}`}
          placeholder={placeholder}
          value={draft}
          aria-invalid={error ? true : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={add} disabled={!draft.trim()}>
          <Plus />
          Add
        </Button>
      </div>
      {error && (
        <p className="mt-1.5 text-xs font-medium text-danger-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function DescriptionSection({ draft, set, errors }: Props) {
  const [running, setRunning] = React.useState<AssistAction | null>(null);
  const [stream, setStream] = React.useState("");
  const [suggestion, setSuggestion] = React.useState<{ action: AssistAction; summary: string; responsibilities?: string[] } | null>(null);
  const cancel = React.useRef(false);

  const run = async (action: AssistAction) => {
    if (action === "draft" && !draft.title.trim()) {
      toast.warning("Add a job title first", "The assistant drafts from the title and department.");
      return;
    }
    if (action !== "draft" && !draft.summary.trim()) {
      toast.warning("Write or draft a summary first", "These actions rewrite the existing summary.");
      return;
    }
    cancel.current = false;
    setRunning(action);
    setSuggestion(null);
    setStream("");
    let buf = "";
    for await (const chunk of services.vacancies.assist(action, {
      title: draft.title,
      department: draft.department,
      summary: draft.summary,
      responsibilities: draft.responsibilities,
    })) {
      if (cancel.current) break;
      buf += chunk;
      setStream(buf);
    }
    setRunning(null);
    if (cancel.current) {
      setStream("");
      return;
    }
    try {
      const parsed = JSON.parse(buf) as { summary: string; responsibilities?: string[] };
      setSuggestion({ action, ...parsed });
    } catch {
      toast.error("The assistant couldn't finish", "Try again in a moment.");
    }
    setStream("");
  };

  const preview = stream ? (() => {
    // Show readable text while JSON streams in.
    const m = stream.match(/"summary":"([^"]*)/);
    return m ? m[1] : "";
  })() : "";

  return (
    <EditorSection id="description" title="Job description" description="What candidates read first. Plain language and specific outcomes attract better applications.">
      <div className="rounded-md border border-dashed border-accent-500/50 bg-accent-50/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-accent-700">
            <Sparkles className="size-4" />
            Writing assistant
          </p>
          <span className="text-2xs font-medium text-accent-700">Suggestions to check and edit · nothing leaves Vettly</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {ASSIST_ACTIONS.map((a) => (
            <Button key={a.action} type="button" size="sm" variant="secondary" loading={running === a.action} disabled={!!running} onClick={() => run(a.action)}>
              {a.label}
            </Button>
          ))}
          {running && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                cancel.current = true;
              }}
            >
              Stop
            </Button>
          )}
        </div>
        {(running || suggestion) && (
          <div className="mt-4 rounded-md border border-line bg-surface p-4" aria-live="polite">
            <div className="mb-2 flex items-center justify-between gap-2">
              <ProvenanceTag provenance="ai_illustrative" compact />
              {running && <span className="text-2xs text-fg-subtle">Writing…</span>}
            </div>
            <p className="text-sm leading-relaxed text-fg">
              {running ? preview : suggestion?.summary}
              {running && <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-accent-600 align-middle" />}
            </p>
            {suggestion?.responsibilities && (
              <ul className="mt-3 list-disc pl-5 text-sm text-fg-muted">
                {suggestion.responsibilities.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
            {suggestion && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    set("summary", suggestion.summary);
                    if (suggestion.responsibilities) set("responsibilities", suggestion.responsibilities);
                    setSuggestion(null);
                    toast.success("Suggestion applied", "Review and edit it before publishing.");
                  }}
                >
                  Use this
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => run(suggestion.action)}>
                  Try again
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSuggestion(null)}>
                  Discard
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Field label="Summary" required error={errors.summary} hint={`${draft.summary.length}/600 characters. Two or three sentences on why the role exists.`}>
        <Textarea rows={4} maxLength={600} value={draft.summary} onChange={(e) => set("summary", e.target.value)} placeholder="Lead financial reporting for our Bulawayo region…" />
      </Field>
      <ListEditor
        label="Responsibilities"
        items={draft.responsibilities}
        onChange={(v) => set("responsibilities", v)}
        placeholder="Start with a verb, e.g. “Prepare monthly management accounts”"
        error={errors.responsibilities}
      />
      <ListEditor label="Benefits" items={draft.benefits} onChange={(v) => set("benefits", v)} placeholder="e.g. Medical aid for you and your dependants" />
    </EditorSection>
  );
}

/* ---------- Requirements ---------- */

let tmp = 0;
const SUGGESTIONS: Record<string, { kind: RequirementKind; text: string; years?: number }[]> = {
  default: [
    { kind: "skill", text: "Microsoft Excel (pivot tables, lookups)" },
    { kind: "experience", text: "Relevant work experience", years: 2 },
    { kind: "language", text: "Fluent written and spoken English" },
  ],
  Finance: [
    { kind: "certification", text: "ICAZ, ACCA or CIMA membership" },
    { kind: "skill", text: "IFRS reporting" },
    { kind: "skill", text: "ZIMRA tax compliance (PAYE, VAT)" },
  ],
  "Information Technology": [
    { kind: "skill", text: "SQL and relational databases" },
    { kind: "skill", text: "Git and code review" },
    { kind: "education", text: "Degree in Computer Science or related field" },
  ],
};

function RequirementRow({
  r,
  onChange,
  onRemove,
  onToggle,
  onMove,
  first,
  last,
}: {
  r: Requirement;
  onChange: (r: Requirement) => void;
  onRemove: () => void;
  onToggle: () => void;
  onMove: (d: -1 | 1) => void;
  first: boolean;
  last: boolean;
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 px-3 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center">
      <Select
        size="sm"
        aria-label="Requirement type"
        value={r.kind}
        onValueChange={(k) => onChange({ ...r, kind: k as RequirementKind, years: k === "experience" ? r.years ?? 2 : undefined })}
        options={(Object.keys(REQUIREMENT_KIND) as RequirementKind[]).map((k) => ({ value: k, label: REQUIREMENT_KIND[k].label }))}
        className="col-span-2 sm:col-span-1"
      />
      <div className="flex min-w-0 items-center gap-2">
        {r.kind === "experience" && (
          <label className="flex shrink-0 items-center gap-1 text-xs text-fg-muted">
            <input
              type="number"
              min={0}
              max={30}
              aria-label="Minimum years"
              value={r.years ?? 0}
              onChange={(e) => onChange({ ...r, years: Number(e.target.value) })}
              className="h-8 w-12 rounded-sm border border-line-strong bg-surface px-1.5 text-center text-sm tabular"
            />
            yrs
          </label>
        )}
        <input
          aria-label="Requirement"
          value={r.text}
          placeholder={REQUIREMENT_KIND[r.kind].placeholder}
          onChange={(e) => onChange({ ...r, text: e.target.value })}
          className="h-8 min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-2 text-sm text-fg outline-none hover:border-line focus-visible:border-primary-500 focus-visible:bg-surface"
        />
      </div>
      <div className="flex items-center gap-0.5">
        <Button type="button" variant="ghost" size="sm" onClick={onToggle} className="text-xs">
          {r.priority === "essential" ? "Make desirable" : "Make essential"}
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Move up" disabled={first} onClick={() => onMove(-1)}>
          <ArrowUp />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Move down" disabled={last} onClick={() => onMove(1)}>
          <ArrowDown />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${r.text || "requirement"}`} onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}

export function RequirementsSection({ draft, set, errors }: Props) {
  const reqs = draft.requirements;
  const update = (next: Requirement[]) => set("requirements", next);
  const add = (priority: RequirementPriority, base?: Partial<Requirement>) =>
    update([...reqs, { id: `req_tmp_${++tmp}`, kind: "skill", text: "", priority, ...base }]);
  const suggestions = (SUGGESTIONS[draft.department] ?? SUGGESTIONS.default!).filter(
    (s) => !reqs.some((r) => r.text.toLowerCase() === s.text.toLowerCase()),
  );

  const group = (priority: RequirementPriority) => {
    const items = reqs.filter((r) => r.priority === priority);
    const move = (id: string, d: -1 | 1) => {
      const idx = items.findIndex((x) => x.id === id);
      const swap = items[idx + d];
      if (!swap) return;
      const a = reqs.findIndex((x) => x.id === id);
      const b = reqs.findIndex((x) => x.id === swap.id);
      const n = reqs.slice();
      [n[a], n[b]] = [n[b]!, n[a]!];
      update(n);
    };
    return (
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-fg">
            {priority === "essential" ? "Essential" : "Desirable"} <span className="font-normal text-fg-subtle">({items.length})</span>
          </h3>
          <p className="text-xs text-fg-subtle">{priority === "essential" ? "Missing evidence is flagged on every application" : "Adds to the score when evidence is found"}</p>
        </div>
        <ul className="divide-y divide-line rounded-md border border-line">
          {items.map((r, i) => (
            <RequirementRow
              key={r.id}
              r={r}
              first={i === 0}
              last={i === items.length - 1}
              onChange={(nr) => update(reqs.map((x) => (x.id === r.id ? nr : x)))}
              onRemove={() => update(reqs.filter((x) => x.id !== r.id))}
              onToggle={() => update(reqs.map((x) => (x.id === r.id ? { ...x, priority: x.priority === "essential" ? "desirable" : "essential" } : x)))}
              onMove={(d) => move(r.id, d)}
            />
          ))}
          <li>
            <button type="button" onClick={() => add(priority)} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-fg-muted hover:bg-surface-muted hover:text-fg">
              <Plus className="size-4" />
              Add {priority} requirement
            </button>
          </li>
        </ul>
      </div>
    );
  };

  return (
    <EditorSection
      id="requirements"
      title="Requirements"
      description="Vettly assesses every applicant against each requirement and shows the evidence it found, or flags what's missing."
    >
      {errors.requirements && (
        <p className="-mt-1 text-xs font-medium text-danger-700" role="alert">
          {errors.requirements}
        </p>
      )}
      {group("essential")}
      {group("desirable")}
      {suggestions.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-accent-700">
            <Sparkles className="size-3.5" />
            Common for {draft.department || "this role"}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.text}
                type="button"
                onClick={() => add("desirable", { kind: s.kind, text: s.text, years: s.years })}
                className="pressable inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed border-accent-500/50 bg-surface px-3 text-xs font-medium text-fg hover:bg-accent-50"
              >
                <Plus className="size-3" />
                {s.years ? `${s.years}+ yrs ` : ""}
                {s.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </EditorSection>
  );
}

/* ---------- Screening weights ---------- */

const PRESETS: { label: string; w: ScreeningWeights }[] = [
  { label: "Balanced", w: { skills: 35, experience: 30, education: 10, certifications: 10, assessments: 15 } },
  { label: "Skills-led", w: { skills: 50, experience: 20, education: 5, certifications: 5, assessments: 20 } },
  { label: "Experience-led", w: { skills: 25, experience: 45, education: 10, certifications: 10, assessments: 10 } },
];

export function WeightsSection({ draft, set, errors }: Props) {
  const w = draft.weights;
  const keys = Object.keys(WEIGHT_LABELS) as (keyof ScreeningWeights)[];
  const total = keys.reduce((s, k) => s + w[k], 0);
  const balance = () => {
    const diff = 100 - total;
    // Put the remainder on the largest weight so proportions barely change.
    const biggest = keys.reduce((a, b) => (w[a] >= w[b] ? a : b));
    set("weights", { ...w, [biggest]: Math.max(0, w[biggest] + diff) });
  };
  return (
    <EditorSection
      id="weights"
      title="Screening weights"
      description="How much each kind of evidence counts toward the match score. HR always makes the final decision."
      aside={
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Button key={p.label} type="button" size="sm" variant="ghost" onClick={() => set("weights", { ...p.w })}>
              {p.label}
            </Button>
          ))}
        </div>
      }
    >
      <ul className="flex flex-col gap-4">
        {keys.map((k) => (
          <li key={k} className="grid grid-cols-[8.5rem_minmax(0,1fr)_3rem] items-center gap-4">
            <span className="text-sm text-fg">{WEIGHT_LABELS[k]}</span>
            <Slider label={`${WEIGHT_LABELS[k]} weight`} min={0} max={100} step={5} value={[w[k]]} onValueChange={([v]) => set("weights", { ...w, [k]: v ?? 0 })} />
            <span className="text-right text-sm font-semibold text-fg tabular">{w[k]}%</span>
          </li>
        ))}
      </ul>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-md px-4 py-3 text-sm",
          total === 100 ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-700",
        )}
        role="status"
      >
        <span className="font-semibold tabular">
          Total {total}%{total === 100 ? " · ready" : total > 100 ? ` · ${total - 100}% over` : ` · ${100 - total}% to allocate`}
        </span>
        {total !== 100 && (
          <Button type="button" size="sm" variant="secondary" onClick={balance}>
            Balance to 100%
          </Button>
        )}
      </div>
      {errors.weights && (
        <p className="-mt-2 text-xs font-medium text-danger-700" role="alert">
          {errors.weights}
        </p>
      )}
    </EditorSection>
  );
}

/* ---------- Psychometric tests ---------- */

export function AssessmentSection({ draft, set }: Props) {
  const a = draft.assessment;
  return (
    <EditorSection id="assessment" title="Psychometric tests" description="Tests shortlisted candidates take before interview. Results inform decisions; they never reject anyone automatically.">
      <RadioGroup
        value={a.battery ?? "none"}
        onValueChange={(v) => set("assessment", { ...a, battery: v === "none" ? null : v })}
        options={[...TEST_BATTERIES, { value: "none", label: "No tests for this vacancy", description: "Skip the Assessment stage" }]}
        className="gap-3"
      />
      {a.battery && (
        <>
          <SwitchField
            checked={a.autoSendOnShortlist}
            onCheckedChange={(c) => set("assessment", { ...a, autoSendOnShortlist: c })}
            label="Send automatically when a candidate is shortlisted"
            description="Otherwise a recruiter sends them from the pipeline."
            className="rounded-md border border-line p-4"
          />
          <Field label="Deadline">
            <Select
              value={String(a.deadlineDays)}
              onValueChange={(v) => set("assessment", { ...a, deadlineDays: Number(v) })}
              options={[3, 5, 7, 10].map((d) => ({ value: String(d), label: `${d} days after sending` }))}
              className="sm:max-w-xs"
            />
          </Field>
        </>
      )}
    </EditorSection>
  );
}

/* ---------- Publishing ---------- */

export function PublishSection({ draft, set, errors, orgName }: Props & { orgName: string }) {
  const toggle = (id: VacancyDraft["channels"][number]) =>
    set("channels", draft.channels.includes(id) ? draft.channels.filter((c) => c !== id) : [...draft.channels, id]);
  const salary =
    draft.salaryVisible && draft.salaryMin && draft.salaryMax ? `${draft.currency} ${draft.salaryMin.toLocaleString("en-GB")}–${draft.salaryMax.toLocaleString("en-GB")} a month` : null;
  return (
    <EditorSection id="publishing" title="Publishing" description="Where you plan to post the advert. Vettly doesn&apos;t post to job boards yet, so copy the advert to each one yourself.">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          {CHANNELS.map((c) => (
            <CheckboxField key={c.id} checked={draft.channels.includes(c.id)} onCheckedChange={() => toggle(c.id)} label={c.label} description={c.description} />
          ))}
          {errors.channels && (
            <p className="text-xs font-medium text-danger-700" role="alert">
              {errors.channels}
            </p>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-fg">Advert preview</p>
          <div className="rounded-lg border border-line bg-canvas p-4">
            <div className="rounded-md bg-surface p-4 shadow-platter">
              <p className="text-xs text-fg-subtle">{orgName}</p>
              <p className="mt-0.5 text-base font-semibold text-fg">{draft.title || "Job title"}</p>
              <p className="mt-1 text-xs text-fg-muted">
                {[draft.location || "Location", draft.workMode, draft.employmentType].join(" · ")}
              </p>
              {salary && <p className="mt-1 text-xs font-semibold text-primary-700">{salary}</p>}
              <p className="mt-3 line-clamp-3 text-sm text-fg-muted">{draft.summary || "Your summary appears here."}</p>
              <span className="mt-4 inline-flex h-8 items-center rounded-md bg-primary-600 px-3 text-xs font-semibold text-white">Apply now</span>
            </div>
          </div>
        </div>
      </div>
    </EditorSection>
  );
}

