import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { ApplicationStage, VacancyStatus } from "@/types";

/** Formal status chips: neutral chip, the coloured dot plus the label carry the state. */
export const STAGE_META: Record<ApplicationStage, { label: string; dot: string }> = {
  applied: { label: "Applied", dot: "bg-ink-400" },
  screening: { label: "Screening", dot: "bg-secondary-300" },
  shortlisted: { label: "Shortlisted", dot: "bg-primary-500" },
  assessment: { label: "Assessment", dot: "bg-primary-300" },
  interview: { label: "Interview", dot: "bg-secondary-500" },
  offer: { label: "Offer", dot: "bg-warning-500" },
  hired: { label: "Hired", dot: "bg-success-500" },
  rejected: { label: "Rejected", dot: "bg-danger-500" },
  withdrawn: { label: "Withdrawn", dot: "bg-ink-300" },
};

export const VACANCY_META: Record<VacancyStatus, { label: string; dot: string }> = {
  draft: { label: "Draft", dot: "bg-ink-300" },
  open: { label: "Open", dot: "bg-success-500" },
  paused: { label: "Paused", dot: "bg-warning-500" },
  closed: { label: "Closed", dot: "bg-ink-500" },
  filled: { label: "Filled", dot: "bg-primary-500" },
};

export function StageBadge({ stage, size }: { stage: ApplicationStage; size?: BadgeProps["size"] }) {
  const m = STAGE_META[stage];
  return (
    <Badge tone="status" size={size} dot dotClassName={m.dot}>
      {m.label}
    </Badge>
  );
}

export function VacancyStatusBadge({ status, size }: { status: VacancyStatus; size?: BadgeProps["size"] }) {
  const m = VACANCY_META[status];
  return (
    <Badge tone="status" size={size} dot dotClassName={m.dot}>
      {m.label}
    </Badge>
  );
}
