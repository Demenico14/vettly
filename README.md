# Vettly

Smarter Hiring. Faster. Evidence-based recruitment for HR teams in Southern Africa.

Vettly is a Next.js app with its own backend: PostgreSQL for data, S3-compatible storage for CVs and documents, and SMTP for email. There is no sample data; each organisation starts empty when someone registers it. See `docs/BACKEND_PLAN.md` for how the backend works and what is not connected yet.

## Run with Docker

```bash
cp .env.example .env
docker compose up -d --build
```

| Service | What | Local address |
|---|---|---|
| `web` | The app, as a production build | http://localhost:3000 (set `WEB_PORT` to change) |
| `db` | PostgreSQL 16 | localhost:5432 |
| `storage` | SeaweedFS, S3-compatible storage for CVs and documents | http://localhost:8333 |
| `mail` | Mailpit, catches every email the app sends | http://localhost:8025 |

Database migrations run when the app starts. Open the app, register, and read the verification code in Mailpit.

Health check: `GET /api/health`. Stop with `docker compose down`; add `-v` to also delete the database and stored files. The values in `.env.example` are for local development only.

## Develop

Run the backing services in Docker and the app with hot reload:

```bash
docker compose up -d db storage storage-init mail
```

```bash
pnpm install
pnpm dev
```

`pnpm dev` reads `.env.local`. Point it at the services on localhost, for example `DATABASE_URL=postgres://vettly:vettly-dev-password@localhost:5432/vettly`, `S3_ENDPOINT=http://localhost:8333` and `SMTP_HOST=localhost`. Without `S3_ENDPOINT`, files are kept in `.data/files`; without `SMTP_HOST`, emails are printed to the console.

To use Platform admin, add your email to `VETTLY_SUPER_ADMINS` and sign in again.

After changing `src/server/db/schema.ts`, generate a migration:

```bash
pnpm exec drizzle-kit generate --name <what-changed>
```

## Checks

```bash
pnpm test
```

```bash
pnpm test:api
```

The API tests need the app and Docker services running; see `tests/README.md`.

```bash
pnpm -s tsc --noEmit
```

```bash
pnpm -s lint
```

```bash
pnpm -s check:psychometrics
```

```bash
pnpm -s build
```

## Structure

- `src/app` — routes. `(app)` is the signed-in workspace, `(auth)` sign-in and onboarding, `(candidate)` the candidate's test link. `api/rpc/[service]/[method]` is the single endpoint the screens call; `api/files` handles uploads and downloads.
- `src/server` — the backend. `db` (Drizzle schema and connection), `store.ts` (organisation-scoped records), `session.ts`, `mail.ts`, `storage.ts`, `files.ts`, `engine` (CV parser, matcher), `services` (one file per service), `registry.ts` (what each service needs to be called).
- `src/services` — the client the screens use: typed contracts and a fetch client for the API.
- `src/lib` — shared constants and helpers used by both sides.
- `src/mocks/psychometrics` — the sample test catalogue, norms and items (reference content, not organisation data).
- `src/components`, `src/features` — UI.
- `drizzle/` — SQL migrations.
- `docs/` — backend plan, roadmap, implementation tracker, brand guidelines.
