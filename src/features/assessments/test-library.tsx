"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardList, Clock, DeviceMobile, Search, ShieldCheck } from "@/components/icons";
import { Card, EmptyState, Input, Skeleton, Tooltip } from "@/components/ui";
import { FilterSelect } from "@/components/ui/filter-select";
import { PageContainer } from "@/components/layout/page-header";
import { services } from "@/services";
import type { AssessmentFamily, NormGroup, Test } from "@/types/psychometrics";
import { AssessmentsHeader } from "./meta";

const LEVEL: Record<Test["level"], string> = {
  operational: "Operational",
  supervisory: "Supervisory",
  graduate: "Graduate",
  professional: "Professional",
  manager: "Manager",
  any: "All levels",
};

export const timeText = (t: Test) => (t.timeLimitMin ? `${t.timeLimitMin} min, timed` : `untimed, about ${t.medianCompletionMin} min`);
export const itemText = (t: Test) =>
  t.family === "work_sample" ? `${t.items} tasks` : t.family === "typing" ? "1 passage" : `${t.delivery === "adaptive" ? "up to " : ""}${t.items} ${t.itemFormat === "forced_choice_triad" ? "blocks" : "questions"}`;

export function TestLibrary() {
  const [data, setData] = React.useState<{ tests: Test[]; families: AssessmentFamily[]; normGroups: NormGroup[] } | null>(null);
  const [query, setQuery] = React.useState("");
  const [family, setFamily] = React.useState<string[]>([]);
  const [level, setLevel] = React.useState<string[]>([]);

  React.useEffect(() => {
    services.assessments.library().then(setData);
  }, []);

  const tests = (data?.tests ?? []).filter(
    (t) =>
      (!query || `${t.name} ${t.summary} ${t.scales.map((s) => s.name).join(" ")}`.toLowerCase().includes(query.toLowerCase())) &&
      (family.length === 0 || family.includes(t.family)) &&
      (level.length === 0 || level.includes(t.level)),
  );
  const normName = (code: string) => data?.normGroups.find((n) => n.code === code)?.name ?? code;

  return (
    <PageContainer header={<AssessmentsHeader />}>
      {!data ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : data.tests.length === 0 ? (
        <Card>
          <EmptyState icon={<ClipboardList />} title="No tests in the library yet" description="Tests your organisation is licensed for will appear here." />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="w-full lg:max-w-sm">
              <Input leading={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tests and what they measure" aria-label="Search tests" />
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterSelect label="Type" value={family} onChange={setFamily} options={data.families.map((f) => ({ value: f.code, label: f.label, count: data.tests.filter((t) => t.family === f.code).length }))} />
              <FilterSelect label="Level" value={level} onChange={setLevel} options={Object.entries(LEVEL).map(([value, label]) => ({ value, label, count: data.tests.filter((t) => t.level === value).length }))} />
            </div>
            <p className="text-xs text-fg-subtle lg:ml-auto">
              {tests.length} of {data.tests.length} tests
            </p>
          </div>

          {tests.length === 0 ? (
            <Card>
              <EmptyState icon={<Search />} title="No tests match" description="Try another word, or clear the filters." />
            </Card>
          ) : (
            data.families
              .filter((f) => tests.some((t) => t.family === f.code))
              .map((f) => (
                <section key={f.code} aria-labelledby={`fam-${f.code}`}>
                  <div className="mb-3">
                    <h2 id={`fam-${f.code}`} className="text-base font-semibold text-fg">
                      {f.label}
                    </h2>
                    <p className="text-sm text-fg-muted">{f.description}</p>
                  </div>
                  <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {tests
                      .filter((t) => t.family === f.code)
                      .map((t) => (
                        <li key={t.id}>
                          <Link href={`/assessments/library/${t.id}`} className="pressable flex h-full flex-col rounded-lg bg-surface p-5 shadow-platter transition-shadow hover:shadow-md">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="text-[0.9375rem] font-semibold text-fg">{t.name}</h3>
                              <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-2xs font-semibold text-ink-700">{LEVEL[t.level]}</span>
                            </div>
                            <p className="mt-1.5 line-clamp-3 text-sm text-fg-muted">{t.summary}</p>
                            <div className="mt-auto flex flex-col gap-1.5 pt-4 text-xs text-fg-subtle">
                              <span className="flex items-center gap-1.5">
                                <Clock className="size-3.5" aria-hidden />
                                {itemText(t)} · {timeText(t)}
                              </span>
                              <span>Compared with: {normName(t.defaultNorm)}</span>
                              <span className="flex items-center gap-3">
                                {t.mobileSupported ? (
                                  <span className="flex items-center gap-1">
                                    <DeviceMobile className="size-3.5" aria-hidden />
                                    Works on phones
                                  </span>
                                ) : (
                                  <span>Computer or tablet</span>
                                )}
                                {t.hpcsaClassified && (
                                  <Tooltip content="Classified as a psychological test in South Africa: results are released through a registered practitioner.">
                                    <span tabIndex={0} className="flex items-center gap-1 font-medium text-secondary-700">
                                      <ShieldCheck className="size-3.5" aria-hidden />
                                      Practitioner-released (ZA)
                                    </span>
                                  </Tooltip>
                                )}
                              </span>
                            </div>
                          </Link>
                        </li>
                      ))}
                  </ul>
                </section>
              ))
          )}
        </div>
      )}
    </PageContainer>
  );
}
