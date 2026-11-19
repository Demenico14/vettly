# Vettly implementation tracker

Phase 1: frontend only, mock data, service abstractions. Each module is reviewed and approved before the next starts.

Full scope of every module: [ROADMAP.md](ROADMAP.md). Restructured 19 Nov 2026 to add psychometric assessments as Module 9.

| # | Module | Status | Notes |
|---|---|---|---|
| 1 | Design system & application shell | **In review** | v2.0 Granite & Msasa; Assessments wired into nav, stages, menus |
| 2 | Authentication & onboarding | Not started | Includes candidate test-access links |
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
- [ ] User review and approval

## Known gaps carried forward

- Dark mode not built; the light granite workspace with bush-green shell is the chosen direction. Revisit if users ask.
- No automated tests yet; add component tests with Module 2 forms.
- Sign-out is simulated until Module 2.
