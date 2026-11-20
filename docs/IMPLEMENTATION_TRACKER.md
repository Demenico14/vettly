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
| 12 | Talent intelligence | Not started | Filter by test results |
| 13 | Analytics & reporting | Not started | Assessment completion and score analytics |
| 14 | Organisation settings | Not started | Batteries, templates, consent, retention |
| 15 | Platform administration | Not started | Assessment providers, catalogue, norms |
| — | Backend integration | Gated | Starts after all 15 modules are approved |

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

## Known gaps carried forward

- Dark mode not built; the light granite workspace with bush-green shell is the chosen direction. Revisit if users ask.
- No automated tests yet; add component tests with Module 2 forms.
- No real session yet: the app shell does not gate routes behind sign-in, and shows the mock Msasa Financial user after onboarding. Real sessions arrive at backend integration.
