---
id: issue-0001
status: draft
type: architecture
mode: HITL
source_prd: null
source_architecture: .htdp/architecture/review-0001-render-site-boundaries.md
depends_on: []
remote:
  github: null
---

# Make render a single transaction seam

## What to build

Turn rendering into one explicit transaction owned by the render module. `createApp` should update state and ask a render transaction to apply the frame; it should not directly coordinate status bar, content, palette, drawer, and watch-page post-render DOM ordering.

The first implementation should be behavior-preserving. Complete or replace the existing `ViewTree` / `apply-view` seam so it creates real locality instead of being mostly unused production code.

## Acceptance examples

- [ ] Given a list page state with items, selected index, filter, and sort, when the app renders, then status bar mode, sort label, item count, content list, and selection are applied through one render transaction path.
- [ ] Given the command palette is open, when the app renders, then palette filtering, selection, visibility, and status input focus are applied by the render transaction rather than by ad hoc code in `createApp.render()`.
- [ ] Given a site drawer is open, when the drawer type changes or closes, then the drawer open/close logic is handled in one place and does not require `createApp` to track duplicate drawer-render state.
- [ ] Given Watch Later add or subscribe toggle changes UI immediately after a full watch-page re-render, when the render completes, then the targeted action hint update happens after the new DOM exists and persists visually.
- [ ] Given navigation occurs, when the next frame renders, then previous render cache/diff state is reset in the same render module that owns that cache.

## Data definition impact

Expected new or changed definitions:

- `RenderContext<S>` for state, site state, config, container, and command context.
- Possibly `RenderTransaction`, `RenderPlan`, or `PostRenderEffect` if the implementation chooses to model the watch-page post-render invariant explicitly.
- Narrower `ViewTree`, `StatusBarView`, `ContentView`, and `DrawerView` fields if the existing view definitions do not carry enough information for the transaction.

The implementation should preserve the important domain distinction between full frame rendering and targeted post-render effects.

## HtDP entry note

Phase 0 problem statement: the app has two render designs at once. `view-tree.ts` / `apply-view.ts` describe a state→view→DOM design, but production rendering in `core/index.ts` mostly bypasses it and directly calls layout/palette/drawer functions. Refactor toward a single render transaction without changing user-visible behavior.

Constraints:

- Preserve the watch-page invariant documented in `AGENTS.md`: direct DOM updates must happen after full `render()` because the watch page clears and rebuilds the container.
- Start with characterization tests for current render ordering before moving code.
- Do not combine this with the site adapter typing refactor except where needed to name render context.

## Verification

- `bun run build`
- `bun run test`
- Targeted jsdom tests for list render, palette render, site drawer render, navigation reset, and watch-page post-render hints.
- Manual browser smoke test on YouTube watch page for subscribe hint and Watch Later hint after state changes.
- Optional `npx tsc --noEmit` once local dependencies include `@types/chrome`.

## Blocked by

- Human review of the render interface choice: complete existing `ViewTree` / `applyView`, delete it and make an explicit imperative renderer, or add a render-plan/post-render-effects layer.

## HtDP iterations

- None yet.

## Out of scope

- Rewriting site adapters.
- Changing visual design.
- Fixing data-provider internals.
- Enabling full strict TypeScript checking.
