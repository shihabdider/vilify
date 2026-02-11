## Wish List

### Layer 1 (implement first)
- `getGooglePageType(): GooglePageType` in `src/sites/google/scraper.js`
  Purpose: Detect current Google page type from URL. Returns `'images'` when `location.pathname === '/search'` AND `new URLSearchParams(location.search).get('udm') === '2'`, returns `'search'` when pathname is `/search` without `udm=2`, returns `'other'` otherwise. Template: 3-branch enumeration (check pathname, then check udm param).

### Layer 0 (implement last)
- `searchUrl(query: string): string` in `src/sites/google/index.js` (property of `googleConfig`)
  Purpose: Build search URL for the given query, preserving current search type. Calls `getGooglePageType()` at invocation time: when on images page (`'images'`), returns `'/search?q=' + encodeURIComponent(query) + '&udm=2'`; otherwise returns `'/search?q=' + encodeURIComponent(query)`. This makes the `i` key (search mode) preserve image search when already on images page.
- `go` key sequence handler in `src/sites/google/index.js` (entry in `getGoogleKeySequences` return value)
  Purpose: Navigate to Google web search results for the current query. Reads query from `new URLSearchParams(location.search).get('q')`, then navigates to `/search?q=<encoded query>` (web results, no `udm` param). If no query found, show message or no-op.
- `gi` key sequence handler in `src/sites/google/index.js` (entry in `getGoogleKeySequences` return value)
  Purpose: Navigate to Google Images results for the current query. Reads query from `new URLSearchParams(location.search).get('q')`, then navigates to `/search?q=<encoded query>&udm=2` (image results). If no query found, show message or no-op.
- `createPageState` images branch in `src/sites/google/index.js` (inside `googleConfig.createPageState`)
  Purpose: Handle `'images'` variant of GooglePageType. Currently returns empty list state as stub. Should scrape image results (initially reuse `scrapeSearchResults()` and `createGoogleListPageState(results)`, same as search — proper image grid comes later).
- `pages.images` config entry in `src/sites/google/index.js` (property of `googleConfig.pages`)
  Purpose: Page config for images search results. Currently reuses `searchPageConfig` (same waitForContent and render as web search). Proper image grid layout is a future enhancement.

## Data Definitions Created/Modified
- `src/sites/google/scraper.js`: `GooglePageType` expanded from `'search' | 'other'` to `'search' | 'images' | 'other'`. Detection based on `udm=2` URL parameter.

## Assertion Changes Flagged
None — no test files were modified.

## Notes
- 3 existing tests in `src/sites/google/index.test.js` now fail because `searchUrl` stub throws. These will pass once `searchUrl` is implemented (the existing test expectations are correct for the web search case — `location` mock has `pathname: '/search'` without `udm=2`, so `getGooglePageType()` will return `'search'` and `searchUrl` will return the same URLs as before).
- The test mock for `window.location` lacks a `search` property. The implementer should add `search: '?q=test'` to the existing mock when implementing `getGooglePageType`, since it reads `location.search`.
- `pages.images` and `createPageState` images branch are intentionally minimal stubs (reuse search behavior). A proper image grid layout is out of scope for this change.
- The `go`/`gi` handlers should use `location.href = url` (full page navigation) rather than `app.navigate` since they switch between search types.
- Pre-existing test infrastructure error (jsdom not found) — unrelated to these changes.
