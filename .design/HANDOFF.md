# Handoff: Vilify Chrome Extension

## Current Status

**HTDP Phase:** Implementation (ready to start)
**Last Action:** Completed Blueprint phase - all function signatures and examples finalized
**Next Step:** Create file structure and implement functions

---

## Project Summary

Converting a Tampermonkey userscript to a Chrome Extension (MV3) for vim-style command palettes on websites.

### Goals
- Modular architecture (new site in ~50 lines)
- Single Chrome Web Store install
- Reusable core components
- YouTube fully working for v1

### Constraints
- Chrome-only for now
- Manifest V3
- No build tools (vanilla JS, ES modules)
- Mousetrap library for keyboard handling
- Custom TUI/Solarized Dark aesthetic

### Key Design Decisions

1. **Hybrid layouts**: Declarative ('listing', 'detail') for common cases, custom render functions for bespoke
2. **Hybrid item rendering**: Default rendering, optional `renderItem` override per site
3. **Per-site theming**: SiteTheme with CSS custom properties, accent color from site brand
4. **Inverted vim-style layout**: Content on top, command line + status bar at bottom (logo bottom-left)
5. **Status bar instead of toast**: Mode indicator + messages in bottom bar
6. **Core vs site-specific state**: AppState (core) + YouTubeState (site-specific)
7. **Chapters loaded upfront**: In VideoContext, show hotkey hint only if chapters exist
8. **Comments v1**: Top-level only, replies deferred to later
9. **Scrapers throw on failure**: For easier debugging
10. **Shorts filtered out**: getVideos() returns only regular videos
11. **Comments with status**: CommentsResult has 'loading' | 'disabled' | 'loaded'
12. **Mode is derived**: getMode(state) computes from modalState/filterActive
13. **Pure el()**: No event handlers in attributes, attach separately
14. **navigateList is pure**: Returns { index, boundary }, caller handles flash/loadMore

---

## Files Created

- `.design/BRAINSTORM.md` - Problem, solution, success criteria, scope
- `.design/DATA.md` - All data type definitions (Core + YouTube)
- `.design/BLUEPRINT.md` - All function signatures and examples

---

## Function Summary (44 total)

### Core (27 functions)
- **State (3)**: createAppState, resetState, getMode
- **View/DOM (7)**: el, clear, updateListSelection, showMessage, flashBoundary, navigateList, scrollHalfPage
- **Status Bar (1)**: renderStatusBar
- **Layout (3)**: renderFocusMode, renderListing, applyTheme
- **Keyboard (3)**: initKeyboard, bind, isInputElement
- **Orchestration (3)**: initSite, onNavigate, setupNavigationObserver
- **Actions (3)**: copyToClipboard, navigateTo, openInNewTab
- **Palette (4)**: openPalette, closePalette, renderPalette, filterItems

### YouTube (17 functions)
- **Scraping (6)**: getYouTubePageType, getVideoContext, getVideos, getChapters, getComments, getDescription
- **Commands (2)**: getYouTubeCommands, getYouTubeKeySequences
- **Player (6)**: togglePlayPause, seekRelative, setPlaybackRate, toggleMute, toggleFullscreen, seekToChapter
- **Layout (3)**: renderWatchPage, renderVideoInfo, renderComments

---

## Proposed File Structure

```
vilify/
├── manifest.json
├── lib/
│   └── mousetrap.min.js
├── core/
│   ├── state.js          # createAppState, resetState, getMode
│   ├── dom.js            # el, clear, updateListSelection, showMessage, flashBoundary
│   ├── navigation.js     # navigateList, scrollHalfPage
│   ├── status-bar.js     # renderStatusBar
│   ├── layout.js         # renderFocusMode, renderListing, applyTheme
│   ├── keyboard.js       # initKeyboard, bind, isInputElement
│   ├── orchestration.js  # initSite, onNavigate, setupNavigationObserver
│   ├── actions.js        # copyToClipboard, navigateTo, openInNewTab
│   ├── palette.js        # openPalette, closePalette, renderPalette, filterItems
│   └── styles.css        # Base styles, CSS custom properties
├── sites/
│   └── youtube/
│       ├── config.js     # SiteConfig for YouTube
│       ├── scrape.js     # getYouTubePageType, getVideoContext, getVideos, getChapters, getComments, getDescription
│       ├── commands.js   # getYouTubeCommands, getYouTubeKeySequences
│       ├── player.js     # togglePlayPause, seekRelative, setPlaybackRate, toggleMute, toggleFullscreen, seekToChapter
│       ├── layout.js     # renderWatchPage, renderVideoInfo, renderComments
│       └── state.js      # createYouTubeState, YouTubeState helpers
└── content.js            # Entry point, loads site-specific module
```

---

## UI Layout (Vim-style, inverted)

```
┌─────────────────────────────┐
│                             │
│         Content             │
│   (listing or watch page)   │
│                             │
├─────────────────────────────┤
│ :command or /filter         │  ← command line (input area)
│ [Logo]  NORMAL  Copied URL  │  ← status bar (mode + message)
└─────────────────────────────┘
```

---

## Implementation Order (Suggested)

1. **Manifest + entry point** - Get extension loading
2. **Core state** - createAppState, resetState, getMode
3. **Core DOM** - el, clear (foundational)
4. **Core layout** - renderFocusMode, applyTheme (see something on screen)
5. **Core status bar** - renderStatusBar
6. **Core keyboard** - initKeyboard, bind, isInputElement
7. **YouTube scrape** - getYouTubePageType (simplest)
8. **YouTube config** - Basic SiteConfig
9. **Core orchestration** - initSite (tie it together)
10. **Iterate from there** - Add features incrementally

---

## Reference: Existing Code

The original Tampermonkey script is at `sites/youtube.user.js` (~2200 lines). Key sections:
- Section 1: Data definitions (lines 1-90)
- Section 2: Constants & CSS (lines 90-400)
- Section 3: Model functions (pure logic)
- Section 4: Scraper functions (DOM reading)
- Section 5: View functions (rendering)
- Section 6: Actions (side effects)
- Section 7: Commands
- Section 8: App class (orchestration)

---

## To Resume

Load the htdp-implement skill and start with the manifest and file structure:

```
/skill htdp-implement
```

Or just say: "Let's start implementing Vilify from the handoff."
