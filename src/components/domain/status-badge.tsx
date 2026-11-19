import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { ApplicationStage, VacancyStatus } from "@/types";

type Tone = NonNullable<BadgeProps["tone"]>;

/** Status labels: tinted fill in the status colour, a dot, and the word, so meaning never relies on colour alone. */
export const STAGE_META: Record<ApplicationStage, { label: string; tone: Tone }> = {
  applied: { label: "Applied", tone: "neutral" },
  screening: { label: "Screening", tone: "secondary" },
  shortlisted: { label: "Shortlisted", tone: "primary" },
  assessment: { label: "Assessment", tone: "warning" },
  interview: { label: "Interview", tone: "secondary" },
  offer: { label: "Offer", tone: "warning" },
  hired: { label: "Hired", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};

export const VACANCY_META: Record<VacancyStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
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
