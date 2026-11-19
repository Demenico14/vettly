"use client";

import * as React from "react";
import { ArrowRightLeft, CalendarPlus, Copy, FileText, Inbox, MoreHorizontal, Pencil, Share2, Trash2 } from "@/components/icons";
import {
  Alert,
  Avatar,
  Button,
  ConfirmModal,
  Drawer,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Field,
  Modal,
  ModalClose,
  ModalContent,
  ModalTrigger,
  Progress,
  Select,
  Skeleton,
  Spinner,
  Textarea,
  Tooltip,
  toast,
} from "@/components/ui";
import { StageBadge, STAGE_META } from "@/components/domain/status-badge";
import { ProvenanceTag } from "@/components/domain/assessment";
import type { ApplicationStage } from "@/types";
import { DSSection, Specimen } from "./specimen";

function MoveStageModal() {
  const [open, setOpen] = React.useState(false);
  const [stage, setStage] = React.useState<ApplicationStage | "">("");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    if (!stage) {
      setError("Choose the stage to move this candidate to.");
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 800));
    setBusy(false);
    setOpen(false);
    toast.success(`Moved to ${STAGE_META[stage].label}`, "Tafadzwa Ncube · Finance Manager. Decision recorded.");
    setStage("");
    setReason("");
  };

  return (
    <Modal open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(undefined); }}>
      <ModalTrigger asChild>
        <Button>
          <ArrowRightLeft />
          Move stage
        </Button>
      </ModalTrigger>
      <ModalContent
        title="Move Tafadzwa Ncube"
        description="Finance Manager · Bulawayo. The move and your reason are saved to the decision record."
        footer={
          <>
            <ModalClose asChild>
              <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <Button loading={busy} onClick={submit}>
              Move candidate
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-md bg-surface-muted p-3">
            <Avatar name="Tafadzwa Ncube" size="sm" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">Tafadzwa Ncube</p>
              <p className="text-xs text-fg-subtle">Chartered accountant (ICAZ) · 9 yrs</p>
            </div>
            <StageBadge stage="shortlisted" size="sm" />
          </div>
          <Field label="New stage" required error={error}>
            <Select
              value={stage}
              onValueChange={(v) => { setStage(v as ApplicationStage); setError(undefined); }}
              placeholder="Choose stage"
              options={(["screening", "assessment", "interview", "offer", "rejected"] as ApplicationStage[]).map((s) => ({ value: s, label: STAGE_META[s].label }))}
            />
          </Field>
          <Field label="Reason" optional hint="Visible to your HR team and in the audit log.">
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Strong IFRS evidence; panel available next week." />
          </Field>
        </div>
      </ModalContent>
    </Modal>
  );
}

function DetailDrawer() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <FileText />
        Open side panel
      </Button>
      <Drawer open={open} onOpenChange={setOpen} title="Requirement evidence">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold">IFRS reporting experience</p>
              <p className="text-xs text-fg-subtle">Essential · weight 25%</p>
            </div>
            <ProvenanceTag provenance="ai_illustrative" compact />
          </div>
          <blockquote className="rounded-md border border-line bg-surface-muted p-3 text-fg-muted">
            “Prepared IFRS 9 and IFRS 16 compliant group financial statements for four subsidiaries, 2021–2025.”
            <footer className="mt-2 text-2xs font-semibold text-fg-subtle">CV page 2 · Work experience</footer>
          </blockquote>
          <Alert tone="warning" title="Missing evidence">
            No mention of IFRS 17. Ask about insurance contracts at interview.
          </Alert>
        </div>
        <div className="flex gap-2 border-t border-line p-4">
          <Button variant="secondary" className="flex-1" onClick={() => { setOpen(false); toast.info("Marked for follow-up"); }}>
            Needs follow-up
          </Button>
          <Button className="flex-1" onClick={() => { setOpen(false); toast.success("Evidence confirmed", "IFRS reporting experience"); }}>
            Confirm evidence
          </Button>
        </div>
      </Drawer>
    </>
  );
}

export function OverlaysSection() {
  const [confirm, setConfirm] = React.useState(false);
  return (
    <DSSection
      id="overlays"
      title="Overlays & notifications"
      description="Modals for decisions that must be protected (stage moves, destructive actions). Side panels for detail beside a list. Menus for row actions. Toasts confirm completed work and offer undo."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Specimen label="Modal, confirmation, side panel">
          <div className="flex flex-wrap gap-3">
            <MoveStageModal />
            <Button variant="danger-ghost" onClick={() => setConfirm(true)}>
              <Trash2 />
              Delete vacancy
            </Button>
            <DetailDrawer />
          </div>
          <ConfirmModal
            open={confirm}
            onOpenChange={setConfirm}
            title="Delete “Marketing Executive”?"
            description="This removes the draft vacancy and its 0 applications. This cannot be undone."
            confirmLabel="Delete vacancy"
            onConfirm={async () => {
              await new Promise((r) => setTimeout(r, 700));
              toast.success("Vacancy deleted", "Marketing Executive · Harare");
            }}
          />
        </Specimen>
        <Specimen label="Dropdown menu & tooltip">
          <div className="flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">
                  Vacancy actions
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Data Analyst · Harare</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => toast.info("Editing arrives in Module 4")} shortcut="E">
                  <Pencil />
                  Edit vacancy
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast.success("Vacancy duplicated", "Data Analyst (copy) saved as draft.")}>
                  <Copy />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast.success("Link copied", "Share it on LinkedIn or your careers page.")}>
                  <Share2 />
                  Copy share link
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast.info("Scheduling arrives in Module 10")}>
                  <CalendarPlus />
                  Schedule interviews
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem tone="danger" onSelect={() => setConfirm(true)}>
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Tooltip content="Time from application to offer acceptance, excluding weekends.">
              <Button variant="link" className="decoration-dotted underline">
                Time to hire
              </Button>
            </Tooltip>
          </div>
        </Specimen>
      </div>
      <Specimen label="Toasts" note="Bottom right. Four visible at most. Success toasts for reversible work include Undo.">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast.success("Interview scheduled", "Rutendo Chikwanha · Thu 20 Nov, 10:00")}>
            Success
          </Button>
          <Button variant="secondary" onClick={() => toast.error("Upload failed", "scan_0042.pdf is password-protected. Remove the password and try again.")}>
            Error
          </Button>
          <Button variant="secondary" onClick={() => toast.warning("2 CVs need review", "Text could not be read from scanned images.")}>
            Warning
          </Button>
          <Button variant="secondary" onClick={() => toast.info("Shortlist shared", "Sent to 3 panel members.")}>
            Info
          </Button>
          <Button variant="secondary" onClick={() => toast.withUndo("Candidate archived", () => toast.info("Archive undone"), "Blessing Mapfumo")}>
            With undo
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast.promise(new Promise((r) => setTimeout(r, 1600)), {
                loading: "Exporting shortlist…",
                success: "Shortlist exported · finance-manager-shortlist.xlsx",
                error: "Export failed",
              })
            }
          >
            Async
          </Button>
        </div>
      </Specimen>
    </DSSection>
  );
}

export function FeedbackSection() {
  const [progress, setProgress] = React.useState(64);
  return (
    <DSSection
      id="feedback"
      title="Feedback & states"
      description="Every data region designs its loading, empty, error and success state. Messages name what happened and what to do next."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Specimen label="Inline alerts">
          <div className="flex flex-col gap-3">
            <Alert tone="info" title="Screening weights changed">Scores for this vacancy will be recalculated overnight.</Alert>
            <Alert tone="success" title="Vacancy published">Live on your careers page and shared to LinkedIn.</Alert>
            <Alert tone="warning" title="Closing in 2 days">Finance Manager closes Fri 20 Nov. 38 applications so far.</Alert>
            <Alert tone="danger" title="2 CVs could not be processed">
              Open the processing queue to correct them manually.
            </Alert>
          </div>
        </Specimen>
        <div className="flex flex-col gap-6">
          <Specimen label="Progress & loading">
            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-semibold">Processing CVs · Finance Manager</span>
                  <span className="text-fg-subtle tabular">{Math.round((progress / 100) * 40)} of 40</span>
                </div>
                <Progress value={progress} label="CV processing progress" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setProgress((p) => Math.max(0, p - 15))}>
                  −15%
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setProgress((p) => Math.min(100, p + 15))}>
                  +15%
                </Button>
              </div>
              <div className="flex items-center gap-3 text-sm text-fg-muted">
                <Spinner className="size-4 text-primary-600" label="Loading" />
                Extracting work experience…
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            </div>
          </Specimen>
          <Specimen label="Empty state" bodyClassName="p-0">
            <EmptyState
              icon={<Inbox />}
              title="No applications yet"
              description="Share the vacancy link or upload CVs you received by email."
              action={
                <>
                  <Button size="sm" variant="secondary" onClick={() => toast.success("Link copied")}>Copy link</Button>
                  <Button size="sm" onClick={() => toast.info("Uploads arrive in Module 6")}>Upload CVs</Button>
                </>
              }
            />
          </Specimen>
        </div>
      </div>
    </DSSection>
  );
}
