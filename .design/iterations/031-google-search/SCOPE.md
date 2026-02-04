# Iteration 031: Google Search Support

## Goal

Add Google.com search results page support to Vilify.

## Scope

### In Scope
- Main search results page only (`/search?q=...`)
- DOM scraping (no API intercept available)
- Filter mode support (filter results by query)
- Solarized Dark theme + Google accent colors (blue #4285F4, red #EA4335, yellow #FBBC04, green #34A853)

### Out of Scope (Future Iterations)
- Images page
- News page
- Videos page
- Shopping page
- "People also ask" sections
- Knowledge panels
- Drawers (no equivalent to YouTube chapters/transcript)

## Research Findings

### Selector Strategy

From Crawlee blog (December 2024) - https://crawlee.dev/blog/scrape-google-search

**Key insight**: Use stable IDs and data attributes, ignore minified class names.

```javascript
// Container: stable attributes
const resultContainer = 'div#rso div[data-hveid][lang]';

// Inside each result:
// Title: semantic HTML
const title = result.querySelector('h3')?.textContent;

// URL: first anchor
const url = result.querySelector('a')?.href;

// Description: targets -webkit-line-clamp style
const description = result.querySelector('div[style*="line"]')?.textContent;
```

### Selector Breakdown

| Element | Selector | Stability | Notes |
|---------|----------|-----------|-------|
| Results container | `#rso` | ✓ Very stable | Classic Google ID |
| Each result | `div[data-hveid][lang]` | ✓ Stable | data-hveid marks results, lang="en" |
| Title | `h3` | ✓ Very stable | Semantic HTML |
| Link | `a` (first in result) | ✓ Very stable | Semantic HTML |
| Description | `div[style*="line"]` | ✓ Stable | Targets -webkit-line-clamp |
| URL display | `cite` | ✓ Stable | Semantic HTML |

### Verified from HTML Sample

From `.design/google.html` (captured search for "mr robot"):
- `#rso` container confirmed at line 1165
- Results have `data-hveid` and `lang="en"` attributes
- `h3` elements contain titles
- `cite` elements contain display URLs
- Description in divs with `-webkit-line-clamp` style

## Implementation Plan

### Files to Create

```
src/sites/google/
├── index.js      # GoogleSiteConfig
├── scraper.js    # DOM scraping with stable selectors
```

### Files to Modify

| File | Change |
|------|--------|
| `manifest.json` | Add Google content_scripts matches, bump version |
| `src/content.js` | Add site detection to select config |

### Data Types

Google results fit existing `ContentItem` pattern:
```javascript
{
  id: string,      // URL (unique identifier)
  title: string,   // h3 text
  url: string,     // href
  meta: string,    // display URL from cite
  description: string  // snippet text (optional, for filter)
}
```

No new types needed - reuse existing patterns.

### Theme

```javascript
const googleTheme = {
  // Base: Solarized Dark
  bg1: '#002b36',
  bg2: '#073642', 
  bg3: '#0a4a5c',
  txt1: '#f1f1f1',
  txt2: '#aaaaaa',
  txt3: '#717171',
  
  // Accent: Google Blue
  txt4: '#4285F4',      // links
  accent: '#4285F4',    // primary accent
  accentHover: '#3367D6',
  
  // Additional Google colors for future use:
  // red: '#EA4335'
  // yellow: '#FBBC04'  
  // green: '#34A853'
};
```

### Page Config

```javascript
const googleConfig = {
  name: 'google',
  matches: ['*://www.google.com/search*', '*://google.com/search*'],
  theme: googleTheme,
  
  getPageType: () => {
    // For now, only 'search' page type
    return location.pathname === '/search' ? 'search' : 'other';
  },
  
  getItems: scrapeSearchResults,
  
  // Minimal config - no drawers, no special commands
  getCommands: () => [],
  getKeySequences: () => ({}),
  getSingleKeyActions: () => ({}),
  
  pages: {
    search: { render: renderGoogleListing },
    other: { render: () => {} },  // No overlay on non-search pages
  },
  
  createSiteState: () => ({}),
};
```

## Behaviors

### B1: Focus Mode on Search Results
- **Given**: User is on google.com/search?q=...
- **When**: Focus mode activates (Escape key)
- **Then**: Overlay shows list of search results

### B2: Navigate Results
- **Given**: Focus mode is active on search results
- **When**: User presses j/k or arrow keys
- **Then**: Selection moves through results

### B3: Open Result
- **Given**: A search result is selected
- **When**: User presses Enter
- **Then**: Navigate to that URL

### B4: Open in New Tab
- **Given**: A search result is selected
- **When**: User presses Shift+Enter
- **Then**: Open URL in new tab

### B5: Filter Results
- **Given**: Focus mode is active
- **When**: User presses / and types query
- **Then**: Results filtered by title/description match

### B6: Copy URL
- **Given**: A search result is selected
- **When**: User presses y
- **Then**: URL copied to clipboard, flash message shown

## Dependencies

Uses existing core modules:
- `core/layout.js` - renderListing, renderFocusMode
- `core/state.js` - all state transitions
- `core/keyboard.js` - key handling
- `core/view.js` - DOM utilities

No new core changes needed.

## Notes

- Start simple: just list rendering with filter
- No drawers needed for search results
- Site detection in content.js will check URL hostname
- Google may change selectors; document in SCRAPING.md for maintenance
