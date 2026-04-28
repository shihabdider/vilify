---
id: issue-0013
status: draft
type: feature
mode: HITL
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on:
  - issue-0011
remote:
  github: null
---

# Redesign the omnibar as a Vim/TUI-style picker

## What to build

Replace the current generic modern command-palette styling with a compact fzf/Telescope-inspired TUI picker. This issue is primarily a UI/markup/CSS redesign, plus the required open-state navigation shortcut addition: `Ctrl+n` moves selection down and `Ctrl+p` moves selection up while the omnibar is open.

This issue should be implemented before the YouTube-wide/SP​​A activation follow-up (`issue-0012`) so visual direction and picker ergonomics are settled before broadening where the omnibar appears.

## Acceptance examples

- [ ] Given the omnibar opens on a YouTube watch page in default command mode with an empty query, when it renders, then it appears as a top-center fzf/Telescope-style TUI picker rather than a large glassy modal.
- [ ] Given the picker is open, when results render, then rows are compact one-line structured rows with a cursor column, item kind/label, and muted metadata/description when available.
- [ ] Given a result is selected, when rows render, then the selected row uses a classic inverse-video treatment and a `>` cursor, with no rounded blue pill highlight.
- [ ] Given the picker is open, when the user looks at the prompt, then mode label and prompt are on one compact terminal-like line, e.g. `youtube ❯ : <query>` or equivalent.
- [ ] Given empty/loading/status states occur, when they render, then they appear as inline terminal rows such as `-- no matches --`, `loading transcript…`, or `! transcript unavailable: timeout` rather than cards/toasts.
- [ ] Given the picker is open, when the user presses `Ctrl+n`, then selection moves down using the same bounds behavior as ArrowDown.
- [ ] Given the picker is open, when the user presses `Ctrl+p`, then selection moves up using the same bounds behavior as ArrowUp.
- [ ] Given the omnibar is closed, when the user presses `Ctrl+n` or `Ctrl+p`, then Vilify does not intercept the key; closed state still intercepts only `:` on supported pages.
- [ ] Given focus is inside an editable target while the omnibar is closed, when the user types `:`, then Vilify leaves the event alone as before.

## Data definition impact

Expected changes are mostly presentational and keyboard-intent mapping:

- Update omnibar DOM structure/classes as needed to support terminal prompt, status line, cursor column, kind column, and single-line row layout.
- Extend open-state key intent handling so `Ctrl+n` maps to move-down and `Ctrl+p` maps to move-up.
- No product-scope or provider data model changes expected.

## HtDP entry note

Phase 0 problem statement: align the visible omnibar with the desired Vim/TUI aesthetic. The target is a fzf/Telescope-style picker: top-center floating panel, medium dense width around 72–88ch, dark terminal-neutral palette, clean monospace typography, thin square border, compact status line, single-line prompt with mode label, one-line structured rows, inverse-video selection with `>` cursor, no page dimming, and inline terminal rows for empty/loading/status states.

Constraints:

- Do not broaden activation scope in this issue; `issue-0012` owns YouTube-wide/SP​​A activation.
- Do not reintroduce full focus mode, listing UI, drawers, comments UI, or Google support.
- Keep existing behavior except for open-state `Ctrl+n` / `Ctrl+p` navigation.
- Closed state must still intercept only `:`.
- Avoid novelty/pixel terminal effects; use readable monospace-first browser typography.
- Browser visual QA is manual in the user's Chrome extension session, not Playwright/isolated browser automation.

## Verification

- `bun run build`
- `bun run test`
- Unit/jsdom tests for `Ctrl+n` / `Ctrl+p` open-state navigation and closed-state non-interception.
- DOM/CSS-hook tests for terminal prompt structure, row cursor/kind/label/metadata structure, selected-row marker, status/footer line, and inline empty/status rows.
- Manual browser QA: load the unpacked extension, open a direct YouTube watch page, press `:`, capture/review the default command mode with an empty query. Acceptance should be based on whether it reads as a compact Vim/TUI picker rather than a generic web command palette.

## Blocked by

- None - can start immediately.

## HtDP iterations

- None yet.

## Out of scope

- YouTube-wide activation and SPA navigation robustness (`issue-0012`).
- Transcript-mode visual fixture automation beyond preserving row grammar.
- `Ctrl+j` / `Ctrl+k`, `j` / `k`, configurable keymaps, or other Vim behavior expansions.
- Bottom command-line mode or full-screen terminal overlay.
- Playwright-based extension visual QA.
