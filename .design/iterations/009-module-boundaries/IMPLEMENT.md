# Implementation - Iteration 009: Module Boundaries

Generated from BRAINSTORM.md on Jan 28, 2026.

## Dependency Graph

```
B1 ──┬── B3 ──── B4 ──┬── B7
     │                │
     ├── B5 ──────────┤
     │                │
     └── B6 ──────────┘

B2 ─────────────────────┘
```

## Execution Plan

| Wave | Behaviors | Est. Tokens | Subagents | Status |
|------|-----------|-------------|-----------|--------|
| 1 | B1, B2, B3, B4 | 10K | 1 | ✓ Complete |
| 2 | B5, B6 | 4K | 1 | ✓ Implemented |
| 3 | B5, B6 bugs | 2K | 1 | ✓ Fixed in v0.2.8/v0.2.9 |
| 4 | B7 | - | - | ✓ Pass |

## Behavior Status

| ID | Behavior | Status | Tested | Notes |
|----|----------|--------|--------|-------|
| B1 | Core modals.js has no YouTube code | ✓ Done | ✓ Pass | grep returns only comment |
| B2 | Core state.js has no YouTube code | ✓ Done | ✓ Pass | No YouTube refs |
| B3 | Core keyboard.js has no hardcoded modes | ✓ Done | ✓ Pass | No 'chapters'/'description' strings |
| B4 | Core index.js has no YouTube concepts | ✓ Done | ✓ Pass | No getChapters/seekToChapter |
| B5 | YouTube chapter drawer works | ✓ Done | ✓ Pass | Fixed in v0.2.9 |
| B6 | YouTube description drawer works | ✓ Done | ✓ Pass | Fixed in v0.2.9 |
| B7 | All existing functionality preserved | ✓ Done | ✓ Pass | |

## Self-Reflection Checkpoint

- [x] No `throw new Error("not implemented")` remaining
- [x] TODOs are documented notes for future iteration (palette state migration)
- [x] Core code doesn't import from sites/*
- [x] Site-specific logic moved to src/sites/youtube/drawers/
- [x] Build passes

## Wave Log

### Wave 1 - Jan 28, 2026
- Behaviors: B1, B2, B3, B4
- Result: ✓ All pass
- Changes:
  - Created src/core/drawer.js with createListDrawer, createContentDrawer
  - Created src/sites/youtube/drawers/ with chapters.js, description.js
  - Removed YouTube code from core/modals.js
  - Removed createYouTubeState from core/state.js
  - Renamed modalState → drawerState throughout
  - Updated keyboard.js to delegate drawer keys
  - Updated index.js to use getDrawerHandler from config
  - Updated YouTube commands to use openDrawer/closeDrawer

### Wave 2 - Jan 28, 2026
- Behaviors: B5, B6
- Result: ✓ Implemented (manual test required)
- Changes:
  - YouTube drawers use core's createListDrawer and createContentDrawer
  - Chapter drawer: src/sites/youtube/drawers/chapters.js
  - Description drawer: src/sites/youtube/drawers/description.js
  - YouTubeConfig exports getDrawerHandler

### Wave 3 - v0.2.8 Bug Fixes
- Behaviors: B5, B6 bug fixes
- Issues found during manual test:
  1. **Double hints**: Both drawer footer and status bar showed shortcut hints
  2. **Chapters drawer couldn't close with Escape**: keyboard.js wasn't letting Escape through
  3. **Description drawer couldn't scroll with j/k**: Same keyboard passthrough issue
- Fixes applied:
  - Removed footer hints from drawer.js (status bar handles hints)
  - Added `isSiteDrawerInput` check in keyboard.js to let Escape/j/k/arrows through
  - Updated layout.js to show correct hints per drawer type (scroll vs navigate)

### Wave 3.5 - v0.2.9 Bug Fixes
- Issues found:
  1. **j/k passing through to chapters input**: User couldn't type 'j' or 'k' in filter
  2. **Arrow down stuck at second item**: Double key handling + render() resetting selectedIdx
  3. **Description scrolling didn't work**: render() was resetting scrollTop
- Fixes applied:
  - keyboard.js: Only pass Escape/Enter through for site drawer inputs (not j/k/arrows)
  - index.js: Only call render() when drawer closes in handleSiteDrawerKey
  - index.js: Added `lastRenderedDrawer` tracking to avoid re-rendering open drawers
  - index.js: Reset drawer state on navigation

### Wave 4 - Pending Manual Testing
- Behaviors: B7
- Test: Full integration test in browser
- Steps:
  1. Load extension in Chrome
  2. Go to YouTube watch page
  3. Press `f` to open chapter drawer (B5)
  4. Navigate with arrows, filter, press Enter to jump
  5. Press `zo` to open description drawer (B6)
  6. Scroll with j/k, press Escape to close
  7. Verify palette still works (`:`)
  8. Verify navigation still works (j/k/Enter)
  9. Verify all other keybindings work
