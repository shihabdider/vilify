# Iteration 025: YouTube Cleanup

Remove legacy state compatibility and clean up YouTube-specific code.

## Goal

Now that iterations 021-024 established the new nested AppState structure, remove all backward compatibility code that supported the old flat state format.

## Changes

### 1. Remove Legacy State Support (src/core/state.js)

Remove dual-access patterns like:
```javascript
// Before
const drawer = state.ui?.drawer ?? state.drawerState ?? null;

// After  
const drawer = state.ui.drawer;
```

Functions to clean:
- `getMode()` - remove `state.drawerState`, `state.localFilterActive`, `state.siteSearchActive`
- `getVisibleItems()` - remove `state.localFilterActive`, `state.localFilterQuery`, `state.sortField`, `state.sortDirection`
- `onNavigate()` - remove `state.selectedIdx`
- `onFilterToggle()` - remove legacy branch
- `onFilterChange()` - remove legacy branch
- `onDrawerOpen()` - remove legacy branch
- `onDrawerClose()` - remove legacy branch
- `onKeySeqUpdate()` - remove legacy branch
- `onKeySeqClear()` - remove legacy branch
- `onSortChange()` - remove legacy branch
- `onShowMessage()` - remove legacy branch
- `onBoundaryHit()` - remove legacy branch
- `onClearFlash()` - remove legacy branch
- `onSearchToggle()` - remove legacy branch
- `onSearchChange()` - remove legacy branch
- `onPaletteQueryChange()` - remove legacy branch
- `onPaletteNavigate()` - remove legacy branch
- `onUrlChange()` - remove legacy branch

Also remove:
- `createLegacyState()` - no longer needed

### 2. Simplify YouTube Code (src/sites/youtube/index.js)

Remove dual-access in `renderYouTubeListing()`:
```javascript
// Before
const filterActive = state.ui?.filterActive ?? state.localFilterActive ?? false;

// After
const filterActive = state.ui.filterActive;
```

### 3. Update Tests

Update any tests that use the old flat state format to use the new nested format.

## Out of Scope

- Transcript fetching pattern (complex, separate iteration)
- Module-level watchRetryTimer (needs careful handling)

## Version

0.5.31 → 0.5.32
