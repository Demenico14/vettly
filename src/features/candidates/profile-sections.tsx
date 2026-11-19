"use client";

import * as React from "react";
import { Briefcase, Certificate, ExternalLink, Folder, GraduationCap } from "@/components/icons";
import { Card, CardHeader } from "@/components/ui";
import type { CandidateProfile, SkillLevel } from "@/types";
import { cn } from "@/lib/utils";

const month = (ym: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(new Date(`${ym}-01T00:00:00`));

function duration(start: string, end: string | null) {
  const s = new Date(`${start}-01`);
  const e = end ? new Date(`${end}-01`) : new Date("2026-11-01");
  const months = (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth() + 1;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y && `${y} yr${y > 1 ? "s" : ""}`, m && `${m} mo`].filter(Boolean).join(" ");
}

export function SectionTitle({ icon, children, aside }: { icon: React.ReactNode; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold text-fg [&_svg]:size-4.5 [&_svg]:text-ink-500">
        {icon}
        {children}
      </h2>
      {aside}
    </div>
  );
}

export function ExperienceSection({ c }: { c: CandidateProfile }) {
  const total = c.experience.reduce((sum, e) => {
    const s = new Date(`${e.start}-01`);
    const end = e.end ? new Date(`${e.end}-01`) : new Date("2026-11-01");
    return sum + (end.getFullYear() - s.getFullYear()) * 12 + end.getMonth() - s.getMonth() + 1;
  }, 0);
  return (
    <section>
      <SectionTitle icon={<Briefcase />} aside={<span className="text-xs text-fg-subtle">{Math.round(total / 12)} years in total</span>}>
        Work experience
      </SectionTitle>
      <ol className="flex flex-col">
        {c.experience.map((e, i) => (
          <li key={e.id} className="relative grid grid-cols-[1rem_minmax(0,1fr)] gap-3 pb-6 last:pb-0">
            <span className="relative flex justify-center" aria-hidden>
              <span className={cn("mt-1.5 size-2.5 rounded-full", e.end ? "bg-ink-300" : "bg-primary-500 ring-4 ring-primary-100")} />
              {i < c.experience.length - 1 && <span className="absolute top-4 h-[calc(100%-0.5rem)] w-px bg-line" />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">{e.title}</p>
              <p className="text-sm text-fg-muted">
                {e.company} · {e.location}
              </p>
              <p className="mt-0.5 text-xs text-fg-subtle tabular">
                {month(e.start)} – {e.end ? month(e.end) : "Present"} · {duration(e.start, e.end)}
              </p>
              {e.bullets.length > 0 && (
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-sm leading-relaxed text-fg-muted marker:text-ink-300">
                  {e.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function EducationSection({ c }: { c: CandidateProfile }) {
  return (
    <section>
      <SectionTitle icon={<GraduationCap />}>Education</SectionTitle>
      <ul className="flex flex-col gap-3">
        {c.education.map((e) => (
          <li key={e.id} className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-fg">
                {e.qualification} {e.field}
              </p>
              <p className="text-sm text-fg-muted">{e.institution}</p>
              {e.grade && <p className="text-xs text-fg-subtle">{e.grade}</p>}
            </div>
            <span className="shrink-0 text-xs text-fg-subtle tabular">
              {e.start}–{e.end ?? "now"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const LEVELS: SkillLevel[] = ["Expert", "Advanced", "Intermediate", "Basic"];
const LEVEL_DOTS: Record<SkillLevel, number> = { Expert: 4, Advanced: 3, Intermediate: 2, Basic: 1 };

export function SkillsCard({ c }: { c: CandidateProfile }) {
  return (
    <Card>
      <CardHeader title="Skills" description="As stated on the CV. Vettly checks them against evidence when assessing." />
      <ul className="flex flex-col px-5 pb-4">
        {LEVELS.flatMap((lvl) => c.skills.filter((s) => s.level === lvl)).map((s) => (
          <li key={s.name} className="flex items-center justify-between gap-3 border-b border-line py-2 text-sm last:border-b-0">
            <span className="min-w-0 truncate text-fg">{s.name}</span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-fg-subtle">
                {s.level}
                {s.years ? ` · ${s.years} yr${s.years > 1 ? "s" : ""}` : ""}
              </span>
              <span className="flex gap-0.5" aria-hidden>
                {[1, 2, 3, 4].map((n) => (
                  <span key={n} className={cn("h-3 w-1 rounded-full", n <= LEVEL_DOTS[s.level] ? "bg-primary-500" : "bg-ink-200")} />
                ))}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function CertificationsSection({ c }: { c: CandidateProfile }) {
  return (
    <section>
      <SectionTitle icon={<Certificate />}>Certifications</SectionTitle>
      {c.certifications.length === 0 ? (
        <p className="text-sm text-fg-subtle">None listed on the CV.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {c.certifications.map((x) => (
            <li key={x.name} className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-fg">{x.name}</p>
                <p className="text-sm text-fg-muted">{x.issuer}</p>
                {x.credentialId && <p className="text-xs text-fg-subtle">Credential {x.credentialId}</p>}
              </div>
              <span className="shrink-0 text-xs text-fg-subtle tabular">{x.year}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ProjectsSection({ c }: { c: CandidateProfile }) {
  return (
    <section>
      <SectionTitle icon={<Folder />}>Projects</SectionTitle>
      {c.projects.length === 0 ? (
        <p className="text-sm text-fg-subtle">None listed on the CV.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {c.projects.map((p) => (
            <li key={p.name}>
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
                {p.name}
                <span className="text-xs font-normal text-fg-subtle tabular">{p.year}</span>
                {p.link && (
                  <a href={p.link} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline">
                    View
                    <ExternalLink className="size-3" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
              </p>
              <p className="text-sm text-fg-muted">{p.description}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
