"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Trash2 } from "@/components/icons";
import {
  Alert,
  Button,
  Field,
  Modal,
  ModalClose,
  ModalContent,
  Progress,
  Segmented,
  Select,
  Skeleton,
  Textarea,
  toast,
} from "@/components/ui";
import { PageContainer, PageTitle } from "@/components/layout/page-header";
import { services } from "@/services";
import type { CvBatch, CvExtraction, CvFile } from "@/types";
import { FAILURE_COPY, nameFromFile } from "@/lib/cv";
import { cn } from "@/lib/utils";
import { CvStatusBadge, FIELD_LABEL, IN_PROGRESS, flagsOf, sizeLabel } from "./cv-meta";
import { CvPreview } from "./cv-preview";
import { EducationSection, ExperienceSection, PersonalSection, SkillsAndSummary, type Errors } from "./review-form";

type Loaded = { file: CvFile; batch: Omit<CvBatch, "files">; nextToReview: string | null };

function blankFor(file: CvFile): CvExtraction {
  const guess = nameFromFile(file.name);
  return {
    name: guess ? { value: guess, flag: "Taken from the file name. Check it against the CV." } : { value: "" },
    email: { value: "" },
    phone: { value: "" },
    location: { value: "" },
    headline: { value: "" },
    currentEmployer: { value: "" },
    availability: { value: "" },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    pages: 1,
    ocr: false,
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(x: CvExtraction): Errors {
  const e: Errors = {};
  if (!x.name.value.trim()) e.name = "Enter the candidate's full name.";
  if (!x.email.value.trim() && !x.phone.value.trim()) e.email = "Add an email or a phone number so your team can contact them.";
  else if (x.email.value.trim() && !EMAIL.test(x.email.value.trim())) e.email = "This email address looks incomplete.";
  if (!x.location.value.trim()) e.location = "Enter where the candidate is based.";
  if (!x.availability.value) e.availability = "Choose a notice period. Use 1 month if the CV doesn't say.";
  return e;
}

export function CvReview({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = React.useState<Loaded | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [x, setX] = React.useState<CvExtraction | null>(null);
  const [manual, setManual] = React.useState(false);
  const [attach, setAttach] = React.useState<"attach" | "new">("attach");
  const [errors, setErrors] = React.useState<Errors>({});
  const [blocked, setBlocked] = React.useState(false);
  const [saving, setSaving] = React.useState<"draft" | "add" | null>(null);
  const [discarding, setDiscarding] = React.useState(false);
  const [pane, setPane] = React.useState<"details" | "cv">("details");

  React.useEffect(() => {
    let alive = true;
    const load = () =>
      services.cv
        .getFile(id)
        .then((r) => {
          if (!alive) return;
          setData(r);
          setX((cur) => cur ?? (r.file.extraction ? structuredClone(r.file.extraction) : null));
        })
        .catch((e: Error) => alive && setError(e.message));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before refetching
    setError(null);
    load();
    // Follow a file that is still uploading or being read.
    const off = services.cv.subscribe((batches) => {
      const f = batches.flatMap((b) => b.files).find((ff) => ff.id === id);
      if (f) setData((d) => (d && (d.file.status !== f.status || d.file.progress !== f.progress) ? { ...d, file: f } : d));
      if (f?.extraction) setX((cur) => cur ?? structuredClone(f.extraction!));
    });
    return () => {
      alive = false;
      off();
    };
  }, [id, reload]);

  if (error) {
    return (
      <PageContainer>
        <BackLink />
        <Alert
          tone="danger"
          title="CV not available"
          className="mt-4"
          action={
            <Button size="sm" variant="secondary" onClick={() => setReload((r) => r + 1)}>
              <RefreshCw />
              Try again
            </Button>
          }
        >
          {error}
        </Alert>
      </PageContainer>
    );
  }
  if (!data) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-4 pt-6" aria-busy="true">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
          <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Skeleton className="h-[28rem] rounded-lg" />
            <Skeleton className="h-[28rem] rounded-lg" />
          </div>
        </div>
      </PageContainer>
    );
  }

  const { file, batch } = data;
  const original = file.extraction && file.status !== "failed" ? data.file.extraction : undefined;
  const working = x;
  const editable = (file.status === "ready" || file.status === "needs_review" || (file.status === "failed" && manual)) && !!working;
  const processing = IN_PROGRESS.includes(file.status);
  const remaining = working ? flagsOf(working) : [];
  const originalFlags = new Set(flagsOf(file.extraction).map((f) => f.key));
  const checked = new Set([...originalFlags].filter((k) => !remaining.some((r) => r.key === k)));
  const title = working?.name.value || original?.name.value || file.name;
  const attaching = !!file.duplicateOf && attach === "attach";

  const update = (fn: (d: CvExtraction) => CvExtraction) => {
    setX((cur) => (cur ? fn(structuredClone(cur)) : cur));
    setBlocked(false);
  };
  const confirmFlag = (key: string) =>
    update((d) => {
      if (key in FIELD_LABEL) delete d[key as keyof typeof FIELD_LABEL].flag;
      d.experience = d.experience.map((e) => (e.id === key ? { ...e, flag: undefined } : e));
      d.education = d.education.map((e) => (e.id === key ? { ...e, flag: undefined } : e));
      return d;
    });

  const submit = async () => {
    if (!x) return;
    const errs = validate(x);
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Some details are missing", "Fix the highlighted fields, then add the candidate.");
      return;
    }
    if (remaining.length && !attaching) {
      setBlocked(true);
      document.querySelector("[data-flagged]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSaving("add");
    try {
      // Blank rows someone added and never filled in are dropped rather than saved.
      const clean: CvExtraction = {
        ...x,
        experience: x.experience.filter((e) => e.title.trim() || e.company.trim()),
        education: x.education.filter((e) => e.qualification.trim() || e.institution.trim()),
      };
      const candidateId = await services.cv.confirm(file.id, clean, attaching ? file.duplicateOf!.id : undefined);
      toast.success(attaching ? `CV added to ${file.duplicateOf!.name}'s record` : `${x.name.value} added to candidates`, `Applying for ${batch.vacancyTitle}`);
      router.push(data.nextToReview ? `/cv-processing/${data.nextToReview}` : `/candidates/${candidateId}`);
    } catch (e) {
      toast.error("Candidate not added", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(null);
    }
  };

  return (
    <PageContainer
      header={
        <div>
          <BackLink />
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <PageTitle>{title}</PageTitle>
              <CvStatusBadge status={file.status} size="md" />
            </div>
            <p className="text-md text-fg-muted">
              Applying for{" "}
              <Link href={`/vacancies/${batch.vacancyId}`} className="font-medium text-fg hover:underline">
                {batch.vacancyTitle}
              </Link>{" "}
              · {file.name} · {sizeLabel(file.sizeKb)} · uploaded by {batch.uploadedBy}
            </p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <StatusMessage
          file={file}
          flags={remaining.length}
          blocked={blocked}
          manual={manual}
          attach={attach}
          onAttach={setAttach}
          onManual={() => {
            setManual(true);
            setX(blankFor(file));
          }}
          onDiscard={() => setDiscarding(true)}
          onRetry={async () => {
            await services.cv.retry(file.id);
            toast.info("Trying again", file.name);
          }}
        />

        {!processing && !working ? null : processing ? (
          <div className="rounded-lg bg-surface p-8 shadow-platter">
            <p className="text-sm font-semibold text-fg">{file.status === "extracting" ? "Vettly is reading this CV" : file.status === "uploading" ? "Uploading" : "Waiting in the queue"}</p>
            <p className="mt-1 text-sm text-fg-muted">This page updates by itself. Most CVs take a few seconds.</p>
            <Progress value={file.status === "queued" ? 0 : file.progress} label="Processing progress" className="mt-4 max-w-md" />
          </div>
        ) : (
          <>
            <Segmented
              label="Show"
              value={pane}
              onChange={setPane}
              className="self-start xl:hidden"
              options={[
                { value: "details", label: "Details" },
                { value: "cv", label: "Original CV" },
              ]}
            />
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] xl:items-start">
              <fieldset
                disabled={!editable}
                className={cn("flex min-w-0 flex-col gap-5", pane === "cv" && "hidden xl:flex", !editable && "pointer-events-none opacity-70")}
                aria-label="Candidate details"
              >
                {working ? (
                  <>
                    <PersonalSection
                      x={working}
                      checked={checked}
                      errors={errors}
                      onField={(k, value) => {
                        update((d) => ({ ...d, [k]: { value } }));
                        if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
                      }}
                      onConfirm={confirmFlag}
                    />
                    <ExperienceSection items={working.experience} checked={checked} onChange={(v) => update((d) => ({ ...d, experience: v }))} onConfirm={confirmFlag} />
                    <EducationSection items={working.education} checked={checked} onChange={(v) => update((d) => ({ ...d, education: v }))} onConfirm={confirmFlag} />
                    <SkillsAndSummary
                      skills={working.skills}
                      summary={working.summary}
                      onSkills={(v) => update((d) => ({ ...d, skills: v }))}
                      onSummary={(v) => update((d) => ({ ...d, summary: v }))}
                    />
                  </>
                ) : null}
              </fieldset>
              <div className={cn("xl:sticky xl:top-16", pane === "details" && "hidden xl:block")}>
                <CvPreview file={file} original={original} />
              </div>
            </div>
          </>
        )}

        {editable && (
          <div className="material-bar sticky bottom-0 z-10 -mx-4 flex flex-col gap-1.5 border-t border-line px-4 py-3 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
            {remaining.length > 0 && !attaching && (
              <p className="text-xs font-medium text-accent-700 sm:hidden" aria-live="polite">
                {remaining.length} {remaining.length === 1 ? "detail" : "details"} to check
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="text-danger-700 hover:bg-danger-50 max-sm:px-2.5" aria-label="Discard CV" onClick={() => setDiscarding(true)}>
                <Trash2 />
                <span className="max-sm:hidden">Discard CV</span>
              </Button>
              <div className="flex flex-1 items-center justify-end gap-2">
                {remaining.length > 0 && !attaching && (
                  <p className="mr-2 hidden text-xs font-medium text-accent-700 sm:block" aria-live="polite">
                    {remaining.length} {remaining.length === 1 ? "detail" : "details"} to check
                  </p>
                )}
                {file.status !== "failed" && (
                  <Button
                    variant="secondary"
                    loading={saving === "draft"}
                    onClick={async () => {
                      if (!x) return;
                      setSaving("draft");
                      await services.cv.saveDraft(file.id, x);
                      setSaving(null);
                      toast.success("Changes saved", "The CV stays in the queue until you add it.");
                    }}
                  >
                    Save<span className="max-sm:hidden"> for later</span>
                  </Button>
                )}
                <Button loading={saving === "add"} onClick={submit} className="max-sm:flex-1">
                  {attaching ? `Add to ${file.duplicateOf!.name.split(" ")[0]}'s record` : data.nextToReview ? "Add and review next" : "Add candidate"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <DiscardDialog
        open={discarding}
        onOpenChange={setDiscarding}
        fileName={file.name}
        defaultReason={file.failure === "unreadable" || file.failure === "password_protected" ? REASONS[1]! : file.duplicateOf ? REASONS[2]! : REASONS[0]!}
        onDiscard={async (reason) => {
          await services.cv.discard(file.id, reason);
          toast.success("CV discarded", file.name);
          router.push(data.nextToReview ? `/cv-processing/${data.nextToReview}` : "/cv-processing");
        }}
      />
    </PageContainer>
  );
}

function StatusMessage({
  file,
  flags,
  blocked,
  manual,
  attach,
  onAttach,
  onManual,
  onRetry,
  onDiscard,
}: {
  file: CvFile;
  flags: number;
  blocked: boolean;
  manual: boolean;
  attach: "attach" | "new";
  onAttach: (v: "attach" | "new") => void;
  onManual: () => void;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  if (file.status === "added")
    return (
      <Alert
        tone="success"
        title={`Added by ${file.reviewedBy}`}
        action={
          file.candidateId && (
            <Button size="sm" variant="secondary" asChild>
              <Link href={`/candidates/${file.candidateId}`}>View candidate</Link>
            </Button>
          )
        }
      >
        This CV is on the candidate record. Edit their details from the profile.
      </Alert>
    );
  if (file.status === "discarded")
    return (
      <Alert tone="info" title={`Discarded by ${file.reviewedBy}`}>
        {file.discardReason}
      </Alert>
    );
  if (file.status === "failed" && file.failure && !manual)
    return (
      <Alert
        tone="danger"
        title={FAILURE_COPY[file.failure].title}
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={onDiscard}>
              Discard
            </Button>
            <Button size="sm" variant="secondary" onClick={onRetry}>
              Retry
            </Button>
            {file.failure !== "not_a_cv" && (
              <Button size="sm" onClick={onManual}>
                Enter details
              </Button>
            )}
          </div>
        }
      >
        {FAILURE_COPY[file.failure].help}
      </Alert>
    );
  if (file.status === "failed" && manual)
    return (
      <Alert tone="info" title="Entering details by hand">
        Type the details from the CV. Ask the candidate for the file too, so it can be attached to their record.
      </Alert>
    );
  if (file.duplicateOf)
    return (
      <div className="rounded-lg border border-dashed border-accent-500/60 bg-accent-50 px-4 py-4 text-sm text-accent-700">
        <p className="font-semibold">{file.duplicateOf.name} is already a candidate</p>
        <p className="mt-0.5 opacity-90">
          This CV has the same email address as{" "}
          <Link href={`/candidates/${file.duplicateOf.id}`} className="font-semibold underline underline-offset-2">
            their record
          </Link>
          . It&apos;s probably a newer copy.
        </p>
        <div role="radiogroup" aria-label="What to do with this CV" className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(
            [
              ["attach", "Add to their record", "Keeps one record. The CV goes into their Documents."],
              ["new", "Create a separate candidate", "Only if this is a different person with the same email."],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={attach === value}
              onClick={() => onAttach(value)}
              className={cn(
                "pressable flex items-start gap-2.5 rounded-md border bg-surface px-3 py-2.5 text-left transition-colors",
                attach === value ? "border-primary-500 ring-3 ring-primary-500/15" : "border-line-strong hover:border-ink-400",
              )}
            >
              <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border", attach === value ? "border-primary-600" : "border-ink-400")}>
                {attach === value && <span className="size-2 rounded-full bg-primary-600" />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-fg">{label}</span>
                <span className="block text-xs text-fg-muted">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  if (flags > 0)
    return (
      <Alert
        tone="warning"
        title={blocked ? `Check ${flags} more ${flags === 1 ? "detail" : "details"} before adding` : `Vettly wasn't sure about ${flags} ${flags === 1 ? "detail" : "details"}`}
        key={blocked ? "blocked" : "flags"}
        className={cn(blocked && "animate-pop-in")}
      >
        They&apos;re outlined in copper. Compare each one with the CV, then correct it or choose Looks right, so nothing Vettly guessed reaches the record unchecked.
      </Alert>
    );
  if (file.status === "ready" || file.status === "needs_review")
    return (
      <Alert tone="success" title="Vettly read everything it needed">
        Give the details a quick look, then add the candidate.
      </Alert>
    );
  return null;
}

const REASONS = ["Not a CV", "File damaged or unreadable", "Duplicate of another file", "Applied for the wrong vacancy", "Candidate withdrew", "Other"];

function DiscardDialog({
  open,
  onOpenChange,
  fileName,
  defaultReason,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fileName: string;
  defaultReason: string;
  onDiscard: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = React.useState(defaultReason);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        size="sm"
        title="Discard this CV?"
        description={`${fileName} leaves the queue and no candidate is created. The reason is kept for your records.`}
        footer={
          <>
            <ModalClose asChild>
              <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <Button
              variant="danger"
              loading={busy}
              disabled={reason === "Other" && !note.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  await onDiscard(reason === "Other" ? note.trim() : note.trim() ? `${reason}: ${note.trim()}` : reason);
                  onOpenChange(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Discard CV
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Reason">
            <Select value={reason} onValueChange={setReason} options={REASONS.map((r) => ({ value: r, label: r }))} />
          </Field>
          <Field label="Note" optional={reason !== "Other"} required={reason === "Other"}>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Sent a cover letter instead" />
          </Field>
        </div>
      </ModalContent>
    </Modal>
  );
}

function BackLink() {
  return (
    <Link href="/cv-processing" className="inline-flex items-center gap-1 text-sm font-medium text-fg-subtle hover:text-fg">
      <ArrowLeft className="size-4" />
      CV processing
    </Link>
  );
}
