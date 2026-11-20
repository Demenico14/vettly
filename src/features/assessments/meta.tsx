"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, type BadgeProps } from "@/components/ui";
import type { InvitationRecord } from "@/types/psychometrics";
import { BAND_LABEL, type Band } from "@/lib/psychometrics";
import { cn } from "@/lib/utils";

type Tone = NonNullable<BadgeProps["tone"]>;

export const INVITATION_STATUS: Record<InvitationRecord["status"], { label: string; tone: Tone }> = {
  not_sent: { label: "Not sent", tone: "neutral" },
  sent: { label: "Sent", tone: "secondary" },
  opened: { label: "Opened", tone: "secondary" },
  in_progress: { label: "In progress", tone: "warning" },
  completed: { label: "Completed", tone: "success" },
  expired: { label: "Expired", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  abandoned: { label: "Abandoned", tone: "danger" },
};

export function InvitationBadge({ status, size = "sm" }: { status: InvitationRecord["status"]; size?: BadgeProps["size"] }) {
  const m = INVITATION_STATUS[status];
  return (
    <Badge tone={m.tone} size={size} dot>
      {m.label}
    </Badge>
  );
}

export const FAMILY_SHORT: Record<string, string> = {
  ability: "Ability",
  personality: "Personality",
  sjt: "Situational judgement",
  integrity: "Integrity",
  emotional_intelligence: "Emotional intelligence",
  motivation: "Motivation",
  job_knowledge: "Job knowledge",
  work_sample: "Work sample",
  typing: "Typing",
  language: "Language",
};

export const dayTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
export const day = (iso: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));

export function deadlineText(hoursLeft: number, status: InvitationRecord["status"]) {
  if (status === "completed" || status === "cancelled") return null;
  if (hoursLeft < 0) return { text: "Deadline passed", urgent: true };
  if (hoursLeft < 24) return { text: `${hoursLeft} h left`, urgent: true };
  const d = Math.round(hoursLeft / 24);
  return { text: `${d} ${d === 1 ? "day" : "days"} left`, urgent: d <= 1 };
}

const BAND_STYLE: Record<Band, string> = {
  A: "bg-primary-700",
  B: "bg-primary-500",
  C: "bg-secondary-500",
  D: "bg-warning-500",
  E: "bg-danger-500",
};

/** Percentile on a 1–99 track, with the five band zones drawn faintly underneath. */
export function PercentileBar({ percentile, band, className }: { percentile: number; band: Band; className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-2 overflow-hidden rounded-full bg-ink-100" role="img" aria-label={`${percentile}th percentile, ${BAND_LABEL[band].toLowerCase()}`}>
        {[10, 30, 70, 90].map((x) => (
          <span key={x} className="absolute inset-y-0 w-px bg-surface" style={{ left: `${x}%` }} aria-hidden />
        ))}
        <span className={cn("absolute inset-y-0 left-0 rounded-full", BAND_STYLE[band])} style={{ width: `${percentile}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[0.625rem] text-fg-subtle" aria-hidden>
        <span>1</span>
        <span>50</span>
        <span>99</span>
      </div>
    </div>
  );
}

/** Ten-point sten scale with the score marked. Both ends are neutral: neither is "good". */
export function StenScale({ sten, label }: { sten: number; label: string }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${label}: sten ${sten} of 10`}>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "grid h-5 flex-1 place-items-center rounded-xs text-[0.625rem] font-semibold tabular",
            i + 1 === sten ? "bg-primary-600 text-white" : i >= 3 && i <= 6 ? "bg-ink-100 text-transparent" : "bg-ink-50 text-transparent",
          )}
        >
          {i + 1 === sten ? sten : ""}
        </span>
      ))}
    </div>
  );
}

const NAV = [
  { href: "/assessments", label: "Invitations" },
  { href: "/assessments/library", label: "Test library" },
  { href: "/assessments/batteries", label: "Batteries" },
];

export function AssessmentsNav() {
  const path = usePathname();
  return (
    <nav aria-label="Assessments" className="-mx-4 mt-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-5">
        {NAV.map((n) => {
          const active = n.href === "/assessments" ? path === "/assessments" : path.startsWith(n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-10 items-center border-b-2 text-sm font-medium whitespace-nowrap transition-colors",
                  active ? "border-primary-600 text-fg" : "border-transparent text-fg-muted hover:text-fg",
                )}
              >
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Page header shared by the three assessments tabs. */
export function AssessmentsHeader({ actions }: { actions?: React.ReactNode }) {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] leading-[1.1] font-bold tracking-[-0.02em] text-fg sm:text-[2.125rem]">Assessments</h1>
          <p className="mt-1.5 max-w-2xl text-[0.9375rem] text-fg-muted">
            Psychometric tests sent to candidates, and their results. Results help you decide; they never reject anyone on their own.
          </p>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <AssessmentsNav />
    </div>
  );
}

/** Renders an item stimulus. Lines with "|" become a table (first line is the caption); anything else is text. */
export function Stimulus({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n");
  const rows = lines.filter((l) => l.includes("|")).map((l) => l.split("|").map((c) => c.trim()));
  if (rows.length < 2) return <p className={cn("rounded-md bg-ink-50 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-fg", className)}>{text}</p>;
  const caption = lines.find((l) => !l.includes("|"));
  const [head, ...body] = rows;
  return (
    <div className={cn("overflow-x-auto rounded-md bg-ink-50 px-4 py-3", className)}>
      <table className="w-full text-sm">
        {caption && <caption className="mb-2 text-left text-xs font-semibold text-fg-subtle">{caption}</caption>}
        <thead>
          <tr>
            {head!.map((h) => (
              <th key={h} scope="col" className="border-b border-line-strong py-1.5 pr-4 text-left font-semibold text-fg last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r) => (
            <tr key={r.join()}>
              {r.map((c, i) =>
                i === 0 ? (
                  <th key={i} scope="row" className="border-b border-line py-1.5 pr-4 text-left font-medium text-fg">
                    {c}
                  </th>
                ) : (
                  <td key={i} className="border-b border-line py-1.5 pr-4 text-fg tabular last:pr-0">
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
