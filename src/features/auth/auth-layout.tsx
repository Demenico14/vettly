import Link from "next/link";
import * as React from "react";
import { BadgeCheck, Sparkles } from "@/components/icons";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/** Split layout for every sign-in and onboarding screen: form on the left, brand panel on the right. */
export function AuthLayout({
  children,
  aside = "evidence",
  wide = false,
}: {
  children: React.ReactNode;
  aside?: "evidence" | "none";
  /** Wider form column for multi-step onboarding. */
  wide?: boolean;
}) {
  return (
    <div className={cn("grid min-h-dvh bg-surface", aside !== "none" && "lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]")}>
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between">
          <Link href="/login" aria-label="Vettly sign in" className="rounded-sm">
            <Logo />
          </Link>
        </header>
        <main id="main" className="flex flex-1 items-center py-10">
          <div className={cn("mx-auto w-full", wide ? "max-w-3xl" : "max-w-[25rem]")}>{children}</div>
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-fg-subtle">
          <span>© 2026 Vettly</span>
          <nav aria-label="Legal" className="flex gap-4">
            <a href="#privacy" className="hover:text-fg hover:underline">
              Privacy
            </a>
            <a href="#terms" className="hover:text-fg hover:underline">
              Terms
            </a>
            <a href="mailto:support@vettly.example" className="hover:text-fg hover:underline">
              Support
            </a>
          </nav>
        </footer>
      </div>
      {aside === "evidence" && <EvidencePanel />}
    </div>
  );
}

const ROWS = [
  { req: "IFRS group reporting", state: "confirmed" as const, note: "CV p.2 · 2021–2025" },
  { req: "ICAZ membership", state: "confirmed" as const, note: "Certificate uploaded" },
  { req: "Team leadership (4+)", state: "ai" as const, note: "CV p.1 · led 6 accountants" },
  { req: "Numerical reasoning", state: "ai" as const, note: "Test · 78th percentile" },
];

/** Brand panel: shows the product's idea (copper AI suggestions, green HR confirmations) with real UI, not decoration. */
function EvidencePanel() {
  return (
    <aside aria-hidden className="relative hidden overflow-hidden bg-shell lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:self-start lg:p-14">
      <div className="max-w-md">
        <p className="text-2xl leading-snug font-bold tracking-[-0.015em] text-white">
          Shortlists you can defend, requirement by requirement.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-shell-fg-muted">
          Vettly reads every CV and test result against the vacancy. Copper marks what the AI suggested; it turns
          green when your team confirms it.
        </p>
      </div>

      <div className="my-10 w-full max-w-md rounded-lg bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-fg">Tafadzwa Ncube</p>
            <p className="text-xs text-fg-subtle">Finance Manager · Bulawayo</p>
          </div>
          <span className="text-lg font-bold text-success-700 tabular">
            82<span className="text-xs text-fg-subtle">%</span>
          </span>
        </div>
        <ul>
          {ROWS.map((r) => (
            <li key={r.req} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
              <div className="min-w-0">
                <p className="truncate text-sm text-fg">{r.req}</p>
                <p className="truncate text-2xs text-fg-subtle">{r.note}</p>
              </div>
              {r.state === "confirmed" ? (
                <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-xs border border-success-500/40 bg-success-50 px-1.5 text-2xs font-semibold text-success-700">
                  <BadgeCheck className="size-3" />
                  Confirmed by HR
                </span>
              ) : (
                <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-xs border border-dashed border-accent-500/60 bg-accent-50 px-1.5 text-2xs font-semibold text-accent-700">
                  <Sparkles className="size-3" />
                  AI suggestion
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-2xs text-shell-fg-muted">Illustrative example · fictional candidate</p>
    </aside>
  );
}

export function AuthHeading({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="text-2xl font-bold tracking-[-0.015em] text-fg">{title}</h1>
      {description && <p className="mt-1.5 text-sm text-fg-muted">{description}</p>}
    </div>
  );
}

/** Discloses the prototype's test rules so reviewers can reach every state. Removed at backend integration. */
export function PrototypeHint({ children }: { children: React.ReactNode }) {
  return (
    <details className="group mt-8 rounded-md border border-dashed border-line-strong bg-surface-muted text-xs text-fg-muted">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-semibold text-fg-subtle select-none">
        Prototype: how to try each state
        <span className="text-fg-subtle transition-transform group-open:rotate-90" aria-hidden>
          ›
        </span>
      </summary>
      <div className="flex flex-col gap-1 border-t border-dashed border-line-strong px-3 py-2.5 [&_code]:rounded-xs [&_code]:bg-ink-100 [&_code]:px-1 [&_code]:font-mono [&_code]:text-2xs [&_code]:text-fg">
        {children}
      </div>
    </details>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-fg-subtle">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
