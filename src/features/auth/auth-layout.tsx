import Link from "next/link";
import * as React from "react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { PhotoBand, PhotoPanel, type AuthPhoto } from "./photo-panel";

/** Split layout for every sign-in and onboarding screen: form on the left, photograph and evidence card on the right. */
export function AuthLayout({
  children,
  aside = "interview",
  wide = false,
}: {
  children: React.ReactNode;
  aside?: AuthPhoto | "none";
  /** Wider form column for multi-step onboarding. */
  wide?: boolean;
}) {
  return (
    <div className={cn("grid min-h-dvh bg-surface", aside !== "none" && "lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]")}>
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between">
          <Link href="/login" aria-label="Vettly sign in" className="rounded-sm">
            <Logo />
          </Link>
        </header>
        <main id="main" className="flex flex-1 flex-col justify-center py-8 lg:py-10">
          {aside !== "none" && <PhotoBand photo={aside} />}
          <div className={cn("mx-auto mt-6 w-full lg:mt-0 [&>*]:motion-safe:animate-[rise_700ms_var(--ease-out-expo)_both]", wide ? "max-w-3xl" : "max-w-[25rem]", STAGGER)}>
            {children}
          </div>
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
      {aside !== "none" && <PhotoPanel photo={aside} />}
    </div>
  );
}

/** Children of the form column enter in sequence, 60ms apart. */
const STAGGER =
  "[&>*:nth-child(2)]:[animation-delay:60ms] [&>*:nth-child(3)]:[animation-delay:120ms] [&>*:nth-child(4)]:[animation-delay:180ms] [&>*:nth-child(5)]:[animation-delay:240ms] [&>*:nth-child(6)]:[animation-delay:300ms] [&>*:nth-child(n+7)]:[animation-delay:360ms]";

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
