"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, CircleAlert, RefreshCw } from "@/components/icons";
import { Alert, Button, Skeleton, toast } from "@/components/ui";
import { PageContainer, PageTitle } from "@/components/layout/page-header";
import { useSession } from "@/components/layout/session-provider";
import { emptyDraft, services, toDraft, MOCK_NOW } from "@/services";
import type { Vacancy, VacancyDraft } from "@/types";
import { cn } from "@/lib/utils";
import {
  AssessmentSection,
  BasicsSection,
  DescriptionSection,
  PublishSection,
  RequirementsSection,
  WeightsSection,
  type Errors,
} from "./editor-sections";

const SECTIONS = [
  { id: "basics", label: "Basics", keys: ["title", "department", "hiringManager", "location", "openings", "salary", "closesAt"] },
  { id: "description", label: "Job description", keys: ["summary", "responsibilities"] },
  { id: "requirements", label: "Requirements", keys: ["requirements"] },
  { id: "weights", label: "Screening weights", keys: ["weights"] },
  { id: "assessment", label: "Psychometric tests", keys: [] as string[] },
  { id: "publishing", label: "Publishing", keys: ["channels"] },
];

/** Validation. A draft needs only a title; publishing needs everything a candidate and the matcher rely on. */
function validate(d: VacancyDraft, mode: "draft" | "publish"): Errors {
  const e: Errors = {};
  if (!d.title.trim()) e.title = "Add a job title.";
  if (d.salaryMin != null && d.salaryMax != null && d.salaryMin > d.salaryMax) e.salary = "The minimum is higher than the maximum.";
  if (d.openings < 1) e.openings = "At least one opening.";
  if (mode === "draft") return e;
  if (!d.department) e.department = "Choose a department.";
  if (!d.hiringManager) e.hiringManager = "Choose who reviews the shortlist.";
  if (!d.location) e.location = "Choose a location.";
  if (!d.closesAt) e.closesAt = "Set a closing date.";
  else if (new Date(d.closesAt) <= new Date(MOCK_NOW)) e.closesAt = "The closing date must be in the future.";
  if (d.summary.trim().length < 40) e.summary = "Write at least two sentences, or use the writing assistant.";
  if (d.responsibilities.length === 0) e.responsibilities = "Add at least one responsibility.";
  if (!d.requirements.some((r) => r.priority === "essential" && r.text.trim())) e.requirements = "Add at least one essential requirement so applicants can be assessed.";
  else if (d.requirements.some((r) => !r.text.trim())) e.requirements = "Fill in or remove the empty requirement.";
  const total = Object.values(d.weights).reduce((s, n) => s + n, 0);
  if (total !== 100) e.weights = `Weights add up to ${total}%. They must total 100%.`;
  if (d.channels.length === 0) e.channels = "Choose at least one place to publish.";
  return e;
}

function sectionDone(d: VacancyDraft, id: string) {
  const errs = validate(d, "publish");
  return SECTIONS.find((s) => s.id === id)!.keys.every((k) => !errs[k]);
}

export function VacancyEditor({ id }: { id?: string }) {
  const router = useRouter();
  const { organisation } = useSession();
  const [source, setSource] = React.useState<Vacancy | null>(null);
  const [draft, setDraft] = React.useState<VacancyDraft | null>(id ? null : emptyDraft());
  const [initial, setInitial] = React.useState<string>(id ? "" : JSON.stringify(emptyDraft()));
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Errors>({});
  const [saving, setSaving] = React.useState<"draft" | "publish" | null>(null);
  const [active, setActive] = React.useState("basics");

  React.useEffect(() => {
    if (!id) return;
    let alive = true;
    services.vacancies
      .get(id)
      .then((v) => {
        if (!alive) return;
        const d = toDraft(v);
        setSource(v);
        setDraft(d);
        setInitial(JSON.stringify(d));
      })
      .catch((e: Error) => alive && setLoadError(e.message));
    return () => {
      alive = false;
    };
  }, [id]);

  const dirty = !!draft && JSON.stringify(draft) !== initial;

  React.useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  React.useEffect(() => {
    const onScroll = () => {
      let current = SECTIONS[0]!.id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= 120) current = s.id;
      }
      setActive(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const set = React.useCallback(<K extends keyof VacancyDraft>(k: K, v: VacancyDraft[K]) => {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
    setErrors((e) => {
      const key = k === "salaryMin" || k === "salaryMax" ? "salary" : k;
      if (!e[key]) return e;
      const n = { ...e };
      delete n[key];
      return n;
    });
  }, []);

  if (loadError) {
    return (
      <PageContainer>
        <Alert tone="danger" title="This vacancy can't be edited" action={<Button size="sm" variant="secondary" onClick={() => router.push("/vacancies")}>Back to vacancies</Button>}>
          {loadError}
        </Alert>
      </PageContainer>
    );
  }
  if (!draft) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-4 pt-6" aria-busy="true">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
      </PageContainer>
    );
  }

  const isDraft = !source || source.status === "draft";
  const save = async (mode: "draft" | "publish") => {
    const e = validate(draft, mode);
    setErrors(e);
    const keys = Object.keys(e);
    if (keys.length) {
      const first = SECTIONS.find((s) => s.keys.some((k) => keys.includes(k)));
      if (first) document.getElementById(first.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast.error(
        mode === "publish" ? "Not ready to publish" : "Not saved",
        `${keys.length} ${keys.length === 1 ? "thing needs" : "things need"} attention${first ? `, starting with ${first.label}` : ""}.`,
      );
      return;
    }
    setSaving(mode);
    try {
      let v: Vacancy;
      if (!source) {
        v = await services.vacancies.create(draft, mode === "publish");
      } else {
        v = await services.vacancies.update(source.id, draft);
        if (mode === "publish" && source.status === "draft") v = await services.vacancies.setStatus(source.id, "open");
      }
      setInitial(JSON.stringify(draft));
      toast.success(
        mode === "publish" ? (isDraft ? "Vacancy published (simulated)" : "Changes saved") : "Draft saved",
        mode === "publish" && isDraft ? `${v.title} is live on ${v.channels.length} ${v.channels.length === 1 ? "channel" : "channels"}.` : v.title,
      );
      router.push(`/vacancies/${v.id}`);
    } catch (err) {
      toast.error("Not saved", err instanceof Error ? err.message : "Try again in a moment.");
      setSaving(null);
    }
  };

  const errorCount = Object.keys(errors).length;

  return (
    <PageContainer
      className="pb-28"
      header={
        <div>
          <Link
            href={source ? `/vacancies/${source.id}` : "/vacancies"}
            className="inline-flex items-center gap-1 text-sm font-medium text-fg-subtle hover:text-fg"
            onClick={(e) => {
              if (dirty && !window.confirm("Leave without saving? Your changes will be lost.")) e.preventDefault();
            }}
          >
            <ArrowLeft className="size-4" />
            {source ? source.title : "Vacancies"}
          </Link>
          <PageTitle className="mt-3">
            {source ? `Edit ${source.title}` : "New vacancy"}
          </PageTitle>
          <p className="mt-1.5 text-md text-fg-muted">
            {source ? `${source.reference} · changes apply to the live advert when you save.` : "Save a draft at any point. Publishing checks that everything candidates and the matcher need is in place."}
          </p>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label="Editor sections" className="hidden lg:block">
          <ol className="sticky top-20 flex flex-col gap-px">
            {SECTIONS.map((s) => {
              const done = sectionDone(draft, s.id);
              const hasError = s.keys.some((k) => errors[k]);
              return (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    aria-current={active === s.id ? "location" : undefined}
                    className={cn(
                      "flex h-8 items-center gap-2.5 rounded-sm px-2 text-sm text-fg-muted hover:bg-ink-100 hover:text-fg",
                      active === s.id && "bg-surface font-medium text-fg shadow-xs",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded-full border",
                        hasError ? "border-danger-500 bg-danger-50 text-danger-600" : done ? "border-success-600 bg-success-600 text-white" : "border-ink-300",
                      )}
                      aria-label={hasError ? "Needs attention" : done ? "Complete" : "Incomplete"}
                    >
                      {hasError ? <CircleAlert className="size-3" /> : done ? <Check className="size-2.5" weight="bold" /> : null}
                    </span>
                    {s.label}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex min-w-0 flex-col gap-5">
          <BasicsSection draft={draft} set={set} errors={errors} />
          <DescriptionSection draft={draft} set={set} errors={errors} />
          <RequirementsSection draft={draft} set={set} errors={errors} />
          <WeightsSection draft={draft} set={set} errors={errors} />
          <AssessmentSection draft={draft} set={set} errors={errors} />
          <PublishSection draft={draft} set={set} errors={errors} orgName={organisation?.name ?? "Your organisation"} />
        </div>
      </div>

      <div className="material-bar fixed inset-x-0 bottom-0 z-30 shadow-[0_-1px_0_0_rgb(27_36_32/0.08)] lg:left-[var(--sidebar-w,15rem)]">
        <div className="mx-auto flex max-w-[84rem] items-center justify-between gap-3 px-4 py-3 sm:px-8 lg:px-12">
          <p className={cn("min-w-0 truncate text-sm text-fg-muted", errorCount === 0 && "hidden sm:block")} aria-live="polite">
            {errorCount > 0 ? (
              <span className="font-medium text-danger-700">
                {errorCount} {errorCount === 1 ? "thing needs" : "things need"} attention
              </span>
            ) : dirty ? (
              "Unsaved changes"
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-success-600" weight="bold" /> All changes saved
              </span>
            )}
          </p>
          <div className="ml-auto flex shrink-0 gap-2">
            {isDraft ? (
              <>
                <Button variant="secondary" loading={saving === "draft"} disabled={!!saving} onClick={() => save("draft")}>
                  Save draft
                </Button>
                <Button loading={saving === "publish"} disabled={!!saving} onClick={() => save("publish")}>
                  {draft.channels.length ? `Publish to ${draft.channels.length} ${draft.channels.length === 1 ? "channel" : "channels"}` : "Publish"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" disabled={!!saving || !dirty} onClick={() => setDraft(JSON.parse(initial) as VacancyDraft)}>
                  <RefreshCw />
                  <span className="hidden sm:inline">Discard changes</span>
                  <span className="sm:hidden">Discard</span>
                </Button>
                <Button loading={saving === "publish"} disabled={!!saving || !dirty} onClick={() => save("publish")}>
                  Save changes
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
