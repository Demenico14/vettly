"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, FileSignature, Plus, Search } from "@/components/icons";
import { Alert, LoadError, Avatar, Button, Card, EmptyState, Input, Modal, ModalClose, ModalContent, Field, Skeleton, Table, TBody, TD, TH, THead, TR, Pagination, usePagination, Combobox } from "@/components/ui";
import { FilterSelect } from "@/components/ui/filter-select";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { services, MOCK_NOW, type OfferView } from "@/services";
import type { CandidateProfile } from "@/types";
import { cn } from "@/lib/utils";
import { OFFER_STATUS, OfferBadge, money, shortDate, totalPay } from "./meta";

const NOW = new Date(MOCK_NOW).getTime();
type Tile = "approval" | "out" | "hiring" | "closed" | null;

export function OffersList() {
  const [rows, setRows] = React.useState<OfferView[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<string[]>([]);
  const [tile, setTile] = React.useState<Tile>(null);
  const [creating, setCreating] = React.useState(false);

  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    services.offers
      .list()
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, [attempt]);

  const all = rows ?? [];
  const TILES: Record<Exclude<Tile, null>, (v: OfferView) => boolean> = {
    approval: (v) => v.offer.status === "pending_approval" || v.offer.status === "draft" || v.offer.status === "approved",
    out: (v) => v.offer.status === "sent" || v.offer.status === "viewed" || v.offer.status === "countered",
    hiring: (v) => v.offer.status === "accepted",
    closed: (v) => ["declined", "withdrawn", "expired"].includes(v.offer.status),
  };
  const shown = all.filter(
    (v) =>
      (!query || `${v.offer.candidateName} ${v.offer.vacancyTitle}`.toLowerCase().includes(query.toLowerCase())) &&
      (status.length === 0 || status.includes(v.offer.status)) &&
      (!tile || TILES[tile](v)),
  );
  const mine = all.filter((v) => v.myApprovalStep !== null).length;
  const pager = usePagination(shown, { resetKey: JSON.stringify([query, status, tile]) });
  const top = React.useRef<HTMLDivElement>(null);

  return (
    <PageContainer
      header={
        <PageHeader
          title="Offers"
          description="Offers from draft to signature: approvals, the letter, the candidate's response and the checks before someone is hired."
          actions={
            <Button onClick={() => setCreating(true)}>
              <Plus />
              New offer
            </Button>
          }
        />
      }
    >
      {error ? (
        <LoadError title="Offers didn't load" onRetry={() => (setError(null), setAttempt((a) => a + 1))}>
          {error}
        </LoadError>
      ) : !rows ? (
        <Skeleton className="h-96 rounded-lg" />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState icon={<FileSignature />} title="No offers yet" description="When an interview panel decides to advance someone, create their offer here." action={<Button size="sm" onClick={() => setCreating(true)}>New offer</Button>} />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {mine > 0 && (
            <Alert tone="warning" title={`${mine} offer${mine > 1 ? "s" : ""} waiting for your approval`} action={<Button size="sm" variant="secondary" onClick={() => setTile("approval")}>Show</Button>}>
              Approvals are in order: hiring manager, HR, then the CFO when pay is above the band.
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {(
              [
                ["approval", "Drafts and approvals"],
                ["out", "With candidates"],
                ["hiring", "Accepted"],
                ["closed", "Declined, withdrawn or expired"],
              ] as const
            ).map(([k, label]) => {
              const n = all.filter(TILES[k]).length;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={tile === k}
                  onClick={() => setTile(tile === k ? null : k)}
                  className={cn("pressable rounded-lg bg-surface px-4 py-3 text-left shadow-platter transition-shadow hover:shadow-md", tile === k && "ring-2 ring-primary-500")}
                >
                  <span className="block text-xs font-medium text-fg-muted">{label}</span>
                  <span className="mt-1 block text-2xl font-bold text-fg tabular">{n}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:max-w-xs">
              <Input leading={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search candidate or vacancy" aria-label="Search offers" />
            </div>
            <FilterSelect label="Status" value={status} onChange={setStatus} options={Object.entries(OFFER_STATUS).filter(([k]) => all.some((v) => v.offer.status === k)).map(([value, m]) => ({ value, label: m.label }))} />
          </div>

          <Card className="overflow-hidden scroll-mt-16" ref={top}>
            {shown.length === 0 ? (
              <EmptyState icon={<Search />} title="No offers match" description="Clear the filters to see every offer." />
            ) : (
              <>
                <ul className="md:hidden">
                  {pager.items.map((v) => (
                    <li key={v.offer.id} className="border-b border-line last:border-b-0">
                      <Link href={`/offers/${v.offer.id}`} className="block px-4 py-3.5">
                        <span className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-semibold text-fg">{v.offer.candidateName}</span>
                          <OfferBadge offer={v.offer} />
                        </span>
                        <span className="mt-0.5 block text-xs text-fg-subtle">
                          {v.offer.vacancyTitle} · {money(v.offer.terms.currency, v.offer.terms.baseSalary)}/{v.offer.terms.payPeriod === "month" ? "mo" : "yr"}
                        </span>
                        <Next v={v} />
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <THead>
                      <TR>
                        <TH>Candidate</TH>
                        <TH>Status</TH>
                        <TH className="text-right">Basic pay</TH>
                        <TH>Band</TH>
                        <TH>Start date</TH>
                        <TH>Next step</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {pager.items.map((v) => (
                        <TR key={v.offer.id}>
                          <TD>
                            <Link href={`/offers/${v.offer.id}`} className="flex items-center gap-3">
                              <Avatar name={v.offer.candidateName} size="sm" />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold text-fg hover:underline">{v.offer.candidateName}</span>
                                <span className="block truncate text-xs text-fg-subtle">
                                  {v.offer.vacancyTitle}
                                  {v.offer.version > 1 && ` · version ${v.offer.version}`}
                                </span>
                              </span>
                            </Link>
                          </TD>
                          <TD>
                            <OfferBadge offer={v.offer} />
                          </TD>
                          <TD className="text-right text-sm whitespace-nowrap text-fg tabular">
                            {money(v.offer.terms.currency, v.offer.terms.baseSalary)}
                            <span className="block text-2xs text-fg-subtle">total {money(v.offer.terms.currency, totalPay(v.offer.terms))}/{v.offer.terms.payPeriod === "month" ? "mo" : "yr"}</span>
                          </TD>
                          <TD className="text-xs whitespace-nowrap">
                            <span className={cn("font-medium", v.band.position === "above" ? "text-warning-700" : v.band.position === "below" ? "text-secondary-700" : "text-fg-muted")}>
                              {v.band.position === "unknown" ? "No band" : v.band.position === "within" ? "Within band" : v.band.position === "above" ? "Above band" : "Below band"}
                            </span>
                            {v.band.compaRatio !== null && <span className="block text-fg-subtle tabular">{v.band.compaRatio}% of midpoint</span>}
                          </TD>
                          <TD className="text-sm whitespace-nowrap text-fg-muted tabular">{shortDate(v.offer.terms.startDate)}</TD>
                          <TD>
                            <Next v={v} />
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
                <div className="border-t border-line px-4 py-2.5">
                  <Pagination p={pager} noun={["offer", "offers"]} anchor={top} />
                </div>
              </>
            )}
          </Card>
        </div>
      )}
      <NewOfferDialog open={creating} onOpenChange={setCreating} />
    </PageContainer>
  );
}

function Next({ v }: { v: OfferView }) {
  const o = v.offer;
  const pending = o.approvals.find((a) => a.status === "pending");
  const hoursLeft = o.expiresAt ? Math.round((new Date(o.expiresAt).getTime() - NOW) / 3600000) : null;
  const text = o.hiredAt
    ? (() => {
        const n = o.checklist.filter((i) => !i.done && i.required).length;
        return `Starts ${shortDate(o.terms.startDate)} · ${n ? `${n} ${n === 1 ? "task" : "tasks"} before day one` : "ready for day one"}`;
      })()
    : o.status === "draft"
      ? "Finish and submit for approval"
      : o.status === "pending_approval"
        ? v.myApprovalStep
          ? "Your approval"
          : `Waiting for ${pending?.approverName}`
        : o.status === "approved"
          ? "Ready to send"
          : o.status === "sent" || o.status === "viewed"
            ? `${o.status === "viewed" ? "Opened. " : ""}Reply due ${hoursLeft !== null && hoursLeft < 48 ? `in ${Math.max(0, hoursLeft)} h` : shortDate(o.expiresAt!)}`
            : o.status === "countered"
              ? "Review the counter-offer"
              : o.status === "accepted"
                ? (() => {
                    const n = o.checklist.filter((i) => i.phase === "before_hire" && i.required && !i.done).length;
                    return n ? `${n} pre-hire ${n === 1 ? "check" : "checks"} left` : "Ready to mark as hired";
                  })()
                : (o.withdrawnReason ?? o.response?.declineReason ?? "Closed");
  // Copper means "needs you"; a deadline closing in is a warning, shown in ochre with a clock.
  const needsYou = !!v.myApprovalStep || o.status === "countered";
  const closing = hoursLeft !== null && hoursLeft < 48 && (o.status === "sent" || o.status === "viewed");
  return (
    <span className={cn("mt-1 flex items-center gap-1 text-xs md:mt-0", needsYou ? "font-semibold text-accent-700" : closing ? "font-semibold text-warning-700" : "text-fg-muted")}>
      {closing && !needsYou && <Clock className="size-3.5 shrink-0" aria-hidden />}
      {text}
    </span>
  );
}

function NewOfferDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [people, setPeople] = React.useState<CandidateProfile[] | null>(null);
  const [app, setApp] = React.useState("");
  React.useEffect(() => {
    if (open) services.profiles.list().then(setPeople);
  }, [open]);
  const ORDER = ["interview", "offer", "assessment", "shortlisted"];
  const GROUP: Record<string, string> = { interview: "Interviewing", offer: "At offer", assessment: "Earlier stages", shortlisted: "Earlier stages" };
  const options = (people ?? [])
    .flatMap((p) => p.applications.filter((a) => ORDER.includes(a.stage)).map((a) => ({ value: `${p.id}|${a.vacancyId}`, label: p.name, description: a.vacancyTitle, group: GROUP[a.stage], rank: ORDER.indexOf(a.stage) })))
    .sort((x, y) => x.rank - y.rank || x.label.localeCompare(y.label));
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        size="sm"
        title="New offer"
        description="Choose who it's for. Candidates at the interview stage are listed first."
        footer={
          <>
            <ModalClose asChild>
              <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <Button
              disabled={!app}
              onClick={() => {
                const [c, v] = app.split("|");
                router.push(`/offers/new?candidate=${c}&vacancy=${v}`);
              }}
            >
              Continue
            </Button>
          </>
        }
      >
        {!people ? (
          <Skeleton className="h-10 rounded-md" />
        ) : (
          <Field label="Candidate">
            <Combobox value={app} onValueChange={setApp} placeholder="Choose candidate and vacancy" searchPlaceholder="Search by name or vacancy" options={options} />
          </Field>
        )}
      </ModalContent>
    </Modal>
  );
}
