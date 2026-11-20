import { BadgeCheck, PenLine, Sparkles } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/menu";
import type { AssessmentProvenance } from "@/types";

const PROVENANCE: Record<AssessmentProvenance, { label: string; short: string; hint: string; cls: string; Icon: typeof Sparkles }> = {
  ai_illustrative: {
    label: "AI suggestion · illustrative",
    short: "AI · illustrative",
    hint: "Generated from mock data. Not reviewed by a person and not a hiring decision.",
    cls: "border-dashed border-accent-500/60 bg-accent-50 text-accent-700",
    Icon: Sparkles,
  },
  hr_confirmed: {
    label: "Confirmed by HR",
    short: "HR confirmed",
    hint: "A member of the HR team reviewed and confirmed this assessment.",
    cls: "border-success-500/40 bg-success-50 text-success-700",
    Icon: BadgeCheck,
  },
  hr_overridden: {
    label: "Adjusted by HR",
    short: "HR adjusted",
    hint: "A member of the HR team changed the AI suggestion. The original is kept in the audit log.",
    cls: "border-secondary-500/40 bg-secondary-50 text-secondary-700",
    Icon: PenLine,
  },
};

/**
 * States who produced an assessment. Uses icon, text and border style (dashed = unreviewed),
 * so provenance never relies on colour alone.
 */
export function ProvenanceTag({ provenance, compact }: { provenance: AssessmentProvenance; compact?: boolean }) {
  const p = PROVENANCE[provenance];
  return (
    <Tooltip content={p.hint}>
      <span
        tabIndex={0}
        className={cn(
          "inline-flex h-5 shrink-0 items-center gap-1 rounded-xs border px-1.5 text-2xs font-semibold whitespace-nowrap",
          p.cls,
        )}
      >
        <p.Icon className="size-3" aria-hidden />
        {compact ? p.short : p.label}
      </span>
    </Tooltip>
  );
}

function band(score: number) {
  if (score >= 80) return { label: "Strong", bar: "bg-success-500", text: "text-success-700" };
  if (score >= 60) return { label: "Partial", bar: "bg-secondary-500", text: "text-secondary-700" };
  if (score >= 40) return { label: "Weak", bar: "bg-warning-500", text: "text-warning-700" };
  return { label: "Low", bar: "bg-danger-500", text: "text-danger-700" };
}

/** Match score with a band label. AI-only scores render hollow to signal they are unreviewed. */
export function MatchScore({
  score,
  provenance,
  size = "md",
  showTag = false,
}: {
  score: number;
  provenance: AssessmentProvenance;
  size?: "sm" | "md";
  showTag?: boolean;
}) {
  const b = band(score);
  const unreviewed = provenance === "ai_illustrative";
  return (
    <div className="inline-flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-baseline gap-0.5 font-bold tabular",
            size === "sm" ? "text-sm" : "text-base",
            b.text,
          )}
          aria-label={`Match score ${score} out of 100, ${b.label.toLowerCase()}${unreviewed ? ", AI suggestion, illustrative" : ""}`}
        >
          {score}
          <span className="text-2xs font-semibold text-fg-subtle">%</span>
        </span>
        <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-ink-100" aria-hidden>
          <span
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              unreviewed
                ? "bg-[repeating-linear-gradient(-45deg,currentColor_0_3px,transparent_3px_5px)] text-accent-500"
                : b.bar,
            )}
            style={{ width: `${score}%` }}
          />
        </span>
        {size === "md" && (
          <span className="text-2xs font-semibold text-fg-subtle" aria-hidden>
            {b.label}
          </span>
        )}
      </div>
      {showTag && <ProvenanceTag provenance={provenance} compact />}
    </div>
  );
}

/** Page or panel-level notice that the figures shown are illustrative mock data. */
export function IllustrativeNotice({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xs border border-dashed border-ink-300 bg-surface px-2 py-1 text-xs font-semibold text-fg-subtle",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-warning-500" aria-hidden />
      {children ?? "Illustrative data · not real recruitment activity"}
    </p>
  );
}
