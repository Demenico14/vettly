"use client";

import { dotted } from "@/lib/utils";
import * as React from "react";
import { Drawer, Skeleton } from "@/components/ui";
import type { CandidateProfile, Evidence } from "@/types";

const yr = (ym: string | null) => (ym ? ym.slice(0, 4) : "present");

/** The CV with the quoted line marked, so HR can read the evidence in context. */
export function EvidenceViewer({
  profile,
  evidence,
  onClose,
}: {
  profile: CandidateProfile | null;
  evidence: Evidence | null;
  onClose: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!evidence) return;
    const t = setTimeout(() => ref.current?.querySelector("mark")?.scrollIntoView({ block: "center", behavior: "smooth" }), 250);
    return () => clearTimeout(t);
  }, [evidence]);

  const hit = (text: string, source: Evidence["source"]) => !!evidence && evidence.source === source && evidence.quote === text;
  const line = (text: string, source: Evidence["source"]) =>
    hit(text, source) ? <mark className="-mx-1 rounded-xs bg-accent-100 px-1 text-ink-900 ring-2 ring-accent-300">{text}</mark> : text;

  return (
    <Drawer open={!!evidence} onOpenChange={(o) => !o && onClose()} title="Evidence on the CV" className="w-[min(38rem,94vw)]">
      <div ref={ref} className="flex-1 overflow-y-auto bg-ink-100 p-4 sm:p-6">
        {evidence && (
          <p className="mb-4 text-xs text-fg-muted">
            From <span className="font-semibold text-fg">{evidence.source}</span> · {evidence.where}
          </p>
        )}
        {!profile ? (
          <Skeleton className="h-[32rem] rounded-sm" />
        ) : (
          <article className="rounded-xs bg-white px-7 py-9 font-serif text-[0.8125rem] leading-relaxed text-ink-900 shadow-md">
            <p className="text-xl font-bold tracking-tight">{profile.name}</p>
            <p className="text-ink-600">{profile.headline}</p>
            <p className="mt-1 text-xs text-ink-600">{[profile.location, profile.email, profile.phone].join(" · ")}</p>
            <p className="mt-4">
              {line(profile.summary, "Summary")}
            </p>

            <p className="mt-5 text-xs font-bold tracking-wider uppercase">Experience</p>
            {profile.experience.map((e) => (
              <div key={e.id} className="mt-2.5">
                <p className="font-bold">
                  {line(`${e.title}, ${e.company}`, "Experience")}
                </p>
                <p className="text-xs text-ink-600">
                  {dotted(e.location, `${yr(e.start)}–${yr(e.end)}`)}
                </p>
                <ul className="mt-1 list-disc pl-4">
                  {e.bullets.map((b) => (
                    <li key={b}>
                      {line(b, "Experience")}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <p className="mt-5 text-xs font-bold tracking-wider uppercase">Education</p>
            {profile.education.map((e) => (
              <p key={e.id}>
                {line(`${e.qualification} ${e.field}${e.grade ? `, ${e.grade}` : ""}`, "Education")}, {e.institution} ({e.end ?? "current"})
              </p>
            ))}

            {profile.certifications.length > 0 && (
              <>
                <p className="mt-5 text-xs font-bold tracking-wider uppercase">Certifications</p>
                {profile.certifications.map((x) => (
                  <p key={x.name}>
                    {line(x.name, "Certifications")}, {x.issuer} ({x.year})
                  </p>
                ))}
              </>
            )}

            <p className="mt-5 text-xs font-bold tracking-wider uppercase">Skills</p>
            <ul className="flex flex-wrap gap-x-3 gap-y-0.5">
              {profile.skills.map((s) => {
                const label = `${s.name} · ${s.level}${s.years ? `, ${s.years} yrs` : ""}`;
                return (
                  <li key={s.name}>
                    {line(label, "Skills")}
                  </li>
                );
              })}
            </ul>

            {profile.projects.length > 0 && (
              <>
                <p className="mt-5 text-xs font-bold tracking-wider uppercase">Projects</p>
                {profile.projects.map((p) => (
                  <p key={p.name}>
                    <span className="font-bold">{p.name}</span>: {line(p.description, "Projects")}
                  </p>
                ))}
              </>
            )}
          </article>
        )}
        <p className="mt-3 text-center text-2xs text-fg-subtle">The CV as Vettly recorded it on the candidate&apos;s profile</p>
      </div>
    </Drawer>
  );
}
