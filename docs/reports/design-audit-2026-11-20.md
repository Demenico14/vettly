# Vettly design audit, 20 Nov 2026

Two passes: the impeccable technical audit (rendered detector on 19 routes, desktop and phone) and a second agent's review against *UI Design Principles* by Michael Filipiuk. Fixes were applied in the same session; scores are after the fixes.

## Audit health score (after fixes)

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3 | Contrast, heading levels, focus rings and tab stops fixed |
| 2 | Performance | 3 | Long lists now paginated; pipeline columns capped at 20 |
| 3 | Theming | 3 | Tokens used throughout; page-title sizes still hard-coded |
| 4 | Responsive | 3 | 16px inputs on phones, 40px controls on touch, compact pager |
| 5 | Implementation integrity | 4 | Copper, green and ochre each have one meaning; source detector clean |
| **Total** | | **16/20** | **Good** |

## Fixed

- **P1** Sidebar group labels and counts were 2.6:1 contrast; now about 6:1.
- **P1** Alert bodies and deactivated user rows were dimmed with opacity (down to 2.5:1); now full-contrast text.
- **P1** Inputs were 14px, which zooms iOS; now 16px on phones and 14px from `sm` up.
- **P1** Candidate pickers in Schedule interview and New offer were plain dropdowns; now a searchable `Combobox`, grouped and sorted by stage.
- **P1** Test-runner rating options had no focus ring and 30px targets; now focus ring and 44px.
- **P1** No list paginated. A shared `Pagination` / `usePagination` now covers:
  - candidates, vacancies, matching ranking (rank numbers continue across pages)
  - CV batches, test invitations, offers
  - talent results, collections
  - settings users and audit log
  - admin organisations, accounts and audit log

  Pipeline columns show 20 cards, then "Show more". Dashboard feeds show 6, with links to everything.
- **P2** Heading levels skipped from h1 to h3; fixed.
- **P2** 11px text in small badges, skill tags, column hints and notices; now 12px.
- **P2** The confirm dialog swallowed errors and put "Cancel" next to "Cancel invitation"; it now shows the error inline, and the dismiss button reads "Back".
- **P2** Five load errors had no retry; a shared `LoadError` adds "Try again".
- **P2** Colour roles:
  - dashboard tiles no longer borrow the warning and confirmed colours
  - deadlines are ochre with a clock
  - copper only marks "needs you"
- **P2** Tab indicators conveyed status by colour alone; they now show counts as text.
- **P2** Requirement dots created about 250 tab stops; now one labelled summary per row.
- **P2** Touch targets: segmented controls and filter chips are 40px on touch screens; tag remove is 24px and uses the library icon.
- **P3** All-caps headings are now sentence case, and running text avoids single-word last lines.

## Follow-up fixes (same day)

- **Type tokens.**
  - `title-sm` / `title` (28 / 34px, line-height 1.1, −0.02em) and `md` (15px) added to `globals.css`.
  - A shared `PageTitle` now renders the h1 for `PageHeader` and for the 13 detail screens that had their own header.
  - No hard-coded title or 15px sizes remain.
- **One bulk-action bar.**
  - A shared `BulkBar` / `BulkAction` replaces the six separate bars (candidates, test invitations, matching compare, pipeline, talent, design system).
  - It is dark and floats at the bottom of the screen while anything is selected.
- **Sticky table headers.**
  - `THead sticky` inside a `TableScroll` area keeps column names visible.
  - Used on candidates, vacancies, offers, test invitations, the matching ranking, settings users, and admin organisations and accounts.
- **Clearer Publish.** The vacancy editor's button now reads "Publish to N channels".

## Remaining

- **Accepted detector findings:**
  - the hatched copper bars are the intentional "unreviewed AI" signature
  - the hairline-bordered lists inside panels are flagged as nested cards, but they aren't stacked shadowed cards
