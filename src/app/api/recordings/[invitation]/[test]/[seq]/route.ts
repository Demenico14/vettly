import { NextResponse, type NextRequest } from "next/server";
import { actorFrom, readSession } from "@/server/session";
import { getObject } from "@/server/storage";
import { withOrg } from "@/server/store";
import { can } from "@/server/services/settings";
import { invitationStore } from "@/server/services/assessments";
import { recordingKey } from "@/server/services/recordings";

/**
 * One piece of a test recording, for people who can see test reports in the organisation that owns it. Shown
 * inline only and never cached. Opening a recording is logged by recordings.playback, which lists these pieces.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ invitation: string; test: string; seq: string }> }) {
  const { invitation, test, seq } = await params;
  const s = await readSession();
  if (!s?.organisationId || !s.membership) return new NextResponse("Sign in to view this recording.", { status: 401 });
  const org = s.organisationId;
  const piece = await withOrg(org, actorFrom(s), () => {
    if (!can("view_test_reports")) return "forbidden" as const;
    const r = invitationStore.find((x) => x.id === invitation);
    const p = r?.recording?.pieces.find((x) => x.testId === test && x.seq === Number(seq));
    return r && p ? { key: recordingKey(org, r.id, p), mime: p.mime } : null;
  });
  if (piece === "forbidden") return new NextResponse("Your role can't open test recordings.", { status: 403 });
  if (!piece) return new NextResponse("Recording not found.", { status: 404 });
  const bytes = await getObject(piece.key);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": piece.mime,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
