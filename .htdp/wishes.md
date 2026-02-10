# Wishes

## Layer 1 (leaf — no dependencies between these)

### Wish 1: Generic `waitForContent`
- **Function:** `waitForContent(cfg, timeout)` in `src/core/index.js` (line ~946)
- **Purpose:** Use the page config's `waitForContent` predicate when available, falling back to existing YouTube-specific selectors as legacy. Eliminates the 5-second timeout on Google.
- **Change type:** Modify existing function

### Wish 2: Page cache module
- **Function:** `getCachedPage(url)` and `setCachedPage(url, items)` in `src/sites/google/page-cache.js` (new file)
- **Purpose:** Cache scraped Google search results in sessionStorage keyed by URL. `getCachedPage` returns `ContentItem[] | null`. `setCachedPage` stores items with a max entry limit.
- **Change type:** New file

## Layer 0 (root — depends on both Layer 1 wishes)

### Wish 3: Cache integration in Google init flow
- **Function:** `init()` in `src/core/index.js` + `createPageState()` / `renderGoogleListing()` in `src/sites/google/index.js`
- **Purpose:** On init, check page cache. If hit: render immediately from cache (no loading screen), then background-refresh from DOM. On render, save scraped results to cache. Also update `renderGoogleListing` to read from `state.page` instead of re-scraping.
- **Change type:** Modify existing functions
