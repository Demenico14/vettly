"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Send, X } from "@/components/icons";
import { Alert, Button, Card, CardHeader, Checkbox, Field, Input, Select, Skeleton, Textarea, toast } from "@/components/ui";
import { PageContainer, PageTitle } from "@/components/layout/page-header";
import { services, type Band } from "@/services";
import type { Vacancy } from "@/types";
import type { Approval, ContractType, Offer, OfferTerms } from "@/types/offers";
import { cn } from "@/lib/utils";
import { BandBar, money, totalPay } from "./meta";
import { LetterView } from "./letter-view";

type Source = { mode: "new"; candidateId: string; vacancyId: string } | { mode: "edit"; offerId: string };
type Letter = { heading: string | null; body: string }[];

export function OfferEditor(props: Source) {
  const router = useRouter();
  const [terms, setTerms] = React.useState<OfferTerms | null>(null);
  const [vacancy, setVacancy] = React.useState<Vacancy | null>(null);
  const [name, setName] = React.useState("");
  const [expected, setExpected] = React.useState<string | null>(null);
  const [existing, setExisting] = React.useState<Offer | null>(null);
  const [offer, setOffer] = React.useState<Offer | null>(null);
  const [preview, setPreview] = React.useState<{ letter: Letter; approvals: Approval[]; band: Band } | null>(null);
  const [newBenefit, setNewBenefit] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"draft" | "submit" | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (props.mode === "new") {
      services.offers
        .defaults(props.candidateId, props.vacancyId)
        .then((d) => {
          setTerms(d.terms);
          setVacancy(d.vacancy);
          setName(d.candidateName);
          setExpected(d.expectedSalary);
          setExisting(d.existing);
        })
        .catch((e: Error) => setLoadError(e.message));
    } else {
      services.offers
        .get(props.offerId)
        .then((d) => {
          setOffer(d.view.offer);
          setTerms(d.view.offer.terms);
          setVacancy(d.vacancy);
          setName(d.view.offer.candidateName);
          setExpected(d.view.expectedSalary);
        })
        .catch((e: Error) => setLoadError(e.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per source
  }, []);

  // Live letter and approval chain.
  React.useEffect(() => {
    if (!terms || !vacancy) return;
    const t = setTimeout(() => services.offers.preview(vacancy.id, name, terms).then(setPreview), 250);
    return () => clearTimeout(t);
  }, [terms, vacancy, name]);

  if (loadError)
    return (
      <PageContainer>
        <Alert tone="danger" title="Offer not available">
          {loadError}
        </Alert>
      </PageContainer>
    );
  if (!terms || !vacancy)
    return (
      <PageContainer>
        <Skeleton className="mt-6 h-[32rem] rounded-lg" />
      </PageContainer>
    );

  const set = (patch: Partial<OfferTerms>) => setTerms((t) => (t ? { ...t, ...patch } : t));
  const countered = offer?.status === "countered";
  const back = props.mode === "edit" ? `/offers/${props.offerId}` : "/offers";

  const save = async (submit: boolean) => {
    setBusy(submit ? "submit" : "draft");
    setError(null);
    try {
      const o = props.mode === "new" ? await services.offers.create(props.candidateId, props.vacancyId, terms, submit) : await services.offers.update(props.offerId, terms, submit);
      toast.success(submit ? "Submitted for approval" : "Draft saved", submit ? `First approver: ${o.approvals.find((a) => a.status === "pending")?.approverName}` : name);
      router.push(`/offers/${o.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Not saved.");
      setBusy(null);
    }
  };

  return (
    <PageContainer
      header={
        <div>
          <Link href={back} className="inline-flex items-center gap-1 text-sm font-medium text-fg-subtle hover:text-fg">
            <ArrowLeft className="size-4" />
            {props.mode === "edit" ? "Offer" : "Offers"}
          </Link>
          <PageTitle className="mt-4">
            {countered ? `Revise the offer for ${name}` : props.mode === "edit" ? `Edit offer for ${name}` : `New offer for ${name}`}
          </PageTitle>
          <p className="mt-1.5 text-md text-fg-muted">
            {vacancy.title} · {vacancy.department} · {vacancy.location}
            {expected && ` · expects ${expected}`}
          </p>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] xl:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          {existing && (
            <Alert tone="warning" title={`${name} already has an offer for this vacancy`} action={<Button size="sm" variant="secondary" asChild><Link href={`/offers/${existing.id}`}>Open it</Link></Button>}>
              Revise or withdraw that offer rather than creating a second one.
            </Alert>
          )}
          {countered && offer?.response && (
            <Alert tone="info" title={`Counter-offer: this becomes version ${offer.version + 1}`}>
              {offer.response.note}
              {offer.response.requestedSalary ? ` Asked for ${money(terms.currency, offer.response.requestedSalary)}.` : ""}
              {offer.response.requestedStartDate ? ` Asked to start on ${offer.response.requestedStartDate}.` : ""} It goes through approval again.
            </Alert>
          )}

          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-fg">Role</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Job title" required>
                <Input value={terms.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} />
              </Field>
              <Field label="Reports to">
                <Input value={terms.reportsTo} onChange={(e) => set({ reportsTo: e.target.value })} />
              </Field>
              <Field label="Contract">
                <Select value={terms.contractType} onValueChange={(v) => set({ contractType: v as ContractType })} options={["Permanent", "Fixed term (12 months)", "Fixed term (24 months)"].map((v) => ({ value: v, label: v }))} />
              </Field>
              <Field label="Work pattern">
                <Select value={terms.workMode} onValueChange={(v) => set({ workMode: v })} options={["On-site", "Hybrid", "Remote"].map((v) => ({ value: v, label: v }))} />
              </Field>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-fg">Pay</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <Field label={`Basic salary (${terms.currency})`} required hint={expected ? `Candidate expects ${expected}.` : undefined}>
                <Input type="number" inputMode="numeric" min={0} step={50} value={terms.baseSalary || ""} onChange={(e) => set({ baseSalary: Number(e.target.value) })} />
              </Field>
              <Field label="Per">
                <Select value={terms.payPeriod} onValueChange={(v) => set({ payPeriod: v as OfferTerms["payPeriod"] })} options={[{ value: "month", label: "Month" }, { value: "year", label: "Year" }]} />
              </Field>
            </div>
            {preview && <BandBar band={preview.band} value={terms.baseSalary} className="mt-4" />}
            {preview?.band.position === "above" && <p className="mt-2 text-xs font-medium text-warning-700">Above the band: the CFO is added to the approvals.</p>}

            <p className="mt-5 text-sm font-semibold text-fg">Allowances</p>
            <ul className="mt-2 flex flex-col gap-2">
              {terms.allowances.map((a, i) => (
                <li key={i} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] items-center gap-2">
                  <Input aria-label="Allowance name" value={a.name} onChange={(e) => set({ allowances: terms.allowances.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                  <Input aria-label={`${a.name} amount`} type="number" min={0} step={10} value={a.amount || ""} onChange={(e) => set({ allowances: terms.allowances.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)) })} />
                  <Button size="icon-sm" variant="ghost" aria-label={`Remove ${a.name}`} onClick={() => set({ allowances: terms.allowances.filter((_, j) => j !== i) })}>
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
            <Button size="sm" variant="ghost" className="mt-1" onClick={() => set({ allowances: [...terms.allowances, { name: "", amount: 0 }] })}>
              <Plus />
              Add allowance
            </Button>
            <p className="mt-3 rounded-md bg-ink-50 px-3 py-2 text-sm text-fg">
              Total guaranteed pay: <span className="font-semibold tabular">{money(terms.currency, totalPay(terms))}</span> per {terms.payPeriod}
            </p>

            <p className="mt-5 text-sm font-semibold text-fg">Benefits</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {[...new Set([...vacancy.benefits, ...terms.benefits])].map((b) => (
                <li key={b}>
                  <label className="flex items-center gap-2 text-sm text-fg">
                    <Checkbox checked={terms.benefits.includes(b)} onCheckedChange={(v) => set({ benefits: v === true ? [...terms.benefits, b] : terms.benefits.filter((x) => x !== b) })} />
                    {b}
                  </label>
                </li>
              ))}
            </ul>
            <form
              className="mt-2 flex max-w-md gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newBenefit.trim()) return;
                set({ benefits: [...terms.benefits, newBenefit.trim()] });
                setNewBenefit("");
              }}
            >
              <Input value={newBenefit} onChange={(e) => setNewBenefit(e.target.value)} placeholder="Add a benefit for this offer" aria-label="Add a benefit" />
              <Button type="submit" variant="secondary" disabled={!newBenefit.trim()}>
                Add
              </Button>
            </form>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-fg">Dates and response</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Start date" required className="col-span-2">
                <Input type="date" value={terms.startDate} onChange={(e) => set({ startDate: e.target.value })} />
              </Field>
              <Field label="Probation">
                <Select value={String(terms.probationMonths)} onValueChange={(v) => set({ probationMonths: Number(v) })} options={[0, 3, 6].map((n) => ({ value: String(n), label: n ? `${n} months` : "None" }))} />
              </Field>
              <Field label="Notice">
                <Select value={String(terms.noticePeriodMonths)} onValueChange={(v) => set({ noticePeriodMonths: Number(v) })} options={[1, 2, 3].map((n) => ({ value: String(n), label: `${n} month${n > 1 ? "s" : ""}` }))} />
              </Field>
              <Field label="Time to respond" className="col-span-2">
                <Select value={String(terms.validDays)} onValueChange={(v) => set({ validDays: Number(v) })} options={[3, 5, 7, 10, 14].map((n) => ({ value: String(n), label: `${n} days` }))} />
              </Field>
            </div>
            <Field label="Personal note" optional className="mt-4" hint="Appears in the letter above the sign-off.">
              <Textarea rows={2} value={terms.personalNote} onChange={(e) => set({ personalNote: e.target.value })} placeholder="e.g. The panel was impressed by your consolidation work at Innscor." />
            </Field>
          </Card>

          {error && (
            <Alert tone="danger" title="Not saved">
              {error}
            </Alert>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" loading={busy === "draft"} onClick={() => save(false)} disabled={!!existing}>
              Save draft
            </Button>
            <Button loading={busy === "submit"} onClick={() => save(true)} disabled={!!existing}>
              <Send />
              Submit for approval
            </Button>
          </div>
        </div>

        <aside className="flex flex-col gap-5 xl:sticky xl:top-16">
          <Card>
            <CardHeader title="Approvals needed" description="In this order. You can't send the offer until all approve." />
            <ol className="flex flex-col gap-2 px-5 pb-5">
              {(preview?.approvals ?? []).map((a) => (
                <li key={a.step} className="flex items-start gap-3 text-sm">
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold", a.step === 3 ? "bg-warning-50 text-warning-700" : "bg-ink-100 text-fg-muted")}>{a.step}</span>
                  <span>
                    <span className="font-semibold text-fg">{a.approverName}</span> <span className="text-fg-muted">· {a.role}</span>
                    <span className="block text-xs text-fg-subtle">{a.reason}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
          <LetterView letter={preview?.letter ?? null} title={`Letter preview · ${name}`} />
        </aside>
      </div>
    </PageContainer>
  );
}
