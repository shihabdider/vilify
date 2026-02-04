# Iteration 030: Watch List

## Summary
Add Watch Later integration: navigate to playlist and add videos from list pages.

## Features

### 1. Navigate to Watch Later (`gw`)
- Key sequence `gw` navigates to `/playlist?list=WL`
- Command palette entry under Navigation

### 2. Add to Watch Later (Arrow-Right)
- Press `→` on selected item in list view
- Triggers YouTube's "Save to Watch later" via triple-dot menu
- Shows status bar message: "Added to Watch Later"
- Shows visual indicator (bookmark icon) on item
- Indicator persists until page refresh

## Data Changes
- `UIState.watchLaterAdded`: `Set<string>` - video IDs added this session

## Functions

### Pure
- `onWatchLaterAdd(state, videoId)` → mark item as added

### I/O
- `addToWatchLater(videoElement)` → click menu → click "Save to Watch later"

## Files Modified
- `src/core/state.js` - add watchLaterAdded to UIState
- `src/core/keyboard.js` - handle ArrowRight on listing pages
- `src/sites/youtube/commands.js` - add gw sequence and command
- `src/sites/youtube/items.js` - show bookmark indicator
