import "server-only";
/** The organisation's logo as bytes, for PDFs and email attachments. */
import type { Letterhead } from "@/lib/letterhead";
import { fileBytes, fileFor } from "./files";

export async function logoImage(head: Letterhead): Promise<{ data: Buffer; format: "png" | "jpg"; mime: string } | null> {
  if (!head.logoFileId) return null;
  const f = await fileFor(head.organisationId, head.logoFileId).catch(() => null);
  if (!f || !["image/png", "image/jpeg"].includes(f.mime)) return null;
  try {
    return { data: Buffer.from(await fileBytes(f)), format: f.mime === "image/png" ? "png" : "jpg", mime: f.mime };
  } catch {
    return null;
  }
}
