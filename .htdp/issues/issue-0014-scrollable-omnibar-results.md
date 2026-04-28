---
id: issue-0014
status: draft
type: bug
mode: AFK
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on: []
remote:
  github: null
---

# Make overflowing omnibar results scroll inside the picker

## What to build

Fix the omnibar result viewport so a long result list scrolls within Vilify's picker instead of letting the selected highlight move behind the fixed footer or out of view. The prompt/header and footer should remain visible, while only the result contents scroll. User evidence is preserved at `.htdp/issues/assets/issue-0014-scroll-overflow.png`.

## Acceptance examples

- [ ] Given the YouTube default mode has more rows than fit in the picker, when the user moves the selection down with ArrowDown or Ctrl+n, then the selected row remains visible inside the results viewport.
- [ ] Given the selected row is near the bottom of a long list, when the footer is visible, then the row is not hidden underneath the footer/status line.
- [ ] Given the pointer or trackpad scrolls over the result list, when there are overflow rows, then the result list scrolls and the underlying YouTube page does not move.
- [ ] Given the result list is shorter than the viewport, when the omnibar opens, then there is no unnecessary scrollbar or layout jump.

## Data definition impact

No provider data model changes expected. Likely changes are limited to omnibar view/layout state and DOM/CSS invariants: a distinct scrollable results viewport, selected-row visibility behavior, and possibly a small DOM adapter around `scrollIntoView` or equivalent so selection scrolling is testable.

## HtDP entry note

Phase 0 problem statement: keep Vilify's one custom UI primitive usable when a provider returns many items. The user called this the drawer, but the implementation should be scoped to the active omnibar result viewport only; do not reintroduce legacy drawers or page replacement UI. Preserve the terminal picker structure from `issue-0013`, with fixed prompt/footer and scrollable contents.

## Verification

- `bun run build`
- `bun run test`
- Unit/jsdom tests for the CSS/DOM contract that the results container is the scrollable element, not the outer picker.
- Unit tests or an injected adapter test proving selection movement requests the selected row to remain visible.
- Manual browser check on a YouTube page with enough commands/results to overflow: ArrowDown/Ctrl+n to the bottom and confirm the highlight stays visible.

## Blocked by

- None - can start immediately.

## HtDP iterations

- None yet.

## Out of scope

- Changing provider command inventory.
- Adding legacy drawers, side panels, persistent transcript UI, or page replacement behavior.
- Color palette or text wrapping changes except where required to make scrolling correct.
