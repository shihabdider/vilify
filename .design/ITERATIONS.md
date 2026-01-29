# Vilify Iterations Log

## Project Overview

**Vilify** is a Vim-style focus mode overlay for websites, starting with YouTube. It replaces the native UI with a keyboard-driven interface.

### Key Files

| File | Purpose |
|------|---------|
| `.design/DATA.md` | Data type definitions (AppState, SiteConfig, YouTubeState, etc.) |
| `.design/BLUEPRINT.md` | Function signatures, examples, and templates (55 functions) |
| `.design/STYLES.md` | TUI visual design language (colors, patterns, layouts) |
| `.design/SCRAPING.md` | YouTube DOM selectors (verified Jan 28, 2026) |
| `sites/youtube.user.js` | **Working userscript** (v0.3.0) - the reference implementation |

### HTDP Workflow

For implementation, use these skills in order:
1. Read `htdp-implement` skill for implementation guidelines
2. Spawn `htdp-implementer` subagent for batch implementation
3. Read `htdp-verify` skill for verification guidelines
4. Spawn `htdp-verifier` subagent for testing

---

## Iteration 1: Chrome Extension Attempt (FAILED)

**Date:** January 28, 2026
**Versions:** 0.1.0 - 0.1.8
**Outcome:** Scrapped

### What We Tried
Attempted to convert the working YouTube userscript into a Chrome extension with:
- Modular architecture (core/ + sites/youtube/)
- Mousetrap for keyboard handling
- esbuild for bundling
- Separation of concerns (state, layout, orchestration, etc.)

### What Went Wrong

1. **Over-engineering from the start**
2. **Lost feature parity with userscript**
3. **Keyboard handling was fundamentally broken** (Mousetrap uses bubble phase)
4. **Ignored the working reference** (userscript)
5. **Data model drift**

### Lessons Learned
- Use capture phase for keyboard (YouTube uses capture)
- Don't use Mousetrap
- Test frequently, one thing at a time

---

## Iteration 2: Design Revision (COMPLETE)

**Date:** January 28, 2026
**Outcome:** Design docs updated

- Updated DATA.md, BLUEPRINT.md, STYLES.md
- Created SCRAPING.md with verified YouTube DOM selectors
- Key decisions: unified modal state, capture-phase keyboard, split AppState + SiteState

---

## Iteration 3: Fresh Implementation (IN PROGRESS)

**Date:** January 28, 2026
**Version:** 0.1.6
**Outcome:** Basic structure working, many bugs remain

### What Works
- ✅ Extension loads in Chrome
- ✅ Focus mode overlay renders
- ✅ Status bar with mode badge (NORMAL, FILTER, SEARCH, COMMAND)
- ✅ `:` opens command palette with functional input
- ✅ `/` opens filter mode with functional input
- ✅ `i` opens search mode with functional input
- ✅ Typing in input filters/searches
- ✅ Escape closes modals
- ✅ Arrow keys navigate palette
- ✅ Enter executes command/navigates
- ✅ Watch page blocks YouTube's native shortcuts (f, m, etc.)

### What's Broken

#### PRIORITY 1: Scraping (Major Issues)
- **Home page**: Only scrapes a few videos, doesn't wait for full page load
- **History page**: Doesn't scrape at all
- **Library page**: Doesn't scrape at all
- **Watch page metadata**: Often shows "Untitled" / "Unknown" - selectors not finding elements
- **Watch page comments**: Shows "Loading comments..." forever - lazy load trigger not working
- **Timing issue**: Videos sometimes appear after keypress instead of on initial load

**Root cause**: The scrapers in `src/sites/youtube/scraper.js` use selectors from SCRAPING.md but:
1. YouTube's DOM loads asynchronously - need better retry/wait logic
2. Different page types use different renderers (not all covered)
3. The `waitForContent()` function times out too early

**Reference**: The userscript (`sites/youtube.user.js`) has working scraper code:
- `Scraper.getVideos()` (lines 310-420) - multiple strategies
- `Scraper.getVideoContext()` (lines 422-480) - watch page metadata
- `Scraper.getComments()` (lines 495-520) - comments with retry
- Content polling with `startContentPolling()` (lines 1680-1720)

#### PRIORITY 2: Watch Page
- Subscribe button layout slightly off
- Chapters picker not implemented (modal exists but no content)
- Description modal not implemented
- Comment pagination (Ctrl+f/b) not wired up

#### PRIORITY 3: Other Features
- Key sequences on watch page (yy, yt, ya, zo, zc, g1, g2, gc) - need testing
- j/k navigation on listing pages - works but selection highlight may be off
- Load more videos when hitting bottom of list - not implemented

### File Structure
```
src/
  content.js           # Entry point
  core/
    index.js           # Main orchestration (initSite, render, event handlers)
    state.js           # AppState functions
    keyboard.js        # Keyboard handler (capture phase)
    view.js            # DOM utilities
    layout.js          # Focus mode layout, status bar with input
    loading.js         # Loading screen
    navigation.js      # URL change observer
    palette.js         # Command palette (bottom drawer)
    actions.js         # Copy, navigate
  sites/
    youtube/
      index.js         # YouTube site config
      scraper.js       # Video/chapter/comment scrapers ← NEEDS WORK
      commands.js      # YouTube commands + key sequences
      player.js        # Player controls
      watch.js         # Watch page layout
```

### Next Steps (for next session)

1. **Fix scraping** - This is the critical path
   - Study userscript's `Scraper` object (lines 300-550)
   - Port the multi-strategy approach for video scraping
   - Add content polling like userscript does
   - Fix watch page metadata selectors
   - Fix comment loading trigger

2. **Test on different YouTube pages**:
   - Home (`/`)
   - Subscriptions (`/feed/subscriptions`)
   - History (`/feed/history`)
   - Search results (`/results?search_query=...`)
   - Watch page (`/watch?v=...`)
   - Channel page (`/@...`)

3. **Wire up remaining features**:
   - Chapter picker content
   - Description modal
   - Comment pagination

### How to Continue

1. Load extension: Chrome → `chrome://extensions` → Load unpacked → select project folder
2. Open YouTube and check console for errors
3. Compare scraper behavior to userscript
4. Reference files:
   - `sites/youtube.user.js` - working reference (especially `Scraper` object)
   - `.design/SCRAPING.md` - verified DOM selectors
   - `src/sites/youtube/scraper.js` - current implementation to fix

### Build Commands
```bash
cd /Users/user1/projects/vilify
npm run build    # Build once
npm run watch    # Watch mode for development
```

---

## Iteration 4: Bug Fixing (COMPLETE)

**Date:** January 28, 2026  
**Version:** 0.1.6 → 0.1.27  
**Design:** `.design/iterations/004-bugfix/`

### Goals
Fix scraping race conditions and key binding issues from Iteration 3.

### Summary
Fixed async DOM scraping with content polling and retry logic. Fixed keyboard shortcuts.

### What Was Fixed
- [x] Content polling/retry logic for listing pages (v0.1.7)
- [x] Watch page metadata retry (v0.1.7)
- [x] Comment loading with MutationObserver + retry (v0.1.7-v0.1.26)
- [x] Home/History/Library page scraping
- [x] Subscribe button layout
- [x] Key sequences (yy, yt, zc, g1, g2, gc)
- [x] Changed `ya` to `Shift+Y` for copy URL at time (v0.1.27)

### Deferred to Future Iterations
- Chapters picker (`f`) - modal not implemented
- Description modal (`zo`) - modal not implemented  
- j/k navigation highlight refinement
- Load more at bottom of list

### Key Changes

**v0.1.7**: Content polling, watch page retry, comment retry  
**v0.1.8**: History page scraping, comment status detection  
**v0.1.9**: Comment pagination, flexbox layout  
**v0.1.10**: MutationObserver for comments  
**v0.1.26**: All comment issues resolved  
**v0.1.27**: Shift+Y shortcut, getSingleKeyActions interface

---

## Iteration 5: Implementation Audit (COMPLETE)

**Date:** January 28, 2026  
**Version:** 0.1.27 → 0.1.28  
**Design:** `.design/iterations/005-audit/`

### Goals
Audit the codebase against design docs to identify stubs and incomplete implementations.

### Summary
Audited all 56 BLUEPRINT functions - all were implemented. Found 2 missing modal UIs that were setting state but never rendered. Fixed both using bottom drawer pattern per STYLES.md.

### Issues Found & Fixed

1. **Description Modal (`zo`)** - state was set but nothing rendered
   - Added bottom drawer with j/k scrolling
   - New mode badge: [DESCRIPTION]

2. **Chapter Picker (`f`)** - state was set but nothing rendered
   - Added bottom drawer with fuzzy filter input
   - Arrow keys navigate, Enter jumps, Escape closes
   - New mode badge: [CHAPTERS]

3. **Mode badges** - getMode() only returned 4 modes
   - Added CHAPTERS and DESCRIPTION modes

4. **Outdated stub comment** - removed misleading comment in keyboard.js

### New Files
- `src/core/modals.js` - Description and chapter picker drawers

### Key Changes

**v0.1.27**: Initial modal implementations (floating)  
**v0.1.28**: Converted to bottom drawers, added filter input, fixed j/k in filter

### Files Modified
- `src/core/state.js` - getMode() returns 6 modes now
- `src/core/keyboard.js` - description scroll, chapter nav, filter input handling
- `src/core/index.js` - modal rendering, callbacks
- `src/sites/youtube/index.js` - added getDescription, getChapters, seekToChapter
- `.design/STYLES.md` - documented new modes and drawer patterns
