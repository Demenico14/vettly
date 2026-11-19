"use client";

import * as React from "react";
import Image from "next/image";
import { BadgeCheck, Sparkles } from "@/components/icons";
import { cn } from "@/lib/utils";

export const AUTH_PHOTOS = {
  interview: {
    src: "/images/auth/panel-interview.webp",
    alt: "Three colleagues in a meeting room reviewing a candidate together",
    headline: "Shortlists you can defend, requirement by requirement.",
    body: "Vettly reads every CV and test result against the vacancy. Copper marks what the AI suggested; it turns green when your team confirms it.",
    position: "object-[38%_center]",
  },
  team: {
    src: "/images/auth/hr-team-boardroom.webp",
    alt: "A recruitment team working around a boardroom table with laptops",
    headline: "One workspace for your whole hiring team.",
    body: "Vacancies, CVs, psychometric tests, interviews and offers in one place, with every decision on record.",
    position: "object-center",
  },
} as const;

export type AuthPhoto = keyof typeof AUTH_PHOTOS;

const ROWS = [
  { req: "IFRS group reporting", note: "CV p.2 · 2021–2025" },
  { req: "ICAZ membership", note: "Certificate uploaded" },
  { req: "Team leadership (4+)", note: "CV p.1 · led 6 accountants" },
  { req: "Numerical reasoning", note: "Test · 78th percentile" },
];

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * The signature moment: each AI suggestion is reviewed in turn and turns from copper to green,
 * then the card resets and plays again. Static (all confirmed) under reduced motion.
 */
function EvidenceTicker() {
  const reduced = useReducedMotion();
  // 0 = none confirmed yet … ROWS.length = all confirmed
  const [confirmed, setConfirmed] = React.useState(1);

  React.useEffect(() => {
    if (reduced) return;
    const delay = confirmed >= ROWS.length ? 3200 : 1500;
    const t = setTimeout(() => setConfirmed((c) => (c >= ROWS.length ? 0 : c + 1)), delay);
    return () => clearTimeout(t);
  }, [confirmed, reduced]);

  const shown = reduced ? ROWS.length : confirmed;
  const score = 74 + shown * 2;

  return (
    <div className="w-full max-w-[22rem] rounded-lg bg-surface/95 shadow-lg ring-1 ring-black/5 backdrop-blur-sm motion-safe:animate-[rise_900ms_var(--ease-out-expo)_400ms_both]">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-fg">Tafadzwa Ncube</p>
          <p className="text-xs text-fg-subtle">Finance Manager · Bulawayo</p>
        </div>
        <div className="text-right">
          <p className="text-lg leading-none font-bold text-fg tabular">
            {score}
            <span className="text-xs text-fg-subtle">%</span>
          </p>
          <p className="mt-1 text-2xs text-fg-subtle tabular">
            {shown} of {ROWS.length} confirmed
          </p>
        </div>
      </div>
      <ul>
        {ROWS.map((r, i) => {
          const ok = i < shown;
          return (
            <li key={r.req} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
              <div className="min-w-0">
                <p className="truncate text-sm text-fg">{r.req}</p>
                <p className="truncate text-2xs text-fg-subtle">{r.note}</p>
              </div>
              <span className="relative grid h-5 w-[7.75rem] shrink-0 justify-items-end">
                <span
                  className={cn(
                    "col-start-1 row-start-1 inline-flex h-5 items-center gap-1 rounded-xs border border-dashed border-accent-500/60 bg-accent-50 px-1.5 text-2xs font-semibold text-accent-700 transition-all duration-500 ease-(--ease-out-expo)",
                    ok ? "-translate-y-1 opacity-0" : "opacity-100",
                  )}
                >
                  <Sparkles className="size-3" />
                  AI suggestion
                </span>
                <span
                  className={cn(
                    "col-start-1 row-start-1 inline-flex h-5 items-center gap-1 rounded-xs border border-success-500/40 bg-success-50 px-1.5 text-2xs font-semibold text-success-700 transition-all duration-500 ease-(--ease-out-expo)",
                    ok ? "opacity-100" : "translate-y-1 opacity-0",
                  )}
                >
                  <BadgeCheck className="size-3" />
                  Confirmed by HR
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Full-height photograph with the brand statement and the live evidence card. Desktop only. */
export function PhotoPanel({ photo }: { photo: AuthPhoto }) {
  const p = AUTH_PHOTOS[photo];
  return (
    <aside className="relative hidden overflow-hidden bg-shell lg:sticky lg:top-0 lg:block lg:h-dvh lg:self-start">
      <Image
        src={p.src}
        alt={p.alt}
        fill
        priority
        sizes="(min-width: 1024px) 46vw, 0px"
        className={cn("object-cover motion-safe:animate-[settle_1600ms_var(--ease-out-expo)_both]", p.position)}
      />
      {/* Legibility scrim: bush green rising from the bottom, so the statement always reads on the photo. */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_top,rgb(22_58_46/0.96)_0%,rgb(22_58_46/0.82)_32%,rgb(22_58_46/0.15)_62%,rgb(22_58_46/0)_78%)]"
        aria-hidden
      />
      <div className="absolute inset-0 flex flex-col justify-end gap-8 p-12 xl:p-14">
        <EvidenceTicker />
        <div className="max-w-md motion-safe:animate-[rise_900ms_var(--ease-out-expo)_200ms_both]">
          <p className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-balance text-white">{p.headline}</p>
          <p className="mt-3 text-sm leading-relaxed text-shell-fg">{p.body}</p>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-shell-fg">
            {["Evidence for every requirement", "Psychometric tests built in", "Full decision audit trail"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <BadgeCheck className="size-3.5 text-primary-300" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-2xs text-shell-fg-muted">
          Illustrative candidate · Photo: Christina Morillo / WOCinTech Chat, Unsplash
        </p>
      </div>
    </aside>
  );
}

/** Compact photo band shown above the form on phones and tablets. */
export function PhotoBand({ photo }: { photo: AuthPhoto }) {
  const p = AUTH_PHOTOS[photo];
  return (
    <div className="relative -mx-5 mb-2 h-36 overflow-hidden sm:-mx-10 sm:h-44 lg:hidden">
      <Image src={p.src} alt="" fill priority sizes="100vw" className={cn("object-cover", p.position)} />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(22_58_46/0.85),rgb(22_58_46/0)_70%)]" aria-hidden />
      <p className="absolute right-5 bottom-3 left-5 text-sm font-semibold text-white sm:right-10 sm:left-10">{p.headline}</p>
    </div>
  );
}
