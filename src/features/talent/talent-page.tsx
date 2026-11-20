"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, BellOff, Folder, MoreHorizontal, Play, Plus, Trash2, Users } from "@/components/icons";
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  Field,
  Input,
  Modal,
  ModalClose,
  ModalContent,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from "@/components/ui";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { services } from "@/services";
import type { Collection, SavedSearch, TalentFilters } from "@/types/talent";
import { timeAgo } from "@/lib/utils";
import { MOCK_NOW } from "@/services";

const MOCK_DATE = new Date(MOCK_NOW);
import { describe } from "./meta";
import { TalentSearch } from "./talent-search";

type Tab = "search" | "saved" | "collections";

export function TalentPage() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as Tab) || "search";
  const vacancyId = params.get("vacancy");
  const [searches, setSearches] = React.useState<(SavedSearch & { matches: number })[] | null>(null);
  const [cols, setCols] = React.useState<Collection[] | null>(null);
  const [run, setRun] = React.useState<{ filters: TalentFilters; n: number } | null>(null);
  const [reload, setReload] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    services.talent.savedSearches().then(async (ss) => {
      const counts = await Promise.all(ss.map((s) => services.talent.search(s.filters).then((r) => r.hits.length)));
      if (alive) setSearches(ss.map((s, i) => ({ ...s, matches: counts[i]! })));
    });
    services.talent.collections().then((c) => alive && setCols(c));
    return () => {
      alive = false;
    };
  }, [reload]);

  const go = (t: Tab) => router.replace(t === "search" ? "/talent" : `/talent?tab=${t}`, { scroll: false });
  const fresh = (searches ?? []).reduce((s, x) => s + x.newSinceLastRun, 0);

  return (
    <PageContainer
      header={
        <PageHeader
          title="Talent pool"
          description="Past applicants, referrals and people you've sourced, searchable by skill and test result alongside today's applicants."
        />
      }
    >
      <Tabs value={tab} onValueChange={(v) => go(v as Tab)}>
        <TabsList>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="saved" count={searches?.length}>
            Saved searches
            {fresh > 0 && <span className="rounded-full bg-accent-50 px-1.5 text-2xs leading-4 font-bold text-accent-700 tabular">{fresh} new</span>}
          </TabsTrigger>
          <TabsTrigger value="collections" count={cols?.length}>
            Collections
          </TabsTrigger>
        </TabsList>
        <TabsContent value="search" forceMount className="data-[state=inactive]:hidden">
          <TalentSearch key={run?.n ?? 0} initial={run?.filters ?? null} vacancyId={vacancyId} onSaved={() => setReload((r) => r + 1)} />
        </TabsContent>
        <TabsContent value="saved">
          <SavedSearches
            rows={searches}
            onRun={(s) => {
              services.talent.markRun(s.id);
              setRun((r) => ({ filters: { ...s.filters }, n: (r?.n ?? 0) + 1 }));
              go("search");
              setReload((r) => r + 1);
            }}
            onChanged={() => setReload((r) => r + 1)}
          />
        </TabsContent>
        <TabsContent value="collections">
          <Collections rows={cols} onChanged={() => setReload((r) => r + 1)} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

function SavedSearches({ rows, onRun, onChanged }: { rows: (SavedSearch & { matches: number })[] | null; onRun: (s: SavedSearch) => void; onChanged: () => void }) {
  const [deleting, setDeleting] = React.useState<SavedSearch | null>(null);
  if (!rows) return <Skeleton className="h-64 rounded-lg" />;
  if (!rows.length)
    return (
      <Card>
        <EmptyState icon={<Bell />} title="No saved searches" description="Save a search to come back to it, and get an email when someone new matches." />
      </Card>
    );
  return (
    <>
      <ul className="flex flex-col gap-3">
        {rows.map((s) => (
          <li key={s.id}>
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-md font-semibold text-fg">{s.name}</h2>
                  {s.newSinceLastRun > 0 && (
                    <Badge tone="accent" size="sm" dot>
                      {s.newSinceLastRun} new
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-fg-muted">{describe(s.filters)}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-fg-subtle">
                  <span>{s.owner}</span>
                  <span>· last run {timeAgo(s.lastRunAt, MOCK_DATE)}</span>
                  <span className="inline-flex items-center gap-1">
                    · {s.alert === "off" ? <BellOff className="size-3" /> : <Bell className="size-3" />}
                    {s.alert === "off" ? "No emails" : `${s.alert === "daily" ? "Daily" : "Weekly"} email`}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-fg-muted">
                  <span className="text-lg font-bold text-fg tabular">{s.matches}</span> {s.matches === 1 ? "match" : "matches"}
                </span>
                <Button size="sm" onClick={() => onRun(s)}>
                  <Play />
                  Run
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon-sm" variant="ghost" aria-label={`More for ${s.name}`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {(["daily", "weekly", "off"] as const)
                      .filter((a) => a !== s.alert)
                      .map((a) => (
                        <DropdownMenuItem
                          key={a}
                          onSelect={async () => {
                            await services.talent.setAlert(s.id, a);
                            toast.success(a === "off" ? "Emails turned off" : `You'll get a ${a} email`, s.name);
                            onChanged();
                          }}
                        >
                          {a === "off" ? <BellOff /> : <Bell />}
                          {a === "off" ? "Stop emails" : `Email me ${a}`}
                        </DropdownMenuItem>
                      ))}
                    <DropdownMenuItem tone="danger" onSelect={() => setDeleting(s)}>
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <ConfirmModal
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this saved search?"
        description={`“${deleting?.name}” and its emails stop. People it found stay in the pool.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={async () => {
          await services.talent.deleteSearch(deleting!.id);
          toast.success("Saved search deleted");
          onChanged();
        }}
      />
    </>
  );
}

function Collections({ rows, onChanged }: { rows: Collection[] | null; onChanged: () => void }) {
  const [creating, setCreating] = React.useState(false);
  if (!rows) return <Skeleton className="h-64 rounded-lg" />;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">Shortlists of people to come back to, shared with the people you choose.</p>
        <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
          <Plus />
          New collection
        </Button>
      </div>
      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={<Folder />} title="No collections yet" description="Select people in search results and add them to a collection." />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/talent/collections/${c.id}`} className="pressable block h-full rounded-lg bg-surface p-5 shadow-platter transition-shadow hover:shadow-md">
                <span className="flex items-center gap-2 text-md font-semibold text-fg">
                  <Folder className="size-4 text-secondary-600" />
                  {c.name}
                </span>
                {c.description && <span className="mt-1 line-clamp-2 block text-sm text-fg-muted">{c.description}</span>}
                <span className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-fg-subtle">
                  <span className="inline-flex items-center gap-1 font-semibold text-fg tabular">
                    <Users className="size-3.5" />
                    {c.members.length}
                  </span>
                  <span>· {c.owner}</span>
                  {c.sharedWith.length > 0 && <span>· shared with {c.sharedWith.length}</span>}
                  <span>· updated {timeAgo(c.updatedAt, MOCK_DATE)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <NewCollectionDialog open={creating} onOpenChange={setCreating} onCreated={onChanged} />
    </div>
  );
}

function NewCollectionDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        size="sm"
        title="New collection"
        footer={
          <>
            <ModalClose asChild>
              <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <Button
              loading={busy}
              disabled={!name.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  const c = await services.talent.createCollection(name, desc);
                  toast.success("Collection created", c.name);
                  setName("");
                  setDesc("");
                  setError(null);
                  onOpenChange(false);
                  onCreated();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Name" error={error ?? undefined}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Treasury specialists" autoFocus />
          </Field>
          <Field label="What it's for" optional>
            <Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </Field>
        </div>
      </ModalContent>
    </Modal>
  );
}

