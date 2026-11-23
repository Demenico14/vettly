import "server-only";
/**
 * Offer letters as PDF, on the organisation's letterhead: logo, name and contact lines at the top of every page,
 * the footer and page numbers at the bottom. The body comes from the letter's cleaned HTML (a small, known set
 * of tags; see letter-html.ts), so the PDF says exactly what the screen and the email say.
 */
import * as React from "react";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { parseDocument } from "htmlparser2";
import type { ChildNode, Element } from "domhandler";
import { initialsOf, type Letterhead } from "@/lib/letterhead";

const INK = "#1d1f1c";
const MUTED = "#6b6f68";

const styles = StyleSheet.create({
  // Font settings live on the body, not the page: react-pdf drops render-prop text (the page number) that inherits them.
  page: { paddingTop: 118, paddingBottom: 72, paddingHorizontal: 56 },
  body: { fontFamily: "Helvetica", fontSize: 10.5, lineHeight: 1.5, color: INK },
  header: { position: "absolute", top: 36, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 10, borderBottomWidth: 2 },
  brand: { flexDirection: "row", alignItems: "center", maxWidth: 360 },
  logo: { height: 34, maxWidth: 140, objectFit: "contain", marginRight: 10 },
  initials: { width: 34, height: 34, marginRight: 10, borderRadius: 2, color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 11, textAlign: "center", paddingTop: 10 },
  name: { fontFamily: "Helvetica-Bold", fontSize: 12, color: INK },
  contact: { fontSize: 8, color: MUTED, lineHeight: 1.35 },
  confidential: { fontSize: 8, color: MUTED, paddingTop: 2 },
  footerRule: { position: "absolute", bottom: 52, left: 56, right: 56, borderTopWidth: 0.5, borderTopColor: "#d4d6d2" },
  footerText: { position: "absolute", bottom: 28, left: 56, right: 130, fontSize: 7.5, color: MUTED, lineHeight: 1.3 },
  pageNumber: { position: "absolute", bottom: 28, left: 56, right: 56, fontSize: 7.5, color: MUTED, textAlign: "right" },
  p: { marginBottom: 7 },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 12.5, marginTop: 10, marginBottom: 5 },
  h3: { fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 8, marginBottom: 4 },
  list: { marginBottom: 7 },
  item: { flexDirection: "row", marginBottom: 2 },
  bullet: { width: 16 },
  itemBody: { flex: 1 },
  quote: { borderLeftWidth: 2, borderLeftColor: "#c9ccc6", paddingLeft: 10, color: "#43463f", marginBottom: 7 },
  hr: { borderBottomWidth: 0.5, borderBottomColor: "#c9ccc6", marginVertical: 10 },
  row: { flexDirection: "row" },
  cell: { flex: 1, borderWidth: 0.5, borderColor: "#c9ccc6", padding: 4 },
});

type Inline = { bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean };

/** The font for bold or italic text; plain text inherits from its block (so headings stay bold). */
function font(s: Inline, base: "Helvetica" | "Helvetica-Bold") {
  const bold = s.bold || base === "Helvetica-Bold";
  return bold && s.italic ? "Helvetica-BoldOblique" : bold ? "Helvetica-Bold" : s.italic ? "Helvetica-Oblique" : undefined;
}

/** Inline content: text with bold, italic, underline and strikethrough, and line breaks. */
function inline(nodes: ChildNode[], s: Inline = {}, key = "i", base: "Helvetica" | "Helvetica-Bold" = "Helvetica"): React.ReactNode[] {
  return nodes.map((n, i) => {
    const k = `${key}.${i}`;
    if (n.type === "text") {
      if (!n.data) return null;
      const family = font(s, base);
      const decoration = s.underline ? "underline" : s.strike ? "line-through" : undefined;
      return family || decoration ? <Text key={k} style={{ ...(family ? { fontFamily: family } : {}), ...(decoration ? { textDecoration: decoration } : {}) }}>{n.data}</Text> : n.data;
    }
    if (n.type !== "tag") return null;
    const el = n as Element;
    if (el.name === "br") return <Text key={k}>{"\n"}</Text>;
    const next = { ...s, bold: s.bold || el.name === "strong" || el.name === "b", italic: s.italic || el.name === "em" || el.name === "i", underline: s.underline || el.name === "u", strike: s.strike || el.name === "s" };
    return <React.Fragment key={k}>{inline(el.children, next, k, base)}</React.Fragment>;
  });
}

/** Block content: paragraphs, headings, lists, quotes, rules and simple tables. */
function blocks(nodes: ChildNode[], key = "b"): React.ReactNode[] {
  return nodes.map((n, i) => {
    const k = `${key}.${i}`;
    if (n.type === "text") return n.data.trim() ? <Text key={k} style={styles.p}>{n.data}</Text> : null;
    if (n.type !== "tag") return null;
    const el = n as Element;
    switch (el.name) {
      case "p":
        return <Text key={k} style={styles.p}>{inline(el.children, {}, k)}</Text>;
      case "h1":
      case "h2":
        return <Text key={k} style={styles.h2}>{inline(el.children, {}, k, "Helvetica-Bold")}</Text>;
      case "h3":
        return <Text key={k} style={styles.h3}>{inline(el.children, {}, k, "Helvetica-Bold")}</Text>;
      case "ul":
      case "ol":
        return (
          <View key={k} style={styles.list}>
            {el.children
              .filter((c): c is Element => c.type === "tag" && (c as Element).name === "li")
              .map((li, j) => (
                <View key={`${k}.${j}`} style={styles.item} wrap={false}>
                  <Text style={styles.bullet}>{el.name === "ol" ? `${j + 1}.` : "•"}</Text>
                  <Text style={styles.itemBody}>{inline(li.children.flatMap((c) => (c.type === "tag" && (c as Element).name === "p" ? (c as Element).children : [c])), {}, `${k}.${j}`)}</Text>
                </View>
              ))}
          </View>
        );
      case "blockquote":
        return <View key={k} style={styles.quote}>{blocks(el.children, k)}</View>;
      case "hr":
        return <View key={k} style={styles.hr} />;
      case "table":
      case "thead":
      case "tbody":
        return <View key={k}>{blocks(el.children, k)}</View>;
      case "tr":
        return (
          <View key={k} style={styles.row} wrap={false}>
            {el.children
              .filter((c): c is Element => c.type === "tag")
              .map((cell, j) => (
                <Text key={`${k}.${j}`} style={[styles.cell, { fontFamily: cell.name === "th" ? "Helvetica-Bold" : "Helvetica" }]}>
                  {inline(cell.children, {}, `${k}.${j}`)}
                </Text>
              ))}
          </View>
        );
      default:
        return <Text key={k} style={styles.p}>{inline(el.children, {}, k)}</Text>;
    }
  });
}

export interface LetterPdfInput {
  title: string;
  html: string;
  head: Letterhead;
  logo: { data: Buffer; format: "png" | "jpg" } | null;
}

function LetterDocument({ title, html, head, logo }: LetterPdfInput) {
  const body = parseDocument(html).children;
  return (
    <Document title={title} author={head.name} creator="Vettly" producer="Vettly">
      <Page size="A4" style={styles.page}>
        <View style={[styles.header, { borderBottomColor: head.colour }]} fixed>
          <View style={styles.brand}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
            {logo ? <Image src={logo} style={styles.logo} /> : <Text style={[styles.initials, { backgroundColor: head.colour }]}>{initialsOf(head.name)}</Text>}
            <View>
              {head.showName ? <Text style={styles.name}>{head.name}</Text> : null}
              {head.contact.map((l) => (
                <Text key={l} style={styles.contact}>
                  {l}
                </Text>
              ))}
            </View>
          </View>
          <Text style={styles.confidential}>Private and confidential</Text>
        </View>
        <View style={styles.body}>{blocks(body)}</View>
        <View style={styles.footerRule} fixed />
        {head.footer ? (
          <Text style={styles.footerText} fixed>
            {head.footer}
          </Text>
        ) : null}
        <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </Page>
    </Document>
  );
}

/** The letter as PDF bytes. */
export async function letterPdf(input: LetterPdfInput): Promise<Buffer> {
  return renderToBuffer(<LetterDocument {...input} />);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Vettly's standard letter (heading and body paragraphs) as letter HTML, so it goes through the same path. */
export function standardLetterHtml(paragraphs: { heading: string | null; body: string }[]) {
  return paragraphs
    .map((p) => {
      const lines = p.body.split("\n");
      const bullets = lines.every((l) => l.startsWith("• "));
      const body = bullets ? `<ul>${lines.map((l) => `<li>${esc(l.slice(2))}</li>`).join("")}</ul>` : `<p>${lines.map(esc).join("<br>")}</p>`;
      return `${p.heading ? `<h2>${esc(p.heading)}</h2>` : ""}${body}`;
    })
    .join("");
}
