"use client";

import * as React from "react";
import { Briefcase, Certificate, Check, CircleCheck, GraduationCap, Plus, Sparkles, Trash2, UserRound } from "@/components/icons";
import { Button, Card, Checkbox, Field, Input, Select, Tag, Textarea } from "@/components/ui";
import type { CvExtraction, ExtractedCertification, ExtractedEducation, ExtractedExperience, ExtractedValue } from "@/types";
import { AVAILABILITY_OPTIONS } from "@/lib/cv";
import { cn } from "@/lib/utils";
import { FIELD_LABEL } from "./cv-meta";

type Scalar = keyof typeof FIELD_LABEL;
export type Errors = Partial<Record<Scalar, string>>;

/** Dashed copper outline: Vettly is unsure. Matches the unreviewed-AI tag used elsewhere. */
const flaggedControl = "border-dashed border-accent-500 bg-accent-50/40 hover:border-accent-600";

export function Section({ icon, title, aside, children }: { icon: React.ReactNode; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-fg [&_svg]:size-4.5 [&_svg]:text-ink-500">
          {icon}
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </Card>
  );
}

/** Note under a value Vettly was unsure of, with a one-click confirm. */
function FlagNote({ flag, onConfirm }: { flag: string; onConfirm: () => void }) {
  return (
    <div data-flagged="" className="flex flex-col items-start gap-1 text-xs text-accent-700">
      <p className="flex items-start gap-1.5">
        <Sparkles className="mt-px size-3.5 shrink-0" aria-hidden />
        <span>{flag}</span>
      </p>
      <button type="button" onClick={onConfirm} className="-ml-1.5 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-semibold text-accent-700 hover:bg-accent-100">
        <Check className="size-3" weight="bold" />
        Looks right
      </button>
    </div>
  );
}

export function CheckedMark() {
  return (
    <span className="inline-flex items-center gap-1 text-2xs font-semibold text-success-700">
      <CircleCheck className="size-3.5" weight="fill" aria-hidden />
      Checked
    </span>
  );
}

export function PersonalSection({
  x,
  checked,
  errors,
  onField,
  onConfirm,
}: {
  x: CvExtraction;
  checked: Set<string>;
  errors: Errors;
  onField: (k: Scalar, value: string) => void;
  onConfirm: (k: string) => void;
}) {
  const field = (k: Scalar, opts: { required?: boolean; type?: string; autoComplete?: string; className?: string } = {}) => {
    const val: ExtractedValue = x[k];
    return (
      <div className={cn("flex flex-col gap-1.5", opts.className)}>
        <Field label={FIELD_LABEL[k]} required={opts.required} error={errors[k]} action={checked.has(k) && !val.flag ? <CheckedMark /> : undefined}>
          {k === "availability" ? (
            <Select
              value={val.value}
              onValueChange={(v) => onField(k, v)}
              placeholder="Choose notice period"
              options={AVAILABILITY_OPTIONS.map((a) => ({ value: a, label: a }))}
              className={cn(val.flag && flaggedControl)}
            />
          ) : (
            <Input
              type={opts.type ?? "text"}
              autoComplete="off"
              value={val.value}
              onChange={(e) => onField(k, e.target.value)}
              className={cn(val.flag && flaggedControl)}
            />
          )}
        </Field>
        {val.flag && <FlagNote flag={val.flag} onConfirm={() => onConfirm(k)} />}
      </div>
    );
  };
  return (
    <Section icon={<UserRound />} title="Personal details">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field("name", { required: true })}
        {field("headline")}
        {field("email", { type: "email" })}
        {field("phone", { type: "tel" })}
        {field("location", { required: true })}
        {field("currentEmployer")}
        {field("availability", { required: true })}
      </div>
    </Section>
  );
}

let newId = 0;
const nid = (p: string) => `${p}_n${++newId}`;

export function ExperienceSection({
  items,
  checked,
  onChange,
  onConfirm,
}: {
  items: ExtractedExperience[];
  checked: Set<string>;
  onChange: (v: ExtractedExperience[]) => void;
  onConfirm: (id: string) => void;
}) {
  const set = (id: string, patch: Partial<ExtractedExperience>) => onChange(items.map((e) => (e.id === id ? { ...e, ...patch, flag: undefined } : e)));
  return (
    <Section
      icon={<Briefcase />}
      title="Work experience"
      aside={
        <Button size="sm" variant="ghost" onClick={() => onChange([...items, { id: nid("x"), title: "", company: "", location: "", start: "", end: null }])}>
          <Plus />
          Add role
        </Button>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-fg-subtle">No roles yet. Add them from the CV, most recent first.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {items.map((e, i) => (
            <li key={e.id} className={cn("rounded-md border p-4", e.flag ? "border-dashed border-accent-500 bg-accent-50/30" : "border-line")}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-fg-subtle">
                  Role {i + 1}
                  {checked.has(e.id) && !e.flag && (
                    <span className="ml-2">
                      <CheckedMark />
                    </span>
                  )}
                </p>
                <Button size="icon-sm" variant="ghost" aria-label={`Remove role ${i + 1}`} onClick={() => onChange(items.filter((x) => x.id !== e.id))}>
                  <Trash2 />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Job title">
                  <Input value={e.title} onChange={(ev) => set(e.id, { title: ev.target.value })} />
                </Field>
                <Field label="Employer">
                  <Input value={e.company} onChange={(ev) => set(e.id, { company: ev.target.value })} />
                </Field>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_10rem]">
                <Field label="Location" className="col-span-2 sm:col-span-1">
                  <Input value={e.location} onChange={(ev) => set(e.id, { location: ev.target.value })} />
                </Field>
                <Field label="From">
                  <Input type="month" value={e.start} onChange={(ev) => set(e.id, { start: ev.target.value })} />
                </Field>
                <Field label="To">
                  {e.end === null ? (
                    <Input value="Present" readOnly tabIndex={-1} className="bg-ink-50 text-fg-muted" />
                  ) : (
                    <Input type="month" value={e.end} onChange={(ev) => set(e.id, { end: ev.target.value })} />
                  )}
                </Field>
              </div>
              <label className="mt-3 inline-flex items-center gap-2 text-sm text-fg-muted">
                <Checkbox checked={e.end === null} onCheckedChange={(v) => set(e.id, { end: v === true ? null : "" })} />
                Current role
              </label>
              <Field label="What they did" optional hint="One duty or achievement per line. Matching uses these as evidence." className="mt-3">
                <Textarea
                  rows={Math.min(6, Math.max(2, e.bullets?.length ?? 0))}
                  value={(e.bullets ?? []).join("\n")}
                  onChange={(ev) => set(e.id, { bullets: ev.target.value.split("\n") })}
                />
              </Field>
              {e.flag && (
                <div className="mt-3">
                  <FlagNote flag={e.flag} onConfirm={() => onConfirm(e.id)} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

export function CertificationsSection({
  items,
  checked,
  onChange,
  onConfirm,
}: {
  items: ExtractedCertification[];
  checked: Set<string>;
  onChange: (v: ExtractedCertification[]) => void;
  onConfirm: (id: string) => void;
}) {
  const set = (id: string, patch: Partial<ExtractedCertification>) => onChange(items.map((c) => (c.id === id ? { ...c, ...patch, flag: undefined } : c)));
  return (
    <Section
      icon={<Certificate />}
      title="Certifications"
      aside={
        <Button size="sm" variant="ghost" onClick={() => onChange([...items, { id: nid("c"), name: "", issuer: "", year: null }])}>
          <Plus />
          Add certification
        </Button>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-fg-subtle">No certifications found. Add any the CV mentions, such as a professional registration.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((c, i) => (
            <li key={c.id} className={cn("rounded-md border p-4", c.flag ? "border-dashed border-accent-500 bg-accent-50/30" : "border-line")}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-fg-subtle">
                  Certification {i + 1}
                  {checked.has(c.id) && !c.flag && (
                    <span className="ml-2">
                      <CheckedMark />
                    </span>
                  )}
                </p>
                <Button size="icon-sm" variant="ghost" aria-label={`Remove certification ${i + 1}`} onClick={() => onChange(items.filter((x) => x.id !== c.id))}>
                  <Trash2 />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_6rem]">
                <Field label="Certification">
                  <Input value={c.name} onChange={(ev) => set(c.id, { name: ev.target.value })} placeholder="e.g. Chartered Accountant CA(Z)" />
                </Field>
                <Field label="Issued by">
                  <Input value={c.issuer} onChange={(ev) => set(c.id, { issuer: ev.target.value })} placeholder="e.g. ICAZ" />
                </Field>
                <Field label="Year">
                  <Input
                    inputMode="numeric"
                    maxLength={4}
                    value={c.year ?? ""}
                    onChange={(ev) => {
                      const n = ev.target.value.replace(/\D/g, "");
                      set(c.id, { year: n ? Number(n) : null });
                    }}
                  />
                </Field>
              </div>
              {c.flag && (
                <div className="mt-3">
                  <FlagNote flag={c.flag} onConfirm={() => onConfirm(c.id)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function EducationSection({
  items,
  checked,
  onChange,
  onConfirm,
}: {
  items: ExtractedEducation[];
  checked: Set<string>;
  onChange: (v: ExtractedEducation[]) => void;
  onConfirm: (id: string) => void;
}) {
  const set = (id: string, patch: Partial<ExtractedEducation>) => onChange(items.map((e) => (e.id === id ? { ...e, ...patch, flag: undefined } : e)));
  return (
    <Section
      icon={<GraduationCap />}
      title="Education"
      aside={
        <Button size="sm" variant="ghost" onClick={() => onChange([...items, { id: nid("e"), institution: "", qualification: "", field: "", end: null }])}>
          <Plus />
          Add qualification
        </Button>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-fg-subtle">No qualifications yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((e, i) => (
            <li key={e.id} className={cn("rounded-md border p-4", e.flag ? "border-dashed border-accent-500 bg-accent-50/30" : "border-line")}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-fg-subtle">
                  Qualification {i + 1}
                  {checked.has(e.id) && !e.flag && (
                    <span className="ml-2">
                      <CheckedMark />
                    </span>
                  )}
                </p>
                <Button size="icon-sm" variant="ghost" aria-label={`Remove qualification ${i + 1}`} onClick={() => onChange(items.filter((x) => x.id !== e.id))}>
                  <Trash2 />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem]">
                <Field label="Qualification">
                  <Input value={e.qualification} onChange={(ev) => set(e.id, { qualification: ev.target.value })} placeholder="e.g. BCom (Hons)" />
                </Field>
                <Field label="Field of study">
                  <Input value={e.field} onChange={(ev) => set(e.id, { field: ev.target.value })} />
                </Field>
                <Field label="Year">
                  <Input
                    inputMode="numeric"
                    maxLength={4}
                    value={e.end ?? ""}
                    onChange={(ev) => {
                      const n = ev.target.value.replace(/\D/g, "");
                      set(e.id, { end: n ? Number(n) : null });
                    }}
                  />
                </Field>
                <Field label="Institution" className="sm:col-span-3">
                  <Input value={e.institution} onChange={(ev) => set(e.id, { institution: ev.target.value })} />
                </Field>
              </div>
              {e.flag && (
                <div className="mt-3">
                  <FlagNote flag={e.flag} onConfirm={() => onConfirm(e.id)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function SkillsAndSummary({
  skills,
  summary,
  onSkills,
  onSummary,
}: {
  skills: string[];
  summary: string;
  onSkills: (v: string[]) => void;
  onSummary: (v: string) => void;
}) {
  const [draft, setDraft] = React.useState("");
  const add = () => {
    const t = draft.trim();
    if (t && !skills.some((s) => s.toLowerCase() === t.toLowerCase())) onSkills([...skills, t]);
    setDraft("");
  };
  return (
    <Section icon={<Sparkles />} title="Skills and summary">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-fg">Skills</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {skills.map((s) => (
              <Tag key={s} onRemove={() => onSkills(skills.filter((x) => x !== s))}>
                {s}
              </Tag>
            ))}
            {skills.length === 0 && <span className="text-sm text-fg-subtle">No skills yet.</span>}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            className="flex max-w-sm gap-2"
          >
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a skill" aria-label="Add a skill" maxLength={40} />
            <Button type="submit" variant="secondary" disabled={!draft.trim()}>
              Add
            </Button>
          </form>
        </div>
        <Field label="Summary" hint="Shown at the top of the candidate profile.">
          <Textarea rows={4} value={summary} onChange={(e) => onSummary(e.target.value)} />
        </Field>
      </div>
    </Section>
  );
}
