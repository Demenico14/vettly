# Vettly brand guidelines

Version 2.0 · Granite & Msasa · November 2026

Replaces v1 (indigo/cyan, Plus Jakarta Sans), retired at your request on 18 Nov 2026. The old concept board stays at `docs/reference/brand-board-concept.webp` for history only.

The live, interactive version of this document is the design system page at `/design-system`.
Sources of truth: `src/app/globals.css` (tokens), `scripts/generate-brand.mjs` (logo geometry), `src/components/icons.ts` (icon set).

## The idea

Harare's msasa trees put out new leaves in copper and red, which mature to green. Vettly uses that change of colour to mean one thing: **copper is a suggestion the AI made and nobody has reviewed yet; green is a decision a person confirmed.** Everything else stays calm granite and bush green, so copper is never decoration.

## 1. Logo

### The mark

Two msasa leaflets forming a **V**, joined at the base:

- **Left leaflet:** copper `#C2602F` (on dark: `#DB7A4A`). The new leaf, the suggestion.
- **Right leaflet:** green `#2A7D62` (on dark: `#5FB08D`). The mature leaf, the confirmed decision.

The right leaflet sits in front with a small knockout gap where they overlap. Each leaflet has a vein cut out along its centre. The geometry sits on a 100 × 88 grid, defined in `scripts/generate-brand.mjs` and mirrored in `src/components/brand/logo.tsx`. Change both together, then run `pnpm brand`.

### Wordmark

"Vettly" in Public Sans Bold (700), tracking −2%, outlined to vector paths in every SVG so no font is needed. In the horizontal lockup the wordmark cap height is 72% of the mark height, baselines aligned to the foot of the V.

### Files (`public/brand/`)

| File | Use |
|---|---|
| `vettly-logo-horizontal-light.svg` | Default. Light backgrounds. |
| `vettly-logo-horizontal-dark.svg` | Bush green or dark backgrounds. |
| `vettly-logo-stacked-light.svg` / `-dark.svg` | Square or narrow spaces. |
| `vettly-symbol.svg` | Mark alone, where the name already appears nearby. |
| `vettly-logo-*-mono-dark.svg` / `-mono-white.svg` | One-colour print, embossing, coloured backgrounds. |
| `vettly-symbol-mono-*.svg` | One-colour mark. |
| `vettly-app-icon.svg` | Mark on a bush-green rounded square. |
| `vettly-app-icon-maskable.svg`, `icon-maskable-512.png` | Android adaptive icon. |
| `icon-192.png`, `icon-512.png` | PWA manifest. |
| `apple-touch-icon.png` (180) | iOS home screen. |
| `favicon.ico` (16/32/48), `favicon-*.png` | Browser tabs. |

Next.js also serves `src/app/favicon.ico`, `src/app/icon.svg` and `src/app/apple-icon.png` automatically.

### Clear space and size

- Clear space on every side: the height of the wordmark's "V".
- Minimum width: horizontal lockup 96 px on screen / 25 mm in print. Symbol 20 px.
- Below 24 px use the app icon (bush-green tile).

### Don't

- Don't swap the leaf colours (copper is always left).
- Don't add gradients, outlines, shadows or glows.
- Don't re-type the wordmark live in artwork, or set it in another typeface.
- Don't put the colour logo on mid-tone or busy backgrounds; use mono-white.

## 2. Colour

| Role | Hex | Token | Use |
|---|---|---|---|
| Bush green | `#163A2E` | `brand-bush` | App icon, photo scrims, dark logo backgrounds |
| Sidebar | `#F8F8F7` | `shell` | Light sidebar; `shell-raised` `#ECECEA` for hover and active rows |
| Primary | `#16624F` | `primary-600` | Buttons, links, selection, focus |
| Msasa copper | `#C2602F` | `accent-500` | **Unreviewed AI output and items needing attention. Nothing else.** |
| Leaf green | `#3E8A47` | `success-500` | Confirmed, hired, complete |
| Slate blue | `#2F5D8A` | `secondary-500` | Information, "Adjusted by HR", neutral data series |
| Ochre | `#C98A12` | `warning-500` | Needs attention, offers, closing soon |
| Red | `#B42318` | `danger-600` | Failed, rejected, destructive |
| Granite 900 | `#1B2420` | `ink-900` / `fg` | Body text |
| Granite 600 | `#505B55` | `ink-600` / `fg-muted` | Secondary text |
| Hairline | `#EDEDEB` | `line` | Borders and dividers |
| White | `#FFFFFF` | `canvas` | Page background |

Rules:

- Copper is reserved for one job. If something is not unreviewed AI and does not need attention, it is not copper.
- Text on soft tints uses the 700 step (`bg-warning-50 text-warning-700`).
- Status is never colour alone: pair it with a dot and label, an icon, or a line style (dashed = unreviewed).
- New hues need a reason recorded here.

## 3. Typography

**Public Sans**, loaded through `next/font` (400–700). Designed for public-sector digital services: sober, very legible at small sizes, with clear figures.

| Style | Size / line | Weight |
|---|---|---|
| Display | 36 / 44 | 700, −2% |
| Page title | 24 / 32 | 700, −1.5% |
| Section | 18 / 26 | 700, −1% |
| Panel title | 14 / 22 | 600 |
| Body | 14 / 22 | 400 |
| Label | 14 / 22 | 600 |
| Caption | 12 / 18 | 400 |
| Micro | 11 / 16 | 600 |

- Tables and metrics use tabular figures (`tabular` utility).
- No gradient text, no all-caps headings or table headers. Uppercase is limited to sidebar group labels.

## 4. Icons

**Phosphor** (`@phosphor-icons/react`), regular weight. The active sidebar item switches its icon to the fill weight. Checkbox ticks use bold.
Import icons only from `@/components/icons`, which maps stable names (`Search`, `Settings`, `Trash2` …) to Phosphor glyphs. To change an icon, change it there once.

## 5. Spacing, radius, elevation

- 4 px base grid. Related items 8–12 px apart, groups 24 px, page sections 40 px.
- Radius: 3 (checkbox) · 4 (badge, tag, menu item) · 6 (button, input) · 8 (panel, table) · 10 (modal) · full (avatars only).
- One hairline weight (1 px) for every border and divider.
- Panels are flat. Shadows only on floating layers (menus, modals, toasts).
- Notion-like layout: one white page, a large title set directly on it (24–36 px), a slim top bar with a breadcrumb, and generous space between sections.

## 6. Components and conventions

Components live in `src/components/ui` (generic) and `src/components/domain` (recruitment-specific). Import from `@/components/ui`.

- **Buttons:** one primary per region. In footers, secondary left, primary right. Destructive actions confirm in a modal and name the object ("Delete vacancy").
- **Forms:** label above, hint below, error replaces hint and says how to fix it. Required fields get an asterisk; optional fields say "Optional".
- **Tables:** compact 40 px rows. Sortable headers announce `aria-sort`. Selecting rows shows a dark bulk-action bar. Every table designs loading, empty (with clear filters) and error (with retry).
- **Status chips vs tags:** status is a soft grey chip with a coloured dot and label; tags carry content such as skills.
- **AI provenance:** every AI output carries a `ProvenanceTag`.
  - Unreviewed: dashed copper, "AI suggestion · illustrative". Score bars hatched in copper.
  - Confirmed: solid leaf green, "Confirmed by HR".
  - Changed: slate blue, "Adjusted by HR".
- **Illustrative data:** mock figures show `IllustrativeNotice` until real data is connected.
- **Sidebar:** light warm grey with the workspace switcher, Search and Getting started at the top. The active item gets a grey highlight and a filled green icon.
- **Overlays:** modals for protected decisions, side panels for detail next to a list, dropdowns for row actions, toasts for completed work (with Undo when reversible).
- **Shortcuts:** `⌘K` or `/` search, `?` shortcuts, `[` collapse sidebar.

## 7. Voice

Plain, specific, calm. Name the thing and the next step: "2 CVs could not be processed. Open the processing queue to correct them manually."

British English spelling (organisation, colour, licence). Dates as "Thu 20 Nov, 10:00". Currency as "USD 2 400" or "ZiG".
