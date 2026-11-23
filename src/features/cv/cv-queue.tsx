"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Checks, CloudArrowUp, MoreHorizontal, PenLine, RotateCcw, Trash2, TriangleAlert } from "@/components/icons";
import {
  Pagination,
  usePagination,
  Alert,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  Field,
  Progress,
  Segmented,
  Select,
  Skeleton,
  toast,
} from "@/components/ui";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { services, MOCK_NOW, uploadFile, type UploadInput } from "@/services";
import type { CvBatch, CvFile, CvFileStatus, Vacancy } from "@/types";
import { FAILURE_COPY } from "@/lib/cv";
import { cn, timeAgo } from "@/lib/utils";
import { CvStatusBadge, FileIcon, IN_PROGRESS, flagsOf, personLine, sizeLabel } from "./cv-meta";

const NOW = new Date(MOCK_NOW);
/** Files Vettly can read the text of. Scans, photos and old .doc files need text recognition, which isn't connected yet. */
const ACCEPT_EXT = ["pdf", "docx"];
const MAX_MB = 15;
const MAX_FILES = 50;

type View = "all" | "active" | "review" | "ready" | "failed" | "done";
const VIEW_MATCH: Record<View, (s: CvFileStatus) => boolean> = {
  all: () => true,
  active: (s) => IN_PROGRESS.includes(s),
  review: (s) => s === "needs_review",
  ready: (s) => s === "ready",
  failed: (s) => s === "failed",
  done: (s) => s === "added" || s === "discarded",
};

export function CvQueue() {
  const [batches, setBatches] = React.useState<CvBatch[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [view, setView] = React.useState<View>("all");

  React.useEffect(() => {
    let alive = true;
    services.cv
      .listBatches()
      .then((b) => alive && setBatches(b))
      .catch((e: Error) => alive && setError(e.message));
    const off = services.cv.subscribe((b) => alive && setBatches(b));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const files = batches?.flatMap((b) => b.files) ?? [];
  const count = (v: View) => files.filter((f) => VIEW_MATCH[v](f.status)).length;
  const shown = (batches ?? [])
    .map((b) => ({ ...b, files: b.files.filter((f) => VIEW_MATCH[view](f.status)) }))
    .filter((b) => b.files.length > 0);

  return (
    <PageContainer
      header={
        <PageHeader
          title="CV processing"
          description="Upload CVs in bulk. Vettly reads each one and fills in the candidate record, and you check anything it wasn't sure of before the candidate is added."
        />
      }
    >
      <div className="flex flex-col gap-8">
        <UploadPanel onUploaded={() => setView("all")} />

        <section aria-labelledby="queue-heading" className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="queue-heading" className="text-lg font-semibold text-fg">
              Queue
            </h2>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <Segmented
                label="Show files"
                value={view}
                onChange={setView}
                options={(
                  [
                    ["all", "All"],
                    ["active", "Processing"],
                    ["review", "Needs review"],
                    ["ready", "Ready"],
                    ["failed", "Failed"],
                    ["done", "Done"],
                  ] as const
                ).map(([value, label]) => ({
                  value,
                  label: (
                    <>
                      {label}
                      {batches && <span className="text-fg-subtle tabular">{count(value)}</span>}
                    </>
                  ),
                }))}
              />
            </div>
          </div>

          {error ? (
            <Alert tone="danger" title="The queue didn't load">
              {error}
            </Alert>
          ) : !batches ? (
            <div className="flex flex-col gap-4" aria-busy="true">
              <Skeleton className="h-64 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
          ) : shown.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Checks />}
                title={files.length ? "Nothing here" : "No CVs yet"}
                description={
                  files.length
                    ? view === "review"
                      ? "Every CV Vettly was unsure of has been checked."
                      : "No files in the queue have this status."
                    : "Choose a vacancy and drop CVs above. They'll appear here as Vettly reads them."
                }
                action={
                  files.length ? (
                    <Button size="sm" variant="secondary" onClick={() => setView("all")}>
                      Show all files
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            shown.map((b) => <BatchCard key={b.id} batch={b} full={batches.find((x) => x.id === b.id)!} />)
          )}
        </section>
      </div>
    </PageContainer>
  );
}

/* ---------- Upload ---------- */

function UploadPanel({ onUploaded }: { onUploaded: () => void }) {
  const [vacancies, setVacancies] = React.useState<Vacancy[]>([]);
  const [vacancyId, setVacancyId] = React.useState("");
  const [drag, setDrag] = React.useState(false);
  const [vacancyError, setVacancyError] = React.useState<string | null>(null);
  const [skipped, setSkipped] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const depth = React.useRef(0);

  React.useEffect(() => {
    services.vacancies.list().then((v) => setVacancies(v.filter((x) => x.status === "open")));
  }, []);

  const take = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const vacancy = vacancies.find((v) => v.id === vacancyId);
    if (!vacancy) {
      setVacancyError("Choose the vacancy these CVs are for first.");
      return;
    }
    const ok: File[] = [];
    const bad: string[] = [];
    const seen = new Set<string>();
    for (const f of Array.from(list)) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      const key = `${f.name}:${f.size}`;
      if (!ACCEPT_EXT.includes(ext)) bad.push(ext === "doc" ? `${f.name} is an old Word file. Save it as .docx or PDF, then upload it.` : `${f.name} isn't a PDF or Word (.docx) file.`);
      else if (f.size > MAX_MB * 1024 * 1024) bad.push(`${f.name} is larger than ${MAX_MB} MB.`);
      else if (seen.has(key)) bad.push(`${f.name} was added twice. Vettly kept one copy.`);
      else if (ok.length >= MAX_FILES) bad.push(`${f.name} wasn't added. A batch holds up to ${MAX_FILES} CVs.`);
      else {
        seen.add(key);
        ok.push(f);
      }
    }
    setSkipped(bad);
    if (fileRef.current) fileRef.current.value = "";
    if (ok.length === 0) return;
    setBusy(true);
    try {
      // Upload the files themselves (three at a time), then queue them for reading.
      const uploaded: UploadInput[] = [];
      const failed: string[] = [];
      for (let i = 0; i < ok.length; i += 3) {
        const results = await Promise.allSettled(ok.slice(i, i + 3).map((f) => uploadFile(f)));
        results.forEach((r, j) => (r.status === "fulfilled" ? uploaded.push(r.value) : failed.push(r.reason instanceof Error ? r.reason.message : `${ok[i + j]!.name} didn't upload.`)));
      }
      if (failed.length) setSkipped((s) => [...s, ...failed]);
      if (!uploaded.length) return;
      await services.cv.upload(vacancy.id, vacancy.title, uploaded);
      toast.success(`${uploaded.length} ${uploaded.length === 1 ? "CV" : "CVs"} uploaded`, `Vettly is reading them now, for ${vacancy.title}.`);
      onUploaded();
    } catch (e) {
      toast.error("The upload didn't finish", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8">
        <div className="flex flex-col gap-4">
          <Field label="Applying for" required error={vacancyError ?? undefined} hint="Every CV in this upload becomes an application for this vacancy.">
            <Select
              value={vacancyId}
              onValueChange={(v) => {
                setVacancyId(v);
                setVacancyError(null);
              }}
              placeholder="Choose a vacancy"
              options={vacancies.map((v) => ({ value: v.id, label: v.title, description: `${v.location} · ${v.reference}` }))}
            />
          </Field>
          <ul className="flex flex-col gap-1 text-xs text-fg-subtle">
            <li>PDF or Word (.docx)</li>
            <li>
              Up to {MAX_MB} MB each, {MAX_FILES} per upload
            </li>
            <li>Scanned CVs and photos can&apos;t be read yet: ask for a PDF or Word file</li>
          </ul>
        </div>

        <div
          onDragEnter={(e) => {
            e.preventDefault();
            depth.current++;
            setDrag(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => {
            depth.current = Math.max(0, depth.current - 1);
            if (depth.current === 0) setDrag(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            depth.current = 0;
            setDrag(false);
            take(e.dataTransfer.files);
          }}
          className={cn(
            "flex min-h-44 flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-8 text-center transition-[background-color,border-color] duration-200",
            drag ? "border-primary-500 bg-primary-50" : "border-line-strong bg-surface-muted",
          )}
        >
          <span className={cn("grid size-12 place-items-center rounded-full bg-surface text-primary-600 shadow-sm transition-transform duration-300 ease-(--ease-out-expo)", drag && "-translate-y-1 scale-105")}>
            <CloudArrowUp className="size-6" aria-hidden />
          </span>
          <div>
            <p className="text-md font-semibold text-fg">{drag ? "Drop to upload" : "Drop CVs here"}</p>
            <p className="mt-0.5 text-sm text-fg-muted">Drag a whole folder&apos;s worth at once, or choose files from your computer.</p>
          </div>
          <Button variant="secondary" size="sm" loading={busy} onClick={() => fileRef.current?.click()}>
            Choose files
          </Button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose CV files"
            accept=".pdf,.docx"
            onChange={(e) => take(e.target.files)}
          />
        </div>
      </div>

      {skipped.length > 0 && (
        <Alert
          tone="warning"
          className="mt-5"
          title={`${skipped.length} ${skipped.length === 1 ? "file was" : "files were"} not uploaded`}
          action={
            <Button size="sm" variant="ghost" onClick={() => setSkipped([])}>
              Dismiss
            </Button>
          }
        >
          <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4">
            {skipped.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Alert>
      )}
    </Card>
  );
}

/* ---------- Batches ---------- */

function BatchCard({ batch, full }: { batch: CvBatch; full: CvBatch }) {
  const [adding, setAdding] = React.useState(false);
  const pager = usePagination(batch.files, { pageSize: 10, resetKey: batch.files.length === full.files.length ? "all" : "filtered" });
  const top = React.useRef<HTMLDivElement>(null);
  const ready = full.files.filter((f) => f.status === "ready" && !f.duplicateOf);
  const active = full.files.filter((f) => IN_PROGRESS.includes(f.status));
  const done = full.files.length - active.length;
  const tally = (s: CvFileStatus) => full.files.filter((f) => f.status === s).length;

  return (
    <Card className="overflow-hidden scroll-mt-16" ref={top}>
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-md font-semibold text-fg">
            <Link href={`/vacancies/${full.vacancyId}`} className="hover:underline">
              {full.vacancyTitle}
            </Link>
          </h2>
          <p className="mt-0.5 text-xs text-fg-subtle">
            {full.files.length} {full.files.length === 1 ? "CV" : "CVs"} · uploaded by {full.uploadedBy} {timeAgo(full.uploadedAt, NOW)}
            {active.length === 0 && (
              <>
                {" "}
                · {tally("added")} added
                {tally("needs_review") > 0 && `, ${tally("needs_review")} to review`}
                {tally("failed") > 0 && `, ${tally("failed")} failed`}
              </>
            )}
          </p>
        </div>
        {active.length > 0 ? (
          <div className="flex w-full items-center gap-3 sm:w-56">
            <Progress value={(done / full.files.length) * 100} label={`${full.vacancyTitle} batch progress`} />
            <span className="shrink-0 text-xs font-medium text-fg-muted tabular">
              {done} of {full.files.length}
            </span>
          </div>
        ) : (
          ready.length > 0 && (
            <Button
              size="sm"
              loading={adding}
              onClick={async () => {
                setAdding(true);
                try {
                  const n = await services.cv.confirmReady(full.id);
                  toast.success(`${n} ${n === 1 ? "candidate" : "candidates"} added`, `Applying for ${full.vacancyTitle}`);
                } catch (e) {
                  toast.error("Not all were added", e instanceof Error ? e.message : undefined);
                } finally {
                  setAdding(false);
                }
              }}
            >
              <Checks />
              Add {ready.length} ready
            </Button>
          )
        )}
      </div>
      <ul>
        {pager.items.map((f) => (
          <FileRow key={f.id} f={f} />
        ))}
      </ul>
      {batch.files.length > 10 && (
        <div className="border-t border-line px-5 py-2.5">
          <Pagination p={pager} noun={["CV", "CVs"]} sizes={[10, 25, 50, 100]} anchor={top} />
        </div>
      )}
    </Card>
  );
}

function FileRow({ f }: { f: CvFile }) {
  const router = useRouter();
  const flags = flagsOf(f.extraction);
  const moving = f.status === "uploading" || f.status === "extracting";
  const reviewable = f.status === "ready" || f.status === "needs_review";
  const named = !!f.extraction && f.status !== "failed";

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-line px-5 py-3 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_11rem_auto]">
      <FileIcon format={f.format} className="self-start sm:self-center" />
      <div className="col-span-2 min-w-0 sm:col-span-1">
        <p className="truncate text-sm font-semibold text-fg">
          {reviewable || f.status === "added" ? (
            <Link href={f.status === "added" && f.candidateId ? `/candidates/${f.candidateId}` : `/cv-processing/${f.id}`} className="hover:underline">
              {personLine(f)}
            </Link>
          ) : (
            personLine(f)
          )}
        </p>
        <p className="truncate text-xs text-fg-subtle">
          {named ? `${f.name} · ` : ""}
          {f.format} · {sizeLabel(f.sizeKb)}
          {f.extraction?.ocr && f.status !== "added" ? " · scanned" : ""}
        </p>
        <Detail f={f} flags={flags.length} />
      </div>

      <div className="col-start-2 flex min-w-0 flex-col gap-1.5 sm:col-start-auto">
        <span>
          <CvStatusBadge status={f.status} />
        </span>
        {moving && <Progress value={f.progress} label={`${f.name} ${f.status === "uploading" ? "upload" : "reading"} progress`} className="max-w-40" />}
      </div>

      <div className="flex items-center justify-end gap-1">
        {reviewable && (
          <Button size="sm" variant={f.status === "needs_review" ? "primary" : "secondary"} asChild>
            <Link href={`/cv-processing/${f.id}`}>{f.status === "needs_review" ? "Review" : "Check and add"}</Link>
          </Button>
        )}
        {f.status === "added" && f.candidateId && (
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/candidates/${f.candidateId}`}>View candidate</Link>
          </Button>
        )}
        {f.status === "failed" && (
          <>
            {f.failure !== "not_a_cv" && (
              <Button size="sm" variant="secondary" onClick={() => router.push(`/cv-processing/${f.id}`)}>
                <PenLine />
                Enter details
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => services.cv.retry(f.id)}>
              <RotateCcw />
              Retry
            </Button>
          </>
        )}
        {f.status !== "added" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label={`More actions for ${f.name}`}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={async () => {
                  try {
                    await services.cv.remove(f.id);
                    toast.success(IN_PROGRESS.includes(f.status) ? "Upload cancelled" : "Removed from the queue", f.name);
                  } catch (e) {
                    toast.error("Not removed", e instanceof Error ? e.message : undefined);
                  }
                }}
                className="text-danger-700"
              >
                <Trash2 />
                {IN_PROGRESS.includes(f.status) ? "Cancel upload" : "Remove from queue"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </li>
  );
}

function Detail({ f, flags }: { f: CvFile; flags: number }) {
  if (f.status === "failed" && f.failure)
    return (
      <p className="mt-1 flex items-start gap-1.5 text-xs text-danger-700">
        <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
        <span>
          <span className="font-semibold">{FAILURE_COPY[f.failure].title}.</span> {FAILURE_COPY[f.failure].help}
        </span>
      </p>
    );
  if (f.duplicateOf && f.status !== "added")
    return <p className="mt-1 text-xs font-medium text-accent-700">Same email as {f.duplicateOf.name}, already a candidate</p>;
  if (f.status === "needs_review" && flags > 0)
    return (
      <p className="mt-1 text-xs font-medium text-accent-700">
        {flags} {flags === 1 ? "detail" : "details"} to check
      </p>
    );
  if (f.status === "ready" && f.extraction) return <p className="mt-1 truncate text-xs text-fg-muted">{f.extraction.headline.value}</p>;
  if (f.status === "added") return <p className="mt-1 text-xs text-fg-muted">Added by {f.reviewedBy}</p>;
  if (f.status === "discarded") return <p className="mt-1 text-xs text-fg-muted">{f.discardReason}</p>;
  return null;
}
