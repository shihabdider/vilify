---
id: issue-0022
status: draft
type: feature
mode: HITL
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on: []
remote:
  github: null
---

# Increase omnibar type scale for readability

## What to build

Make the omnibar easier on the eyes by increasing the monospace font size and adjusting the popup dimensions only as much as needed to preserve the compact TUI picker feel. Prompt, results, wrapped descriptions, and footer hints should all become more readable without turning the omnibar into a large modal or reintroducing a page takeover.

## Acceptance examples

- [ ] Given the omnibar opens in default YouTube mode, when the prompt and result rows render, then the base text is visibly larger than the current implementation and remains comfortable to scan.
- [ ] Given the default prefix help list renders, when font size increases, then the popup grows or reflows enough that rows are not cramped or clipped.
- [ ] Given a long result description wraps, when it renders at the larger size, then line height and spacing remain readable and the row is not visually crowded.
- [ ] Given many results render, when the popup reaches its max height, then scrolling still works and the footer remains visible and legible.
- [ ] Given a small viewport, when the omnibar opens, then it stays within the viewport and remains a compact overlay rather than a full-screen replacement.

## Data definition impact

None expected. This should be a CSS/layout token change unless tests reveal hard-coded layout assumptions that need to become named sizing constants.

## HtDP entry note

Phase 0 problem statement: apply the user's readability feedback by increasing omnibar font size and making proportional popup/spacing adjustments. Keep the visual model from the TUI picker: top overlay, square border, no page dimming, no full-site replacement, no broad command behavior changes.

## Verification

- `bun run build`
- `bun run test`
- DOM/CSS tests for sizing tokens or layout classes if existing tests cover omnibar structure.
- Manual browser screenshot review for default results, prefix help, wrapped rows, footer hints, and a small viewport if practical.

## Blocked by

- Human visual judgment is required before marking done; exact readability comfort cannot be fully verified symbolically.

## HtDP iterations

- None yet.

## Out of scope

- Palette refinement; see `issue-0021`.
- Command inventory or prefix behavior changes.
- Full responsive redesign beyond keeping the larger picker inside the viewport.
