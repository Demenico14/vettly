# Vettly brand guidelines

Version 1.0 · Module 1 · November 2026

The live, interactive version of this document is the design system page at `/design-system`.
Source of truth for brand values: `src/app/globals.css` (tokens) and `scripts/generate-brand.mjs` (logo geometry).
The original concept board is kept at `docs/reference/brand-board-concept.webp` as a visual reference only; it is never used as an asset.

## 1. Logo

### The mark

A two-stroke **V**:

- **Left stroke**, wide, indigo `#6366F1` to violet `#8B5CF6`. The evidence.
- **Right stroke**, slimmer, blue `#3B82F6` to cyan `#22D3EE`, rising past the left. The decision.

The right stroke always sits in front. Corners are softened with a 5-unit radius on a 100 × 88 grid. The geometry is defined once in `scripts/generate-brand.mjs` and mirrored in `src/components/brand/logo.tsx`; change both together and run `pnpm brand`.

### Wordmark

"Vettly" in Plus Jakarta Sans ExtraBold (800), tracking −2.5%, outlined to vector paths in every SVG so no font is needed. In the horizontal lockup the wordmark cap height is 80% of the mark height, baselines aligned to the mark's foot.

### Files (`public/brand/`)

| File | Use |
|---|---|
| `vettly-logo-horizontal-light.svg` | Default. Light backgrounds. |
| `vettly-logo-horizontal-dark.svg` | Navy or dark photographic backgrounds. |
| `vettly-logo-stacked-light.svg` / `-dark.svg` | Square or narrow spaces: splash, social avatar frames. |
| `vettly-symbol.svg` | Mark alone, where the name already appears nearby. |
| `vettly-logo-*-mono-dark.svg` / `-mono-white.svg` | One-colour print, fax, embossing, coloured backgrounds. |
| `vettly-symbol-mono-*.svg` | One-colour mark. A knockout gap separates the strokes. |
| `vettly-app-icon.svg` | Mark on a navy rounded square. App stores, PWA. |
| `vettly-app-icon-maskable.svg`, `icon-maskable-512.png` | Android adaptive icon (safe-zone padding). |
| `icon-192.png`, `icon-512.png` | PWA manifest. |
| `apple-touch-icon.png` (180) | iOS home screen. |
| `favicon.ico` (16/32/48), `favicon-*.png` | Browser tabs. |

Next.js also serves `src/app/favicon.ico`, `src/app/icon.svg` and `src/app/apple-icon.png` automatically.

### Clear space and size

- Clear space on every side: the height of the wordmark's "V".
- Minimum width: horizontal lockup 96 px on screen / 25 mm in print. Symbol 20 px.
- Below 24 px use the app icon (navy tile), never the bare symbol.

### Don't

- Don't use the concept board image or a screenshot as the logo.
- Don't recolour the gradients, swap stroke order, or rotate the mark.
- Don't set the wordmark in another typeface or re-type it live in marketing artwork.
- Don't place the colour logo on mid-tone or busy backgrounds; use mono-white instead.
- Don't add shadows, outlines or glows.

## 2. Colour

| Role | Hex | Token | Use |
|---|---|---|---|
| Primary | `#6366F1` | `primary-500` | Brand, selection, focus rings, charts |
| Primary (text-bearing) | `#4F46E5` | `primary-600` | Button fills and links. White text on 500 is 4.47:1 (fails AA for 14px); 600 passes at 6.3:1. |
| Secondary | `#06B6D4` | `secondary-500` | Progress, secondary data series |
| Accent | `#8B5CF6` | `accent-500` | **Reserved for AI-generated content** |
| Success | `#10B981` | `success-500` | Hired, confirmed, complete |
| Warning | `#F59E0B` | `warning-500` | Needs attention, offers, closing soon |
| Error | `#EF4444` | `danger-500` | Failed, rejected, destructive |
| Neutral 900 | `#0F172A` | `ink-900` | Body text, navy shell |
| Neutral 700 | `#334155` | `ink-700` | Strong secondary text |
| Neutral 500 | `#64748B` | `ink-500` | Subtle text, icons |
| Neutral 300 | `#CBD5E1` | `ink-300` | Control borders |
| Neutral 100 | `#F8FAFC` | `ink-50` | Muted surfaces |

Each hue has a full scale in `globals.css`. Rules:

- Text on soft tints uses the 700 step (`bg-warning-50 text-warning-700`), never the 500.
- Status is never colour alone: pair with an icon, a dot, a label or a line style.
- The page canvas is `#F6F7FB`; panels are white with a `#E2E8F0` border.
- No new hues without a recorded reason in this document.

## 3. Typography

Plus Jakarta Sans, loaded through `next/font` (weights 400–800).

| Style | Size / line | Weight |
|---|---|---|
| Display | 36 / 44 | 800, −2.5% |
| Page title | 28 / 36 | 800, −2% |
| Section | 22 / 30 | 800, −1.5% |
| Panel title | 16 / 24 | 700 |
| Body | 14 / 22 | 400 |
| Label | 14 / 22 | 600 |
| Caption | 12 / 18 | 400 |
| Micro | 11 / 16 | 600 |

- Body text is 14 px in the app: it is a dense working tool. Reading-heavy views may use 16 px.
- Tables and metrics use tabular figures (`tabular` utility).
- No gradient text, no all-caps headings. Uppercase is limited to sidebar group labels.

## 4. Spacing, radius, elevation

- 4 px base grid. Related items 8–12 px apart, groups 24 px, page sections 40 px.
- Radius: 4 (checkbox, tag) · 6 (menu item) · 8 (button, input) · 12 (panel, table) · 16 (modal) · full (badge, avatar).
- Elevation is soft and offset: `shadow-xs` on controls, `shadow-lg` on menus and modals. Borders do most separating; shadows mean "floating".

## 5. Components and conventions

Components live in `src/components/ui` (generic) and `src/components/domain` (recruitment-specific). Import from `@/components/ui`.

- **Buttons:** one primary per region. Order in footers: secondary left, primary right. Destructive actions confirm in a modal and name the object ("Delete vacancy").
- **Forms:** label above, hint below, error replaces hint and says how to fix it. Required fields get an asterisk; optional fields say "Optional". Validate on submit, then live.
- **Tables:** sortable headers announce `aria-sort`; selection reveals a navy bulk-action bar; every table designs loading (skeleton rows), empty (with a clear-filters action) and error (with retry).
- **Badges vs tags:** pills for status, square tags for content such as skills.
- **AI provenance:** any AI output carries a `ProvenanceTag`. Unreviewed AI is dashed, violet and labelled "AI suggestion · illustrative"; confirmed work is solid green "Confirmed by HR"; changed work is "Adjusted by HR". Unreviewed match bars are hatched, not solid.
- **Illustrative data:** any mock figure shows `IllustrativeNotice` until real data is connected.
- **Overlays:** modals for protected decisions; side panels for detail next to a list; dropdowns for row actions; toasts for completed work, with Undo when reversible.
- **Navigation:** navy sidebar (collapsible with `[`), command palette on `⌘K` or `/`, shortcuts on `?`.

## 6. Voice

Plain, specific, calm. Name the thing and the next step: "2 CVs could not be processed. Open the processing queue to correct them manually." Not "Oops! Something went wrong."

British English spelling (organisation, colour, licence). Dates as "Thu 20 Nov, 10:00". Currency as "USD 2 400" or "ZiG".
