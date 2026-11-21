import "server-only";
/**
 * Cleans letter HTML on the server, whether it came from a Word upload or the editor. Only text formatting
 * survives: no scripts, styles, links, images or attributes, so a letter can't carry anything that runs in a
 * reviewer's browser or a candidate's email.
 */
import sanitizeHtml from "sanitize-html";
import { fileBytes, type StoredFile } from "./files";

const ALLOWED = ["p", "br", "h1", "h2", "h3", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "blockquote", "hr", "table", "thead", "tbody", "tr", "th", "td"];
export const MAX_LETTER_CHARS = 60_000;

export function cleanLetter(html: string) {
  const clean = sanitizeHtml(html, {
    allowedTags: ALLOWED,
    allowedAttributes: {},
    // Drop the contents of these entirely, not just the tags.
    nonTextTags: ["style", "script", "textarea", "option", "noscript", "title", "head"],
    transformTags: { b: "strong", i: "em", h1: "h2" },
  })
    .replace(/<p>\s*<\/p>/g, "")
    .trim();
  if (clean.length > MAX_LETTER_CHARS) throw new Error("This letter is too long. Keep it to a few pages.");
  return clean;
}

/** Converts an uploaded Word document to clean letter HTML. Headings, bold, italics, lists and tables carry over. */
export async function wordToLetter(file: StoredFile) {
  if (!file.mime.includes("wordprocessingml")) throw new Error("Upload the letter as a Word document (.docx).");
  const mammoth = await import("mammoth");
  const { value } = await mammoth.convertToHtml(
    { buffer: Buffer.from(await fileBytes(file)) },
    { styleMap: ["p[style-name='Title'] => h2:fresh", "p[style-name='Heading 1'] => h2:fresh", "p[style-name='Heading 2'] => h3:fresh", "u => u"] },
  );
  const html = cleanLetter(value);
  if (!html.replace(/<[^>]+>/g, "").trim()) throw new Error("That document has no text Vettly can use.");
  return html;
}
