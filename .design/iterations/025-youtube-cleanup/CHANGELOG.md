# Iteration 025: YouTube Cleanup - Changelog

## Summary

Removed legacy flat state compatibility code from core and YouTube modules. All code now uses only the new nested AppState structure (`state.ui.xxx` instead of `state.xxx`).

## Changes

### Removed

| Item | File |
|------|------|
| `createLegacyState()` | src/core/state.js |
| Legacy state tests | src/core/state.test.js |

### Simplified (removed dual-access patterns)

| File | Functions Changed |
|------|-------------------|
| `src/core/state.js` | `getMode`, `getVisibleItems`, `onNavigate`, `onFilterToggle`, `onFilterChange`, `onDrawerOpen`, `onDrawerClose`, `onKeySeqUpdate`, `onKeySeqClear`, `onSortChange`, `onShowMessage`, `onBoundaryHit`, `onClearFlash`, `onSearchToggle`, `onSearchChange`, `onPaletteQueryChange`, `onPaletteNavigate`, `onUrlChange`, `onSelect` |
| `src/core/palette.js` | `openPalette`, `closePalette` |
| `src/core/drawer.js` | `createListDrawer.onKey`, `createContentDrawer.onKey`, `handleDrawerKey` |
| `src/core/keyboard.js` | `handler` (removed legacy state access) |
| `src/core/view-tree.js` | `toDrawerView`, `toView` |
| `src/core/index.js` | drawer key handling |
| `src/sites/youtube/index.js` | `renderYouTubeListing` |

### Pattern Changes

**Before (dual-access):**
```javascript
const drawer = state.ui?.drawer ?? state.drawerState ?? null;
const filterActive = state.ui?.filterActive ?? state.localFilterActive ?? false;
```

**After (nested only):**
```javascript
const { drawer, filterActive } = state.ui;
```

## Tests

- 90 tests pass (was 98, removed 8 legacy tests)
- Build successful (181.8kb content.js)

## Version

0.5.31 → 0.5.32
