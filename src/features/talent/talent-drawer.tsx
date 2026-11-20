"use client";

import * as React from "react";
import Link from "next/link";
import { Briefcase, Folder, GraduationCap, Mail, MapPin, Phone, Send, Trash2 } from "@/components/icons";
import { Alert, Avatar, Badge, Button, ConfirmModal, Drawer, Skeleton, Tag, toast } from "@/components/ui";
import { services, consentValid } from "@/services";
import type { Collection, TalentHit, TalentRecord } from "@/types/talent";
import { AddToVacancyDialog, COUNTRY, ConsentBadge, TestChips, ordinal, shortDate } from "./meta";

/** Side panel with a talent record, or a pointer to the profile for an active candidate. */
export function TalentDrawer({ hit, onOpenChange, vacancyId, onChanged, onCollect }: { hit: TalentHit | null; onOpenChange: (o: boolean) => void; vacancyId?: string; onChanged: () => void; onCollect: (h: TalentHit) => void }) {
  const [data, setData] = React.useState<{ record: TalentRecord; collections: Collection[] } | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!hit || hit.kind !== "talent") return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear before loading another person
    setData(null);
    services.talent.record(hit.id).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [hit]);

  const r = data?.record;
  const lapsed = r ? !consentValid(r.consentUntil) : false;
  const requested = r?.tags.includes("Consent requested");

  return (
    <Drawer open={!!hit} onOpenChange={onOpenChange} title={hit?.name ?? "Talent"} className="w-[min(32rem,94vw)]">
      {hit && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            <Avatar name={hit.name} size="lg" />
            <div className="min-w-0">
              <p className="text-sm text-fg-muted">{hit.headline}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-fg-subtle">
                <MapPin className="size-3" />
                {hit.location}, {COUNTRY[hit.country]} · {hit.availability}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="outline" size="sm">
                  {hit.source}
                </Badge>
                <ConsentBadge until={hit.consentUntil} />
              </div>
            </div>
          </div>

          {hit.kind === "candidate" ? (
            <div className="flex flex-col gap-4 px-5 py-4">
              <p className="text-sm text-fg-muted">
                {hit.name} has an application in progress for <span className="font-semibold text-fg">{hit.application?.vacancyTitle}</span>, at the {hit.application?.stage} stage. Their full record is on their profile.
              </p>
              <Section title="Skills">
                <Skills hit={hit} />
              </Section>
              {hit.tests.length > 0 && (
                <Section title="Test results">
                  <TestChips hit={hit} />
                </Section>
              )}
              <div className="flex gap-2">
                <Button asChild>
                  <Link href={`/candidates/${hit.id}`}>Open profile</Link>
                </Button>
                <Button variant="secondary" onClick={() => onCollect(hit)}>
                  <Folder />
                  Add to collection
                </Button>
              </div>
            </div>
          ) : !r ? (
            <div className="flex flex-col gap-3 px-5 py-4">
              <Skeleton className="h-16 rounded-md" />
              <Skeleton className="h-32 rounded-md" />
            </div>
          ) : (
            <div className="flex flex-col gap-5 px-5 py-4">
              {lapsed && (
                <Alert tone="warning" title="Consent to keep their details has lapsed">
                  It ended {shortDate(r.consentUntil)}. Ask them to renew it, or delete their record. Until then you can&rsquo;t approach them about a role.
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={requested}
                      loading={busy}
                      onClick={async () => {
                        setBusy(true);
                        const rec = await services.talent.requestConsent(r.id);
                        setData((d) => d && { ...d, record: rec });
                        setBusy(false);
                        toast.success("Consent request sent", `${r.name} gets an email asking whether we may keep their details for another year.`);
                      }}
                    >
                      <Send />
                      {requested ? "Request sent" : "Ask to renew"}
                    </Button>
                    {requested && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          const rec = await services.talent.recordConsent(r.id);
                          setData((d) => d && { ...d, record: rec });
                          onChanged();
                          toast.success("Consent recorded", `Valid until ${shortDate(rec.consentUntil)}.`);
                        }}
                      >
                        They agreed
                      </Button>
                    )}
                  </div>
                </Alert>
              )}

              {r.history && (
                <Section title="History with us">
                  <p className="text-sm text-fg">{r.history}</p>
                </Section>
              )}

              <Section title="Skills">
                <Skills hit={hit} />
              </Section>

              {r.tests.length > 0 && (
                <Section title="Test results">
                  <ul className="flex flex-col gap-1.5">
                    {r.tests.map((t) => (
                      <li key={t.testId} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-fg">{t.label}</span>
                        <span className="text-fg-muted tabular">
                          <span className="font-semibold text-fg">{ordinal(t.percentile)}</span> percentile · {shortDate(t.takenAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-2xs text-fg-subtle">Results older than two years are a guide only. Retest before relying on them.</p>
                </Section>
              )}

              <Section title="Background">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-fg-subtle">Now</dt>
                  <dd className="text-fg">
                    {r.currentTitle}
                    {r.currentEmployer && `, ${r.currentEmployer}`}
                  </dd>
                  <dt className="text-fg-subtle">Education</dt>
                  <dd className="flex items-start gap-1 text-fg">
                    <GraduationCap className="mt-0.5 size-3.5 shrink-0 text-fg-subtle" />
                    {r.education}
                  </dd>
                  <dt className="text-fg-subtle">Notice</dt>
                  <dd className="text-fg">{r.availability}</dd>
                  <dt className="text-fg-subtle">Expects</dt>
                  <dd className="text-fg tabular">{r.expectedSalaryUsd ? `About US$${r.expectedSalaryUsd.toLocaleString("en-GB")} a month` : "Not known"}</dd>
                  <dt className="text-fg-subtle">Works</dt>
                  <dd className="text-fg">
                    {r.workPreference === "Any" ? "On-site, hybrid or remote" : r.workPreference}
                    {r.openToRelocation && " · open to relocating"}
                  </dd>
                  <dt className="text-fg-subtle">Languages</dt>
                  <dd className="text-fg">{r.languages.join(", ")}</dd>
                </dl>
              </Section>

              <Section title="Contact">
                {lapsed ? (
                  <p className="text-sm text-fg-subtle">Hidden until consent is renewed.</p>
                ) : (
                  <div className="flex flex-col gap-1 text-sm">
                    <a href={`mailto:${r.email}`} className="inline-flex items-center gap-2 text-primary-700 hover:underline">
                      <Mail className="size-4" />
                      {r.email}
                    </a>
                    <span className="inline-flex items-center gap-2 text-fg tabular">
                      <Phone className="size-4 text-fg-subtle" />
                      {r.phone}
                    </span>
                    <span className="text-xs text-fg-subtle">
                      Last contact {shortDate(r.lastContact)} · consent until {shortDate(r.consentUntil)}
                    </span>
                  </div>
                )}
              </Section>

              {data.collections.length > 0 && (
                <Section title="In collections">
                  <div className="flex flex-wrap gap-1.5">
                    {data.collections.map((c) => (
                      <Link key={c.id} href={`/talent/collections/${c.id}`} className="inline-flex h-6 items-center gap-1 rounded-sm bg-secondary-50 px-2 text-xs font-medium text-secondary-700 hover:underline">
                        <Folder className="size-3" />
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>
      )}

      {hit?.kind === "talent" && r && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
          <Button onClick={() => setAdding(true)} disabled={lapsed}>
            <Briefcase />
            Add to vacancy
          </Button>
          <Button variant="secondary" onClick={() => onCollect(hit)}>
            <Folder />
            Collect
          </Button>
          <Button variant="ghost" size="icon" className="ml-auto" aria-label="Delete record" onClick={() => setDeleting(true)}>
            <Trash2 />
          </Button>
        </div>
      )}

      {adding && <AddToVacancyDialog open={adding} onOpenChange={setAdding} person={r ? { id: r.id, name: r.name } : null} defaultVacancy={vacancyId} onAdded={() => (onOpenChange(false), onChanged())} />}
      <ConfirmModal
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${r?.name ?? "this record"}?`}
        description="Their details, test results and notes are removed from the talent pool and every collection. This can't be undone."
        confirmLabel="Delete record"
        tone="danger"
        onConfirm={async () => {
          await services.talent.deleteRecord(r!.id);
          toast.success("Record deleted", r!.name);
          onOpenChange(false);
          onChanged();
        }}
      />
    </Drawer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold text-fg-muted">{title}</h3>
      {children}
    </section>
  );
}

function Skills({ hit }: { hit: TalentHit }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {hit.skills.map((s) => (
        <Tag key={s.name} className={hit.matchedSkills.some((m) => s.name.toLowerCase().includes(m.toLowerCase())) ? "bg-primary-50 text-primary-800" : undefined}>
          {s.name}
          <span className="text-2xs opacity-70">
            {s.level}
            {s.years ? ` · ${s.years}y` : ""}
          </span>
        </Tag>
      ))}
    </div>
  );
}
