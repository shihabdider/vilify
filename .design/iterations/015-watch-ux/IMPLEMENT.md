# 015 - Watch Page UX Implementation

## Status: ✓ Complete (v0.5.17)

## Final Design

```
(when subscribed:)
┌─ video ────────────────────────────────────────┐
│                                                │
│  Revenge | Mr. Robot                           │
│                                                │
│  Mr. Robot · subscribed                        │  <- GREY
│  Oct 10, 2020 · 255k views · 6:07              │
│                                                │
│  [M] unsub  [zo] desc  [f] ch  [t] transcript  │  <- all muted
│                                                │
└────────────────────────────────────────────────┘

(when NOT subscribed:)
│  Mr. Robot · subscribe                         │  <- RED
│  Oct 10, 2020 · 255k views · 6:07              │
│                                                │
│  [M] sub  [zo] desc  [f] ch  [t] transcript    │  <- all muted
```

## Changes Made

### 1. New Layout (`src/sites/youtube/watch.js`)

- Removed old subscribe button from channel row
- Added subscription status inline with channel name ("· subscribed" grey / "· subscribe" red)
- Created unified action row with all hints: `[M] sub/unsub`, `[zo] desc`, `[f] ch`, `[t] transcript`
- Action hints are always muted (kbd + text)

### 2. Fixed Subscription State (`src/sites/youtube/data/index.js`)

- `getVideoContext()` now always gets `isSubscribed` from DOM
- Previously it was using ytInitialData which doesn't contain subscription info, causing state to reset after load

### 3. Fixed Unsubscribe Confirmation (`src/sites/youtube/commands.js`)

- Updated `toggleSubscribe()` with robust selectors for YouTube's confirmation dialog
- Added multiple fallback selectors and text-based button finding
- Properly handles the "Unsubscribe from X?" confirmation modal

### 4. Wired Up State Changes (`src/core/keyboard.js`)

- `updateSubscribeButton()` now updates both `#vilify-sub-status` and `#vilify-sub-action`

### 5. Channel Name Truncation (v0.5.17)

- Channel name now truncates with ellipsis when too long
- Subscribe status indicator stays visible on same line
- Uses flexbox layout: channel name shrinks, status stays fixed

## Files Modified

- `src/sites/youtube/watch.js` - New layout, CSS, render functions
- `src/sites/youtube/data/index.js` - Fix isSubscribed from DOM
- `src/sites/youtube/commands.js` - Fix unsubscribe confirmation
- `src/core/keyboard.js` - Update subscribe button handler
- `package.json` / `manifest.json` - Version 0.5.17
