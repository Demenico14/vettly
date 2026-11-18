# Vettly design system

Recorded from the built Module 1 implementation. Brand values are pinned by the user's brand board (see PRODUCT.md); full usage rules are in `docs/brand-guidelines.md`.

## World

Light working canvas (`#F6F7FB`) with white bordered panels, framed by a deep navy (`#0F172A`) sidebar. Indigo is the single action colour; violet is reserved for AI output. Dense, calm, table-led layouts for people who spend the day screening.

## Tokens (src/app/globals.css)

- **Colour:** `primary-*` indigo (500 `#6366F1`, 600 `#4F46E5` for text-bearing fills), `secondary-*` cyan (`#06B6D4`), `accent-*` violet (`#8B5CF6`, AI only), `success-*` (`#10B981`), `warning-*` (`#F59E0B`), `danger-*` (`#EF4444`), `ink-*` slate neutrals (900 `#0F172A` … 50 `#F8FAFC`). Semantic: `canvas`, `surface`, `surface-muted`, `line`, `line-strong`, `fg`, `fg-muted`, `fg-subtle`, `shell*`.
- **Type:** Plus Jakarta Sans 400–800. Scale `2xs` 11 · `xs` 12 · `sm` 14 (body) · `base` 16 · `lg` 18 · `xl` 22 · `2xl` 28 · `3xl` 36. Titles ExtraBold with negative tracking; tabular figures in data.
- **Radius:** xs 4 · sm 6 · md 8 · lg 12 · xl 16 · full.
- **Shadow:** xs/sm on controls and rows, md hover, lg floating layers. All offset + soft blur, ink-tinted.
- **Motion:** `--ease-out-expo`; `fade-in` 160ms, `pop-in` 180ms, `slide-in-left` 260ms; shimmer skeletons. Respects reduced motion.

## Components

`src/components/ui`: generic primitives built on Radix. `src/components/domain`: recruitment semantics (stage/status badges, AI provenance, match score). `src/components/layout`: shell. Pages compose these; features own their own sub-components under `src/features/<feature>`.

## Signature conventions

- AI provenance is visible everywhere: dashed violet "AI suggestion · illustrative" vs solid green "Confirmed by HR" vs indigo "Adjusted by HR"; unreviewed match bars are hatched.
- Status never relies on colour alone.
- Navy bulk-action bar appears when rows are selected.
- Illustrative-data notices accompany all mock figures.
