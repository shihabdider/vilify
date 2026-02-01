# Iteration 020: List Sorting - Implementation

## Status: Complete ✓

## Bug Fix (v0.5.25)

Initial implementation (v0.5.24) had sorting logic in core's generic `'listing'` branch, but YouTube uses a custom `renderYouTubeListing` function. Fixed by adding sorting directly to `src/sites/youtube/index.js`.

## Changes Made

### New Files

**`src/core/sort.js`** - Sorting logic module
- `SORT_FIELDS` - Configuration for all sort fields with default directions and valid prefixes
- `parseRelativeDate()` - Parse "2 days ago", "Jan 15, 2026" etc. to timestamp
- `parseDuration()` - Parse "12:34", "1:23:45" to seconds
- `parseViewCount()` - Parse "1.2M views", "1,234 views" to number
- `extractChannel()` - Extract channel name from meta string
- `extractDateFromMeta()` - Extract date from meta string
- `sortItems()` - Sort array of ContentItems by field/direction
- `matchSortPrefix()` - Vim-style prefix matching (da→date, du→duration, etc.)
- `parseSortCommand()` - Parse ":sort da!" style commands
- `getSortLabel()` - Get display label like "date↓"
- `toggleDirection()` / `getDefaultDirection()` - Direction helpers

### Modified Files

**`src/core/state.js`**
- Added `sortField: null` - Current sort field (null | 'date' | 'duration' | 'title' | 'channel' | 'views')
- Added `sortDirection: 'desc'` - Current direction ('asc' | 'desc')

**`src/core/layout.js`**
- Added CSS for `.vilify-status-sort` and `.vilify-status-count`
- Added sort indicator and count elements to status bar
- Added `updateSortIndicator(sortLabel)` function
- Added `updateItemCount(count)` function

**`src/core/index.js`**
- Imported sort functions
- Apply sorting after filtering in listing render
- Update sort indicator and count in status bar
- Handle `:sort` command in `handleCommandSubmit()`
  - `:sort` - reset to default order
  - `:sort da` - sort by date (prefix matching)
  - `:sort da!` - sort by date reversed
  - Repeat same command toggles direction
- Reset sort state in `handleNavigation()`
- Added `executeSort` callback for palette commands

**`src/sites/youtube/commands.js`**
- Added Sort group with commands for listing pages:
  - Sort by date (`:sort da`)
  - Sort by duration (`:sort du`)
  - Sort by title (`:sort t`)
  - Sort by channel (`:sort c`)
  - Sort by views (`:sort v`)
  - Reset sort (`:sort`)

**`package.json` / `manifest.json`**
- Version bumped to 0.5.24

## Behaviors Implemented

| ID | Behavior | Status |
|----|----------|--------|
| B1 | `:sort` command registered in command palette | ✓ |
| B2 | `:sort da` sorts by date (newest first) | ✓ |
| B3 | `:sort du` sorts by duration (longest first) | ✓ |
| B4 | `:sort t` sorts by title (A-Z) | ✓ |
| B5 | `:sort c` sorts by channel (A-Z) | ✓ |
| B6 | `:sort v` sorts by views (most first) | ✓ |
| B7 | Repeat command toggles direction | ✓ |
| B8 | Bang syntax reverses direction | ✓ |
| B9 | `:sort` with no arg resets to original order | ✓ |
| B10 | Status bar shows active sort | ✓ |
| B11 | Sort resets on navigation | ✓ |
| B12 | Lazy-loaded items are sorted into list | ✓ |
| B13 | Prefix matching works for longer prefixes | ✓ |

## Testing Notes

To test:
1. `npm run build`
2. Reload extension in Chrome
3. Go to YouTube home, search, or channel videos page
4. Press `:` to open command palette
5. Type `sort da` and press Enter - list should sort by date
6. Status bar should show `date↓` 
7. Run `:sort da` again - direction should toggle to `date↑`
8. Run `:sort du!` - should sort by duration ascending (shortest first)
9. Run `:sort` - should reset to original order
10. Navigate to different page - sort should reset
11. Scroll to load more videos - new items should be sorted correctly
