"use client";

import * as React from "react";
import { BadgeCheck, ChatText, Check, PenLine, Quote, RotateCcw } from "@/components/icons";
import { Button, Popover, PopoverContent, PopoverTrigger, RadioGroup, Textarea, toast } from "@/components/ui";
import type { Evidence, RequirementAssessment, RequirementOutcome } from "@/types";
import { MOCK_NOW } from "@/services";
import { cn, timeAgo } from "@/lib/utils";
import { OUTCOME, OUTCOMES, OutcomeChip } from "./match-meta";

const NOW = new Date(MOCK_NOW);
const KIND: Record<RequirementAssessment["requirement"]["kind"], string> = {
  skill: "Skill",
  experience: "Experience",
  education: "Education",
  certification: "Certification",
  language: "Language",
};

export function RequirementRow({
  r,
  locked,
  onAgree,
  onChange,
  onUndo,
  onShowEvidence,
}: {
  r: RequirementAssessment;
  /** Confirmed assessments are read-only until reopened. */
  locked: boolean;
  onAgree: () => Promise<void>;
  onChange: (outcome: RequirementOutcome, reason: string) => Promise<void>;
  onUndo: () => Promise<void>;
  onShowEvidence: (e: Evidence) => void;
}) {
  const changed = r.review?.action === "changed";
  return (
    <li className="grid grid-cols-1 gap-3 border-b border-line px-5 py-5 last:border-b-0 sm:px-6 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-8">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <OutcomeChip outcome={r.outcome} />
          <span className="text-xs font-semibold text-fg-muted">
            {KIND[r.requirement.kind]}
            {r.requirement.years ? ` · ${r.requirement.years}+ yrs` : ""}
          </span>
        </div>
        <h3 className="mt-2 text-md font-semibold text-pretty text-fg">{r.requirement.text}</h3>
        <p className="mt-1 text-sm text-fg-muted">
          {changed ? (
            <>
              Vettly said <span className="font-medium text-fg">{OUTCOME[r.aiOutcome].label.toLowerCase()}</span>: {r.rationale}
            </>
          ) : (
            r.rationale
          )}
        </p>

        {r.evidence.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {r.evidence.map((e, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => onShowEvidence(e)}
                  className="group flex w-full items-start gap-2.5 rounded-md bg-ink-50 px-3 py-2 text-left transition-colors hover:bg-ink-100"
                >
                  <Quote className="mt-0.5 size-3.5 shrink-0 text-ink-400" weight="fill" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-fg">{e.quote}</span>
                    <span className="mt-0.5 block text-xs text-fg-subtle">
                      {e.source} · {e.where}
                    </span>
                  </span>
                  <span className="shrink-0 self-center text-xs font-semibold text-primary-700 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    Show in CV
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {r.question && r.outcome !== "met" && (
          <p className="mt-3 flex items-start gap-2 text-sm text-fg-muted">
            <ChatText className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden />
            <span>
              <span className="font-semibold text-fg">Ask at screening: </span>
              {r.question}
            </span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 lg:items-stretch">
        {r.review ? (
          <div className={cn("rounded-md px-3 py-2.5 text-xs", changed ? "bg-secondary-50 text-secondary-800" : "bg-success-50 text-success-700")}>
            <p className="flex items-center gap-1.5 font-semibold">
              {changed ? <PenLine className="size-3.5" aria-hidden /> : <BadgeCheck className="size-3.5" aria-hidden />}
              {changed ? `Changed to ${OUTCOME[r.outcome].label.toLowerCase()}` : "Agreed"}
            </p>
            <p className="mt-0.5 opacity-90">
              {r.review.by} · {timeAgo(r.review.at, NOW)}
            </p>
            {r.review.reason && <p className="mt-1.5 text-fg-muted">&ldquo;{r.review.reason}&rdquo;</p>}
            {!locked && (
              <button type="button" onClick={onUndo} className="mt-1.5 inline-flex items-center gap-1 font-semibold hover:underline">
                <RotateCcw className="size-3" aria-hidden />
                Undo
              </button>
            )}
          </div>
        ) : locked ? null : (
          <div className="flex gap-2 lg:flex-col">
            <Button size="sm" variant="secondary" onClick={onAgree} className="lg:justify-start">
              <Check />
              Agree
            </Button>
            <ChangeOutcome current={r.outcome} onSave={onChange} />
          </div>
        )}
      </div>
    </li>
  );
}

function ChangeOutcome({ current, onSave }: { current: RequirementOutcome; onSave: (o: RequirementOutcome, reason: string) => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [outcome, setOutcome] = React.useState<RequirementOutcome>(current);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setOutcome(current);
          setReason("");
          setError(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="lg:justify-start">
          <PenLine />
          Change
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (outcome === current) return setError("Choose a different outcome, or use Agree.");
            if (!reason.trim()) return setError("Say why, so the change can be explained later.");
            setBusy(true);
            try {
              await onSave(outcome, reason);
              setOpen(false);
            } catch (err) {
              toast.error("Not changed", err instanceof Error ? err.message : undefined);
            } finally {
              setBusy(false);
            }
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <p className="text-sm font-semibold text-fg">Change the outcome</p>
            <p className="mt-0.5 text-xs text-fg-muted">Vettly&apos;s suggestion stays in the record next to yours.</p>
          </div>
          <RadioGroup
            value={outcome}
            onValueChange={(v) => {
              setOutcome(v as RequirementOutcome);
              setError(null);
            }}
            options={OUTCOMES.map((o) => ({ value: o, label: OUTCOME[o].label }))}
            aria-label="Outcome"
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="change-reason" className="text-sm font-semibold text-fg">
              Reason
            </label>
            <Textarea
              id="change-reason"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Confirmed ICAZ membership by phone; number on file."
              aria-invalid={!!error || undefined}
            />
            {error && (
              <p role="alert" className="text-xs font-medium text-danger-700">
                {error}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={busy}>
              Save change
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
