"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  CalendarPlus,
  ClipboardList,
  Copy,
  ExternalLink,
  Folder,
  Github,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  X,
} from "@/components/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  CardHeader,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tag,
  toast,
  Tooltip,
} from "@/components/ui";
import { StageBadge } from "@/components/domain/status-badge";
import { MatchScore } from "@/components/domain/assessment";
import { PageContainer, PageTitle } from "@/components/layout/page-header";
import { services } from "@/services";
import type { CandidateProfile } from "@/types";
import { displayUrl, externalUrl } from "@/lib/links";
import { CertificationsSection, EducationSection, ExperienceSection, ProjectsSection, SkillsCard } from "./profile-sections";
import { AddToCollectionDialog } from "@/features/talent/meta";
import { SendTestsDialog } from "@/features/assessments/send-tests-dialog";
import { ScheduleDialog } from "@/features/interviews/schedule-dialog";
import { ApplicationsTab, AssessmentsTab, DocumentsTab, MoveStageDialog, NotesTab } from "./profile-tabs";

export function CandidateProfileView({ id }: { id: string }) {
  const [c, setC] = React.useState<CandidateProfile | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [moving, setMoving] = React.useState(false);
  const [tagDraft, setTagDraft] = React.useState("");
  const [addingTag, setAddingTag] = React.useState(false);
  const [sendingTests, setSendingTests] = React.useState(false);
  const [collecting, setCollecting] = React.useState(false);
  const [scheduling, setScheduling] = React.useState(false);
  const [offerId, setOfferId] = React.useState<string | null>(null);

  React.useEffect(() => {
    services.offers.list().then((all) => setOfferId(all.find((v) => v.offer.candidateId === id && !["withdrawn", "declined", "expired"].includes(v.offer.status))?.offer.id ?? null));
  }, [id, reload]);

  React.useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset before refetching
    setError(null);
    services.profiles
      .get(id)
      .then((r) => alive && setC(r))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id, reload]);

  if (error) {
    return (
      <PageContainer>
        <BackLink />
        <Alert
          tone="danger"
          title="Candidate not available"
          className="mt-4"
          action={
            <Button size="sm" variant="secondary" onClick={() => setReload((r) => r + 1)}>
              <RefreshCw />
              Try again
            </Button>
          }
        >
          {error}
        </Alert>
      </PageContainer>
    );
  }
  if (!c) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-4 pt-6" aria-busy="true">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Skeleton className="h-96 rounded-lg" />
            <Skeleton className="h-96 rounded-lg" />
          </div>
        </div>
      </PageContainer>
    );
  }

  const app = c.applications[0]!;
  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).catch(() => undefined);
    toast.success(`${label} copied`, text);
  };
  const addTag = async () => {
    const t = tagDraft.trim();
    if (!t || c.tags.includes(t)) return setAddingTag(false);
    setC(await services.profiles.setTags(c.id, [...c.tags, t]));
    setTagDraft("");
    setAddingTag(false);
  };

  return (
    <PageContainer
      header={
        <div>
          <BackLink />
          <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar name={c.name} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <PageTitle>{c.name}</PageTitle>
                  {c.inTalentPool && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">
                      <Bookmark className="size-3" weight="fill" />
                      Talent pool
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-md text-fg-muted">
                  {c.headline}
                  {c.currentEmployer ? ` at ${c.currentEmployer}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4 text-ink-500" />
                    {c.location}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    {app.vacancyTitle}
                    <StageBadge stage={app.stage} size="sm" />
                  </span>
                  <Link href={`/matching/${app.vacancyId}/${c.id}`} className="rounded-sm hover:opacity-80" aria-label="Open the assessment for this application">
                    <MatchScore score={app.matchScore} provenance={app.provenance} size="sm" showTag />
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={async () => {
                  setC(await services.profiles.setTalentPool(c.id, !c.inTalentPool));
                  toast.success(c.inTalentPool ? "Removed from talent pool" : "Added to talent pool", c.name);
                }}
              >
                <Bookmark weight={c.inTalentPool ? "fill" : "regular"} />
                {c.inTalentPool ? "In talent pool" : "Save to pool"}
              </Button>
              <Button variant="secondary" onClick={() => setScheduling(true)}>
                <CalendarPlus />
                Interview
              </Button>
              {(app.stage === "interview" || app.stage === "offer") && (
                <Button variant="secondary" asChild>
                  <Link href={offerId ? `/offers/${offerId}` : `/offers/new?candidate=${c.id}&vacancy=${app.vacancyId}`}>{offerId ? "View offer" : "Make offer"}</Link>
                </Button>
              )}
              {app.stage !== "hired" && app.stage !== "withdrawn" && <Button onClick={() => setMoving(true)}>Move stage</Button>}
            </div>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="applications" count={c.applications.length}>
                Applications
              </TabsTrigger>
              <TabsTrigger value="tests">Psychometric tests</TabsTrigger>
              <TabsTrigger value="documents" count={c.documents.length}>
                Documents
              </TabsTrigger>
              <TabsTrigger value="notes" count={c.notes.length}>
                Notes
              </TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
              <Card className="flex flex-col gap-8 px-6 py-6 sm:px-8">
                <section>
                  <h2 className="mb-2 text-base font-semibold text-fg">Summary</h2>
                  <p className="max-w-[68ch] text-md leading-relaxed text-fg-muted">{c.summary.trim() || "No summary on the CV."}</p>
                </section>
                <ExperienceSection c={c} />
                <EducationSection c={c} />
                <CertificationsSection c={c} />
                <ProjectsSection c={c} />
              </Card>
            </TabsContent>
            <TabsContent value="applications">
              <ApplicationsTab c={c} onChange={setC} />
            </TabsContent>
            <TabsContent value="tests">
              <AssessmentsTab c={c} onSend={() => setSendingTests(true)} />
            </TabsContent>
            <TabsContent value="documents">
              <DocumentsTab c={c} onChange={setC} />
            </TabsContent>
            <TabsContent value="notes">
              <NotesTab c={c} onChange={setC} />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:flex xl:flex-col xl:pt-[3.75rem]">
          <Card>
            <CardHeader title="Contact" />
            <ul className="flex flex-col px-5 pb-4 text-sm">
              <li className="flex items-center gap-2.5 border-b border-line py-2">
                <Mail className="size-4 shrink-0 text-ink-500" aria-hidden />
                <a href={`mailto:${c.email}`} className="min-w-0 flex-1 truncate text-fg hover:underline">
                  {c.email}
                </a>
                <Tooltip content="Copy email">
                  <Button size="icon-sm" variant="ghost" aria-label="Copy email" onClick={() => copy(c.email, "Email")}>
                    <Copy />
                  </Button>
                </Tooltip>
              </li>
              <li className="flex items-center gap-2.5 border-b border-line py-2">
                <Phone className="size-4 shrink-0 text-ink-500" aria-hidden />
                <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="min-w-0 flex-1 truncate text-fg tabular hover:underline">
                  {c.phone}
                </a>
                <Tooltip content="Copy phone">
                  <Button size="icon-sm" variant="ghost" aria-label="Copy phone" onClick={() => copy(c.phone, "Phone number")}>
                    <Copy />
                  </Button>
                </Tooltip>
              </li>
              {(
                [
                  ["LinkedIn", Linkedin, c.linkedin, "No LinkedIn profile"],
                  ["GitHub", Github, c.github, null],
                  ["Website", Globe, c.website, null],
                ] as const
              ).map(([label, Icon, raw, empty]) => {
                // CVs write links without "https://"; made absolute so they open the right site, not a Vettly page.
                const url = externalUrl(raw);
                if (!url && !empty) return null;
                return (
                  <li key={label} className="flex items-center gap-2.5 border-b border-line py-2 last:border-b-0">
                    <Icon className="size-4 shrink-0 text-ink-500" aria-hidden />
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer noopener" className="inline-flex min-w-0 items-center gap-1 truncate font-medium text-primary-700 hover:underline" title={url}>
                        <span className="truncate">{label === "Website" ? displayUrl(url) : `${label} profile`}</span>
                        <ExternalLink className="size-3.5 shrink-0" />
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    ) : (
                      <span className="text-fg-subtle">{empty}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Details" />
            <dl className="px-5 pb-4 text-sm">
              {[
                ["Availability", c.availability],
                ["Current employer", c.currentEmployer ?? "Not employed"],
                ["Expected salary", c.expectedSalary ?? "Not stated"],
                ["Source", app.source],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 border-b border-line py-2 last:border-b-0">
                  <dt className="text-fg-subtle">{k}</dt>
                  <dd className="text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <SkillsCard c={c} />

          <Card>
            <CardHeader title="Tags" description="Visible only to your team" />
            <div className="flex flex-wrap items-center gap-1.5 px-5 pb-5">
              {c.tags.map((t) => (
                <Tag key={t} onRemove={async () => setC(await services.profiles.setTags(c.id, c.tags.filter((x) => x !== t)))}>
                  {t}
                </Tag>
              ))}
              {addingTag ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addTag();
                  }}
                  className="flex items-center gap-1"
                >
                  <input
                    autoFocus
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onBlur={addTag}
                    onKeyDown={(e) => e.key === "Escape" && setAddingTag(false)}
                    aria-label="New tag"
                    maxLength={30}
                    className="h-6 w-32 rounded-sm border border-primary-500 px-2 text-xs outline-none"
                  />
                  <button type="button" aria-label="Cancel" onClick={() => setAddingTag(false)} className="grid size-6 place-items-center rounded-sm hover:bg-ink-100">
                    <X className="size-3" />
                  </button>
                </form>
              ) : (
                <button type="button" onClick={() => setAddingTag(true)} className="inline-flex h-6 items-center gap-1 rounded-sm px-2 text-xs font-medium text-fg-muted hover:bg-ink-100 hover:text-fg">
                  <Plus className="size-3" />
                  Add tag
                </button>
              )}
            </div>
          </Card>

          <div className="flex flex-col">
            <Button variant="ghost" className="justify-start" onClick={() => setSendingTests(true)}>
              <ClipboardList />
              Send psychometric tests
            </Button>
            <Button variant="ghost" className="justify-start" onClick={() => setCollecting(true)}>
              <Folder />
              Add to a talent collection
            </Button>
          </div>
        </aside>
      </div>
      <ScheduleDialog open={scheduling} onOpenChange={setScheduling} preset={{ candidateId: c.id, vacancyId: app.vacancyId }} onScheduled={() => setReload((r) => r + 1)} />
      <SendTestsDialog
        open={sendingTests}
        onOpenChange={setSendingTests}
        targets={[{ candidateId: c.id, vacancyId: app.vacancyId, name: c.name, vacancyTitle: app.vacancyTitle }]}
        onSent={() => setReload((r) => r + 1)}
      />
      <AddToCollectionDialog open={collecting} onOpenChange={setCollecting} people={[{ id: c.id, kind: "candidate", name: c.name }]} />
      {moving && <MoveStageDialog candidate={c} app={app} open={moving} onOpenChange={setMoving} onMoved={setC} />}
    </PageContainer>
  );
}

function BackLink() {
  return (
    <Link href="/candidates" className="inline-flex items-center gap-1 text-sm font-medium text-fg-subtle hover:text-fg">
      <ArrowLeft className="size-4" />
      Candidates
    </Link>
  );
}
