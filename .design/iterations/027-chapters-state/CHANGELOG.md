# Iteration 027: Chapters State

## Summary

Converted chapters fetching to proper state transitions, mirroring the transcript pattern from iteration 026.

## Changes

### State Transitions (src/sites/youtube/state.js)
- Added `onChaptersRequest(siteState, videoId)` - Mark chapters as loading
- Added `onChaptersLoad(siteState, result)` - Store fetched chapters (validates videoId)
- Added `onChaptersClear(siteState)` - Clear chapters state

### Tests (src/sites/youtube/state.test.js)
- Added 10 tests for chapters state transitions:
  - `onChaptersRequest`: 4 tests (loading from null, reset for different video, no-op when same, preserves other fields)
  - `onChaptersLoad`: 4 tests (stores result, ignores stale, handles empty, ignores without request)
  - `onChaptersClear`: 2 tests (clears state, preserves other fields)

### YouTube State (src/sites/youtube/index.js)
- `createYouTubeState()` now initializes `chapters: null`
- `watchPageConfig.onEnter` fetches chapters via state transitions (parallel with transcript)

### Chapters Drawer (src/sites/youtube/drawers/chapters.js)
- `createChapterDrawer(chaptersResult)` now receives data from state
- `getChapterDrawer(chaptersResult)` takes chaptersResult parameter
- Drawer caches and recreates when chapters data changes

### Drawer Handler (src/sites/youtube/drawers/index.js)
- `getYouTubeDrawerHandler` passes `siteState.chapters` to chapters drawer
- Returns null if chapters not loaded (same pattern as transcript)

### Documentation
- Added `ChaptersResult` type to DATA.md
- Added chapters field to YouTubeState in DATA.md
- Added pure transitions table for ChaptersResult
- Updated WISHES.md with new functions
- Updated ANALYSIS.md (iteration complete)
- Updated PROJECT.md (iteration listed)

## Test Results

```
110 tests passing
- 20 YouTube state tests (10 transcript + 10 chapters)
- 61 core state tests
- 29 view-tree tests
```

## Version

0.5.33 → 0.5.34
