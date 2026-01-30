# Iteration 010: Data Layer (Hybrid Scraping)

## Status: PLANNED

## Goal

Replace fragile DOM scraping with a hybrid data layer that extracts from YouTube's embedded JSON (`ytInitialData`) with DOM scraping as fallback.

## Problem

Current scraping issues:
1. **Timing** - DOM not ready when scraping, content loads asynchronously
2. **Fragile selectors** - YouTube changes renderers, selectors break
3. **No reactivity** - Polling (200ms) is a blunt instrument
4. **Partial data** - Scrapers return incomplete results without knowing it
5. **Page-specific** - Each page type needs custom scraping logic

## Spike Findings (spike/FINDINGS.md)

Tested data interception approach:

| Source | Quality | Use Case |
|--------|---------|----------|
| `ytInitialData` | ✅ Excellent | Primary - search, watch, most pages |
| `ytInitialPlayerResponse` | ✅ Excellent | Watch page video details |
| Fetch intercept | ⚠️ Complex | SPA navigation, infinite scroll |
| DOM scraping | ⚠️ Fragile | Fallback only |

Key discoveries:
- Search results have full metadata in `ytInitialData`
- Watch page recommendations use new `lockupViewModel` format
- `ytInitialPlayerResponse` has keywords, full description, view count
- Data available immediately (before DOM renders)

## Proposed Solution: Hybrid Data Layer

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      DataProvider                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ InitialData  │  │    Fetch     │  │     DOM      │       │
│  │  Extractor   │  │ Interceptor  │  │   Scraper    │       │
│  │  (primary)   │  │  (SPA nav)   │  │  (fallback)  │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│         └────────────┬────┴─────────────────┘                │
│                      ▼                                       │
│              ┌──────────────┐                                │
│              │  Normalizer  │  Maps renderer formats → Video │
│              └──────┬───────┘                                │
│                     ▼                                        │
│              ┌──────────────┐                                │
│              │  VideoStore  │  Deduped Map<videoId, Video>   │
│              └──────────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

### Strategy

1. **On page load**: Parse `ytInitialData` from `<script>` tag (immediate, no waiting)
2. **On SPA navigation**: URL change triggers re-parse of `ytInitialData`
3. **Fallback**: If ytInitialData missing/empty, use DOM scraping
4. **Watch page**: Also parse `ytInitialPlayerResponse` for video details

### Renderer Support

Must handle both old and new YouTube formats:

| Format | Where Used | Extractor |
|--------|------------|-----------|
| `videoRenderer` | Search results | `extractVideoRenderer()` |
| `compactVideoRenderer` | Old recommendations | `extractCompactVideo()` |
| `gridVideoRenderer` | Channel grids | `extractGridVideo()` |
| `lockupViewModel` | New recommendations | `extractLockupModel()` |
| `richItemRenderer` | Home feed | `extractRichItem()` |

### Module Structure

```
src/sites/youtube/
├── data/
│   ├── index.js           # DataProvider facade
│   ├── initial-data.js    # ytInitialData parser
│   ├── extractors.js      # Renderer → Video extractors  
│   ├── normalizer.js      # Unify formats
│   └── store.js           # VideoStore (reactive?)
├── scraper.js             # Existing DOM scraper (becomes fallback)
└── ...
```

## Behaviors

| ID | Behavior | Test Method | Priority |
|----|----------|-------------|----------|
| B1 | Parse ytInitialData on page load | Search page shows videos immediately | P0 |
| B2 | Extract from videoRenderer | Search results have title, channel, views | P0 |
| B3 | Extract from lockupViewModel | Watch page recommendations work | P0 |
| B4 | Fallback to DOM when ytInitialData empty | Home page (logged out) still works | P1 |
| B5 | Re-parse on SPA navigation | Navigate search→watch, both work | P1 |
| B6 | Watch page has video context | Title, channel, chapters available | P0 |
| B7 | Normalize all formats to Video | Same output regardless of source | P0 |

## Data Types (Preliminary)

```
Video is a structure:
- videoId: String
- title: String
- channel: String | null
- channelUrl: String | null
- views: String | null
- published: String | null
- duration: String | null
- thumbnail: String | null
- description: String | null
- _source: 'initialData' | 'fetch' | 'dom'

VideoContext is a structure (watch page):
- videoId: String
- title: String
- channel: String
- channelUrl: String | null
- description: String
- chapters: Array<Chapter>
- duration: Number
- viewCount: String | null
- keywords: Array<String>
- _source: 'playerResponse' | 'dom'

DataProvider is a structure:
- getVideos: () -> Array<Video>
- getVideoContext: () -> VideoContext | null
- getRecommendations: () -> Array<Video>
- subscribe: (callback) -> unsubscribe

InitialDataResult is one of:
- { ok: true, data: Object, pageType: PageType }
- { ok: false, error: String }
```

## Scope Decisions

### In Scope
- ytInitialData extraction
- ytInitialPlayerResponse extraction (watch page)
- Normalizer for all renderer types
- DOM fallback for edge cases
- URL change detection for SPA

### Out of Scope (Future)
- Fetch interception (complex, may not be needed)
- Infinite scroll handling (current polling approach works)
- MutationObserver reactivity (can add later if needed)
- Caching/persistence

## Dependencies

- ✅ Iteration 009 (module boundaries) complete
- Updates to existing scraper.js to use new data layer
- No new external dependencies

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| YouTube changes JSON structure | Medium | Support both old/new formats, log unknown |
| ytInitialData not present | Low | DOM fallback |
| Performance regression | Low | JSON parse is fast, measure |

## Success Metrics

- Search page: Videos appear without 200ms polling delay
- Watch page: Recommendations load reliably
- Channel page: All videos extracted (currently flaky)
- No increase in "0 videos found" errors

## References

- Spike: `.design/iterations/010-scraping-engine/spike/`
- Current scraper: `src/sites/youtube/scraper.js`
- Working userscript: `sites/youtube.user.js`
