"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, CalendarPlus, Check, Eye, Pencil, RefreshCw, Send, UserRound, X } from "@/components/icons";
import { Alert, Avatar, Button, Card, CardHeader, Checkbox, Field, Input, Modal, ModalClose, ModalContent, Select, Skeleton, Textarea, toast } from "@/components/ui";
import { PageContainer, PageTitle } from "@/components/layout/page-header";
import { StageBadge } from "@/components/domain/status-badge";
import { services, MOCK_NOW, type OfferView } from "@/services";
import type { ApplicationStage, Vacancy } from "@/types";
import type { CandidateResponse, Offer } from "@/types/offers";
import { cn } from "@/lib/utils";
import { BandBar, OfferBadge, money, shortDate, totalPay } from "./meta";
import { LetterView } from "./letter-view";

type Data = { view: OfferView; letter: { heading: string | null; body: string }[]; vacancy: Vacancy };
type Dialog = "approve" | "send_back" | "send" | "respond" | "withdraw" | "extend" | null;
const ME = "Tendai Moyo";
const NOW = new Date(MOCK_NOW).getTime();
const when = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function OfferDetail({ id }: { id: string }) {
  const [data, setData] = React.useState<Data | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const [hired, setHired] = React.useState<{ others: { candidateId: string; name: string; stage: ApplicationStage }[]; filled: boolean } | null>(null);

  React.useEffect(() => {
    let alive = true;
    services.offers
      .get(id)
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [id, reload]);
  const refresh = () => setReload((r) => r + 1);
  const act = async (fn: () => Promise<unknown>, ok: string, detail?: string) => {
    try {
      await fn();
      toast.success(ok, detail);
      refresh();
    } catch (e) {
      toast.error("Not done", e instanceof Error ? e.message : undefined);
    }
  };

  const back = (
    <Link href="/offers" className="inline-flex items-center gap-1 text-sm font-medium text-fg-subtle hover:text-fg">
      <ArrowLeft className="size-4" />
      Offers
    </Link>
  );
  if (error)
    return (
      <PageContainer>
        {back}
        <Alert tone="danger" title="Offer not available" className="mt-4" action={<Button size="sm" variant="secondary" onClick={refresh}><RefreshCw />Try again</Button>}>
          {error}
        </Alert>
      </PageContainer>
    );
  if (!data)
    return (
      <PageContainer>
        <Skeleton className="mt-6 h-96 rounded-lg" />
      </PageContainer>
    );

  const { view: v, vacancy } = data;
  const o = v.offer;
  const t = o.terms;
  const pending = o.approvals.find((a) => a.status === "pending");
  const preHireLeft = o.checklist.filter((i) => i.phase === "before_hire" && i.required && !i.done);

  return (
    <PageContainer
      header={
        <div>
          {back}
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar name={o.candidateName} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <PageTitle>{o.candidateName}</PageTitle>
                  <OfferBadge offer={o} size="md" />
                </div>
                <p className="mt-1.5 text-md text-fg-muted">
                  {t.jobTitle} · {money(t.currency, t.baseSalary)} per {t.payPeriod} · starts {shortDate(t.startDate)}
                  {o.version > 1 && ` · version ${o.version}`}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {(o.status === "draft" || o.status === "countered") && (
                <Button asChild>
                  <Link href={`/offers/${o.id}/edit`}>
                    <Pencil />
                    {o.status === "countered" ? "Revise offer" : "Edit and submit"}
                  </Link>
                </Button>
              )}
              {o.status === "pending_approval" && pending && (
                <>
                  <Button onClick={() => setDialog("approve")}>
                    <Check />
                    {pending.approverName === ME ? "Approve" : `Record ${pending.approverName.split(" ")[0]}'s approval`}
                  </Button>
                  <Button variant="secondary" onClick={() => setDialog("send_back")}>
                    Send back
                  </Button>
                </>
              )}
              {o.status === "approved" && (
                <Button onClick={() => setDialog("send")}>
                  <Send />
                  Send to {o.candidateName.split(" ")[0]}
                </Button>
              )}
              {(o.status === "sent" || o.status === "viewed") && (
                <>
                  <Button onClick={() => setDialog("respond")}>Record response</Button>
                  <Button variant="secondary" onClick={() => setDialog("extend")}>
                    <CalendarPlus />
                    Extend
                  </Button>
                </>
              )}
              {o.status === "expired" && (
                <Button onClick={() => setDialog("extend")}>
                  <CalendarPlus />
                  Reopen with a new deadline
                </Button>
              )}
              {["draft", "pending_approval", "approved", "sent", "viewed", "countered"].includes(o.status) && (
                <Button variant="ghost" className="text-danger-700" onClick={() => setDialog("withdraw")}>
                  <X />
                  Withdraw
                </Button>
              )}
            </div>
          </div>
          <Progress offer={o} />
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <StatusMessage offer={o} view={v} onSimulateOpen={() => act(() => services.offers.markViewed(o.id), "Recorded: candidate opened the offer")} />

          {o.status === "accepted" && !o.hiredAt && (
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-semibold text-fg">Ready to hire?</h2>
              <p className="mt-0.5 text-sm text-fg-muted">
                {preHireLeft.length ? `Finish ${preHireLeft.length} pre-hire check${preHireLeft.length > 1 ? "s" : ""} in the checklist first.` : "All pre-hire checks are done. Marking as hired moves the candidate to Hired and updates the vacancy."}
              </p>
              <Button
                className="mt-4"
                disabled={preHireLeft.length > 0}
                onClick={async () => {
                  try {
                    const r = await services.offers.hire(o.id);
                    setHired({ others: r.others, filled: r.filled });
                    toast.success(`${o.candidateName} hired`, `Starts ${shortDate(t.startDate)}`);
                    refresh();
                  } catch (e) {
                    toast.error("Not hired", e instanceof Error ? e.message : undefined);
                  }
                }}
              >
                <BadgeCheck />
                Mark as hired
              </Button>
            </Card>
          )}

          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-fg">Terms</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {[
                ["Basic salary", `${money(t.currency, t.baseSalary)} / ${t.payPeriod}`],
                ["Total guaranteed", `${money(t.currency, totalPay(t))} / ${t.payPeriod}`],
                ["Allowances", t.allowances.length ? t.allowances.map((a) => `${a.name} ${money(t.currency, a.amount)}`).join(", ") : "None"],
                ["Contract", t.contractType],
                ["Work pattern", `${t.workMode}, ${t.location}`],
                ["Reports to", t.reportsTo],
                ["Start date", shortDate(t.startDate)],
                ["Probation", t.probationMonths ? `${t.probationMonths} months` : "None"],
                ["Notice", `${t.noticePeriodMonths} month${t.noticePeriodMonths > 1 ? "s" : ""}`],
              ].map(([k, val]) => (
                <div key={k}>
                  <dt className="text-xs text-fg-subtle">{k}</dt>
                  <dd className="mt-0.5 font-medium text-fg">{val}</dd>
                </div>
              ))}
            </dl>
            <BandBar band={v.band} value={t.baseSalary} className="mt-5" />
            {o.previous.length > 0 && (
              <p className="mt-3 text-xs text-fg-muted">
                Earlier: {o.previous.map((p) => `version ${p.version} at ${money(t.currency, p.baseSalary)}, starting ${shortDate(p.startDate)} (${p.status})`).join("; ")}.
              </p>
            )}
          </Card>

          <LetterView letter={data.letter} title={`Offer letter · version ${o.version}`} />
        </div>

        <aside className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Candidate" />
            <div className="flex flex-col gap-2 px-5 pb-5 text-sm">
              {v.stage && <StageBadge stage={v.stage} size="sm" />}
              <dl className="flex flex-col gap-1 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-subtle">Expects</dt>
                  <dd className="text-fg">{v.expectedSalary ?? "Not stated"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-subtle">Current employer</dt>
                  <dd className="text-fg">{v.currentEmployer ?? "Not employed"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-fg-subtle">Notice</dt>
                  <dd className="text-fg">{v.availability}</dd>
                </div>
              </dl>
              <Button size="sm" variant="secondary" className="mt-1 self-start" asChild>
                <Link href={`/candidates/${o.candidateId}`}>
                  <UserRound />
                  Profile
                </Link>
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Approvals" />
            <ol className="flex flex-col gap-3 px-5 pb-5">
              {o.approvals.map((a) => (
                <li key={a.step} className="flex items-start gap-3 text-sm">
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                      a.status === "approved" ? "bg-success-50 text-success-700" : a.status === "rejected" ? "bg-danger-50 text-danger-700" : a.status === "pending" ? "bg-warning-50 text-warning-700" : "bg-ink-100 text-fg-subtle",
                    )}
                  >
                    {a.status === "approved" ? <Check className="size-3.5" /> : a.status === "rejected" ? <X className="size-3.5" /> : a.step}
                  </span>
                  <span className="min-w-0">
                    <span className="font-semibold text-fg">{a.approverName}</span>
                    <span className="block text-xs text-fg-subtle">{a.role}</span>
                    <span className={cn("block text-xs", a.status === "pending" ? "font-semibold text-warning-700" : "text-fg-muted")}>
                      {a.status === "approved" ? `Approved ${a.at ? when(a.at) : ""}` : a.status === "rejected" ? `Sent back ${a.at ? when(a.at) : ""}` : a.status === "pending" ? "Waiting" : "Next"}
                    </span>
                    {a.note && <span className="mt-0.5 block text-xs text-fg-muted">&ldquo;{a.note}&rdquo;</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          {(o.status === "accepted" || o.hiredAt) && <Checklist offer={o} onChange={refresh} />}

          <Card>
            <CardHeader title="History" />
            <ol className="flex flex-col gap-2.5 px-5 pb-5 text-xs">
              {[...o.history].reverse().map((h, i) => (
                <li key={i}>
                  <p className="text-fg">
                    <span className="font-semibold">{h.text}</span> · {h.by}
                  </p>
                  <p className="text-fg-subtle tabular">{when(h.at)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>

      <Dialogs dialog={dialog} offer={o} vacancy={vacancy} onClose={() => setDialog(null)} onDone={refresh} />
      <HiredDialog result={hired} offer={o} onClose={() => setHired(null)} />
    </PageContainer>
  );
}

function Progress({ offer: o }: { offer: Offer }) {
  const steps = ["Draft", "Approved", "Sent", "Response", "Hired"];
  const reached = o.hiredAt ? 4 : ["accepted", "declined", "countered"].includes(o.status) ? 3 : ["sent", "viewed", "expired"].includes(o.status) ? 2 : o.status === "approved" ? 1 : 0;
  return (
    <ol className="mt-6 grid grid-cols-5 gap-1.5" aria-label="Offer progress">
      {steps.map((s, i) => (
        <li key={s} className="flex flex-col gap-1.5">
          <span className={cn("h-1 rounded-full", i <= reached ? (o.status === "declined" || o.status === "withdrawn" || o.status === "expired" ? "bg-ink-400" : "bg-primary-600") : "bg-ink-200")} />
          <span className={cn("text-2xs font-semibold", i <= reached ? "text-fg" : "text-fg-subtle")} aria-current={i === reached ? "step" : undefined}>
            {s}
          </span>
        </li>
      ))}
    </ol>
  );
}

function StatusMessage({ offer: o, view: v, onSimulateOpen }: { offer: Offer; view: OfferView; onSimulateOpen: () => void }) {
  const hours = o.expiresAt ? Math.round((new Date(o.expiresAt).getTime() - NOW) / 3600000) : null;
  if (o.hiredAt)
    return (
      <Alert tone="success" title={`Hired by ${o.hiredBy}`}>
        Starts {shortDate(o.terms.startDate)}.{" "}
        {(() => {
          const n = o.checklist.filter((i) => i.phase === "before_start" && i.required && !i.done).length;
          return n ? `${n} required ${n === 1 ? "task" : "tasks"} left before day one.` : "Everything is ready for day one.";
        })()}
      </Alert>
    );
  if (o.status === "pending_approval") {
    const p = o.approvals.find((a) => a.status === "pending");
    return (
      <Alert tone="warning" title={v.myApprovalStep ? "Waiting for your approval" : `Waiting for ${p?.approverName}`}>
        {p?.reason}. Prototype: you can record other approvers&apos; decisions to move the offer on.
      </Alert>
    );
  }
  if (o.status === "draft" && o.approvals.some((a) => a.status === "rejected")) {
    const r = o.approvals.find((a) => a.status === "rejected")!;
    return (
      <Alert tone="danger" title={`Sent back by ${r.approverName}`}>
        {r.note} Edit the offer and submit it again.
      </Alert>
    );
  }
  if (o.status === "sent" || o.status === "viewed")
    return (
      <Alert
        tone="info"
        title={o.status === "viewed" ? `${o.candidateName.split(" ")[0]} opened the offer ${o.viewedAt ? when(o.viewedAt) : ""}` : "Sent, not opened yet"}
        action={o.status === "sent" ? <Button size="sm" variant="ghost" onClick={onSimulateOpen}><Eye />Simulate opening</Button> : undefined}
      >
        Reply due {o.expiresAt ? `${shortDate(o.expiresAt)} at 17:00` : ""}
        {hours !== null && hours < 72 ? ` (${Math.max(0, hours)} hours left)` : ""}. Record the response here when they reply by email, phone or signed letter.
      </Alert>
    );
  if (o.status === "countered" && o.response)
    return (
      <Alert tone="warning" title="Counter-offer">
        {o.response.note}
        {o.response.requestedSalary ? ` Asked for ${money(o.terms.currency, o.response.requestedSalary)} (${o.response.requestedSalary > (v.band.max ?? Infinity) ? "above the band" : "within the band"}).` : ""}
        {o.response.requestedStartDate ? ` Asked to start ${shortDate(o.response.requestedStartDate)}.` : ""}
      </Alert>
    );
  if (o.status === "accepted" && o.response)
    return (
      <Alert tone="success" title={`Accepted ${when(o.response.at)}`}>
        {o.response.note}
      </Alert>
    );
  if (o.status === "declined" && o.response)
    return (
      <Alert tone="danger" title="Declined">
        {o.response.declineReason ? `${o.response.declineReason}. ` : ""}
        {o.response.note}
      </Alert>
    );
  if (o.status === "withdrawn")
    return (
      <Alert tone="info" title="Withdrawn">
        {o.withdrawnReason}
      </Alert>
    );
  if (o.status === "expired")
    return (
      <Alert tone="danger" title="Expired without a response">
        Reopen it with a new deadline, or withdraw it.
      </Alert>
    );
  return null;
}

function Checklist({ offer: o, onChange }: { offer: Offer; onChange: () => void }) {
  return (
    <Card>
      <CardHeader title="Hiring checklist" description="Pre-hire checks must be done before you mark someone as hired." />
      {(["before_hire", "before_start"] as const).map((phase) => (
        <div key={phase} className="px-5 pb-4">
          <p className="mb-1.5 text-xs font-semibold text-fg-muted">{phase === "before_hire" ? "Before hiring" : "Before day one"}</p>
          <ul className="flex flex-col gap-1.5">
            {o.checklist
              .filter((i) => i.phase === phase)
              .map((i) => (
                <li key={i.id}>
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      className="mt-0.5"
                      checked={i.done}
                      onCheckedChange={async (v) => {
                        await services.offers.setChecklist(o.id, i.id, v === true);
                        onChange();
                      }}
                    />
                    <span className={cn(i.done ? "text-fg-muted line-through decoration-ink-300" : "text-fg")}>
                      {i.label}
                      {!i.required && <span className="text-fg-subtle"> (optional)</span>}
                      {i.done && i.doneBy && <span className="block text-2xs text-fg-subtle no-underline">{i.doneBy}</span>}
                    </span>
                  </label>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </Card>
  );
}

function Dialogs({ dialog, offer: o, vacancy, onClose, onDone }: { dialog: Dialog; offer: Offer; vacancy: Vacancy; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = React.useState("");
  const [days, setDays] = React.useState("5");
  const [outcome, setOutcome] = React.useState<CandidateResponse["outcome"]>("accepted");
  const [salary, setSalary] = React.useState("");
  const [start, setStart] = React.useState("");
  const [declineReason, setDeclineReason] = React.useState("");
  const [toWithdrawn, setToWithdrawn] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset per dialog
    setNote("");
    setError(null);
    setOutcome("accepted");
    setSalary("");
    setStart("");
    setDeclineReason("");
  }, [dialog]);

  if (!dialog) return null;
  const pending = o.approvals.find((a) => a.status === "pending");
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      if (dialog === "approve") {
        await services.offers.approve(o.id, pending!.step, note);
        toast.success("Approved", pending!.approverName === ME ? undefined : `Recorded for ${pending!.approverName}`);
      } else if (dialog === "send_back") {
        await services.offers.reject(o.id, pending!.step, note);
        toast.success("Sent back to draft");
      } else if (dialog === "send") {
        await services.offers.send(o.id);
        toast.success("Offer sent", `${o.candidateName} has ${o.terms.validDays} days to respond.`);
      } else if (dialog === "respond") {
        await services.offers.respond(
          o.id,
          {
            outcome,
            note,
            ...(outcome === "countered" ? { ...(salary ? { requestedSalary: Number(salary) } : {}), ...(start ? { requestedStartDate: start } : {}) } : {}),
            ...(outcome === "declined" && declineReason ? { declineReason } : {}),
          },
          toWithdrawn,
        );
        toast.success(outcome === "accepted" ? "Accepted. Start the hiring checklist." : outcome === "declined" ? "Response recorded: declined" : "Counter-offer recorded", o.candidateName);
      } else if (dialog === "withdraw") {
        await services.offers.withdraw(o.id, note);
        toast.success("Offer withdrawn", o.candidateName);
      } else if (dialog === "extend") {
        await services.offers.extend(o.id, Number(days));
        toast.success("Deadline extended", `${days} more days`);
      }
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Not saved.");
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Exclude<Dialog, null>, string> = {
    approve: pending?.approverName === ME ? "Approve this offer" : `Record ${pending?.approverName}'s approval`,
    send_back: "Send back for changes",
    send: `Send the offer to ${o.candidateName}?`,
    respond: "Record the candidate's response",
    withdraw: "Withdraw this offer?",
    extend: o.status === "expired" ? "Reopen with a new deadline" : "Extend the deadline",
  };
  return (
    <Modal open onOpenChange={(x) => !x && onClose()}>
      <ModalContent
        size={dialog === "respond" ? "md" : "sm"}
        title={titles[dialog]}
        description={
          dialog === "send"
            ? `${o.candidateName} gets the letter by email, with a link to accept or decline. They have ${o.terms.validDays} days to respond. The application moves to the Offer stage.`
            : dialog === "withdraw"
              ? "The candidate is told the offer is withdrawn. This can't be undone; you'd need a new offer."
              : dialog === "approve"
                ? `${o.terms.jobTitle} at ${money(o.terms.currency, o.terms.baseSalary)} per ${o.terms.payPeriod} (band ${vacancy.salaryMin !== null ? money(vacancy.currency, vacancy.salaryMin) : "–"} to ${vacancy.salaryMax !== null ? money(vacancy.currency, vacancy.salaryMax) : "–"}).`
                : undefined
        }
        footer={
          <>
            <ModalClose asChild>
              <Button variant="secondary">Back</Button>
            </ModalClose>
            <Button variant={dialog === "withdraw" || (dialog === "respond" && outcome === "declined") ? "danger" : "primary"} loading={busy} onClick={run}>
              {dialog === "approve" ? "Approve" : dialog === "send_back" ? "Send back" : dialog === "send" ? "Send offer" : dialog === "respond" ? "Record response" : dialog === "withdraw" ? "Withdraw offer" : "Extend"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error && (
            <Alert tone="danger" title="Not saved">
              {error}
            </Alert>
          )}
          {dialog === "respond" && (
            <div role="radiogroup" aria-label="Response" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  ["accepted", "Accepted"],
                  ["countered", "Counter-offer"],
                  ["declined", "Declined"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={outcome === v}
                  onClick={() => setOutcome(v)}
                  className={cn("rounded-md border px-3 py-2 text-sm font-semibold", outcome === v ? (v === "declined" ? "border-danger-500 bg-danger-50 text-danger-700" : "border-primary-500 bg-primary-50 text-primary-800") : "border-line text-fg-muted hover:border-ink-400")}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {dialog === "respond" && outcome === "countered" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Asked for (${o.terms.currency})`}>
                <Input type="number" min={0} step={50} value={salary} onChange={(e) => setSalary(e.target.value)} placeholder={String(o.terms.baseSalary + 200)} />
              </Field>
              <Field label="Start date asked for" optional>
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
            </div>
          )}
          {dialog === "respond" && outcome === "declined" && (
            <>
              <Field label="Main reason">
                <Select
                  value={declineReason}
                  onValueChange={setDeclineReason}
                  placeholder="Choose a reason"
                  options={["Accepted another offer", "Pay below expectations", "Counter-offer from current employer", "Location or work pattern", "Personal circumstances", "Other"].map((r) => ({ value: r, label: r }))}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-fg">
                <Checkbox checked={toWithdrawn} onCheckedChange={(x) => setToWithdrawn(x === true)} />
                Move the candidate to Withdrawn
              </label>
            </>
          )}
          {dialog === "extend" && (
            <Field label="New deadline">
              <Select value={days} onValueChange={setDays} options={[2, 3, 5, 7].map((n) => ({ value: String(n), label: `${n} days from today` }))} />
            </Field>
          )}
          {dialog !== "send" && dialog !== "extend" && (
            <Field
              label={dialog === "respond" ? "What they said, and how" : dialog === "approve" ? "Note" : "Reason"}
              required={dialog !== "approve"}
              optional={dialog === "approve"}
            >
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  dialog === "respond"
                    ? outcome === "accepted"
                      ? "e.g. Accepted by phone; signed letter to follow by Friday."
                      : outcome === "countered"
                        ? "e.g. Asked for USD 2 600 to match a counter-offer from Steward Bank."
                        : "e.g. Called to say they've accepted a role closer to home."
                    : dialog === "approve"
                      ? "e.g. Within band; matches the panel's recommendation."
                      : dialog === "send_back"
                        ? "e.g. Start date clashes with the December shutdown."
                        : "e.g. Role put on hold until the budget is approved."
                }
              />
            </Field>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}

function HiredDialog({ result, offer: o, onClose }: { result: { others: { candidateId: string; name: string; stage: ApplicationStage }[]; filled: boolean } | null; offer: Offer; onClose: () => void }) {
  const [picked, setPicked] = React.useState<string[]>([]);
  const [message, setMessage] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (!result) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prefill when the hire completes
    setPicked(result.filled ? result.others.map((x) => x.candidateId) : []);
    setMessage(`Thank you for your interest in the ${o.vacancyTitle} role at Msasa Financial Group, and for the time you gave to our process. We have now filled the position, so we won't be taking your application further. We'd like to keep your details for future roles; reply to this message if you'd prefer we didn't.`);
  }, [result, o.vacancyTitle]);
  if (!result) return null;
  return (
    <Modal open onOpenChange={(x) => !x && onClose()}>
      <ModalContent
        size="md"
        title={`${o.candidateName} is hired`}
        description={result.filled ? `That fills every opening for ${o.vacancyTitle}. Let the other candidates know.` : `${o.vacancyTitle} still has open positions. You can tell other candidates now or later.`}
        footer={
          <>
            <ModalClose asChild>
              <Button variant="secondary">Not now</Button>
            </ModalClose>
            <Button
              loading={busy}
              disabled={picked.length === 0}
              onClick={async () => {
                setBusy(true);
                try {
                  const n = await services.offers.notifyOthers(o.vacancyId, picked, message);
                  toast.success(`${n} candidate${n === 1 ? "" : "s"} notified`, "Their applications are closed with this message on record.");
                  onClose();
                } catch (e) {
                  toast.error("Not sent", e instanceof Error ? e.message : undefined);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Notify {picked.length} and close their applications
            </Button>
          </>
        }
      >
        {result.others.length === 0 ? (
          <p className="text-sm text-fg-muted">No other candidates are still active for this vacancy.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <ul className="flex max-h-56 flex-col overflow-y-auto rounded-md border border-line">
              {result.others.map((x) => (
                <li key={x.candidateId} className="border-b border-line last:border-b-0">
                  <label className="flex items-center gap-3 px-3 py-2">
                    <Checkbox checked={picked.includes(x.candidateId)} onCheckedChange={(v) => setPicked((p) => (v === true ? [...p, x.candidateId] : p.filter((y) => y !== x.candidateId)))} />
                    <span className="flex-1 text-sm text-fg">{x.name}</span>
                    <StageBadge stage={x.stage} size="sm" />
                  </label>
                </li>
              ))}
            </ul>
            <Field label="Message">
              <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
