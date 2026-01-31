# Implementation - Iteration 012: Metadata Display

Generated from BRAINSTORM.md on 2026-01-31.

## Dependency Graph

```
B1 ──┬── B3
B2 ──┘

B4 ──── B5
```

Two independent tracks (listing metadata vs watch page metadata).

## Execution Plan

| Wave | Behaviors | Est. Tokens | Subagents | Status |
|------|-----------|-------------|-----------|--------|
| 1 | B1, B2, B4 | 7K | 1 | ✓ Complete |
| 2 | B3, B5 | 5K | 1 | → In Progress |

## Behavior Status

| ID | Behavior | Status | Tested | Notes |
|----|----------|--------|--------|-------|
| B1 | Scraper extracts view count from video items | ✓ Done | ✓ | viewCount in ContentItem.data |
| B2 | Scraper extracts duration from video items | ✓ Done | ✓ | duration in ContentItem.data |
| B3 | Listing items display views and duration on second meta row | → In Progress | - | |
| B4 | Watch page shows upload date | ✓ Done | ✓ | Already scraped, added getWatchPageViews |
| B5 | Watch page shows view count and duration | → In Progress | - | |

## Wave Log

### Wave 1 - 2026-01-31
- Behaviors: B1, B2, B4
- Result: ✓ All pass
- Changes:
  - Added scrapeDuration() helper
  - Added getWatchPageViews() helper  
  - Added formatDuration() export
  - Modified all scrape*Layout functions to extract duration
  - Modified getVideos() to store viewCount/duration in data
  - Modified getVideoContext() to use getWatchPageViews()
