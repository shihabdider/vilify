# Handoff: Vilify Chrome Extension

## Current Status

**HTDP Phase:** Implementation - Debugging
**Last Action:** Got basic video scraping working, but many features broken
**Blocker:** Keybindings and UI don't match userscript behavior

---

## What's Working

- ✅ Extension loads in Chrome
- ✅ Video scraping on home page (24 videos found)
- ✅ UI auto-launches (focus mode active by default)
- ✅ Basic j/k navigation triggers (but selection visual broken)
- ✅ Build system (esbuild)

## What's Broken

### Keybindings
- `/` should open filter - NOT IMPLEMENTED
- `i` should open search - NOT IMPLEMENTED  
- `:` should open command palette - NOT IMPLEMENTED
- `gy` should go to history - currently `g i` (wrong, and uses spaces)
- `f` should open chapters - currently does fullscreen
- `space` should play/pause - NOT WORKING
- Mousetrap bindings use spaces (`g h`) but userscript uses no spaces (`gh`)

### Watch Page
- Video not visible (overlay covers it) - sidebar layout CSS added but not working
- Status bar should span full width, not just sidebar
- YouTube header still visible (should be hidden)
- Comments stuck on "loading..."
- Default playback speed should be 2x

### UI
- Command palette doesn't open
- Filter input doesn't show
- Search input doesn't show
- Hotkey badges show wrong keys (e.g., shows `c` for chapters instead of `f`)

---

## Key Files

```
vilify/
├── manifest.json           # v0.1.5
├── package.json            # esbuild + mousetrap
├── content.js              # Entry point
├── core/
│   ├── state.js            # ✅ Working
│   ├── dom.js              # ✅ Working  
│   ├── navigation.js       # ✅ Working
│   ├── keyboard.js         # ❌ NEEDS REWORK - use Mousetrap properly
│   ├── actions.js          # ✅ Working
│   ├── palette.js          # ❌ Not wired up
│   ├── status-bar.js       # ⚠️ Partial
│   ├── layout.js           # ⚠️ Partial - watch page broken
│   ├── orchestration.js    # ⚠️ Partial - missing filter/search/palette
│   └── styles.css          # ⚠️ Partial - watch page CSS not working
├── sites/youtube/
│   ├── config.js           # ⚠️ Needs updates
│   ├── state.js            # ✅ Working
│   ├── scrape.js           # ✅ Working
│   ├── player.js           # ⚠️ Not tested
│   ├── commands.js         # ❌ Wrong keybindings
│   └── layout.js           # ⚠️ Comments broken
└── dist/content.js         # Bundled output
```

---

## Userscript Reference

The working userscript is at `sites/youtube.user.js` (~2200 lines).

### Correct Keybindings (from userscript)
```javascript
// Single keys
'/' → filter (on listing pages) or open palette (on watch)
':' → command palette
'i' → search
'j' → move down
'k' → move up
'f' → chapters (on watch page)
'Escape' → close modal / exit focus mode

// Two-key sequences (NO SPACES)
'gh' → home
'gs' → subscriptions
'gy' → history
'gl' → library
'gt' → trending
'gw' → watch later (not in userscript, may not exist)
'gc' → channel (on watch page)
'g1' → playback rate 1x
'g2' → playback rate 2x
'yy' → copy URL
'yt' → copy title
'ya' → copy title + URL
'zo' → open description
'zc' → close description
'ZZ' → exit focus mode
```

### Userscript Key Handling
The userscript does NOT use Mousetrap. It builds key sequences manually:
1. On keydown, appends to `keySeq` string
2. Checks if `keySeq` matches any sequence
3. Has 500ms timeout to reset `keySeq`

However, **we want to use Mousetrap** for cleaner code. Mousetrap supports:
- Single keys: `Mousetrap.bind('/', callback)`
- Sequences: `Mousetrap.bind('g h', callback)` (with space = press g, release, press h)

**The issue:** Mousetrap's sequence format uses spaces, but we were binding wrong.

---

## How to Fix (Next Session)

### 1. Fix Mousetrap Bindings
```javascript
// Single keys - bind directly
Mousetrap.bind('/', openFilter);
Mousetrap.bind('i', openSearch);
Mousetrap.bind(':', openCommandPalette);
Mousetrap.bind('escape', handleEscape);
Mousetrap.bind('j', moveDown);
Mousetrap.bind('k', moveUp);
Mousetrap.bind('space', togglePlayPause);
Mousetrap.bind('f', openChapters);  // on watch page

// Sequences - Mousetrap uses spaces
Mousetrap.bind('g h', goHome);
Mousetrap.bind('g s', goSubscriptions);
Mousetrap.bind('g y', goHistory);
Mousetrap.bind('y y', copyUrl);
Mousetrap.bind('y t', copyTitle);
// etc.
```

### 2. Wire Up Filter/Search/Palette
- Add state for `filterActive`, `searchActive`, `paletteOpen`
- Create UI elements for filter input, search input
- Handle input events
- Render filtered results

### 3. Fix Watch Page Layout
- Look at userscript CSS for `body.vilify-focus-mode.vilify-watch-page`
- Video player should be visible on left
- Vilify sidebar on right (350px)
- Status bar spans full width at bottom
- Hide YouTube's native header

### 4. Fix Comments
- The scraper returns `{ status: 'loading' }` when comments section hasn't loaded
- Need retry logic or scroll trigger to load comments

### 5. Set Default Speed
- On watch page init, call `setPlaybackRate(2)`

---

## Commands to Resume

```bash
cd /Users/user1/projects/vilify
npm run build          # Build extension
# Then reload in chrome://extensions/
```

---

## Design Documents

- `.design/BRAINSTORM.md` - Goals, scope, decisions
- `.design/DATA.md` - Type definitions
- `.design/BLUEPRINT.md` - Function signatures

---

## Key Design Principle

The goal is **modular architecture** where:
- Core modules are reusable across sites
- Adding a new site requires ~50 lines of config
- YouTube is the reference implementation for v1

Don't copy-paste from userscript. Keep the abstraction, fix the implementation.
