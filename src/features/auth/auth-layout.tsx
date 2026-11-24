import Link from "next/link";
import * as React from "react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { PhotoBand, PhotoPanel, type AuthPhoto } from "./photo-panel";

/**
 * Split layout for every sign-in and onboarding screen: the form on a light column on the left, the black brand
 * canvas from the public site on the right. `switchTo` adds a pill in the header to the other way in.
 */
export function AuthLayout({
  children,
  aside = "interview",
  wide = false,
  switchTo,
}: {
  children: React.ReactNode;
  aside?: AuthPhoto | "none";
  /** Wider form column for multi-step onboarding. */
  wide?: boolean;
  /** Offer the other way in: from sign-in to the trial, or back. */
  switchTo?: "login" | "register";
}) {
  return (
    <div className={cn("grid min-h-dvh bg-canvas", aside !== "none" && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)]")}>
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Vettly home" className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
            <Logo />
          </Link>
          {switchTo && (
            <p className="flex items-center gap-3 text-sm text-fg-muted">
              <span className="hidden sm:inline">{switchTo === "register" ? "New to Vettly?" : "Already have an account?"}</span>
              <Link
                href={`/${switchTo}`}
                className="pressable inline-flex h-10 items-center rounded-full bg-ink-900 px-4 text-sm font-semibold whitespace-nowrap text-white hover:bg-ink-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              >
                {switchTo === "register" ? "Start free trial" : "Sign in"}
              </Link>
            </p>
          )}
        </header>
        <main id="main" className="flex flex-1 flex-col justify-center py-8 lg:py-10">
          {aside !== "none" && <PhotoBand photo={aside} />}
          <div
            className={cn("mx-auto mt-6 w-full lg:mt-0 [&>*]:motion-safe:animate-[rise_700ms_var(--ease-out-expo)_both]", wide ? "max-w-3xl" : "max-w-[25rem]", STAGGER)}
          >
            {children}
          </div>
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-fg-subtle">
          <span>© 2026 Vettly</span>
          <nav aria-label="Site" className="flex gap-4">
            <Link href="/" className="hover:text-fg hover:underline">
              Home
            </Link>
            <Link href="/pricing" className="hover:text-fg hover:underline">
              Pricing
            </Link>
            <Link href="/#privacy" className="hover:text-fg hover:underline">
              Privacy
            </Link>
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
    <div className="mb-8">
      <h1 className="text-[2.25rem] leading-[1.05] font-medium tracking-[-0.04em] text-balance text-ink-900">{title}</h1>
      {description && <p className="mt-2.5 text-base text-fg-muted">{description}</p>}
    </div>
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
