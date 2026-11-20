# Vettly roadmap

Restructured 19 Nov 2026 to add **psychometric assessments** as Module 9. Modules after it moved up one number (15 in total). Phase 1 is frontend only with mock data; each module is reviewed and approved before the next starts.

## Recruitment flow

```
Vacancy → Applications / CV upload → AI matching → Shortlist
      → Psychometric tests → Interviews → Offer → Hired
```

Psychometric tests sit after shortlisting and before interviews, so panels walk into interviews with test results in hand. HR can also send tests at any stage, or skip them per vacancy.

## Modules

| # | Module | Status |
|---|---|---|
| 1 | Design system & application shell | Approved |
| 2 | Authentication & onboarding (+ candidate test access) | Approved |
| 3 | HR dashboard | Approved |
| 4 | Vacancy management | Approved |
| 5 | Candidate management | Approved |
| 6 | CV upload & processing | Approved |
| 7 | AI recruitment intelligence | Approved |
| 8 | Recruitment pipeline | Approved |
| **9** | **Psychometric assessments** (new) | Approved |
| 10 | Interview management | Approved |
| 11 | Offers & hiring | Approved |
| 12 | Talent intelligence | Approved |
| 13 | Analytics & reporting | Approved |
| 14 | Organisation settings | Approved |
| 15 | Platform administration | Not started |

---

### 1. Design system & application shell
Brand, typography, colour, spacing, buttons, inputs, dropdowns, tables, cards, badges, modals, toasts, sidebar, header, profile menu, responsive navigation.
*Assessments:* nav item, "Assessment" pipeline stage, "Send psychometric test" quick action and bulk action, assessment notification type. **Done.**

### 2. Authentication & onboarding
Login, registration, forgot/reset password, organisation creation and setup, invitation acceptance, workspace onboarding.
*Assessments:* **candidate test access**, i.e. a candidate opens a secure, time-limited link from their invitation email or SMS, confirms identity (email + one-time code), accepts consent and starts. Candidates never get a full Vettly account.

### 3. HR dashboard
Recruitment overview, key statistics, active vacancies, recent applications, activity, upcoming interviews, funnel, quick actions.
*Assessments:* "Tests awaiting completion" and "Results ready to review" panels; assessment stage in the funnel.

### 4. Vacancy management
Listing, details, create/edit, job description editor (simulated AI assist), requirements builder, essential/desirable skills, screening weights, publishing, status.
*Assessments:* per-vacancy **assessment plan**: which tests to send, when (auto on shortlist, or manual), deadline, and whether results count toward the overall score.

### 5. Candidate management
Directory, search, advanced filters, profile, education, experience, skills, certifications, projects, documents, LinkedIn, application history.
*Assessments:* **Assessments tab** on the profile: tests sent, status, scores, report links, history across applications.

### 6. CV upload & processing
Bulk upload, drag and drop, progress, queue, status, extraction preview, failed extraction, manual correction.

### 7. AI recruitment intelligence
Matching overview, match score, skills comparison, requirement-by-requirement assessment, evidence viewer, missing evidence, ranking, AI explanations, comparison, HR assessment controls. Illustrative AI is always distinguished from confirmed assessments.
*Assessments:* optional test-score weighting in the overall ranking, clearly labelled as a separate input from CV evidence.

### 8. Recruitment pipeline
Kanban board, stages, candidate cards, stage transitions, filters, bulk actions, application history, decision records.
*Assessments:* **Assessment** column; cards show test progress (e.g. "2 of 3 tests complete"); moving a card into the column offers to send the vacancy's tests.

### 9. Psychometric assessments (new)
Sending psychometric tests to candidates and reviewing the results.

**HR side**
- **Test library:** catalogue of tests by type, including personality, cognitive ability, numerical reasoning, verbal reasoning, situational judgement and integrity. Each shows duration, number of questions, what it measures, and the norm group used for comparison.
- **Test batteries:** saved bundles (e.g. "Finance graduate battery" = numerical + verbal + personality) reusable across vacancies.
- **Send tests:** to one candidate or in bulk from the candidate list, pipeline or shortlist. Choose tests or a battery, set a deadline, preview the invitation email/SMS, send. Includes form validation and a confirmation step.
- **Invitation tracker:** table of every invitation with status (not sent, sent, opened, in progress, completed, expired, cancelled), sent date, deadline, time taken. Filters by vacancy, test and status.
- **Reminders and changes:** send reminders (single or bulk), extend deadlines, cancel or re-send invitations, all with toast confirmation and undo where reversible.
- **Results and reports:** per-candidate report with raw score, percentile against the norm group, score bands, trait profile for personality tests, and narrative summary. Results stay **illustrative and clearly labelled** in Phase 1.
- **Comparison:** side-by-side results for shortlisted candidates on the same tests.
- **HR review:** mark results reviewed, add notes, flag concerns. Results inform decisions; they never auto-reject.
- **States:** loading, empty library, no invitations yet, expired invitations, failed delivery (bad email/number), incomplete attempts.

**Candidate side** (candidate-facing, branded with the employer's organisation)
- Invitation landing page with instructions, duration and practice question.
- Consent and data-use notice before starting.
- Test-taking screens with progress, timer where the test is timed, save and resume for untimed tests, accessibility support (keyboard, screen reader, extra time accommodation flag).
- Completion confirmation. Candidates do not see raw scores unless the organisation enables feedback reports.
- Expired or already-completed link states.

**Rules to respect**
- Tests are a decision aid, never an automatic filter.
- Candidates must consent; results are personal data and follow Module 14's privacy settings.
- Accommodations (extra time) recorded and honoured.
- Every send, reminder, extension, cancellation and review is written to the audit log.

### 10. Interview management
Calendar, scheduling, details, interviewer assignment, questions, assessment forms, feedback, scorecards.
*Assessments:* panel sees the candidate's test summary on the interview details; suggested probing questions from personality results.

### 11. Offers & hiring
Offer management, creation, details, status, candidate acceptance/rejection, successful hiring workflow.

### 12. Talent intelligence
Talent pool, advanced search, skills-based discovery, availability, profile discovery, saved searches, collections.
*Assessments:* filter and search by completed test results (e.g. numerical reasoning above 70th percentile).

### 13. Analytics & reporting
Application trends, time-to-hire, vacancy performance, funnel analytics, source reporting, recruiter performance, exports.
*Assessments:* completion rates, average time to complete, drop-off by test, score distributions, adverse-impact monitoring across groups.

### 14. Organisation settings
Profile, branding, users, roles and permissions, recruitment configuration, notifications, privacy, subscription, audit log.
*Assessments:* default test batteries, invitation email/SMS templates, default deadlines and reminder schedule, consent wording, result retention period, who can see reports (permission), candidate feedback reports on/off.

### 15. Platform administration
Organisations, subscriptions, platform usage, users, system health, AI provider and model configuration, platform audit logs.
*Assessments:* **assessment provider configuration** (in-house tests or third-party providers), test catalogue management, norm-group management, usage per organisation, test credits on subscriptions.

---

## Backend integration gate

After all 15 modules are approved: real APIs replace mock services; authentication; database; document storage; CV processing; AI matching; **psychometric test delivery, scoring and provider integration**; audit logging; permission and tenant-isolation checks.
