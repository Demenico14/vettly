"use client";

import { useSession } from "@/components/layout/session-provider";
import * as React from "react";
import { Check, Upload, X } from "@/components/icons";
import { Badge, Button, Checkbox, Input, Select, Skeleton, SwitchField, Table, TBody, TD, TH, THead, TR, Textarea, toast } from "@/components/ui";
import { services, logoUrl, uploadFile } from "@/services";
import { initialsOf, letterheadOf } from "@/lib/letterhead";
import { LetterheadFooter, LetterheadTop } from "@/features/offers/letter-view";
import { BRAND_COLOURS, TIMEZONES } from "@/lib/onboarding";
import type { DataRequest, NotificationEvent, OrgSettings } from "@/types/settings";
import { cn } from "@/lib/utils";
import { Group, Row, SaveBar, SectionSkeleton, useSection } from "./settings-shell";

const HEX = /^#[0-9a-fA-F]{6}$/;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function OrganisationSection() {
  const s = useSection("profile");
  const p = s.draft;
  if (!p) return <SectionSkeleton />;
  return (
    <div className="flex flex-col gap-5">
      <Group title="Organisation details" description="Shown on offer letters, invitation emails and your careers page.">
        <Row label="Legal name" hint="As registered. Used on offer letters." htmlFor="legal">
          <Input id="legal" value={p.legalName} onChange={(e) => s.set("legalName", e.target.value)} />
        </Row>
        <Row label="Trading name" hint="What candidates see everywhere else." htmlFor="trading">
          <Input id="trading" value={p.tradingName} onChange={(e) => s.set("tradingName", e.target.value)} />
        </Row>
        <Row label="Registration number" htmlFor="reg">
          <Input id="reg" value={p.registrationNumber} onChange={(e) => s.set("registrationNumber", e.target.value)} className="max-w-xs" />
        </Row>
        <Row label="Industry and size">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select value={p.industry} onValueChange={(v) => s.set("industry", v)} options={["Financial services", "Insurance", "Retail", "Mining", "Manufacturing", "Telecommunications", "Transport & logistics", "Public sector", "NGO"].map((x) => ({ value: x, label: x }))} />
            <Select value={p.size} onValueChange={(v) => s.set("size", v)} options={["1–50 employees", "51–200 employees", "201–500 employees", "501–2,000 employees", "Over 2,000 employees"].map((x) => ({ value: x, label: x }))} />
          </div>
        </Row>
        <Row label="Head office">
          <div className="flex flex-col gap-3">
            <Input aria-label="Street address" value={p.address} onChange={(e) => s.set("address", e.target.value)} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input aria-label="City" value={p.city} onChange={(e) => s.set("city", e.target.value)} />
              <Select value={p.country} onValueChange={(v) => s.set("country", v)} options={["Zimbabwe", "South Africa", "Zambia", "Botswana", "Mozambique", "Namibia", "Malawi"].map((x) => ({ value: x, label: x }))} />
            </div>
          </div>
        </Row>
        <Row label="Website and phone">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input aria-label="Website" value={p.website} onChange={(e) => s.set("website", e.target.value)} placeholder="https://" />
            <Input aria-label="Phone" value={p.phone} onChange={(e) => s.set("phone", e.target.value)} />
          </div>
        </Row>
      </Group>
      <Group title="Regional defaults" description="New vacancies and offers start with these. Each can be changed per vacancy.">
        <Row label="Salary currency">
          <Select
            value={p.currency}
            onValueChange={(v) => s.set("currency", v)}
            options={[
              { value: "USD", label: "US dollar (USD)" },
              { value: "ZiG", label: "Zimbabwe Gold (ZiG)" },
              { value: "ZAR", label: "South African rand (ZAR)" },
              { value: "BWP", label: "Botswana pula (BWP)" },
              { value: "ZMW", label: "Zambian kwacha (ZMW)" },
            ]}
            className="max-w-xs"
          />
        </Row>
        <Row label="Time zone" hint="Interview times and test deadlines use this.">
          <Select value={p.timezone} onValueChange={(v) => s.set("timezone", v)} options={TIMEZONES} className="max-w-sm" />
        </Row>
        <Row label="Date format">
          <Select
            value={p.dateFormat}
            onValueChange={(v) => s.set("dateFormat", v as typeof p.dateFormat)}
            options={[
              { value: "D MMM YYYY", label: "18 Nov 2026" },
              { value: "DD/MM/YYYY", label: "18/11/2026" },
              { value: "YYYY-MM-DD", label: "2026-11-18" },
            ]}
            className="max-w-xs"
          />
        </Row>
      </Group>
      <SaveBar dirty={s.dirty} saving={s.saving} error={s.error} onSave={s.save} onDiscard={s.discard} />
    </div>
  );
}

export function BrandingSection() {
  const s = useSection("branding");
  const org = useSession().organisation;
  const [hex, setHex] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<OrgSettings["profile"] | null>(null);
  const [localLogo, setLocalLogo] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const logoInput = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    services.settings.get().then((all) => setProfile(all.profile)).catch(() => undefined);
  }, []);
  React.useEffect(() => () => void (localLogo && URL.revokeObjectURL(localLogo)), [localLogo]);
  const b = s.draft;
  if (!b) return <SectionSkeleton />;
  const shown = hex ?? b.colour;
  const logoSrc = localLogo ?? (b.logoFileId && org ? logoUrl(org.id, b.logoFileId) : null);
  const head = profile && org ? letterheadOf(org.id, { profile, branding: b }) : null;

  const uploadLogo = async (file?: File) => {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) return toast.error("Use a PNG or JPG", "Logos in emails and PDFs need a PNG or JPG file.");
    if (file.size > 2 * 1024 * 1024) return toast.error("Logo too large", "Keep the logo under 2 MB.");
    setUploading(true);
    try {
      const stored = await uploadFile(file);
      s.set("logoFileId", stored.fileId);
      s.set("logoFileName", stored.name);
      setLocalLogo(URL.createObjectURL(file));
      toast.success("Logo ready", "Save to use it on letters, emails and the test pages.");
    } catch (e) {
      toast.error("Logo not uploaded", e instanceof Error ? e.message : undefined);
    } finally {
      setUploading(false);
      if (logoInput.current) logoInput.current.value = "";
    }
  };
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Group title="Look" description="Used on your careers page, candidate emails and the test pages.">
          <Row label="Logo" hint="PNG or JPG, at least 300px wide, under 2 MB. A wide logo on a white or transparent background works best.">
            <div className="flex flex-wrap items-center gap-3">
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element -- the organisation's uploaded logo
                <img src={logoSrc} alt={`${org?.name ?? "Organisation"} logo`} className="h-12 w-auto max-w-40 rounded-md border border-line bg-white object-contain p-1" />
              ) : (
                <span className="grid size-12 place-items-center rounded-md text-sm font-bold text-white" style={{ background: b.colour }} aria-hidden>
                  {initialsOf(org?.name ?? "")}
                </span>
              )}
              <span className="max-w-48 truncate text-sm text-fg-muted">{b.logoFileId ? b.logoFileName : "No logo"}</span>
              <input ref={logoInput} type="file" accept="image/png,image/jpeg" className="sr-only" aria-label="Upload a logo" onChange={(e) => uploadLogo(e.target.files?.[0])} />
              <Button variant="secondary" size="sm" loading={uploading} onClick={() => logoInput.current?.click()}>
                {!uploading && <Upload />}
                {b.logoFileId ? "Replace" : "Upload logo"}
              </Button>
              {b.logoFileId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    s.set("logoFileId", null);
                    s.set("logoFileName", null);
                    setLocalLogo(null);
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          </Row>
          <Row label="Brand colour" hint="Dark colours keep white text readable on buttons.">
            <div className="flex flex-col gap-3">
              <div role="radiogroup" aria-label="Brand colour presets" className="flex flex-wrap gap-2">
                {BRAND_COLOURS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={b.colour.toLowerCase() === c.toLowerCase()}
                    aria-label={c}
                    onClick={() => (s.set("colour", c), setHex(null))}
                    className="grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-shadow aria-checked:ring-2 aria-checked:ring-fg"
                    style={{ background: c }}
                  >
                    {b.colour.toLowerCase() === c.toLowerCase() && <Check className="size-4 text-white" />}
                  </button>
                ))}
              </div>
              <Input
                aria-label="Custom colour, hex"
                value={shown}
                onChange={(e) => {
                  setHex(e.target.value);
                  if (HEX.test(e.target.value)) s.set("colour", e.target.value);
                }}
                className="max-w-36 font-mono"
              />
              {hex !== null && !HEX.test(hex) && <p className="text-xs text-danger-700">Enter 6 hex digits after #, for example #16624F.</p>}
            </div>
          </Row>
          <Row label="Logo on test pages" hint="Candidates see it while taking tests.">
            <SwitchField label="Show logo" checked={b.showLogoOnTests} onCheckedChange={(c) => s.set("showLogoOnTests", c)} />
          </Row>
        </Group>
        <Preview colour={b.colour} headline={b.careersHeadline} intro={b.careersIntro} logo={logoSrc} />
      </div>
      <Group title="Words" description="Your voice on the careers page and in every candidate email.">
        <Row label="Careers page headline" htmlFor="headline">
          <Input id="headline" value={b.careersHeadline} onChange={(e) => s.set("careersHeadline", e.target.value)} maxLength={80} />
        </Row>
        <Row label="Careers page introduction" hint={`${b.careersIntro.length} of 280 characters`} htmlFor="intro">
          <Textarea id="intro" rows={3} value={b.careersIntro} onChange={(e) => s.set("careersIntro", e.target.value.slice(0, 280))} />
        </Row>
        <Row label="Email sign-off" hint="Ends every email to candidates. Use {{sign_off}} in templates." htmlFor="signoff">
          <Textarea id="signoff" rows={2} value={b.emailSignOff} onChange={(e) => s.set("emailSignOff", e.target.value)} />
        </Row>
      </Group>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <Group title="Letters and emails" description="Your letterhead: at the top and bottom of offer letters (on screen and as PDF) and of every email to candidates.">
          {b.logoFileId && (
            <Row label="Name next to logo" hint="Turn off if your logo already shows your name.">
              <SwitchField label="Show your name beside the logo" checked={b.letterName !== false} onCheckedChange={(c) => s.set("letterName", c)} />
            </Row>
          )}
          <Row label="Contact details" hint="Your address, phone and website from Organisation settings, under your name.">
            <SwitchField label="Show contact details" checked={b.letterContact !== false} onCheckedChange={(c) => s.set("letterContact", c)} />
          </Row>
          <Row label="Footer" hint={`${(b.letterFooter ?? "").length} of 400 characters. Leave empty to use your registered name and number.`} htmlFor="footer">
            <Textarea
              id="footer"
              rows={3}
              value={b.letterFooter ?? ""}
              onChange={(e) => s.set("letterFooter", e.target.value.slice(0, 400))}
              placeholder="e.g. Registered name (Pvt) Ltd · Registration no. 1234/2019 · Directors: …"
            />
          </Row>
        </Group>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-fg-muted">Letterhead preview</p>
          {head ? (
            <div className="rounded-lg bg-ink-100 p-3" aria-label="Preview of the letterhead">
              <div className="rounded-xs bg-white px-5 py-6 text-[0.8125rem] text-ink-900 shadow-md">
                <LetterheadTop head={head} localLogo={localLogo} />
                <p className="text-ink-500">Dear Tariro,</p>
                <p className="mt-2 text-ink-500">Following your interviews, we are delighted to offer you the position of…</p>
                <LetterheadFooter head={head} />
              </div>
            </div>
          ) : (
            <Skeleton className="h-64 rounded-lg" />
          )}
        </div>
      </div>
      <SaveBar dirty={s.dirty} saving={s.saving} error={s.error} onSave={s.save} onDiscard={() => (s.discard(), setHex(null))} />
    </div>
  );
}

function Preview({ colour, headline, intro, logo }: { colour: string; headline: string; intro: string; logo: string | null }) {
  const name = useSession().organisation?.name ?? "";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-fg-muted">Careers page preview</p>
      <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-platter" aria-label="Preview of the careers page">
        <div className="flex items-center gap-2 px-4 py-3 text-white" style={{ background: colour }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- the organisation's uploaded logo
            <img src={logo} alt="" className="h-6 w-auto max-w-20 rounded-sm bg-white object-contain p-0.5" />
          ) : (
            <span className="grid size-6 place-items-center rounded-sm bg-white/20 text-2xs font-bold">{initials}</span>
          )}
          <span className="text-sm font-semibold">{name}</span>
          <span className="ml-auto text-xs opacity-80">Careers</span>
        </div>
        <div className="px-4 py-4">
          <p className="text-base leading-snug font-bold text-fg">{headline || "Your headline"}</p>
          <p className="mt-1.5 line-clamp-4 text-xs text-fg-muted">{intro}</p>
          <div className="mt-3 rounded-md border border-line px-3 py-2.5">
            <p className="text-sm font-semibold text-fg">Finance Manager</p>
            <p className="text-xs text-fg-subtle">Bulawayo · Full-time</p>
          </div>
          <span className="mt-3 inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold text-white" style={{ background: colour }}>
            See open roles
          </span>
        </div>
      </div>
    </div>
  );
}

const EVENTS: { id: NotificationEvent; label: string; hint: string }[] = [
  { id: "new_application", label: "New applications", hint: "For vacancies you own" },
  { id: "cv_processed", label: "CV batches processed", hint: "When extraction finishes or needs correction" },
  { id: "test_completed", label: "Test results ready", hint: "When a candidate finishes their tests" },
  { id: "interview_scheduled", label: "Interviews scheduled or changed", hint: "Panels you're on" },
  { id: "scorecard_due", label: "Scorecards due", hint: "Reminder 2 hours after an interview" },
  { id: "offer_approval", label: "Offers waiting for your approval", hint: "When it's your step" },
  { id: "offer_response", label: "Offer responses", hint: "Accepted, declined or countered" },
  { id: "mention", label: "Mentions", hint: "When someone @mentions you in a note" },
  { id: "weekly_digest", label: "Weekly summary", hint: "Open vacancies, pipeline and what needs you" },
];

export function NotificationsSection() {
  const { user } = useSession();
  const s = useSection("notifications");
  const n = s.draft;
  if (!n) return <SectionSkeleton />;
  const toggle = (id: NotificationEvent, ch: "app" | "email", v: boolean) => s.set("personal", { ...n.personal, [id]: { ...n.personal[id], [ch]: v } });
  return (
    <div className="flex flex-col gap-5">
      <Group title="What you're told about" description={`These are your own preferences${user ? `, ${user.name.split(" ")[0]}` : ""}. Each person sets theirs.`}>
        <div className="-mx-5 overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Event</TH>
                <TH className="w-24 text-center">In Vettly</TH>
                <TH className="w-24 text-center">Email</TH>
              </TR>
            </THead>
            <TBody>
              {EVENTS.map((e) => (
                <TR key={e.id}>
                  <TD>
                    <span className="block text-sm font-medium text-fg">{e.label}</span>
                    <span className="block text-xs text-fg-subtle">{e.hint}</span>
                  </TD>
                  <TD className="text-center">
                    <Checkbox checked={n.personal[e.id].app} onCheckedChange={(c) => toggle(e.id, "app", c === true)} aria-label={`${e.label} in Vettly`} />
                  </TD>
                  <TD className="text-center">
                    <Checkbox checked={n.personal[e.id].email} onCheckedChange={(c) => toggle(e.id, "email", c === true)} aria-label={`${e.label} by email`} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </Group>
      <Group title="Timing">
        <Row label="Weekly summary day">
          <Select value={n.digestDay} onValueChange={(v) => s.set("digestDay", v as typeof n.digestDay)} options={[{ value: "Monday", label: "Monday morning" }, { value: "Friday", label: "Friday afternoon" }]} className="max-w-xs" />
        </Row>
        <Row label="Quiet hours" hint="Emails between 18:00 and 07:00 wait until morning. Offer deadlines still come through.">
          <SwitchField label="Hold emails overnight" checked={n.quietHours} onCheckedChange={(c) => s.set("quietHours", c)} />
        </Row>
      </Group>
      <SaveBar dirty={s.dirty} saving={s.saving} error={s.error} onSave={s.save} onDiscard={s.discard} />
    </div>
  );
}

export function PrivacySection() {
  const s = useSection("privacy");
  const [requests, setRequests] = React.useState<DataRequest[] | null>(null);
  const [denied, setDenied] = React.useState<string | null>(null);
  const [loadedAt, setLoadedAt] = React.useState(0);
  React.useEffect(() => {
    services.settings
      .dataRequests()
      .then((r) => {
        setRequests(r);
        setLoadedAt(Date.now());
      })
      .catch((e: unknown) => setDenied(e instanceof Error ? e.message : "Data requests couldn't be loaded."));
  }, []);
  const p = s.draft;
  if (!p) return <SectionSkeleton />;
  return (
    <div className="flex flex-col gap-5">
      <Group title="Data requests" description="People can ask to see, correct or delete what you hold about them. Answer within 30 days.">
        {denied ? (
          <p className="text-sm text-fg-muted">{denied}</p>
        ) : !requests ? (
          <Skeleton className="h-24 rounded-md" />
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {requests.map((r) => {
              const overdueSoon = r.status === "open" && new Date(r.dueAt).getTime() - loadedAt < 20 * 86400000;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg">
                      {r.kind === "access" ? "Access" : r.kind === "deletion" ? "Deletion" : "Correction"} request · {r.person}
                    </p>
                    <p className="text-xs text-fg-subtle">
                      Received {shortDate(r.receivedAt)} · {r.status === "open" ? `due ${shortDate(r.dueAt)}` : "completed"}
                    </p>
                  </div>
                  {r.status === "open" ? (
                    <>
                      <Badge tone={overdueSoon ? "accent" : "neutral"} size="sm" dot={overdueSoon}>
                        Open
                      </Badge>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          const done = await services.settings.completeRequest(r.id);
                          setRequests((rs) => rs!.map((x) => (x.id === r.id ? done : x)));
                          toast.success("Request marked complete", `${r.person}. Recorded in the audit log.`);
                        }}
                      >
                        Mark complete
                      </Button>
                    </>
                  ) : (
                    <Badge tone="success" size="sm">
                      <Check />
                      Done
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Group>
      <Group title="Retention" description="Vettly deletes data automatically when these periods end. Hired people move to your HR system and leave Vettly.">
        <Row label="Unsuccessful applicants" hint="Then their CV, notes and test results are deleted.">
          <Select value={String(p.unsuccessfulMonths)} onValueChange={(v) => s.set("unsuccessfulMonths", Number(v))} options={[6, 12, 18, 24].map((m) => ({ value: String(m), label: `${m} months after the vacancy closes` }))} className="max-w-sm" />
        </Row>
        <Row label="Talent pool consent" hint="People are asked to renew before it lapses. Lapsed records are hidden from search.">
          <Select value={String(p.talentConsentMonths)} onValueChange={(v) => s.set("talentConsentMonths", Number(v))} options={[6, 12, 24].map((m) => ({ value: String(m), label: `${m} months` }))} className="max-w-xs" />
        </Row>
        <Row label="Rules applied">
          <div className="flex flex-wrap gap-1.5">
            {["Zimbabwe Cyber and Data Protection Act", "South Africa POPIA", "Botswana Data Protection Act", "Zambia Data Protection Act"].map((f) => {
              const on = p.frameworks.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={on}
                  onClick={() => s.set("frameworks", on ? p.frameworks.filter((x) => x !== f) : [...p.frameworks, f])}
                  className={cn("inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors", on ? "border-primary-600 bg-primary-50 text-primary-800" : "border-line text-fg-muted hover:border-line-strong")}
                >
                  {on ? <Check className="size-3" /> : <X className="size-3 opacity-0" />}
                  {f}
                </button>
              );
            })}
          </div>
        </Row>
      </Group>
      <Group title="Equal-opportunity information" description="Optional questions that make the fairness report possible. Answers are only ever reported as anonymous totals.">
        <Row label="Ask applicants" hint="Off means the fairness report has nothing to show.">
          <SwitchField label="Ask for gender and age group" checked={p.collectEqualOpportunity} onCheckedChange={(c) => s.set("collectEqualOpportunity", c)} />
        </Row>
        <Row label="What applicants read" htmlFor="eo">
          <Textarea id="eo" rows={3} value={p.equalOpportunityWording} onChange={(e) => s.set("equalOpportunityWording", e.target.value)} disabled={!p.collectEqualOpportunity} />
        </Row>
      </Group>
      <Group title="Contacts">
        <Row label="Privacy notice" hint="Linked from every application form." htmlFor="notice">
          <Input id="notice" value={p.privacyNoticeUrl} onChange={(e) => s.set("privacyNoticeUrl", e.target.value)} />
        </Row>
        <Row label="Data protection officer">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input aria-label="Name" value={p.dpoName} onChange={(e) => s.set("dpoName", e.target.value)} />
            <Input aria-label="Email" value={p.dpoEmail} onChange={(e) => s.set("dpoEmail", e.target.value)} />
          </div>
        </Row>
      </Group>
      <SaveBar dirty={s.dirty} saving={s.saving} error={s.error} onSave={s.save} onDiscard={s.discard} />
    </div>
  );
}
