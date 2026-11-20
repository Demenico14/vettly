"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@/components/icons";
import { Badge, Button, Field, Input, Modal, ModalClose, ModalContent, Select, Skeleton, Textarea, toast } from "@/components/ui";
import { services, consentValid, MOCK_NOW } from "@/services";
import type { Availability, Vacancy } from "@/types";
import type { CountryCode } from "@/types/psychometrics";
import type { Collection, TalentFilters, TalentHit, TestFilterFamily } from "@/types/talent";
import { cn } from "@/lib/utils";

export const COUNTRY: Record<CountryCode, string> = { ZW: "Zimbabwe", ZA: "South Africa", ZM: "Zambia", BW: "Botswana" };
export const AVAILABILITY: Availability[] = ["Immediately", "2 weeks' notice", "1 month's notice", "3 months' notice"];
export const SOURCES = ["Past applicant", "Referral", "Sourced on LinkedIn", "Careers fair", "Speculative CV", "Alumni", "Active applicant"];
export const TEST_FAMILY: Record<TestFilterFamily, string> = {
  numerical: "Numerical reasoning",
  verbal: "Verbal reasoning",
  inductive: "Inductive reasoning",
  sjt: "Situational judgement",
  any_ability: "Any ability or judgement test",
};

const NOW = new Date(MOCK_NOW).getTime();
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
export function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${n % 10 > 3 ? "th" : s}`;
}

/** How many filters differ from the defaults, for the mobile Filters button. */
export function activeCount(f: TalentFilters) {
  return (
    f.skills.length +
    (f.minLevel ? 1 : 0) +
    (f.minYears ? 1 : 0) +
    f.countries.length +
    f.availability.length +
    f.sources.length +
    (f.test ? 1 : 0) +
    (f.relocation ? 1 : 0) +
    (f.consentValidOnly ? 0 : 1) +
    (f.includeApplicants ? 0 : 1)
  );
}

/** One line describing a saved or active search. */
export function describe(f: TalentFilters) {
  const parts = [
    f.query && `“${f.query}”`,
    f.skills.length && f.skills.join(" + "),
    f.minLevel && `${f.minLevel.toLowerCase()} or above`,
    f.minYears && `${f.minYears}+ years`,
    f.countries.length && f.countries.map((c) => COUNTRY[c]).join(", "),
    f.availability.length && f.availability.join(" or "),
    f.test && `${TEST_FAMILY[f.test.family].toLowerCase()} ${ordinal(f.test.min)} percentile or above`,
    f.relocation && "open to relocating",
    !f.includeApplicants && "talent pool only",
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Everyone in the pool";
}

export function ConsentBadge({ until }: { until: string | null }) {
  if (!until) return null;
  if (!consentValid(until)) return <Badge tone="accent" size="sm" dot>Consent lapsed {shortDate(until)}</Badge>;
  const days = Math.round((new Date(until).getTime() - NOW) / 86400000);
  return days <= 45 ? <Badge tone="warning" size="sm">Consent ends in {days} days</Badge> : null;
}

export function TestChips({ hit, highlight }: { hit: Pick<TalentHit, "tests">; highlight?: TalentFilters["test"] }) {
  if (!hit.tests.length) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {hit.tests.map((t) => {
        const on = highlight && t.percentile >= highlight.min && (highlight.family === "any_ability" || t.testId.includes(highlight.family === "numerical" ? "num" : highlight.family === "verbal" ? "verb" : highlight.family));
        return (
          <span key={t.testId} className={cn("inline-flex h-6 items-center gap-1 rounded-sm px-2 text-xs", on ? "bg-success-50 font-semibold text-success-700" : "bg-ink-100 text-ink-700")}>
            {chipLabel(t.testId)}
            <span className="tabular">{ordinal(t.percentile)}</span>
          </span>
        );
      })}
    </span>
  );
}

function chipLabel(testId: string) {
  return testId.includes("num") ? "Numerical" : testId.includes("verb") ? "Verbal" : testId.includes("inductive") ? "Inductive" : testId.includes("sjt") ? "Judgement" : "Ability";
}

/** Add one or more people to an existing or new collection. */
export function AddToCollectionDialog({
  open,
  onOpenChange,
  people,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  people: { id: string; kind: "talent" | "candidate"; name: string }[];
  onAdded?: () => void;
}) {
  const [cols, setCols] = React.useState<Collection[] | null>(null);
  const [target, setTarget] = React.useState("");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    services.talent.collections().then((c) => {
      setCols(c);
      setTarget((t) => t || c[0]?.id || "new");
    });
  }, [open]);

  const who = people.length === 1 ? people[0]!.name : `${people.length} people`;
  async function save() {
    setBusy(true);
    setError(null);
    try {
      let id = target;
      let label = cols?.find((c) => c.id === target)?.name ?? "";
      if (target === "new") {
        const c = await services.talent.createCollection(name, description);
        id = c.id;
        label = c.name;
      }
      const r = await services.talent.addToCollection(id, people.map(({ id, kind }) => ({ id, kind })));
      toast.success(r.added ? `Added ${r.added === 1 && people.length === 1 ? who : `${r.added} ${r.added === 1 ? "person" : "people"}`} to ${label}` : `Already in ${label}`, r.already && r.added ? `${r.already} were already there.` : undefined);
      onOpenChange(false);
      setName("");
      setDescription("");
      onAdded?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        size="sm"
        title="Add to collection"
        description={`Keep ${who} on a shortlist you and your team can come back to.`}
        footer={
          <>
            <ModalClose asChild>
              <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <Button onClick={save} loading={busy} disabled={!target || (target === "new" && !name.trim())}>
              Add
            </Button>
          </>
        }
      >
        {!cols ? (
          <Skeleton className="h-10 rounded-md" />
        ) : (
          <div className="flex flex-col gap-4">
            <Field label="Collection">
              <Select
                value={target}
                onValueChange={setTarget}
                options={[...cols.map((c) => ({ value: c.id, label: c.name, description: `${c.members.length} ${c.members.length === 1 ? "person" : "people"}` })), { value: "new", label: "New collection…" }]}
              />
            </Field>
            {target === "new" && (
              <>
                <Field label="Name" error={error ?? undefined}>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Treasury specialists" autoFocus />
                </Field>
                <Field label="What it's for" optional>
                  <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Who belongs here and when you'd call them" />
                </Field>
              </>
            )}
            {target !== "new" && error && <p className="text-sm text-danger-700">{error}</p>}
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}

/** Turn a talent record into a candidate on an open vacancy. */
export function AddToVacancyDialog({ open, onOpenChange, person, defaultVacancy, onAdded }: { open: boolean; onOpenChange: (o: boolean) => void; person: { id: string; name: string } | null; defaultVacancy?: string; onAdded?: (candidateId: string) => void }) {
  const router = useRouter();
  const [vacs, setVacs] = React.useState<Vacancy[] | null>(null);
  const [v, setV] = React.useState(defaultVacancy ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (open) services.vacancies.list().then((all) => setVacs(all.filter((x) => x.status === "open")));
  }, [open]);

  async function add() {
    if (!person) return;
    setBusy(true);
    setError(null);
    try {
      const id = await services.talent.addToVacancy(person.id, v);
      const title = vacs?.find((x) => x.id === v)?.title;
      toast.success(`${person.name} added to ${title}`, "They're now a candidate at the Applied stage. Their CV can be assessed from Matching.");
      onOpenChange(false);
      onAdded?.(id);
      router.push(`/candidates/${id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        size="sm"
        title={`Add ${person?.name ?? ""} to a vacancy`}
        description="They become a candidate at the Applied stage. Tell them first: they haven't applied themselves."
        footer={
          <>
            <ModalClose asChild>
              <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <Button onClick={add} loading={busy} disabled={!v}>
              <Plus />
              Add as candidate
            </Button>
          </>
        }
      >
        {!vacs ? (
          <Skeleton className="h-10 rounded-md" />
        ) : (
          <Field label="Vacancy" error={error ?? undefined}>
            <Select value={v} onValueChange={setV} placeholder="Choose an open vacancy" options={vacs.map((x) => ({ value: x.id, label: x.title, description: x.location }))} />
          </Field>
        )}
      </ModalContent>
    </Modal>
  );
}
