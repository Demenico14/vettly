import "server-only";
import { asOrg, ready, schema } from "./db";
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

/** The files columns under the names StoredFile uses. */
const COLUMNS = `id, organisation_id as "organisationId", name, mime, size_bytes as "sizeBytes", sha256, storage_key as "storageKey", pages, text, created_at as "createdAt"`;

/** The first bytes each allowed type must start with, so a renamed file can't pass as another type. */
const MAGIC: Record<string, number[][]> = {
  pdf: [[0x25, 0x50, 0x44, 0x46]],
  docx: [[0x50, 0x4b, 0x03, 0x04]],
  doc: [[0xd0, 0xcf, 0x11, 0xe0]],
  png: [[0x89, 0x50, 0x4e, 0x47]],
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
};

/** Stores an uploaded file for an organisation and returns its record. */
export async function storeUpload(organisationId: string, file: File): Promise<StoredFile> {
  await ready();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = ALLOWED[ext];
  if (!mime) throw new Error(`${file.name}: upload a PDF, Word document or image.`);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} is larger than 15 MB.`);
  if (file.size === 0) throw new Error(`${file.name} is empty.`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!MAGIC[ext]!.some((sig) => sig.every((b, i) => bytes[i] === b))) throw new Error(`${file.name} doesn't match its file type. Check the file and try again.`);
  const id = newId("file");
  const key = `${organisationId}/${id}`;
  await putObject(key, bytes, mime);
  const name = file.name.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 200);
  const [row] = await asOrg(
    organisationId,
    (tx) => tx<StoredFile[]>`insert into files (id, organisation_id, name, mime, size_bytes, sha256, storage_key)
      values (${id}, ${organisationId}, ${name}, ${mime}, ${file.size}, ${sha256(Buffer.from(bytes).toString("binary"))}, ${key})
      returning ${tx.unsafe(COLUMNS)}`,
  );
  return row!;
}

export async function fileFor(organisationId: string, id: string): Promise<StoredFile | null> {
  const [row] = await asOrg(organisationId, (tx) => tx<StoredFile[]>`select ${tx.unsafe(COLUMNS)} from files where id = ${id} and organisation_id = ${organisationId}`);
  return row ?? null;
}

export async function fileBytes(row: StoredFile) {
  return getObject(row.storageKey);
}

export type TextResult = { ok: true; text: string; pages: number } | { ok: false; failure: "password_protected" | "unreadable" };

/** Reads the text of PDF or Word bytes. Shared by uploads and the CV reader's tests. */
export async function textFromBytes(bytes: Uint8Array, mime: string): Promise<TextResult> {
  let text = "";
  let pages = 1;
  try {
    if (mime === "application/pdf") {
      const { getDocumentProxy, extractText: pdfText } = await import("unpdf");
      const pdf = await getDocumentProxy(bytes);
      const out = await pdfText(pdf, { mergePages: false });
      pages = out.totalPages;
      text = (out.text as string[]).join("\n");
    } else if (mime.includes("wordprocessingml")) {
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
  return { ok: true, text, pages };
}

/** Reads the text of a stored PDF or Word file, caching it on the file record. */
export async function extractText(row: StoredFile): Promise<TextResult> {
  if (row.text !== null) return { ok: true, text: row.text, pages: row.pages ?? 1 };
  let bytes: Uint8Array;
  try {
    bytes = await fileBytes(row);
  } catch {
    return { ok: false, failure: "unreadable" };
  }
  const result = await textFromBytes(bytes, row.mime);
  if (result.ok) await asOrg(row.organisationId, (tx) => tx`update files set text = ${result.text}, pages = ${result.pages} where id = ${row.id}`);
  return result;
}
