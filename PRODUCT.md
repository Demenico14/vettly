# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4, Radix UI primitives, lucide-react icons, sonner toasts, react-hook-form + zod for forms. Separate repository from the Modern Digital Labs portfolio. Phase 1 is frontend only: mock data and service abstractions, no database, no real AI processing.

## Users

- **HR officers and recruiters** at mid-to-large organisations in Zimbabwe and Southern Africa. They open the app daily, often for hours, to run vacancies, screen large batches of CVs, move candidates through a pipeline and schedule interviews.
- **Hiring managers** who review shortlists, sit on interview panels and submit scorecards. Less frequent, task-focused visits.
- **Organisation administrators** who configure users, roles, recruitment settings, branding and subscription.
- **Vettly super administrators** (platform staff) who manage tenant organisations, subscriptions, system health and AI provider/model configuration.

## Product Purpose

Vettly is a multi-tenant recruitment platform that turns a pile of CVs into an evidence-based shortlist. HR teams define a vacancy's essential and desirable requirements and screening weights; Vettly extracts structured profiles from uploaded CVs and assesses each candidate requirement by requirement, citing the evidence it found and flagging what is missing. Success means HR reaches a defensible shortlist faster, and every decision can be traced back to evidence.

## Positioning

Assessment is requirement-by-requirement with cited evidence and explicit missing-evidence flags, not a single opaque score. AI suggests; HR decides and records the decision. Illustrative or AI-generated assessments are always visibly distinguished from assessments a person has confirmed.

## Operating Context

- Bulk CV uploads (PDF/DOCX) after a vacancy closes, often hundreds per role.
- Local context: Zimbabwean and regional institutions (UZ, NUST, MSU, Wits, UCT), professional bodies (ICAZ, CIPS, IPMZ), cities (Harare, Bulawayo, Mutare, Gweru, Johannesburg, Lusaka), currencies USD and ZiG, phone numbers in +263 format.
- Panel interviews with multiple interviewers and structured scorecards.
- Audit expectations: decisions and configuration changes are logged.

## Capabilities and Constraints

- Module roadmap (fixed order): 1 design system + shell, 2 auth/onboarding, 3 HR dashboard, 4 vacancies, 5 candidates, 6 CV upload/processing, 7 AI recruitment intelligence, 8 pipeline, 9 interviews, 10 offers/hiring, 11 talent intelligence, 12 analytics, 13 organisation settings, 14 platform administration.
- One module at a time; each is reviewed and approved before the next starts.
- Every visible control must work against local state or mock services.
- Mock data is deterministic and consistent: the same candidate carries the same record everywhere.
- Undecided: pricing tiers, AI provider, production domain.

## Brand Commitments

- Name: Vettly. Tagline: "Smarter Hiring. Faster."
- Official visual direction pinned by the user (2026-11-18) from the brand board at `docs/reference/brand-board-concept.webp`. The board is a reference; production assets are vector recreations in `public/brand/`.
  - Logo: a two-stroke "V" mark (wide indigo-to-violet left stroke, slimmer blue-to-cyan right stroke rising higher) beside a heavy "Vettly" wordmark.
  - Colours: Primary #6366F1, Secondary #06B6D4, Accent #8B5CF6, Success #10B981, Warning #F59E0B, Error #EF4444; neutrals #0F172A, #334155, #64748B, #CBD5E1, #F8FAFC.
  - Typography: Plus Jakarta Sans.
  - Shell: deep navy (#0F172A family) sidebar, light workspace.
- No alternative colours or typefaces without a stated justification.

## Evidence on Hand

No real customers, testimonials, metrics or benchmarks. All dashboard figures and assessments are illustrative mock data and must be labelled as such.

## Product Principles

1. Evidence over verdicts: show why, not just a number.
2. HR stays the decision-maker; the AI's role is always visible and reversible.
3. Dense but calm: built for people who live in it all day.
4. Traceability: every stage change and decision leaves a record.
5. Local by default: regional names, institutions, currencies and formats.

## Accessibility & Inclusion

WCAG 2.2 AA contrast and keyboard operability across all modules. Status never conveyed by colour alone. Works on mid-range Android phones and older laptops common in the region.
