import * as React from "react";
import { FileX, Lock } from "@/components/icons";
import type { CvExtraction, CvFile } from "@/types";
import { FAILURE_COPY } from "@/mocks/cv";
import { cn } from "@/lib/utils";

const month = (ym: string) =>
  ym ? new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(new Date(`${ym}-01T00:00:00`)) : "";

/**
 * Illustrative rendering of the uploaded file, built from what Vettly read originally (not HR's edits),
 * so the reviewer compares the form against the source. Real files are shown here after backend integration.
 */
export function CvPreview({ file, original }: { file: CvFile; original?: CvExtraction }) {
  if (!original) {
    const Icon = file.failure === "password_protected" ? Lock : FileX;
    return (
      <div className="grid min-h-80 place-items-center rounded-lg bg-ink-100 p-6 text-center">
        <div className="max-w-xs">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface text-ink-500 shadow-sm">
            <Icon className="size-6" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-semibold text-fg">No preview</p>
          <p className="mt-1 text-xs text-fg-muted">{file.failure ? FAILURE_COPY[file.failure].help : "This file can't be shown."}</p>
        </div>
      </div>
    );
  }
  const x = original;
  return (
    <div className="rounded-lg bg-ink-100 p-3 sm:p-5">
      <div
        className={cn(
          "mx-auto max-w-[34rem] rounded-xs bg-white px-7 py-9 font-serif text-[0.8125rem] leading-relaxed text-ink-900 shadow-md",
          x.ocr && "-rotate-[0.6deg] bg-[#fbfaf6] contrast-[0.92] saturate-50",
        )}
      >
        <p className="text-xl font-bold tracking-tight">{x.name.value}</p>
        <p className="text-ink-600">{x.headline.value}</p>
        <p className="mt-1 text-xs text-ink-600">{[x.location.value, x.email.value, x.phone.value].filter(Boolean).join(" · ")}</p>
        {x.summary && <p className="mt-4">{x.summary}</p>}
        {x.experience.length > 0 && <p className="mt-5 text-xs font-bold tracking-wider uppercase">Experience</p>}
        {x.experience.map((e) => (
          <div key={e.id} className="mt-2">
            <p className="font-bold">
              {e.title}, {e.company}
            </p>
            <p className="text-xs text-ink-600">
              {e.location} · {month(e.start)} – {e.end ? month(e.end) : "to date"}
            </p>
          </div>
        ))}
        {x.education.length > 0 && <p className="mt-5 text-xs font-bold tracking-wider uppercase">Education</p>}
        {x.education.map((e) => (
          <p key={e.id}>
            {e.qualification} {e.field}, {e.institution}
            {e.end ? ` (${e.end})` : ""}
          </p>
        ))}
        {x.skills.length > 0 && (
          <>
            <p className="mt-5 text-xs font-bold tracking-wider uppercase">Skills</p>
            <p>{x.skills.join(", ")}</p>
          </>
        )}
      </div>
      <p className="mt-3 text-center text-2xs text-fg-subtle">
        {file.name} · {x.pages} {x.pages === 1 ? "page" : "pages"}
        {x.ocr ? " · scanned, read with OCR" : ""} · illustrative preview
      </p>
    </div>
  );
}
