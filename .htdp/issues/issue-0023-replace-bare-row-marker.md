---
id: issue-0023
status: done
type: feature
mode: AFK
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on: []
remote:
  github: null
---

# Replace bare result markers with command-prefix context

## What to build

Remove the confusing bare `!` marker from the left side of omnibar rows. When a row is produced by an active prefix flow, show useful command-prefix context such as `t/`, `s/`, or `n/` in that column; when there is no meaningful prefix, leave the marker minimal or empty. Error/status semantics should be communicated in the row title/subtitle and color treatment, not by an unexplained left-column `!`.

## Acceptance examples

- [x] Given the user types `t/` and transcript mode shows loading, results, or unavailable status, when rows render, then the left marker shows `t/` or no marker, but not a bare `!`.
- [x] Given the user types `s/query`, when the generated YouTube search row renders, then any left marker reflects the `s/` prefix or is omitted if redundant.
- [x] Given the user types `n/history`, when navigation-filtered rows render, then any left marker reflects the `n/` prefix or is omitted if redundant.
- [x] Given the default unprefixed command list renders, when rows include status or help entries, then no unexplained `!` appears in the left marker column.
- [x] Given an actual warning/unavailable row renders, when the user scans it, then the warning is still clear through title/subtitle copy and warning color, even without the bare marker.

## Data definition impact

Implemented display-only `OmnibarCommandPrefix`, `OmnibarRowMarker`, `OmnibarItemDisplay`, shared prefix parsing, and YouTube prefix display metadata. Command/provider action semantics were preserved.

## HtDP entry note

Completed. Future marker changes should remain display-only unless a new issue explicitly changes command behavior.

## Verification

- `bun run build`
- `bun run test`
- Renderer tests for `t/`, `s/`, `n/`, default unprefixed rows, and status/unavailable rows confirming the bare `!` is not emitted as a left marker.
- Manual browser checks passed on 2026-04-29. Remaining visual note about result/input alignment was split to `issue-0024`.

## Blocked by

- None - done.

## HtDP iterations

- 2026-04-29: Replaced bare status markers with display-only prefix/empty markers through version `0.6.98`; symbolic verification passed and final human marker verification passed.

## Out of scope

- Color palette tuning; see `issue-0021`.
- Font-size changes; see `issue-0022`.
- Transcript request correctness; see `issue-0020`.
- Result/input column alignment polish; see `issue-0024`.
