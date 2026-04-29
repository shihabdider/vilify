---
id: issue-0016
status: done
type: feature
mode: AFK
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on: []
remote:
  github: null
---

# Show video-scoped commands only when a live YouTube video is actionable

## What to build

Make YouTube command availability reflect the current page capability. Commands that require a real native video element or a current watch video should not appear on pages where they can only no-op, such as YouTube home, subscriptions, search, or a watch page before a usable video element exists. Navigation and site-wide search/navigation commands may still appear anywhere the YouTube plugin is active.

## Acceptance examples

- [x] Given the omnibar opens on `https://www.youtube.com/` with an empty query, when default results render, then only non-actionable prefix hint rows are visible and video-scoped commands such as transcript search or current-time URL actions are hidden.
- [x] Given the omnibar opens on a YouTube watch page with a current `v` id and a native `HTMLVideoElement`, when the user types a non-empty default query that matches video-scoped commands, then transcript search and any remaining video-scoped actions are visible.
- [x] Given the omnibar opens on a non-watch YouTube page that happens to be supported by the YouTube-wide plugin, when the user searches for “transcript”, then no transcript action appears rather than an item that opens a no-op status mode.
- [x] Given SPA navigation moves from a watch page to a non-watch page or back, when the omnibar is reused, then command availability is recomputed from the live page rather than stale plugin state.

## Data definition impact

Expected new or changed definitions around page capability, for example a small `YouTubePageCapability` or provider-context helper that models current URL, video id, and native video element availability. Provider output should be filtered by capability before query filtering where that produces clearer behavior. If `issue-0019` has removed redundant video shortcut actions first, this issue still applies to remaining video-scoped commands such as transcript search and copy-URL-at-current-time.

## HtDP entry note

Phase 0 problem statement: users should only see commands that can actually apply to the current YouTube page. Keep the YouTube-wide omnibar activation from `issue-0012`, but make individual providers capability-aware. Avoid visible-control choreography and avoid solving no-op commands by displaying more status rows; the default behavior should be to omit commands that are not actionable in the current context.

## Verification

- `bun run build`
- `bun run test`
- Unit tests for provider output on YouTube home, non-watch URLs, watch URLs without a video element, and watch URLs with a native video element.
- SPA regression tests proving provider output uses live document/location state after navigation.
- Manual browser checks on YouTube home, search/results, subscriptions, and a watch page.

## Blocked by

- None - can start immediately.

## HtDP iterations

- Completed in combined HtDP iteration for issues 0014-0019 on 2026-04-29; final preverify passed (`bun run build`, `bun run test` with 121 tests), targeted palette/hints fix landed, and human final verification passed.

## Out of scope

- Disabling the omnibar on non-watch YouTube pages.
- Reintroducing page-specific renderers, drawers, or target-site DOM scraping.
- Deciding the final command inventory for redundant YouTube shortcut actions; see `issue-0019`.
