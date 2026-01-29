# Function Blueprints - Iteration 006

## Overview

This iteration fixes watch page issues: keybindings, feedback messages, modal UX, and recommended video filtering.

---

## Modified Functions

### `updateListSelection : (Container, Selector, Index) -> void` [I/O]

**Change:** Use `behavior: 'instant'` instead of `'smooth'` for responsive keyboard navigation.

```javascript
// Before: smooth scrolling causes lag when holding arrow keys
updateListSelection(container, '.item', 5)
// scrollIntoView({ behavior: 'smooth' }) - creates 1s delay at viewport boundary

// After: instant scrolling for responsive feel
updateListSelection(container, '.item', 5)
// scrollIntoView({ behavior: 'instant' }) - no delay
```

---

### `toggleMute : () -> void` [I/O]

**Change:** Show feedback message after toggling.

```javascript
toggleMute()
// If was unmuted: mutes video, shows "Muted"
// If was muted: unmutes video, shows "Unmuted"
```

---

### `toggleCaptions : () -> void` [I/O]

**Change:** Show feedback message after toggling.

```javascript
toggleCaptions()
// Shows "Captions on" or "Captions off"
```

---

### `toggleFullscreen : () -> void` [I/O]

**Change:** Show feedback message after toggling.

```javascript
toggleFullscreen()
// Shows "Fullscreen" or "Exit fullscreen"
```

---

### `toggleTheaterMode : () -> void` [I/O]

**Change:** Show feedback message after toggling.

```javascript
toggleTheaterMode()
// Shows "Theater mode" or "Exit theater"
```

---

### `seekRelative : Number -> void` [I/O]

**Change:** Show feedback message with seek amount.

```javascript
seekRelative(10)   // Seeks forward, shows "+10s"
seekRelative(-10)  // Seeks backward, shows "−10s"
seekRelative(5)    // Seeks forward, shows "+5s"
seekRelative(-5)   // Seeks backward, shows "−5s"
```

---

### `setPlaybackRate : Number -> void` [I/O]

**Change:** Show feedback message with speed.

```javascript
setPlaybackRate(1)    // Shows "Speed: 1x"
setPlaybackRate(1.5)  // Shows "Speed: 1.5x"
setPlaybackRate(2)    // Shows "Speed: 2x"
```

---

### `toggleSubscribe : (VideoContext, onUpdate) -> void` [I/O]

**Change:** Show feedback message and ensure UI button updates.

```javascript
toggleSubscribe(ctx, onUpdate)
// If was unsubscribed: subscribes, shows "Subscribed to {channelName}", calls onUpdate(true)
// If was subscribed: unsubscribes, shows "Unsubscribed from {channelName}", calls onUpdate(false)

// onUpdate callback must refresh the subscribe button in the video info box
```

---

### `copyToClipboard : (String, String?) -> void` [I/O]

**Change:** Show contextual feedback message.

```javascript
copyToClipboard(url)                      // Shows "Copied URL"
copyToClipboard(url, "Copied URL at 2:34") // Shows "Copied URL at 2:34"
copyToClipboard(title, "Copied title")    // Shows "Copied title"
```

---

### `getYouTubeKeySequences : (AppCallbacks) -> Object` [PURE]

**Change:** Fix keybindings:
- `m` = mute (was subscribe)
- `c` = captions (new)
- `h` = seek -10s (new)
- `l` = seek +10s (new)
- `:q` = exit focus mode (new)

```javascript
getYouTubeKeySequences(app)
  => {
    // ... existing sequences ...
    'm': () => toggleMute(),           // Changed from subscribe
    'c': () => toggleCaptions(),       // New
    'h': () => seekRelative(-10),      // New
    'l': () => seekRelative(10),       // New
    ':q': () => app.exitFocusMode(),   // New
    // ... rest unchanged ...
  }
```

---

### `getYouTubeSingleKeyActions : (AppCallbacks) -> Object` [PURE]

**Change:** `Shift+M` = subscribe (moved from `m`).

```javascript
getYouTubeSingleKeyActions(app)
  => {
    'Y': () => copyVideoUrlAtTime(ctx),  // Existing
    'M': () => toggleSubscribe(ctx, app.updateSubscribeButton),  // New (was 'm')
  }
```

---

### `handleCommandNavigate : (Direction) -> void` [I/O]

**Change:** Flash at boundary instead of wrapping.

```javascript
// Before: wraps around
handleCommandNavigate('down')  // At last item -> goes to first item

// After: flashes at boundary
handleCommandNavigate('down')  // At last item -> stays, flashes boundary
handleCommandNavigate('up')    // At first item -> stays, flashes boundary
```

---

### `renderPalette : (Items, SelectedIdx) -> void` [I/O]

**Change:** Remove emojis, tighter spacing, key badges closer to labels.

```javascript
renderPalette([
  { group: 'navigation' },
  { label: 'Home', keys: 'G H', action: ... },      // No icon/emoji
  { label: 'Subscriptions', keys: 'G S', action: ... },
], 0)

// Renders:
// navigation
// > Home                                     [G H]
//   Subscriptions                            [G S]
//
// - No emoji/icon column
// - Group headers lowercase
// - Compact 8px vertical padding
// - Key badges right-aligned, minimal gap from label
```

---

### `renderChapterModal : (Chapters, SelectedIdx, onFilterChange) -> void` [I/O]

**Change:** Move filter input to bottom (like command palette).

```javascript
renderChapterModal(chapters, 0, onFilterChange)

// Before:
// ┌─────────────────────────────────┐
// │ Filter chapters..._             │  <- input at top
// ├─────────────────────────────────┤
// │ > 0:00  Introduction            │
// │   2:34  Main Topic              │
// └─────────────────────────────────┘

// After:
// ┌─────────────────────────────────┐
// │ > 0:00  Introduction            │
// │   2:34  Main Topic              │
// ├─────────────────────────────────┤
// │ chapters        [↑↓] [↵] [esc]  │
// ├─────────────────────────────────┤
// │ Filter chapters..._             │  <- input at bottom
// └─────────────────────────────────┘
```

---

### `handleChapterNavigation : (Direction) -> void` [I/O]

**Change:** Flash at boundary instead of doing nothing silently.

```javascript
handleChapterNavigation('down')  // At last chapter -> stays, flashes boundary
handleChapterNavigation('up')    // At first chapter -> stays, flashes boundary
```

---

### `renderDescriptionModal : (String) -> void` [I/O]

**Change:** Fix whitespace - collapse excessive blank lines, use proper pre-wrap.

```javascript
renderDescriptionModal(description)

// Before: Too much vertical whitespace from YouTube's formatting
// After: Collapse runs of 3+ newlines to 2, trim leading/trailing whitespace
```

---

## New Functions

### `getRecommendedVideos : () -> Array<ContentItem>` [I/O]

Scrape recommended/related videos from watch page sidebar.

```javascript
// On watch page with recommendations
getRecommendedVideos()
  => [
    { type: 'content', id: 'xyz', title: 'Related Video', 
      url: '/watch?v=xyz', thumbnail: '...', meta: 'Channel · 500K views', ... },
    { type: 'content', id: 'abc', title: 'Another Video',
      url: '/watch?v=abc', thumbnail: '...', meta: 'Other · 1M views', ... },
  ]

// Not on watch page or no recommendations
getRecommendedVideos()  => []
```

Template: Uses DOM scraping similar to `getVideos()`. Query `ytd-compact-video-renderer` elements in the secondary column.

---

### `renderFilterDrawer : (Items, SelectedIdx, Query, OnFilterChange, OnSelect) -> void` [I/O]

Render filter results as bottom drawer with thumbnails.

```javascript
renderFilterDrawer(videos, 0, 'topic', onFilterChange, onSelect)

// Renders:
// ┌─────────────────────────────────────────┐
// │ > [thumb] Matching Video Title          │
// │           Channel · 2 days ago          │
// │   [thumb] Another Match                 │
// │           Other Channel · 1 week ago    │
// ├─────────────────────────────────────────┤
// │ 2 results          [↑↓] nav [↵] [esc]   │
// ├─────────────────────────────────────────┤
// │ topic_                                  │
// └─────────────────────────────────────────┘
```

Template: Similar to `renderPalette` but with thumbnail support and result count.

---

### `exitFocusMode : () -> void` [I/O]

Exit focus mode overlay, restore normal YouTube UI.

```javascript
exitFocusMode()
// Removes #vilify-focus element
// Removes .vilify-focus-mode from body
// Removes .vilify-watch-page from body
// Restores YouTube's native UI visibility
```

---

### `updateSubscribeButton : (Boolean) -> void` [I/O]

Update subscribe button UI after subscription state changes.

```javascript
updateSubscribeButton(true)   // Shows "Subscribed" with muted style
updateSubscribeButton(false)  // Shows "Subscribe" with accent style
```

Template: Query `.vilify-subscribe-btn`, update text and class.

---

## Summary

| Function | Type | Change |
|----------|------|--------|
| `updateListSelection` | Modified | `behavior: 'instant'` |
| `toggleMute` | Modified | Add feedback message |
| `toggleCaptions` | Modified | Add feedback message |
| `toggleFullscreen` | Modified | Add feedback message |
| `toggleTheaterMode` | Modified | Add feedback message |
| `seekRelative` | Modified | Add feedback message |
| `setPlaybackRate` | Modified | Add feedback message |
| `toggleSubscribe` | Modified | Add feedback message, ensure UI update |
| `copyToClipboard` | Modified | Add contextual message |
| `getYouTubeKeySequences` | Modified | Fix m/c/h/l/:q bindings |
| `getYouTubeSingleKeyActions` | Modified | Shift+M = subscribe |
| `handleCommandNavigate` | Modified | Flash at boundary, no wrap |
| `renderPalette` | Modified | No emojis, tighter spacing |
| `renderChapterModal` | Modified | Input at bottom |
| `handleChapterNavigation` | Modified | Flash at boundary |
| `renderDescriptionModal` | Modified | Fix whitespace |
| `getRecommendedVideos` | New | Scrape recommended videos |
| `renderFilterDrawer` | New | Filter drawer with thumbnails |
| `exitFocusMode` | New | Exit focus mode |
| `updateSubscribeButton` | New | Update subscribe button UI |

**Totals:** 16 modified, 4 new = 20 functions

---

## Implementation Status

### Completed
- `updateListSelection` - instant scroll ✓
- `toggleMute` - feedback ✓
- `toggleCaptions` - feedback ✓
- `toggleFullscreen` - feedback ✓
- `toggleTheaterMode` - feedback ✓
- `seekRelative` - feedback ✓
- `setPlaybackRate` - feedback ✓
- `toggleSubscribe` - feedback ✓
- `copyToClipboard` - contextual message ✓
- `getYouTubeKeySequences` - fixed bindings ✓
- `getYouTubeSingleKeyActions` - Shift+M ✓
- `handleCommandNavigate` - flash at boundary ✓
- `renderPalette` - larger text, tighter spacing ✓
- `renderChapterModal` - input at bottom ✓
- `handleChapterNavigation` - flash at boundary ✓
- `renderDescriptionModal` - whitespace fix ✓
- `renderFilterDrawer` - created ✓
- `exitFocusMode` - wired up ✓
- `updateSubscribeButton` - wired up ✓

### Remaining Issues
1. `getRecommendedVideos` - returns empty, selectors not matching YouTube DOM
2. Filter drawer shows duplicate inputs (status bar + drawer both visible)
3. Need to hide status bar input when `modalState === 'filter'`
