# Vilify Chrome Extension

## Problem
- Monolithic 2200-line Tampermonkey script is hard to maintain
- Can't share code between sites (each site duplicates everything)
- Installation friction (users need Tampermonkey + individual scripts)

## Solution
Chrome extension (MV3) with modular architecture:
- Core components (palette, modals, keyboard, styles) shared across sites
- Site-specific code isolated (scraping, commands)
- Single install from Chrome Web Store

## Success Criteria
- New site addable in ~50 lines (just site-specific scraping + commands)
- Single install from Chrome Web Store
- Core UI components reusable
- YouTube fully working with feature parity to current script

## Constraints
- Chrome-only for now
- Manifest V3
- No build tools (vanilla JS, ES modules where supported)
- Mousetrap library for keyboard handling
- Custom CSS (keep existing TUI/Solarized Dark aesthetic)
- Extension at repo root (manifest.json in vilify/, not vilify/extension/)

## Scope

### v1 (Now)
- YouTube fully ported and working
- Modular structure that reveals what's core vs site-specific

### Later
- Site template based on learnings from YouTube port
- Additional sites
- Chrome Web Store publishing
- **Cross-page filter/search**: Filter content from other pages without navigating (e.g., search history while on watch page). Approach: intercept internal API responses (`/youtubei/v1/browse`) and build local index. Same pattern for Gmail, etc. Requires architecture where filter accepts items from any source, not just current DOM.
