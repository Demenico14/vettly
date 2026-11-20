"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Alert, Button, Card, Select, Skeleton, toast } from "@/components/ui";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { services } from "@/services";
import type { OrgSettings } from "@/types/settings";
import { cn } from "@/lib/utils";

import { SECTIONS, type SectionId } from "./sections";

export { SECTIONS, type SectionId };

export function SettingsShell({ section, children }: { section: SectionId; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const groups = [...new Set(SECTIONS.map((s) => s.group))];
  return (
    <PageContainer header={<PageHeader title="Settings" description="How Msasa Financial uses Vettly: your organisation, people, hiring rules, privacy and plan." />}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <div className="lg:hidden">
          <Select value={section} onValueChange={(v) => router.push(`/settings/${v}`)} options={SECTIONS.map((s) => ({ value: s.id, label: s.label, description: s.group }))} />
        </div>
        <nav aria-label="Settings sections" className="hidden lg:block">
          <div className="sticky top-4 flex flex-col gap-4">
            {groups.map((g) => (
              <div key={g}>
                <p className="px-3 pb-1 text-xs font-medium text-fg-muted">{g}</p>
                <ul>
                  {SECTIONS.filter((s) => s.group === g).map((s) => {
                    const active = path === `/settings/${s.id}`;
                    return (
                      <li key={s.id}>
                        <Link href={`/settings/${s.id}`} aria-current={active ? "page" : undefined} className={cn("block rounded-md px-3 py-1.5 text-sm transition-colors", active ? "bg-surface font-semibold text-fg shadow-platter" : "text-fg-muted hover:bg-ink-100 hover:text-fg")}>
                          {s.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </PageContainer>
  );
}

/** Loads one settings section and tracks unsaved edits. */
export function useSection<K extends keyof OrgSettings>(key: K) {
  const [saved, setSaved] = React.useState<OrgSettings[K] | null>(null);
  const [draft, setDraft] = React.useState<OrgSettings[K] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    services.settings.get().then((s) => {
      setSaved(s[key]);
      setDraft(s[key]);
    });
  }, [key]);

  const dirty = saved !== null && JSON.stringify(saved) !== JSON.stringify(draft);
  const set = <F extends keyof OrgSettings[K]>(field: F, value: OrgSettings[K][F]) => setDraft((d) => (d ? { ...d, [field]: value } : d));

  React.useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const v = await services.settings.save(key, draft);
      setSaved(v);
      setDraft(v);
      toast.success("Changes saved", "Recorded in the audit log.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return { draft, set, setDraft, dirty, save, saving, error, discard: () => (setDraft(saved), setError(null)) };
}

/** Sticky bar that appears while a section has unsaved changes. */
export function SaveBar({ dirty, saving, error, onSave, onDiscard }: { dirty: boolean; saving: boolean; error: string | null; onSave: () => void; onDiscard: () => void }) {
  if (!dirty && !error) return null;
  return (
    <div className="sticky bottom-4 z-20 mt-6">
      <div className="material-bar flex flex-col gap-3 rounded-lg px-4 py-3 shadow-lg sm:flex-row sm:items-center">
        <p className={cn("text-sm", error ? "font-medium text-danger-700" : "text-fg-muted")} role={error ? "alert" : undefined}>
          {error ?? "You have unsaved changes."}
        </p>
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="ghost" onClick={onDiscard} disabled={saving}>
            Discard
          </Button>
          <Button onClick={onSave} loading={saving} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

/** A titled group of settings: title and explanation, then the controls. */
export function Group({ title, description, children, actions }: { title: string; description?: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold text-fg">{title}</h2>
          {description && <p className="mt-0.5 max-w-2xl text-sm text-fg-muted">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="px-5 py-5">{children}</div>
    </Card>
  );
}

/** A label on the left and its control on the right, stacking on small screens. */
export function Row({ label, hint, children, htmlFor }: { label: string; hint?: React.ReactNode; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="grid grid-cols-1 gap-2 border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:gap-6">
      <div>
        <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function SectionSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}

export function ReadOnlyNote({ children }: { children: React.ReactNode }) {
  return (
    <Alert tone="info" title="View only">
      {children}
    </Alert>
  );
}
