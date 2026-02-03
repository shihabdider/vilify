# Iteration 028: PageState Architecture Fix

## Problem

The current implementation violates the HtDP World Program architecture:

**Current (WRONG):**
```
render() → config.getItems() → DataProvider cache → View
```

**Intended (HtDP):**
```
Event → Pure handler → state.page updated → render(state) → View reads state.page
```

### Specific Issues

1. **View pulls data during render**: `toContentView()` receives items as a parameter from `config.getItems()`, not from `state.page`

2. **DataProvider has hidden cache**: `cachedInitialData`, `cachedContinuationVideos` are state outside of AppState

3. **`onItemsUpdate` is a placeholder**: The function exists but is described as "typically not used"

4. **PageState types defined but unused**: `YouTubePageState`, `WatchPageState`, `ListPageState` are documented but never instantiated

## Goal

Fix the data flow so items are stored in `state.page` and the view reads from state, not from data fetching functions.

## Scope

### In Scope

1. **Implement PageState population**:
   - Navigation event → fetch items → `onPageUpdate(state, pageState)` → new state
   - Content tick → fetch items → `onItemsUpdate(state, items)` → update state.page.videos

2. **Update view functions**:
   - `toContentView(state, config)` reads from `state.page.items` (no items parameter)
   - Remove `config.getItems()` calls from render path

3. **Implement YouTubePageState**:
   - `WatchPageState { type: 'watch', videoContext, recommended, chapters }`
   - `ListPageState { type: 'list', videos }`

4. **Update core event handlers**:
   - `handleNavigation()` creates appropriate PageState
   - `contentTick()` updates `state.page.videos` via pure transition

5. **DataProvider role change**:
   - Becomes a data source called by event handlers only
   - Internal cache is an implementation detail (transparent to architecture)
   - NOT called during render

### Out of Scope

- Removing DataProvider's internal cache (it can keep caching for performance)
- Changing how transcript/chapters are stored (already correct in YouTubeState)
- Other sites (Gmail, etc.) - YouTube only for now

## Success Criteria

- [x] `state.page` contains `YouTubePageState` (not null)
- [x] `toContentView()` reads items from `state.page`, not from parameter
- [x] `config.getItems()` never called in render path
- [x] `onListItemsUpdate()` is the real transition function (renamed from onItemsUpdate)
- [x] All existing tests pass (129 tests)
- [ ] No visual/behavioral regressions (manual testing needed)

## Key Files to Modify

| File | Changes |
|------|---------|
| `src/core/state.js` | Implement `onPageUpdate`, fix `onItemsUpdate` |
| `src/core/view-tree.js` | `toContentView` reads from state.page |
| `src/core/index.js` | Event handlers populate state.page |
| `src/sites/youtube/index.js` | `createPageState()` factory function |

## Architecture After Fix

```
┌─────────────────────────────────────────────────────────────────┐
│  Navigation Event                                               │
│         │                                                        │
│         ▼                                                        │
│  DataProvider.getVideos() ───► onPageUpdate(state, pageState)   │
│                                        │                         │
│                                        ▼                         │
│                    state = { ...state, page: YouTubePageState }  │
│                                        │                         │
│                                        ▼                         │
│                              render(state)                       │
│                                        │                         │
│                                        ▼                         │
│              toContentView(state) reads state.page.videos        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Content Tick Event (polling for new items)                     │
│         │                                                        │
│         ▼                                                        │
│  DataProvider.getVideos() ───► onItemsUpdate(state, items)      │
│                                        │                         │
│                                        ▼                         │
│              state.page.videos = items (merged/updated)          │
│                                        │                         │
│                                        ▼                         │
│                              render(state)                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Risks

1. **Content tick performance**: May need to diff items to avoid unnecessary re-renders
2. **SPA navigation timing**: Must ensure PageState is created after DataProvider has fresh data
3. **Watch page complexity**: VideoContext, recommended, chapters all need population

## Open Questions

1. Should `createPageState()` be on SiteConfig or PageConfig?
2. How to handle loading states (empty page vs loading page)?
3. Should we remove `getItems()` from SiteConfig entirely, or keep for backward compat?
