import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { ApplicationStage, VacancyStatus } from "@/types";

type Tone = NonNullable<BadgeProps["tone"]>;

export const STAGE_META: Record<ApplicationStage, { label: string; tone: Tone }> = {
  applied: { label: "Applied", tone: "neutral" },
  screening: { label: "Screening", tone: "secondary" },
  shortlisted: { label: "Shortlisted", tone: "primary" },
  interview: { label: "Interview", tone: "accent" },
  offer: { label: "Offer", tone: "warning" },
  hired: { label: "Hired", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  withdrawn: { label: "Withdrawn", tone: "outline" },
};

export const VACANCY_META: Record<VacancyStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "outline" },
  open: { label: "Open", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  closed: { label: "Closed", tone: "neutral" },
  filled: { label: "Filled", tone: "primary" },
};

export function StageBadge({ stage, size }: { stage: ApplicationStage; size?: BadgeProps["size"] }) {
  const m = STAGE_META[stage];
  return (
    <Badge tone={m.tone} size={size} dot>
      {m.label}
    </Badge>
  );
}

export function VacancyStatusBadge({ status, size }: { status: VacancyStatus; size?: BadgeProps["size"] }) {
  const m = VACANCY_META[status];
  return (
    <Badge tone={m.tone} size={size} dot>
      {m.label}
    </Badge>
  );
}
