import * as React from "react";
import { Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Download } from "@/components/icons";
import { logoUrl } from "@/services";
import { initialsOf, type Letterhead } from "@/lib/letterhead";

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

/** The letterhead's top: logo (or initials in the brand colour), name and contact lines. Shared with Settings → Branding. */
export function LetterheadTop({ head, localLogo }: { head: Letterhead; localLogo?: string | null }) {
  const logo = localLogo ?? (head.logoFileId ? logoUrl(head.organisationId, head.logoFileId) : null);
  return (
    <div className="mb-6 flex items-start justify-between gap-4 border-b-2 pb-4" style={{ borderColor: head.colour }}>
      <div className="flex min-w-0 items-center gap-3">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- organisation logo served by the API
          <img src={logo} alt={`${head.name} logo`} className="h-10 w-auto max-w-40 object-contain" />
        ) : (
          <span className="grid size-10 shrink-0 place-items-center rounded-xs text-xs font-bold text-white" style={{ background: head.colour }} aria-hidden>
            {initialsOf(head.name)}
          </span>
        )}
        <div className="min-w-0">
          {head.showName && <p className="truncate font-semibold text-ink-900">{head.name}</p>}
          {head.contact.map((l) => (
            <p key={l} className="text-[0.6875rem] leading-snug text-ink-500">
              {l}
            </p>
          ))}
        </div>
      </div>
      <span className="shrink-0 pt-0.5 text-[0.6875rem] text-ink-500">Private and confidential</span>
    </div>
  );
}

/** The letterhead's footer line. */
export function LetterheadFooter({ head }: { head: Letterhead }) {
  if (!head.footer) return null;
  return <p className="mt-8 border-t border-ink-200 pt-3 text-center text-[0.6875rem] leading-snug whitespace-pre-line text-ink-500">{head.footer}</p>;
}

/**
 * The offer letter on paper, on the organisation's letterhead. `html` is HR's own letter (cleaned and filled in
 * on the server); without it, the standard letter's paragraphs are shown. This is what the candidate receives,
 * in the email and as the attached PDF.
 */
export function LetterView({ letter, html, letterhead, title, pdfHref }: { letter: Letter | null; html?: string | null; letterhead?: Letterhead | null; title: string; pdfHref?: string }) {
  return (
    <section aria-label={title} className="rounded-lg bg-ink-100 p-3 sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-fg-subtle">{title}</p>
        {pdfHref && (
          <a href={pdfHref} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline">
            <Download className="size-3.5" aria-hidden />
            Download PDF
          </a>
        )}
      </div>
      {(!letter && !html) || !letterhead ? (
        <Skeleton className="h-96 rounded-sm" />
      ) : (
        <article className="rounded-xs bg-white px-6 py-8 text-[0.8125rem] leading-relaxed text-ink-900 shadow-md sm:px-8">
          <LetterheadTop head={letterhead} />
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
          <LetterheadFooter head={letterhead} />
        </article>
      )}
    </section>
  );
}
