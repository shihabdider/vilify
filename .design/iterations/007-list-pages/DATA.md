# Iteration 007: List Pages Fixes - Data Definitions

## Summary

**No new data types required.** All fixes use existing data structures from `.design/DATA.md`.

## Analysis

| Issue | Existing Data | Notes |
|-------|---------------|-------|
| 1. Instant scroll | N/A | Behavior change only (`scrollIntoView` options) |
| 2. Loading wheel instant on nav | N/A | Timing change only (show before `waitForContent`) |
| 3. Search results scraping | `ContentItem` | Scraper selector fix, no data change |
| 4. Filter mode inline vs modal | `localFilterActive`, `localFilterQuery`, `modalState` | Route `/` based on page type |
| 5. `:q` exit focus mode | `focusModeActive` | Callback wiring fix |
| 6. Remove trending shortcut | N/A | Remove `gt` sequence and command |

## Key Design Decision: Filter Mode Routing

The existing data model already supports both patterns:

- **`localFilterActive: Boolean`** + **`localFilterQuery: String`** → inline list filtering (filter main content)
- **`modalState: 'filter'`** → drawer modal (for watch page recommended videos)

### Behavior Change

| Page Type | `/` Key Action | Data Fields Used |
|-----------|----------------|------------------|
| Listing pages (home, subs, history, library, search) | Inline filter | `localFilterActive = true`, `localFilterQuery` |
| Watch page | Open filter drawer | `modalState = 'filter'` |

This leverages existing data structures—no schema changes needed.
