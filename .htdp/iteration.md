# Iteration

anchor: 7817704ea5fd3bc50d436fe16319b6b348c68615
started: 2026-02-10T14:00:00-05:00
mode: data-definition-driven
language: JavaScript
transparent: true

## Problem

Make "add to watch list" (mw key) work on YouTube watch pages. Currently `mw` is only available on listing pages. On the watch page, the videoId should come from the URL/video context instead of the selected list item. Also show 'mw' key hint in the watch page metadata container row.

## Data Definition Plan

No data definition changes. Behavioral changes only:
1. Enable `mw` key sequence on watch page (commands.js)
2. Add `mw` command to getYouTubeCommands() watch section (commands.js)
3. Modify handleAddToWatchLater to fall back to URL videoId on watch page (core/index.js)
4. Add 'mw' hint to renderVideoInfoBox actions row (watch.js)
5. Update tests for mw on watch page (commands.test.js)
6. Version bump (manifest.json, package.json)

## Abbreviated Workflow

Skipping Phase 1 (stubber) and Phase 3 (abstractor) — no type/data changes, no new functions.
Dispatching implementer directly.
