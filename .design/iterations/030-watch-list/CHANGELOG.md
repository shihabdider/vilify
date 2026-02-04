# Changelog - Iteration 030: Watch List

## Summary
Added Watch Later integration for YouTube: navigate to Watch Later playlist and add videos from list pages.

## Changes

### New Features

1. **Navigate to Watch Later (`gw`)**
   - Key sequence `gw` navigates to `/playlist?list=WL`
   - Added "Watch Later" command to Navigation group in command palette

2. **Add to Watch Later (Arrow-Right)**
   - Press `→` on selected item in listing pages to add video to Watch Later
   - Uses YouTube's internal API (`/youtubei/v1/browse/edit_playlist`)
   - Shows "Added to Watch Later" message in status bar
   - Shows visual indicator (`🕐 WL` badge) on thumbnail of added items
   - Indicator persists until page refresh (session-scoped tracking)

### Implementation Notes

The Watch Later API call is made via the data-bridge which runs in MAIN world:
- Gets API context from `ytcfg` (client version, visitor data, etc.)
- Generates SAPISIDHASH authorization header
- POSTs to `/youtubei/v1/browse/edit_playlist` with `playlistId: "WL"`
- Content script communicates via CustomEvents

### Files Modified

| File | Change |
|------|--------|
| `src/core/state.js` | Added `watchLaterAdded: Set<string>` to UIState, added `onWatchLaterAdd()` |
| `src/core/state.test.js` | Added tests for `onWatchLaterAdd()` |
| `src/core/keyboard.js` | Handle `ArrowRight` on listing pages |
| `src/core/index.js` | Added `handleAddToWatchLater()`, pass callback to keyboard handler |
| `src/sites/youtube/commands.js` | Added `gw` sequence, Watch Later command, `addToWatchLater()` I/O function |
| `src/sites/youtube/index.js` | Added `addToWatchLater` to config, pass `watchLaterAdded` to item renderer |
| `src/sites/youtube/items.js` | Added `watchLaterAdded` parameter, render badge on added items |
| `src/sites/youtube/data-bridge.js` | Added API call functions: `getApiContext()`, `getAuthHeader()`, `addToWatchLater()` |
| `package.json` | Version bump to 0.5.51 |
| `manifest.json` | Version bump to 0.5.51 |

### New Functions

| Function | Type | Location |
|----------|------|----------|
| `onWatchLaterAdd(state, videoId)` | PURE | `src/core/state.js` |
| `addToWatchLater(videoId)` | I/O | `src/sites/youtube/commands.js` |
| `getApiContext()` | PURE | `src/sites/youtube/data-bridge.js` |
| `getAuthHeader()` | I/O | `src/sites/youtube/data-bridge.js` |
| `addToWatchLater(videoId)` | I/O | `src/sites/youtube/data-bridge.js` (MAIN world) |

## Tests
- 132 tests passing (3 new tests for `onWatchLaterAdd`)
