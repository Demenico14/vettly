"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  CalendarPlus,
  ClipboardList,
  Copy,
  ExternalLink,
  FileText,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  TriangleAlert,
  X,
} from "@/components/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Field,
  Input,
  Modal,
  ModalClose,
  ModalContent,
  Skeleton,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
  toast,
  Tooltip,
  Pagination,
  usePagination,
} from "@/components/ui";
import { FilterSelect } from "@/components/ui/filter-select";
import { PageContainer } from "@/components/layout/page-header";
import { IllustrativeNotice } from "@/components/domain/assessment";
import { services, deadlineIn, type InvitationView, type Undo } from "@/services";
import type { InvitationRecord } from "@/types/psychometrics";
import { cn } from "@/lib/utils";
import { AssessmentsHeader, INVITATION_STATUS, InvitationBadge, day, dayTime, deadlineText } from "./meta";
import { SendTestsDialog } from "./send-tests-dialog";

type Status = InvitationRecord["status"];
const OPEN: Status[] = ["sent", "opened", "in_progress"];
type Dialog = { kind: "extend" | "cancel"; ids: string[] } | { kind: "resend"; id: string } | null;

export function InvitationTracker() {
  const [rows, setRows] = React.useState<InvitationView[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<string[]>([]);
  const [vacancy, setVacancy] = React.useState<string[]>([]);
  const [test, setTest] = React.useState<string[]>([]);
  const [deliveryOnly, setDeliveryOnly] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [sending, setSending] = React.useState(false);
  const [dialog, setDialog] = React.useState<Dialog>(null);
  const [names, setNames] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    services.assessments.library().then((l) => setNames(Object.fromEntries(l.tests.map((t) => [t.id, t.name]))));
  }, []);

  React.useEffect(() => {
    let alive = true;
    services.assessments
      .invitations()
      .then((r) => alive && setRows(r))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [reload]);

  const refresh = () => setReload((r) => r + 1);
  const all = rows ?? [];
  const testNames = new Map(all.flatMap((r) => r.testIds.map((id) => [id, id] as const)));
  const shown = all.filter(
    (r) =>
      (!query || `${r.record.candidateName} ${r.record.vacancyTitle} ${r.batteryLabel}`.toLowerCase().includes(query.toLowerCase())) &&
      (status.length === 0 || status.includes(r.record.status)) &&
      (vacancy.length === 0 || vacancy.includes(r.record.vacancyTitle)) &&
      (test.length === 0 || r.testIds.some((t) => test.includes(t))) &&
      (!deliveryOnly || (r.record.deliveryIssues.length > 0 && OPEN.includes(r.record.status))),
  );
  const picked = shown.filter((r) => selected.has(r.record.id));
  const pager = usePagination(shown, { resetKey: JSON.stringify([query, status, vacancy, test, deliveryOnly]) });
  const top = React.useRef<HTMLDivElement>(null);
  const pagePicked = pager.items.filter((r) => selected.has(r.record.id));
  const filtered = !!(query || status.length || vacancy.length || test.length || deliveryOnly);

  const undoable = (u: Undo, title: string, detail: string) =>
    toast.withUndo(
      title,
      async () => {
        await services.assessments.restore(u);
        toast.info("Undone", "The invitation is back as it was.");
        refresh();
      },
      detail,
    );

  const remind = async (ids: string[]) => {
    const r = await services.assessments.remind(ids);
    if (r.reminded) toast.success(`Reminder sent to ${r.reminded} ${r.reminded === 1 ? "candidate" : "candidates"}`, r.skipped.length ? `${r.skipped.length} skipped: ${r.skipped.map((s) => `${s.name.split(" ")[0]} ${s.reason}`).join("; ")}` : undefined);
    else toast.warning("No reminders sent", r.skipped.map((s) => `${s.name}: ${s.reason}`).join("; "));
    setSelected(new Set());
    refresh();
  };

  const counts = {
    waiting: all.filter((r) => r.record.status === "sent" || r.record.status === "opened").length,
    progress: all.filter((r) => r.record.status === "in_progress").length,
    review: all.filter((r) => r.record.status === "completed" && !r.record.review.reviewed).length,
    expired: all.filter((r) => r.record.status === "expired").length,
    delivery: all.filter((r) => r.record.deliveryIssues.length > 0 && OPEN.includes(r.record.status)).length,
  };

  return (
    <PageContainer
      header={
        <AssessmentsHeader
          actions={
            <>
              <IllustrativeNotice className="hidden lg:inline-flex">Illustrative tests and results</IllustrativeNotice>
              <Button onClick={() => setSending(true)}>
                <Send />
                Send tests
              </Button>
            </>
          }
        />
      }
    >
      {error ? (
        <Alert
          tone="danger"
          title="Invitations didn't load"
          action={
            <Button size="sm" variant="secondary" onClick={refresh}>
              <RefreshCw />
              Try again
            </Button>
          }
        >
          {error}
        </Alert>
      ) : !rows ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList />}
            title="No tests sent yet"
            description="Send a battery to shortlisted candidates. You'll track every invitation and its results here."
            action={
              <Button size="sm" onClick={() => setSending(true)}>
                <Send />
                Send tests
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(
              [
                ["Waiting to start", counts.waiting, ["sent", "opened"], "neutral"],
                ["In progress", counts.progress, ["in_progress"], "neutral"],
                ["To review", counts.review, ["completed"], "accent"],
                ["Expired", counts.expired, ["expired"], counts.expired ? "danger" : "neutral"],
                ["Delivery problems", counts.delivery, ["sent", "opened", "in_progress"], counts.delivery ? "danger" : "neutral"],
              ] as const
            ).map(([label, n, st, tone]) => {
              const isDelivery = label === "Delivery problems";
              const active = isDelivery ? deliveryOnly : !deliveryOnly && status.length === st.length && st.every((x) => status.includes(x));
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (isDelivery) {
                      setDeliveryOnly(!active);
                      setStatus([]);
                    } else {
                      setDeliveryOnly(false);
                      setStatus(active ? [] : [...st]);
                    }
                  }}
                  aria-pressed={active}
                  className={cn(
                    "pressable rounded-lg bg-surface px-4 py-3 text-left shadow-platter transition-shadow hover:shadow-md",
                    active && "ring-2 ring-primary-500",
                  )}
                >
                  <span className="block text-xs font-medium text-fg-muted">{label}</span>
                  <span className={cn("mt-1 block text-2xl font-bold tabular", tone === "accent" && n ? "text-accent-700" : tone === "danger" ? "text-danger-700" : "text-fg")}>{n}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="w-full lg:max-w-xs">
              <Input leading={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search candidate, vacancy or battery" aria-label="Search invitations" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect label="Status" value={status} onChange={setStatus} options={Object.entries(INVITATION_STATUS).filter(([k]) => all.some((r) => r.record.status === k)).map(([value, m]) => ({ value, label: m.label, count: all.filter((r) => r.record.status === value).length }))} />
              <FilterSelect label="Vacancy" value={vacancy} onChange={setVacancy} options={[...new Set(all.map((r) => r.record.vacancyTitle))].map((v) => ({ value: v, label: v, count: all.filter((r) => r.record.vacancyTitle === v).length }))} />
              <FilterSelect label="Test" value={test} onChange={setTest} searchable options={[...testNames.keys()].map((id) => ({ value: id, label: names[id] ?? id, count: all.filter((r) => r.testIds.includes(id)).length }))} />
              {filtered && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setQuery("");
                    setStatus([]);
                    setVacancy([]);
                    setTest([]);
                    setDeliveryOnly(false);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          {picked.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-ink-900 px-3 py-2 text-sm text-white animate-pop-in" role="region" aria-label="Bulk actions">
              <span className="font-semibold tabular">{picked.length} selected</span>
              <span className="mx-1 h-4 w-px bg-ink-700" aria-hidden />
              <Button size="sm" variant="ghost" className="text-white hover:bg-ink-800 hover:text-white" onClick={() => remind(picked.map((r) => r.record.id))}>
                <Bell />
                Remind
              </Button>
              <Button size="sm" variant="ghost" className="text-white hover:bg-ink-800 hover:text-white" onClick={() => setDialog({ kind: "extend", ids: picked.map((r) => r.record.id) })}>
                <CalendarPlus />
                Extend deadline
              </Button>
              <Button size="sm" variant="ghost" className="text-white hover:bg-ink-800 hover:text-white" onClick={() => setDialog({ kind: "cancel", ids: picked.map((r) => r.record.id) })}>
                <X />
                Cancel
              </Button>
              <Button size="sm" variant="ghost" className="ml-auto text-ink-300 hover:bg-ink-800 hover:text-white" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          )}

          <Card className="overflow-hidden scroll-mt-16" ref={top}>
            {shown.length === 0 ? (
              <EmptyState icon={<Search />} title="No invitations match" description="Remove a filter or search for something broader." />
            ) : (
              <>
                <ul className="md:hidden">
                  {pager.items.map((r) => (
                    <li key={r.record.id} className="flex items-start gap-3 border-b border-line px-4 py-3.5 last:border-b-0">
                      <Checkbox aria-label={`Select ${r.record.candidateName}`} checked={selected.has(r.record.id)} onCheckedChange={() => toggle(r.record.id)} className="mt-1" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/assessments/results/${r.record.id}`} className="block truncate text-sm font-semibold text-fg hover:underline">
                          {r.record.candidateName}
                        </Link>
                        <p className="truncate text-xs text-fg-subtle">
                          {r.record.vacancyTitle} · {r.batteryLabel}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <InvitationBadge status={r.record.status} />
                          <span className="text-xs text-fg-muted tabular">
                            {r.summary.completed} of {r.summary.total}
                          </span>
                          <DeadlineCell r={r} />
                        </div>
                      </div>
                      <RowMenu r={r} onRemind={() => remind([r.record.id])} onDialog={setDialog} />
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <THead>
                      <TR>
                        <TH className="w-10 pr-0">
                          <Checkbox
                            aria-label="Select all invitations on this page"
                            checked={pagePicked.length && pagePicked.length === pager.items.length ? true : picked.length ? "indeterminate" : false}
                            onCheckedChange={() =>
                              setSelected((s) => {
                                const n = new Set(s);
                                const all = pagePicked.length === pager.items.length;
                                pager.items.forEach((r) => (all ? n.delete(r.record.id) : n.add(r.record.id)));
                                return n;
                              })
                            }
                          />
                        </TH>
                        <TH>Candidate</TH>
                        <TH>Tests</TH>
                        <TH>Status</TH>
                        <TH>Sent</TH>
                        <TH>Deadline</TH>
                        <TH>Time taken</TH>
                        <TH className="w-12">
                          <span className="sr-only">Actions</span>
                        </TH>
                      </TR>
                    </THead>
                    <TBody>
                      {pager.items.map((r) => (
                        <TR key={r.record.id} selected={selected.has(r.record.id)}>
                          <TD className="pr-0">
                            <Checkbox aria-label={`Select ${r.record.candidateName}`} checked={selected.has(r.record.id)} onCheckedChange={() => toggle(r.record.id)} />
                          </TD>
                          <TD>
                            <Link href={`/assessments/results/${r.record.id}`} className="flex items-center gap-3">
                              <Avatar name={r.record.candidateName} size="sm" />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold text-fg hover:underline">{r.record.candidateName}</span>
                                <span className="block truncate text-xs text-fg-subtle">{r.record.vacancyTitle}</span>
                              </span>
                            </Link>
                          </TD>
                          <TD>
                            <span className="block text-sm text-fg">{r.batteryLabel}</span>
                            <span className="text-xs text-fg-subtle tabular">
                              {r.summary.completed} of {r.summary.total} complete
                              {r.record.accommodations.length > 0 && " · extra time"}
                            </span>
                          </TD>
                          <TD>
                            <div className="flex flex-col items-start gap-1">
                              <span className="flex items-center gap-1.5">
                                <InvitationBadge status={r.record.status} />
                                {r.record.status === "completed" && !r.record.review.reviewed && <span className="text-2xs font-semibold text-accent-700">To review</span>}
                                {r.record.review.concern && (
                                  <Tooltip content={r.record.review.concern}>
                                    <span tabIndex={0} className="text-2xs font-semibold text-danger-700">
                                      Concern
                                    </span>
                                  </Tooltip>
                                )}
                              </span>
                              {r.record.deliveryIssues.length > 0 && OPEN.includes(r.record.status) && (
                                <span className="flex items-center gap-1 text-2xs font-medium text-danger-700">
                                  <TriangleAlert className="size-3" aria-hidden />
                                  {r.record.deliveryIssues.map((d) => d.channel.toUpperCase()).join(", ")} not delivered
                                </span>
                              )}
                            </div>
                          </TD>
                          <TD className="text-xs whitespace-nowrap text-fg-muted tabular">{dayTime(r.record.sentAt)}</TD>
                          <TD className="text-xs whitespace-nowrap">
                            <span className="block text-fg-muted tabular">{day(r.record.deadline)}</span>
                            <DeadlineCell r={r} />
                          </TD>
                          <TD className="text-xs whitespace-nowrap text-fg-muted tabular">{r.timeTakenMin !== null ? `${r.timeTakenMin} min` : "–"}</TD>
                          <TD className="text-right">
                            <RowMenu r={r} onRemind={() => remind([r.record.id])} onDialog={setDialog} />
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
                <div className="border-t border-line px-4 py-2.5">
                  <Pagination p={pager} noun={["invitation", "invitations"]} anchor={top} />
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      <SendTestsDialog open={sending} onOpenChange={setSending} onSent={refresh} />
      <ActionDialog
        dialog={dialog}
        rows={all}
        onClose={() => setDialog(null)}
        onDone={(u, title, detail) => {
          setSelected(new Set());
          refresh();
          if (u) undoable(u, title, detail);
          else toast.success(title, detail);
        }}
      />
    </PageContainer>
  );

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
}

function DeadlineCell({ r }: { r: InvitationView }) {
  const d = deadlineText(r.hoursLeft, r.record.status);
  if (!d) return null;
  return <span className={cn("text-2xs font-medium", d.urgent ? "text-danger-700" : "text-fg-subtle")}>{d.text}</span>;
}

function RowMenu({ r, onRemind, onDialog }: { r: InvitationView; onRemind: () => void; onDialog: (d: Dialog) => void }) {
  const open = OPEN.includes(r.record.status);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${r.record.candidateName}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/assessments/results/${r.record.id}`}>
            <FileText />
            {r.record.results.length ? "View results" : "View invitation"}
          </Link>
        </DropdownMenuItem>
        {open && (
          <DropdownMenuItem onSelect={onRemind}>
            <Bell />
            Send reminder
          </DropdownMenuItem>
        )}
        {(open || r.record.status === "expired") && (
          <DropdownMenuItem onSelect={() => onDialog({ kind: "extend", ids: [r.record.id] })}>
            <CalendarPlus />
            {r.record.status === "expired" ? "Reopen with a new deadline" : "Extend deadline"}
          </DropdownMenuItem>
        )}
        {(r.record.status === "expired" || r.record.status === "cancelled") && (
          <DropdownMenuItem onSelect={() => onDialog({ kind: "resend", id: r.record.id })}>
            <RotateCcw />
            Send a new invitation
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            navigator.clipboard?.writeText(`${location.origin}/t/${r.record.token}`).catch(() => undefined);
            toast.success("Candidate link copied", `/t/${r.record.token}`);
          }}
        >
          <Copy />
          Copy candidate link
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/t/${r.record.token}`} target="_blank" rel="noreferrer">
            <ExternalLink />
            Open as the candidate
          </a>
        </DropdownMenuItem>
        {open && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem tone="danger" onSelect={() => onDialog({ kind: "cancel", ids: [r.record.id] })}>
              <X />
              Cancel invitation
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ActionDialog({
  dialog,
  rows,
  onClose,
  onDone,
}: {
  dialog: Dialog;
  rows: InvitationView[];
  onClose: () => void;
  onDone: (undo: Undo | null, title: string, detail: string) => void;
}) {
  const [date, setDate] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!dialog) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset per dialog
    setDate(deadlineIn(dialog.kind === "resend" ? 5 : 3).slice(0, 10));
    setReason("");
    setError(null);
  }, [dialog]);

  if (!dialog) return null;
  const ids = dialog.kind === "resend" ? [dialog.id] : dialog.ids;
  const names = rows.filter((r) => ids.includes(r.record.id)).map((r) => r.record.candidateName);
  const who = names.length === 1 ? names[0]! : `${names.length} candidates`;
  const iso = `${date}T17:00:00+02:00`;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (dialog.kind === "extend") {
        const u = await services.assessments.extend(ids, new Date(iso).toISOString(), reason);
        onDone(u, "Deadline changed", `${who} · now ${day(iso)}, 17:00`);
      } else if (dialog.kind === "cancel") {
        const u = await services.assessments.cancel(ids, reason);
        onDone(u, names.length === 1 ? "Invitation cancelled" : `${names.length} invitations cancelled`, `${who} will be told the tests were withdrawn`);
      } else {
        await services.assessments.resend(ids[0]!, new Date(iso).toISOString());
        onDone(null, "New invitation sent", `${who} · due ${day(iso)}`);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  };

  const title = dialog.kind === "extend" ? `Extend the deadline for ${who}` : dialog.kind === "cancel" ? `Cancel tests for ${who}?` : `Send ${who} a new invitation`;
  return (
    <Modal open onOpenChange={(o) => !o && onClose()}>
      <ModalContent
        size="sm"
        title={title}
        description={
          dialog.kind === "cancel"
            ? "The candidate's link stops working and they're told the tests were withdrawn. You can undo this straight after."
            : dialog.kind === "extend"
              ? "Candidates get a message with the new deadline. Results so far are kept."
              : "A fresh link with a new deadline. The old invitation stays in the record."
        }
        footer={
          <>
            <ModalClose asChild>
              <Button variant="secondary">Back</Button>
            </ModalClose>
            <Button variant={dialog.kind === "cancel" ? "danger" : "primary"} loading={busy} onClick={submit}>
              {dialog.kind === "extend" ? "Change deadline" : dialog.kind === "cancel" ? "Cancel tests" : "Send invitation"}
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
          {dialog.kind !== "cancel" && (
            <Field label="New deadline" required hint="Closes at 17:00.">
              <Input type="date" value={date} min={deadlineIn(1).slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
            </Field>
          )}
          {dialog.kind !== "resend" && (
            <Field label="Reason" required hint="Kept in the audit log.">
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={dialog.kind === "extend" ? "e.g. Candidate asked for more time: power cuts this week" : "e.g. Vacancy put on hold"} />
            </Field>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
