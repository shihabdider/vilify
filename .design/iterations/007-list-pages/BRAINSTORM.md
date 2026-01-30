# Iteration 007: List Pages Fixes

## Status: COMPLETE

**Date:** January 28-29, 2026
**Versions:** 0.1.39 - 0.1.46

## Goal

Fix 6 issues with list pages (home, history, subs, library, search results).

## Behaviors

| ID | Behavior | Test Method | Depends On | Status |
|----|----------|-------------|------------|--------|
| B1 | Scroll is instant | Press j/k, no smooth animation | - | ✓ |
| B2 | Loading shows on nav | Press `gh`, spinner appears immediately | - | ✓ |
| B3 | Search results scrape correctly | Search, verify all titles shown | - | ✓ |
| B4 | `/` routes correctly by page | Listing: inline filter; Watch: drawer | - | ✓ |
| B5 | `:q` exits focus mode | Type `:q`, overlay removed | - | ✓ |
| B6 | `gt` removed (no trending) | Press `gt`, nothing happens | - | ✓ |

## Key Decision

Filter mode routing based on page type:
- **Listing pages**: `/` sets `localFilterActive = true` (inline filter)
- **Watch page**: `/` sets `modalState = 'filter'` (drawer modal)

Uses existing data structures - no schema changes needed.

## Notes

v0.1.46 additional fixes:
- Search scraping prefers videos with titles during deduplication
- Exit cleanup: stop polling, remove modals/overlays
- Filter now matches channel name (meta) in addition to title
