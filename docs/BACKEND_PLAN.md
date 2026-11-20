# Vettly backend plan

**Status, 20 Nov 2026:** the first version of the backend is built on branch `backend-docker`. All sample data is gone. Section 0 records what was built and the decisions taken; sections 1–9 are the original plan, kept for reference.

## 0. What was built

**Decisions taken** (you asked me to choose; each can be revisited):

| Question | Decision | Why |
|---|---|---|
| Auth | Built in: scrypt password hashes, database sessions in an http-only cookie, 6-digit email codes, reset links, team invitations, lockout after 5 failed sign-ins | No third party holds identities; data stays in our database. Auth.js added little for email-and-password. |
| SSO | Not offered yet; the buttons are removed | Needs Microsoft and Google app registrations. |
| Two-step verification | Not built; the warnings about it are removed | Next security item after the pilot. |
| AI | No AI model. CV extraction and matching use fixed rules (`src/server/engine`) and every screen says so | Your rule: AI work goes on its own branch. That branch replaces the engine behind the same services. |
| Text recognition | None. PDF (unpdf) and Word (mammoth) text only; scanned PDFs and images are marked unreadable | Needs a provider; comes with the AI branch. |
| SMS | Not connected; invitations go by email and the SMS channel is recorded as not sent | Provider still to choose (section 9). |
| Psychometric tests | The sample catalogue, items and norms stay as reference content. Results are labelled "not validated for hiring decisions" | No validated instruments or partner yet. |
| Job boards and careers page | Not connected. Vacancies open for applications in Vettly; the editor tells HR to post the advert themselves | Each board needs its own integration. |
| Hosting | Docker Compose (app, PostgreSQL 16, SeaweedFS, Mailpit) | Decided 20 Nov. |

**How it works**

- **One API endpoint.** Screens call `POST /api/rpc/<service>/<method>` with `{ "args": [...] }`. The registry (`src/server/registry.ts`) says who may call each service (public, candidate link, signed-in session, organisation member, platform staff) and which role permission each action needs. Only a service's own methods can be called.
- **Permissions are enforced on the server.** Roles and permissions set in Settings → Roles apply immediately to every action (for example, a recruiter can't approve offers unless an admin allows it).
- **Storage.** Identity and tenancy are relational tables (`organisations`, `users`, `memberships`, `sessions`, `tokens`, `files`). Recruitment records (vacancies, candidates, invitations, interviews, offers, settings and so on) are JSONB rows in `records`, keyed by organisation, kind and id. Each request loads its organisation's records, runs the service, and writes the changed rows back in one transaction. Requests for the same organisation run one at a time. This assumes **a single app instance**; running several replicas needs a shared lock or a move to per-table storage.
- **Files.** Uploads go to S3-compatible storage (or `.data/files` locally) with a 15 MB limit and a type allowlist. Downloads check the organisation. CVs, candidate documents and previews use the real file.
- **Email.** Sent through SMTP after the change is saved: verification codes, reset links, team invitations, test invitations and reminders, candidate test codes, interview invitations, offer letters and closing messages.
- **Candidate tests.** The emailed link carries a random token. The candidate confirms with a code sent to their email, then gets a cookie for that invitation only. Answer keys, explanations and scoring direction never leave the server.

**Verified end to end** against real PostgreSQL, SeaweedFS and Mailpit: register, verify, create an organisation, set up, invite and accept a team member, create a vacancy, upload a Word CV, review and confirm it, match, shortlist with tests sent automatically, candidate takes and submits the tests, scores feed the match, schedule an interview, scorecard, decision, offer, approval, send, acceptance, pre-hire checks, hire (vacancy marked filled), dashboard, analytics, talent pool, notifications, search, platform admin, and access control (no session, candidate cookie only, wrong role, inherited method names).

**Known gaps**

- No automated test suite yet (section 8 still applies).
- No row-level security in Postgres; isolation is in the application (every record query is scoped to the organisation).
- Single instance only (see storage above).
- Background work (CV extraction, emails) runs in the web process, not a queue.
- The sidebar no longer shows counts; they need a lightweight counts endpoint.

---

## 1. Principles

1. **Same interfaces, new implementations.** Each `services.x` keeps its TypeScript interface. A mock implementation and a real one sit side by side, and an environment flag picks which runs, per service. That lets us ship one module at a time and roll back by flipping the flag.
2. **Tenant isolation in the database, not only in code.** Every tenant row carries `organisation_id`. Postgres row-level security enforces it, as a second line of defence behind the application checks.
3. **AI suggests, people decide.** This holds in the data model, not just the UI:
   - AI output is stored as unreviewed until a named person confirms or changes it.
   - No endpoint can reject a candidate without a human actor and a reason.
4. **Everything that matters is audited.** The audit log is append-only and written in the same transaction as the change it records.
5. **Data stays in the region where we can.** Candidate personal data is held in a Southern African cloud region. We follow Zimbabwe's Cyber and Data Protection Act and South Africa's POPIA (the frameworks already named in Settings).

---

## 2. Proposed stack

Recommendations, with the main alternative for each. The ones marked **Decide** need your call (section 9).

| Concern | Recommendation | Alternative | Why |
|---|---|---|---|
| API | Next.js route handlers and server actions in this repo | Separate NestJS service | One deployable while the team is small. The service interfaces already mark the boundary. |
| Database | PostgreSQL 16 | — | Relational data, row-level security, JSON where useful. |
| ORM and migrations | Drizzle | Prisma | Close to SQL, works with row-level security session variables, light on serverless. |
| Auth | Auth.js (email and password, Microsoft and Google SSO, two-step codes) | Clerk or Auth0 (**Decide**) | Keeps identities in our database and region. A hosted service is faster to set up but stores data outside the region. |
| Candidate test access | Signed, expiring invitation tokens plus a one-time email code (the existing Module 2 flow) | — | Candidates never get accounts. |
| File storage | S3 API. Locally SeaweedFS in Docker; in production an S3-compatible bucket in a Southern African region | Cloudflare R2 | CVs and letters are personal data; residency matters. Files are private and served by short-lived signed URLs. |
| Background jobs | Queue with retries, for example pg-boss (runs on Postgres) | Inngest, BullMQ with Redis | CV extraction, matching, reminders and emails must not run inside a web request. pg-boss adds no new infrastructure. |
| AI provider | Anthropic Claude, the models already shown in Platform admin: Haiku 5.5 for CV extraction, Sonnet 5.5 for matching (**Decide**) | Another provider | Structured output with cited evidence suits the matching model. Zero data retention and redaction stay in the policy. |
| Text recognition for scanned CVs | Cloud text recognition before the AI step | Send page images to the model | Cheaper and more predictable for large batches. |
| Email | Transactional provider with EU or African delivery (for example Postmark or Amazon SES) | — | Invitations, reminders, offers. Delivery and bounce webhooks feed the "delivery issues" already shown in the tracker. |
| SMS | Regional aggregator with Zimbabwe and South Africa routes (**Decide**, coverage to confirm) | — | Test invitations and reminders. A fallback route, as in the admin health mock. |
| Hosting | **Decided: Docker, for now.** `docker-compose.yml` runs the app (standalone Next.js image), PostgreSQL 16, SeaweedFS (S3-compatible storage) and Mailpit (email catcher). The same images can later run on any container host in the region. | Vercel plus AWS af-south-1 | One reproducible stack for development and early pilots. Production hosting and region are decided later. |
| Observability | Error tracking plus structured logs, with a service-health table feeding Platform admin | — | Platform admin's System health screen needs real numbers. |

---

## 3. Data model (first cut)

These map onto the existing types in `src/types/*`. All tenant tables have `organisation_id`, `created_at` and `updated_at`.

- **Tenancy:** `organisations`, `subscriptions`, `members` (user × organisation × role), `role_permissions`, `invitations`.
- **Identity:** `users`, `accounts` and `sessions` (Auth.js), `two_factor`.
- **Hiring:**
  - `vacancies`, `vacancy_requirements`, `vacancy_channels`
  - `candidates` (the person), `applications` (candidate × vacancy, current stage), `stage_events` (every move, actor, reason)
- **Documents and CV processing:** `documents` (storage key, hash, pages), `cv_batches`, `cv_files` (status, extraction JSON, flags, corrections).
- **Matching:** `assessments` (application × vacancy, score, provenance, model, prompt version), `requirement_results` (outcome, evidence quotes, document and page reference), `assessment_reviews` (who confirmed or changed what).
- **Psychometrics:**
  - `tests`, `norm_groups`, `norm_tables`, `items` (item bank, kept apart and never sent whole to the client)
  - `batteries`, `test_invitations`, `test_sessions` (answers, timing, accommodations), `test_results`
  - `consents`
- **Interviews:** `interviews`, `panel_members`, `question_sets`, `scorecards`.
- **Offers:** `offers`, `offer_versions`, `approvals`, `checklist_items`.
- **Talent:** `talent_records`, `consent_records`, `saved_searches`, `collections`, `collection_members`.
- **Equal opportunity:** `eo_responses`, kept in a separate table that recruiters' queries can't reach. It is only read by the aggregate fairness report, and groups under 20 are suppressed in SQL.
- **Platform:** `audit_events` (append-only; organisation-scoped and platform-scoped), `notifications`, `data_requests`, `ai_usage`, `service_checks`.

Analytics starts as SQL views over these tables. Materialised views come in only if reports get slow.

---

## 4. Security and privacy

- **Row-level security** on every tenant table. Each request sets `app.organisation_id` and `app.user_id`, and policies check them.
- **Permissions:**
  - The Roles matrix from Settings becomes the server-side check (`can(user, "approve_offers")`).
  - Hiring managers are additionally limited to their own vacancies.
- **Platform staff:**
  - They have no row-level access to tenant data.
  - Support access is a time-limited grant row created by the organisation; every read under it is audited.
- **Secrets** live in the hosting provider's secret store, never in the repo.
- **Personal data:**
  - Field-level encryption for national ID numbers if we ever store them (today we don't).
  - Retention jobs delete unsuccessful applicants and lapsed talent records on the schedules set in Settings → Privacy.
- **AI calls:**
  - Contact details are redacted before sending.
  - Zero-retention mode is on.
  - Prompts and model versions are recorded with every assessment, so a result can be traced.
- **Uploads:**
  - File type is checked, a size cap applies, and a virus scan runs before extraction.
  - Files are never served from a public URL.
- **Before launch:** an external penetration test.

---

## 5. AI pipeline (separate branch, per your rule)

1. **Upload:** the document is stored and a hash is checked for duplicates.
2. **Text recognition:** only if the PDF has no text layer.
3. **Extraction** (Haiku): structured profile JSON with a confidence per field. Low-confidence fields become the "needs review" flags already in the CV review screen.
4. **HR review:** a person checks and corrects the profile, then creates the candidate.
5. **Matching** (Sonnet), per application:
   - one result per requirement, each with an outcome, evidence quotes and a page reference
   - "missing" when there is no evidence
   - stored as `ai_illustrative` until HR reviews it
6. **Evaluation harness:**
   - a fixed set of anonymised CVs and vacancies with human-agreed outcomes
   - it runs on every prompt or model change, and the results become the "HR agreement" figures in Platform admin
7. **Cost guard:** per-organisation and platform budgets. When a budget is reached, jobs queue rather than fail.

---

## 6. Psychometric delivery

- **Delivery:**
  - The in-house test engine runs server-side.
  - The client receives one item at a time and never the answer key.
  - Timers are enforced on the server, and progress is saved so a dropped phone connection can resume.
- **Scoring:**
  - Scoring happens on the server, using the norm tables already validated by `pnpm check:psychometrics` (the same functions, moved into a server module).
  - Accommodations such as extra time are stored on the invitation and applied by the server.
- **Partner providers:** an adapter interface (`createInvitation`, `fetchResult`, webhook handler) per provider. We build none until a partner is chosen (**Decide**).

---

## 7. Delivery phases

Each phase ends with the module flags switched to real for a pilot organisation, and a review before the next phase starts. This is the same one-at-a-time rhythm as the frontend.

| Phase | Scope | Replaces |
|---|---|---|
| 0. Foundations | Database, migrations, row-level security, Auth.js login and two-step codes, organisations and members, permission checks, audit log, seed script from the current mocks, continuous integration | `auth`, `session`, `settings` (users, roles, audit) |
| 1. Core records | Vacancies, candidates, applications, stage events, pipeline, notes, search | `vacancies`, `profiles`, `candidates`, `pipeline`, `search` |
| 2. Documents and CV extraction *(AI branch)* | Storage, uploads, queue, text recognition, extraction, review | `cv` |
| 3. Matching *(AI branch)* | Assessments, evidence, review, evaluation harness, budgets | `matching` |
| 4. Assessments | Test engine, invitations by email and SMS, candidate access, scoring, reports, retention | `assessments`, `candidateAccess` |
| 5. Interviews and offers | Scheduling, calendar invitations (.ics), scorecards, offers, approvals, letters as PDF | `interviews`, `offers` |
| 6. Insight and admin | Talent pool, analytics views, dashboard, notifications, platform admin, health checks, billing records | `talent`, `analytics`, `dashboard`, `notifications`, `platform` |
| 7. Hardening | Penetration test, load test (500-CV batch), backups and restore drill, retention jobs, data-request export | — |

---

## 8. Testing

- **Unit tests** for scoring, permissions, the four-fifths and significance calculations, and retention rules.
- **Integration tests** against a real Postgres with row-level security on. Each one asserts that a user from organisation A can't read organisation B.
- **End-to-end tests** (Playwright) for the critical flows: upload and review CVs, review a match, send tests, a candidate completes them, schedule an interview, approve and send an offer.
- **Contract tests:** each real service passes the same tests as its mock. That is how we prove the screens behave the same.

---

## 9. Decisions needed from you

1. **Auth:** self-hosted Auth.js, with data in our database and region (recommended), or a hosted service such as Clerk or Auth0?
2. **AI provider:** Anthropic Claude as shown in Platform admin (recommended), or another provider?
3. ~~**Hosting:**~~ **Decided 20 Nov:** Docker for now. Production host and region are still to choose.
4. **SMS provider:** which aggregator? I'll compare Zimbabwe and South Africa coverage and pricing before choosing.
5. **Psychometric providers:** in-house only for launch (recommended), or name a partner to integrate?
6. **Pilot organisation:** a real organisation to pilot phase 1, or keep using the Msasa demo data until phase 4?

Once these are answered I'll turn phase 0 into a task list and start on a branch.
