---
id: issue-0015
status: done
type: bug
mode: AFK
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on: []
remote:
  github: null
---

# Wrap long omnibar row text instead of truncating it

## What to build

Fix omnibar row layout so important titles and descriptions wrap within the picker instead of being hidden behind ellipses. Long status rows, transcript rows, and command descriptions should remain readable without horizontal overflow. User evidence is preserved at `.htdp/issues/assets/issue-0015-text-truncation.png`.

## Acceptance examples

- [x] Given a status item such as “No active YouTube video”, when its title and subtitle exceed the picker width, then the user can read the full message because the row text wraps within the row.
- [x] Given a transcript result or command has a long title/subtitle, when it renders, then the content wraps to additional lines instead of being clipped with `…`.
- [x] Given row text wraps, when the row is selected, then the inverse-video/highlight treatment covers the full wrapped row and remains legible.
- [x] Given the prompt and footer render, when row wrapping is enabled, then the prompt/input and footer/status line still stay compact and do not wrap unexpectedly.

## Data definition impact

No provider data model changes expected. The expected changes are presentational: row DOM/CSS may need separate kind, title, and subtitle areas whose text wrapping and selected-state styling are explicit. Tests may need updated CSS assertions that no longer require `white-space: nowrap` or `text-overflow: ellipsis` for readable row content.

## HtDP entry note

Phase 0 problem statement: make the terminal picker readable before adding more command modes. Keep the TUI aesthetic, but prefer readable wrapped content over strict one-line rows where one-line layout hides the actual command/status text. Keep wrapping scoped to result rows; do not turn the omnibar into a larger modal or persistent drawer.

## Verification

- `bun run build`
- `bun run test`
- DOM/CSS-hook tests for wrapped row text and selected-row styling over multi-line content.
- Regression tests updated from the `issue-0013` one-line row expectations where they conflict with readability.
- Manual browser check using the provided failure case: the “No active YouTube video” row should be fully readable.

## Blocked by

- None - can start immediately.

## HtDP iterations

- Completed in combined HtDP iteration for issues 0014-0019 on 2026-04-29; final preverify passed (`bun run build`, `bun run test` with 121 tests), targeted palette/hints fix landed, and human final verification passed.

## Out of scope

- Changing command availability or provider filtering.
- Changing the command palette color theme.
- Adding horizontal scrolling as the primary way to read row text.
