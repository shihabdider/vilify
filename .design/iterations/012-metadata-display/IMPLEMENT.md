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
| 1 | B1, B2, B4 | 7K | 1 | → In Progress |
| 2 | B3, B5 | 5K | 1 | Pending |

## Behavior Status

| ID | Behavior | Status | Tested | Notes |
|----|----------|--------|--------|-------|
| B1 | Scraper extracts view count from video items | → In Progress | - | |
| B2 | Scraper extracts duration from video items | → In Progress | - | |
| B3 | Listing items display views and duration on second meta row | Pending | - | |
| B4 | Watch page shows upload date | → In Progress | - | |
| B5 | Watch page shows view count and duration | Pending | - | |

## Wave Log

(populated during execution)
