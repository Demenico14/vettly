"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Check, Eye, ShieldCheck } from "@/components/icons";
import { Alert, Button, Card, CardHeader, Skeleton, Table, TBody, TD, TH, THead, TR } from "@/components/ui";
import { PageContainer, PageTitle } from "@/components/layout/page-header";
import { IllustrativeNotice } from "@/components/domain/assessment";
import { services } from "@/services";
import type { Battery, NormGroup, SampleItem, Test } from "@/types/psychometrics";
import { cn } from "@/lib/utils";
import { FAMILY_SHORT, Stimulus } from "./meta";
import { itemText, timeText } from "./test-library";

type Data = { test: Test; norms: (NormGroup & { n: number; mean: number; sd: number })[]; items: SampleItem[]; usedIn: Battery[] };

const FORMAT: Record<Test["itemFormat"], string> = {
  mcq: "Multiple choice",
  true_false_cannot_say: "True / False / Cannot say",
  likert_5: "5-point rating scale",
  likert_7: "7-point rating scale",
  forced_choice_triad: "Forced choice: most and least like me, in threes",
  sjt_most_least: "Most and least effective response",
  sjt_rate_effectiveness: "Rate the effectiveness of each response",
  same_different: "Same or different",
  simulation_task: "Hands-on task",
  copy_typing: "Copy typing",
  mcq_and_writing: "Multiple choice plus a short writing task",
};
const DELIVERY: Record<Test["delivery"], string> = {
  fixed: "Same questions for everyone",
  randomised_parallel: "Equivalent forms, randomly assigned",
  adaptive: "Adaptive: questions adjust to each answer",
};
const REL: Record<string, string> = {
  alpha: "Internal consistency (α)",
  marginal_irt: "IRT marginal reliability",
  split_half: "Split-half",
  retest: "Test–retest",
  parallel_forms: "Parallel forms",
  inter_rater: "Agreement between markers",
};
const LANG: Record<string, string> = { en: "English", af: "Afrikaans", zu: "isiZulu", xh: "isiXhosa", st: "Sesotho", tn: "Setswana", sn: "Shona", nd: "Ndebele", ny: "Chichewa", bem: "Bemba" };

export function TestDetail({ id }: { id: string }) {
  const [data, setData] = React.useState<Data | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    services.assessments
      .test(id)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const back = (
    <Link href="/assessments/library" className="inline-flex items-center gap-1 text-sm font-medium text-fg-subtle hover:text-fg">
      <ArrowLeft className="size-4" />
      Test library
    </Link>
  );
  if (error)
    return (
      <PageContainer>
        {back}
        <Alert tone="danger" title="Test not available" className="mt-4">
          {error}
        </Alert>
      </PageContainer>
    );
  if (!data)
    return (
      <PageContainer>
        <Skeleton className="mt-6 h-80 rounded-lg" />
      </PageContainer>
    );

  const t = data.test;
  const domains = [...new Set(t.scales.map((s) => s.domain ?? ""))];
  return (
    <PageContainer
      header={
        <div>
          {back}
          <div className="mt-4">
            <p className="text-sm font-medium text-fg-subtle">
              {FAMILY_SHORT[t.family]} · version {t.version}
            </p>
            <PageTitle className="mt-1">{t.name}</PageTitle>
            <p className="mt-2 max-w-3xl text-md text-fg-muted">{t.summary}</p>
            <div className="mt-3">
              <IllustrativeNotice>Sample test and evidence · not a validated instrument</IllustrativeNotice>
            </div>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="p-5 sm:p-6">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
              {[
                ["Length", itemText(t)],
                ["Time", timeText(t)],
                ["Typical completion", `${t.medianCompletionMin} min`],
                ["Format", FORMAT[t.itemFormat]],
                ["Delivery", DELIVERY[t.delivery]],
                ["Practice questions", t.practiceItems ? `${t.practiceItems}, untimed` : "None"],
                ["Question bank", `${t.itemBankSize} items`],
                ["Calculator", t.calculatorAllowed ? "Allowed" : "Not needed"],
                ["Devices", t.mobileSupported ? "Phone, tablet or computer" : "Computer or tablet"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-fg-subtle">{k}</dt>
                  <dd className="mt-0.5 font-medium text-fg">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 rounded-md bg-ink-50 px-3 py-2.5 text-sm text-fg-muted">
              <span className="font-semibold text-fg">What candidates are told: </span>
              {t.candidateDescription}
            </p>
          </Card>

          <Card>
            <CardHeader title="What it measures" description={`${t.scales.length} ${t.scales.length === 1 ? "score" : "scales"}`} />
            <div className="flex flex-col gap-5 px-5 pb-5 sm:px-6">
              {domains.map((d) => (
                <section key={d || "all"}>
                  {d && <h3 className="mb-2 text-xs font-semibold text-fg-muted">{d}</h3>}
                  <ul className="flex flex-col divide-y divide-line">
                    {t.scales
                      .filter((s) => (s.domain ?? "") === d)
                      .map((s) => (
                        <li key={s.code} className="py-2.5 text-sm">
                          <p className="font-semibold text-fg">{s.name}</p>
                          {s.high && s.low ? (
                            <p className="mt-0.5 grid grid-cols-1 gap-1 text-fg-muted sm:grid-cols-2 sm:gap-4">
                              <span>
                                <span className="text-xs font-semibold text-fg-subtle">High: </span>
                                {s.high}
                              </span>
                              <span>
                                <span className="text-xs font-semibold text-fg-subtle">Low: </span>
                                {s.low}
                              </span>
                            </p>
                          ) : (
                            <p className="mt-0.5 text-fg-muted">{s.description}</p>
                          )}
                        </li>
                      ))}
                  </ul>
                </section>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Norm groups" description="Who a candidate is compared with. Choose the group closest to your applicants." />
            <div className="overflow-x-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Group</TH>
                    <TH>Region</TH>
                    <TH className="text-right">People</TH>
                    <TH>Collected</TH>
                    <TH>Review due</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.norms.map((n) => (
                    <TR key={n.code}>
                      <TD>
                        <span className="block font-medium text-fg">
                          {n.name}
                          {n.code === t.defaultNorm && <span className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-2xs font-semibold text-primary-700">Default</span>}
                        </span>
                        <span className="text-xs text-fg-subtle">{n.description}</span>
                      </TD>
                      <TD className="text-sm whitespace-nowrap text-fg-muted">{n.region}</TD>
                      <TD className="text-right text-sm text-fg tabular">{n.n.toLocaleString("en-ZA")}</TD>
                      <TD className="text-xs whitespace-nowrap text-fg-muted tabular">
                        {n.collectedFrom} to {n.collectedTo}
                      </TD>
                      <TD className="text-xs whitespace-nowrap text-fg-muted tabular">{n.reviewDue}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Evidence" description="South Africa's Employment Equity Act (s.8) requires tests to be valid, reliable, fair and unbiased." />
            <div className="grid grid-cols-1 gap-6 px-5 pb-6 sm:px-6 md:grid-cols-3">
              <section>
                <h3 className="text-sm font-semibold text-fg">Reliability</h3>
                <ul className="mt-2 flex flex-col gap-2 text-sm">
                  {t.reliability.map((r, i) => (
                    <li key={i}>
                      <span className="font-semibold text-fg tabular">{r.value.toFixed(2)}</span> <span className="text-fg-muted">{REL[r.type]}</span>
                      <span className="block text-xs text-fg-subtle">
                        n = {r.n.toLocaleString("en-ZA")}
                        {r.intervalDays ? `, ${r.intervalDays} days apart` : ""}
                        {r.scale ? `, ${t.scales.find((s) => s.code === r.scale)?.name}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="text-sm font-semibold text-fg">Validity</h3>
                <ul className="mt-2 flex flex-col gap-2 text-sm">
                  {t.validity.map((v, i) => (
                    <li key={i}>
                      <span className="font-semibold text-fg tabular">{(v.benchmarkRho ?? v.observedR)!.toFixed(2)}</span>{" "}
                      <span className="text-fg-muted">{v.source === "sackett_2022_benchmark" ? "benchmark (Sackett et al. 2022)" : "local study"}</span>
                      <span className="block text-xs text-fg-subtle">
                        {v.criterion}
                        {v.n ? `, n = ${v.n}` : ""}
                        {v.note ? `. ${v.note}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="text-sm font-semibold text-fg">Fairness</h3>
                {t.bias.length === 0 ? (
                  <p className="mt-2 text-sm text-fg-muted">Reports a proficiency level, not a comparison with others.</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2 text-sm">
                    {t.bias.map((b, i) => (
                      <li key={i}>
                        <span className="font-semibold text-fg tabular">d = {b.d.toFixed(2)}</span>
                        <span className={cn("ml-2 text-xs font-semibold", b.adverseImpactRatio < 0.8 ? "text-warning-700" : "text-success-700")}>
                          Selection ratio {b.adverseImpactRatio.toFixed(2)}
                        </span>
                        <span className="block text-xs text-fg-subtle">
                          {b.groupsCompared}. {b.difItemsFlagged ? `${b.difItemsFlagged} items flagged for bias and under review.` : "No items flagged."}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {t.bias.some((b) => b.adverseImpactRatio < 0.8) && (
                  <p className="mt-3 rounded-md bg-warning-50 px-3 py-2 text-xs text-warning-700">
                    Below the four-fifths guide at the default cut. Use it to inform interviews, combine it with other measures, and avoid a hard cut-off.
                  </p>
                )}
              </section>
            </div>
          </Card>

          {data.items.length > 0 && <SampleItems items={data.items} />}
        </div>

        <aside className="flex flex-col gap-5">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
              <ShieldCheck className="size-4 text-ink-500" aria-hidden />
              Use and compliance
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5 text-sm text-fg-muted">
              <li>
                {t.hpcsaClassified ? (
                  <>
                    <span className="font-semibold text-fg">Classified as a psychological test (ZA).</span> Reports are released to HR through a registered psychology practitioner. {t.hpcsaRef}.
                  </>
                ) : t.regulatoryClass === "skills_knowledge" ? (
                  "A skills or knowledge test, not a psychological test."
                ) : t.regulatoryClass === "psychological_hpcsa_classified" ? (
                  "Measures a psychological construct but isn't on the HPCSA classified list. Validity, reliability and fairness evidence still applies (EEA s.8)."
                ) : (
                  "Not a psychological test. Validity and fairness evidence still applies (EEA s.8: other similar assessments)."
                )}
              </li>
              <li>Items in {t.itemLanguages.map((l) => LANG[l]).join(", ")}. Instructions in {t.instructionLanguages.length} languages.</li>
              <li>{t.lowBandwidth ? "Works on slow connections; progress is saved after every answer." : "Needs a stable connection."}</li>
              <li>Retest after {t.retestLockoutMonths} {t.retestLockoutMonths === 1 ? "month" : "months"}, on an alternative form.</li>
              <li>Extra time can be added for candidates who need it.</li>
            </ul>
            <p className="mt-4 border-t border-line pt-3 text-xs text-fg-subtle">{t.sourceNote}</p>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-fg">In batteries</h2>
            {data.usedIn.length === 0 ? (
              <p className="mt-2 text-sm text-fg-muted">Not in any battery yet.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                {data.usedIn.map((b) => (
                  <li key={b.id}>
                    <Link href="/assessments/batteries" className="text-primary-700 hover:underline">
                      {b.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </PageContainer>
  );
}

function SampleItems({ items }: { items: SampleItem[] }) {
  const [shown, setShown] = React.useState<Set<string>>(new Set());
  return (
    <Card>
      <CardHeader title="Sample questions" description="Practice questions candidates see before the timed section, and example statements." />
      <ol className="flex flex-col divide-y divide-line border-t border-line">
        {items.map((it, n) => (
          <li key={it.id} className="px-5 py-4 sm:px-6">
            <p className="text-xs font-semibold text-fg-subtle">
              {it.practice ? "Practice question" : "Example statement"} {n + 1}
              {it.source === "ipip" && " · IPIP, public domain"}
            </p>
            {it.stimulus && <Stimulus text={it.stimulus} className="mt-2" />}
            <p className="mt-2 text-sm font-medium text-fg">{it.prompt}</p>
            {it.keyed && !it.options && <p className="mt-1 text-xs text-fg-subtle">Rated from very inaccurate to very accurate · {it.keyed === "+" ? "agreement scores higher" : "agreement scores lower"}</p>}
            {it.options && (
              <ul className="mt-2 flex flex-col gap-1">
                {it.options.map((o, i) => {
                  const correct = shown.has(it.id) && (it.answer === i || (it.effectiveness && it.effectiveness[i] === 4));
                  return (
                    <li key={o} className={cn("flex items-center gap-2 rounded-sm px-2 py-1 text-sm", correct ? "bg-primary-50 font-medium text-primary-800" : "text-fg-muted")}>
                      {correct ? <Check className="size-3.5" aria-hidden /> : <span className="size-3.5" aria-hidden />}
                      {o}
                      {shown.has(it.id) && it.effectiveness && <span className="ml-auto text-2xs text-fg-subtle tabular">effectiveness {it.effectiveness[i]}/4</span>}
                    </li>
                  );
                })}
              </ul>
            )}
            {(it.answer !== undefined || it.effectiveness || it.explanation) && (
              <div className="mt-2">
                {shown.has(it.id) ? (
                  it.explanation && <p className="text-xs text-fg-muted">{it.explanation}</p>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setShown((s) => new Set(s).add(it.id))}>
                    <Eye />
                    Show answer
                  </Button>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}
