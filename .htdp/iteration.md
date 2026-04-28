# Iteration

anchor: 4e6715b6ec7a076b4ea1eb78fc1dd52c1848ef12
started: 2026-04-28T00:00:00Z
stubber-mode: data-definition-driven
workflow-mode: autonomous
language: TypeScript
transparent: true

## Source Artifacts

- PRD: .htdp/prds/prd-0001-omnibar-reset.md
- Issue: .htdp/issues/issue-0013-tui-omnibar-redesign.md
- Architecture review: <none>

## Problem

Redesign the active omnibar UI as a compact Vim/TUI-style fzf/Telescope picker while preserving the current narrow product scope and adding only open-state Ctrl+n/Ctrl+p selection navigation.

## Data Definition Plan

Reuse existing `OmnibarState`, `OmnibarMode`, `OmnibarItem`, and `OmnibarItemKind` definitions. Extend open-state key intent recognition so Ctrl+n maps to the existing move-down intent and Ctrl+p maps to the existing move-up intent. Update omnibar runtime rendering to expose a terminal prompt line, compact structured one-line rows, cursor/kind/label/metadata hooks, inverse-video selected row, status/footer line, and inline terminal empty/status rows. No provider/product data model change is expected.

## Polya Ledger

### Knowns

- Current active runtime creates an omnibar only on YouTube watch pages through `src/content.ts` and the stateless plugin registry.
- Current runtime rendering lives in `src/omnibar/runtime.ts`; key intent mapping lives in `src/omnibar/keyboard.ts`.
- Current rows are generic web command-palette rows with rounded blue selected styling.
- Issue 0013 must be implemented before issue 0012.
- Build/test commands are `bun run build` and `bun run test` via `htdp.json`.

### Constraints

- Do not broaden activation scope in this issue; issue 0012 owns YouTube-wide/SPA activation.
- Do not reintroduce full focus mode, listing UI, drawers, comments UI, Google support, or visible-control automation.
- Closed state must still intercept only `:` on supported pages and must ignore editable targets.
- Keep readable monospace-first TUI styling without novelty/pixel effects.
- Browser visual QA is manual in the user's Chrome extension session, not Playwright.
- Bump both `package.json` and `manifest.json` for this implementation change, then commit and push.

### Unknowns That Matter

- [resolved by user go] Shorts semantics are irrelevant for issue 0013; issue 0012 may support omnibar activation on Shorts without treating Shorts path IDs as transcript/watch video IDs.

### Out of Scope

- YouTube-wide activation and SPA navigation robustness.
- Transcript-mode behavior changes beyond preserving terminal row grammar.
- New Vim bindings besides Ctrl+n and Ctrl+p.
- Bottom command-line mode, full-screen terminal overlay, or Playwright extension visual QA.

### Assumptions

- Existing omnibar data definitions are sufficient; this is primarily DOM/CSS/key-intent work.
- Status-like `OmnibarItemKind` rows can be rendered inline by item kind without introducing a separate status data definition.
- The version bump for issue 0013 should move from 0.6.60 to 0.6.61 unless the implementation discovers a newer version in files.

### Alternatives Considered

- Add a new `OmnibarRowViewModel` data definition — rejected unless the stubber finds it necessary; current `OmnibarItem` carries enough row data.
- Add distinct Ctrl+n/Ctrl+p intent variants — rejected because they should share existing move-up/move-down behavior and bounds.
- Chosen: reuse core omnibar state/types, extend key mapping, and redesign runtime DOM/CSS hooks.

### Decision Log

- 2026-04-28T00:00:00Z — User confirmed the ordered plan and clarified they never watch Shorts, so issue 0012 should not add Shorts transcript/video-id semantics.

### Look Back

- Leave empty for now.
