import { NextResponse, type NextRequest } from "next/server";
import { actorFrom, readSession } from "@/server/session";
import { withOrg } from "@/server/store";
import { can } from "@/server/services/settings";
import { letterDocument, letterPdfFor } from "@/server/services/offers";

/** The offer letter as a PDF on the organisation's letterhead, for people who can see candidates. */
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await readSession();
  if (!s?.organisationId || !s.membership) return new NextResponse("Sign in to download this letter.", { status: 401 });
  let doc: ReturnType<typeof letterDocument>;
  try {
    const found = await withOrg(s.organisationId, actorFrom(s), () => (can("view_candidates") ? letterDocument(id) : null));
    if (!found) return new NextResponse("Your role can't open offer letters.", { status: 403 });
    doc = found;
  } catch {
    return new NextResponse("Offer not found.", { status: 404 });
  }
  const pdf = await letterPdfFor(doc);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.byteLength),
      "Content-Disposition": `attachment; filename="${doc.fileName.replace(/[^\w.\- ]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
