# Iteration 022: Pure View - Changelog

## Summary

Separated pure view computation from impure DOM manipulation, following HtDP World model principles.

## Changes

### New Files

| File | Purpose |
|------|---------|
| `src/core/view-tree.js` | Pure view computation functions |
| `src/core/apply-view.js` | I/O functions for applying views to DOM |
| `src/core/view-tree.test.js` | 29 tests for pure view functions |

### Modified Files

| File | Changes |
|------|---------|
| `src/core/index.js` | Import new modules, use toView for status bar and content |
| `.design/DATA.md` | Added ViewTree, StatusBarView, ContentView, DrawerView types |
| `.design/WISHES.md` | Updated with iteration 022 functions |

### New Types (DATA.md)

- **ViewTree**: Complete view state computed from AppState
- **StatusBarView**: Mode badge, input, sort indicator, hints
- **ContentView**: Main content area (listing, custom, or empty)
- **DrawerView**: Drawer state (palette or site-specific)

### New Functions

**Pure (view-tree.js)**:
- `toView` - Compute complete view tree from state
- `toStatusBarView` - Compute status bar view
- `toContentView` - Compute content view with filter/sort applied
- `toDrawerView` - Compute drawer view
- `statusBarViewEqual` - Compare status bar views for diffing
- `contentViewChanged` - Check if content needs re-render
- `drawerViewChanged` - Check if drawer changed

**I/O (apply-view.js)**:
- `applyView` - Apply complete view tree to DOM
- `applyStatusBar` - Apply status bar view
- `applyContent` - Apply content view
- `applyDrawer` - Apply drawer view
- `resetViewState` - Reset view state on navigation

### Integration

The `render()` function in `index.js` now uses:
1. `toStatusBarView()` and `toContentView()` for pure view computation
2. Existing I/O functions for DOM updates (updateStatusBar, renderListing, etc.)

Full integration with `applyView()` deferred due to complex callback dependencies in command palette (getCommands requires callbacks for actions).

## Tests

- 29 new tests in `view-tree.test.js`
- All 98 tests passing

## Version

0.5.28 → 0.5.29

## Next Steps (Iteration 023)

- Big-bang orchestration: Create `init()` entry point, move event listener setup there
- Full applyView integration (refactor getCommands to return pure command descriptors)
