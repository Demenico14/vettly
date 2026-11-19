import { Check } from "@/components/icons";
import { cn } from "@/lib/utils";

export interface Step {
  id: string;
  label: string;
  description?: string;
}

/** Progress through a multi-step flow. Vertical on wide screens, a compact counter on narrow ones. */
export function Stepper({
  steps,
  current,
  onSelect,
  className,
}: {
  steps: Step[];
  current: number;
  /** Lets the user jump back to completed steps. */
  onSelect?: (index: number) => void;
  className?: string;
}) {
  return (
    <nav aria-label="Setup progress" className={className}>
      <p className="text-xs font-semibold text-fg-subtle lg:hidden">
        Step {current + 1} of {steps.length} · <span className="text-fg">{steps[current]?.label}</span>
      </p>
      <ol className="hidden flex-col lg:flex">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const clickable = done && onSelect;
          const content = (
            <>
              <span
                className={cn(
                  "relative z-10 grid size-6 shrink-0 place-items-center rounded-full border text-2xs font-bold tabular",
                  done && "border-primary-600 bg-primary-600 text-white",
                  active && "border-primary-600 bg-surface text-primary-700 ring-3 ring-primary-500/15",
                  !done && !active && "border-line-strong bg-surface text-fg-subtle",
                )}
              >
                {done ? <Check className="size-3" weight="bold" /> : i + 1}
              </span>
              <span className="flex flex-col pt-0.5">
                <span className={cn("text-sm font-semibold", active ? "text-fg" : done ? "text-fg-muted" : "text-fg-subtle")}>
                  {s.label}
                </span>
                {s.description && <span className="text-xs text-fg-subtle">{s.description}</span>}
              </span>
            </>
          );
          return (
            <li key={s.id} className="relative pb-6 last:pb-0">
              {i < steps.length - 1 && (
                <span
                  className={cn("absolute top-6 left-3 h-[calc(100%-1.5rem)] w-px", done ? "bg-primary-600" : "bg-line")}
                  aria-hidden
                />
              )}
              {clickable ? (
                <button type="button" onClick={() => onSelect(i)} className="flex gap-3 rounded-sm text-left hover:opacity-80">
                  {content}
                </button>
              ) : (
                <div className="flex gap-3" aria-current={active ? "step" : undefined}>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
