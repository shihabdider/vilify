---
id: issue-0005
status: done
type: reset
mode: HITL
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on: []
remote:
  github: null
---

# Preserve current implementation and reset to a minimal MV3 scaffold

## What to build

Create and push a safety backup of the current implementation, then reset `main` to a minimal Manifest V3 TypeScript extension scaffold for the omnibar product direction.

The backup must preserve the pre-reset code at branch `backup/pre-omnibar-reset` and tag `pre-omnibar-reset-2026-04-27` before any destructive deletion or replacement happens. The active scaffold should have only the two intended runtime surfaces: an isolated-world content script and a main-world YouTube bridge entry. It should not hide, replace, or render over target-site layouts yet.

This is marked HITL because it is the high-blast-radius destructive reset step.

## Acceptance examples

- [ ] Given the current implementation before reset, when the backup step completes, then branch `backup/pre-omnibar-reset` and tag `pre-omnibar-reset-2026-04-27` exist locally and on `origin` and point at the pre-reset commit.
- [ ] Given the reset scaffold is built, when `manifest.json` is inspected, then only the runtime surfaces needed for YouTube v1 remain active and Google/focus-mode/listing/drawer scopes are not active.
- [ ] Given a YouTube watch page after the reset scaffold loads, when the content script initializes, then Vilify does not hide or replace YouTube page content.
- [ ] Given a Google search page or a non-watch YouTube page after the reset scaffold loads, when normal keys are pressed, then Vilify renders no UI and intercepts no keys.
- [ ] Given the reset scaffold is complete, when `bun run build` and `bun run test` run, then both pass with tests rewritten around the minimal scaffold.

## Data definition impact

Expected replacement or removal of legacy data definitions rather than incremental extension:

- Remove active reliance on the old full-site `SiteConfig`/page-app state model, render shell, listing state, drawers, Google state, and ambient keybinding data.
- Introduce only minimal scaffold definitions needed for supported-page detection and bridge bootstrapping.
- Leave richer `OmnibarState`, plugin, mode, provider, item, and action definitions to later issues.

## HtDP entry note

Phase 0 problem statement: Vilify is intentionally changing product shape from a custom site-replacement app to a small omnibar command layer. Before mutating `main`, preserve the current implementation on `backup/pre-omnibar-reset` and `pre-omnibar-reset-2026-04-27`. Then replace the active code with a minimal MV3 TypeScript scaffold that builds, tests, and does nothing user-visible except safely initialize on the future supported surface.

Constraints:

- Perform and verify the backup branch/tag before destructive file deletion or rewrite.
- Do not port the focus-mode shell, custom list rendering, drawers, Google modules, YouTube comments UI, Watch Later/dismiss/subscribe menu flows, or ambient keybinding engine.
- Preserve only small proven ideas for later reuse by copying them deliberately in later issues, not by keeping the old architecture alive.
- Follow repository policy: bump extension version in `package.json` and `manifest.json`, then commit and push the completed change.

## Verification

- `git show-ref backup/pre-omnibar-reset refs/tags/pre-omnibar-reset-2026-04-27`
- `git ls-remote origin refs/heads/backup/pre-omnibar-reset refs/tags/pre-omnibar-reset-2026-04-27`
- `bun run build`
- `bun run test`
- Manifest audit for active matches, permissions, and bundled entry points.
- Manual browser smoke test that YouTube and Google pages are not replaced or hidden by the reset scaffold.

## Blocked by

- None - completed after user requested implementation of all issues.

## HtDP iterations

- 2026-04-27: Minimal MV3 scaffold reset implemented on `main`; backup branch/tag verified before destructive reset.

## Out of scope

- Implementing the omnibar UI.
- Implementing YouTube commands.
- Implementing transcript retrieval or search.
- Preserving legacy feature behavior on `main` after the reset.
