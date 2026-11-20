"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Trash2, X } from "@/components/icons";
import { Alert, Button, Card, Checkbox, ConfirmModal, Field, Input, Modal, ModalClose, ModalContent, Select, Skeleton, Textarea, toast } from "@/components/ui";
import { PageContainer } from "@/components/layout/page-header";
import { services, type BatteryDraft } from "@/services";
import type { Battery, BatteryComponent, Test } from "@/types/psychometrics";
import type { Vacancy as VacancyRecord } from "@/types";
import { cn } from "@/lib/utils";
import { AssessmentsHeader, FAMILY_SHORT } from "./meta";

type Row = Battery & { custom?: boolean };
const USE: Record<BatteryComponent["use"], { label: string; hint: string }> = {
  sift: { label: "Sift", hint: "Flags low scores for a person to review" },
  inform_interview: { label: "Inform interview", hint: "Guides the interview questions" },
  weighted: { label: "Weighted", hint: "Counts towards the overall decision" },
};

export function BatteriesPage() {
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [tests, setTests] = React.useState<Test[]>([]);
  const [vacancies, setVacancies] = React.useState<VacancyRecord[]>([]);
  const [editing, setEditing] = React.useState<BatteryDraft | null>(null);
  const [deleting, setDeleting] = React.useState<Row | null>(null);
  const [reload, setReload] = React.useState(0);

  React.useEffect(() => {
    services.assessments.batteries().then(setRows);
    services.assessments.library().then((l) => setTests(l.tests));
    services.vacancies.list().then(setVacancies);
  }, [reload]);

  const testOf = (id: string) => tests.find((t) => t.id === id);
  const draftFrom = (b: Row, copy: boolean): BatteryDraft => ({
    ...(copy ? {} : { id: b.id }),
    label: copy ? `${b.label} (copy)` : b.label,
    roleFamily: b.roleFamily,
    description: b.description,
    components: b.components.map((c) => ({ ...c })),
    deadlineDays: b.deadlineDays,
  });

  return (
    <PageContainer
      header={
        <AssessmentsHeader
          actions={
            <Button onClick={() => setEditing({ label: "", roleFamily: "", description: "", components: [], deadlineDays: 5 })}>
              <Plus />
              New battery
            </Button>
          }
        />
      }
    >
      {!rows ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-lg" />
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rows.map((b) => {
            const usedBy = vacancies.filter((v) => v.assessment.battery === b.id);
            return (
              <li key={b.id}>
                <Card className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold text-fg">
                        {b.label}
                        {b.custom && <span className="rounded-full bg-secondary-50 px-2 py-0.5 text-2xs font-semibold text-secondary-700">Custom</span>}
                      </h2>
                      <p className="text-xs text-fg-subtle">
                        {b.roleFamily} · about {b.totalMinutes} min · {b.deadlineDays}-day deadline
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button size="icon-sm" variant="ghost" aria-label={`Duplicate ${b.label}`} onClick={() => setEditing(draftFrom(b, true))}>
                        <Copy />
                      </Button>
                      {b.custom && (
                        <>
                          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${b.label}`} onClick={() => setEditing(draftFrom(b, false))}>
                            <Pencil />
                          </Button>
                          <Button size="icon-sm" variant="ghost" aria-label={`Delete ${b.label}`} onClick={() => setDeleting(b)}>
                            <Trash2 />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-fg-muted">{b.description}</p>
                  <ol className="mt-4 flex flex-col divide-y divide-line rounded-md border border-line">
                    {b.components.map((c) => {
                      const t = testOf(c.testId);
                      return (
                        <li key={c.testId} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                          <span className="min-w-0">
                            <Link href={`/assessments/library/${c.testId}`} className="block truncate font-medium text-fg hover:underline">
                              {t?.name ?? c.testId}
                            </Link>
                            <span className="text-xs text-fg-subtle">
                              {t ? `${FAMILY_SHORT[t.family]} · ${t.medianCompletionMin} min` : ""}
                              {c.optional && " · optional"}
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-xs">
                            <span className={cn("font-semibold", c.use === "weighted" ? "text-primary-700" : "text-fg-muted")}>{USE[c.use].label}</span>
                            {c.use === "sift" && c.reviewBelowPercentile !== undefined && <span className="block text-fg-subtle">review below {c.reviewBelowPercentile}th</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                  <div className="mt-auto pt-4">
                    <p className="text-xs text-fg-subtle">
                      {usedBy.length ? `Used by ${usedBy.map((v) => v.title).join(", ")}` : "Not used by any vacancy"}
                      {b.recommendedFor.length > 0 && ` · suits ${b.recommendedFor.slice(0, 3).join(", ").toLowerCase()}`}
                    </p>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <BatteryEditor
        draft={editing}
        tests={tests}
        onClose={() => setEditing(null)}
        onSaved={(b, isNew) => {
          toast.success(isNew ? "Battery created" : "Battery saved", `${b.label} · about ${b.totalMinutes} min`);
          setReload((r) => r + 1);
        }}
      />
      <ConfirmModal
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.label}?`}
        description="Invitations already sent with it keep their tests. This can't be undone."
        confirmLabel="Delete battery"
        onConfirm={async () => {
          try {
            await services.assessments.deleteBattery(deleting!.id);
            toast.success("Battery deleted", deleting!.label);
            setReload((r) => r + 1);
          } catch (e) {
            toast.error("Not deleted", e instanceof Error ? e.message : undefined);
          }
        }}
      />
    </PageContainer>
  );
}

function BatteryEditor({
  draft,
  tests,
  onClose,
  onSaved,
}: {
  draft: BatteryDraft | null;
  tests: Test[];
  onClose: () => void;
  onSaved: (b: Battery, isNew: boolean) => void;
}) {
  const [d, setD] = React.useState<BatteryDraft | null>(null);
  const [adding, setAdding] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the draft each time the editor opens
    setD(draft ? structuredClone(draft) : null);
    setError(null);
    setAdding("");
  }, [draft]);

  if (!d) return null;
  const minutes = d.components.filter((c) => !c.optional).reduce((s, c) => s + (tests.find((t) => t.id === c.testId)?.medianCompletionMin ?? 0), 0);
  const set = (patch: Partial<BatteryDraft>) => setD((x) => (x ? { ...x, ...patch } : x));
  const setComp = (i: number, patch: Partial<BatteryComponent>) => set({ components: d.components.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const move = (i: number, dir: -1 | 1) => {
    const next = [...d.components];
    const [x] = next.splice(i, 1);
    next.splice(i + dir, 0, x!);
    set({ components: next });
  };

  const save = async () => {
    setError(null);
    if (!d.label.trim()) return setError("Give the battery a name.");
    if (d.components.length === 0) return setError("Add at least one test.");
    if (d.components.every((c) => c.optional)) return setError("At least one test must be required.");
    setBusy(true);
    try {
      const b = await services.assessments.saveBattery(d);
      onSaved(b, !d.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Not saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onOpenChange={(o) => !o && onClose()}>
      <ModalContent
        size="lg"
        title={d.id ? "Edit battery" : "New battery"}
        description="A reusable set of tests for a type of role. Vacancies pick a battery, and HR can still add or remove tests per send."
        footer={
          <>
            <span className="mr-auto text-xs text-fg-subtle tabular">About {Math.round(minutes / 5) * 5 || 0} minutes for candidates</span>
            <ModalClose asChild>
              <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <Button loading={busy} onClick={save}>
              Save battery
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          {error && (
            <Alert tone="danger" title="Check the battery">
              {error}
            </Alert>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" required>
              <Input value={d.label} onChange={(e) => set({ label: e.target.value })} placeholder="e.g. Finance graduate battery" maxLength={60} />
            </Field>
            <Field label="Role family">
              <Input value={d.roleFamily} onChange={(e) => set({ roleFamily: e.target.value })} placeholder="e.g. Finance / accounting" />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea rows={2} value={d.description} onChange={(e) => set({ description: e.target.value })} placeholder="What it's for, in a sentence." />
            </Field>
            <Field label="Default deadline">
              <Select
                value={String(d.deadlineDays)}
                onValueChange={(v) => set({ deadlineDays: Number(v) })}
                options={[3, 5, 7, 10, 14].map((n) => ({ value: String(n), label: `${n} days` }))}
              />
            </Field>
          </div>

          <div>
            <p className="text-sm font-semibold text-fg">Tests</p>
            {d.components.length === 0 ? (
              <p className="mt-2 rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-sm text-fg-subtle">No tests yet. Add one below.</p>
            ) : (
              <ol className="mt-2 flex flex-col divide-y divide-line rounded-md border border-line">
                {d.components.map((c, i) => {
                  const t = tests.find((x) => x.id === c.testId);
                  return (
                    <li key={c.testId} className="grid grid-cols-1 gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-center">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-fg">{t?.name}</span>
                        <label className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-muted">
                          <Checkbox checked={!!c.optional} onCheckedChange={(v) => setComp(i, { optional: v === true || undefined })} />
                          Optional (HR adds it per send)
                        </label>
                      </span>
                      <Select
                        size="sm"
                        aria-label={`How ${t?.name} is used`}
                        value={c.use}
                        onValueChange={(v) => setComp(i, { use: v as BatteryComponent["use"], ...(v === "sift" ? { reviewBelowPercentile: c.reviewBelowPercentile ?? 30 } : {}) })}
                        options={Object.entries(USE).map(([value, u]) => ({ value, label: u.label, description: u.hint }))}
                      />
                      <span className="flex justify-end gap-0.5">
                        <Button size="icon-sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                          <ArrowUp />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label="Move down" disabled={i === d.components.length - 1} onClick={() => move(i, 1)}>
                          <ArrowDown />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label={`Remove ${t?.name}`} onClick={() => set({ components: d.components.filter((_, j) => j !== i) })}>
                          <X />
                        </Button>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
            <div className="mt-3 flex gap-2">
              <div className="flex-1">
                <Select
                  aria-label="Add a test"
                  value={adding}
                  onValueChange={setAdding}
                  placeholder="Add a test"
                  options={tests.filter((t) => !d.components.some((c) => c.testId === t.id)).map((t) => ({ value: t.id, label: t.name, description: `${FAMILY_SHORT[t.family]} · ${t.medianCompletionMin} min` }))}
                />
              </div>
              <Button
                variant="secondary"
                disabled={!adding}
                onClick={() => {
                  const t = tests.find((x) => x.id === adding)!;
                  set({ components: [...d.components, { testId: adding, use: t.family === "ability" ? "sift" : t.family === "personality" ? "inform_interview" : "weighted", ...(t.family === "ability" ? { reviewBelowPercentile: 30 } : {}) }] });
                  setAdding("");
                }}
              >
                <Plus />
                Add
              </Button>
            </div>
            <p className="mt-2 text-xs text-fg-subtle">Sift tests only flag candidates for a person to review. Nobody is rejected on a test score alone.</p>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}

