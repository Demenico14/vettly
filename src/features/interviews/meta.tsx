import * as React from "react";
import { Badge, type BadgeProps } from "@/components/ui";
import type { Interview, InterviewKind, Recommendation, Response } from "@/types/interviews";
import { cn } from "@/lib/utils";

type Tone = NonNullable<BadgeProps["tone"]>;
const TZ = "Africa/Harare";

export const time = (iso: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));
export const dayLong = (iso: string) => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(new Date(iso));
export const dayShort = (iso: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: TZ }).format(new Date(iso));
export const endTime = (iv: Pick<Interview, "startsAt" | "durationMin">) => time(new Date(new Date(iv.startsAt).getTime() + iv.durationMin * 60000).toISOString());

export const KIND: Record<InterviewKind, string> = {
  screening_call: "Screening call",
  first_interview: "First interview",
  technical: "Technical panel",
  case_study: "Case study",
  panel: "Panel interview",
  final: "Final interview",
};

export const STATUS: Record<Interview["status"], { label: string; tone: Tone }> = {
  scheduled: { label: "Scheduled", tone: "secondary" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  no_show: { label: "No-show", tone: "danger" },
};

export function StatusBadge({ status, size = "sm" }: { status: Interview["status"]; size?: BadgeProps["size"] }) {
  const m = STATUS[status];
  return (
    <Badge tone={m.tone} size={size} dot>
      {m.label}
    </Badge>
  );
}

export const RESPONSE: Record<Response | "reschedule_requested", { label: string; cls: string }> = {
  accepted: { label: "Accepted", cls: "text-success-700" },
  pending: { label: "Awaiting reply", cls: "text-fg-subtle" },
  declined: { label: "Declined", cls: "text-danger-700" },
  reschedule_requested: { label: "Asked to reschedule", cls: "text-accent-700" },
};

export const RECOMMENDATION: Record<Recommendation, { label: string; cls: string }> = {
  strong_yes: { label: "Strong yes", cls: "bg-primary-600 text-white" },
  yes: { label: "Yes", cls: "bg-primary-50 text-primary-800" },
  no: { label: "No", cls: "bg-warning-50 text-warning-700" },
  strong_no: { label: "Strong no", cls: "bg-danger-50 text-danger-700" },
};

/** Five-point rating as filled dots, with the number for screen readers. */
export function RatingDots({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} role="img" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={cn("size-2 rounded-full", n <= rating ? "bg-primary-600" : "bg-ink-200")} />
      ))}
    </span>
  );
}
