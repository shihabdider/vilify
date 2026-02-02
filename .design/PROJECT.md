# Vilify

> Vim-style focus mode overlay that replaces native website UIs with keyboard-driven interfaces.

## Vision

Replace cluttered, mouse-driven website interfaces with clean, keyboard-driven overlays. Each site gets a bespoke implementation that feels native while following consistent patterns across all supported sites.

## Problem

Modern websites are designed for mouse-driven interaction with visual noise that competes for attention. Power users who prefer keyboard navigation are forced to use clunky browser extensions that treat all sites the same way.

Vilify provides deep, site-specific integrations where each site gets carefully crafted keyboard commands and a consistent TUI aesthetic (Solarized Dark).

## Key Concepts

| Term | Definition |
|------|------------|
| Focus Mode | The overlay that replaces native site UI with our keyboard-driven interface |
| Drawer | Bottom sheet modal (command palette, chapters, transcript, description) |
| Listing | Scrollable list of content items (videos, emails, etc.) with selection |
| Behavior | Testable user-facing requirement (B1, B2, etc.) |
| Scraper | Code that extracts structured data from site's DOM |
| Content Item | Generic item in a listing (video, email, search result) |
| Command | Action available in command palette |
| DataProvider | Abstraction for fetching structured data (API intercept + DOM fallback) |

## Architecture

### Modules

| Module | Responsibility | Can Import |
|--------|----------------|------------|
| `src/core/` | Site-agnostic primitives (keyboard engine, drawer, state, layout, sort) | - |
| `src/sites/youtube/` | YouTube scraping, commands, keymaps, watch page layout, drawers | core |
| `src/sites/[future]/` | Future site implementations | core |

### Dependency Rules

- **Core MUST NOT import from sites/*** - Core is site-agnostic
- **Core MUST NOT contain site-specific logic** - No YouTube concepts in core
- **Sites configure core primitives** - Sites provide keymaps, scrapers, commands to core engines

### Key Files

| Path | Purpose |
|------|---------|
| `src/core/index.js` | Main orchestration (init, render, polling, navigation) |
| `src/core/keyboard.js` | Keyboard engine (capture phase, key sequences) |
| `src/core/layout.js` | Focus mode overlay, status bar, listing component |
| `src/core/state.js` | AppState management |
| `src/core/drawer.js` | Drawer primitives (list drawer, content drawer factories) |
| `src/core/palette.js` | Command palette filtering and rendering |
| `src/core/sort.js` | List sorting with Vim-style prefix matching |
| `src/core/view.js` | DOM utilities, scroll, selection |
| `src/core/loading.js` | Loading screen component |
| `src/core/navigation.js` | SPA navigation observer |
| `src/core/actions.js` | Copy/navigate utility functions |
| `src/sites/youtube/index.js` | YouTube SiteConfig |
| `src/sites/youtube/scraper.js` | YouTube DOM scraping (videos, chapters, comments) |
| `src/sites/youtube/commands.js` | YouTube commands and keymaps |
| `src/sites/youtube/player.js` | Video player controls |
| `src/sites/youtube/watch.js` | Watch page layout |
| `src/sites/youtube/transcript.js` | Transcript fetching via DOM scraping |
| `src/sites/youtube/items.js` | Custom item rendering (two-column with views/duration) |
| `src/sites/youtube/drawers/index.js` | YouTube drawer exports and handler factory |
| `src/sites/youtube/drawers/chapters.js` | Chapter picker drawer |
| `src/sites/youtube/drawers/description.js` | Description drawer |
| `src/sites/youtube/drawers/transcript.js` | Transcript drawer |
| `src/sites/youtube/data/index.js` | DataProvider abstraction |
| `src/sites/youtube/data/fetch-intercept.js` | Fetch interception for API data |
| `src/sites/youtube/data/extractors.js` | Data extraction from API responses |
| `src/sites/youtube/data/dom-fallback.js` | DOM scraping fallback |

### Supporting Design Docs

| Path | Purpose |
|------|---------|
| `.design/DATA.md` | Master type definitions with module assignments |
| `.design/ARCHITECTURE.md` | ASCII diagrams showing type relationships and module organization |
| `.design/HTDP-ANALYSIS.md` | HtDP World model analysis and proposed refactoring |
| `.design/STYLES.md` | TUI visual design language (Solarized Dark, patterns) |
| `.design/SCRAPING.md` | YouTube DOM selectors (verified Jan 28, 2026) |

## Iterations

### Completed

| # | Name | Summary |
|---|------|---------|
| 001 | chrome-extension-attempt | Failed attempt with Mousetrap, scrapped |
| 002 | design-revision | Updated DATA.md, BLUEPRINT.md, STYLES.md, SCRAPING.md |
| 003 | fresh-implementation | Basic structure working, core + youtube modules |
| 004 | bugfix | Content polling, watch page retry, comment loading |
| 005 | audit | Found missing modal UIs, implemented description/chapter drawers |
| 006 | watch-fixes | Watch page keybindings, status feedback, filter drawer |
| 007 | list-pages | Instant scroll, loading on nav, search scraping, filter routing |
| 008 | filter-keybindings | Arrow keys/Enter work in filter mode on listing pages |
| 009 | module-boundaries | Move YouTube-specific code out of core (modals.js, state.js, keyboard.js) |
| 010 | scraping-engine | Robust scraping with declarative selectors, MutationObserver |
| 011 | youtube-transcripts | View, search, and navigate video transcripts |
| 012 | metadata-display | Show views/duration in listings, fix watch page metadata |
| 013 | page-scrapers | Fetch interception, page-specific extractors, comment loading fix |
| 014 | reliable-scraping | Improved scraping reliability |
| 015 | watch-ux | Subscribe button kbd styling, updateSubscribeButton fix |
| 016 | drawer-cleanup | Unified drawer architecture, deleted modals.js, renamed 'filter' to 'recommended' |
| 017 | channel-videos-navigation | `gc` goes to channel/videos, lazy loading trigger on listing pages |
| 018 | gg-G-navigation | `gg` goes to top, `G` goes to bottom of list |
| 020 | list-sorting | Sort listings via `:sort` command with Vim-style prefix matching |

### In Progress

| # | Name | Summary |
|---|------|---------|
| 021 | htdp-refactor | Unify AppState + pure transitions (HtDP World model alignment) |

## Current Issues

### Scraping Issues

- Channel page sometimes fails to detect videos initially
- Timing-dependent (works after re-render via content polling)

### Minor UX Issues

- Transcript availability detection could be improved (some videos with captions show "No transcript available")

## Conventions

- **Behaviors are enumerated** with IDs (B1, B2) and test methods
- **Types have module assignments** (Where column in DATA.md)
- **Implementation is behavior-driven** with wave-based execution
- **Self-reflection checkpoint** before each phase transition
- **Version increment** on user script changes (patch/minor/major per AGENTS.md)

## Quick Start (for Subagents)

1. **Understand the project**: Read Vision and Architecture above
2. **Find current work**: Check `iterations/` for in-progress iteration
3. **Load context**:
   - `iterations/NNN/BRAINSTORM.md` - current scope and behaviors
   - `iterations/NNN/IMPLEMENT.md` - execution status
   - `DATA.md` - type definitions (extract relevant only)
4. **Key reference**: Check `src/sites/youtube/index.js` for SiteConfig structure
5. **Follow conventions**: Behavior-driven, wave-based, self-reflect before transitions
6. **Build/test**: `npm run build` then reload extension in Chrome

## Build & Test

```bash
npm run build    # Build once (esbuild)
npm run watch    # Watch mode for development

# Load in Chrome:
# 1. chrome://extensions
# 2. Enable Developer mode
# 3. Load unpacked → select project folder
# 4. Refresh YouTube to test
```

## TODO

Future work and ideas:

1. ~~Subscribe button itself should contain the key hint `[M]`~~ ✓ Done
2. ~~Go to channel (`gc`) should go to the channel videos link instead of just the channel page (should also handle lazy loading more videos)~~ ✓ Done (iteration 017)
3. ~~Add ability to sort on lists (alphabetical title, channel, by upload date, views, duration)~~ ✓ Done (iteration 020)
4. ~~Show views and duration in listings~~ ✓ Done (iteration 012)
5. ~~Bug: upload date missing in the watch page~~ ✓ Done (iteration 012)
6. ~~Implement `gg` and `G` to go to top or bottom of the list~~ ✓ Done (iteration 018)
7. ~~Bug: sometimes comments don't all load on initial load~~ ✓ Fixed (iteration 013)
8. ~~UX improvements for watch page video metadata container - subscribe button kbd styling, layout/spacing, visual hierarchy~~ ✓ Done (iteration 015)
9. Improve transcript detection (some videos have captions but transcript panel won't open)
10. Add keyboard hints for playback speed controls in command palette
11. Consider persisting sort preference per page type
