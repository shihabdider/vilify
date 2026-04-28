## Wish List

### Layer 2 (implement first)
- `getOpenOmnibarKeyIntent(event: KeyboardEvent): OpenOmnibarKeyIntent | null` in `src/omnibar/keyboard.ts`
  Purpose: Classify open-state keydown events so ArrowUp/Ctrl+p return `move-up`, ArrowDown/Ctrl+n return `move-down`, Enter returns `execute`, Escape returns `escape`, and unrelated keys return `null`.
  Depends on: none
- `renderStyle(): HTMLStyleElement` in `src/omnibar/runtime.ts`
  Purpose: Provide compact top-center terminal/TUI picker CSS: monospace-first typography, 72–88ch-style width, thin square border, no glassy/rounded modal treatment, dense one-line rows, muted metadata, and inverse-video selected row styling.
  Depends on: none
- `renderItem(item: OmnibarItem, selected: boolean): HTMLDivElement` in `src/omnibar/runtime.ts`
  Purpose: Render one `OmnibarItem` as a compact terminal row with cursor column (`>` only when selected), kind/label column, title text, optional muted subtitle metadata, status-kind inline terminal grammar, and selected-row inverse-video hooks.
  Depends on: none

### Layer 1
- `renderResults(items: readonly OmnibarItem[]): HTMLDivElement` in `src/omnibar/runtime.ts`
  Purpose: Render the item collection as a dense listbox of terminal rows, preserving item data attributes/selection roles and rendering empty collections as an inline `-- no matches --` terminal row rather than a card.
  Depends on: renderItem
- `renderOverlay(items: readonly OmnibarItem[]): HTMLDivElement` in `src/omnibar/runtime.ts`
  Purpose: Assemble the top-center TUI picker panel with a one-line terminal prompt containing mode label and query input, the compact results list, and a footer/status line while preserving existing query update behavior.
  Depends on: renderResults
- `handleDocumentKeyDown(event: KeyboardEvent): void` in `src/omnibar/runtime.ts`
  Purpose: Apply open-state key intents so Ctrl+n/Ctrl+p navigate with the same bounded behavior as ArrowDown/ArrowUp, while the closed state continues to intercept only `:` outside editable targets.
  Depends on: getOpenOmnibarKeyIntent

### Layer 0 (implement last)
- `createOmnibarRuntime(options: OmnibarRuntimeOptions): OmnibarRuntime` in `src/omnibar/runtime.ts`
  Purpose: Integrate the redesigned TUI picker markup, CSS, input focus, row/status rendering, and keyboard handling into the existing omnibar runtime without changing provider/action semantics or broadening YouTube watch-page activation scope.
  Depends on: renderStyle, renderOverlay, handleDocumentKeyDown

## Data Definitions Created/Modified
- None — reused existing `OmnibarState`, `OmnibarMode`, `OmnibarItem`, `OmnibarItemKind`, and existing `OpenOmnibarKeyIntent` variants; no new provider/product data model or key-intent variant was introduced.

## Assertion Changes Flagged
- `src/manifest.test.ts:8`: `expect(packageJson.version).toBe('0.6.60')` — the explicit issue requirement to bump `package.json` to `0.6.61` will require this expected value to change during implementation.
- `src/manifest.test.ts:9`: `expect(manifest.version).toBe('0.6.60')` — the explicit issue requirement to bump `manifest.json` to `0.6.61` will require this expected value to change during implementation.

## Assumptions / Interpretations
- I interpreted “metadata/description when available” as rendering the existing optional `OmnibarItem.subtitle` as muted metadata, rather than adding a new metadata field to `OmnibarItem`.
- I interpreted loading/unavailable/no-match terminal rows as presentation of existing `OmnibarItemKind: 'status'` items and empty result sets, rather than a new status-row data model.
- I interpreted Ctrl+n/Ctrl+p as open-state-only aliases for existing `move-down`/`move-up` intents, with no new intent variants and no closed-state interception.
- I treated the version bump as an implementation task rather than a stubber data-definition change because bumping it now would require changing hard-coded manifest test assertions.

## Notes
- Brownfield search found the relevant processing points in `src/omnibar/keyboard.ts` and `src/omnibar/runtime.ts`; no YouTube provider or plugin-scope data definitions need changes for issue 0013.
- `bun run build` and `bun run test` passed before writing this wish list; current tests still assert version `0.6.60` until the implementation phase performs the required bump.
- No test files were edited by the stubber, so `diff-check` was not run.
