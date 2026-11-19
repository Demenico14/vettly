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
 * The signature moment, set into the green panel: one requirement at a time is suggested by the AI
 * (copper, dashed) and then confirmed by HR (green, solid), before moving to the next.
 * Static under reduced motion.
 */
function ReviewStrip() {
  const reduced = useReducedMotion();
  const [step, setStep] = React.useState(0); // even = suggested, odd = confirmed
  React.useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % (ROWS.length * 2)), step % 2 === 0 ? 1700 : 2100);
    return () => clearTimeout(t);
  }, [step, reduced]);

  const index = reduced ? ROWS.length - 1 : Math.floor(step / 2);
  const confirmed = reduced || step % 2 === 1;
  const row = ROWS[index]!;
  const done = index + (confirmed ? 1 : 0);

  return (
    <div className="mt-7 border-t border-white/15 pt-5" aria-hidden>
      <div className="flex items-center justify-between gap-4">
        <div key={row.req} className="min-w-0 motion-safe:animate-[rise_500ms_var(--ease-out-expo)_both]">
          <p className="truncate text-sm font-semibold text-white">{row.req}</p>
          <p className="truncate text-xs text-shell-fg-muted">
            Tafadzwa Ncube · {row.note}
          </p>
        </div>
        <span className="relative grid h-6 w-[8.5rem] shrink-0 justify-items-end">
          <span
            className={cn(
              "col-start-1 row-start-1 inline-flex h-6 items-center gap-1.5 rounded-xs border border-dashed border-accent-300/70 bg-accent-500/15 px-2 text-xs font-semibold text-accent-300 transition-all duration-500 ease-(--ease-out-expo)",
              confirmed ? "-translate-y-1 opacity-0" : "opacity-100",
            )}
          >
            <Sparkles className="size-3.5" />
            AI suggestion
          </span>
          <span
            className={cn(
              "col-start-1 row-start-1 inline-flex h-6 items-center gap-1.5 rounded-xs border border-primary-300/50 bg-primary-300/15 px-2 text-xs font-semibold text-primary-200 transition-all duration-500 ease-(--ease-out-expo)",
              confirmed ? "opacity-100" : "translate-y-1 opacity-0",
            )}
          >
            <BadgeCheck className="size-3.5" />
            Confirmed by HR
          </span>
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex flex-1 gap-1.5">
          {ROWS.map((r, i) => (
            <span
              key={r.req}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-500",
                i < done ? "bg-primary-300" : i === index ? "bg-accent-300/80" : "bg-white/15",
              )}
            />
          ))}
        </div>
        <span className="text-2xs text-shell-fg-muted tabular">
          {done} of {ROWS.length} requirements confirmed
        </span>
      </div>
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
        className="absolute inset-0 bg-[linear-gradient(to_top,rgb(22_58_46/0.97)_0%,rgb(22_58_46/0.88)_38%,rgb(22_58_46/0.2)_66%,rgb(22_58_46/0)_82%)]"
        aria-hidden
      />
      <div className="absolute inset-0 flex flex-col justify-end gap-8 p-12 xl:p-14">
        <div className="max-w-md motion-safe:animate-[rise_900ms_var(--ease-out-expo)_200ms_both]">
          <p className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em] text-balance text-white">{p.headline}</p>
          <p className="mt-3 text-sm leading-relaxed text-shell-fg">{p.body}</p>
          <ReviewStrip />
        </div>
        <p className="text-2xs text-shell-fg-muted">
          Illustrative example · Photo: Christina Morillo / WOCinTech Chat, Unsplash
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
