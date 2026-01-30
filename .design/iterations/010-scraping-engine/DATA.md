# Data Definitions - Iteration 010: Data Layer (Hybrid Scraping)

## Overview

Types for the hybrid data layer that extracts video data from YouTube's embedded JSON (`ytInitialData`) with DOM scraping as fallback.

**Key design decisions:**
- `Video` is the normalized output format (all extractors produce this)
- `_source` field tracks where data came from (for debugging)
- Extractors are pure functions: `RendererObject → Video | null`
- DataProvider is the public API for the rest of the app

---

## Video (UPDATED)

A Video is a structure:
- videoId: String
- title: String
- channel: String | null
- channelUrl: String | null
- views: String | null
- published: String | null
- duration: String | null
- thumbnail: String | null
- _source: DataSource

**Where**: `src/sites/youtube/data/`

**Examples**:
```js
// From videoRenderer (search results)
{
  videoId: 'dQw4w9WgXcQ',
  title: 'Rick Astley - Never Gonna Give You Up',
  channel: 'Rick Astley',
  channelUrl: '/@RickAstley',
  views: '1.7B views',
  published: '15 years ago',
  duration: '3:33',
  thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
  _source: 'initialData',
}

// From lockupViewModel (recommendations)
{
  videoId: 'E9de-cmycx8',
  title: 'Rick Astley - Together Forever',
  channel: 'Rick Astley',
  channelUrl: null,  // Not always available in lockup
  views: '25M views',
  published: '6 years ago',
  duration: '3:24',
  thumbnail: 'https://i.ytimg.com/vi/E9de-cmycx8/hqdefault.jpg',
  _source: 'initialData',
}

// From DOM fallback
{
  videoId: 'abc123',
  title: 'Some Video',
  channel: 'Some Channel',
  channelUrl: '/@SomeChannel',
  views: null,
  published: null,
  duration: null,
  thumbnail: 'https://i.ytimg.com/vi/abc123/mqdefault.jpg',
  _source: 'dom',
}
```

---

## DataSource (NEW)

A DataSource is one of:
- `'initialData'` - Extracted from ytInitialData JSON
- `'playerResponse'` - Extracted from ytInitialPlayerResponse
- `'dom'` - Scraped from DOM (fallback)

**Where**: `src/sites/youtube/data/`

**Purpose**: Track provenance for debugging and metrics.

---

## VideoContext (UPDATED)

A VideoContext is a structure:
- videoId: String
- title: String | null
- channel: String | null
- channelUrl: String | null
- description: String
- chapters: Array\<Chapter\>
- duration: Number (seconds)
- currentTime: Number (seconds)
- viewCount: String | null
- keywords: Array\<String\>
- isSubscribed: Boolean
- paused: Boolean
- playbackRate: Number
- _source: DataSource

**Where**: `src/sites/youtube/data/`

**Examples**:
```js
// From ytInitialPlayerResponse
{
  videoId: 'dQw4w9WgXcQ',
  title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
  channel: 'Rick Astley',
  channelUrl: '/@RickAstley',
  description: 'The official video for "Never Gonna Give You Up" by Rick Astley...',
  chapters: [
    { title: 'Intro', time: 0, timeText: '0:00' },
    { title: 'Verse 1', time: 18, timeText: '0:18' },
  ],
  duration: 213,
  currentTime: 45.2,
  viewCount: '1,737,468,696',
  keywords: ['rick astley', 'Never Gonna Give You Up', 'nggyu'],
  isSubscribed: false,
  paused: true,
  playbackRate: 1,
  _source: 'playerResponse',
}
```

---

## Chapter (UNCHANGED)

A Chapter is a structure:
- title: String
- time: Number (seconds)
- timeText: String
- thumbnailUrl: String | null

**Where**: `src/sites/youtube/data/`

**Examples**:
```js
{ title: 'Introduction', time: 0, timeText: '0:00', thumbnailUrl: null }
{ title: 'Main Topic', time: 120, timeText: '2:00', thumbnailUrl: 'https://...' }
```

---

## InitialDataResult (NEW)

An InitialDataResult is one of:
- `{ ok: true, data: Object, pageType: PageType }`
- `{ ok: false, error: String }`

**Where**: `src/sites/youtube/data/initial-data.js`

**Purpose**: Result type for parsing ytInitialData, handling parse failures gracefully.

**Examples**:
```js
// Success
{
  ok: true,
  data: { contents: { ... }, responseContext: { ... } },
  pageType: 'search',
}

// Failure
{
  ok: false,
  error: 'ytInitialData not found in page',
}
```

---

## PageType (UNCHANGED)

A PageType is one of:
- `'watch'` - Video player page
- `'home'` - YouTube home
- `'search'` - Search results
- `'channel'` - Channel page
- `'playlist'` - Playlist page
- `'subscriptions'` - Subscriptions feed
- `'history'` - Watch history
- `'library'` - Library page
- `'shorts'` - YouTube Shorts
- `'other'` - Any other page

**Where**: `src/sites/youtube/data/`

---

## RendererType (NEW)

A RendererType is one of:
- `'videoRenderer'` - Search results, some feeds
- `'compactVideoRenderer'` - Old recommendations sidebar
- `'gridVideoRenderer'` - Channel video grids
- `'playlistVideoRenderer'` - Playlist items
- `'richItemRenderer'` - Home feed items (wraps videoRenderer)
- `'lockupViewModel'` - New recommendations format
- `'unknown'` - Unrecognized renderer

**Where**: `src/sites/youtube/data/extractors.js`

**Purpose**: Discriminate between YouTube's various video renderer formats.

---

## DataProvider (NEW)

A DataProvider is a structure:
- getVideos: `() → Array<Video>`
- getVideoContext: `() → VideoContext | null`
- getRecommendations: `() → Array<Video>`
- refresh: `() → void`

**Where**: `src/sites/youtube/data/index.js`

**Purpose**: Public API for the data layer. Abstracts extraction strategy.

**Examples**:
```js
import { dataProvider } from './data';

// Get videos for current page
const videos = dataProvider.getVideos();

// Get watch page context
const context = dataProvider.getVideoContext();
if (context) {
  console.log(`Playing: ${context.title}`);
  console.log(`Chapters: ${context.chapters.length}`);
}

// Force re-extraction (after SPA navigation)
dataProvider.refresh();
```

---

## ExtractorFn (NEW)

An ExtractorFn is a function: `Object → Video | null`

**Where**: `src/sites/youtube/data/extractors.js`

**Purpose**: Type signature for renderer extractors. Each renderer type has its own extractor.

**Examples**:
```js
// Extractor for videoRenderer
function extractVideoRenderer(renderer) {
  const videoId = renderer.videoId;
  if (!videoId) return null;
  
  return {
    videoId,
    title: renderer.title?.runs?.[0]?.text ?? null,
    channel: renderer.ownerText?.runs?.[0]?.text ?? null,
    // ...
    _source: 'initialData',
  };
}

// Extractor for lockupViewModel
function extractLockupViewModel(model) {
  const videoId = model.contentId;
  if (!videoId) return null;
  
  const meta = model.metadata?.lockupMetadataViewModel;
  return {
    videoId,
    title: meta?.title?.content ?? null,
    // ...
    _source: 'initialData',
  };
}
```

---

## Type Relationships

```
                    ┌─────────────┐
                    │ DataProvider│ (public API)
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
   │ getVideos() │  │getVideoCtx()│  │getRecommend │
   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
          │                │                │
          ▼                ▼                ▼
   ┌─────────────────────────────────────────────┐
   │              InitialDataResult              │
   │  → extractors (per RendererType)            │
   │  → normalize to Video / VideoContext        │
   └─────────────────────────────────────────────┘
                           │
                           ▼ (fallback)
                    ┌─────────────┐
                    │ DOM Scraper │
                    └─────────────┘
```

---

## Migration Notes

The existing `scraper.js` exports these functions that will be replaced:
- `getVideos()` → `dataProvider.getVideos()`
- `getVideoContext()` → `dataProvider.getVideoContext()`
- `getRecommendedVideos()` → `dataProvider.getRecommendations()`
- `getChapters()` → Part of `VideoContext.chapters`
- `getDescription()` → Part of `VideoContext.description`

The existing `ContentItem` type used by the UI will need a thin adapter or the UI updated to use `Video` directly.
