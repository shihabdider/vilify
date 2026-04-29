---
id: issue-0023
status: draft
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

- [ ] Given the user types `t/` and transcript mode shows loading, results, or unavailable status, when rows render, then the left marker shows `t/` or no marker, but not a bare `!`.
- [ ] Given the user types `s/query`, when the generated YouTube search row renders, then any left marker reflects the `s/` prefix or is omitted if redundant.
- [ ] Given the user types `n/history`, when navigation-filtered rows render, then any left marker reflects the `n/` prefix or is omitted if redundant.
- [ ] Given the default unprefixed command list renders, when rows include status or help entries, then no unexplained `!` appears in the left marker column.
- [ ] Given an actual warning/unavailable row renders, when the user scans it, then the warning is still clear through title/subtitle copy and warning color, even without the bare marker.

## Data definition impact

Expected presentation-only impact. The renderer may derive a display prefix from parsed query intent, row kind, or provider display metadata. If a new field is needed, keep it display-only and avoid changing command/provider action semantics.

## HtDP entry note

Phase 0 problem statement: address the user's feedback that the `!` on the left side is confusing. Prefer showing the active command prefix there (`t/`, `s/`, `n/`) when that adds context; otherwise remove the marker entirely. Do not change prefix command behavior, transcript fetching, or the command inventory.

## Verification

- `bun run build`
- `bun run test`
- Renderer tests for `t/`, `s/`, `n/`, default unprefixed rows, and status/unavailable rows confirming the bare `!` is not emitted as a left marker.
- Manual browser checks for `t/`, `s/query`, `n/history`, and default command list.

## Blocked by

- None - can start immediately.

## HtDP iterations

- None yet.

## Out of scope

- Color palette tuning; see `issue-0021`.
- Font-size changes; see `issue-0022`.
- Transcript request correctness; see `issue-0020`.
