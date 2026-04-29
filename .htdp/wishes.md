## Wish List

### Layer 1 (implement first)
- `createReadableOmnibarLayoutDefinition(): OmnibarLayoutDefinition` in `src/omnibar/view.ts`
  Purpose: Return row-layout tokens that move the primary row title/content column near the default YouTube prompt input start by narrowing/retuning marker-kind columns while preserving readable type scale, viewport bounds, wrapping, and visible two-character prefix markers.
  Depends on: none

### Layer 0 (implement last)
- `buildOmnibarStyleSheet(definition: OmnibarViewDefinition): string` in `src/omnibar/view.ts`
  Purpose: Derive CSS variables and `.vilify-omnibar-row` grid rules from the layout tokens so cursor, prefix marker/kind, title/subtitle/status columns align neatly with the prompt input while preserving syntax colors, selected-row readability, scrolling, and no bare `!` status marker.
  Depends on: createReadableOmnibarLayoutDefinition
- `getOmnibarViewDefinition(): OmnibarViewDefinition` in `src/omnibar/view.ts`
  Purpose: Surface the aligned layout tokens through the default omnibar view definition without changing command/provider/action data, prefix semantics, theme classes, or row text wrapping policy.
  Depends on: createReadableOmnibarLayoutDefinition

## Data Definitions Created/Modified
- `src/omnibar/view.ts`: documented the `OmnibarLayoutDefinition` row-grid invariant: `markerColumnWidth`, `kindColumnWidth`, and `rowColumnGap` together define the primary row title-column start, which should stay near the default prompt input text column while preserving visible prefix markers.
- `package.json`: bumped extension package version from `0.6.100` to `0.6.101`.
- `manifest.json`: bumped extension manifest version from `0.6.100` to `0.6.101`.

## Assertion Changes Flagged
None

## Assumptions / Interpretations
- Interpreted “prompt input column” as the input text start after the default YouTube prompt label (`youtube ❯ :`) and prompt gap; exact visual alignment remains subject to human screenshot review.
- Interpreted the fix as a view/layout-token and stylesheet-derivation change only, not a change to transcript fetching, command inventory, provider/action data, or prefix parsing semantics.
- Assumed the existing row DOM structure (`cursor`, `kind`/prefix marker, title/subtitle/status content) should remain unless the implementer finds a small local view token/helper is necessary to make the alignment invariant explicit.
- Assumed tests should assert layout token ranges and generated CSS hooks/invariants, not provider/action output, because the issue is presentational.

## Notes
- `bun run build` and `bun run test` pass after the data-definition documentation and version-bump changes.
- No test files were edited in this stubber pass, so `diff-check` was not run.
- Pre-existing working tree changes in `.htdp/iteration.md` and `.htdp/status.md` were left untouched; `.htdp/wishes.md` was recreated for this issue.
