"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "@/components/icons";

/** Vettly's working principles, one at a time, in the slot a testimonial slider would usually take. */
const PRINCIPLES = [
  {
    title: "Evidence over verdicts.",
    body: "Every requirement shows the line on the CV behind it, and flags what's missing so you can ask at screening instead of guessing.",
  },
  {
    title: "Tests inform. They never filter.",
    body: "Candidates consent before testing, adjustments such as extra time are honoured, and results are treated as the personal data they are.",
  },
  {
    title: "Every decision leaves a record.",
    body: "Stage changes, reasons and approvals are kept, so you can show exactly how a hire was made when someone asks.",
  },
];

export function Principles() {
  const [i, setI] = useState(0);
  const p = PRINCIPLES[i];
  const go = (d: number) => setI((n) => (n + d + PRINCIPLES.length) % PRINCIPLES.length);
  return (
    <section
      aria-roledescription="carousel"
      aria-label="How Vettly works with your team"
      className="flex h-full flex-col rounded-[1.75rem] bg-primary-600 p-7 text-white sm:p-10"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-white/75 tabular-nums">
          Principle {i + 1} of {PRINCIPLES.length}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous principle"
            className="pressable grid size-10 place-items-center rounded-full bg-white/15 hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ArrowLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next principle"
            className="pressable grid size-10 place-items-center rounded-full bg-white/15 hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <div key={i} aria-live="polite" className="principle-in mt-auto pt-16">
        <h3 className="max-w-[16ch] text-[clamp(2rem,4vw,3.5rem)] leading-[1.02] font-medium tracking-[-0.04em] text-balance">{p.title}</h3>
        <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-white/80">{p.body}</p>
      </div>
    </section>
  );
}
