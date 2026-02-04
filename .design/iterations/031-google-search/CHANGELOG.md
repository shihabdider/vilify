# Iteration 031 Changelog

## Status: Complete ✓

### 2026-02-01: Filter & Pagination (v0.5.57)

**Issue**: Filter mode (/) not working, no pagination support.

**Fix**:
- Added `getGoogleKeySequences()` with `/` → `openLocalFilter`
- Added `getGoogleSingleKeyActions()` with:
  - `F` (Ctrl+F): next page via `#pnnext` link
  - `B` (Ctrl+B): prev page via `#pnprev` link
- Updated `src/core/keyboard.js` to support Ctrl+F/B pagination on listing pages (not just watch pages)

### 2026-02-01: UI Fix (v0.5.56)

**Issue**: Empty thumbnail placeholders showing in list view, no descriptions displayed.

**Fix**:
- Created `src/sites/google/items.js` with custom `renderGoogleItem()` renderer
  - No thumbnails (search results don't have them)
  - Shows title, URL, and description in vertical layout
  - Google-specific CSS styling
- Enhanced `scraper.js` `extractDescription()` with multiple strategies:
  - `-webkit-line-clamp` style divs
  - `data-sncf` attribute (snippet container)
  - `em` tag parents (highlighted terms)
  - Heuristic text content search
- Updated `renderGoogleListing()` to use custom renderer

### 2026-02-01: Implementation

**Files created:**
- `src/sites/google/scraper.js` - DOM scraping with stable selectors
  - `getGooglePageType()` - Detect 'search' vs 'other' page type
  - `scrapeSearchResults()` - Extract results using `#rso div[data-hveid][lang]`
- `src/sites/google/index.js` - Full SiteConfig
  - Theme: Solarized Dark + Google Blue (#4285F4)
  - Minimal config (no drawers, no special commands)

**Files updated:**
- `src/content.js` - Added `getSiteConfig()` for site detection
- `manifest.json` - Added Google matches, bumped version to 0.5.55

**Build & Tests:**
- Build: ✓ (210.0kb content.js)
- Tests: 138 passing

### 2026-02-01: Initial Planning

**Research completed:**
- Analyzed Google search results HTML structure
- Found stable selectors via Crawlee blog (Dec 2024)
- Identified pattern: `#rso div[data-hveid][lang]` → `h3`, `a`, `cite`, `div[style*="line"]`

**Design docs updated:**
- Created `.design/iterations/031-google-search/SCOPE.md` with full implementation plan
- Updated `.design/WISHES.md` with pending functions
- Updated `.design/SCRAPING.md` with Google selectors
- Updated `.design/PROJECT.md` to show iteration in progress

**Key decisions:**
- Use stable selectors only (IDs, data attributes, semantic HTML)
- Reuse existing ContentItem type (no new types needed)
- Theme: Solarized Dark + Google Blue (#4285F4) accent
- Scope: Search results page only (images/news/etc. deferred)
