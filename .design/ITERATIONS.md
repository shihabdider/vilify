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

## Iteration 4: Bug Fixing (IN PROGRESS)

**Date:** January 28, 2026  
**Version:** 0.1.6 → 0.1.10  
**Design:** `.design/iterations/004-bugfix/`

### Goals
Fix known bugs from Iteration 3, focusing on scraping issues.

### Root Cause Analysis
See `.design/iterations/004-bugfix/ANALYSIS.md` for detailed comparison.

**TL;DR**: Race condition - extension scrapes once, but YouTube loads DOM asynchronously.
- Userscript: content polling every 200ms, watch page retries 10x @ 500ms, comment retries
- Extension: one-shot scrape, no retry logic

### Priority 1: Scraping
- [x] Content polling/retry logic (v0.1.7)
- [x] Watch page metadata retry (v0.1.7)
- [x] Comment loading retry (v0.1.7)
- [ ] Home page scraping - needs testing
- [ ] History page scraping - needs testing
- [ ] Library page scraping - needs testing

### Changes in v0.1.7

**`src/core/index.js`:**
- Added `startContentPolling()` / `stopContentPolling()` 
- Polls every 200ms on listing pages
- Re-renders when video count changes (and not loading)
- Starts after init and after navigation (non-watch pages)

**`src/sites/youtube/index.js`:**
- Added `renderWatchWithRetry()` with retry loop
- Retries up to 10 times @ 500ms if metadata missing
- Shows "Loading video info... (X/10)" during retries

**`src/sites/youtube/watch.js`:**
- Already had `scheduleCommentRetry()` - retries 5x @ 1000ms

### Changes in v0.1.8

**Bug 1: History page scraping**
- **Root cause**: `scrapeHomeLayout()` queried `ytd-rich-item-renderer` first, but on history page `yt-lockup-view-model` is NOT inside `ytd-rich-item-renderer` (198 videos exist standalone)
- **Fix**: Renamed to `scrapeLockupLayout()`, now queries `yt-lockup-view-model` directly

**Bug 2: Comment status detection**
- **Root cause**: `getCommentStatus()` returned 'loading' if ANY spinner exists, but spinners exist inside `ytd-continuation-item-renderer` (for loading more replies) even when initial comments ARE loaded
- **Fix**: Check if comments exist first; only return 'loading' if no comments AND spinner in main section

### Changes in v0.1.9

**Bug 3: Comments showing "No comments yet"**
- **Root cause**: `scheduleCommentRetry` stopped retrying when `status === 'loaded'`, but status could be 'loaded' with 0 comments if YouTube removed spinner before populating DOM
- **Fix**: Only stop retrying when `comments.length > 0` or `status === 'disabled'`; increased retries to 8 @ 800ms

**Bug 4: Comment pagination not working**
- **Root cause**: `nextCommentPage` used `pageStarts.length` to determine max page, but `pageStarts` was never updated
- **Fix**: Calculate max page dynamically from actual `comments.length / COMMENTS_PER_PAGE`

**Bug 5: Comment box not stretching**
- **Fix**: Added flexbox layout to watch page content area; comments box now stretches to fill remaining space above status bar

**Bug 6: History page missing channel names**
- **Root cause**: On history page, channel name is a span (no `<a>` link), but scraper only looked for links
- **Fix**: Fallback to first metadata text if no channel link found

### Changes in v0.1.10

**Bug 7: Comments not loading automatically**
- **Root cause**: `scheduleCommentRetry` wasn't being called when `status === 'loaded'` but 0 comments (early state before YouTube populates DOM)
- **Fix**: Now also schedules retry if `comments.length === 0` regardless of status

**Bug 8: Only showing 4 comments**
- **Root cause**: Fixed `COMMENTS_PER_PAGE = 5` regardless of available height
- **Fix**: Dynamic height-based pagination like userscript:
  - Add comments one by one until `scrollHeight > availableHeight`
  - Track `commentPageStarts` array for each page's starting index
  - Estimate total pages based on average comments per page

**Bug 9: Comments more reliable loading**
- **Fix**: Added `MutationObserver` on `ytd-comments` container (like userscript)
- Detects when YouTube adds comment elements to DOM
- Combined with timer-based retry as backup
- Reset observer and `commentPageStarts` when navigating to new video

### Priority 2: Watch Page
- [ ] Subscribe button layout
- [ ] Chapters picker content
- [ ] Description modal

### Priority 3: Navigation
- [ ] Key sequences (yy, yt, ya, zo, zc, g1, g2, gc)
- [ ] j/k navigation highlight
- [ ] Load more at bottom of list

### Testing Checklist
After reloading extension:
- [ ] Home page (`/`) - should show all videos, not just first few
- [ ] Subscriptions (`/feed/subscriptions`)
- [ ] History (`/feed/history`)
- [ ] Search results (`/results?search_query=...`)
- [ ] Watch page (`/watch?v=...`) - title/channel should load (may show retry count)
- [ ] Comments on watch page - should load after a few seconds

### Strategy
Port working code from userscript (`sites/youtube.user.js`) to extension, particularly:
- `Scraper.getVideos()` lines 310-420
- `Scraper.getVideoContext()` lines 422-480
- `Scraper.getComments()` lines 495-520
- `startContentPolling()` lines 1680-1720
