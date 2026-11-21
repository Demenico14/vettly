import * as React from "react";
import { useSession } from "@/components/layout/session-provider";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

type Letter = { heading: string | null; body: string }[];

/** Typography for letter HTML, shared by the editor and the preview so they look the same. */
export const LETTER_TYPE = cn(
  "text-[0.9375rem] leading-relaxed text-ink-900",
  "[&_p]:my-2.5 [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-tight [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:font-semibold",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5 [&_li_p]:my-0",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-ink-300 [&_blockquote]:pl-4 [&_blockquote]:text-ink-700 [&_hr]:my-6 [&_hr]:border-ink-200",
  "[&_table]:my-3 [&_table]:w-full [&_td]:border [&_td]:border-ink-200 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-ink-200 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left",
  "[&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-ink-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
  "[&_.is-empty::before]:pointer-events-none [&_.is-empty::before]:float-left [&_.is-empty::before]:h-0 [&_.is-empty::before]:text-ink-400 [&_.is-empty::before]:content-[attr(data-placeholder)]",
);

/**
 * The offer letter on paper. `html` is HR's own letter (cleaned and filled in on the server); without it, the
 * standard letter's paragraphs are shown. Whichever is shown here is what the candidate is emailed.
 */
export function LetterView({ letter, html, title }: { letter: Letter | null; html?: string | null; title: string }) {
  const org = useSession().organisation;
  const name = org?.name ?? "";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return (
    <section aria-label={title} className="rounded-lg bg-ink-100 p-3 sm:p-5">
      <p className="mb-2 text-xs font-semibold text-fg-subtle">{title}</p>
      {!letter && !html ? (
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
          {html ? (
            // Cleaned on the server (src/server/letter-html.ts): text formatting only, no scripts, links or attributes.
            <div className={cn(LETTER_TYPE, "text-[0.8125rem]")} dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            letter!.map((p, i) => (
              <div key={i} className="mb-3">
                {p.heading && <p className="mb-1 text-xs font-bold tracking-wider uppercase">{p.heading}</p>}
                <p className="whitespace-pre-line">{p.body}</p>
              </div>
            ))
          )}
        </article>
      )}
    </section>
  );
}
