import "server-only";
import nodemailer from "nodemailer";

const g = globalThis as unknown as { __vettlyMail?: nodemailer.Transporter };

function transport() {
  if (!process.env.SMTP_HOST) return null;
  g.__vettlyMail ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? "" } : undefined,
  });
  return g.__vettlyMail;
}

export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
  /** Set to show the attachment inline, e.g. a logo referenced as cid:logo. */
  cid?: string;
}

/**
 * Sends an email: plain text always, plus HTML and attachments when given. Without SMTP settings (for example
 * in a bare `pnpm dev`), the plain text is written to the server log instead, so codes and links still work.
 */
export async function sendMail(to: string, subject: string, text: string, extra: { html?: string; attachments?: MailAttachment[] } = {}) {
  const t = transport();
  if (!t) {
    console.info(`[mail] to ${to}: ${subject}\n${text}${extra.attachments?.length ? `\n[attachments: ${extra.attachments.map((a) => a.filename).join(", ")}]` : ""}`);
    return;
  }
  await t.sendMail({ from: process.env.EMAIL_FROM ?? "Vettly <no-reply@vettly.local>", to, subject, text, html: extra.html, attachments: extra.attachments });
}
