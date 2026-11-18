# Vettly implementation tracker

Phase 1: frontend only, mock data, service abstractions. Each module is reviewed and approved before the next starts.

| # | Module | Status | Notes |
|---|---|---|---|
| 1 | Design system & application shell | **In review** | Brand package, tokens, components, shell. See below. |
| 2 | Authentication & onboarding | Not started | Waiting for Module 1 approval |
| 3 | HR dashboard | Not started | `/` will redirect here |
| 4 | Vacancy management | Not started | |
| 5 | Candidate management | Not started | |
| 6 | CV upload & processing | Not started | |
| 7 | AI recruitment intelligence | Not started | Uses `ProvenanceTag` / `MatchScore` conventions |
| 8 | Recruitment pipeline | Not started | |
| 9 | Interview management | Not started | |
| 10 | Offers & hiring | Not started | |
| 11 | Talent intelligence | Not started | |
| 12 | Analytics & reporting | Not started | |
| 13 | Organisation settings | Not started | |
| 14 | Platform administration | Not started | Nav item visible only to super admin |
| — | Backend integration | Gated | Starts after all 14 modules are approved |

## Module 1 checklist

- [x] Brand: vector logo (horizontal, stacked, symbol, mono ink, mono white, light/dark), app icons, maskable icon, favicons, manifest
- [x] Colour, typography, spacing, radius, elevation tokens in `src/app/globals.css`
- [x] Components: Button, Input, Textarea, Field, Select, Checkbox, Switch, RadioGroup, Badge, Tag, Avatar, AvatarStack, Card, Table (+ sortable header), Tabs, Segmented, Modal, ConfirmModal, Drawer, DropdownMenu, Popover, Tooltip, Toast, Alert, Progress, Skeleton, EmptyState, Spinner, Kbd
- [x] Domain components: StageBadge, VacancyStatusBadge, ProvenanceTag, MatchScore, IllustrativeNotice
- [x] Shell: navy sidebar (collapsible, persisted), mobile drawer, header, command palette, notifications, profile menu with org switching and role preview, keyboard shortcuts, skip link
- [x] Every nav route resolves (placeholders state which module delivers them)
- [x] Design system page with working demos and loading / empty / error / success states
- [x] Mock data and services separated (`src/mocks`, `src/services`)
- [x] Typecheck, lint and production build pass
- [x] Browser check at 1440, 1024 and 375 wide
- [ ] User review and approval

## Known gaps carried forward

- Dark mode not built; the light workspace with navy shell follows the brand board. Revisit if users ask.
- No automated tests yet; add component tests with Module 2 forms.
- Sign-out is simulated until Module 2.
