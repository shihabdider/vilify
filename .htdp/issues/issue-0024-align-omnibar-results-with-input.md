---
id: issue-0024
status: draft
type: feature
mode: HITL
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on:
  - issue-0021
  - issue-0022
  - issue-0023
remote:
  github: null
---

# Align omnibar result content with the input column

## What to build

Polish the omnibar row grid so drawer/result items line up more neatly with the prompt input. The larger syntax-colored picker is accepted, and prefix markers are accepted, but the current default prefix-hint view leaves the primary row text visually offset too far to the right relative to the input text start.

Source screenshot from final verification feedback:

- `/var/folders/vb/vpcg5jdd3xsbq6xd77tv1x0jdgfsjw/T/pi-clipboard-5ce8ff9e-d3cf-46b4-a123-82bcdbaccbaf.png`

## Acceptance examples

- [ ] Given the default empty YouTube omnibar shows prefix hints, when rows render, then the primary title text (`s/{query}`, `t/{query}`, etc.) begins visually aligned with the prompt input text or within about one monospace character of it.
- [ ] Given a prefixed row renders for `t/`, `s/query`, or `n/history`, when the row marker is visible, then the marker remains readable but the row's primary content still aligns with the same content column as default rows.
- [ ] Given a selected row uses inverse highlight, when alignment changes, then the cursor/marker/title/subtitle remain readable and the row does not look cramped.
- [ ] Given status/unavailable rows render, when the marker column is empty or prefixed, then no bare `!` returns and warning/error semantics remain visible through text and color.
- [ ] Given the picker appears on a narrower viewport, when alignment changes, then wrapping and scrolling still work and the panel remains within the viewport.

## Data definition impact

Expected presentational/layout changes. Likely candidates are `OmnibarLayoutDefinition` column-width tokens, row grid structure, prompt/input layout tokens, or a small alignment invariant in the view definition. Avoid changing command/provider data or action semantics.

## HtDP entry note

Phase 0 problem statement: follow up the accepted palette/type-scale/marker work with a row alignment polish. The current result title column appears too far right compared with the input start in the empty prefix-hint view. Adjust layout tokens/row grid/prompt alignment so rows look intentional and neat while preserving prefix markers, syntax coloring, wrapping, scrolling, and compact TUI style.

Constraints:

- Do not change transcript fetching behavior.
- Do not change command inventory or prefix semantics.
- Do not reintroduce the bare `!` status marker.
- Keep the larger readable type scale and syntax-like palette unless a small alignment-related token adjustment is necessary.

## Verification

- `bun run build`
- `bun run test`
- DOM/CSS tests for row marker/title/prompt alignment hooks or shared layout tokens where practical.
- Manual screenshot review of default prefix hints, `t/` unavailable/loading/results, `s/query`, `n/history`, selected row, and a narrow viewport.

## Blocked by

- Human visual judgment is required before marking done; exact alignment quality cannot be fully verified symbolically.

## HtDP iterations

- None yet.

## Out of scope

- Transcript fetch/parser correctness; see `issue-0020`.
- New color theme direction; `issue-0021` is accepted.
- Further type-scale increases; `issue-0022` is accepted.
- Changing prefix marker semantics; `issue-0023` is accepted.
