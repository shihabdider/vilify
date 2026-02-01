# Blueprint - Iteration 013: Page-Specific Scrapers

## Overview

Integrate fetch interception and page-specific extractors to fix stale data on SPA navigation.

## Dependency Graph

```
B1 (fetch intercept browse) ──┬──► B3 (page extractors)
B2 (fetch intercept search) ──┘           │
                                          ▼
                                    B4 (duration)
                                          │
                                          ▼
                                    B5 (fallback)

B6 (comments) - independent
```

## File Changes

### New: `src/sites/youtube/data/fetch-intercept.js`

```javascript
/**
 * Install fetch interceptor for YouTube API calls.
 * Must be called early (before YouTube makes requests).
 * 
 * @param {function} onData - Callback when API data received: (endpoint, data) => void
 * @returns {{ uninstall: () => void }}
 */
export function installFetchIntercept(onData) {
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    
    if (url?.includes('/youtubei/v1/')) {
      try {
        const clone = response.clone();
        const data = await clone.json();
        const endpoint = url.match(/\/youtubei\/v1\/(\w+)/)?.[1] || 'unknown';
        onData(endpoint, data);
      } catch (e) {
        // Not JSON, ignore
      }
    }
    return response;
  };
  
  return {
    uninstall() {
      window.fetch = originalFetch;
    }
  };
}
```

### Modified: `src/sites/youtube/data/extractors.js`

Add page-specific extractors:

```javascript
/**
 * Extract videos for a specific page type from data.
 * Uses targeted paths instead of recursive walk.
 * 
 * @param {Object} data - ytInitialData or API response
 * @param {PageType} pageType - Current page type
 * @returns {Array<Video>}
 */
export function extractVideosForPage(data, pageType) {
  switch (pageType) {
    case 'home':
      return extractHomeVideos(data);
    case 'search':
      return extractSearchVideos(data);
    case 'channel':
      return extractChannelVideos(data);
    case 'subscriptions':
      return extractSubscriptionsVideos(data);
    case 'playlist':
      return extractPlaylistVideos(data);
    case 'history':
    case 'library':
      return extractHistoryVideos(data);
    default:
      // Fallback to recursive for unknown pages
      return extractVideosFromData(data);
  }
}

/**
 * Extract videos from home page data.
 * Path: contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.richGridRenderer.contents
 */
function extractHomeVideos(data) { ... }

/**
 * Extract videos from search results.
 * Path: contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents
 */
function extractSearchVideos(data) { ... }

/**
 * Extract videos from channel page.
 * Find "Videos" tab, then extract from richGridRenderer.
 */
function extractChannelVideos(data) { ... }

// ... etc
```

### Modified: `src/sites/youtube/data/index.js`

```javascript
import { installFetchIntercept } from './fetch-intercept.js';
import { extractVideosForPage } from './extractors.js';

export function createDataProvider() {
  let cachedApiData = null;      // From fetch intercept (freshest)
  let cachedInitialData = null;  // From ytInitialData
  let cachedPageType = null;
  
  // Install fetch intercept
  installFetchIntercept((endpoint, data) => {
    if (endpoint === 'browse' || endpoint === 'search') {
      cachedApiData = data;
      cachedPageType = detectPageTypeFromData(data);
      console.log('[Vilify] Captured API response:', endpoint);
    }
  });
  
  function getVideos() {
    // Priority 1: Fresh API data
    if (cachedApiData) {
      const videos = extractVideosForPage(cachedApiData, cachedPageType);
      if (videos.length > 0) {
        return videos.map(toContentItem);
      }
    }
    
    // Priority 2: ytInitialData
    refresh(); // Parse ytInitialData
    if (cachedInitialData) {
      const videos = extractVideosForPage(cachedInitialData, cachedPageType);
      if (videos.length > 0) {
        return videos.map(toContentItem);
      }
    }
    
    // Priority 3: DOM fallback
    return scrapeDOMVideos();
  }
  
  // Clear API cache on navigation
  function onNavigate() {
    cachedApiData = null;
    refresh();
  }
  
  // ...
}
```

### Modified: `src/sites/youtube/watch.js`

Fix comment loading:

```javascript
// OLD: Only retry if NO comments
const needsRetry = commentsResult.status === 'loading' || 
  (commentsResult.status === 'loaded' && commentsResult.comments.length === 0);

// NEW: Always start observer, let it stabilize
const needsRetry = commentsResult.status !== 'disabled';
```

## Execution Plan

| Wave | Behaviors | Files | Est. |
|------|-----------|-------|------|
| 1 | B1, B2 | fetch-intercept.js, index.js | 4K |
| 2 | B3 | extractors.js | 6K |
| 3 | B4, B5 | index.js (duration augment, logging) | 2K |
| 4 | B6 | watch.js | 2K |

## Wave 1: Fetch Interception

Create `fetch-intercept.js` and wire into DataProvider:

1. Create `src/sites/youtube/data/fetch-intercept.js`
2. Update `src/sites/youtube/data/index.js`:
   - Import and install fetch intercept on creation
   - Store API responses in `cachedApiData`
   - Use API data as first priority in `getVideos()`
   - Clear API cache on navigation

## Wave 2: Page-Specific Extractors

Add targeted extractors to `extractors.js`:

1. `extractHomeVideos(data)` - richGridRenderer path
2. `extractSearchVideos(data)` - sectionListRenderer path  
3. `extractChannelVideos(data)` - find Videos tab
4. `extractSubscriptionsVideos(data)` - sectionListRenderer
5. `extractPlaylistVideos(data)` - playlistVideoListRenderer
6. `extractHistoryVideos(data)` - sectionListRenderer
7. `extractVideosForPage(data, pageType)` - dispatcher

## Wave 3: Duration & Fallback

1. Ensure duration extraction works in page-specific extractors
2. Add console logging for data source (`_source: 'api' | 'initialData' | 'dom'`)
3. Test DOM fallback triggers correctly

## Wave 4: Comments Fix

Update `watch.js`:

1. Change `needsRetry` condition to always start observer
2. Stop observer when:
   - Comments disabled, OR
   - No new comments for 3 consecutive checks
3. Test with videos that have many comments

## Test Plan

| Behavior | Test Steps | Expected |
|----------|------------|----------|
| B1 | Navigate from home to search | Console shows "Captured API response: search" |
| B2 | Navigate from search to home | Console shows "Captured API response: browse" |
| B3 | Load home page fresh | Videos extracted from richGridRenderer |
| B4 | Load any listing page | Duration visible on first render |
| B5 | Block ytInitialData somehow | Falls back to DOM, videos still work |
| B6 | Open video with 50+ comments | All comments load progressively |
