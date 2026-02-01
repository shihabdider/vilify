# Iteration 013: Page-Specific Scrapers

## Problem

Videos and metadata (especially duration) don't display correctly on initial load but fix themselves on re-render.

**Symptoms:**
1. Only a few videos shown initially, all appear on re-render
2. Duration missing on initial load, appears on re-render

## Root Cause Analysis

The current `extractVideosFromData()` in `data/extractors.js` uses a **recursive walk** that searches the entire `ytInitialData` for ANY video renderer type:

```javascript
function walk(obj, depth = 0) {
  // Check for ANY renderer type anywhere in the tree
  if (obj.videoRenderer) { ... }
  if (obj.compactVideoRenderer) { ... }
  if (obj.lockupViewModel) { ... }
  // ...recurse into everything
}
```

**Problems with this approach:**

1. **Timing sensitivity**: YouTube's SPA loads `ytInitialData` progressively. Recursive walking may find partial data early.

2. **Mixed sources**: On home page, recursive walk might find videos scattered in:
   - Primary content grid (correct)
   - Continuation tokens (stale)
   - Ads/promo sections (wrong)

3. **No page awareness**: Doesn't use page type to know WHERE videos should be in the structure.

4. **Duration gap**: `lockupViewModel` in ytInitialData often lacks duration. The DOM augmentation runs but DOM may not have elements yet on initial load.

## Current Architecture

```
getVideos() [data/index.js]
  └─ refresh() - parse ytInitialData
  └─ extractVideosFromData() - RECURSIVE WALK (problem!)
  └─ augment duration from DOM - race condition
  └─ fallback to scrapeDOMVideos()
```

The DOM scraper in `scraper.js` IS page-aware:
- `scrapeLockupLayout()` - home page
- `scrapeSearchLayout()` - search results
- `scrapeHistoryLayout()` - history/library
- `scrapePlaylistLayout()` - playlists

But the data layer ignores page type and walks everything.

## Solution

Replace recursive extraction with **page-type-specific extractors** that know exactly where videos live in `ytInitialData`.

### YouTube Data Locations by Page Type

| Page | Path in ytInitialData | Renderer Type |
|------|----------------------|---------------|
| home | `contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.richGridRenderer.contents` | `richItemRenderer` → `videoRenderer` |
| search | `contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[].itemSectionRenderer.contents` | `videoRenderer` |
| channel | `contents.twoColumnBrowseResultsRenderer.tabs[N].tabRenderer.content.richGridRenderer.contents` (N = Videos tab) | `richItemRenderer` / `gridVideoRenderer` |
| subscriptions | `contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents` | `richItemRenderer` / `gridVideoRenderer` |
| playlist | `contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[].playlistVideoListRenderer.contents` | `playlistVideoRenderer` |
| history | `contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents` | `videoRenderer` |
| watch | N/A (no listing) | - |

### New Architecture

```
getVideos() [data/index.js]
  └─ refresh() - parse ytInitialData, get pageType
  └─ extractVideosForPage(data, pageType) - PAGE-SPECIFIC extraction
      ├─ extractHomeVideos(data)
      ├─ extractSearchVideos(data)
      ├─ extractChannelVideos(data)
      └─ ... etc
  └─ fallback to scrapeDOMVideos() if empty
```

**Key changes:**
1. Remove `extractVideosFromData()` recursive walker
2. Add `extractVideosForPage(data, pageType)` dispatcher
3. Add page-specific extractors that access known paths
4. Keep DOM fallback but only trigger when data extraction returns empty

## Behaviors

| ID | Behavior | Test |
|----|----------|------|
| B1 | Home page extracts videos from richGridRenderer path | Load home, verify correct count immediately |
| B2 | Search page extracts videos from sectionListRenderer path | Search, verify videos have duration |
| B3 | Channel page extracts videos from Videos tab | Visit channel, verify video list |
| B4 | Duration is extracted from data OR augmented from DOM correctly | All pages show duration on first render |
| B5 | DOM fallback only triggers when data extraction fails | Console log shows extraction source |

## Files to Change

| File | Change |
|------|--------|
| `src/sites/youtube/data/extractors.js` | Add page-specific extractors, deprecate recursive walk |
| `src/sites/youtube/data/index.js` | Call page-specific extractor based on pageType |

## Comment Loading Bug

**Symptom**: Only 2 comments show initially, rest appear on re-render.

**Root Cause** in `watch.js`:

```javascript
// Retry only scheduled if NO comments found
const needsRetry = commentsResult.status === 'loading' || 
  (commentsResult.status === 'loaded' && commentsResult.comments.length === 0);
```

If YouTube loads 2 comments quickly (status='loaded', length=2), the MutationObserver is never started. YouTube continues lazy-loading more comments but we never see them.

**Fix**: Always schedule retry/observer on watch page, regardless of initial comment count. Stop only when:
- Comments are disabled, OR
- No new comments after N retries

| ID | Behavior | Test |
|----|----------|------|
| B6 | Comments observer runs until stable (no new comments for 3+ retries) | Watch video, verify all comments load |

## Out of Scope

- Watch page recommendations (separate flow)
- Infinite scroll / continuation loading
- Shorts filtering (already works)
