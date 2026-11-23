import { NextResponse, type NextRequest } from "next/server";
import { asOrg } from "@/server/db";
import { fileBytes, fileFor } from "@/server/files";

/**
 * An organisation's logo, public because it appears in candidate emails and on the test pages. Only the file
 * the organisation's branding names as its logo is served here; any other file id is refused.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ org: string; file: string }> }) {
  const { org, file } = await params;
  if (!/^[a-z0-9_]{4,40}$/i.test(org) || !/^[a-z0-9_]{4,40}$/i.test(file)) return new NextResponse("Not found.", { status: 404 });
  const [row] = await asOrg(org, (tx) => tx<{ logo: string | null }[]>`select data->'branding'->>'logoFileId' as logo from records where organisation_id = ${org} and kind = 'settings' and id = '_'`);
  if (!row?.logo || row.logo !== file) return new NextResponse("Not found.", { status: 404 });
  const stored = await fileFor(org, file);
  if (!stored || !["image/png", "image/jpeg"].includes(stored.mime)) return new NextResponse("Not found.", { status: 404 });
  const bytes = await fileBytes(stored);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": stored.mime,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
