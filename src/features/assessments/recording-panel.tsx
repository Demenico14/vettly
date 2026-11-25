"use client";

import * as React from "react";
import { Trash2, Video } from "@/components/icons";
import { Alert, Button, Card, CardHeader, Select, Textarea, toast } from "@/components/ui";
import { Modal, ModalContent } from "@/components/ui/modal";
import { services, type RecordingSummary } from "@/services";
import { day } from "./meta";

/** Dates that may be months away carry the year. */
const longDay = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Harare" }).format(new Date(iso));
const size = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/**
 * The recording side of a test report: what the candidate chose, what was kept, when it goes, and the few things
 * HR can do (watch, keep longer with a reason, let a decliner test without recording, delete now). Every
 * viewing and change is written to the invitation's activity log by the server.
 */
export function RecordingPanel({ invitationId, candidateName, testName, onChanged }: { invitationId: string; candidateName: string; testName: (id: string) => string; onChanged: () => void }) {
  const [sum, setSum] = React.useState<RecordingSummary | null | undefined>(undefined);
  const [watching, setWatching] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<null | "hold" | "waive" | "delete">(null);
  const [reason, setReason] = React.useState("");
  const [days, setDays] = React.useState("30");
  const [busy, setBusy] = React.useState(false);
  const first = candidateName.split(" ")[0];

  const load = React.useCallback(() => {
    services.recordings
      .summary(invitationId)
      .then(setSum)
      .catch(() => setSum(null));
  }, [invitationId]);
  React.useEffect(load, [load]);

  if (!sum) return null;

  const act = async (fn: () => Promise<RecordingSummary>, done: string) => {
    setBusy(true);
    try {
      setSum(await fn());
      setForm(null);
      setReason("");
      toast.success(done);
      onChanged();
    } catch (e) {
      toast.error("Not changed", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  const what = sum.mode === "photos" ? "Photos every 20 seconds" : sum.audio ? "Video with sound" : "Video without sound";
  return (
    <Card>
      <CardHeader title="Recording" description={`${what} · deleted ${sum.keepDays} days after the application closes`} />
      <div className="flex flex-col gap-4 px-5 pb-5 text-sm">
        {sum.deleted ? (
          <p className="text-fg-muted">
            Deleted on {day(sum.deleted.at)}: {sum.deleted.why}. {sum.deleted.pieces} {sum.mode === "photos" ? "photos" : "pieces"} removed.
          </p>
        ) : sum.choice === "declined" && !sum.waived ? (
          <Alert tone="warning" title={`${first} chose not to be recorded`}>
            Their tests wait until you let them take the tests without recording, or arrange a supervised session. Declining must not count against them.
          </Alert>
        ) : sum.choice === null && !sum.waived ? (
          <p className="text-fg-muted">{first} hasn&apos;t chosen yet. They&apos;re asked before their first test.</p>
        ) : sum.waived ? (
          <p className="text-fg-muted">
            Taking the tests without recording, agreed by {sum.waived.by} on {day(sum.waived.at)}: {sum.waived.reason}
          </p>
        ) : (
          <p className="text-fg-muted">
            {first} agreed in writing{sum.choiceAt ? ` on ${day(sum.choiceAt)}` : ""}.
          </p>
        )}

        {sum.tests.length > 0 && (
          <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
            {sum.tests.map((t) => (
              <li key={t.testId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{testName(t.testId)}</p>
                  <p className="text-xs text-fg-subtle tabular">
                    {sum.mode === "photos" ? `${t.pieces} photo${t.pieces === 1 ? "" : "s"}` : `About ${Math.max(1, Math.round((t.pieces * 10) / 60))} min of video`} ·{" "}
                    {size(t.bytes)}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setWatching(t.testId)}>
                  <Video />
                  View
                </Button>
              </li>
            ))}
          </ul>
        )}

        {sum.deletesOn && !sum.deleted && (
          <p className="text-xs text-fg-subtle">
            {sum.hold ? (
              <>
                Kept until {longDay(sum.hold.until)} by {sum.hold.by}: {sum.hold.reason}.{" "}
                <button type="button" className="font-semibold text-primary-700 hover:underline" disabled={busy} onClick={() => act(() => services.recordings.releaseHold(invitationId), "Hold released")}>
                  Release
                </button>
              </>
            ) : (
              <>Deleted automatically on {longDay(sum.deletesOn)}. Only people who can see test reports can view it; each viewing is logged.</>
            )}
          </p>
        )}

        {!sum.deleted && (
          <div className="flex flex-wrap gap-2">
            {sum.choice === "declined" && !sum.waived && (
              <Button size="sm" onClick={() => setForm("waive")}>
                Let them test without recording
              </Button>
            )}
            {sum.tests.length > 0 && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setForm("hold")}>
                  Keep longer
                </Button>
                <Button size="sm" variant="danger-ghost" onClick={() => setForm("delete")}>
                  <Trash2 />
                  Delete now
                </Button>
              </>
            )}
          </div>
        )}

        {form && (
          <div className="flex flex-col gap-3 rounded-md border border-line p-3">
            <p className="font-medium text-fg">
              {form === "hold" ? "Keep the recording while you look into a concern" : form === "waive" ? `Let ${first} take the tests without recording` : "Delete the recording now"}
            </p>
            {form === "hold" && (
              <Select
                value={days}
                onValueChange={setDays}
                options={[7, 30, 90].map((d) => ({ value: String(d), label: `${d} more days from today` }))}
                className="max-w-xs"
              />
            )}
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder={form === "hold" ? "What you're looking into" : form === "waive" ? "For example: no camera at home; supervised session not needed" : "For example: the candidate asked for deletion"}
              aria-label="Reason"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={form === "delete" ? "danger" : "primary"}
                loading={busy}
                onClick={() =>
                  form === "hold"
                    ? act(() => services.recordings.hold(invitationId, Number(days), reason), "Recording kept longer")
                    : form === "waive"
                      ? act(() => services.recordings.waive(invitationId, reason), `${first} can take the tests without recording`)
                      : act(() => services.recordings.remove(invitationId, reason), "Recording deleted")
                }
              >
                {form === "hold" ? "Keep it" : form === "waive" ? "Allow" : "Delete"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setForm(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
      {watching && <Player invitationId={invitationId} testId={watching} title={testName(watching)} onClose={() => (setWatching(null), onChanged())} />}
    </Card>
  );
}

/** Plays one test's recording: video pieces joined in order, or the photos with their times. */
function Player({ invitationId, testId, title, onClose }: { invitationId: string; testId: string; title: string; onClose: () => void }) {
  const [state, setState] = React.useState<{ kind: "loading" } | { kind: "error"; message: string } | { kind: "video"; url: string } | { kind: "photos"; items: { url: string; at: string }[] }>({ kind: "loading" });

  React.useEffect(() => {
    let url: string | null = null;
    let alive = true;
    services.recordings
      .playback(invitationId, testId)
      .then(async ({ mime, pieces }) => {
        if (mime === "image/jpeg") return alive && setState({ kind: "photos", items: pieces.map((p) => ({ url: p.url, at: p.at })) });
        const parts = await Promise.all(pieces.map((p) => fetch(p.url, { credentials: "same-origin" }).then((r) => (r.ok ? r.blob() : Promise.reject(new Error("A piece couldn't be loaded."))))));
        url = URL.createObjectURL(new Blob(parts, { type: mime }));
        if (alive) setState({ kind: "video", url });
      })
      .catch((e: Error) => alive && setState({ kind: "error", message: e.message }));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [invitationId, testId]);

  return (
    <Modal open onOpenChange={(o) => !o && onClose()}>
      <ModalContent size="lg" title={title} description="Opening this recording is logged. It can't be downloaded.">
        {state.kind === "loading" && <p className="text-sm text-fg-muted">Loading the recording…</p>}
        {state.kind === "error" && <Alert tone="danger" title="Couldn't open the recording">{state.message}</Alert>}
        {state.kind === "video" && (
          <video src={state.url} controls controlsList="nodownload noplaybackrate" disablePictureInPicture onContextMenu={(e) => e.preventDefault()} className="w-full rounded-md bg-ink-900" />
        )}
        {state.kind === "photos" && (
          <ul className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {state.items.map((p) => (
              <li key={p.url} className="overflow-hidden rounded-md bg-ink-900">
                {/* eslint-disable-next-line @next/next/no-img-element -- private, uncached pieces served by our own route */}
                <img src={p.url} alt={`Photo at ${new Date(p.at).toLocaleTimeString("en-GB")}`} onContextMenu={(e) => e.preventDefault()} className="aspect-[4/3] w-full object-cover" />
                <p className="px-2 py-1 text-2xs text-white/70 tabular">{new Date(p.at).toLocaleTimeString("en-GB", { timeZone: "Africa/Harare" })}</p>
              </li>
            ))}
          </ul>
        )}
      </ModalContent>
    </Modal>
  );
}
