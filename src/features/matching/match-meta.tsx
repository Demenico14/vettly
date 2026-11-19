import * as React from "react";
import { Check, CircleHelp, Minus, X } from "@/components/icons";
import { Tooltip } from "@/components/ui";
import type { RequirementAssessment, RequirementOutcome, ScoreCategory } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Outcome of one requirement. Icon and word carry the meaning; colour supports it.
 * "No evidence" is dashed, like other unreviewed AI output: it is a gap in the CV, not a verdict.
 */
export const OUTCOME: Record<RequirementOutcome, { label: string; Icon: typeof Check; chip: string; dot: string }> = {
  met: { label: "Met", Icon: Check, chip: "bg-primary-50 text-primary-800", dot: "bg-primary-600 text-white" },
  partial: { label: "Partly met", Icon: Minus, chip: "bg-secondary-50 text-secondary-800", dot: "bg-secondary-500 text-white" },
  not_met: { label: "Not met", Icon: X, chip: "bg-danger-50 text-danger-700", dot: "bg-danger-500 text-white" },
  missing: { label: "No evidence", Icon: CircleHelp, chip: "border border-dashed border-ink-400 bg-surface text-fg-muted", dot: "border border-dashed border-ink-400 bg-surface text-ink-500" },
};

export const OUTCOMES = Object.keys(OUTCOME) as RequirementOutcome[];

export function OutcomeChip({ outcome, className }: { outcome: RequirementOutcome; className?: string }) {
  const o = OUTCOME[outcome];
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold whitespace-nowrap", o.chip, className)}>
      <o.Icon className="size-3.5" weight="bold" aria-hidden />
      {o.label}
    </span>
  );
}

/** One small mark per requirement, in order: a scannable fingerprint of a candidate's fit. */
export function OutcomeDots({ items, className }: { items: RequirementAssessment[]; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {items.map((r) => {
        const o = OUTCOME[r.outcome];
        return (
          <Tooltip key={r.requirement.id} content={`${r.requirement.text}: ${o.label}`}>
            <span tabIndex={0} aria-label={`${r.requirement.text}: ${o.label}`} className={cn("grid size-4.5 place-items-center rounded-full", o.dot)}>
              <o.Icon className="size-2.5" weight="bold" aria-hidden />
            </span>
          </Tooltip>
        );
      })}
    </span>
  );
}

export const CATEGORY_LABEL: Record<ScoreCategory, string> = {
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  certifications: "Certifications",
  assessments: "Psychometric tests",
};

export function essentials(reqs: RequirementAssessment[]) {
  const ess = reqs.filter((r) => r.requirement.priority === "essential");
  return { met: ess.filter((r) => r.outcome === "met").length, total: ess.length, items: ess };
}
