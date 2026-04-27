---
id: issue-0004
status: draft
type: architecture
mode: HITL
source_prd: null
source_architecture: .htdp/architecture/review-0001-render-site-boundaries.md
depends_on:
  - issue-0001
remote:
  github: null
---

# Reify watch comments window state

## What to build

Make watch-page comment pagination a named data definition with pure transitions, then have `watch.ts` use that data definition for DOM rendering and lazy-load boundaries.

Today `YouTubeState` has comment pagination fields, but the effective comment window lives in module globals inside `watch.ts`. This issue should align the data definition with the behavior so comment pagination can be tested without relying on hidden module state.

## Acceptance examples

- [ ] Given a comment window at the first rendered range, when advancing and more comments are already loaded, then the next window starts at the previous end and records history for back navigation.
- [ ] Given a comment window at the end of loaded comments, when advancing, then the pure transition returns an explicit `load-more` outcome rather than silently mutating DOM state.
- [ ] Given a comment window with history, when moving back, then the previous start index is restored and the visible range is recomputed.
- [ ] Given no comments or disabled comments, when rendering comments, then the status message is deterministic and pagination controls are hidden.
- [ ] Given `renderWatchPage()` re-renders for the same video, when comments are paged, then pagination state is reset only when the intended data definition says it should reset.

## Data definition impact

Expected new or changed definitions:

- `CommentWindow`
- `CommentWindowAction` or explicit return variants such as `{ type: 'window'; window: CommentWindow } | { type: 'load-more'; window: CommentWindow }`
- Pure functions such as `nextCommentWindow`, `prevCommentWindow`, and `clampCommentWindow`
- Possible cleanup/removal of `commentPage` and `commentPageStarts` from `YouTubeState` if they are not the right representation

## HtDP entry note

Phase 0 problem statement: watch comment pagination behavior is implemented through module globals (`commentStartIdx`, `commentEndIdx`, `commentStartHistory`) while `YouTubeState` contains unused pagination fields. Add pure examples for the comment-window domain, then adapt the existing DOM renderer to use those transitions.

Constraints:

- Preserve current keyboard behavior for `C-f` / `C-b`.
- Keep YouTube lazy-load triggering as I/O; only the window transition logic should become pure.
- Prefer doing this after the render transaction issue, because current comment functions intentionally mutate DOM without calling app render.

## Verification

- `bun run build`
- `bun run test`
- New pure tests for comment-window transitions.
- Existing `watch-types.test.ts`, `watch.test.ts`, and `commands.test.ts` should keep passing.
- Manual YouTube watch-page smoke test for comments loading, next page, previous page, disabled comments, and no-comments states.

## Blocked by

- Human review of whether comment pagination belongs in `YouTubeState` or in a watch-page-local state object managed by the render transaction.

## HtDP iterations

- None yet.

## Out of scope

- Redesigning comment scraping.
- Changing comment visual layout.
- Refactoring the whole watch-page renderer.
