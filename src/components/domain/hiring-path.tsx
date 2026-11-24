import * as React from "react";
import Link from "next/link";
import type { ApplicationStage } from "@/types";
import { ArrowRight, CircleCheck } from "@/components/icons";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * The hiring path: the same seven steps everywhere, in the order hiring happens, so HR always knows where a
 * vacancy or a candidate stands and what to do next. One next action, never a menu of them.
 */

export const PATH_STEPS = [
  { key: "cvs", label: "CVs in" },
  { key: "screening", label: "Screening" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "tests", label: "Tests" },
  { key: "interview", label: "Interviews" },
  { key: "offer", label: "Offer" },
  { key: "hired", label: "Hired" },
] as const;
export type PathStepKey = (typeof PATH_STEPS)[number]["key"];

/** Where an application stage sits on the path. Rejected and withdrawn are off it. */
export function stepOf(stage: ApplicationStage): PathStepKey | null {
  switch (stage) {
    case "applied":
    case "screening":
      return "screening";
    case "shortlisted":
      return "shortlisted";
    case "assessment":
      return "tests";
    case "interview":
      return "interview";
    case "offer":
      return "offer";
    case "hired":
      return "hired";
    default:
      return null;
  }
}

export interface PathAction {
  label: string;
  href?: string;
  onClick?: () => void;
  /** One short line under the button, e.g. what happens automatically. */
  note?: string;
}

interface StepView {
  key: PathStepKey;
  /** Candidates at this step (vacancy view). */
  count?: number;
  href?: string;
  /** done: passed; skipped: moved past without going through it; current: where things stand or need attention; upcoming: not reached. */
  state: "done" | "skipped" | "current" | "upcoming";
}

export function HiringPath({
  title = "Hiring path",
  description,
  steps,
  next,
  footnote,
  className,
}: {
  title?: string;
  description?: React.ReactNode;
  steps: StepView[];
  next?: PathAction | null;
  footnote?: React.ReactNode;
  className?: string;
}) {
  const counted = steps.some((s) => s.count !== undefined);
  return (
    <section aria-label={title} className={cn("rounded-lg bg-surface shadow-platter", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-5 pt-4">
        <div className="min-w-0">
          <h2 className="text-md font-semibold text-fg">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
        </div>
        {next && (
          <div className="flex max-w-xs flex-col items-start gap-1 sm:items-end">
            {next.href ? (
              <Button asChild size="sm">
                <Link href={next.href}>
                  {next.label}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            ) : (
              <Button size="sm" onClick={next.onClick}>
                {next.label}
                <ArrowRight aria-hidden />
              </Button>
            )}
            {next.note && <p className="text-xs text-fg-muted sm:text-right">{next.note}</p>}
          </div>
        )}
      </div>

      <div className="overflow-x-auto px-5 pt-4 pb-4">
        <ol className="grid min-w-[36rem] grid-cols-7 gap-1.5">
          {steps.map((s) => {
            const meta = PATH_STEPS.find((p) => p.key === s.key)!;
            const empty = counted && !s.count;
            const body = (
              <>
                <span
                  aria-hidden
                  className={cn(
                    "block h-1 rounded-full",
                    s.state === "current" ? "bg-primary-600" : s.state === "done" ? "bg-success-500" : s.state === "skipped" ? "bg-line" : empty || !counted ? "bg-line-strong" : "bg-primary-200",
                  )}
                />
                <span className={cn("mt-2 flex items-center gap-1 text-xs font-semibold", s.state === "current" ? "text-primary-700" : empty || s.state === "skipped" ? "text-fg-subtle" : "text-fg-muted")}>
                  {s.state === "done" && <CircleCheck weight="fill" className="size-3.5 shrink-0 text-success-600" aria-hidden />}
                  {meta.label}
                </span>
                {counted ? (
                  <span className={cn("mt-0.5 block text-xl font-bold tabular-nums", empty ? "text-ink-300" : "text-fg")}>
                    {s.count ?? 0}
                    <span className="sr-only"> {s.count === 1 ? "candidate" : "candidates"}</span>
                  </span>
                ) : s.state === "current" ? (
                  <span className="mt-1 inline-flex rounded-full bg-primary-50 px-2 py-0.5 text-2xs font-semibold text-primary-700">Now</span>
                ) : (
                  s.state === "skipped" && <span className="mt-1 block text-2xs text-fg-subtle">Skipped</span>
                )}
                {s.state === "done" && <span className="sr-only"> (done)</span>}
              </>
            );
            return (
              <li key={s.key} aria-current={s.state === "current" ? "step" : undefined} className="min-w-0">
                {s.href ? (
                  <Link href={s.href} className="-m-1.5 block rounded-md p-1.5 transition-colors hover:bg-ink-50 focus-visible:outline-2 focus-visible:outline-primary-500">
                    {body}
                  </Link>
                ) : (
                  <div className="p-0">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
        {footnote && <p className="mt-3 text-xs text-fg-muted">{footnote}</p>}
      </div>
    </section>
  );
}
