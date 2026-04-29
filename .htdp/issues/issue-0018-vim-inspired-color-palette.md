---
id: issue-0018
status: done
type: feature
mode: HITL
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on: []
remote:
  github: null
---

# Apply a Vim-inspired color palette to the omnibar

## What to build

Replace the current pure black-and-white terminal look with a restrained Vim-inspired palette. The picker should still feel text-first and keyboard-native, but use color to distinguish mode, prompt, selected row, navigation/action kinds, status, and errors. The direction is “Vim-style coloring”, not a generic neon terminal theme.

## Acceptance examples

- [x] Given the omnibar opens in default YouTube mode, when the user sees the prompt and border, then the UI no longer reads as pure black/white vi; it uses the default Vim dark feel: black/dark background, bright syntax-like accent colors, and readable selected rows.
- [x] Given rows of different kinds render, when the user scans the list, then navigation, command/search, video-scoped, and status/error rows are distinguishable without relying only on text labels.
- [x] Given a row is selected, when colors are applied, then the selected row has strong contrast and remains readable for both one-line and wrapped rows.
- [x] Given status/unavailable rows render, when colors are applied, then warning/error states are visually distinct but not noisy.
- [x] Given manual visual review is performed in the browser, when a screenshot is compared to the current pure black/white picker, then the new palette is accepted as closer to Vim than vi.

## Data definition impact

No command/provider data changes expected. CSS custom properties or a small theme token table may be useful so the palette is explicit and testable. If row kind coloring depends on `OmnibarItemKind`, preserve the existing item-kind semantics and avoid adding product behavior solely for styling.

## HtDP entry note

Phase 0 problem statement: polish the TUI picker aesthetic after the layout remains readable. Start from a conservative Vim-like palette: dark charcoal background, muted gray foreground, green/cyan/yellow accents for mode/prompt/kinds, and restrained warning/error colors. Keep contrast high and avoid novelty terminal effects, gradients, glassmorphism, or full-screen theming.

## Verification

- `bun run build`
- `bun run test`
- CSS/DOM tests for presence of theme tokens or kind/status classes where useful.
- Manual browser screenshot review on default, filtered, selected, status/unavailable, and transcript-result states.

## Blocked by

- Human visual judgment is required before marking done; palette taste cannot be fully verified symbolically.

## HtDP iterations

- Completed in combined HtDP iteration for issues 0014-0019 on 2026-04-29; final preverify passed (`bun run build`, `bun run test` with 121 tests), targeted palette/hints fix landed, and human final verification passed.

## Out of scope

- Layout fixes for scrolling or wrapping; see `issue-0014` and `issue-0015`.
- Configurable themes.
- Replacing the TUI picker with a different visual metaphor.
