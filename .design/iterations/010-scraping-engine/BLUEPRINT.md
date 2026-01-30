# Blueprint - Iteration 010: Data Layer (Hybrid Scraping)

## Overview

Functions for the hybrid data layer. Primary extraction from `ytInitialData`, with DOM scraping as fallback.

**Dependencies**: Uses types from DATA.md:
- Video, VideoContext, Chapter, DataSource
- InitialDataResult, PageType, RendererType
- DataProvider, ExtractorFn

---

## B1: Parse ytInitialData on page load

### parseInitialData

**Signature**: `parseInitialData : () → InitialDataResult`
**Purpose**: Extract and parse ytInitialData from the current page.
**Where**: `src/sites/youtube/data/initial-data.js`
**Type**: [IO] (reads from DOM)

**Examples**:
```js
// On search results page
parseInitialData()
// => { 
//      ok: true, 
//      data: { contents: { twoColumnSearchResultsRenderer: {...} }, ... },
//      pageType: 'search'
//    }

// On page without ytInitialData
parseInitialData()
// => { ok: false, error: 'ytInitialData not found in page' }

// On watch page
parseInitialData()
// => { 
//      ok: true, 
//      data: { contents: { twoColumnWatchNextResults: {...} }, ... },
//      pageType: 'watch'
//    }
```

---

### parsePlayerResponse

**Signature**: `parsePlayerResponse : () → Object | null`
**Purpose**: Extract and parse ytInitialPlayerResponse (watch page only).
**Where**: `src/sites/youtube/data/initial-data.js`
**Type**: [IO] (reads from DOM)

**Examples**:
```js
// On watch page
parsePlayerResponse()
// => { 
//      videoDetails: { videoId: 'abc', title: '...', author: '...', ... },
//      ...
//    }

// On non-watch page
parsePlayerResponse()
// => null
```

---

### detectPageTypeFromData

**Signature**: `detectPageTypeFromData : Object → PageType`
**Purpose**: Determine page type from ytInitialData structure.
**Where**: `src/sites/youtube/data/initial-data.js`
**Type**: [PURE]

**Examples**:
```js
// Watch page data
detectPageTypeFromData({ contents: { twoColumnWatchNextResults: {} } })
// => 'watch'

// Search results data
detectPageTypeFromData({ contents: { twoColumnSearchResultsRenderer: {} } })
// => 'search'

// Channel page data
detectPageTypeFromData({ contents: { twoColumnBrowseResultsRenderer: { tabs: [...] } } })
// => 'channel'

// Unknown structure
detectPageTypeFromData({ contents: {} })
// => 'other'
```

---

## B2: Extract from videoRenderer (search)

### extractVideoRenderer

**Signature**: `extractVideoRenderer : Object → Video | null`
**Purpose**: Extract Video from a videoRenderer object (search results, feeds).
**Where**: `src/sites/youtube/data/extractors.js`
**Type**: [PURE]

**Examples**:
```js
// Full videoRenderer from search
extractVideoRenderer({
  videoId: 'abc123',
  title: { runs: [{ text: 'Video Title' }] },
  ownerText: { runs: [{ text: 'Channel Name' }] },
  viewCountText: { simpleText: '1M views' },
  publishedTimeText: { simpleText: '2 days ago' },
  lengthText: { simpleText: '10:30' },
  thumbnail: { thumbnails: [{ url: 'https://...' }] }
})
// => {
//      videoId: 'abc123',
//      title: 'Video Title',
//      channel: 'Channel Name',
//      channelUrl: null,
//      views: '1M views',
//      published: '2 days ago',
//      duration: '10:30',
//      thumbnail: 'https://...',
//      _source: 'initialData'
//    }

// Missing videoId
extractVideoRenderer({ title: { runs: [{ text: 'No ID' }] } })
// => null

// Shorts (has reelWatchEndpoint)
extractVideoRenderer({ 
  videoId: 'short1',
  navigationEndpoint: { reelWatchEndpoint: {} }
})
// => null (filtered out)
```

---

## B3: Extract from lockupViewModel (recommendations)

### extractLockupViewModel

**Signature**: `extractLockupViewModel : Object → Video | null`
**Purpose**: Extract Video from new lockupViewModel format (recommendations).
**Where**: `src/sites/youtube/data/extractors.js`
**Type**: [PURE]

**Examples**:
```js
// lockupViewModel from recommendations
extractLockupViewModel({
  contentId: 'xyz789',
  metadata: {
    lockupMetadataViewModel: {
      title: { content: 'Recommended Video' },
      metadata: {
        contentMetadataViewModel: {
          metadataRows: [
            { metadataParts: [{ text: { content: 'Channel' } }] },
            { metadataParts: [
              { text: { content: '500K views' } },
              { text: { content: '1 week ago' } }
            ]}
          ]
        }
      }
    }
  },
  contentImage: {
    collectionThumbnailViewModel: {
      primaryThumbnail: {
        thumbnailViewModel: {
          image: { sources: [{ url: 'https://...' }] }
        }
      }
    }
  }
})
// => {
//      videoId: 'xyz789',
//      title: 'Recommended Video',
//      channel: 'Channel',
//      channelUrl: null,
//      views: '500K views',
//      published: '1 week ago',
//      duration: null,
//      thumbnail: 'https://...',
//      _source: 'initialData'
//    }

// Missing contentId
extractLockupViewModel({ metadata: { ... } })
// => null

// Playlist/Mix (contentId starts with 'RD')
extractLockupViewModel({ contentId: 'RDabc123', ... })
// => null (filtered out)
```

---

## B4: Fallback to DOM when ytInitialData empty

### scrapeDOMVideos

**Signature**: `scrapeDOMVideos : () → Array<Video>`
**Purpose**: Scrape videos from DOM as fallback. Uses existing scraper logic.
**Where**: `src/sites/youtube/data/dom-fallback.js`
**Type**: [IO] (reads from DOM)

**Examples**:
```js
// On page with video elements but no ytInitialData
scrapeDOMVideos()
// => [
//      { videoId: 'a1', title: 'Video 1', ..., _source: 'dom' },
//      { videoId: 'a2', title: 'Video 2', ..., _source: 'dom' },
//    ]

// On page with no videos
scrapeDOMVideos()
// => []
```

**Note**: This wraps/reuses existing `scraper.js` functions but adds `_source: 'dom'`.

---

## B5: Re-parse on SPA navigation

### createNavigationWatcher

**Signature**: `createNavigationWatcher : (callback: () → void) → { stop: () → void }`
**Purpose**: Watch for YouTube SPA navigation and trigger callback.
**Where**: `src/sites/youtube/data/navigation.js`
**Type**: [IO] (sets up observers)

**Examples**:
```js
// Start watching
const watcher = createNavigationWatcher(() => {
  console.log('URL changed, re-parsing data');
  dataProvider.refresh();
});

// Later: stop watching
watcher.stop();
```

**Implementation notes**:
- Uses `MutationObserver` on `<title>` or URL polling
- Debounces rapid changes (YouTube sometimes updates URL multiple times)

---

## B6: Watch page has video context

### extractVideoContext

**Signature**: `extractVideoContext : (initialData: Object, playerResponse: Object | null) → VideoContext | null`
**Purpose**: Build VideoContext from parsed data for watch page.
**Where**: `src/sites/youtube/data/extractors.js`
**Type**: [PURE]

**Examples**:
```js
// With both initialData and playerResponse
extractVideoContext(
  { contents: { twoColumnWatchNextResults: { ... } } },
  { 
    videoDetails: { 
      videoId: 'abc', 
      title: 'Title', 
      author: 'Channel',
      lengthSeconds: '300',
      viewCount: '1000000',
      keywords: ['tag1', 'tag2'],
      shortDescription: 'Description...'
    }
  }
)
// => {
//      videoId: 'abc',
//      title: 'Title',
//      channel: 'Channel',
//      channelUrl: null,
//      description: 'Description...',
//      chapters: [],
//      duration: 300,
//      currentTime: 0,
//      viewCount: '1,000,000',
//      keywords: ['tag1', 'tag2'],
//      isSubscribed: false,
//      paused: true,
//      playbackRate: 1,
//      _source: 'playerResponse'
//    }

// Not a watch page
extractVideoContext({ contents: { twoColumnSearchResultsRenderer: {} } }, null)
// => null
```

---

### extractChaptersFromData

**Signature**: `extractChaptersFromData : Object → Array<Chapter>`
**Purpose**: Extract chapters from ytInitialData engagement panels.
**Where**: `src/sites/youtube/data/extractors.js`
**Type**: [PURE]

**Examples**:
```js
// Data with chapters
extractChaptersFromData({
  engagementPanels: [{
    engagementPanelSectionListRenderer: {
      content: {
        macroMarkersListRenderer: {
          contents: [
            { macroMarkersListItemRenderer: { 
              title: { simpleText: 'Intro' },
              timeRangeStartMillis: 0
            }},
            { macroMarkersListItemRenderer: {
              title: { simpleText: 'Main' },
              timeRangeStartMillis: 60000
            }}
          ]
        }
      }
    }
  }]
})
// => [
//      { title: 'Intro', time: 0, timeText: '0:00', thumbnailUrl: null },
//      { title: 'Main', time: 60, timeText: '1:00', thumbnailUrl: null }
//    ]

// No chapters
extractChaptersFromData({ engagementPanels: [] })
// => []
```

---

## B7: Normalize all formats to Video

### extractVideosFromData

**Signature**: `extractVideosFromData : Object → Array<Video>`
**Purpose**: Recursively find and extract all videos from ytInitialData.
**Where**: `src/sites/youtube/data/extractors.js`
**Type**: [PURE]

**Examples**:
```js
// Search results data
extractVideosFromData({
  contents: {
    twoColumnSearchResultsRenderer: {
      primaryContents: {
        sectionListRenderer: {
          contents: [{
            itemSectionRenderer: {
              contents: [
                { videoRenderer: { videoId: 'a', title: { runs: [{ text: 'A' }] } } },
                { videoRenderer: { videoId: 'b', title: { runs: [{ text: 'B' }] } } },
              ]
            }
          }]
        }
      }
    }
  }
})
// => [
//      { videoId: 'a', title: 'A', ..., _source: 'initialData' },
//      { videoId: 'b', title: 'B', ..., _source: 'initialData' }
//    ]

// Mixed renderer types (home page might have this)
extractVideosFromData({
  contents: {
    items: [
      { videoRenderer: { videoId: 'v1', ... } },
      { lockupViewModel: { contentId: 'v2', ... } },
    ]
  }
})
// => [{ videoId: 'v1', ... }, { videoId: 'v2', ... }]

// Deduplicates by videoId
extractVideosFromData({
  items: [
    { videoRenderer: { videoId: 'dup', ... } },
    { videoRenderer: { videoId: 'dup', ... } },
  ]
})
// => [{ videoId: 'dup', ... }]  // Only one
```

---

## DataProvider (Public API)

### createDataProvider

**Signature**: `createDataProvider : () → DataProvider`
**Purpose**: Create the data provider facade that orchestrates extraction.
**Where**: `src/sites/youtube/data/index.js`
**Type**: [IO] (factory, returned methods have IO)

**Examples**:
```js
const provider = createDataProvider();

// Get videos (tries ytInitialData first, falls back to DOM)
provider.getVideos()
// => [{ videoId: 'a', ... }, { videoId: 'b', ... }]

// Get video context (watch page only)
provider.getVideoContext()
// => { videoId: 'abc', title: 'Video', chapters: [...], ... }
// => null (if not on watch page)

// Get recommendations (watch page only)
provider.getRecommendations()
// => [{ videoId: 'rec1', ... }, ...]

// Force refresh (after SPA navigation)
provider.refresh()
```

---

## Dependency Graph

```
B1 (parseInitialData) ─────┬──► B2 (extractVideoRenderer)
                           │
                           ├──► B3 (extractLockupViewModel)
                           │
                           └──► B6 (extractVideoContext)
                                     │
                                     └──► extractChaptersFromData

B7 (extractVideosFromData) uses B2, B3

B4 (scrapeDOMVideos) ──► fallback when B1 fails

B5 (createNavigationWatcher) ──► triggers refresh

All ──► DataProvider (facade)
```

---

## Execution Plan

| Wave | Behaviors | Functions | Est. Tokens |
|------|-----------|-----------|-------------|
| 1 | B1 | parseInitialData, parsePlayerResponse, detectPageTypeFromData | 4K |
| 2 | B2, B3 | extractVideoRenderer, extractLockupViewModel | 5K |
| 3 | B6 | extractVideoContext, extractChaptersFromData | 4K |
| 4 | B7 | extractVideosFromData | 3K |
| 5 | B4 | scrapeDOMVideos (wrap existing) | 2K |
| 6 | B5 | createNavigationWatcher | 2K |
| 7 | - | createDataProvider, integration | 3K |

**Total estimate**: ~23K tokens

---

## Test Strategy

**Unit tests** (pure functions):
- Each extractor with various input shapes
- Edge cases: missing fields, Shorts filtering, deduplication

**Integration tests** (with sample HTML):
- Save sample YouTube pages, test parseInitialData
- Verify fallback triggers when ytInitialData missing

**Manual verification**:
- Install in browser, verify on search/watch/channel pages
- Check console for `_source` values
