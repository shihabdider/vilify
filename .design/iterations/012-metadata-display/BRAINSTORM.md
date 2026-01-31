# Iteration 012: Metadata Display

## Goal

Show views and duration in video listings, and fix missing metadata on watch page.

## Behaviors

| ID | Behavior | Test Method | Depends On | Est. Tokens |
|----|----------|-------------|------------|-------------|
| B1 | Scraper extracts view count from video items | Check scraped data includes viewCount field | - | 2K |
| B2 | Scraper extracts duration from video items | Check scraped data includes duration field | - | 2K |
| B3 | Listing items display views and duration on second meta row | Navigate to home/search, verify "1.2M views · 12:34" line below channel/date | B1, B2 | 3K |
| B4 | Watch page shows upload date | Open any video, verify upload date appears in video info | - | 3K |
| B5 | Watch page shows view count and duration | Open any video, verify views and duration appear in video info | B4 | 2K |

## Dependency Graph

```
B1 ──┬── B3
B2 ──┘

B4 ──── B5
```

## Notes

- Listing layout: two columns - first has title + two meta rows, second has subscribe button only
- Second meta row format: "1.2M views · 12:34"
- Two independent tracks can be parallelized
