# Iteration 013: Page-Specific Scrapers

## Problem

Videos and metadata (especially duration) don't display correctly on initial load but fix themselves on re-render.

**Symptoms:**
1. Only a few videos shown initially, all appear on re-render
2. Duration missing on initial load, appears on re-render

## Root Cause Analysis

### Issue 1: Stale Data on SPA Navigation (PRIMARY)

On SPA navigation, `window.ytInitialData` contains **OLD data**:

1. User clicks link, URL changes
2. YouTube fetches fresh data via `/youtubei/v1/browse` or `/youtubei/v1/search`
3. **We read `window.ytInitialData` which still has OLD page data**
4. Fall back to DOM scraping which isn't ready yet → partial results
5. Eventually YouTube updates `ytInitialData` → re-render shows correct data

### Issue 2: Fetch Intercept Not Integrated

A spike was created (`010-scraping-engine/spike/data-intercept.user.js`) that intercepts fetch:

```javascript
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);
  if (url.includes('/youtubei/v1/')) {
    const data = await response.clone().json();
    // This has FRESH data!
  }
  return response;
};
```

**This was never integrated into production code.**

### Issue 3: Recursive Walk (Secondary)

The `extractVideosFromData()` uses a recursive walk that may find partial/scattered data:

```javascript
function walk(obj, depth = 0) {
  // Check for ANY renderer type anywhere in the tree
  if (obj.videoRenderer) { ... }
  if (obj.compactVideoRenderer) { ... }
  if (obj.lockupViewModel) { ... }
  // ...recurse into everything
}
```

### Issue 4: Duration Gap

`lockupViewModel` in ytInitialData often lacks duration. DOM augmentation races with rendering.

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

### Part A: Integrate Fetch Interception

Intercept `/youtubei/v1/` API calls to capture **fresh data** on SPA navigation:

```javascript
// In data/fetch-intercept.js
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);
  const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
  
  if (url?.includes('/youtubei/v1/')) {
    const clone = response.clone();
    const data = await clone.json();
    // Store in DataProvider cache
    dataProvider.updateFromApiResponse(url, data);
  }
  return response;
};
```

**Key endpoints:**
| Endpoint | When | Data |
|----------|------|------|
| `/youtubei/v1/browse` | Home, channel, subscriptions, history | Videos list |
| `/youtubei/v1/search` | Search results | Videos list |
| `/youtubei/v1/next` | Watch page load | Recommendations |
| `/youtubei/v1/player` | Watch page load | Video details |

### Part B: Page-Type-Specific Extractors

Replace recursive walk with extractors that access known paths:

| Page | Path in data | Renderer Type |
|------|-------------|---------------|
| home | `contents.twoColumnBrowseResultsRenderer.tabs[0]...richGridRenderer.contents` | `richItemRenderer` |
| search | `contents.twoColumnSearchResultsRenderer.primaryContents...itemSectionRenderer.contents` | `videoRenderer` |
| channel | `tabs[N]...richGridRenderer.contents` (Videos tab) | `richItemRenderer` / `gridVideoRenderer` |
| playlist | `playlistVideoListRenderer.contents` | `playlistVideoRenderer` |

### New Architecture

```
                    ┌─────────────────────────────┐
                    │      Fetch Intercept        │
                    │  /youtubei/v1/* responses   │
                    └─────────────┬───────────────┘
                                  │ fresh data
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      DataProvider                            │
├─────────────────────────────────────────────────────────────┤
│  cachedData ← API response OR ytInitialData                 │
│  pageType ← detected from URL or data structure             │
├─────────────────────────────────────────────────────────────┤
│  getVideos()                                                │
│    └─ extractVideosForPage(data, pageType)                  │
│        ├─ extractHomeVideos(data)                           │
│        ├─ extractSearchVideos(data)                         │
│        ├─ extractChannelVideos(data)                        │
│        └─ ...                                               │
│    └─ fallback: scrapeDOMVideos()                          │
└─────────────────────────────────────────────────────────────┘
```

**Data priority:**
1. Fresh API response (from fetch intercept)
2. `window.ytInitialData` (for initial page load)
3. DOM scraping (fallback)

## Behaviors

| ID | Behavior | Test |
|----|----------|------|
| B1 | Fetch intercept captures `/youtubei/v1/browse` responses | Navigate home→search, data updates immediately |
| B2 | Fetch intercept captures `/youtubei/v1/search` responses | Search query, results appear without delay |
| B3 | Page-specific extractors access correct data paths | Home extracts from richGridRenderer, search from itemSectionRenderer |
| B4 | Duration shows on first render | All pages show duration immediately |
| B5 | DOM fallback only triggers when API/data extraction fails | Console log shows extraction source |

## Files to Change

| File | Change |
|------|--------|
| `src/sites/youtube/data/fetch-intercept.js` | NEW - intercept fetch, store responses |
| `src/sites/youtube/data/extractors.js` | Add page-specific extractors, deprecate recursive walk |
| `src/sites/youtube/data/index.js` | Use fetch data first, then ytInitialData, then DOM |

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
