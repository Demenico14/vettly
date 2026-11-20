import * as React from "react";
import { useSession } from "@/components/layout/session-provider";
import { Skeleton } from "@/components/ui";

type Letter = { heading: string | null; body: string }[];

/** The offer letter on paper. The same paragraphs are used for the email and the PDF. */
export function LetterView({ letter, title }: { letter: Letter | null; title: string }) {
  const org = useSession().organisation;
  const name = org?.name ?? "";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return (
    <section aria-label={title} className="rounded-lg bg-ink-100 p-3 sm:p-5">
      <p className="mb-2 text-xs font-semibold text-fg-subtle">{title}</p>
      {!letter ? (
        <Skeleton className="h-96 rounded-sm" />
      ) : (
        <article className="rounded-xs bg-white px-6 py-8 text-[0.8125rem] leading-relaxed text-ink-900 shadow-md sm:px-8">
          <div className="mb-6 flex items-center justify-between border-b border-ink-200 pb-4">
            <span className="flex items-center gap-2 font-semibold">
              <span className="grid size-6 place-items-center rounded-xs bg-[#16624F] text-[0.625rem] font-bold text-white" aria-hidden>
                {initials}
              </span>
              {name}
            </span>
            <span className="text-xs text-fg-subtle">Private and confidential</span>
          </div>
          {letter.map((p, i) => (
            <div key={i} className="mb-3">
              {p.heading && <p className="mb-1 text-xs font-bold tracking-wider uppercase">{p.heading}</p>}
              <p className="whitespace-pre-line">{p.body}</p>
            </div>
          ))}
        </article>
      )}
    </section>
  );
}
