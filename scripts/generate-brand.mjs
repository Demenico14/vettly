// Generates every Vettly brand asset from one source of truth.
// Run: pnpm brand
// The wordmark is converted to outlined paths so the SVGs need no font installed.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import opentype from "opentype.js";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const out = path.join(root, "public/brand");
const appDir = path.join(root, "src/app");
mkdirSync(out, { recursive: true });

export const BRAND = {
  indigo: "#6366F1",
  violet: "#8B5CF6",
  blue: "#3B82F6",
  cyan: "#06B6D4",
  cyanLight: "#22D3EE",
  navy: "#0F172A",
  white: "#FFFFFF",
};

/* ---------- Mark geometry (100 x 88 design grid) ---------- */
const MARK_W = 100;
const MARK_H = 88;
// Wide left stroke: indigo -> violet.
const LEFT = "M6 6 H33 L54 62 L44 84 Z";
// Slim right stroke rising to the top right: blue -> cyan.
const RIGHT = "M38 84 L77 6 H96 L53 84 Z";
const ROUND = 5; // soft corner radius via a same-colour stroke

function markSvg({ id, mode = "color", fill = BRAND.navy }) {
  if (mode === "color") {
    return `
  <defs>
    <linearGradient id="${id}-l" x1="6" y1="6" x2="54" y2="84" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${BRAND.indigo}"/>
      <stop offset="1" stop-color="${BRAND.violet}"/>
    </linearGradient>
    <linearGradient id="${id}-r" x1="47" y1="84" x2="92" y2="6" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${BRAND.blue}"/>
      <stop offset="1" stop-color="${BRAND.cyanLight}"/>
    </linearGradient>
  </defs>
  <path d="${LEFT}" fill="url(#${id}-l)" stroke="url(#${id}-l)" stroke-width="${ROUND}" stroke-linejoin="round"/>
  <path d="${RIGHT}" fill="url(#${id}-r)" stroke="url(#${id}-r)" stroke-width="${ROUND}" stroke-linejoin="round"/>`;
  }
  // Monochrome: one ink. A knockout gap where the strokes cross keeps the two-stroke structure legible.
  return `
  <defs>
    <mask id="${id}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="${MARK_W}" height="${MARK_H}">
      <rect width="${MARK_W}" height="${MARK_H}" fill="#fff"/>
      <path d="${RIGHT}" fill="#000" stroke="#000" stroke-width="${ROUND + 7}" stroke-linejoin="round"/>
    </mask>
  </defs>
  <path d="${LEFT}" fill="${fill}" stroke="${fill}" stroke-width="${ROUND}" stroke-linejoin="round" mask="url(#${id}-m)"/>
  <path d="${RIGHT}" fill="${fill}" stroke="${fill}" stroke-width="${ROUND}" stroke-linejoin="round"/>`;
}

/* ---------- Wordmark as outlines ---------- */
const fontPath = require.resolve(
  "@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff",
);
const buf = readFileSync(fontPath);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

function wordmark(text, fontSize, tracking = -0.025) {
  const glyphs = font.stringToGlyphs(text);
  const scale = fontSize / font.unitsPerEm;
  let x = 0;
  const parts = [];
  glyphs.forEach((g, i) => {
    parts.push(g.getPath(x, 0, fontSize).toPathData(2));
    let adv = g.advanceWidth * scale;
    if (i < glyphs.length - 1) adv += font.getKerningValue(g, glyphs[i + 1]) * scale;
    x += adv + tracking * fontSize;
  });
  x -= tracking * fontSize;
  const capHeight = (font.tables.os2.sCapHeight || 0.72 * font.unitsPerEm) * scale;
  // Descender of "y" matters for vertical bounds.
  const bb = font.getPath(text, 0, 0, fontSize).getBoundingBox();
  return { d: parts.join(" "), width: x, capHeight, descent: bb.y2, ascent: -bb.y1 };
}

/* ---------- Lockups ---------- */
function svgDoc(w, h, body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(w)} ${fmt(h)}" width="${fmt(w)}" height="${fmt(h)}" role="img" aria-label="${title}">
  <title>${title}</title>${body}
</svg>
`;
}
const fmt = (n) => Number(n.toFixed(2));

function horizontal({ id, mode, ink, markFill }) {
  const markH = 88;
  const wm = wordmark("Vettly", 96);
  const gap = 24;
  // Cap height of the wordmark sits at ~80% of the mark height, baselines aligned to the mark's foot.
  const scale = (markH * 0.8) / wm.capHeight;
  const wmW = wm.width * scale;
  const baseline = markH - 2;
  const w = MARK_W + gap + wmW;
  const h = baseline + wm.descent * scale + 2;
  const body = `
  <g>${markSvg({ id, mode, fill: markFill })}</g>
  <path transform="translate(${fmt(MARK_W + gap)} ${fmt(baseline)}) scale(${fmt(scale)})" fill="${ink}" d="${wm.d}"/>`;
  return svgDoc(w, h, body, "Vettly");
}

function stacked({ id, mode, ink, markFill }) {
  const wm = wordmark("Vettly", 96);
  const scale = 0.62;
  const wmW = wm.width * scale;
  const w = Math.max(wmW, MARK_W) + 8;
  const markX = (w - MARK_W) / 2;
  const top = MARK_H + 22;
  const baseline = top + wm.ascent * scale;
  const h = baseline + wm.descent * scale + 4;
  const body = `
  <g transform="translate(${fmt(markX)} 0)">${markSvg({ id, mode, fill: markFill })}</g>
  <path transform="translate(${fmt((w - wmW) / 2)} ${fmt(baseline)}) scale(${scale})" fill="${ink}" d="${wm.d}"/>`;
  return svgDoc(w, h, body, "Vettly");
}

function symbol({ id, mode, markFill }) {
  return svgDoc(MARK_W, MARK_H, markSvg({ id, mode, fill: markFill }), "Vettly");
}

function appIcon({ id, size = 512, padding = 0.2, radius = 0.22, bg = BRAND.navy }) {
  const inner = size * (1 - padding * 2);
  const s = inner / MARK_W;
  const tx = (size - MARK_W * s) / 2;
  const ty = (size - MARK_H * s) / 2 + size * 0.01;
  const body = `
  <rect width="${size}" height="${size}" rx="${fmt(size * radius)}" fill="${bg}"/>
  <g transform="translate(${fmt(tx)} ${fmt(ty)}) scale(${fmt(s)})">${markSvg({ id, mode: "color" })}</g>`;
  return svgDoc(size, size, body, "Vettly");
}

const files = {
  "vettly-symbol.svg": symbol({ id: "vs", mode: "color" }),
  "vettly-symbol-mono-dark.svg": symbol({ id: "vsd", mode: "mono", markFill: BRAND.navy }),
  "vettly-symbol-mono-white.svg": symbol({ id: "vsw", mode: "mono", markFill: BRAND.white }),
  "vettly-logo-horizontal-light.svg": horizontal({ id: "hl", mode: "color", ink: BRAND.navy }),
  "vettly-logo-horizontal-dark.svg": horizontal({ id: "hd", mode: "color", ink: BRAND.white }),
  "vettly-logo-horizontal-mono-dark.svg": horizontal({ id: "hmd", mode: "mono", ink: BRAND.navy, markFill: BRAND.navy }),
  "vettly-logo-horizontal-mono-white.svg": horizontal({ id: "hmw", mode: "mono", ink: BRAND.white, markFill: BRAND.white }),
  "vettly-logo-stacked-light.svg": stacked({ id: "sl", mode: "color", ink: BRAND.navy }),
  "vettly-logo-stacked-dark.svg": stacked({ id: "sd", mode: "color", ink: BRAND.white }),
  "vettly-logo-stacked-mono-dark.svg": stacked({ id: "smd", mode: "mono", ink: BRAND.navy, markFill: BRAND.navy }),
  "vettly-logo-stacked-mono-white.svg": stacked({ id: "smw", mode: "mono", ink: BRAND.white, markFill: BRAND.white }),
  "vettly-app-icon.svg": appIcon({ id: "ai" }),
  "vettly-app-icon-maskable.svg": appIcon({ id: "am", padding: 0.27, radius: 0 }),
};
for (const [name, svg] of Object.entries(files)) writeFileSync(path.join(out, name), svg);

/* ---------- Raster icons ---------- */
const appIconSvg = Buffer.from(files["vettly-app-icon.svg"]);
const maskSvg = Buffer.from(files["vettly-app-icon-maskable.svg"]);
// Small sizes use a tighter crop so the mark stays legible at 16px.
const faviconSvg = Buffer.from(appIcon({ id: "fv", size: 512, padding: 0.12, radius: 0.24 }));

const png = (src, size) => sharp(src, { density: 300 }).resize(size, size).png().toBuffer();

const rasters = [
  ["icon-192.png", appIconSvg, 192],
  ["icon-512.png", appIconSvg, 512],
  ["icon-maskable-512.png", maskSvg, 512],
  ["apple-touch-icon.png", Buffer.from(appIcon({ id: "ap", size: 512, padding: 0.18, radius: 0 })), 180],
  ["favicon-16.png", faviconSvg, 16],
  ["favicon-32.png", faviconSvg, 32],
  ["favicon-48.png", faviconSvg, 48],
];
const pngs = {};
for (const [name, src, size] of rasters) {
  pngs[name] = await png(src, size);
  writeFileSync(path.join(out, name), pngs[name]);
}

// favicon.ico embedding PNG frames (16, 32, 48).
function ico(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = 6 + frames.length * 16;
  const entries = frames.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...frames.map((f) => f.data)]);
}
const icoBuf = ico([
  { size: 16, data: pngs["favicon-16.png"] },
  { size: 32, data: pngs["favicon-32.png"] },
  { size: 48, data: pngs["favicon-48.png"] },
]);
writeFileSync(path.join(out, "favicon.ico"), icoBuf);

// Next.js App Router file conventions.
writeFileSync(path.join(appDir, "favicon.ico"), icoBuf);
writeFileSync(path.join(appDir, "icon.svg"), appIcon({ id: "ic", size: 512, padding: 0.12, radius: 0.24 }));
writeFileSync(path.join(appDir, "apple-icon.png"), pngs["apple-touch-icon.png"]);

// Preview sheet for review.
await sharp(Buffer.from(files["vettly-logo-horizontal-light.svg"]), { density: 300 })
  .resize({ width: 1200 })
  .png()
  .toFile(path.join(root, "docs/reference/logo-preview.png"));

console.log(`Wrote ${Object.keys(files).length} SVGs and ${rasters.length + 1} rasters to public/brand`);
