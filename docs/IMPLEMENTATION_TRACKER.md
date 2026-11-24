# Vettly implementation tracker

Phase 1: frontend only, mock data, service abstractions. Each module is reviewed and approved before the next starts.

Full scope of every module: [ROADMAP.md](ROADMAP.md). Restructured 19 Nov 2026 to add psychometric assessments as Module 9.

| # | Module | Status | Notes |
|---|---|---|---|
| 1 | Design system & application shell | **Approved** (19 Nov) | v2.0 Granite & Msasa; Assessments wired into nav, stages, menus |
| 2 | Authentication & onboarding | **Approved** (19 Nov) | Sign-in, registration, reset, invitations, org setup, welcome, candidate test access; photo sign-in redesign |
| 3 | HR dashboard | **Approved** (19 Nov) | `/dashboard`: statistics, funnel, attention list, vacancies, interviews, tests, applications, activity |
| 4 | Vacancy management | **Approved** (19 Nov) | List, details, create/edit editor with simulated writing assistant, requirements, weights, tests, publishing, status changes |
| 5 | Candidate management | **Approved** (19 Nov) | Directory with advanced filters; full profiles with applications, tests, documents, notes. Verified in browser at 375px, ~1070px and desktop, including upload validation and CV preview |
| 6 | CV upload & processing | **Approved** (19 Nov) | `/cv-processing`: bulk drag-and-drop upload, live queue by batch, status filters, failures with retry; `/cv-processing/[id]`: review beside the CV, uncertain values marked in copper, duplicate handling, manual entry, discard. Verified in browser at 375px and desktop |
| 7 | AI recruitment intelligence | **Approved** (19 Nov, merged to main) | `/matching`: ranking per vacancy, requirement fingerprints, optional psychometric weighting, pick-to-compare; `/matching/[vacancy]/[candidate]`: explanation, score breakdown, requirement-by-requirement evidence with CV viewer, missing-evidence questions, HR agree/change/confirm/reopen; `/matching/[vacancy]/compare`. Mock assessor only, no AI model. Stored match scores now come from the assessor. Verified at 375px and desktop |
| 8 | Recruitment pipeline | **Approved** (19 Nov) | `/pipeline`: kanban per vacancy with drag and drop and a card menu, filters (search, source, minimum match), closed column toggle, bulk move/send tests/reject, card drawer with decision record; Assessment column shows test progress and moving in offers to send the battery; rejection cancels open tests; reasons required for rejections and backward moves; Hired only from Offer. Profile stage moves use the same rules. Verified at 375px and desktop |
| **9** | **Psychometric assessments** | **Approved** (20 Nov) | Research report and mock database (`pnpm check:psychometrics`). HR: invitation tracker with status tiles, filters, bulk remind / extend / cancel with undo, re-send; send-tests dialog (battery or tests, deadline, channels, language, email and SMS preview) from the tracker, candidate profile and directory; results report (HR report, candidate feedback, interview guide), HR review with notes and concerns, audit log; compare results; test library and test detail with norms and evidence; batteries with custom create, duplicate, edit, delete. Candidate: invitation, identity check, consent with full notice, test list, runner with practice, timer, extra time, save and resume, completion; expired, withdrawn and completed links. Pipeline and profiles share the invitation store. Verified at 375px and desktop |
| 10 | Interview management | **Approved** (20 Nov) | `/interviews`: week calendar and agenda (upcoming, feedback, past), scorecard-due alert, filters; schedule dialog with panel roles, free-slot suggestions, live clash detection with explicit override, format and location, from the calendar, profile and pipeline; detail with question set and look-fors, psychometric summary and suggested probes, panel responses, reschedule / cancel / no-show / completed; independent scorecards (anchored 1–5 with evidence, hidden until you submit); panel decision with rationale that can move the pipeline stage. Dashboard interviews come from the store. Verified at 375px and desktop |
| 11 | Offers & hiring | **Approved** (20 Nov) | `/offers`: list with status tiles and next steps; offer editor with pay, allowances, benefits, dates, live letter, salary-band position and the approval chain (hiring manager, HR, CFO above band); detail with progress, approvals (approve, send back), send (moves to Offer), opened, responses (accept, counter with revision to a new version, decline with reason and optional Withdrawn), extend, withdraw; hiring checklist (pre-hire checks gate Mark as hired, then day-one tasks); hire moves to Hired and offers to notify other candidates with a closing message. Entry points from interviews, profile, pipeline and dashboard. Verified at 375px and desktop |
| 12 | Talent intelligence | **Approved** (20 Nov) | `/talent`: search across 30 talent-pool records and active applicants with skills (all required, minimum level), experience, test results (e.g. numerical reasoning at or above the 70th percentile), country, availability, source and relocation; fit score, "also try" related skills, people with lapsed consent hidden by default with a count. Profile drawer with history, tests, contact, consent renewal (request, record) and delete; add to vacancy turns a record into a candidate (source Talent pool). Saved searches with match counts, new-match flags and daily or weekly emails; collections with shared notes, remove with undo; Find for a vacancy (from its essential skills, also from vacancy detail); Add to a talent collection from candidate profiles. Verified at 375px and desktop |
| 13 | Analytics & reporting | **Approved** (20 Nov) | `/analytics` over a generated 12-month history (17 vacancies, 2,460 applications) that agrees with the dashboard (312 applications in 30 days, 846 in 90, median time to hire 23 days). Period (30 days, 90 days, 12 months), department and vacancy filters. Overview: KPIs with change against the previous period, applications over time, funnel with conversion, time between stages, hires. Vacancy performance (time to fill), sources (shortlist rate, spend, cost per hire), recruiter workload and speed, assessments (completion and drop-off by test, time taken, days to finish, sten distributions against the norm). Fairness: selection rates by voluntary gender and age data at each human decision and test cut-off, four-fifths impact ratio plus a significance test, groups under 20 not compared. Chart/table switch and CSV export on every card. Verified at 375px and desktop |
| 14 | Organisation settings | **Approved** (20 Nov) | `/settings/[section]` with grouped navigation (a picker on phones) and a save bar for unsaved changes; every save is validated and written to the audit log. Organisation profile and regional defaults; branding with colour, logo and a live careers-page preview; users (14 of 20 seats, invite several at once, change role, resend or cancel invitations, deactivate and reactivate, two-step verification warning, can't remove yourself or the last admin); roles and permissions matrix; recruitment (reference prefix, closing period, default screening weights that must total 100%, ordered rejection reasons, independent scorecards, offer approval rules and expiry, notifying other candidates); assessments (default battery per department, send on shortlisting, deadline and reminders, invitation email and SMS templates with merge fields and preview, consent wording, retention, feedback reports; report access comes from Roles); personal notifications; privacy (data requests, retention, frameworks, equal-opportunity questions, DPO); plan and billing (view only for HR managers: usage, plans, invoices); audit log with search, filters and CSV export. Verified at 375px and desktop |
| 15 | Platform administration | **Approved** (20 Nov) | `/admin`, for Vettly super administrators only (others see a notice and a prototype "preview as" button). Every change needs a written reason and goes to the platform audit log; staff never see candidates, and support access is granted by the organisation and expires. Overview (ARR, organisations, applications, seats, needs-attention list, plan mix, busiest tenants); organisations (12 tenants: status, plan, seats, test credits, ARR, renewal; drawer with change plan, add credits, extend trial, suspend or restore, end support access); users (staff and tenant admins: lock, unlock, reset two-step); assessments (providers in-house and partner with pilot status, in-house catalogue on/off, norm groups with review dates, test credits per organisation); AI models (task-by-task model and fallback using Claude model ids, HR agreement rates, data-handling policy with human review locked on, monthly budget); system health (8 services, 30-day status bars, live incident, history); platform audit log with CSV export. Verified at 375px and desktop |
| — | Backend (first version) | **Approved** (20 Nov) | Branch `backend-docker`. Real API, PostgreSQL, S3 storage, email, built-in auth, server-side permissions; all sample data removed; rule-based CV extraction and matching until the AI branch. See `docs/BACKEND_PLAN.md` §0 |
| — | Tests and security hardening | **Approved** (21 Nov) | Branches `core-tests` and `security-hardening`. Unit and API tests (98); database row-level security with a restricted app user; role-escalation guards; CSRF refusal, security headers, NIST passwords, sign-in throttling, rate limits, idle timeout. Research: `docs/reports/reports/SaaS RBAC and tenant isolation.md` |
| — | Custom offer letters | **Approved** (21 Nov) | Branch `offer-letter-editor`. Upload a Word letter or write one in a Notion-style editor (/ commands, formatting toolbar, merge fields); cleaned on the server; part of the approved terms |
| — | CV certifications | **Approved** (21 Nov) | Branch `cv-certifications`. The CV reader picks up certifications (award, issuing body, year); editable in CV review; added to profiles and used as matching evidence |
| — | Letterhead and branded emails | **Approved** (23 Nov) | Branch `branding-letterhead`. Real logo upload, letterhead footer and contact details; offer letters on the letterhead and as PDF; candidate and team emails in HTML on the letterhead, with the offer PDF attached; logo on the test page |
| — | QA sweep | **Approved** (23 Nov) | Branch `qa-sweep`. Every page crawled with a seeded organisation; fixed duplicate activity ids, notifications (others' actions, clickable), real billing and trial details, last-active times, the new-offer picker, the sent-offer edit page, CV upload wording, stray separators; dead section route removed; tests added (135) |
| — | Clear errors for malformed API calls | **Approved** (23 Nov) | Branch `rpc-arg-validation`. Arguments of the wrong shape get a 400 `invalid_arguments` instead of a 500; still logged; test added (136) |
| — | Local AI models | **Approved** (23 Nov) | Branch `local-models`. Open Hugging Face models run in Docker (`--profile ai`), no outside API: NuExtract reads CVs (combined with the rules, checked against the CV text), Qwen3 reranker matches HR-written requirements; rules remain the fallback. Scored test set (`pnpm test:models`) and stress test on a CV folder. Gemma writing assistant not wired yet |
| — | Gemma writing assistant | **Approved** (23 Nov) | Branch `gemma-writing`. Local Gemma drafts and rewrites job descriptions and writes interview questions per requirement, with checks (placeholders, invented pay, protected topics); templates when the model is off |
| — | Hiring path | **Approved** (24 Nov) | Branch `hiring-path`. Seven-step hiring path with counts and one next action on vacancies and candidate profiles (skipped steps marked); Matching renamed Screening, Assessments renamed Tests; menu in process order; tests sent on shortlisting shown and controllable |
| — | CV links | **Approved** (24 Nov) | Branch `cv-links`. LinkedIn, GitHub and website read from CVs and opened as absolute links; a line of links is never a headline; qualification end years; web addresses not taken as certificate issuers; API tests wait for local-model CV reads |
| — | Update profile from a newer CV | **Approved** (24 Nov) | Branch `cv-update-profile`. A CV matching an existing candidate can update their profile (jobs, education, certificates, skills, headline) with a preview of every change; notes, stage, applications and HR's skill levels kept; audit-logged |
| — | Public front page | **Approved** (24 Nov) | Branch `marketing-page`. Signed-out visitors see a marketing page at `/` (signed-in users still redirect). Opening loader where two cursors build the Vettly mark; dark photo hero with a running headline and the real-talk line; what Vettly reads in place of client logos; statement sheet over the pinned hero with a blur word fill; sample product screen; Screen, Assess and Hire stacking cards; principles slider (no testimonials); privacy cards; floating nav. True claims only, samples labelled. Verified at 375px and desktop; reduced motion not checked in a browser |
| — | Pricing page and 5-day trial | **Approved** (24 Nov) | Branch `pricing-page`. One plan catalogue (`src/lib/plans.ts`) feeds Settings > Plan and billing, the public `/pricing` page, sign-up and the front page. New organisations get a 5-day trial of Growth (was 30 days). Plans differ by size only (seats, test credits, CVs read); false plan claims removed from Settings (careers page, unlimited seats, single sign-on). Shared site header and footer link Pricing. Tests for trial length, trial plan and the public page. Verified at 375px and desktop |

## Module 1 checklist

- [x] Brand: vector logo (horizontal, stacked, symbol, mono ink, mono white, light/dark), app icons, maskable icon, favicons, manifest
- [x] Colour, typography, spacing, radius, elevation tokens in `src/app/globals.css`
- [x] Components: Button, Input, Textarea, Field, Select, Checkbox, Switch, RadioGroup, Badge, Tag, Avatar, AvatarStack, Card, Table (+ sortable header), Tabs, Segmented, Modal, ConfirmModal, Drawer, DropdownMenu, Popover, Tooltip, Toast, Alert, Progress, Skeleton, EmptyState, Spinner, Kbd
- [x] Domain components: StageBadge, VacancyStatusBadge, ProvenanceTag, MatchScore, IllustrativeNotice
- [x] Shell: bush-green sidebar (collapsible, persisted), mobile drawer, header, command palette, notifications, profile menu with org switching and role preview, keyboard shortcuts, skip link
- [x] Every nav route resolves (placeholders state which module delivers them)
- [x] Design system page with working demos and loading / empty / error / success states
- [x] Mock data and services separated (`src/mocks`, `src/services`)
- [x] Typecheck, lint and production build pass
- [x] Browser check at 1440, 1024 and 375 wide
- [x] Corporate refinement (v1.1)
- [x] Full redesign to Granite & Msasa (v2.0): new logo, palette, Public Sans, Phosphor icons
- [x] Roadmap restructured for psychometric assessments: Assessments nav item (/assessments), Assessment pipeline stage, test types and invitation status types, "Send psychometric test" in Create menu, command palette and table bulk actions, assessment notifications
- [x] User review and approval (19 Nov 2026)

## Module 2 checklist

Screens and routes:
- [x] Sign in `/login`: email + password, show/hide, keep me signed in, Google and Microsoft single sign-on (simulated), failed and locked-account states
- [x] Create account `/register`: name, work email (personal-address hint), password strength meter with four rules, confirm, terms consent, "email already registered" state
- [x] Verify email `/verify-email`: 6-digit code with paste/autofill, wrong-code state, resend countdown, change email
- [x] Forgot password `/forgot-password`: request link, neutral "check your inbox" confirmation that never reveals whether an account exists
- [x] Reset password `/reset-password?token=…`: checking, valid, expired, invalid and success states
- [x] Accept invitation `/invite/[token]`: organisation, inviter and role summary; set name and password; expired and invalid states
- [x] Create organisation `/onboarding/organisation`: name, workspace address with live availability check, industry, size, country, city
- [x] Organisation setup `/onboarding/setup`: four-step wizard with stepper (branding with logo upload, colour and live candidate preview; currency, time zone and reorderable pipeline stages with fixed final "Hired"; psychometric defaults; team invitations with validation and skip)
- [x] Workspace onboarding `/welcome`: getting-started checklist with progress, hide and reset; "how a vacancy moves" panel
- [x] Candidate test access `/t/[token]`: employer-branded, mobile-first; invitation → confirm identity by emailed code → consent → ready; extra-time accommodation; completed, expired and invalid states

Supporting work:
- [x] Components: PasswordInput, PasswordStrength, OtpInput, Stepper, AuthLayout, SsoButtons, PrototypeHint
- [x] Mock auth and candidate-access services (`src/services/auth.ts`), mock data and prototype rules (`src/mocks/auth.ts`)
- [x] Root `/` opens sign-in; Sign out goes to `/login`; "Getting started" in the profile menu
- [x] Tested in browser at 1440 and 375 wide; typecheck, lint, detector and production build pass

Prototype rules (shown on each screen under "Prototype: how to try each state"):
- Any email + 8-character password signs in; "wrong" in the password fails; `locked@msasafinancial.example` is locked; `tendai.moyo@msasafinancial.example` goes to the app, other emails start onboarding.
- Verification code `246810`. Reset tokens `valid-reset`, `expired-reset`. Invitations `msasa-kudzai` (valid), `matobo-expired`.
- Candidate links `tafadzwa-fin`, `nyasha-data` (extra time), `farai-done`, `simba-expired`.

## Module 3 checklist

- [x] Recruitment overview: greeting, date, period filter (7 / 30 / 90 days, kept in the URL), illustrative-data notice
- [x] Key statistics: open vacancies, applications, shortlisted, tests awaiting completion, interviews next 7 days, median time to hire; each with change vs the previous period (good/bad shown by icon and text, not colour alone) and an 8-bucket history with hover values
- [x] Recruitment funnel: 7 stages including Assessment, conversion from the previous stage, filter by vacancy, hover detail, own loading/error/empty states
- [x] Needs your attention: AI assessments to review (copper), test results ready, closing soon, CVs needing correction, offers awaiting response
- [x] Vacancies: table with status, applicants (+new), shortlist/interview progress, closing date (warning when under 3 days); Active/All filter; stacked list on phones
- [x] Upcoming interviews: grouped by day, time, duration, round, format, location, panel
- [x] Psychometric tests: status, progress, due/expired; View results, Remind (one per invitation) and Resend actions
- [x] Recent applications: source, time, initial match with AI provenance
- [x] Recruitment activity: timeline of applications, AI suggestions, tests, stage moves, interviews, offers and vacancy changes
- [x] Quick actions: New vacancy, Upload CVs, Send tests, Schedule interview (collapsed into a menu below 1280 px)
- [x] States: skeleton loading per panel, empty workspace, service error with retry (prototype switch at the bottom of the page or `?scenario=empty|error`)
- [x] Responsive: tested at 1440 and 375 wide; detector, lint, typecheck and build pass
- [x] Mock data (`src/mocks/dashboard.ts`) uses the same candidates, vacancies and people as the rest of the app; service `services.dashboard`

## Module 4 checklist

- [x] Vacancy listing `/vacancies`: status views with counts (All, Open, Drafts, Paused, Closed & filled), search, department and location filters, sortable columns, row actions; stacked list on phones; loading, empty, no-match and error states
- [x] Vacancy details `/vacancies/[id]`: header with status and the next status action, pipeline figures, Overview (role, responsibilities, essential/desirable requirements, benefits, details, screening weights, psychometric tests, channels), Candidates and History tabs; draft readiness notice that lists exactly what is missing
- [x] Create `/vacancies/new` and edit `/vacancies/[id]/edit`: sectioned editor with completion outline, frosted save bar, unsaved-changes guard, draft vs publish validation that jumps to the first problem
- [x] Job description editor: summary with character count, reorderable responsibilities and benefits
- [x] AI-assisted description (simulated, labelled): draft from title, make inclusive, make concise, more formal; streamed suggestion with Use / Try again / Discard / Stop
- [x] Requirements builder: essential and desirable groups, five kinds, years for experience, reorder, move between groups, simulated suggestions per department
- [x] Screening weights: sliders, presets, live total, balance to 100%
- [x] Psychometric test plan: battery, auto-send on shortlist, deadline
- [x] Publishing: channels (simulated) and live advert preview
- [x] Status management: publish, pause, resume, close, reopen, mark filled (with required note), duplicate, delete draft; reasons saved to history; incomplete drafts routed to the editor instead of publishing
- [x] In-memory vacancy service (`services.vacancies`); dashboard figures now derive from the same records
- [x] Tested at 1440 and 375 wide; typecheck, lint, detector and build pass

## Backend (first version) checklist — approved 20 Nov

- [x] Docker stack: app, PostgreSQL 16, SeaweedFS, Mailpit; migrations run at start-up
- [x] Single API endpoint with per-service access levels and per-action role permissions; only a service's own methods callable
- [x] Auth: registration, email codes, sign-in with lockout, sessions, password reset, team invitations, organisation creation and setup
- [x] Every service implemented on the server; all mock data deleted (the sample psychometric catalogue stays as reference content)
- [x] Files: upload, download and preview of CVs and candidate documents
- [x] Rule-based CV extraction (PDF, Word) and matching, labelled as such
- [x] Emails for every candidate- and team-facing step
- [x] Candidate test link with emailed code; answer keys kept on the server
- [x] Prototype hints, scenario switches, simulated toasts and hard-coded names removed from the screens
- [x] Verified end to end through the API and in the browser (desktop and 375 wide); typecheck, lint, psychometrics check and build pass
- [ ] Automated tests, row-level security, job queue, multi-instance support (see `docs/BACKEND_PLAN.md` §0)

## Known gaps carried forward

- Dark mode not built; the light granite workspace with bush-green shell is the chosen direction. Revisit if users ask.
- No automated tests yet; add component tests with Module 2 forms.
