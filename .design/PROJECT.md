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
| Drawer | Bottom sheet modal (command palette, chapters, filter, description) |
| Listing | Scrollable list of content items (videos, emails, etc.) with selection |
| Behavior | Testable user-facing requirement (B1, B2, etc.) |
| Scraper | Code that extracts structured data from site's DOM |
| Content Item | Generic item in a listing (video, email, search result) |
| Command | Action available in command palette |

## Architecture

### Modules

| Module | Responsibility | Can Import |
|--------|----------------|------------|
| `src/core/` | Site-agnostic primitives (keyboard engine, drawer, state, layout) | - |
| `src/sites/youtube/` | YouTube scraping, commands, keymaps, watch page layout | core |
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
| `src/core/modals.js` | Drawer primitives (palette, description, chapters, filter) |
| `src/core/view.js` | DOM utilities, scroll, selection |
| `src/sites/youtube/index.js` | YouTube SiteConfig |
| `src/sites/youtube/scraper.js` | YouTube DOM scraping (videos, chapters, comments) |
| `src/sites/youtube/commands.js` | YouTube commands and keymaps |
| `src/sites/youtube/player.js` | Video player controls |
| `src/sites/youtube/watch.js` | Watch page layout |
| `sites/youtube.user.js` | Reference userscript (working implementation) |

### Supporting Design Docs

| Path | Purpose |
|------|---------|
| `.design/DATA.md` | Master type definitions with module assignments |
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

### In Progress

(none)

### Planned

| # | Name | Summary | Design |
|---|------|---------|--------|
| 009 | module-boundaries | Move YouTube-specific code out of core (modals.js, state.js, keyboard.js) | BRAINSTORM ✓ |
| 010 | scraping-engine | Robust scraping with declarative selectors, wait/retry strategies, MutationObserver | BRAINSTORM ✓ |

## Current Issues

### Module Boundary Violations

Code in `src/core/` that should be in `src/sites/youtube/`:
- `modals.js`: Contains `renderChapterModal()`, `renderDescriptionModal()` - YouTube-specific
- `state.js`: Contains `createYouTubeState()` - YouTube-specific
- `keyboard.js`: Hardcoded CHAPTERS, DESCRIPTION mode handling

### Missing from DATA.md

- Drawer type (generic drawer primitive)
- Keymap types (ModeKeymap, KeymapConfig)
- ScraperConfig types

### Keybinding Issues

- Arrow keys don't work in filter input on listing pages
- Enter doesn't select from filtered list
- Mode-specific key handling is scattered throughout keyboard.js

### Scraping Issues

- Channel page often fails to detect videos
- Timing-dependent (works after re-render)

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
4. **Key reference**: `sites/youtube.user.js` is the working userscript - use it as reference
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
