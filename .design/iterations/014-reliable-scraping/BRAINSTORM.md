# Brainstorm - Iteration 014: Reliable Scraping Strategy

## Problem

The current scraping approach has race condition issues:
- Content scripts run in an isolated world, can't access `window.ytInitialData`
- Script injection timing is unreliable
- Fetch interception doesn't work from isolated world
- Videos don't all load on initial render

## Research: How Other Extensions Do It

### Unhook Extension
- Runs at `document_start`
- Uses `web_accessible_resources` to inject script into main world
- Listens for YouTube events: `yt-page-data-updated`, `state-navigateend`
- Uses `window.addEventListener("load", ...)` and `document.readyState === "complete"`
- Uses MutationObserver for DOM changes
- Communicates via DOM attributes on `document.documentElement`

### DeArrow Extension (Key Insight!)
- Uses **`"world": "MAIN"`** in manifest content_scripts - MV3 feature!
- This runs the content script directly in the page's JavaScript context
- Can access `window.ytInitialData` directly
- Can intercept `window.fetch` directly
- Listens for: `yt-player-updated`, `yt-navigate-start`, `yt-navigate-finish`
- Polls for `ytInitialData` with setInterval until available
- Patches `customElements.define` to detect new elements

## Key YouTube Events

1. **`yt-navigate-start`** - Fired when navigation begins (SPA navigation)
2. **`yt-navigate-finish`** - Fired when navigation completes, data is ready
3. **`yt-page-data-updated`** - Fired when page data changes
4. **`yt-player-updated`** - Fired when player is ready
5. **`state-navigateend`** - Alternative navigation event (mobile)

## Proposed New Strategy

### Option A: Two-Script Architecture (Recommended)
1. **Main world script** (`"world": "MAIN"`) - captures data from YouTube
   - Runs at `document_start`
   - Has direct access to `window.ytInitialData`, `window.fetch`, YouTube events
   - Sends data to content script via CustomEvent or DOM attribute
   
2. **Isolated content script** - renders UI
   - Receives data from main world script
   - Manages DOM overlay and keyboard handling
   - Doesn't need to scrape anything

### Option B: DOM-Only Strategy
- Don't try to intercept data at all
- Wait for DOM to fully load
- Scrape all video info from DOM elements only
- Simpler but may miss some metadata

### Option C: Hybrid with Wait
- Start with DOM scraping
- Wait for `yt-navigate-finish` event or DOM stabilization
- Re-scrape when more content loads
- Use MutationObserver for dynamic content

## Decision: Go with Option A

**Rationale:**
- `"world": "MAIN"` is the cleanest MV3 solution
- Direct access to `ytInitialData` gives us complete, reliable data
- YouTube events ensure we respond to SPA navigation correctly
- DeArrow proves this approach works reliably

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ YouTube Page (Main World)                                    │
│                                                              │
│  ┌──────────────────────────┐                               │
│  │ data-bridge.js           │ ◄─── runs in MAIN world       │
│  │ - captures ytInitialData │                               │
│  │ - intercepts fetch       │                               │
│  │ - listens for YT events  │                               │
│  └──────────┬───────────────┘                               │
│             │ CustomEvent                                    │
│             ▼                                                │
│  ┌──────────────────────────┐                               │
│  │ content.js               │ ◄─── runs in ISOLATED world   │
│  │ - receives data          │                               │
│  │ - renders TUI overlay    │                               │
│  │ - handles keyboard       │                               │
│  └──────────────────────────┘                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Steps

1. Create `src/data-bridge.js` - main world script
2. Update `manifest.json`:
   - Add data-bridge.js with `"world": "MAIN"`
   - Keep content.js in isolated world
3. Update data provider to receive from bridge
4. Remove complex script injection code
5. Wait for data before showing UI

## Simplifications

- Remove `main-world-bridge.js` (complex injection)
- Remove `fetch-intercept.js` (doesn't work in isolated world)
- Remove script tag parsing fallback
- Single source of truth: main world bridge

## Data Flow

```
1. Page loads
2. data-bridge.js runs (MAIN world, document_start)
3. Bridge polls for ytInitialData OR listens for yt-navigate-finish
4. When data ready: sends CustomEvent with full data
5. content.js receives event, stores in data provider
6. UI renders with complete data
7. On SPA navigation: yt-navigate-finish fires, bridge sends new data
```

## Success Criteria

- All videos load on initial render
- No race conditions
- Works on all YouTube pages (home, search, channel, etc.)
- Handles SPA navigation correctly
- No "Using DOM fallback" in console
