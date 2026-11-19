# Vettly design system

Direction: **Granite & Msasa** (v2.0, chosen 18 Nov 2026; replaces the v1 indigo/cyan brand board). Full usage rules in `docs/brand-guidelines.md`; direction contract in `.impeccable/surfaces/src-app.md`.

## World

**Apple structure, Notion navigation (v2.2, 19 Nov 2026).** Notion patterns are used only where they fit: the light source-list sidebar (workspace switcher, Search, Getting started, grouped links), the breadcrumb top bar, the command palette, document-like pages (Getting started, design system) and data tables. Everything else follows Apple principles: a warm grey grouped background (`#F3F3F1`) with white rounded platters (12px, hairline ring + soft contact shadow), translucent materials on the top bar and sidebar (blur 20–24px, saturate 160–180%, solid under `prefers-reduced-transparency`), a large-title type scale (34px / 1.1 / −0.02em), pressed feedback on every button (scale 0.97, 100ms), colour-tinted status pills, and dashboard statistics as category-coloured tiles with icons. Bush green (`#163A2E`) remains the brand colour for the app icon, photo scrims and dark logo. Action colour is green (`#16624F`). Msasa copper (`#C2602F`) is reserved for AI output nobody has reviewed yet and items needing attention; when HR confirms, it turns leaf green (`#3E8A47`). Dense, table-led layouts with compact 40px rows.

## Tokens (src/app/globals.css)

- **Colour:** `primary-*` bush green (600 `#16624F`), `accent-*` msasa copper (500 `#C2602F`, AI and attention only), `success-*` leaf green (500 `#3E8A47`), `secondary-*` slate blue (500 `#2F5D8A`), `warning-*` ochre (500 `#C98A12`), `danger-*` red (600 `#B42318`), `ink-*` granite neutrals (900 `#1B2420` … 50 `#F7F7F4`). Semantic: `canvas` `#F3F3F1` (grouped background), `surface` (white platters), `surface-muted` `#F8F8F6`, `line` `#E8E8E5`, `line-strong` `#D6D6D2`, `fg`, `fg-muted`, `fg-subtle`, `shell` `#ECECEA` / `shell-raised` `#E0E0DD` (sidebar material). Utilities: `material-bar`, `material-sidebar`, `pressable`, `shadow-platter`. Brand: `brand-bush`, `brand-green`, `brand-copper`.
- **Type:** Public Sans 400–700. Scale `2xs` 11 · `xs` 12 · `sm` 14 (body) · `base`/`lg` 16 · `xl` 18 · `2xl` 24 · `3xl` 36. Titles and wordmark Bold, panel headings SemiBold; tabular figures in data.
- **Icons:** Phosphor via `src/components/icons.ts`; regular weight, fill for the active nav item, bold for checkbox ticks.
- **Radius:** xs 3 · sm 4 · md 6 · lg 12 (platters) · xl 16 (modals) · full (avatars, status pills).
- **Shadow:** `shadow-platter` on panels and tiles, xs on controls, md on tile hover, lg on floating layers.
- **Motion:** `--ease-out-expo`; `fade-in` 160ms, `pop-in` 180ms, `slide-in-left` 260ms; shimmer skeletons. Respects reduced motion.

## Components

`src/components/ui`: generic primitives built on Radix. `src/components/domain`: recruitment semantics (stage/status chips, AI provenance, match score). `src/components/layout`: shell. `src/components/brand`: logo. Features own their sub-components under `src/features/<feature>`.

## Signature conventions

- Copper means "AI, unreviewed"; green means "a person confirmed". Unreviewed tags are dashed copper and unreviewed score bars are hatched copper; confirmed is solid leaf green; adjusted is slate blue.
- Status never relies on colour alone.
- A dark bulk-action bar appears when table rows are selected.
- Illustrative-data notices accompany all mock figures.
