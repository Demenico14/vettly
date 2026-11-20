import "server-only";
import { and, eq } from "drizzle-orm";
import { db, ready, schema } from "./db";
import { newId } from "./context";
import { sha256 } from "./crypto";
import { getObject, putObject } from "./storage";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export type StoredFile = typeof schema.files.$inferSelect;

/** Stores an uploaded file for an organisation and returns its record. */
export async function storeUpload(organisationId: string, file: File): Promise<StoredFile> {
  await ready();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = ALLOWED[ext];
  if (!mime) throw new Error(`${file.name}: upload a PDF, Word document or image.`);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} is larger than 15 MB.`);
  if (file.size === 0) throw new Error(`${file.name} is empty.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (ext === "pdf" && !(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) throw new Error(`${file.name} isn't a valid PDF.`);
  const id = newId("file");
  const key = `${organisationId}/${id}`;
  await putObject(key, bytes, mime);
  const [row] = await db
    .insert(schema.files)
    .values({ id, organisationId, name: file.name.slice(0, 200), mime, sizeBytes: file.size, sha256: sha256(Buffer.from(bytes).toString("binary")), storageKey: key })
    .returning();
  return row!;
}

export async function fileFor(organisationId: string, id: string) {
  await ready();
  const [row] = await db.select().from(schema.files).where(and(eq(schema.files.id, id), eq(schema.files.organisationId, organisationId)));
  return row ?? null;
}

export async function fileBytes(row: StoredFile) {
  return getObject(row.storageKey);
}

export type TextResult = { ok: true; text: string; pages: number } | { ok: false; failure: "password_protected" | "unreadable" };

/** Reads the text of a stored PDF or Word file, caching it on the file record. */
export async function extractText(row: StoredFile): Promise<TextResult> {
  if (row.text !== null) return { ok: true, text: row.text, pages: row.pages ?? 1 };
  let bytes: Uint8Array;
  try {
    bytes = await fileBytes(row);
  } catch {
    return { ok: false, failure: "unreadable" };
  }
  let text = "";
  let pages = 1;
  try {
    if (row.mime === "application/pdf") {
      const { getDocumentProxy, extractText: pdfText } = await import("unpdf");
      const pdf = await getDocumentProxy(bytes);
      const out = await pdfText(pdf, { mergePages: false });
      pages = out.totalPages;
      text = (out.text as string[]).join("\n");
    } else if (row.mime.includes("wordprocessingml")) {
      const mammoth = await import("mammoth");
      const out = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      text = out.value;
      pages = Math.max(1, Math.round(text.length / 3000));
    } else {
      // Images and old .doc files need text recognition, which isn't connected yet.
      return { ok: false, failure: "unreadable" };
    }
  } catch (e) {
    const name = (e as { name?: string }).name ?? "";
    return { ok: false, failure: /password/i.test(name) || /password/i.test(String(e)) ? "password_protected" : "unreadable" };
  }
  if (text.replace(/\s/g, "").length < 50) return { ok: false, failure: "unreadable" };
  await db.update(schema.files).set({ text, pages }).where(eq(schema.files.id, row.id));
  return { ok: true, text, pages };
}
