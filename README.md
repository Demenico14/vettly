# Vettly

Smarter Hiring. Faster. Evidence-based recruitment for HR teams in Southern Africa.

Phase 1 is frontend only: every screen runs on mock data through `src/services`, ready to be swapped for real APIs.

## Run

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Run with Docker

The Docker stack is the backend's home while it's built (see `docs/BACKEND_PLAN.md`). It runs the app plus the services the backend will use:

| Service | What | Local address |
|---|---|---|
| `web` | The app, as a production build | http://localhost:3000 |
| `db` | PostgreSQL 16 | localhost:5432 |
| `storage` | SeaweedFS, S3-compatible storage for CVs and letters | http://localhost:8333 |
| `mail` | Mailpit, catches every outgoing email | http://localhost:8025 |

```bash
cp .env.example .env
docker compose up -d --build
```

To run only the backing services while developing with `pnpm dev`:

```bash
docker compose up -d db storage storage-init mail
```

Health check: `GET /api/health`. Stop with `docker compose down`; add `-v` to also delete the database and stored files. The values in `.env.example` are for local development only.

## Structure

- `src/app` — routes. `(app)` group wraps pages in the shell.
- `src/components/ui` — generic components. `domain` — recruitment components. `layout` — shell. `brand` — logo.
- `src/features/<feature>` — feature-specific components.
- `src/mocks` — illustrative mock data (never imported by UI directly).
- `src/services` — service interfaces + mock implementations.
- `src/types` — shared domain types.
- `public/brand` — logo, icons, favicons. Regenerate with `pnpm brand`.
- `docs/` — brand guidelines, implementation tracker.
