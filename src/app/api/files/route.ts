import { NextResponse, type NextRequest } from "next/server";
import { readSession } from "@/server/session";
import { storeUpload } from "@/server/files";
import { fromOwnSite } from "@/server/http";

/** Upload one file (multipart field "file"). Returns its id for use with the CV and document services. */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!fromOwnSite(req)) return NextResponse.json({ ok: false, error: "This request came from another site and was refused." }, { status: 403 });
  const s = await readSession();
  if (!s?.organisationId || !s.membership) return NextResponse.json({ ok: false, error: "Your session has ended. Sign in again." }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "No file was sent." }, { status: 400 });
  try {
    const row = await storeUpload(s.organisationId, file);
    return NextResponse.json({ ok: true, data: { fileId: row.id, name: row.name, sizeKb: Math.max(1, Math.round(row.sizeBytes / 1024)) } });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "The upload failed." }, { status: 400 });
  }
}
