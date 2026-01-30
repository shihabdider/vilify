# Implementation - Iteration 010: Data Layer (Hybrid Scraping)

Generated from BLUEPRINT.md on Jan 28, 2026.

## Dependency Graph

```
B1 (parseInitialData) ─────┬──► B2 (extractVideoRenderer)
                           │
                           ├──► B3 (extractLockupViewModel)
                           │
                           └──► B6 (extractVideoContext)

B7 (extractVideosFromData) uses B2, B3

B4 (scrapeDOMVideos) ──► fallback when B1 fails

B5 (createNavigationWatcher) ──► triggers refresh

All ──► DataProvider (facade)
```

## Execution Plan

| Wave | Behaviors | Functions | Est. Tokens | Status |
|------|-----------|-----------|-------------|--------|
| 1 | B1 | parseInitialData, parsePlayerResponse, detectPageTypeFromData | 4K | ✓ Done |
| 2 | B2, B3 | extractVideoRenderer, extractLockupViewModel | 5K | ✓ Done |
| 3 | B6 | extractVideoContext, extractChaptersFromData | 4K | ✓ Done |
| 4 | B7 | extractVideosFromData | 3K | ✓ Done |
| 5 | B4 | scrapeDOMVideos (wrap existing) | 2K | ✓ Done |
| 6 | B5 | createNavigationWatcher | 2K | ✓ Done |
| 7 | - | createDataProvider, integration | 3K | ✓ Done |

## Behavior Status

| ID | Behavior | Status | Tested | Notes |
|----|----------|--------|--------|-------|
| B1 | Parse ytInitialData on page load | ✓ Done | | initial-data.js |
| B2 | Extract from videoRenderer | ✓ Done | | extractors.js |
| B3 | Extract from lockupViewModel | ✓ Done | | extractors.js |
| B4 | Fallback to DOM when empty | ✓ Done | | dom-fallback.js |
| B5 | Re-parse on SPA navigation | ✓ Done | | navigation.js |
| B6 | Watch page has video context | ✓ Done | | extractors.js |
| B7 | Normalize all formats to Video | ✓ Done | | extractors.js |

## Files Created

```
src/sites/youtube/data/
├── index.js           # DataProvider facade + singleton
├── initial-data.js    # ytInitialData parser
├── extractors.js      # Renderer → Video extractors (all formats)
├── dom-fallback.js    # DOM scraping fallback
└── navigation.js      # SPA navigation watcher
```

## Wave Log

### Wave 1-7 - Jan 28, 2026

Implemented all behaviors in single pass:

1. **initial-data.js** (B1)
   - `parseInitialData()` - parses ytInitialData from script tags or window
   - `parsePlayerResponse()` - parses ytInitialPlayerResponse
   - `detectPageTypeFromData()` - determines page type from data structure

2. **extractors.js** (B2, B3, B6, B7)
   - `extractVideoRenderer()` - search results
   - `extractCompactVideoRenderer()` - old recommendations
   - `extractGridVideoRenderer()` - channel grids
   - `extractPlaylistVideoRenderer()` - playlists
   - `extractRichItemRenderer()` - home feed
   - `extractLockupViewModel()` - new recommendations format
   - `extractChaptersFromData()` - chapters from engagement panels
   - `extractVideoContext()` - watch page context
   - `extractVideosFromData()` - recursive extraction

3. **dom-fallback.js** (B4)
   - Wraps existing scraper.js with `_source: 'dom'` tagging

4. **navigation.js** (B5)
   - `createNavigationWatcher()` - multi-method detection (popstate, yt-navigate-finish, title observer, polling)

5. **index.js** (DataProvider)
   - `createDataProvider()` - factory with caching
   - `getDataProvider()` - singleton accessor
   - Auto-starts navigation watching

## Build Verification

```
✓ npm run build passes
  dist/content.js: 116.7kb
```

## Next Steps

1. **Integration Testing** - Test in browser on various page types
2. **Wire up to UI** - Replace scraper.js calls with dataProvider
3. **Measure improvement** - Compare reliability before/after

## Self-Reflection Checkpoint

- [x] All functions implemented (no `throw new Error("not implemented")`)
- [x] Build passes
- [x] _source field tracks data provenance
- [x] DOM fallback preserves existing behavior
- [x] No YouTube-specific code in core modules
