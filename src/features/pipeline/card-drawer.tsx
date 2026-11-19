"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardList, Sparkles, UserRound } from "@/components/icons";
import { Avatar, Button, Drawer } from "@/components/ui";
import { MatchScore } from "@/components/domain/assessment";
import { STAGE_META, StageBadge } from "@/components/domain/status-badge";
import { MOCK_NOW, type PipelineCard } from "@/services";
import { cn, formatDate, timeAgo } from "@/lib/utils";
import { TestLine } from "./test-line";

const NOW = new Date(MOCK_NOW);
const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function CardDrawer({
  card,
  vacancyId,
  onClose,
  onMove,
  onSendTests,
  canSendTests,
}: {
  card: PipelineCard | null;
  vacancyId: string;
  onClose: () => void;
  onMove: (c: PipelineCard) => void;
  onSendTests: (c: PipelineCard) => void;
  canSendTests: boolean;
}) {
  const closed = card?.stage === "hired" || card?.stage === "withdrawn";
  return (
    <Drawer open={!!card} onOpenChange={(o) => !o && onClose()} title="Application" className="w-[min(28rem,94vw)]">
      {card && (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-col gap-4 border-b border-line px-5 py-5">
            <div className="flex items-start gap-3">
              <Avatar name={card.name} />
              <div className="min-w-0">
                <p className="font-semibold text-fg">{card.name}</p>
                <p className="text-sm text-fg-muted">
                  {card.headline} · {card.location}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StageBadge stage={card.stage} size="sm" />
                  <span className="text-xs text-fg-subtle">since {timeAgo(card.stageSince, NOW)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md bg-ink-50 px-3 py-2.5">
              <MatchScore score={card.matchScore} provenance={card.provenance} showTag />
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/matching/${vacancyId}/${card.candidateId}`}>
                  <Sparkles />
                  Assessment
                </Link>
              </Button>
            </div>
            {card.tests ? (
              <div className="rounded-md border border-line px-3 py-2.5">
                <p className="text-xs font-semibold text-fg-subtle">{card.tests.battery}</p>
                <TestLine tests={card.tests} className="mt-1" />
              </div>
            ) : (
              canSendTests &&
              !closed &&
              card.stage !== "rejected" && (
                <Button variant="secondary" size="sm" className="self-start" onClick={() => onSendTests(card)}>
                  <ClipboardList />
                  Send psychometric tests
                </Button>
              )
            )}
            <div className="flex gap-2">
              {!closed && (
                <Button className="flex-1" onClick={() => onMove(card)}>
                  Move stage
                </Button>
              )}
              <Button variant="secondary" className={cn(closed && "flex-1")} asChild>
                <Link href={`/candidates/${card.candidateId}`}>
                  <UserRound />
                  Profile
                </Link>
              </Button>
            </div>
          </div>

          <section className="px-5 py-5" aria-labelledby="record-h">
            <h3 id="record-h" className="text-sm font-semibold text-fg">
              Decision record
            </h3>
            <p className="mt-0.5 text-xs text-fg-subtle">
              Every move, who made it and why. Applied {formatDate(card.appliedAt)} via {card.source}.
            </p>
            <ol className="mt-4 flex flex-col">
              {[...card.history].reverse().map((h, i, arr) => (
                <li key={`${h.stage}-${h.at}`} className="relative grid grid-cols-[1rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
                  <span className="relative flex justify-center" aria-hidden>
                    <span className={cn("mt-1.5 size-2.5 rounded-full", i === 0 ? "bg-primary-500 ring-4 ring-primary-100" : "bg-ink-300")} />
                    {i < arr.length - 1 && <span className="absolute top-4 h-[calc(100%-0.5rem)] w-px bg-line" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-fg">
                      <span className="font-semibold">{STAGE_META[h.stage].label}</span>
                      <span className="text-fg-muted"> · {h.by}</span>
                    </p>
                    <p className="text-xs text-fg-subtle tabular">{when(h.at)}</p>
                    {h.note && <p className="mt-1.5 rounded-md bg-ink-50 px-2.5 py-1.5 text-sm text-fg-muted">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </Drawer>
  );
}
