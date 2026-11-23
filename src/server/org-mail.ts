import "server-only";
/**
 * Emails from an organisation to candidates and its own people, on its letterhead: logo (sent inside the email,
 * so it shows without Vettly being publicly reachable), brand colour, contact lines and footer. Every message
 * also has a plain-text version for email apps that prefer it.
 */
import { letterheadOf, initialsOf, type Letterhead } from "@/lib/letterhead";
import { afterCommit, orgId } from "./context";
import { sendMail, type MailAttachment } from "./mail";
import { logoImage } from "./branding";
import { orgSettings } from "./services/settings";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain text as email HTML: paragraphs, line breaks, and web addresses as links. */
export function textToHtml(text: string) {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((para) => `<p style="margin:0 0 14px">${esc(para).replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" style="color:inherit;font-weight:600">$1</a>').replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Inline styles for letter HTML in email (many email apps ignore style sheets). Letters are cleaned to
 * attribute-free tags (letter-html.ts), so each opening tag can be matched exactly.
 */
const EMAIL_TAG_STYLE: Record<string, string> = {
  h2: "font-size:17px;line-height:1.3;margin:20px 0 6px",
  h3: "font-size:15px;line-height:1.3;margin:16px 0 4px",
  p: "margin:0 0 12px",
  ul: "margin:0 0 12px;padding-left:22px",
  ol: "margin:0 0 12px;padding-left:22px",
  li: "margin:0 0 4px",
  blockquote: "margin:0 0 12px;padding-left:12px;border-left:3px solid #d4d6d2;color:#43463f",
  hr: "border:0;border-top:1px solid #e3e4e0;margin:18px 0",
  table: "border-collapse:collapse;margin:0 0 12px",
  td: "border:1px solid #d4d6d2;padding:4px 8px",
  th: "border:1px solid #d4d6d2;padding:4px 8px;text-align:left",
};
export const emailStyled = (html: string) => html.replace(/<(h2|h3|p|ul|ol|li|blockquote|hr|table|td|th)>/g, (_m, tag: string) => `<${tag} style="${EMAIL_TAG_STYLE[tag]}">`);

/** The full email on the letterhead. `content` is trusted HTML: escaped text, or a letter cleaned by letter-html.ts. */
export function brandedHtml(head: Letterhead, hasLogo: boolean, content: string, title: string) {
  const mark = hasLogo
    ? `<img src="cid:logo" alt="${esc(head.name)}" height="40" style="display:block;height:40px;max-width:180px;border:0">`
    : `<div style="width:40px;height:40px;line-height:40px;text-align:center;border-radius:3px;background:${head.colour};color:#ffffff;font-weight:700;font-size:14px">${esc(initialsOf(head.name))}</div>`;
  const contact = head.contact.map((l) => `<div style="font-size:12px;color:#6b6f68">${esc(l)}</div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f2f2ef;font-family:Helvetica,Arial,sans-serif;color:#1d1f1c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2ef;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:6px;overflow:hidden">
<tr><td style="height:4px;background:${head.colour};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:24px 32px 16px;border-bottom:1px solid #e3e4e0"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:12px;vertical-align:middle">${mark}</td>
<td style="vertical-align:middle">${head.showName ? `<div style="font-weight:700;font-size:15px">${esc(head.name)}</div>` : ""}${contact}</td>
</tr></table></td></tr>
<tr><td style="padding:24px 32px;font-size:15px;line-height:1.55">${content}</td></tr>
${head.footer ? `<tr><td style="padding:16px 32px 24px;border-top:1px solid #e3e4e0;font-size:11px;line-height:1.45;color:#6b6f68;white-space:pre-line">${esc(head.footer)}</td></tr>` : ""}
</table>
<div style="padding:12px;font-size:11px;color:#9a9d97">Sent with Vettly</div>
</td></tr></table></body></html>`;
}

export interface OrgMessage {
  to: string;
  subject: string;
  /** The message as plain text. Used as the HTML too, unless `html` is given. */
  text: string;
  /** Trusted HTML for the body (for example a cleaned offer letter). */
  html?: string;
  attachments?: MailAttachment[];
}

/** Sends a message on the given letterhead. Use orgEmail inside a request; this is for code that already has the letterhead. */
export async function sendBranded(head: Letterhead, m: OrgMessage) {
  const logo = await logoImage(head);
  const html = brandedHtml(head, !!logo, m.html ? emailStyled(m.html) : textToHtml(m.text), m.subject);
  const attachments: MailAttachment[] = [...(m.attachments ?? []), ...(logo ? [{ filename: `logo.${logo.format}`, content: logo.data, contentType: logo.mime, cid: "logo" }] : [])];
  await sendMail(m.to, m.subject, m.text, { html, attachments });
}

/** The organisation's current letterhead (call inside its request). */
export const currentLetterhead = () => letterheadOf(orgId(), orgSettings());

/**
 * Queues a branded email from the current organisation, sent once the request's changes are saved. The
 * letterhead is captured now, while the organisation's settings are loaded.
 */
export function orgEmail(m: OrgMessage | (() => Promise<OrgMessage>)) {
  const head = currentLetterhead();
  afterCommit(async () => sendBranded(head, typeof m === "function" ? await m() : m));
}
