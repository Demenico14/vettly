"use client";

import * as React from "react";
import { ArrowRight, ClipboardList } from "@/components/icons";
import { Alert, Button, Checkbox, Field, Modal, ModalClose, ModalContent, Select, Textarea, toast } from "@/components/ui";
import { STAGE_META, StageBadge } from "@/components/domain/status-badge";
import { services, PIPELINE_STAGES, CLOSED_STAGES, type PipelineCard } from "@/services";
import type { ApplicationStage, Vacancy } from "@/types";
import { cn } from "@/lib/utils";

const REJECT_REASONS = [
  "Essential requirements not evidenced on the CV",
  "Did not meet the minimum experience",
  "Stronger candidates further along",
  "Salary expectations well above the range",
  "Not available within the required notice period",
];

const order = (s: ApplicationStage) => PIPELINE_STAGES.indexOf(s);

export interface MoveRequest {
  cards: PipelineCard[];
  /** Pre-chosen when a card is dropped on a column; otherwise the person picks. */
  stage?: ApplicationStage;
}

export function MoveDialog({
  request,
  vacancy,
  batteryLabel,
  onClose,
  onMoved,
}: {
  request: MoveRequest | null;
  vacancy: Vacancy;
  batteryLabel: string | null;
  onClose: () => void;
  onMoved: () => void;
}) {
  const [stage, setStage] = React.useState<ApplicationStage | "">("");
  const [note, setNote] = React.useState("");
  const [sendTests, setSendTests] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!request) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the form for each new request
    setStage(request.stage ?? "");
    setNote("");
    setSendTests(!!batteryLabel);
    setError(null);
  }, [request, batteryLabel]);

  if (!request) return null;
  const cards = request.cards;
  const many = cards.length > 1;
  const first = cards[0]!;
  const back = !!stage && cards.some((c) => order(c.stage) >= 0 && order(stage) >= 0 && order(stage) < order(c.stage));
  const needsNote = stage === "rejected" || back;
  const hiredBlocked = stage === "hired" ? cards.filter((c) => c.stage !== "offer") : [];
  const fromStages = [...new Set(cards.map((c) => c.stage))];
  const options = [...PIPELINE_STAGES, ...CLOSED_STAGES].filter((s) => s !== "withdrawn" && !(fromStages.length === 1 && s === fromStages[0]));

  const submit = async () => {
    if (!stage) return setError("Choose a stage.");
    if (needsNote && !note.trim()) return setError(stage === "rejected" ? "Add the reason. Rejections must be explained for the audit record." : "Say why the candidate is moving back a stage.");
    setBusy(true);
    try {
      const r = await services.pipeline.move(
        cards.map((c) => ({ candidateId: c.candidateId, applicationId: c.applicationId })),
        stage,
        note,
        { sendTests: stage === "assessment" && sendTests },
      );
      const label = STAGE_META[stage].label;
      const who = many ? `${r.moved} ${r.moved === 1 ? "candidate" : "candidates"}` : first.name;
      if (r.moved === 0) {
        toast.warning("Nobody was moved", r.skipped.map((s) => `${s.name}: ${s.reason}`).join("; "));
      } else {
        const extra = [r.testsSent ? `${batteryLabel} sent to ${r.testsSent}` : null, r.testsCancelled ? `Unfinished tests cancelled for ${r.testsCancelled}` : null, r.skipped.length ? `${r.skipped.length} skipped (${r.skipped.map((s) => `${s.name.split(" ")[0]}: ${s.reason}`).join("; ")})` : null]
          .filter(Boolean)
          .join(" · ");
        toast.success(stage === "rejected" ? `${who} rejected` : `${who} moved to ${label}`, extra || vacancy.title);
      }
      onMoved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The move could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onOpenChange={(o) => !o && onClose()}>
      <ModalContent
        title={many ? `Move ${cards.length} candidates` : `Move ${first.name.split(" ")[0]}`}
        description={`${vacancy.title}. The move and your note are saved to each candidate's decision record.`}
        footer={
          <>
            <ModalClose asChild>
              <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <Button variant={stage === "rejected" ? "danger" : "primary"} loading={busy} onClick={submit}>
              {stage === "rejected" ? (many ? `Reject ${cards.length}` : "Reject candidate") : many ? `Move ${cards.length}` : "Move candidate"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && (
            <Alert tone="danger" title="Not moved">
              {error}
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            {fromStages.map((s) => (
              <StageBadge key={s} stage={s} size="sm" />
            ))}
            <ArrowRight className="size-4 text-ink-400" aria-hidden />
            {stage ? <StageBadge stage={stage} size="sm" /> : <span className="text-xs">choose a stage</span>}
          </div>
          {many && <p className="text-xs text-fg-subtle">{cards.map((c) => c.name).join(", ")}</p>}

          {!request.stage && (
            <Field label="Move to" required>
              <Select
                value={stage}
                onValueChange={(v) => {
                  setStage(v as ApplicationStage);
                  setError(null);
                }}
                placeholder="Choose stage"
                options={options.map((s) => ({
                  value: s,
                  label: STAGE_META[s].label,
                  description: s === "assessment" && batteryLabel ? `Can send the ${batteryLabel}` : s === "hired" ? "Only from Offer" : undefined,
                }))}
              />
            </Field>
          )}

          {hiredBlocked.length > 0 && (
            <Alert tone="warning" title={`${hiredBlocked.length === cards.length ? "Can't" : `${hiredBlocked.length} can't`} be marked as hired yet`}>
              Hire from the Offer stage, so the accepted offer is on record. {hiredBlocked.length < cards.length && "The others will still move."}
            </Alert>
          )}

          {stage === "assessment" && (
            <div className={cn("rounded-md border px-4 py-3", batteryLabel ? "border-line" : "border-dashed border-line-strong")}>
              {batteryLabel ? (
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox checked={sendTests} onCheckedChange={(v) => setSendTests(v === true)} className="mt-0.5" />
                  <span>
                    <span className="flex items-center gap-1.5 font-semibold text-fg">
                      <ClipboardList className="size-4 text-ink-500" aria-hidden />
                      Send the {batteryLabel} now
                    </span>
                    <span className="mt-0.5 block text-xs text-fg-muted">
                      Due in {vacancy.assessment.deadlineDays} days. Candidates who already have tests open are skipped.
                    </span>
                  </span>
                </label>
              ) : (
                <p className="text-xs text-fg-muted">This vacancy has no test battery, so no tests are sent. Add one in the vacancy&apos;s settings.</p>
              )}
            </div>
          )}

          {stage === "rejected" && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-fg-subtle">Common reasons</p>
              <div className="flex flex-wrap gap-1.5">
                {REJECT_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setNote(r);
                      setError(null);
                    }}
                    className={cn(
                      "pressable rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      note === r ? "border-danger-500 bg-danger-50 text-danger-700" : "border-line-strong text-fg-muted hover:border-ink-400 hover:text-fg",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Field
            label="Note"
            required={needsNote}
            optional={!needsNote}
            hint={stage === "rejected" ? "Kept in the audit log. Candidates are not shown this note." : back ? "Moving back a stage needs a reason." : "Visible to your HR team and kept in the audit log."}
          >
            <Textarea
              rows={3}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setError(null);
              }}
              placeholder={stage === "rejected" ? "Why this candidate isn't going forward" : "e.g. Strong ICAZ and IFRS evidence"}
            />
          </Field>
        </div>
      </ModalContent>
    </Modal>
  );
}
