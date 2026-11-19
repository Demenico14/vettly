"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Eye, MoreHorizontal, Pencil, Trash2 } from "@/components/icons";
import {
  Alert,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Field,
  Modal,
  ModalClose,
  ModalContent,
  Textarea,
  toast,
} from "@/components/ui";
import { services, STATUS_MOVES } from "@/services";
import type { Vacancy, VacancyStatus } from "@/types";

type Move = { to: VacancyStatus; label: string; verb: string; reason: "none" | "optional" | "required"; tone: "primary" | "danger"; body: string };

export const MOVE_COPY: Record<VacancyStatus, Omit<Move, "to">> = {
  open: {
    label: "Publish",
    verb: "Publish vacancy",
    reason: "none",
    tone: "primary",
    body: "It goes live on the channels you chose and starts receiving applications.",
  },
  paused: {
    label: "Pause",
    verb: "Pause vacancy",
    reason: "optional",
    tone: "primary",
    body: "Adverts are hidden and no new applications are accepted. Candidates already in the pipeline are unaffected.",
  },
  closed: {
    label: "Close",
    verb: "Close vacancy",
    reason: "optional",
    tone: "danger",
    body: "Applications stop. You can still review, interview and make offers to existing candidates.",
  },
  filled: {
    label: "Mark as filled",
    verb: "Mark as filled",
    reason: "required",
    tone: "primary",
    body: "Records the vacancy as filled for reporting. This is the final status.",
  },
  draft: { label: "Move to draft", verb: "Move to draft", reason: "none", tone: "primary", body: "" },
};

/** Label for the primary move from a status, e.g. a paused vacancy "Resumes". */
export function moveLabel(from: VacancyStatus, to: VacancyStatus) {
  if (to === "open" && from === "paused") return "Resume";
  if (to === "open" && from === "closed") return "Reopen";
  return MOVE_COPY[to].label;
}

/** Confirmation dialog for every status change, with an optional or required reason saved to the history. */
export function StatusDialog({
  vacancy,
  to,
  onClose,
  onChanged,
}: {
  vacancy: Vacancy | null;
  to: VacancyStatus | null;
  onClose: () => void;
  onChanged: (v: Vacancy) => void;
}) {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const open = !!vacancy && !!to;
  const copy = to ? MOVE_COPY[to] : null;

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the dialog each time it opens
      setReason("");
      setError(null);
    }
  }, [open]);

  if (!vacancy || !to || !copy) return <Modal open={false} />;
  const label = moveLabel(vacancy.status, to);

  const submit = async () => {
    if (copy.reason === "required" && !reason.trim()) {
      setError("Add a short note, for example who accepted the offer.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const v = await services.vacancies.setStatus(vacancy.id, to, reason.trim() || undefined);
      onChanged(v);
      toast.success(`${vacancy.title}: ${label.toLowerCase() === "publish" ? "published" : v.status}`, reason.trim() || undefined);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The status could not be changed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()}>
      <ModalContent
        size="sm"
        title={`${label} “${vacancy.title}”?`}
        description={copy.body}
        footer={
          <>
            <ModalClose asChild>
              <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <Button variant={copy.tone} loading={busy} onClick={submit}>
              {label === "Publish" ? "Publish now" : label}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && <Alert tone="danger" title="Status not changed">{error}</Alert>}
          {copy.reason !== "none" && (
            <Field
              label="Note for the history"
              required={copy.reason === "required"}
              optional={copy.reason === "optional"}
              hint="Saved with the status change and visible to your team."
              error={copy.reason === "required" && error && !reason.trim() ? error : undefined}
            >
              <Textarea
                rows={2}
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={to === "filled" ? "e.g. Chipo Makoni accepted the offer" : "e.g. Budget review until December"}
              />
            </Field>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}

/** Row and page actions for a vacancy. Calls back with the requested move; destructive delete confirms here. */
export function VacancyActionsMenu({
  vacancy,
  onMove,
  onDuplicated,
  onDeleted,
  align = "end",
  trigger,
}: {
  vacancy: Vacancy;
  onMove: (to: VacancyStatus) => void;
  onDuplicated: (v: Vacancy) => void;
  onDeleted: (id: string) => void;
  align?: "start" | "end";
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const moves = STATUS_MOVES[vacancy.status];
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${vacancy.title}`} onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-52" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => router.push(`/vacancies/${vacancy.id}`)}>
            <Eye />
            View
          </DropdownMenuItem>
          {vacancy.status !== "filled" && (
            <DropdownMenuItem onSelect={() => router.push(`/vacancies/${vacancy.id}/edit`)}>
              <Pencil />
              Edit
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={async () => {
              const v = await services.vacancies.duplicate(vacancy.id);
              toast.success("Vacancy duplicated", `${v.title} saved as a draft.`);
              onDuplicated(v);
            }}
          >
            <Copy />
            Duplicate
          </DropdownMenuItem>
          {moves.length > 0 && <DropdownMenuSeparator />}
          {moves.map((to) => (
            <DropdownMenuItem key={to} tone={to === "closed" ? "danger" : undefined} onSelect={() => onMove(to)}>
              {moveLabel(vacancy.status, to)}
            </DropdownMenuItem>
          ))}
          {vacancy.status === "draft" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem tone="danger" onSelect={() => setConfirmDelete(true)}>
                <Trash2 />
                Delete draft
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Modal open={confirmDelete} onOpenChange={setConfirmDelete}>
        <ModalContent
          size="sm"
          title={`Delete “${vacancy.title}”?`}
          description="This draft has never been published. Deleting it removes it permanently."
          footer={
            <>
              <ModalClose asChild>
                <Button variant="secondary">Cancel</Button>
              </ModalClose>
              <Button
                variant="danger"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await services.vacancies.remove(vacancy.id);
                    toast.success("Draft deleted", vacancy.title);
                    setConfirmDelete(false);
                    onDeleted(vacancy.id);
                  } catch (e) {
                    toast.error("Draft not deleted", e instanceof Error ? e.message : undefined);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Delete draft
              </Button>
            </>
          }
        />
      </Modal>
    </>
  );
}
