# Blueprint - Iteration 012: Metadata Display

## Overview

Functions to implement behaviors B1-B5 for displaying views and duration metadata.

**Dependencies**: Uses types from iteration DATA.md and master DATA.md.

---

## B1: Scraper extracts view count from video items

### scrapeViewCount (HELPER)

**Signature**: `scrapeViewCount : HTMLElement -> String | null`
**Purpose**: Extract view count text from a video item element
**Where**: YouTube (scraper.js)
**Type**: [PURE]

**Examples**:
```js
// Element with view count in metadata
scrapeViewCount(lockupElement) => '1.2M views'

// Element with view count in different format
scrapeViewCount(searchElement) => '523K views'

// Element without view count (live stream, etc.)
scrapeViewCount(element) => null
```

**Template**:
```js
function scrapeViewCount(element) {
  // Inventory: element (HTMLElement)
  // Template: query selectors, return text or null
  const selectors = [/* view count selectors */];
  for (const sel of selectors) {
    const el = element.querySelector(sel);
    if (el?.textContent?.match(/views?$/i)) {
      return el.textContent.trim();
    }
  }
  return null;
}
```

---

### getVideos (MODIFY)

**Signature**: `getVideos : () -> Array<ContentItem>`
**Purpose**: Add viewCount to ContentItem.data when mapping scraped videos
**Where**: YouTube (scraper.js)
**Type**: [PURE]

**Current behavior**: Builds meta string from channel/views/uploadDate but doesn't store views in data.

**Modified behavior**: Store viewCount in data.viewCount field.

**Examples**:
```js
// Before (current)
getVideos() => [{
  ...,
  meta: 'Channel · 1.2M views · 2 days ago',
  data: { videoId: 'abc', channelUrl: '/@ch' }
}]

// After (modified)
getVideos() => [{
  ...,
  meta: 'Channel · 2 days ago',  // views moved to data
  data: { videoId: 'abc', channelUrl: '/@ch', viewCount: '1.2M views', duration: '12:34' }
}]
```

**Template**:
```js
// In the map at end of getVideos():
return {
  ...existing fields...,
  data: {
    videoId: video.videoId,
    channelUrl: video.channelUrl || null,
    viewCount: video.views || null,    // NEW
    duration: video.duration || null,   // NEW (from B2)
  },
};
```

---

## B2: Scraper extracts duration from video items

### scrapeDuration (NEW)

**Signature**: `scrapeDuration : HTMLElement -> String | null`
**Purpose**: Extract duration text from a video item's thumbnail overlay
**Where**: YouTube (scraper.js)
**Type**: [PURE]

**Examples**:
```js
// Video with duration badge
scrapeDuration(videoElement) => '12:34'

// Longer video
scrapeDuration(videoElement) => '1:23:45'

// Live stream (no duration)
scrapeDuration(liveElement) => null

// Premiere (no duration yet)
scrapeDuration(premiereElement) => null
```

**Template**:
```js
function scrapeDuration(element) {
  // Inventory: element (HTMLElement)
  // Template: query duration badge selectors
  const selectors = [
    'ytd-thumbnail-overlay-time-status-renderer #text',
    'span.ytd-thumbnail-overlay-time-status-renderer',
    '#overlays #text',
    '.badge-shape-wiz__text',
  ];
  for (const sel of selectors) {
    const el = element.querySelector(sel);
    const text = el?.textContent?.trim();
    // Match duration pattern: digits and colons
    if (text && text.match(/^\d+:\d{2}(:\d{2})?$/)) {
      return text;
    }
  }
  return null;
}
```

---

### scrapeLockupLayout (MODIFY)

**Signature**: `scrapeLockupLayout : () -> Array<RawVideo>`
**Purpose**: Add duration extraction to lockup layout scraper
**Where**: YouTube (scraper.js)
**Type**: [PURE]

**Modified behavior**: Also extract duration from thumbnail overlay.

**Examples**:
```js
// Before
scrapeLockupLayout() => [{ videoId, title, channel, views, uploadDate }]

// After
scrapeLockupLayout() => [{ videoId, title, channel, views, uploadDate, duration }]
```

**Template**:
```js
// Inside the forEach loop, after extracting other fields:
const duration = scrapeDuration(lockup);

videos.push({
  ...existing fields...,
  duration,
});
```

---

### scrapeSearchLayout (MODIFY)

**Signature**: `scrapeSearchLayout : () -> Array<RawVideo>`
**Purpose**: Add duration extraction to search results scraper
**Where**: YouTube (scraper.js)
**Type**: [PURE]

**Examples**:
```js
scrapeSearchLayout() => [{ videoId, title, channel, views, uploadDate, duration: '5:23' }]
```

---

### scrapeHistoryLayout (MODIFY)

**Signature**: `scrapeHistoryLayout : () -> Array<RawVideo>`
**Purpose**: Add duration extraction to history/library scraper
**Where**: YouTube (scraper.js)
**Type**: [PURE]

---

### scrapePlaylistLayout (MODIFY)

**Signature**: `scrapePlaylistLayout : () -> Array<RawVideo>`
**Purpose**: Add duration extraction to playlist scraper
**Where**: YouTube (scraper.js)
**Type**: [PURE]

---

## B3: Listing items display views and duration on second meta row

### renderYouTubeItem (NEW)

**Signature**: `renderYouTubeItem : (ContentItem, Boolean) -> HTMLElement`
**Purpose**: Custom item renderer with two-column layout: left column has title + two meta rows, right column has subscribe button
**Where**: YouTube (new file or watch.js)
**Type**: [PURE]

**Layout**:
```
┌─────────────────────────────────────────────────────────┬──────────────┐
│ [thumb] Title                                           │ [M]Subscribe │
│         Channel Name · 2 days ago                       │              │
│         1.2M views · 12:34                              │              │
└─────────────────────────────────────────────────────────┴──────────────┘
```

**Examples**:
```js
// Video with all metadata
renderYouTubeItem({
  title: 'Cool Video',
  meta: 'Channel · 2 days ago',
  data: { viewCount: '1.2M views', duration: '12:34', channelUrl: '/@ch' }
}, true)
=> <div class="vilify-item selected">
     <img class="vilify-thumb" .../>
     <div class="vilify-item-info">
       <div class="vilify-item-title">Cool Video</div>
       <div class="vilify-item-meta">Channel · 2 days ago</div>
       <div class="vilify-item-meta2">1.2M views · 12:34</div>
     </div>
     <div class="vilify-item-actions">
       <button class="vilify-subscribe-btn">[M] Subscribe</button>
     </div>
   </div>

// Video with missing metadata
renderYouTubeItem({
  title: 'Live Stream',
  meta: 'Channel · LIVE',
  data: { viewCount: null, duration: null }
}, false)
=> <div class="vilify-item">
     ...
     <div class="vilify-item-meta2"></div>  // empty or hidden
     ...
   </div>

// Video with only views (no duration - live)
renderYouTubeItem({
  title: 'Stream',
  meta: 'Channel',
  data: { viewCount: '5K watching', duration: null }
}, false)
=> // Shows "5K watching" on second row
```

**Template**:
```js
function renderYouTubeItem(item, isSelected) {
  // Inventory: item (ContentItem), isSelected (Boolean)
  // Template: Compound - access item.title, item.meta, item.data.viewCount, item.data.duration
  
  const classes = isSelected ? 'vilify-item selected' : 'vilify-item';
  
  // Build second meta row from viewCount and duration
  const meta2Parts = [];
  if (item.data?.viewCount) meta2Parts.push(item.data.viewCount);
  if (item.data?.duration) meta2Parts.push(item.data.duration);
  const meta2Text = meta2Parts.join(' · ');
  
  // Left column: thumbnail + info
  const infoChildren = [
    el('div', { class: 'vilify-item-title' }, [item.title]),
    el('div', { class: 'vilify-item-meta' }, [item.meta || '']),
  ];
  if (meta2Text) {
    infoChildren.push(el('div', { class: 'vilify-item-meta2' }, [meta2Text]));
  }
  
  // Right column: subscribe button
  const subscribeBtn = el('button', { class: 'vilify-subscribe-btn' }, ['[M] Subscribe']);
  
  return el('div', { class: classes }, [
    el('img', { class: 'vilify-thumb', src: item.thumbnail }),
    el('div', { class: 'vilify-item-info' }, infoChildren),
    el('div', { class: 'vilify-item-actions' }, [subscribeBtn]),
  ]);
}
```

---

### CSS for renderYouTubeItem (NEW)

**Where**: YouTube (styles or layout)

```css
.vilify-item-meta2 {
  color: var(--txt-3);
  font-size: 12px;
  margin-top: 2px;
}

.vilify-item-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 16px;
}
```

---

## B4: Watch page shows upload date

### getVideoContext (MODIFY - upload date fix)

**Signature**: `getVideoContext : () -> VideoContext | null`
**Purpose**: Ensure uploadDate is reliably scraped
**Where**: YouTube (scraper.js)
**Type**: [PURE]

**Current issue**: uploadDate scraping may fail on some videos.

**Fix**: Add more selector fallbacks and handle "Premiered" / "Streamed" dates.

**Examples**:
```js
// Standard video
getVideoContext() => { ..., uploadDate: 'Jan 15, 2024', ... }

// Recent video
getVideoContext() => { ..., uploadDate: '2 days ago', ... }

// Premiered video
getVideoContext() => { ..., uploadDate: 'Premiered Jan 10, 2024', ... }
```

**Template**:
```js
// Existing code already handles this, but add additional selectors:
const dateSelectors = [
  '#info-strings yt-formatted-string',
  '#info span',
  'ytd-watch-metadata #info-container yt-formatted-string',
  '#description-inner #info-strings span',
  // Fallback: description area date
  'ytd-video-primary-info-renderer #info-strings yt-formatted-string',
];
```

---

## B5: Watch page shows view count and duration

### getWatchPageViews (NEW)

**Signature**: `getWatchPageViews : () -> String | null`
**Purpose**: Scrape view count from watch page
**Where**: YouTube (scraper.js)
**Type**: [PURE]

**Examples**:
```js
// Standard video
getWatchPageViews() => '1,234,567 views'

// Short form
getWatchPageViews() => '1.2M views'

// Live stream
getWatchPageViews() => '5,432 watching now'

// Not found
getWatchPageViews() => null
```

**Template**:
```js
function getWatchPageViews() {
  // Inventory: DOM elements
  // Template: query selectors for view count
  const selectors = [
    '#info-strings yt-formatted-string',
    'ytd-watch-metadata #info span',
    'ytd-video-primary-info-renderer #info-text',
  ];
  
  for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      const text = el.textContent?.trim();
      if (text?.match(/views?$|watching/i)) {
        return text;
      }
    }
  }
  return null;
}
```

---

### formatDuration (NEW)

**Signature**: `formatDuration : Number -> String`
**Purpose**: Convert duration in seconds to human-readable format
**Where**: YouTube (scraper.js or watch.js)
**Type**: [PURE]

**Examples**:
```js
formatDuration(65) => '1:05'
formatDuration(3661) => '1:01:01'
formatDuration(0) => '0:00'
formatDuration(3600) => '1:00:00'
formatDuration(45) => '0:45'
```

**Template**:
```js
function formatDuration(seconds) {
  // Inventory: seconds (Number)
  // Template: Interval - compute hours/minutes/seconds
  if (!seconds || seconds <= 0) return '0:00';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}
```

---

### getVideoContext (MODIFY - views)

**Purpose**: Use getWatchPageViews() to populate views field
**Where**: YouTube (scraper.js)

**Current**: `views: null, // Not easily accessible`

**Modified**:
```js
// Get views
const views = getWatchPageViews();

return {
  ...,
  views,  // Now populated
  ...,
};
```

---

### renderVideoInfoBox (MODIFY)

**Signature**: `renderVideoInfoBox : (VideoContext, YouTubeState) -> HTMLElement`
**Purpose**: Add views and duration display below upload date
**Where**: YouTube (watch.js)
**Type**: [PURE]

**Current layout**:
```
Title
Channel                    [Subscribe]
Upload date
Hints
```

**New layout**:
```
Title
Channel                    [Subscribe]
Upload date
1.2M views · 12:34
Hints
```

**Examples**:
```js
// Video with all metadata
renderVideoInfoBox({ 
  title: 'Video', 
  channelName: 'Channel',
  uploadDate: '2 days ago',
  views: '1.2M views',
  duration: 180
}, state)
=> // Shows "1.2M views · 3:00" below upload date

// Video without views (private/unlisted)
renderVideoInfoBox({
  title: 'Video',
  uploadDate: '2 days ago',
  views: null,
  duration: 180
}, state)
=> // Shows only "3:00" or hides row entirely
```

**Template**:
```js
// After uploadDateEl, before hints:
const statsparts = [];
if (ctx.views) statsParts.push(ctx.views);
if (ctx.duration) statsParts.push(formatDuration(ctx.duration));
const statsText = statsParts.join(' · ');

const statsEl = statsText
  ? el('div', { class: 'vilify-watch-stats' }, [statsText])
  : null;

// Add to children array
if (statsEl) children.push(statsEl);
```

---

### CSS for watch page stats (NEW)

**Where**: YouTube (watch.js WATCH_CSS)

```css
.vilify-watch-stats {
  color: var(--txt-3);
  font-size: 12px;
  margin-bottom: 10px;
}
```

---

## Summary

| Function | Behavior | Where | Type | Status |
|----------|----------|-------|------|--------|
| scrapeDuration | B2 | YouTube/scraper.js | PURE | NEW |
| scrapeLockupLayout | B2 | YouTube/scraper.js | PURE | MODIFY |
| scrapeSearchLayout | B2 | YouTube/scraper.js | PURE | MODIFY |
| scrapeHistoryLayout | B2 | YouTube/scraper.js | PURE | MODIFY |
| scrapePlaylistLayout | B2 | YouTube/scraper.js | PURE | MODIFY |
| getVideos | B1, B2 | YouTube/scraper.js | PURE | MODIFY |
| renderYouTubeItem | B3 | YouTube/items.js (new) | PURE | NEW |
| getWatchPageViews | B4, B5 | YouTube/scraper.js | PURE | NEW |
| formatDuration | B5 | YouTube/scraper.js | PURE | NEW |
| getVideoContext | B4, B5 | YouTube/scraper.js | PURE | MODIFY |
| renderVideoInfoBox | B5 | YouTube/watch.js | PURE | MODIFY |

## File Changes

| File | Changes |
|------|---------|
| `src/sites/youtube/scraper.js` | Add scrapeDuration, getWatchPageViews, formatDuration; modify all scrape*Layout functions and getVideos, getVideoContext |
| `src/sites/youtube/watch.js` | Modify renderVideoInfoBox, add CSS for .vilify-watch-stats |
| `src/sites/youtube/items.js` (NEW) | Add renderYouTubeItem with two-column layout |
| `src/core/layout.js` | Add CSS for .vilify-item-meta2, .vilify-item-actions |
