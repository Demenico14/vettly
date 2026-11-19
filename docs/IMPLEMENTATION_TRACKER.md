# Vettly implementation tracker

Phase 1: frontend only, mock data, service abstractions. Each module is reviewed and approved before the next starts.

Full scope of every module: [ROADMAP.md](ROADMAP.md). Restructured 19 Nov 2026 to add psychometric assessments as Module 9.

| # | Module | Status | Notes |
|---|---|---|---|
| 1 | Design system & application shell | **Approved** (19 Nov) | v2.0 Granite & Msasa; Assessments wired into nav, stages, menus |
| 2 | Authentication & onboarding | **In review** | Sign-in, registration, reset, invitations, org setup, welcome, candidate test access |
| 3 | HR dashboard | Not started | `/` will redirect here |
| 4 | Vacancy management | Not started | Includes per-vacancy assessment plan |
| 5 | Candidate management | Not started | Includes Assessments tab on profile |
| 6 | CV upload & processing | Not started | |
| 7 | AI recruitment intelligence | Not started | Optional test-score weighting |
| 8 | Recruitment pipeline | Not started | Assessment column |
| **9** | **Psychometric assessments** | Not started | **New.** Test library, sending, tracking, reminders, results, candidate test-taking |
| 10 | Interview management | Not started | Panel sees test summary |
| 11 | Offers & hiring | Not started | |
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

## Known gaps carried forward

- Dark mode not built; the light granite workspace with bush-green shell is the chosen direction. Revisit if users ask.
- No automated tests yet; add component tests with Module 2 forms.
- No real session yet: the app shell does not gate routes behind sign-in, and shows the mock Msasa Financial user after onboarding. Real sessions arrive at backend integration.
