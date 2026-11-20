"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "@/components/layout/session-provider";
import { ArrowDown, ArrowUp, Plus, X } from "@/components/icons";
import { Button, Checkbox, Input, Select, SwitchField, Textarea } from "@/components/ui";
import { Slider } from "@/components/ui/slider";
import { TEST_BATTERIES } from "@/lib/onboarding";
import type { AssessmentSettings } from "@/types/settings";
import { cn } from "@/lib/utils";
import { Group, Row, SaveBar, SectionSkeleton, useSection } from "./settings-shell";

const WEIGHT_LABEL = { skills: "Skills", experience: "Experience", education: "Education and certifications", tests: "Test results" } as const;

export function RecruitmentSection() {
  const s = useSection("recruitment");
  const [reason, setReason] = React.useState("");
  const r = s.draft;
  if (!r) return <SectionSkeleton />;
  const total = Object.values(r.defaultWeights).reduce((a, b) => a + b, 0);
  const move = (i: number, d: -1 | 1) => {
    const list = [...r.rejectionReasons];
    [list[i], list[i + d]] = [list[i + d]!, list[i]!];
    s.set("rejectionReasons", list);
  };
  return (
    <div className="flex flex-col gap-5">
      <Group title="Vacancies">
        <Row label="Reference prefix" hint={`New vacancies are numbered ${r.referencePrefix || "MFG"}-2026-035 and so on.`} htmlFor="prefix">
          <Input id="prefix" value={r.referencePrefix} onChange={(e) => s.set("referencePrefix", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} className="max-w-32 font-mono" />
        </Row>
        <Row label="Default closing date" hint="How long a new vacancy stays open for applications.">
          <Select value={String(r.defaultClosingDays)} onValueChange={(v) => s.set("defaultClosingDays", Number(v))} options={[14, 21, 28, 30].map((d) => ({ value: String(d), label: `${d} days after publishing` }))} className="max-w-xs" />
        </Row>
      </Group>

      <Group
        title="Default screening weights"
        description="How much each part counts in a new vacancy's match score. Each vacancy can change them."
        actions={<span className={cn("text-sm font-semibold tabular", total === 100 ? "text-fg-muted" : "text-danger-700")}>{total}% of 100%</span>}
      >
        <div className="flex flex-col gap-5">
          {(Object.keys(WEIGHT_LABEL) as (keyof typeof WEIGHT_LABEL)[]).map((k) => (
            <div key={k} className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_3rem] items-center gap-4">
              <span className="text-sm text-fg">{WEIGHT_LABEL[k]}</span>
              <Slider label={`${WEIGHT_LABEL[k]} weight`} min={0} max={70} step={5} value={[r.defaultWeights[k]]} onValueChange={([v]) => s.set("defaultWeights", { ...r.defaultWeights, [k]: v ?? 0 })} />
              <span className="text-right text-sm font-semibold text-fg tabular">{r.defaultWeights[k]}%</span>
            </div>
          ))}
          {total !== 100 && <p className="text-xs text-danger-700">Weights must add up to 100% before you can save.</p>}
        </div>
      </Group>

      <Group title="Rejection reasons" description="Every rejection needs one. They're shown to the team, never to candidates, and feed the analytics.">
        <ol className="divide-y divide-line rounded-md border border-line">
          {r.rejectionReasons.map((x, i) => (
            <li key={x} className="flex items-center gap-2 px-3 py-2">
              <span className="w-5 text-xs text-fg-subtle tabular">{i + 1}</span>
              <span className="min-w-0 flex-1 text-sm text-fg">{x}</span>
              <Button size="icon-sm" variant="ghost" aria-label={`Move ${x} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp />
              </Button>
              <Button size="icon-sm" variant="ghost" aria-label={`Move ${x} down`} disabled={i === r.rejectionReasons.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown />
              </Button>
              <Button size="icon-sm" variant="ghost" aria-label={`Remove ${x}`} disabled={r.rejectionReasons.length === 1} onClick={() => s.set("rejectionReasons", r.rejectionReasons.filter((y) => y !== x))}>
                <X />
              </Button>
            </li>
          ))}
        </ol>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = reason.trim();
            if (!v || r.rejectionReasons.some((x) => x.toLowerCase() === v.toLowerCase())) return;
            s.set("rejectionReasons", [...r.rejectionReasons, v]);
            setReason("");
          }}
        >
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Add a reason" aria-label="New rejection reason" className="max-w-md" />
          <Button type="submit" variant="secondary" disabled={!reason.trim()}>
            <Plus />
            Add
          </Button>
        </form>
      </Group>

      <Group title="Interviews and offers">
        <Row label="Independent scorecards" hint="Panel members can't see others' scores until they submit their own. Reduces groupthink.">
          <SwitchField label="Hide scores until submitted" checked={r.independentScorecards} onCheckedChange={(c) => s.set("independentScorecards", c)} />
        </Row>
        <Row label="Offer approvals" hint="The hiring manager always approves first.">
          <div className="flex flex-col gap-3">
            <SwitchField label="HR approves every offer" checked={r.hrApprovesAll} onCheckedChange={(c) => s.set("hrApprovesAll", c)} />
            <SwitchField label="The CFO approves pay above the band" checked={r.cfoAboveBand} onCheckedChange={(c) => s.set("cfoAboveBand", c)} />
          </div>
        </Row>
        <Row label="Offers expire after">
          <Select value={String(r.offerValidityDays)} onValueChange={(v) => s.set("offerValidityDays", Number(v))} options={[3, 5, 7, 10, 14].map((d) => ({ value: String(d), label: `${d} days` }))} className="max-w-40" />
        </Row>
        <Row label="When a vacancy is filled" hint="A respectful closing message to everyone still in the process.">
          <SwitchField label="Offer to notify other candidates" checked={r.notifyUnsuccessful} onCheckedChange={(c) => s.set("notifyUnsuccessful", c)} />
        </Row>
      </Group>
      <SaveBar dirty={s.dirty} saving={s.saving} error={s.error} onSave={s.save} onDiscard={s.discard} />
    </div>
  );
}

const MERGE = ["first_name", "vacancy", "deadline", "minutes", "link", "org", "sign_off"];
const SAMPLE: Record<string, string> = {
  first_name: "[first name]",
  vacancy: "[vacancy]",
  deadline: "[deadline]",
  minutes: "[minutes]",
  link: "[test link]",
};
/** Fills a template with a sample candidate and this organisation's name. */
const fill = (t: string, org: string) => {
  const vars: Record<string, string> = { ...SAMPLE, org, sign_off: `Kind regards,\nThe ${org} recruitment team` };
  return t.replace(/\{\{(\w+)\}\}/g, (m, k: string) => vars[k] ?? m);
};

export function AssessmentsSection() {
  const org = useSession().organisation?.name ?? "Your organisation";
  const s = useSection("assessments");
  const [preview, setPreview] = React.useState(false);
  const a = s.draft;
  if (!a) return <SectionSkeleton />;
  const toggleReminder = (h: number) => s.set("reminders", a.reminders.includes(h) ? a.reminders.filter((x) => x !== h) : [...a.reminders, h].sort((x, y) => y - x));
  return (
    <div className="flex flex-col gap-5">
      <Group title="Default batteries" description="Suggested when tests are sent for a vacancy in each department. Recruiters can choose another.">
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          {Object.entries(a.batteries).map(([dept, id]) => (
            <label key={dept} className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-fg">{dept}</span>
              <Select value={id} onValueChange={(v) => s.set("batteries", { ...a.batteries, [dept]: v })} options={TEST_BATTERIES} />
            </label>
          ))}
        </div>
      </Group>

      <Group title="Sending and deadlines">
        <Row label="Send automatically" hint="When someone is moved to Shortlisted, they get the vacancy's tests straight away.">
          <SwitchField label="Send tests on shortlisting" checked={a.sendOnShortlist} onCheckedChange={(c) => s.set("sendOnShortlist", c)} />
        </Row>
        <Row label="Deadline">
          <Select value={String(a.deadlineDays)} onValueChange={(v) => s.set("deadlineDays", Number(v))} options={[3, 5, 7, 10].map((d) => ({ value: String(d), label: `${d} days after sending` }))} className="max-w-xs" />
        </Row>
        <Row label="Reminders" hint="Only to candidates who haven't finished.">
          <div className="flex flex-wrap gap-4">
            {[72, 48, 24, 4].map((h) => (
              <label key={h} className="inline-flex items-center gap-2 text-sm text-fg">
                <Checkbox checked={a.reminders.includes(h)} onCheckedChange={() => toggleReminder(h)} />
                {h} hours before
              </label>
            ))}
          </div>
        </Row>
        <Row label="Adjustments contact" hint="Where candidates ask for extra time or another format." htmlFor="adj">
          <Input id="adj" value={a.adjustmentsContact} onChange={(e) => s.set("adjustmentsContact", e.target.value)} className="max-w-sm" />
        </Row>
      </Group>

      <Group
        title="Invitation messages"
        description={
          <>
            Merge fields:{" "}
            {MERGE.map((m, i) => (
              <React.Fragment key={m}>
                <code className="rounded-xs bg-ink-100 px-1 text-xs">{`{{${m}}}`}</code>
                {i < MERGE.length - 1 ? " " : ""}
              </React.Fragment>
            ))}
          </>
        }
        actions={
          <Button size="sm" variant="secondary" onClick={() => setPreview((p) => !p)} aria-pressed={preview}>
            {preview ? "Edit" : "Preview"}
          </Button>
        }
      >
        {preview ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="rounded-md border border-line bg-surface-muted p-4">
              <p className="text-xs text-fg-subtle">To: the candidate&apos;s email</p>
              <p className="mt-1 text-sm font-semibold text-fg">{fill(a.inviteEmailSubject, org)}</p>
              <p className="mt-3 text-sm whitespace-pre-line text-fg">{fill(a.inviteEmailBody, org)}</p>
            </div>
            <div className="self-start rounded-2xl bg-ink-100 p-3">
              <p className="text-2xs text-fg-subtle">SMS</p>
              <p className="mt-1 rounded-xl rounded-bl-sm bg-surface px-3 py-2 text-sm text-fg shadow-sm">{fill(a.inviteSms, org)}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-fg">Email subject</span>
              <Input value={a.inviteEmailSubject} onChange={(e) => s.set("inviteEmailSubject", e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-fg">Email</span>
              <Textarea rows={9} value={a.inviteEmailBody} onChange={(e) => s.set("inviteEmailBody", e.target.value)} className="font-mono text-xs" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="flex items-baseline justify-between text-sm font-medium text-fg">
                SMS
                <span className={cn("text-xs font-normal tabular", fill(a.inviteSms, org).length > 160 ? "text-danger-700" : "text-fg-subtle")}>{fill(a.inviteSms, org).length} of 160 characters, filled in</span>
              </span>
              <Textarea rows={2} value={a.inviteSms} onChange={(e) => s.set("inviteSms", e.target.value)} className="font-mono text-xs" />
            </label>
          </div>
        )}
      </Group>

      <Group title="Consent and results" description="Candidates agree to this before starting. Keep it short and specific.">
        <Row label="Consent wording" htmlFor="consent">
          <Textarea id="consent" rows={4} value={a.consentWording} onChange={(e) => s.set("consentWording", e.target.value)} />
        </Row>
        <Row label="Keep results for" hint="Then scores and reports are deleted. Hired people's results move to their HR file.">
          <Select value={String(a.retentionMonths)} onValueChange={(v) => s.set("retentionMonths", Number(v) as AssessmentSettings["retentionMonths"])} options={[6, 12, 24].map((m) => ({ value: String(m), label: `${m} months` }))} className="max-w-40" />
        </Row>
        <Row label="Who sees full reports" hint="Others see only whether tests are complete.">
          <p className="text-sm text-fg-muted">
            Set by the &ldquo;See test reports&rdquo; permission.{" "}
            <Link href="/settings/roles" className="font-medium text-primary-700 hover:underline">
              Roles and permissions
            </Link>
          </p>
        </Row>
        <Row label="Feedback for candidates" hint="A short, plain-language report on their strengths, sent after they finish.">
          <SwitchField label="Send candidates a feedback report" checked={a.candidateFeedback} onCheckedChange={(c) => s.set("candidateFeedback", c)} />
        </Row>
      </Group>
      <SaveBar dirty={s.dirty} saving={s.saving} error={s.error} onSave={s.save} onDiscard={s.discard} />
    </div>
  );
}
