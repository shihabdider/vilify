# Iteration

anchor: 69e88c181bf8471667ae7ddb379d02a3eb1beb05
started: 2026-04-29T17:26:53Z
stubber-mode: compiler-driven
workflow-mode: autonomous
language: TypeScript
transparent: true

## Source Artifacts

- PRD: .htdp/prds/prd-0001-omnibar-reset.md
- Issue: .htdp/issues/issue-0014-scrollable-omnibar-results.md
- Issue: .htdp/issues/issue-0015-wrap-omnibar-row-text.md
- Issue: .htdp/issues/issue-0016-gate-video-scoped-commands.md
- Issue: .htdp/issues/issue-0017-vim-prefix-command-modes.md
- Issue: .htdp/issues/issue-0018-vim-inspired-color-palette.md
- Issue: .htdp/issues/issue-0019-prune-redundant-video-shortcut-actions.md
- Architecture review: <none>

## Problem

Implement the new omnibar polish and scope tickets as one vertical batch: make overflowing results scroll within the picker, wrap long result text, hide video-scoped YouTube commands unless the current page has an actionable watch video/native video, add Vim-style query prefixes (`s/`, `t/`, `n/`), apply a restrained Vim-inspired color palette, and remove playback controls that duplicate default YouTube shortcuts.

## Data Definition Plan

Use a compiler-driven pass because this iteration changes TypeScript data definitions and may remove `OmnibarAction` variants. Add an internal YouTube capability definition derived from `ProviderContext` (current URL, watch video id, native video availability) to gate provider output. Add a query-intent discriminated union for YouTube root-mode parsing: default command filtering, YouTube search (`s/{query}`), transcript search (`t/{query}`), and navigation filtering (`n/{query}`). Restructure YouTube root command data so command scope/category/capability is explicit and provider output is derived from data rather than ad hoc arrays. Remove redundant playback action variants/items where no longer used (`playPause`, `setPlaybackRate`; keep `seek` for transcript absolute seeks and any native-video copy-time behavior that remains). Update runtime view/style definitions and tests for a distinct scrollable results viewport, selection visibility, wrapped row text, and Vim-like theme tokens/kind/status colors. Bump package and manifest version to `0.6.80`.

## Polya Ledger

### Knowns

- Current YouTube root mode includes navigation, playback video actions, copy actions, and transcript mode entry.
- Current transcript mode already accepts a query and returns timestamped search-result items that seek through the native video element.
- Current `ProviderContext` carries live `document` and `location`, and previous issue 0012 made SPA-style live reads important.
- Current runtime CSS uses `white-space: nowrap` and `text-overflow: ellipsis`, which matches the row truncation failure.
- Current results container has `overflow: auto`, but selected-row movement does not explicitly keep the selected row visible.
- Issue 0018 is HITL because final palette acceptance depends on visual judgment.
- Repo convention requires version bumps in package and manifest for changes, then commit and push.

### Constraints

- Closed omnibar state still intercepts only `:` outside editable targets.
- Prefixes are query syntax inside the open omnibar, not ambient multi-key bindings.
- Do not scrape visible YouTube UI, click visible controls, drive menus, or reintroduce drawers/sidebars/page replacement.
- Keep YouTube-wide activation; command availability is provider-level capability gating.
- Keep Google and non-YouTube support out of active v1 scope.
- Build and test hooks are `bun run build` and `bun run test` from `htdp.json`.
- Final human verification should include manual visual review for the Vim-inspired palette and likely browser smoke checks for scroll/wrap/prefix behavior.

### Unknowns That Matter

- [resolved by user go] On non-watch/no-video pages, default command list hides video-scoped transcript/current-time commands; explicit `t/...` may show one concise unavailable status because the user intentionally requested transcript search.
- [resolved by user go] Use a conservative built-in Vim-like palette rather than a named theme clone.

### Out of Scope

- Google support.
- Non-YouTube plugins.
- Shorts transcript/video-id semantics.
- Full Vim command language, mappings, registers, macros, configurable keymaps, or ambient normal-mode bindings while closed.
- Configurable themes.
- Replacing YouTube native keyboard shortcuts or adding legacy playback-control scope.
- Legacy drawers, listing renderers, comments UI, persistent transcript sidebar, or page replacement.

### Assumptions

- Implement all six new issues in one HtDP iteration and one final commit/push.
- Default non-prefix filtering remains the existing command fuzzy filtering.
- `s/{query}` produces a YouTube search navigation item; empty `s/` should not navigate to an empty search and should instead return a concise status/no-result item.
- `n/{query}` filters only navigation actions.
- `t/{query}` searches transcript lines directly on actionable watch pages without first pushing transcript mode.
- Default results should hide transcript and current-time commands on non-watch/no-video pages; explicit `t/` can expose a missing-video status.
- Copy-current-URL remains available because it is not a YouTube playback shortcut.
- Copy-URL-at-current-time remains video-scoped unless implementation evidence shows it should be deferred/removed with playback actions.
- Conservative palette means dark charcoal background, muted foreground, green/cyan/yellow accents, and restrained warning/error colors with high contrast.

### Alternatives Considered

- Gate video-scoped commands by trying execution and returning status/noop — rejected by issue 0016; default behavior should hide commands that cannot apply.
- Hide explicit `t/` on non-watch pages completely — rejected by user confirmation in favor of one concise unavailable status for explicit transcript intent.
- Named theme clone such as gruvbox/solarized — deferred; user accepted a conservative Vim-like palette.
- Add a broad generic provider-intent API to all modes — only introduce if the stubber finds it necessary; expected scope is YouTube root-mode parsing.
- Keep `playPause`/`setPlaybackRate` action variants for possible future use — remove if compiler proves they are dead after pruning; future issues can re-add typed variants if needed.
- Chosen: capability-aware YouTube root provider + parsed query intent + pruned playback commands + runtime layout/theme fixes.

### Decision Log

- 2026-04-29T17:26:53Z — Started fresh iteration for issues 0014-0019 after user chose not to resume old issue 0012 iteration.
- 2026-04-29T17:26:53Z — User confirmed Phase 0 understanding with `go`, including explicit `t/` missing-video status and conservative Vim-like palette assumptions.
- 2026-04-29T17:40:00Z — User accepted stubber-flagged assertion updates for version 0.6.80, wrapped rows, new theme tokens/classes, pruned playback controls, capability-gated commands, and direct `t/` prefix behavior.

### Look Back

- 2026-04-29T18:20:00Z — Human verification item 1 failed: current palette/selected row can produce light background with light text. Target is default Vim dark scheme: black/dark background, bright syntax-like accents, and readable selected rows.
- 2026-04-29T18:20:00Z — Human passed command pruning/capability gating but revised empty-root behavior: opening the default omnibar should show prefix hints rather than command results until the user types a query/prefix.
- 2026-04-29T19:33:47Z — Targeted fix complete: default Vim dark palette applied, selected-row child colors now override kind/status colors late in CSS, empty/whitespace YouTube root queries return noop prefix hints, non-empty filtering/prefix behavior preserved, version bumped to 0.6.82, build/test pass.
