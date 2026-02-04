# YouTube DOM Scraping Reference

**Last verified:** February 1, 2026

This documents the actual DOM structure and selectors for scraping YouTube. YouTube's DOM changes frequently, so this should be re-verified periodically.

---

## Video Listings (Home, Search, Subscriptions, etc.)

YouTube uses different renderers depending on page type:

### Page Type → Renderer Mapping

| Page | Primary Renderer | Secondary |
|------|-----------------|-----------|
| Home | `ytd-rich-item-renderer` | `yt-lockup-view-model` (inside) |
| Search | `ytd-video-renderer` | - |
| Subscriptions | `ytd-rich-item-renderer` | - |
| Channel Videos | `ytd-rich-item-renderer` | `ytd-grid-video-renderer` |
| Playlist | `ytd-playlist-video-renderer` | - |

### New Layout (Home Page)

```
ytd-rich-item-renderer
  └── yt-lockup-view-model
        ├── a.yt-lockup-view-model__content-image        → thumbnail link (href = /watch?v=...)
        │     └── yt-thumbnail-view-model
        │           └── img                              → thumbnail image
        └── yt-lockup-metadata-view-model
              ├── a.yt-lockup-metadata-view-model__title → title link
              │     └── span.yt-core-attributed-string   → title text
              └── yt-content-metadata-view-model
                    └── .yt-content-metadata-view-model__metadata-row
                          └── span.yt-content-metadata-view-model__metadata-text (×3)
                                ├── [1] channel name (with nested <a>)
                                ├── [2] view count ("3.4M views")
                                └── [3] upload date ("3 days ago")
```

**Selectors:**
```javascript
const SELECTORS_HOME = {
  container: 'ytd-rich-item-renderer',
  lockup: 'yt-lockup-view-model',
  thumbnailLink: 'a.yt-lockup-view-model__content-image',
  titleLink: 'a.yt-lockup-metadata-view-model__title',
  titleText: 'span.yt-core-attributed-string',
  channelLink: '.yt-content-metadata-view-model__metadata-row a',
  metadataText: '.yt-content-metadata-view-model__metadata-text'
};
```

**Extraction:**
```javascript
function getVideosFromHome() {
  const videos = [];
  document.querySelectorAll('ytd-rich-item-renderer').forEach(item => {
    const lockup = item.querySelector('yt-lockup-view-model');
    if (!lockup) return;
    
    const titleLink = lockup.querySelector('a.yt-lockup-metadata-view-model__title');
    const href = titleLink?.href;
    const videoId = href?.match(/\/watch\?v=([^&]+)/)?.[1];
    if (!videoId) return;
    
    const title = titleLink?.textContent?.trim();
    const channelLink = lockup.querySelector('.yt-content-metadata-view-model__metadata-row a');
    const channel = channelLink?.textContent?.trim();
    const metaTexts = lockup.querySelectorAll('.yt-content-metadata-view-model__metadata-text');
    
    // metaTexts[0] = channel, [1] = views, [2] = date
    const views = metaTexts[1]?.textContent?.trim();
    const uploadDate = metaTexts[2]?.textContent?.trim();
    
    videos.push({ videoId, title, channel, views, uploadDate });
  });
  return videos;
}
```

### Search Results Layout

```
ytd-video-renderer
  ├── a#video-title                    → title link (href = /watch?v=...)
  │     └── yt-formatted-string        → title text
  ├── ytd-channel-name
  │     └── a                          → channel link
  └── #metadata-line
        └── span (×2)                  → views, upload date
```

**Selectors:**
```javascript
const SELECTORS_SEARCH = {
  container: 'ytd-video-renderer',
  titleLink: 'a#video-title, #video-title-link',
  channelLink: 'ytd-channel-name a, #channel-name a',
  metadata: '#metadata-line span, .inline-metadata-item'
};
```

### Extracting Video ID

```javascript
function extractVideoId(url) {
  if (!url) return null;
  const match = url.match(/\/watch\?v=([^&]+)/);
  return match ? match[1] : null;
}

// Thumbnail URL pattern
function getThumbnailUrl(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}
```

---

## Watch Page

### Video Metadata

```
ytd-watch-metadata
  └── #title
        └── h1
              └── yt-formatted-string     → video title

ytd-video-owner-renderer
  ├── #channel-name
  │     └── a                             → channel name + link
  └── ytd-subscribe-button-renderer
        └── button                        → subscribe button (aria-label for state)
```

**Selectors:**
```javascript
const SELECTORS_WATCH = {
  title: [
    'h1.ytd-watch-metadata yt-formatted-string',
    'h1.ytd-watch-metadata',
    '#title h1'
  ],
  channel: [
    'ytd-video-owner-renderer #channel-name a',
    '#owner #channel-name a'
  ],
  subscribeButton: 'ytd-subscribe-button-renderer button',
  description: [
    'ytd-text-inline-expander#description-inline-expander',
    '#description-inner'
  ],
  infoStrings: '#info-strings yt-formatted-string, #info span'
};
```

**Subscribe State:**
```javascript
const subBtn = document.querySelector('ytd-subscribe-button-renderer button');
const label = subBtn?.getAttribute('aria-label') || '';
const isSubscribed = label.toLowerCase().includes('unsubscribe');
```

### Video Element

```javascript
const video = document.querySelector('video.html5-main-video');
// Properties: currentTime, duration, paused, playbackRate, volume, muted
```

---

## Chapters

Chapters appear in multiple locations:

### 1. Progress Bar (limited info)
```
.ytp-chapters-container
  └── .ytp-chapter-hover-container      → one per chapter
        └── .ytp-chapter-title          → title (sometimes)
        └── [data-start-time]           → time in seconds
```

### 2. Description Panel (best source)
```
ytd-macro-markers-list-item-renderer
  ├── #thumbnail
  │     └── img                          → chapter thumbnail
  ├── h4                                 → chapter title
  └── #time                              → timestamp text ("2:34")
```

**Selectors:**
```javascript
const SELECTORS_CHAPTERS = {
  container: 'ytd-macro-markers-list-item-renderer',
  title: 'h4, #title, #details h4',
  time: '#time, #details #time',
  thumbnail: '#thumbnail img, yt-img-shadow img'
};
```

**Extraction:**
```javascript
function getChapters() {
  const chapters = [];
  const seen = new Set();
  
  document.querySelectorAll('ytd-macro-markers-list-item-renderer').forEach(item => {
    const title = item.querySelector('h4, #title')?.textContent?.trim();
    const timeText = item.querySelector('#time')?.textContent?.trim();
    if (!title || !timeText) return;
    
    // Dedupe (YouTube often duplicates)
    const key = `${title}::${timeText}`;
    if (seen.has(key)) return;
    seen.add(key);
    
    const time = parseTimestamp(timeText);
    const thumb = item.querySelector('#thumbnail img')?.src;
    
    chapters.push({ title, time, timeText, thumbnailUrl: thumb });
  });
  
  return chapters;
}

function parseTimestamp(str) {
  const parts = str.split(':').map(p => parseInt(p, 10));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}
```

---

## Watch Page Recommendations (Sidebar)

YouTube uses different renderers for the sidebar recommendations:

### Renderer Mapping (Updated Feb 2026)

| Layout | Renderer | Notes |
|--------|----------|-------|
| New (2024+) | `yt-lockup-view-model` | Now default on most watch pages |
| Old | `ytd-compact-video-renderer` | Still used in some cases |
| Mixed | `ytd-rich-item-renderer` | May contain either format |

### New Layout (yt-lockup-view-model)

```
#secondary / #related / ytd-watch-next-secondary-results-renderer
  └── yt-lockup-view-model
        ├── a.yt-lockup-metadata-view-model-wiz__title   → title link
        │     OR a.yt-lockup-metadata-view-model__title
        └── .yt-content-metadata-view-model-wiz__metadata-row
              └── a                                       → channel link
              └── .yt-content-metadata-view-model-wiz__metadata-text (×3)
                    ├── [1] channel name
                    ├── [2] view count
                    └── [3] upload date
```

**Selectors:**
```javascript
const SELECTORS_RECOMMENDATIONS_NEW = {
  container: '#secondary yt-lockup-view-model, #related yt-lockup-view-model, ytd-watch-next-secondary-results-renderer yt-lockup-view-model',
  titleLink: 'a.yt-lockup-metadata-view-model-wiz__title, a.yt-lockup-metadata-view-model__title',
  channelLink: '.yt-content-metadata-view-model-wiz__metadata-row a, .yt-content-metadata-view-model__metadata-row a',
  metadataText: '.yt-content-metadata-view-model-wiz__metadata-text, .yt-content-metadata-view-model__metadata-text'
};
```

### Old Layout (ytd-compact-video-renderer)

```
#secondary / #related
  └── ytd-compact-video-renderer
        ├── a#thumbnail                    → thumbnail link
        ├── #video-title                   → title
        ├── #channel-name                  → channel
        └── #metadata-line
              └── span (×2)                → views, upload date
```

**Selectors:**
```javascript
const SELECTORS_RECOMMENDATIONS_OLD = {
  container: '#secondary ytd-compact-video-renderer, #related ytd-compact-video-renderer',
  titleLink: '#video-title, .title',
  thumbnail: 'a#thumbnail, a.yt-simple-endpoint',
  channel: '#channel-name, .ytd-channel-name',
  metadata: '#metadata-line, .metadata'
};
```

---

## Comments

Comments are **lazy-loaded** - they don't exist in DOM until you scroll to them.

### Triggering Comment Load

```javascript
function triggerCommentLoad() {
  const commentsSection = document.querySelector('#comments, ytd-comments');
  if (commentsSection) {
    commentsSection.scrollIntoView({ behavior: 'instant', block: 'start' });
    // Dispatch scroll events to trigger YouTube's loading
    [document, window].forEach(target => {
      target.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
  }
}
```

### Comment Structure

```
ytd-comment-thread-renderer (or ytd-comment-view-model)
  └── ytd-comment-renderer
        ├── #author-text
        │     └── span                    → author name
        └── #content-text
              └── yt-attributed-string    → comment text
```

**Selectors:**
```javascript
const SELECTORS_COMMENTS = {
  thread: 'ytd-comment-thread-renderer, ytd-comment-view-model',
  author: '#author-text, #author-text span, a#author-text',
  content: '#content-text, yt-attributed-string#content-text'
};
```

**Extraction:**
```javascript
function getComments() {
  const comments = [];
  const seen = new Set();
  
  document.querySelectorAll('ytd-comment-thread-renderer, ytd-comment-view-model').forEach(el => {
    const author = el.querySelector('#author-text, #author-text span')?.textContent?.trim();
    const text = el.querySelector('#content-text')?.textContent?.trim();
    if (!author || !text) return;
    
    // Dedupe (YouTube duplicates in DOM)
    const key = `${author}::${text.substring(0, 50)}`;
    if (seen.has(key)) return;
    seen.add(key);
    
    comments.push({ author, text });
  });
  
  return comments;
}
```

### Comment Status Detection

```javascript
function getCommentStatus() {
  const commentsSection = document.querySelector('#comments, ytd-comments');
  if (!commentsSection) return 'loading';
  
  // Check if comments are disabled
  const disabledMessage = commentsSection.querySelector('ytd-message-renderer');
  if (disabledMessage?.textContent?.includes('turned off')) return 'disabled';
  
  // Check if still loading
  const spinner = commentsSection.querySelector('tp-yt-paper-spinner, #spinner');
  if (spinner) return 'loading';
  
  return 'loaded';
}
```

---

## Page Type Detection

```javascript
function getPageType() {
  const path = location.pathname;
  const params = new URLSearchParams(location.search);
  
  if (path === '/watch' && params.get('v')) return 'watch';
  if (path === '/' || path === '') return 'home';
  if (path === '/results') return 'search';
  if (path.startsWith('/@') || path.startsWith('/channel/') || path.startsWith('/c/')) return 'channel';
  if (path === '/playlist') return 'playlist';
  if (path === '/feed/subscriptions') return 'subscriptions';
  if (path === '/feed/history') return 'history';
  if (path === '/feed/library') return 'library';
  if (path.startsWith('/shorts/')) return 'shorts';
  
  return 'other';
}
```

---

## Notes & Gotchas

1. **Deduplication required** - YouTube often duplicates elements in the DOM, especially comments and chapters. Always dedupe by content.

2. **Lazy loading everywhere** - Comments, related videos, and continuation content are all lazy-loaded. Must scroll or trigger events to load.

3. **Multiple selectors needed** - YouTube A/B tests layouts, so always try multiple selectors in priority order.

4. **Metadata order varies** - The metadata text elements (views, date, etc.) aren't always in the same order.

5. **Shorts filtering** - Video URLs containing `/shorts/` should be filtered out for regular video listings.

6. **Subscribe button states**:
   - "Subscribe to X" → not subscribed
   - "Unsubscribe from X" → subscribed (aria-label check)

7. **Upload date formats**:
   - Relative: "3 days ago", "2 weeks ago"
   - Absolute: "Jan 25, 2026"
   - Streamed: "Streamed 3 days ago"

---

# Google Search DOM Scraping Reference

**Last verified:** February 1, 2026
**Source:** Crawlee blog (Dec 2024) + manual verification

Google's DOM uses heavily minified class names that change frequently. Use stable IDs, data attributes, and semantic HTML only.

---

## Search Results Page

### Container Structure

```
div#main
  └── div#center_col (role="main")
        └── div#search
              └── div#rso                          ← Main results container (STABLE)
                    └── div[data-hveid][lang]      ← Individual result blocks
```

### Result Block Structure

```
div[data-hveid][lang]
  ├── a (href="https://example.com/...")         ← Result link
  │     └── h3                                   ← Title (SEMANTIC)
  │           └── [text content]
  ├── cite                                       ← Display URL (SEMANTIC)  
  │     └── [text content] "example.com › path"
  └── div[style*="line"]                         ← Description (has -webkit-line-clamp)
        └── span
              └── [text content]
```

### Stable Selectors

| Element | Selector | Stability | Notes |
|---------|----------|-----------|-------|
| Results container | `#rso` | ✓✓✓ | Classic Google ID, very stable |
| Result block | `#rso div[data-hveid][lang]` | ✓✓ | data-hveid marks results |
| Title | `h3` | ✓✓✓ | Semantic HTML |
| Link | `a[href]` (first in block) | ✓✓✓ | Semantic HTML |
| URL display | `cite` | ✓✓✓ | Semantic HTML |
| Description | `div[style*="line"]` | ✓✓ | Targets -webkit-line-clamp |

### Scraping Code

```javascript
function scrapeSearchResults() {
  const rso = document.getElementById('rso');
  if (!rso) return [];
  
  const results = [];
  const blocks = rso.querySelectorAll('div[data-hveid][lang]');
  
  blocks.forEach((block, index) => {
    // Get first anchor with href (skip internal google links)
    const anchor = block.querySelector('a[href]');
    const href = anchor?.href;
    if (!href || href.includes('google.com/search')) return;
    
    // Title from h3
    const title = block.querySelector('h3')?.textContent?.trim();
    if (!title) return;
    
    // URL display from cite
    const displayUrl = block.querySelector('cite')?.textContent?.trim();
    
    // Description from div with line-clamp style
    const descEl = block.querySelector('div[style*="line"]');
    const description = descEl?.textContent?.trim() || '';
    
    results.push({
      id: href,
      title,
      url: href,
      meta: displayUrl || new URL(href).hostname,
      description,
    });
  });
  
  return results;
}
```

### Elements to Skip

- Results with `href` containing `google.com/search` (internal navigation)
- "People also ask" sections (expandable accordions)
- Knowledge panels (right sidebar)
- Video carousels
- Image packs
- Shopping results

### Page Detection

```javascript
function getGooglePageType() {
  const path = location.pathname;
  const params = new URLSearchParams(location.search);
  
  // Main search results
  if (path === '/search' && !params.has('tbm') && !params.has('udm')) {
    return 'search';
  }
  
  // Future: images (udm=2), videos (udm=7), news (tbm=nws)
  return 'other';
}
```

## Notes & Gotchas

1. **Avoid minified classes** - Classes like `LC20lb`, `VwiC3b`, `MjjYud` change frequently. Never rely on them.

2. **data-hveid is stable** - Google uses this for tracking/analytics, unlikely to remove it.

3. **lang attribute** - Result blocks have `lang="en"` (or user's language). Useful for filtering.

4. **Description fallback** - If `div[style*="line"]` fails, try finding longest text span that's not title/URL.

5. **Pagination** - Google search uses "infinite scroll" with lazy loading. Initial page has ~10 results.

6. **Rate limiting** - Google aggressively blocks automated scraping. Content script in browser context avoids this.
