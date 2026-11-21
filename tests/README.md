# Tests

## Unit tests

Fast, no services needed. They cover the CV parser, the matcher, psychometric score conversions, the fairness checks, and the map of which role permission each action needs.

```bash
pnpm test
```

## API tests

These drive a running Vettly over HTTP the way the screens do, read emails from Mailpit, and check:

- **Isolation:** one organisation can't see, change, download or attach another's data. Signed-out browsers, normal admins and candidate links are refused.
- **Roles:** a recruiter and a hiring manager join through emailed invitations. Each is refused what their role doesn't allow, permission changes apply immediately, and deactivated people lose access.
- **Hiring flow:** vacancy, PDF CV, review, match, shortlist (tests sent automatically), the candidate takes the tests, interview, offer, approval, acceptance, pre-hire checks and hire.

Start the backing services and the app first:

```bash
docker compose up -d db storage storage-init mail
```

```bash
pnpm dev
```

Then:

```bash
pnpm test:api
```

Test accounts use the `@vettly-test.local` domain. Every organisation, account and stored file the tests create is deleted when they finish; the emails stay in Mailpit so you can read them.

Settings, all optional: `VETTLY_TEST_URL` (default `http://localhost:3000`), `MAILPIT_URL` (default `http://localhost:8025`), `DATABASE_URL_TEST` (default the local Docker database), and `S3_ENDPOINT_TEST` (default `http://localhost:8333`).

Run both suites with `pnpm test:all`.
