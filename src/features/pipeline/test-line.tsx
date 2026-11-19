import * as React from "react";
import type { TestInvitationSummary } from "@/types";
import { cn } from "@/lib/utils";

const day = (iso: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));

/** "2 of 3 tests complete", with progress segments, or the reason the tests stalled. */
export function TestLine({ tests, className }: { tests: TestInvitationSummary; className?: string }) {
  const stalled = tests.status === "expired" || tests.status === "cancelled";
  const done = tests.status === "completed";
  const text = done
    ? `${tests.total} of ${tests.total} tests complete`
    : stalled
      ? tests.status === "expired"
        ? `Expired ${day(tests.deadline)} · ${tests.completed} of ${tests.total} done`
        : "Tests cancelled"
      : tests.completed > 0
        ? `${tests.completed} of ${tests.total} tests complete · due ${day(tests.deadline)}`
        : `${tests.status === "opened" ? "Opened, not started" : "Sent, not opened"} · due ${day(tests.deadline)}`;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: tests.total }, (_, i) => (
          <span
            key={i}
            className={cn("h-1.5 w-3 rounded-full", i < tests.completed ? (done ? "bg-success-500" : "bg-primary-500") : stalled ? "bg-danger-100" : "bg-ink-200")}
          />
        ))}
      </span>
      <span className={cn("text-xs", stalled ? "font-medium text-danger-700" : done ? "font-medium text-success-700" : "text-fg-muted")}>{text}</span>
    </div>
  );
}
