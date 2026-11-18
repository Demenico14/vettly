# Vettly

Smarter Hiring. Faster. Evidence-based recruitment for HR teams in Southern Africa.

Phase 1 is frontend only: every screen runs on mock data through `src/services`, ready to be swapped for real APIs.

## Run

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 (redirects to the design system while Module 1 is in review).

## Structure

- `src/app` — routes. `(app)` group wraps pages in the shell.
- `src/components/ui` — generic components. `domain` — recruitment components. `layout` — shell. `brand` — logo.
- `src/features/<feature>` — feature-specific components.
- `src/mocks` — illustrative mock data (never imported by UI directly).
- `src/services` — service interfaces + mock implementations.
- `src/types` — shared domain types.
- `public/brand` — logo, icons, favicons. Regenerate with `pnpm brand`.
- `docs/` — brand guidelines, implementation tracker.
