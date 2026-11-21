import { NextResponse, type NextRequest } from "next/server";
import { actorFrom, readSession } from "@/server/session";
import { fileBytes, fileFor } from "@/server/files";
import { withOrg } from "@/server/store";
import { can } from "@/server/services/settings";

/** Download a stored file. Only members of the organisation that owns it can read it. */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await readSession();
  if (!s?.organisationId || !s.membership) return new NextResponse("Sign in to view this file.", { status: 401 });
  // Files are CVs and candidate documents, so the role must be allowed to see candidates.
  const allowed = await withOrg(s.organisationId, actorFrom(s), () => can("view_candidates"));
  if (!allowed) return new NextResponse("Your role can't open candidate files.", { status: 403 });
  const row = await fileFor(s.organisationId, id);
  if (!row) return new NextResponse("File not found.", { status: 404 });
  const bytes = await fileBytes(row);
  const inline = req.nextUrl.searchParams.get("download") !== "1";
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": row.mime,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${row.name.replace(/[^\w.\- ]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
