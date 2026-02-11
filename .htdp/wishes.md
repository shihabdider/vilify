## Wish List

### Layer 3 (implement first)
- `scrapeImageResults() → Array<ContentItem>` in `src/sites/google/scraper.js`
  Purpose: Scrape Google Images DOM (udm=2 page) for image results. Extract thumbnail URL (from img src), title (from aria-label or text), source page URL (from data-lpage or anchor href), and source domain (for meta field). Return array of ContentItem objects with id, title, url, thumbnail, meta fields. Use stable selectors (data attributes, semantic HTML) — avoid minified class names.

- `GRID_COLUMNS = 5` in `src/sites/google/grid.js`
  Purpose: Constant defining the number of columns in the image grid. Already defined as `5` — this is complete (no stub to implement).

- `renderGoogleGridItem(item, isSelected) → HTMLElement` in `src/sites/google/grid.js`
  Purpose: Render a single CSS grid cell for an image result. Show the thumbnail as an img element with object-fit cover, overlay the title at the bottom of the cell, and highlight with accent border when isSelected is true. Use the `el()` helper from core/view.js for element creation.

- `injectGoogleGridStyles() → void` in `src/sites/google/grid.js`
  Purpose: Inject a `<style>` element with CSS for the image grid layout. Must be idempotent (only inject once, use a module-level flag). Styles should define: grid container with `grid-template-columns: repeat(GRID_COLUMNS, 1fr)`, gap between cells, cell aspect ratio for thumbnails, selected cell highlight (accent border), title overlay positioning, and scroll behavior. Use CSS custom properties (--bg-2, --accent, --txt-1, etc.) from the site theme.

- `onNavigate(state, direction, itemCount, step = 1) → { state, boundary }` in `src/core/state.js`
  Purpose: Extended with `step` parameter and `left`/`right` directions. Already implemented in-place — the switch now has 6 cases: down (+step), up (-step), right (+1), left (-1), top (→0), bottom (→max). Step defaults to 1 so all existing callers are unaffected. This is complete — no stub to implement, just needs tests for the new cases.

### Layer 2
- `renderGoogleImageGrid(state, siteState, container) → void` in `src/sites/google/grid.js`
  Purpose: Custom render function for the Google Images page. Clear the container, call injectGoogleGridStyles(), read items from state.page.videos, apply local filter if state.ui.filterActive, update sort indicator and item count in status bar, create a CSS grid container div, iterate items calling renderGoogleGridItem for each, append grid to container, and scroll the selected item into view. Follow the same pattern as renderGoogleListing in google/index.js but use grid layout instead of vertical list.

- `h/l keyboard bindings` in `src/core/keyboard.js`
  Purpose: Already wired — h dispatches onNavigate('left'), l dispatches onNavigate('right'), same guard conditions as j/k (only when !filterActive && !searchActive). This is complete — no stub to implement.

### Layer 1
- `handleListNavigation grid step logic` in `src/core/index.js`
  Purpose: Already wired — reads pageConfig.gridColumns, passes step to onNavigate for up/down on grid pages, returns early for left/right on non-grid pages. This is complete — no stub to implement, just needs tests.

### Layer 0 (implement last)
- `pages.images config` in `src/sites/google/index.js`
  Purpose: Already wired — images page config uses renderGoogleImageGrid as render function, GRID_COLUMNS as gridColumns, and a waitForContent that checks for #rso or div[data-query]. This is complete — no stub to implement.

- `createPageState images branch` in `src/sites/google/index.js`
  Purpose: Already wired — images branch calls scrapeImageResults() instead of scrapeSearchResults(). This is complete — no stub to implement.

## Data Definitions Created/Modified
- `src/sites/google/grid.js`: new file — `GRID_COLUMNS` constant (5), `injectGoogleGridStyles` stub, `renderGoogleGridItem` stub, `renderGoogleImageGrid` stub
- `src/sites/google/scraper.js`: added `scrapeImageResults` stub function
- `src/core/state.js`: extended `onNavigate` signature with `step = 1` parameter and `left`/`right` direction cases
- `src/core/keyboard.js`: added `h` → `onNavigate('left')` and `l` → `onNavigate('right')` bindings
- `src/core/index.js`: added grid step logic in `handleListNavigation` (reads `pageConfig.gridColumns`, computes step, early return for left/right on non-grid pages)
- `src/sites/google/index.js`: updated imports, replaced `pages.images` with grid config, split `createPageState` to route images through `scrapeImageResults`

## Assertion Changes Flagged
None

## Notes
- The `onNavigate` change is backward-compatible: `step` defaults to 1, and existing callers pass no 4th argument. All 249 existing tests pass unchanged.
- The `left`/`right` directions in `onNavigate` use step=1 always (not the grid step) — they move one cell at a time regardless of grid layout.
- `handleListNavigation` is the integration point: it reads `gridColumns` from the page config and passes `step` to `onNavigate` for up/down only. Left/right on non-grid pages are no-ops.
- The `GRID_COLUMNS` constant is already set to 5 and wired into `pages.images.gridColumns` — no stub needed for this.
- The keyboard h/l bindings and the handleListNavigation grid logic are already implemented (not stubs) — they just need test coverage.
- Pre-existing: jsdom unhandled error in test output (ERR_MODULE_NOT_FOUND for jsdom) — not related to these changes.
- The 3 real stubs requiring implementation are: `scrapeImageResults`, `renderGoogleGridItem`, `injectGoogleGridStyles`, and `renderGoogleImageGrid`.
