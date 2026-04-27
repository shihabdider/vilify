# Iteration

anchor: 6f6952a1151950fc877e2c9beb5fde7f58d992f7
started: 2026-04-27T16:30:00-04:00
stubber-mode: data-definition-driven
workflow-mode: autonomous
language: TypeScript
transparent: true

## Source Artifacts

- PRD: .htdp/prds/prd-0001-omnibar-reset.md
- Issues:
  - .htdp/issues/issue-0005-backup-reset-scaffold.md
  - .htdp/issues/issue-0006-omnibar-opener-primitive.md
  - .htdp/issues/issue-0007-plugin-registry-youtube-shell.md
  - .htdp/issues/issue-0008-youtube-default-mode-actions.md
  - .htdp/issues/issue-0009-youtube-bridge-protocol.md
  - .htdp/issues/issue-0010-transcript-mode-provider.md
  - .htdp/issues/issue-0011-retire-legacy-scope-docs.md
- Architecture review: .htdp/architecture/review-0001-render-site-boundaries.md (historical/superseded)

## Problem

Implement the omnibar reset PRD by replacing the active broad site-replacement extension with a focused MV3 TypeScript extension. The final active scope is a single custom UI primitive (omnibar) on YouTube watch pages, URL navigation, native video actions, and transcript search through structured YouTube protocols/data. Google support, focus-mode layout replacement, listing UI, drawers, comments, Watch Later/dismiss/subscribe menu flows, and ambient multi-key bindings are retired from active scope.

## Data Definition Plan

Greenfield/data-definition-driven reset. Define the new runtime around:

- `OmnibarState`: open/query/selected index/mode stack.
- `SitePlugin`, `OmnibarMode`, `OmnibarProvider`, and `ProviderContext`: stateless plugin declarations and provider-owned data.
- `OmnibarItem`, `OmnibarItemKind`, `OmnibarAction`, and action execution adapters: typed command execution with platform APIs.
- `YouTubeBridgeRequest` / `YouTubeBridgeResponse`, `VideoMetadata`, `TranscriptLine`, `TranscriptResult`, `CaptionTrack`: YouTube-specific structured bridge protocol.
- `TranscriptProviderState` / `TranscriptLoadState`: provider-owned per-video cache.

## Polya Ledger

### Knowns

- Backup branch `backup/pre-omnibar-reset` and tag `pre-omnibar-reset-2026-04-27` already exist locally and on `origin`, dereferencing to commit `41d48410083f9fb4a1a676136ce4d3b168a5bf57`.
- Current branch is `main`; current head at iteration start is `6f6952a1151950fc877e2c9beb5fde7f58d992f7`.
- Build/test commands are `bun run build` and `bun run test`.
- `htdp.mode` is configured as `autonomous`; `htdp.transparent` is true.

### Constraints

- Closed state intercepts only `:` on supported pages and ignores editable targets.
- Supported page scope is YouTube watch pages only for v1.
- Use web-platform APIs and structured YouTube protocol/data only.
- Do not click visible target-site controls, drive hidden menus, scrape visible UI text/layout, or replace target-site layout.
- Follow repo policy: bump `package.json` and `manifest.json` for implementation changes; commit and push after each issue/change.

### Unknowns That Matter

- [resolved by PRD/issues as v1 default] Escape in nested modes pops to the previous mode; Escape at root closes the omnibar.
- [resolved by PRD/issues as v1 default] Transcript mode entry is via a selectable default-mode item.
- [resolved by PRD/issues as v1 default] Copy title is omitted unless structured metadata is available.
- [resolved by PRD/issues as v1 default] Omnibar visual styling is minimal and unobtrusive.

### Out of Scope

- Google support.
- Full-site focus mode and page/listing replacement.
- YouTube comments UI, drawers, persistent transcript sidebar.
- Watch Later/dismiss/subscribe mutations.
- Captions/theater/fullscreen commands through visible-control clicking.
- External transcript backend service.

### Assumptions

- Existing backup branch/tag are sufficient preservation points because they contain the pre-reset implementation; no force-updating remote tag is needed.
- The reset can replace old tests with new scope tests rather than preserving legacy behavioral tests.
- Issue 0008 and issue 0009 may be worked in parallel after the plugin shell if their files remain disjoint except for stable shared types.

### Alternatives Considered

- Keep old architecture and progressively disable features — rejected because it preserves brittle seams and contradicts greenfield reset direction.
- Force-update backup tag to current head — rejected to avoid rewriting an existing remote tag; code preservation requirement is already met.
- Add a broad `SiteRuntime` — rejected for v1; provider-owned state is sufficient until shared mutable resources are proven.
- Chosen: greenfield reset with small generic omnibar runtime, stateless plugins, typed platform actions, YouTube-specific bridge, and provider-owned transcript cache.

### Decision Log

- 2026-04-27T16:30:00-04:00 — User requested implementation of all local issues in dependency order with HtDP parallelization where reasonable; treat as confirmation to proceed with the destructive reset after verifying backup branch/tag exists.

### Look Back

- Leave empty until implementation verification.
