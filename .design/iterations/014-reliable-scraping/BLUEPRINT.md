# Blueprint - Iteration 014: Reliable Scraping Strategy

## Overview

Replace the complex, unreliable scraping system with a simple two-script architecture using Manifest V3's `"world": "MAIN"` feature.

## Behaviors

| ID | Behavior | Acceptance Criteria |
|----|----------|---------------------|
| B1 | Data bridge captures ytInitialData | Console shows "Received ytInitialData" on page load |
| B2 | Data bridge handles SPA navigation | Console shows data on navigation to different pages |
| B3 | Content script receives bridge data | Videos render from bridge data, not DOM scrape |
| B4 | All videos load on initial render | No partial rendering, all videos visible |
| B5 | Loading screen until data ready | User sees loading indicator until data arrives |

## Dependency Graph

```
B1 (capture data) ───► B3 (content receives) ───► B4 (all videos)
        │                                               │
        ▼                                               ▼
B2 (SPA navigation)                              B5 (loading screen)
```

## File Changes

### New: `src/sites/youtube/data-bridge.js`

Runs in MAIN world, captures YouTube data, sends to content script.

```javascript
// Data Bridge - Runs in MAIN world (page context)
// Captures ytInitialData and YouTube events, sends to content script

const BRIDGE_EVENT = '__vilify_data__';

function send(type, data) {
  document.dispatchEvent(new CustomEvent(BRIDGE_EVENT, {
    detail: { type, data }
  }));
}

// Wait for ytInitialData to be available
function waitForInitialData() {
  if (typeof ytInitialData !== 'undefined') {
    send('initialData', ytInitialData);
    return;
  }
  // Poll until available
  const interval = setInterval(() => {
    if (typeof ytInitialData !== 'undefined') {
      send('initialData', ytInitialData);
      clearInterval(interval);
    }
  }, 10);
  // Stop polling after 5 seconds
  setTimeout(() => clearInterval(interval), 5000);
}

// Also capture player response on watch pages
function waitForPlayerResponse() {
  if (typeof ytInitialPlayerResponse !== 'undefined') {
    send('playerResponse', ytInitialPlayerResponse);
  }
}

// Handle YouTube SPA navigation
document.addEventListener('yt-navigate-finish', (event) => {
  console.log('[Vilify Bridge] yt-navigate-finish');
  // Small delay to let YouTube update ytInitialData
  setTimeout(() => {
    if (typeof ytInitialData !== 'undefined') {
      send('initialData', ytInitialData);
    }
    if (typeof ytInitialPlayerResponse !== 'undefined') {
      send('playerResponse', ytInitialPlayerResponse);
    }
  }, 50);
});

// Also listen for page data updates
document.addEventListener('yt-page-data-updated', () => {
  console.log('[Vilify Bridge] yt-page-data-updated');
  if (typeof ytInitialData !== 'undefined') {
    send('initialData', ytInitialData);
  }
});

// Initialize
waitForInitialData();
waitForPlayerResponse();
console.log('[Vilify Bridge] Initialized');
```

### Modified: `manifest.json`

Add data-bridge as MAIN world content script.

```json
{
  "manifest_version": 3,
  "name": "Vilify",
  "version": "0.5.0",
  "content_scripts": [
    {
      "matches": ["*://www.youtube.com/*", "*://youtube.com/*"],
      "js": ["dist/data-bridge.js"],
      "run_at": "document_start",
      "world": "MAIN"
    },
    {
      "matches": ["*://www.youtube.com/*", "*://youtube.com/*"],
      "js": ["dist/content.js"],
      "run_at": "document_start"
    }
  ]
}
```

### Modified: `build.js`

Add data-bridge.js as separate entry point.

### Modified: `src/sites/youtube/data/index.js`

Simplify to only receive from bridge:

```javascript
export function createDataProvider() {
  let cachedInitialData = null;
  let cachedPlayerResponse = null;
  let dataReadyCallbacks = [];
  
  // Listen for bridge events
  document.addEventListener('__vilify_data__', (event) => {
    const { type, data } = event.detail;
    if (type === 'initialData') {
      cachedInitialData = data;
      console.log('[Vilify] Received ytInitialData from bridge');
      notifyDataReady();
    }
    if (type === 'playerResponse') {
      cachedPlayerResponse = data;
      console.log('[Vilify] Received playerResponse from bridge');
    }
  });
  
  function notifyDataReady() {
    for (const cb of dataReadyCallbacks) cb();
    dataReadyCallbacks = [];
  }
  
  function waitForData() {
    if (cachedInitialData) return Promise.resolve();
    return new Promise(resolve => {
      dataReadyCallbacks.push(resolve);
    });
  }
  
  function getVideos() {
    if (!cachedInitialData) return [];
    const pageType = detectPageTypeFromData(cachedInitialData);
    const videos = extractVideosForPage(cachedInitialData, pageType);
    return videos.map(toContentItem);
  }
  
  // ... rest of provider
}
```

### Modified: `src/core/index.js`

Update `waitForContent` to wait for bridge data:

```javascript
async function waitForContent(config, timeout = 5000) {
  const dp = getDataProvider();
  
  // Wait for data from bridge (with timeout)
  await Promise.race([
    dp.waitForData(),
    new Promise(resolve => setTimeout(resolve, timeout))
  ]);
}
```

### Delete/Simplify

- Delete: `src/sites/youtube/data/main-world-bridge.js`
- Delete: `src/sites/youtube/data/fetch-intercept.js`
- Simplify: `src/sites/youtube/data/initial-data.js` (remove script parsing)

## Execution Plan

| Wave | Behaviors | Files | Est. |
|------|-----------|-------|------|
| 1 | B1 | data-bridge.js, manifest.json, build.js | 3K |
| 2 | B2, B3 | data/index.js (simplify) | 3K |
| 3 | B4, B5 | core/index.js (wait for data) | 2K |
| 4 | Cleanup | Delete old files | 1K |

## Wave 1: Data Bridge

1. Create `src/sites/youtube/data-bridge.js`
2. Update `manifest.json` with MAIN world content script
3. Update `build.js` to build data-bridge.js separately
4. Test: load YouTube, check console for "Received ytInitialData"

## Wave 2: Simplified Data Provider

1. Update `src/sites/youtube/data/index.js`:
   - Remove main-world-bridge import
   - Add event listener for bridge events
   - Add `waitForData()` method
   - Remove complex script injection
2. Test: videos should render from bridge data

## Wave 3: Wait for Data

1. Update `src/core/index.js`:
   - `waitForContent()` waits for bridge data
   - Show loading screen until data arrives
2. Test: loading screen shows, then all videos render

## Wave 4: Cleanup

1. Delete `src/sites/youtube/data/main-world-bridge.js`
2. Delete `src/sites/youtube/data/fetch-intercept.js`
3. Simplify `src/sites/youtube/data/initial-data.js`
4. Update `src/content.js` (remove early getDataProvider call)
5. Test: full flow works, no errors

## Test Plan

| Behavior | Test Steps | Expected |
|----------|------------|----------|
| B1 | Load youtube.com fresh | Console: "[Vilify Bridge] Initialized", "[Vilify] Received ytInitialData" |
| B2 | Click on a channel | Console shows new data received |
| B2 | Use search | Console shows search data received |
| B3 | Load home page | Videos render without "Using DOM fallback" |
| B4 | Load any listing page | All videos visible immediately (no partial render) |
| B5 | Hard refresh page | Loading screen shows briefly, then content |
