# Iteration

anchor: c0184f2576f9a6b75337216f3171fb7bba5b3877
started: 2026-02-10T04:32:52-05:00
mode: data-definition-driven
language: JavaScript
transparent: true

## Problem

Google Images scraper + grid view with 2D hjkl navigation (TODOS.md item 3, iteration 2).

- Scrape image thumbnails/titles/source URLs from Google Images DOM
- New grid renderer with CSS grid layout
- 2D navigation: h/l move left/right, j/k move down/up in the grid
- Replace searchPageConfig reuse in pages.images with proper grid config

## Data Definition Plan

1. **`scrapeImageResults : () → Array<ContentItem>`** — new in scraper.js, scrapes Google Images DOM, returns ContentItems with `thumbnail` field
2. **`onNavigate` extension** — add `step` param and `left`/`right` directions: `onNavigate(state, direction, itemCount, step = 1)`
3. **Grid renderer** — new `src/sites/google/grid.js`: `renderGoogleImageGrid`, `renderGoogleGridItem`, grid CSS
4. **Keyboard `h`/`l`** — in keyboard.js, h→left, l→right on listing pages; no-op on non-grid pages
5. **`pages.images` config** — replace searchPageConfig with `{ waitForContent, render: renderGoogleImageGrid, gridColumns: N }`
6. **`handleListNavigation`** — check pageConfig.gridColumns for step; support left/right
7. **`createPageState`** — images branch uses `scrapeImageResults()`
