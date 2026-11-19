# Vettly design system

Direction: **Granite & Msasa** (v2.0, chosen 18 Nov 2026; replaces the v1 indigo/cyan brand board). Full usage rules in `docs/brand-guidelines.md`; direction contract in `.impeccable/surfaces/src-app.md`.

## World

Minimal and Notion-like (v2.1, 19 Nov 2026). One white page with faint hairlines (`#EDEDEB`), a light warm-grey sidebar (`#F8F8F7`) holding the workspace switcher, Search and Getting started, a slim top bar with a breadcrumb, and large page titles set directly on the page. Panels are lightly outlined, status labels are soft grey tints with a coloured dot, and charts use pale greens. Bush green (`#163A2E`) remains the brand colour for the app icon, photo scrims and dark logo. Action colour is green (`#16624F`). Msasa copper (`#C2602F`) is reserved for AI output nobody has reviewed yet and items needing attention; when HR confirms, it turns leaf green (`#3E8A47`). Dense, table-led layouts with compact 40px rows.

## Tokens (src/app/globals.css)

- **Colour:** `primary-*` bush green (600 `#16624F`), `accent-*` msasa copper (500 `#C2602F`, AI and attention only), `success-*` leaf green (500 `#3E8A47`), `secondary-*` slate blue (500 `#2F5D8A`), `warning-*` ochre (500 `#C98A12`), `danger-*` red (600 `#B42318`), `ink-*` granite neutrals (900 `#1B2420` … 50 `#F7F7F4`). Semantic: `canvas` (white), `surface`, `surface-muted` `#F9F9F8`, `line` `#EDEDEB`, `line-strong` `#DCDCD8`, `fg`, `fg-muted`, `fg-subtle`, `shell` `#F8F8F7` / `shell-raised` `#ECECEA` (light sidebar). Brand: `brand-bush`, `brand-green`, `brand-copper`.
- **Type:** Public Sans 400–700. Scale `2xs` 11 · `xs` 12 · `sm` 14 (body) · `base`/`lg` 16 · `xl` 18 · `2xl` 24 · `3xl` 36. Titles and wordmark Bold, panel headings SemiBold; tabular figures in data.
- **Icons:** Phosphor via `src/components/icons.ts`; regular weight, fill for the active nav item, bold for checkbox ticks.
- **Radius:** xs 3 · sm 4 · md 6 · lg 8 · xl 10 · full (avatars).
- **Shadow:** panels flat; xs on controls, lg on floating layers. Offset + soft blur, ink-tinted.
- **Motion:** `--ease-out-expo`; `fade-in` 160ms, `pop-in` 180ms, `slide-in-left` 260ms; shimmer skeletons. Respects reduced motion.

## Components

`src/components/ui`: generic primitives built on Radix. `src/components/domain`: recruitment semantics (stage/status chips, AI provenance, match score). `src/components/layout`: shell. `src/components/brand`: logo. Features own their sub-components under `src/features/<feature>`.

## Signature conventions

- Copper means "AI, unreviewed"; green means "a person confirmed". Unreviewed tags are dashed copper and unreviewed score bars are hatched copper; confirmed is solid leaf green; adjusted is slate blue.
- Status never relies on colour alone.
- A dark bulk-action bar appears when table rows are selected.
- Illustrative-data notices accompany all mock figures.
