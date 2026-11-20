"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Folder, MapPin, NotePencil, Trash2, Users, X } from "@/components/icons";
import { LoadError, Avatar, Badge, Button, Card, ConfirmModal, EmptyState, Pagination, Skeleton, Textarea, toast, usePagination } from "@/components/ui";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { services } from "@/services";
import type { Collection, TalentHit } from "@/types/talent";
import { timeAgo } from "@/lib/utils";
import { MOCK_NOW } from "@/mocks/data";

const MOCK_DATE = new Date(MOCK_NOW);
import { AddToCollectionDialog, COUNTRY, ConsentBadge, TestChips } from "./meta";
import { TalentDrawer } from "./talent-drawer";

type Member = TalentHit & { note: string; addedBy: string; addedAt: string };

export function CollectionDetail({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = React.useState<{ collection: Collection; hits: Member[] } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [reload, setReload] = React.useState(0);
  const [open, setOpen] = React.useState<TalentHit | null>(null);
  const [collecting, setCollecting] = React.useState<TalentHit | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    services.talent
      .collection(id)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [id, reload]);

  if (error)
    return (
      <PageContainer header={<PageHeader title="Collection" />}>
        <LoadError title="Collection didn't load" onRetry={() => (setError(null), setReload((r) => r + 1))}>
          {error}
        </LoadError>
      </PageContainer>
    );
  if (!data)
    return (
      <PageContainer header={<Skeleton className="h-16 w-80 rounded-md" />}>
        <Skeleton className="h-96 rounded-lg" />
      </PageContainer>
    );

  const c = data.collection;
  async function remove(m: Member) {
    await services.talent.removeFromCollection(c.id, m.id);
    setReload((r) => r + 1);
    toast.withUndo(`${m.name} removed`, async () => {
      await services.talent.addToCollection(c.id, [{ id: m.id, kind: m.kind }]);
      if (m.note) await services.talent.setNote(c.id, m.id, m.note);
      setReload((r) => r + 1);
    });
  }

  return (
    <PageContainer
      header={
        <div className="flex flex-col gap-3">
          <Link href="/talent?tab=collections" className="inline-flex items-center gap-1 text-sm font-medium text-fg-subtle hover:text-fg">
            <ArrowLeft className="size-4" />
            Collections
          </Link>
          <PageHeader
            title={c.name}
            description={c.description || undefined}
            actions={
              <Button variant="ghost" onClick={() => setDeleting(true)}>
                <Trash2 />
                Delete collection
              </Button>
            }
          />
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-fg-subtle">
            <span className="inline-flex items-center gap-1 font-semibold text-fg tabular">
              <Users className="size-3.5" />
              {c.members.length} {c.members.length === 1 ? "person" : "people"}
            </span>
            <span>· owned by {c.owner}</span>
            <span>· {c.sharedWith.length ? `shared with ${c.sharedWith.join(", ")}` : "only you"}</span>
            <span>· updated {timeAgo(c.updatedAt, MOCK_DATE)}</span>
          </p>
        </div>
      }
    >
      {data.hits.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Folder />}
            title="Nobody here yet"
            description="Find people in the talent pool and add them to this collection."
            action={
              <Button size="sm" asChild>
                <Link href="/talent">Search the pool</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <CollectionMembers hits={data.hits} render={(m) => (
            <MemberRow key={m.id} m={m} collectionId={c.id} onOpen={() => setOpen(m)} onRemove={() => remove(m)} />
          )} />
      )}
      <TalentDrawer hit={open} onOpenChange={(o) => !o && setOpen(null)} onChanged={() => setReload((r) => r + 1)} onCollect={setCollecting} />
      <AddToCollectionDialog open={!!collecting} onOpenChange={(o) => !o && setCollecting(null)} people={collecting ? [{ id: collecting.id, kind: collecting.kind, name: collecting.name }] : []} onAdded={() => setReload((r) => r + 1)} />
      <ConfirmModal
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete “${c.name}”?`}
        description="The collection and its notes are removed for everyone it's shared with. The people in it stay in the talent pool."
        confirmLabel="Delete collection"
        tone="danger"
        onConfirm={async () => {
          await services.talent.deleteCollection(c.id);
          toast.success("Collection deleted", c.name);
          router.push("/talent?tab=collections");
        }}
      />
    </PageContainer>
  );
}

function CollectionMembers({ hits, render }: { hits: Member[]; render: (m: Member) => React.ReactNode }) {
  const pager = usePagination(hits, { pageSize: 10 });
  const top = React.useRef<HTMLUListElement>(null);
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex scroll-mt-16 flex-col gap-3" ref={top}>
        {pager.items.map(render)}
      </ul>
      <Pagination p={pager} noun={["person", "people"]} sizes={[10, 25, 50]} anchor={top} className="px-1" />
    </div>
  );
}

function MemberRow({ m, collectionId, onOpen, onRemove }: { m: Member; collectionId: string; onOpen: () => void; onRemove: () => void }) {
  const [editing, setEditing] = React.useState(false);
  const [note, setNote] = React.useState(m.note);
  return (
    <li>
      <Card className="flex gap-3 p-4 sm:gap-4 sm:p-5">
        <Avatar name={m.name} className="hidden sm:flex" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {m.kind === "candidate" ? (
                <Link href={`/candidates/${m.id}`} className="text-md font-semibold text-fg hover:underline">
                  {m.name}
                </Link>
              ) : (
                <button type="button" onClick={onOpen} className="text-left text-md font-semibold text-fg hover:underline">
                  {m.name}
                </button>
              )}
              <p className="truncate text-sm text-fg-muted">{m.headline}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-fg-subtle">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" />
                  {m.location}, {COUNTRY[m.country]}
                </span>
                <span>· {m.availability}</span>
              </p>
            </div>
            <Button size="icon-sm" variant="ghost" aria-label={`Remove ${m.name} from this collection`} onClick={onRemove}>
              <X />
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {m.kind === "candidate" ? <Badge tone="primary" size="sm">Applied: {m.application?.vacancyTitle}</Badge> : <Badge tone="outline" size="sm">{m.source}</Badge>}
            <ConsentBadge until={m.consentUntil} />
            <TestChips hit={m} />
          </div>

          <div className="mt-3 rounded-md bg-ink-50 px-3 py-2.5">
            {editing ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await services.talent.setNote(collectionId, m.id, note);
                  setEditing(false);
                  toast.success("Note saved");
                }}
                className="flex flex-col gap-2"
              >
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} autoFocus aria-label={`Note about ${m.name}`} placeholder="Why they're here, and when to call" />
                <div className="flex gap-2">
                  <Button size="sm" type="submit">
                    Save note
                  </Button>
                  <Button size="sm" variant="ghost" type="button" onClick={() => (setNote(m.note), setEditing(false))}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <button type="button" onClick={() => setEditing(true)} className="flex w-full items-start gap-2 text-left">
                <NotePencil className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
                <span className="min-w-0 flex-1 text-sm">
                  {note ? <span className="text-fg">{note}</span> : <span className="text-fg-subtle">Add a note</span>}
                  <span className="mt-0.5 block text-2xs text-fg-subtle">
                    Added by {m.addedBy} {timeAgo(m.addedAt, MOCK_DATE)}
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>
      </Card>
    </li>
  );
}
