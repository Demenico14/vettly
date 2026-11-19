"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Plus, Trash2, Upload, X } from "@/components/icons";
import { Alert, Button, Field, Input, RadioGroup, Select, SwitchField, Tag, toast } from "@/components/ui";
import { Stepper, type Step } from "@/components/ui/stepper";
import { services } from "@/services";
import { BRAND_COLOURS, DEFAULT_STAGES, TEST_BATTERIES, TIMEZONES } from "@/mocks/auth";
import type { OrganisationSetup, Role } from "@/types";
import { cn } from "@/lib/utils";
import { readFlow } from "@/features/auth/session-store";

const STEPS: Step[] = [
  { id: "branding", label: "Branding", description: "What candidates see" },
  { id: "recruitment", label: "Recruitment defaults", description: "Currency, time zone, stages" },
  { id: "assessments", label: "Assessments", description: "Psychometric test defaults" },
  { id: "team", label: "Invite your team", description: "Optional, you can do this later" },
];

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "recruiter", label: "Recruiter" },
  { value: "hr_manager", label: "HR manager" },
  { value: "hiring_manager", label: "Hiring manager" },
  { value: "org_admin", label: "Organisation admin" },
];

const HEX = /^#[0-9a-fA-F]{6}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Partial<Record<string, string>>;

export function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [orgName, setOrgName] = React.useState("Your organisation");
  const [errors, setErrors] = React.useState<Errors>({});
  const [saving, setSaving] = React.useState(false);
  const [data, setData] = React.useState<OrganisationSetup>({
    brandColour: BRAND_COLOURS[0]!,
    logoFileName: null,
    currency: "USD",
    timezone: "Africa/Harare",
    stages: DEFAULT_STAGES,
    defaultTestDeadlineDays: 5,
    sendTestsOnShortlist: true,
    defaultBattery: "professional",
    invites: [{ email: "", role: "recruiter" }],
  });
  const [hexDraft, setHexDraft] = React.useState(data.brandColour);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  React.useEffect(() => {
    const n = readFlow().organisationName;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- organisation name comes from the previous step's flow store
    if (n) setOrgName(n);
  }, []);

  React.useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const set = <K extends keyof OrganisationSetup>(k: K, v: OrganisationSetup[K]) => setData((d) => ({ ...d, [k]: v }));

  const validate = (i: number): Errors => {
    const e: Errors = {};
    if (i === 0 && !HEX.test(data.brandColour)) e.brandColour = "Enter a 6-digit hex colour, for example #16624F.";
    if (i === 1) {
      if (data.stages.length < 3) e.stages = "Keep at least 3 stages, including Hired.";
    }
    if (i === 3) {
      data.invites.forEach((inv, idx) => {
        if (inv.email.trim() && !EMAIL.test(inv.email.trim())) e[`invite-${idx}`] = "Enter a valid email.";
      });
      const emails = data.invites.map((x) => x.email.trim().toLowerCase()).filter(Boolean);
      const dup = emails.find((m, idx) => emails.indexOf(m) !== idx);
      if (dup) e.invites = `${dup} is listed twice.`;
    }
    return e;
  };

  const next = async () => {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    setSaving(true);
    const cleaned = { ...data, invites: data.invites.filter((i) => i.email.trim()) };
    await services.auth.completeSetup("org_new", cleaned);
    toast.success(
      "Workspace ready",
      cleaned.invites.length ? `${cleaned.invites.length} invitation${cleaned.invites.length === 1 ? "" : "s"} sent.` : undefined,
    );
    router.push("/welcome");
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <div>
        <p className="mb-1 text-xs font-semibold text-fg-subtle">Step 2 of 2 · Set up {orgName}</p>
        <Stepper steps={STEPS} current={step} onSelect={setStep} className="mt-4" />
      </div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
        className="min-w-0"
      >
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-[-0.015em] text-fg focus:outline-none">
          {STEPS[step]!.label}
        </h1>
        <div className="mt-6 flex flex-col gap-6">
          {step === 0 && (
            <Branding
              data={data}
              orgName={orgName}
              hexDraft={hexDraft}
              setHexDraft={setHexDraft}
              set={set}
              error={errors.brandColour}
            />
          )}
          {step === 1 && <Recruitment data={data} set={set} error={errors.stages} />}
          {step === 2 && <Assessments data={data} set={set} />}
          {step === 3 && <Team data={data} set={set} errors={errors} />}
        </div>
        <div className="mt-8 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="ghost" disabled={step === 0 || saving} onClick={() => setStep(step - 1)}>
            Back
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {step === 3 && (
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  set("invites", [{ email: "", role: "recruiter" }]);
                  setErrors({});
                  next();
                }}
              >
                Skip for now
              </Button>
            )}
            <Button type="submit" loading={saving}>
              {step === STEPS.length - 1 ? (saving ? "Finishing…" : "Finish setup") : "Continue"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

type StepProps = { data: OrganisationSetup; set: <K extends keyof OrganisationSetup>(k: K, v: OrganisationSetup[K]) => void };

function Branding({
  data,
  set,
  orgName,
  hexDraft,
  setHexDraft,
  error,
}: StepProps & { orgName: string; hexDraft: string; setHexDraft: (v: string) => void; error?: string }) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [drag, setDrag] = React.useState(false);

  const accept = (file?: File) => {
    if (!file) return;
    if (!["image/png", "image/svg+xml", "image/jpeg"].includes(file.type)) {
      setFileError(`${file.name} isn't a PNG, SVG or JPG.`);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFileError(`${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 2 MB.`);
      return;
    }
    setFileError(null);
    set("logoFileName", file.name);
  };

  return (
    <>
      <p className="-mt-3 text-sm text-fg-muted">
        Candidates see your logo and colour on job adverts, test invitations and the test screens.
      </p>
      <div>
        <p className="mb-1.5 text-sm font-semibold text-fg">
          Logo <span className="ml-1 text-xs font-medium text-fg-subtle">Optional</span>
        </p>
        {data.logoFileName ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-muted px-4 py-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <Check className="size-4 shrink-0 text-success-600" weight="bold" />
              <span className="truncate font-medium">{data.logoFileName}</span>
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => set("logoFileName", null)}>
              <X />
              Remove
            </Button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              accept(e.dataTransfer.files[0]);
            }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-md border border-dashed px-4 py-7 text-center transition-colors",
              drag ? "border-primary-500 bg-primary-50" : "border-line-strong bg-surface-muted",
              fileError && "border-danger-500",
            )}
          >
            <Upload className="size-5 text-ink-500" />
            <p className="text-sm text-fg-muted">
              Drag your logo here, or{" "}
              <button type="button" onClick={() => fileRef.current?.click()} className="font-semibold text-primary-700 hover:underline">
                choose a file
              </button>
            </p>
            <p className="text-xs text-fg-subtle">PNG, SVG or JPG, up to 2 MB. A square logo works best.</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/svg+xml,image/jpeg"
              className="sr-only"
              aria-label="Upload logo"
              onChange={(e) => accept(e.target.files?.[0])}
            />
          </div>
        )}
        {fileError && (
          <p className="mt-1.5 text-xs font-medium text-danger-700" role="alert">
            {fileError}
          </p>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-fg">Brand colour</p>
          <div role="radiogroup" aria-label="Brand colour presets" className="flex flex-wrap gap-2">
            {BRAND_COLOURS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={data.brandColour.toLowerCase() === c.toLowerCase()}
                aria-label={c}
                onClick={() => {
                  set("brandColour", c);
                  setHexDraft(c);
                }}
                className={cn(
                  "grid size-9 place-items-center rounded-md ring-offset-2 transition-shadow",
                  data.brandColour.toLowerCase() === c.toLowerCase() && "ring-2 ring-ink-900",
                )}
                style={{ background: c }}
              >
                {data.brandColour.toLowerCase() === c.toLowerCase() && <Check className="size-4 text-white" weight="bold" />}
              </button>
            ))}
          </div>
          <Field label="Custom colour" error={error} hint="Dark colours keep white text readable.">
            <Input
              value={hexDraft}
              maxLength={7}
              onChange={(e) => {
                const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
                setHexDraft(v);
                set("brandColour", v);
              }}
              leading={<span className="size-4 rounded-xs border border-line" style={{ background: HEX.test(hexDraft) ? hexDraft : "transparent" }} />}
              className="font-mono uppercase"
            />
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-fg">Candidate preview</p>
          <div className="overflow-hidden rounded-md border border-line bg-canvas" aria-label="Preview of the candidate test page">
            <div
              className="flex h-10 items-center justify-between border-b border-line bg-surface px-3"
              style={{ borderTop: `3px solid ${HEX.test(data.brandColour) ? data.brandColour : "var(--color-primary-600)"}` }}
            >
              <span className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold">
                {data.logoFileName && <span className="size-4 shrink-0 rounded-xs border border-line bg-ink-200" aria-hidden />}
                {orgName}
              </span>
              <span className="shrink-0 text-[0.625rem] whitespace-nowrap text-fg-subtle">by Vettly</span>
            </div>
            <div className="p-3">
              <div className="rounded-sm border border-line bg-surface p-3">
                <p className="text-xs font-semibold">Hello Chipo,</p>
                <p className="mt-1 text-[0.625rem] leading-snug text-fg-muted">
                  {orgName} has invited you to complete 2 short assessments.
                </p>
                <span
                  className="mt-2 inline-flex h-6 items-center rounded-sm px-2.5 text-[0.625rem] font-semibold text-white"
                  style={{ background: HEX.test(data.brandColour) ? data.brandColour : "var(--color-primary-600)" }}
                >
                  Continue
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Recruitment({ data, set, error }: StepProps & { error?: string }) {
  const [draft, setDraft] = React.useState("");
  const [dupe, setDupe] = React.useState<string | null>(null);
  const lastMovable = data.stages.length - 2; // "Hired" is fixed as the final stage
  const move = (i: number, dir: -1 | 1) => {
    const s = data.stages.slice();
    const j = i + dir;
    if (j < 0 || j > lastMovable) return;
    [s[i], s[j]] = [s[j]!, s[i]!];
    set("stages", s);
  };
  const add = () => {
    const v = draft.trim();
    if (!v || data.stages.some((s) => s.toLowerCase() === v.toLowerCase())) {
      setDupe(v ? `“${v}” is already a stage.` : null);
      return;
    }
    setDupe(null);
    const s = data.stages.slice();
    s.splice(Math.max(0, s.length - 1), 0, v);
    set("stages", s);
    setDraft("");
  };
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Salary currency" hint="Used on vacancies and offers. You can change it per vacancy.">
          <Select
            value={data.currency}
            onValueChange={(v) => set("currency", v as OrganisationSetup["currency"])}
            options={[
              { value: "USD", label: "US dollar (USD)" },
              { value: "ZiG", label: "Zimbabwe Gold (ZiG)" },
              { value: "ZAR", label: "South African rand (ZAR)" },
              { value: "BWP", label: "Botswana pula (BWP)" },
              { value: "ZMW", label: "Zambian kwacha (ZMW)" },
            ]}
          />
        </Field>
        <Field label="Time zone" hint="Interview times and test deadlines use this.">
          <Select value={data.timezone} onValueChange={(v) => set("timezone", v)} options={TIMEZONES} />
        </Field>
      </div>
      <div>
        <p className="text-sm font-semibold text-fg">Pipeline stages</p>
        <p className="mb-3 text-xs text-fg-subtle">The order candidates move through. Rejected and Withdrawn are always available.</p>
        <ol className="divide-y divide-line rounded-md border border-line" aria-label="Pipeline stages">
          {data.stages.map((s, i) => {
            const fixed = s === "Hired";
            return (
            <li key={s} className="flex min-h-11 items-center gap-3 px-3 py-1.5 text-sm">
              <span className="w-5 text-xs text-fg-subtle tabular">{i + 1}</span>
              <span className="flex-1 font-medium">{s}</span>
              {s === "Assessment" && <Tag className="hidden h-5 text-2xs sm:inline-flex">Psychometric tests</Tag>}
              {fixed ? (
                <span className="pr-2 text-xs text-fg-subtle">Final stage</span>
              ) : (
              <span className="flex gap-0.5">
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${s} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${s} down`}
                  disabled={i >= lastMovable}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${s}`}
                  onClick={() => set("stages", data.stages.filter((x) => x !== s))}
                >
                  <Trash2 />
                </Button>
              </span>
              )}
            </li>
            );
          })}
        </ol>
        {error && (
          <p className="mt-1.5 text-xs font-medium text-danger-700" role="alert">
            {error}
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <Input
            aria-label="New stage name"
            placeholder="Add a stage, e.g. Reference check"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setDupe(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={add} disabled={!draft.trim()}>
            <Plus />
            Add
          </Button>
        </div>
        {dupe && (
          <p className="mt-1.5 text-xs font-medium text-danger-700" role="alert">
            {dupe}
          </p>
        )}
      </div>
    </>
  );
}

function Assessments({ data, set }: StepProps) {
  return (
    <>
      <p className="-mt-3 text-sm text-fg-muted">
        Psychometric tests help your team compare shortlisted candidates fairly. Results inform decisions; they never reject
        anyone automatically.
      </p>
      <SwitchField
        checked={data.sendTestsOnShortlist}
        onCheckedChange={(c) => set("sendTestsOnShortlist", c)}
        label="Send tests automatically when a candidate is shortlisted"
        description="Otherwise recruiters send tests by hand from the pipeline or candidate list."
        className="rounded-md border border-line p-4"
      />
      <div>
        <p className="mb-2.5 text-sm font-semibold text-fg">Default test battery</p>
        <RadioGroup
          value={data.defaultBattery ?? ""}
          onValueChange={(v) => set("defaultBattery", v)}
          options={TEST_BATTERIES}
          className="gap-3"
        />
        <p className="mt-2.5 text-xs text-fg-subtle">You can choose different tests for each vacancy.</p>
      </div>
      <Field label="Default deadline" hint="Candidates get a reminder 24 hours before.">
        <Select
          value={String(data.defaultTestDeadlineDays)}
          onValueChange={(v) => set("defaultTestDeadlineDays", Number(v))}
          options={[3, 5, 7, 10].map((d) => ({ value: String(d), label: `${d} days after sending` }))}
          className="sm:max-w-xs"
        />
      </Field>
    </>
  );
}

function Team({ data, set, errors }: StepProps & { errors: Errors }) {
  const update = (i: number, patch: Partial<OrganisationSetup["invites"][number]>) =>
    set(
      "invites",
      data.invites.map((x, j) => (j === i ? { ...x, ...patch } : x)),
    );
  return (
    <>
      <p className="-mt-3 text-sm text-fg-muted">Invitations are emailed now and stay valid for 7 days.</p>
      {errors.invites && <Alert tone="danger" title="Check the invitations">{errors.invites}</Alert>}
      <div className="flex flex-col gap-3">
        <div className="hidden grid-cols-[minmax(0,1fr)_12rem_2.25rem] gap-2 text-sm font-semibold text-fg sm:grid" aria-hidden>
          <span>Email</span>
          <span>Role</span>
        </div>
        {data.invites.map((inv, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-start">
            <Field label={`Email ${i + 1}`} error={errors[`invite-${i}`]} className="[&_label]:sr-only sm:[&_label]:sr-only">
              <Input
                type="email"
                placeholder="colleague@company.co.zw"
                value={inv.email}
                onChange={(e) => update(i, { email: e.target.value })}
              />
            </Field>
            <Select
              aria-label={`Role for invitation ${i + 1}`}
              value={inv.role}
              onValueChange={(v) => update(i, { role: v as Role })}
              options={ROLE_OPTIONS}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove invitation ${i + 1}`}
              disabled={data.invites.length === 1}
              onClick={() => set("invites", data.invites.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        className="self-start"
        disabled={data.invites.length >= 10}
        onClick={() => set("invites", [...data.invites, { email: "", role: "recruiter" }])}
      >
        <Plus />
        Add another
      </Button>
    </>
  );
}
