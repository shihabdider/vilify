# Iteration 028: PageState Architecture Fix

**Completed**: 2026-02-01

## Summary

Fixed the HtDP World Program architecture violation where views were pulling data during render instead of reading from state.

## Changes

### Core State (src/core/state.js)

1. **onPageUpdate** - New pure transition to set page state on navigation
2. **onListItemsUpdate** - New pure transition to update list page videos (content polling)
3. **onItemsUpdate** - Deprecated, now delegates to onListItemsUpdate

### View Tree (src/core/view-tree.js)

1. **getPageItems** - New helper to extract items from state.page based on type
2. **toContentView** - Updated to read items from state.page (items parameter deprecated)
3. **toView** - Updated to not pass items in context

### YouTube Site (src/sites/youtube/state.js)

1. **createListPageState** - Factory for ListPageState
2. **createWatchPageState** - Factory for WatchPageState

### YouTube Config (src/sites/youtube/index.js)

1. **createPageState** - Added to SiteConfig to create appropriate PageState
2. **getItems** - Marked as deprecated (still works for backward compat)

### Core Orchestration (src/core/index.js)

1. **init()** - Now calls createPageState after creating app state
2. **handleNavigation()** - Now calls createPageState after waitForContent
3. **startContentPolling()** - Now updates state via onListItemsUpdate
4. **render()** - No longer calls config.getItems() or passes items to toContentView
5. **handleFilterSubmit/handleListNavigation/handleSelect** - Now use getPageItems(state)

## Architecture After Fix

```
Navigation Event
       │
       ▼
config.createPageState() ───► onPageUpdate(state, pageState)
                                     │
                                     ▼
                   state = { ...state, page: YouTubePageState }
                                     │
                                     ▼
                             render(state)
                                     │
                                     ▼
             toContentView(state) reads state.page.videos
```

## Tests Added

- createListPageState: 3 tests
- createWatchPageState: 3 tests
- onPageUpdate: 4 tests
- onListItemsUpdate: 4 tests
- getPageItems: 4 tests
- toContentView (state.page): 1 test

**Total**: 129 tests passing

## Version

0.5.36 → 0.5.37
