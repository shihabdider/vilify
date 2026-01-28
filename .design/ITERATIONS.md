# Vilify Iterations Log

## Project Overview

**Vilify** is a Vim-style focus mode overlay for websites, starting with YouTube. It replaces the native UI with a keyboard-driven interface.

### Key Files

| File | Purpose |
|------|---------|
| `.design/DATA.md` | Data type definitions (AppState, SiteConfig, YouTubeState, etc.) |
| `.design/BLUEPRINT.md` | Function signatures, examples, and templates (55 functions) |
| `.design/STYLES.md` | TUI visual design language (colors, patterns, layouts) |
| `.design/BRAINSTORM.md` | Initial problem clarification |
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
   - Split into too many files before having a working prototype
   - Created abstractions (SiteConfig, LayoutDef, etc.) that weren't validated
   - Spent time on architecture instead of feature parity

2. **Lost feature parity with userscript**
   - Original userscript has: filter, search, command palette, chapter picker, description modal, comment pagination with load more, proper keyboard handling
   - Extension only partially implemented these, with many broken

3. **Keyboard handling was fundamentally broken**
   - Mousetrap uses bubble phase; YouTube uses capture phase
   - Attempted fixes (capture blocker, stopCallback override) were band-aids
   - Should have studied the userscript's approach first (manual keydown listener with capture:true)

4. **Ignored the working reference**
   - The userscript (`sites/youtube.user.js`) already solves all these problems
   - Should have used it as the source of truth, not just "inspiration"

5. **Data model drift**
   - Created DATA.md with types, then didn't follow it
   - Added fields like `paletteOpen` that weren't in the spec
   - Should have used HTDP skills properly to validate changes

### Lessons for Next Iteration

1. **Start with the userscript as-is**
   - The userscript works. Don't rewrite it, wrap it.
   - Port it to extension with minimal changes first
   - Only then refactor incrementally

2. **One thing at a time**
   - Get keyboard working first (the hardest part)
   - Then get video listing working
   - Then watch page
   - Then modals
   - Test each before moving on

3. **Use capture phase for keyboard**
   - YouTube's player uses capture phase handlers
   - Must intercept at capture phase, not bubble phase
   - Don't use Mousetrap

4. **Feature parity checklist**
   - [ ] Focus mode toggle (Escape / ZZ)
   - [ ] Video listing with j/k navigation
   - [ ] Filter (/) with live filtering
   - [ ] Search (i) that navigates to YouTube search
   - [ ] Command palette (:) with fuzzy search
   - [ ] Watch page sidebar (video info + comments)
   - [ ] Comment pagination (ctrl+f/ctrl+b)
   - [ ] Load more comments on last page
   - [ ] Chapter picker (f)
   - [ ] Description modal (zo/zc)
   - [ ] Copy commands (yy, yt, ya, Y)
   - [ ] Navigation (gh, gs, gy, gl, gt, gc)
   - [ ] Playback (space, h, l, g1, g2)
   - [ ] Subscribe toggle (m)

5. **Test in browser frequently**
   - Don't batch up changes
   - Test each feature as it's implemented
   - Keep the feedback loop tight

---

## Iteration 2: Design Revision (IN PROGRESS)

**Date:** January 28, 2026
**Outcome:** Design updated, ready for implementation

### What We Did

Analyzed the working userscript against the existing design docs and identified gaps. Made decisions through discussion to align the design with the userscript while keeping multi-site extensibility.

### Key Decisions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Modal State | Single unified field in AppState, sites extend enum values | Only one modal open at a time |
| Keyboard | Custom capture-phase handler (no Mousetrap) | Mousetrap failed in Iteration 1, userscript approach works |
| State Shape | Split AppState + SiteState | Multi-site support requires site-specific state |
| Filter/Search | Renamed: `localFilter` (in-page) vs `siteSearch` (navigates) | Clarity, both patterns apply to multiple sites |
| Loading Screen | Core provides using SiteTheme, site provides optional logo | Reusable with site branding |
| Navigation Observer | Core detects URL changes, site handles reaction | Decoupled, site knows how to react |
| Content Polling | YouTube-specific | Each site's infinite scroll is different |
| Watch Page Retry | YouTube-specific | YouTube-specific loading quirks |
| Comment Loading | YouTube-specific | YouTube's lazy loading is unique |
| Default Settings | Core provides `onContentReady` callback | Pattern applies to other sites |

### Design Changes Made

**DATA.md:**
- ModalState: Unified enum (`null | 'palette' | 'chapters' | 'description'`)
- AppState: Renamed `filterActive/Query` → `localFilterActive/localFilterQuery`
- AppState: Renamed `searchActive/Query` → `siteSearchActive/siteSearchQuery`
- AppState: Added `paletteSelectedIdx`
- SiteConfig: Added `logo` and `onContentReady` fields
- YouTubeState: Removed `modalState` (now in AppState)
- Removed: `YouTubeModalState` type

**BLUEPRINT.md:**
- Removed: Mousetrap functions (`initKeyboard`, `bind`)
- Added Core: `setupKeyboardHandler`, `handleKeyEvent` (capture-phase)
- Added Core: `showLoadingScreen`, `hideLoadingScreen`
- Added Core: `setupNavigationObserver`
- Added Core: `openLocalFilter`, `closeLocalFilter`, `openSiteSearch`, `closeSiteSearch`
- Added YouTube: `startYouTubeContentPolling`, `stopYouTubeContentPolling`
- Added YouTube: `waitForWatchPageContent`, `triggerCommentLoad`, `applyDefaultVideoSettings`
- Added YouTube: `nextCommentPage`, `prevCommentPage`, `loadMoreComments`
- Updated totals: 55 functions (18 pure, 37 I/O)

**STYLES.md (new):**
- No header - content goes edge-to-edge, status bar at bottom only
- Vim-like status bar with mode badge: `[NORMAL]`, `[FILTER]`, `[SEARCH]`, `[COMMAND]`
- Input field in status bar when in FILTER/SEARCH/COMMAND mode
- Messages displayed on right side of status bar (replaces toasts)
- Bottom drawer pattern for all modals (command palette, chapters, description, filter results)
- Context-aware hints (`[j/k] [↵] [esc]`) only shown when drawer is open
- Sidebar on watch page keeps contextual hints (`[m] subscribe`, `[zo] desc`, `[f] chap`)
- TUI box pattern with inline labels preserved (`─ video ─`, `─ comments ─`)

### Next Steps

1. **Set up extension structure** - manifest.json, entry point, build config
2. **Implement Core** - State, keyboard handler, loading screen, navigation observer
3. **Port YouTube** - Scrapers, commands, layouts from userscript
4. **Test incrementally** - Each feature before moving on

### How to Continue

1. Read `.design/DATA.md` for type definitions
2. Read `.design/BLUEPRINT.md` for function specs
3. Read `.design/STYLES.md` for UI patterns and ASCII mockups
4. Read `.design/SCRAPING.md` for YouTube DOM selectors (verified Jan 28, 2026)
5. Use `htdp-implement` skill → `htdp-implementer` subagent for implementation
6. Use `htdp-verify` skill → `htdp-verifier` subagent for testing

**Important UI differences from userscript:**
- No header (userscript has header with logo)
- Status bar replaces toasts for messages
- Bottom drawer replaces centered modals
- Mode badge in status bar (vim-like)
