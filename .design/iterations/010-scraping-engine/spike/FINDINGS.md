# Spike Findings: Data Interception

## Summary

**Result**: ✅ Data interception is viable and provides richer data than DOM scraping.

**Recommendation**: Hybrid approach - use `ytInitialData` as primary source, with DOM scraping as fallback.

---

## What Works

### ytInitialData (embedded in page)

| Page Type | Data Available | Quality |
|-----------|----------------|---------|
| Watch | Video details, recommendations, chapters | ✅ Excellent |
| Search | All results with full metadata | ✅ Excellent |
| Channel | Varies (may need auth or fetch intercept) | ⚠️ Needs more testing |
| Home | Minimal without auth | ⚠️ Limited |

### ytInitialPlayerResponse (watch page only)

Contains rich video metadata:
- `videoId`, `title`, `author`
- `lengthSeconds`, `viewCount`
- `keywords` array
- `shortDescription`

### Data Fields Available

| Field | ytInitialData | DOM Scraping |
|-------|---------------|--------------|
| videoId | ✅ `contentId` or `videoId` | ✅ from href |
| title | ✅ `.title.content` | ✅ text content |
| channel | ✅ metadata rows | ✅ channel link |
| views | ✅ metadata rows | ✅ metadata spans |
| published | ✅ metadata rows | ✅ metadata spans |
| duration | ✅ `lengthText` | ⚠️ Sometimes missing |
| description | ✅ Full text | ⚠️ Truncated |
| thumbnail | ✅ Full URL | ⚠️ Computed from ID |
| keywords | ✅ Array | ❌ Not available |

---

## Renderer Types Discovered

### Old Format (still works for some pages)
- `videoRenderer` - search results, some feeds
- `compactVideoRenderer` - old recommendations
- `gridVideoRenderer` - channel grids
- `playlistVideoRenderer` - playlists

### New Format (YouTube migrating to this)
- `lockupViewModel` - recommendations on watch page
- Structure: `{ contentId, contentImage, metadata: { title, metadata } }`
- `yt-lockup-view-model` in DOM corresponds to this

---

## Implementation Notes

### 1. Extraction Timing

```
Page Load Timeline:
─────────────────────────────────────────────────────
[HTML arrives] → ytInitialData available immediately
                 (in <script> tag, before DOM renders)
                 
[DOM renders]  → Can start DOM scraping
                 (but content may still be loading)
                 
[SPA nav]      → Fetch intercept catches /youtubei/v1/*
                 (ytInitialData in HTML may be stale)
```

### 2. Hybrid Strategy

```javascript
function getVideos() {
  // 1. Try ytInitialData first (fast, complete)
  let videos = extractFromInitialData();
  
  // 2. If SPA navigation, use cached fetch data
  if (videos.length === 0) {
    videos = extractFromFetchCache();
  }
  
  // 3. Fall back to DOM scraping
  if (videos.length === 0) {
    videos = scrapeDOM();
  }
  
  return videos;
}
```

### 3. Data Normalization

Both renderer types need to map to same output format:

```javascript
// videoRenderer (old)
{
  videoId: renderer.videoId,
  title: renderer.title?.runs?.[0]?.text,
  channel: renderer.ownerText?.runs?.[0]?.text,
  views: renderer.viewCountText?.simpleText,
}

// lockupViewModel (new)
{
  videoId: model.contentId,
  title: model.metadata?.lockupMetadataViewModel?.title?.content,
  channel: extractFromMetadataRows(model, 0),
  views: extractFromMetadataRows(model, 1),
}
```

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| YouTube changes JSON structure | Medium | Use both old and new renderer extractors |
| ytInitialData missing on SPA nav | High | Fetch interception for /youtubei/v1/* |
| Auth-gated pages (history, subs) | Medium | Fall back to DOM scraping |
| Rate limiting on API intercept | Low | Not making extra requests, just reading |

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DataProvider                             │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ InitialData  │  │   Fetch      │  │    DOM       │       │
│  │  Extractor   │  │ Interceptor  │  │   Scraper    │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│         └────────────┬────┴────────────────┘                │
│                      ▼                                       │
│              ┌──────────────┐                                │
│              │  Normalizer  │ ← Maps all formats to Video    │
│              └──────┬───────┘                                │
│                     ▼                                        │
│              ┌──────────────┐                                │
│              │  VideoStore  │ ← Deduped by videoId           │
│              └──────────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Update BRAINSTORM.md** with hybrid approach
2. **Add data types** for InitialData extraction
3. **Implement InitialDataExtractor** module
4. **Add fetch interception** (optional, for SPA nav)
5. **Update existing scraper** to use new data layer

## Code Samples

### Parse ytInitialData

```javascript
function parseInitialData() {
  // Method 1: Check if already parsed by YouTube
  if (window.ytInitialData) {
    return window.ytInitialData;
  }
  
  // Method 2: Find in script tags
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    const match = script.textContent.match(/var ytInitialData = ({.*?});/s);
    if (match) {
      return JSON.parse(match[1]);
    }
  }
  
  return null;
}
```

### Extract from lockupViewModel

```javascript
function extractFromLockup(model) {
  const meta = model.metadata?.lockupMetadataViewModel;
  const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows || [];
  
  // Row 0: channel name
  // Row 1: views, date (joined with separator)
  const parts = rows.flatMap(r => 
    r.metadataParts?.map(p => p.text?.content).filter(Boolean) || []
  );
  
  return {
    videoId: model.contentId,
    title: meta?.title?.content,
    channel: parts[0],
    views: parts[1],
    published: parts[2],
  };
}
```
