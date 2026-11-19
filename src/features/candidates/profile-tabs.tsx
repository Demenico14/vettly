"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardList, Download, Eye, FilePdf, NotePencil, Trash2, Upload } from "@/components/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  ModalClose,
  ModalContent,
  Select,
  Skeleton,
  Textarea,
  toast,
} from "@/components/ui";
import { StageBadge, STAGE_META } from "@/components/domain/status-badge";
import { MatchScore } from "@/components/domain/assessment";
import { services, MOCK_NOW } from "@/services";
import type { ApplicationStage, CandidateApplication, CandidateDocument, CandidateProfile, TestInvitationSummary } from "@/types";
import { cn, formatDate, timeAgo } from "@/lib/utils";

const NOW = new Date(MOCK_NOW);
const STAGES = Object.keys(STAGE_META) as ApplicationStage[];

/* ---------- Applications ---------- */

export function MoveStageDialog({
  candidate,
  app,
  open,
  onOpenChange,
  onMoved,
}: {
  candidate: CandidateProfile;
  app: CandidateApplication;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onMoved: (c: CandidateProfile) => void;
}) {
  const [stage, setStage] = React.useState<string>("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const needsNote = stage === "rejected";

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the form whenever the dialog opens
      setStage("");
      setNote("");
      setError(null);
    }
  }, [open]);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title={`Move ${candidate.name.split(" ")[0]}`}
        description={`${app.vacancyTitle}. The move and your note are saved to the decision record.`}
        footer={
          <>
            <ModalClose asChild>
              <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <Button
              variant={stage === "rejected" ? "danger" : "primary"}
              loading={busy}
              onClick={async () => {
                if (!stage) return setError("Choose a stage.");
                if (needsNote && !note.trim()) return setError("Add the reason. Rejections must be explained for the audit record.");
                setBusy(true);
                try {
                  const c = await services.profiles.moveStage(candidate.id, app.id, stage as ApplicationStage, note.trim() || undefined);
                  onMoved(c);
                  toast.success(`Moved to ${STAGE_META[stage as ApplicationStage].label}`, `${candidate.name} · ${app.vacancyTitle}`);
                  onOpenChange(false);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "The move could not be saved.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {stage === "rejected" ? "Reject candidate" : "Move candidate"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert tone="danger" title="Not moved">{error}</Alert>}
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            Currently <StageBadge stage={app.stage} size="sm" />
          </div>
          <Field label="New stage" required>
            <Select
              value={stage}
              onValueChange={(v) => {
                setStage(v);
                setError(null);
              }}
              placeholder="Choose stage"
              options={STAGES.filter((s) => s !== app.stage).map((s) => ({
                value: s,
                label: STAGE_META[s].label,
                description: s === "assessment" ? "Sends the vacancy's psychometric tests" : undefined,
              }))}
            />
          </Field>
          <Field label="Note" required={needsNote} optional={!needsNote} hint="Visible to your HR team and kept in the audit log.">
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={needsNote ? "e.g. No evidence of IFRS group reporting" : "e.g. Strong ICAZ and IFRS evidence"} />
          </Field>
        </div>
      </ModalContent>
    </Modal>
  );
}

export function ApplicationsTab({ c, onChange }: { c: CandidateProfile; onChange: (c: CandidateProfile) => void }) {
  const [moving, setMoving] = React.useState<CandidateApplication | null>(null);
  return (
    <div className="flex flex-col gap-4">
      {c.applications.map((a) => (
        <Card key={a.id} className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
            <div>
              <Link href={`/vacancies/${a.vacancyId}`} className="text-base font-semibold text-fg hover:underline">
                {a.vacancyTitle}
              </Link>
              <p className="text-xs text-fg-subtle">
                Applied {formatDate(a.appliedAt)} via {a.source}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <MatchScore score={a.matchScore} provenance={a.provenance} size="sm" showTag />
              <StageBadge stage={a.stage} />
              {a.stage !== "hired" && a.stage !== "withdrawn" && (
                <Button size="sm" variant="secondary" onClick={() => setMoving(a)}>
                  Move stage
                </Button>
              )}
            </div>
          </div>
          <ol className="border-t border-line px-5 py-4">
            {[...a.history].reverse().map((h, i, arr) => (
              <li key={`${h.stage}-${h.at}`} className="relative flex gap-3 pb-4 last:pb-0">
                {i < arr.length - 1 && <span className="absolute top-5 left-[0.3125rem] h-[calc(100%-1rem)] w-px bg-line" aria-hidden />}
                <span className={cn("relative mt-1.5 size-2.5 shrink-0 rounded-full", i === 0 ? "bg-primary-500" : "bg-ink-300")} aria-hidden />
                <div className="min-w-0 text-sm">
                  <p className="text-fg">
                    <span className="font-semibold">{STAGE_META[h.stage].label}</span>
                    <span className="text-fg-subtle"> · {h.by === "Candidate" ? "Candidate applied" : h.by === "Vettly" ? "Automatic" : h.by}</span>
                  </p>
                  {h.note && <p className="mt-0.5 text-fg-muted">“{h.note}”</p>}
                  <p className="text-xs text-fg-subtle">
                    {formatDate(h.at)} · {timeAgo(h.at, NOW)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      ))}
      {moving && <MoveStageDialog candidate={c} app={moving} open={!!moving} onOpenChange={(o) => !o && setMoving(null)} onMoved={onChange} />}
    </div>
  );
}

/* ---------- Psychometric tests ---------- */

const TEST_STATUS: Record<TestInvitationSummary["status"], string> = {
  not_sent: "Not sent",
  sent: "Sent, not opened",
  opened: "Opened",
  in_progress: "In progress",
  completed: "Completed",
  expired: "Expired",
  cancelled: "Cancelled",
};

/** Illustrative per-test results for completed invitations, keyed by candidate. */
const RESULTS: Record<string, { test: string; percentile: number; band: string }[]> = {
  "Tafadzwa Ncube": [
    { test: "Numerical reasoning", percentile: 78, band: "Above average" },
    { test: "Situational judgement", percentile: 64, band: "Average" },
    { test: "Work styles questionnaire", percentile: 0, band: "Profile report" },
  ],
  "Tinashe Mhlanga": [
    { test: "Numerical reasoning", percentile: 69, band: "Above average" },
    { test: "Situational judgement", percentile: 74, band: "Above average" },
  ],
  "Chipo Makoni": [
    { test: "Numerical reasoning", percentile: 71, band: "Above average" },
    { test: "Situational judgement", percentile: 82, band: "Well above average" },
  ],
};

export function AssessmentsTab({ c }: { c: CandidateProfile }) {
  const [tests, setTests] = React.useState<TestInvitationSummary[] | null>(null);
  React.useEffect(() => {
    let alive = true;
    services.profiles.tests(c.name).then((t) => alive && setTests(t));
    return () => {
      alive = false;
    };
  }, [c.name]);

  if (!tests) return <Skeleton className="h-40 w-full rounded-lg" />;
  if (tests.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<ClipboardList />}
          title="No psychometric tests sent"
          description="Tests are sent when a candidate reaches the Assessment stage, or by hand from the pipeline."
          action={
            <Button size="sm" variant="secondary" onClick={() => toast.info("Send tests", "Sending tests arrives in Module 9.")}>
              Send tests
            </Button>
          }
        />
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {tests.map((t) => {
        const results = t.status === "completed" ? RESULTS[c.name] : undefined;
        return (
          <Card key={t.id} className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-base font-semibold text-fg">{t.battery}</p>
                <p className="text-xs text-fg-subtle">
                  {t.vacancyTitle} · sent {formatDate(t.sentAt)} · due {formatDate(t.deadline)}
                </p>
              </div>
              <span className="text-sm text-fg-muted">
                {TEST_STATUS[t.status]} · {t.completed} of {t.total}
              </span>
            </div>
            {results && (
              <ul className="border-t border-line px-5 py-4">
                {results.map((r) => (
                  <li key={r.test} className="grid grid-cols-[minmax(0,1fr)_8rem_6rem] items-center gap-4 border-b border-line py-2.5 text-sm last:border-b-0">
                    <span className="text-fg">{r.test}</span>
                    {r.percentile ? (
                      <span className="h-2 overflow-hidden rounded-full bg-ink-100" aria-hidden>
                        <span className="block h-full rounded-full bg-warning-500" style={{ width: `${r.percentile}%` }} />
                      </span>
                    ) : (
                      <span className="text-xs text-fg-subtle">Not scored</span>
                    )}
                    <span className="text-right text-xs text-fg-muted">
                      {r.percentile ? <span className="font-semibold text-fg tabular">{r.percentile}th</span> : null} {r.band}
                    </span>
                  </li>
                ))}
                <li className="pt-3 text-2xs text-fg-subtle">Illustrative results · percentile against a general professional norm group</li>
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ---------- Documents ---------- */

const ACCEPT = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword", "image/jpeg", "image/png"];

export function DocumentsTab({ c, onChange }: { c: CandidateProfile; onChange: (c: CandidateProfile) => void }) {
  const [preview, setPreview] = React.useState<CandidateDocument | null>(null);
  const [kind, setKind] = React.useState<CandidateDocument["kind"]>("Certificate");
  const [uploading, setUploading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [drag, setDrag] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const upload = async (file?: File) => {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) return setError(`${file.name} isn't a PDF, Word document or image.`);
    if (file.size > 10 * 1024 * 1024) return setError(`${file.name} is larger than 10 MB.`);
    setError(null);
    setUploading(file.name);
    try {
      const next = await services.profiles.uploadDocument(c.id, { name: file.name, sizeKb: Math.round(file.size / 1024), kind });
      onChange(next);
      toast.success("Document uploaded", file.name);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <ul>
          {c.documents.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 last:border-b-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-danger-50 text-danger-600">
                <FilePdf className="size-5" aria-hidden />
              </span>
              <div className="min-w-48 flex-1">
                <p className="truncate text-sm font-semibold text-fg">{d.name}</p>
                <p className="text-xs text-fg-subtle">
                  {d.kind} · {d.pages} {d.pages === 1 ? "page" : "pages"} · {d.sizeKb} KB · added {timeAgo(d.uploadedAt, NOW)}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setPreview(d)}>
                  <Eye />
                  Preview
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label={`Download ${d.name}`} onClick={() => toast.success("Download started (simulated)", d.name)}>
                  <Download />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove ${d.name}`}
                  onClick={async () => {
                    try {
                      onChange(await services.profiles.removeDocument(c.id, d.id));
                      toast.success("Document removed", d.name);
                    } catch (e) {
                      toast.error("Not removed", e instanceof Error ? e.message : undefined);
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-semibold text-fg">Add a document</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <Select
            aria-label="Document type"
            value={kind}
            onValueChange={(v) => setKind(v as CandidateDocument["kind"])}
            options={["CV", "Cover letter", "Certificate", "Transcript", "Other"].map((k) => ({ value: k, label: k }))}
          />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              upload(e.dataTransfer.files[0]);
            }}
            className={cn(
              "flex flex-wrap items-center justify-center gap-2 rounded-md border border-dashed px-4 py-4 text-sm text-fg-muted transition-colors",
              drag ? "border-primary-500 bg-primary-50" : "border-line-strong",
              error && "border-danger-500",
            )}
          >
            {uploading ? (
              <span>Uploading {uploading}…</span>
            ) : (
              <>
                <Upload className="size-4 text-ink-500" />
                Drop a file or
                <button type="button" onClick={() => fileRef.current?.click()} className="font-semibold text-primary-700 hover:underline">
                  choose one
                </button>
                <span className="w-full text-center text-xs text-fg-subtle">PDF, Word or image, up to 10 MB</span>
              </>
            )}
            <input ref={fileRef} type="file" className="sr-only" aria-label="Upload document" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => upload(e.target.files?.[0])} />
          </div>
        </div>
        {error && (
          <p className="mt-2 text-xs font-medium text-danger-700" role="alert">
            {error}
          </p>
        )}
      </Card>

      <Modal open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        {preview && (
          <ModalContent size="lg" title={preview.name} description={`${preview.kind} · ${preview.pages} ${preview.pages === 1 ? "page" : "pages"}`}>
            <div className="rounded-md bg-ink-100 p-4 sm:p-6">
              <div className="mx-auto max-w-[36rem] rounded-sm bg-white px-8 py-10 font-serif text-[0.8125rem] leading-relaxed text-ink-900 shadow-md">
                {preview.kind === "CV" ? (
                  <>
                    <p className="text-xl font-bold tracking-tight">{c.name}</p>
                    <p className="text-ink-600">
                      {c.location} · {c.email} · {c.phone}
                    </p>
                    <p className="mt-4">{c.summary}</p>
                    <p className="mt-5 text-xs font-bold tracking-wider uppercase">Experience</p>
                    {c.experience.map((e) => (
                      <div key={e.id} className="mt-2">
                        <p className="font-bold">
                          {e.title}, {e.company}
                        </p>
                        <ul className="list-disc pl-4">
                          {e.bullets.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    <p className="mt-5 text-xs font-bold tracking-wider uppercase">Education</p>
                    {c.education.map((e) => (
                      <p key={e.id}>
                        {e.qualification} {e.field}, {e.institution} ({e.end ?? "current"})
                      </p>
                    ))}
                  </>
                ) : (
                  <p className="py-16 text-center text-ink-500">Preview of {preview.name}</p>
                )}
              </div>
            </div>
            <p className="mt-3 text-2xs text-fg-subtle">Illustrative preview rendered from the candidate record. Real files are shown here after backend integration.</p>
          </ModalContent>
        )}
      </Modal>
    </div>
  );
}

/* ---------- Notes ---------- */

export function NotesTab({ c, onChange }: { c: CandidateProfile; onChange: (c: CandidateProfile) => void }) {
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!body.trim()) return;
            setBusy(true);
            onChange(await services.profiles.addNote(c.id, body.trim()));
            setBody("");
            setBusy(false);
            toast.success("Note added");
          }}
          className="flex flex-col gap-3"
        >
          <Field label="Add a note" hint="Notes are visible to everyone in your organisation who can see this candidate.">
            <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="e.g. Phone screen went well; available from January." />
          </Field>
          <Button type="submit" className="self-end" loading={busy} disabled={!body.trim()}>
            Add note
          </Button>
        </form>
      </Card>
      {c.notes.length === 0 ? (
        <Card>
          <EmptyState icon={<NotePencil />} title="No notes yet" description="Phone screens, references and anything else your team should know." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {c.notes.map((n) => (
              <li key={n.id} className="flex gap-3 border-b border-line px-5 py-4 last:border-b-0">
                <Avatar name={n.author} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-semibold text-fg">{n.author}</span>
                    <span className="text-xs text-fg-subtle"> · {timeAgo(n.at, NOW)}</span>
                  </p>
                  <p className="mt-0.5 text-sm whitespace-pre-line text-fg-muted">{n.body}</p>
                </div>
                {n.author === "Tendai Moyo" && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Delete note"
                    onClick={async () => {
                      onChange(await services.profiles.removeNote(c.id, n.id));
                      toast.success("Note deleted");
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

