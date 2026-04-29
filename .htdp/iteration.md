# Iteration

anchor: 0cc8bb9981af41978d47dc7b241e0aa77ae8ef1b
started: 2026-04-29T23:40:36Z
stubber-mode: data-definition-driven
workflow-mode: autonomous
language: TypeScript
transparent: true

## Source Artifacts

- PRD: .htdp/prds/prd-0001-omnibar-reset.md
- Issue: .htdp/issues/issue-0024-align-omnibar-results-with-input.md
- Architecture review: <none>

## Problem

Implement issue-0024: polish the omnibar result row layout so the primary row title/content column visually aligns with the prompt input start, especially for the default empty YouTube prefix-hint rows, while preserving readable prefix markers, selected-row contrast, wrapping, scrolling, and no bare status `!` marker.

## Data Definition Plan

Use the existing omnibar view data definitions as the primary seam. Refine `OmnibarLayoutDefinition` tokens and stylesheet derivation so the row marker/kind/title grid establishes a title content column that is near the prompt input column instead of being pushed far right by the legacy wide kind column. Add tests around layout token values and generated CSS hooks/invariants rather than changing command/provider/action data. If implementation needs a small presentational token to make the invariant explicit, keep it within `src/omnibar/view.ts` and derive CSS from it.

## Polya Ledger

### Knowns

- The issue is a visual/layout polish issue with status `draft` and HITL final judgment.
- Current row CSS uses three grid columns: marker, kind, title, with `kindColumnWidth: '12ch'` and `rowColumnGap: '0.8rem'`.
- Runtime currently renders the cursor in column 1, marker/prefix text in column 2, and primary title/subtitle/status text in column 3.
- Prompt input starts after the mode label, prompt mark, and a `1ch` flex gap.
- Current prefix markers already avoid the bare `!` marker and show `s/`, `t/`, or `n/` in prefixed contexts.
- Existing tests cover theme tokens, type scale, wrapping, scrolling, markers, syntax parts, and selected-row contrast.
- Repo convention requires bumping both `package.json` and `manifest.json`, then commit and push.

### Constraints

- Do not change transcript fetching behavior.
- Do not change command inventory, actions, provider semantics, or prefix parsing semantics.
- Do not reintroduce the bare `!` status marker.
- Preserve the accepted larger readable type scale and syntax-like palette unless a small alignment-related token adjustment is necessary.
- Preserve scrollable results, wrapping rows, selected-row readability, and viewport bounds.
- Run `bun run build` and `bun run test` before final review.

### Unknowns That Matter

- [resolved by user proceed] Exact visual taste will be judged after implementation; symbolic tests should encode only the alignment invariant and safety regressions.

### Out of Scope

- Transcript parser/fetch fixes; issue-0020 tracks that.
- New color theme direction or broad redesign.
- Further type-scale increases.
- Changing prefix marker semantics.
- Google support, drawers, listing renderers, comments UI, or page replacement.

### Assumptions

- The best low-risk fix is to reduce/retune the row leading marker/kind columns so row titles move left toward the existing prompt input column, not to move the prompt input far right.
- Prefix markers only need enough width for `s/`, `t/`, and `n/`; the previous 12ch kind column is legacy slack and can be narrowed.
- A symbolic CSS/layout test can guard the shared invariant, while final visual screenshot review remains HITL.

### Alternatives Considered

- Move the prompt input right to match the current far-right row title column — rejected because the issue says row text is too far right relative to the input start.
- Remove the marker/kind columns entirely — rejected because prefix markers should remain readable.
- Keep the wide 12ch kind column and rely on visual color only — rejected because it does not address alignment.
- Chosen: retune the row grid/layout tokens and tests so the title column starts near the current YouTube prompt input column while preserving markers and wrapping.

### Decision Log

- 2026-04-29T23:40:36Z — User selected issue-0024 and said to proceed with implementation.

### Look Back

- Leave empty for now.
