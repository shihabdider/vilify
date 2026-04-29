---
id: issue-0022
status: done
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

- [x] Given the omnibar opens in default YouTube mode, when the prompt and result rows render, then the base text is visibly larger than the previous implementation and remains comfortable to scan.
- [x] Given the default prefix help list renders, when font size increases, then the popup grows or reflows enough that rows are not cramped or clipped.
- [x] Given a long result description wraps, when it renders at the larger size, then line height and spacing remain readable and the row is not visually crowded.
- [x] Given many results render, when the popup reaches its max height, then scrolling still works and the footer remains visible and legible.
- [x] Given a small viewport, when the omnibar opens, then it stays within the viewport and remains a compact overlay rather than a full-screen replacement.

## Data definition impact

Implemented `OmnibarLayoutDefinition` with explicit type-scale, line-height, panel bounds, results bounds, spacing, and column-width tokens.

## HtDP entry note

Completed. Future type/layout changes should preserve the compact TUI picker model unless a new PRD expands scope.

## Verification

- `bun run build`
- `bun run test`
- DOM/CSS tests for sizing/layout tokens.
- Manual browser screenshot review passed on 2026-04-29. Remaining visual note about result/input alignment was split to `issue-0024`.

## Blocked by

- None - done.

## HtDP iterations

- 2026-04-29: Increased type scale and layout bounds through version `0.6.98`; symbolic verification passed and final human readability verification passed.

## Out of scope

- Palette refinement; see `issue-0021`.
- Command inventory or prefix behavior changes.
- Full responsive redesign beyond keeping the larger picker inside the viewport.
- Result/input column alignment polish; see `issue-0024`.
