# Function Blueprints

## Core - State

### `createAppState : () -> AppState` [PURE]
Creates initial application state with all defaults.

```javascript
createAppState() 
  => { focusModeActive: false, modalState: null, paletteQuery: '', ... }
```

### `resetState : AppState -> AppState` [PURE]
Returns a fresh state, discarding all current values. Equivalent to `createAppState()`.

```javascript
resetState({ focusModeActive: true, ... })
  => { focusModeActive: false, ... }
```

### `getMode : AppState -> 'NORMAL' | 'COMMAND' | 'FILTER'` [PURE]
Derives display mode from current state.

```javascript
getMode({ modalState: null, filterActive: false, ... })         => 'NORMAL'
getMode({ modalState: 'palette', paletteQuery: ':', ... })      => 'COMMAND'
getMode({ modalState: null, filterActive: true, ... })          => 'FILTER'
```

---

## Core - View/DOM

### `el : (Tag, Attrs, Children) -> HTMLElement` [PURE]
Create DOM element with attributes and children. Does not attach event handlers (pure).

```javascript
el('div', { class: 'container' }, [])
  => <div class="container"></div>

el('span', { id: 'msg' }, ['Hello'])
  => <span id="msg">Hello</span>

el('ul', {}, [el('li', {}, ['One']), el('li', {}, ['Two'])])
  => <ul><li>One</li><li>Two</li></ul>
```

### `clear : HTMLElement -> void` [I/O]
Remove all children from an element.

```javascript
clear(container)  // container.innerHTML = ''
```

### `updateListSelection : (Container, Selector, Index) -> void` [I/O]
Update visual selection state (add/remove `.selected` class). Scrolls selected item into view.

```javascript
updateListSelection(container, '.item', 4)
// Removes .selected from old item, adds to item at index 4, scrolls into view
```

### `showMessage : String -> void` [I/O]
Display a message in the status bar. Replaces any existing message and resets auto-clear timer.

```javascript
showMessage("Copied URL")   // Shows message, auto-clears after timeout
showMessage("")             // Clears immediately
```

### `flashBoundary : () -> void` [I/O]
Flash the content area to indicate list boundary reached.

```javascript
flashBoundary()  // Brief CSS animation
```

### `navigateList : (Direction, Index, Count) -> { index: Number, boundary: 'top' | 'bottom' | null }` [PURE]
Calculate new index for list navigation. Returns boundary info for caller to handle.

```javascript
// Direction: 'up' | 'down' | 'top' | 'bottom'

navigateList('down', 2, 10)   => { index: 3, boundary: null }
navigateList('down', 9, 10)   => { index: 9, boundary: 'bottom' }
navigateList('up', 0, 10)     => { index: 0, boundary: 'top' }
navigateList('top', 5, 10)    => { index: 0, boundary: null }
navigateList('bottom', 5, 10) => { index: 9, boundary: null }
navigateList('down', 0, 0)    => { index: 0, boundary: null }  // Empty list
```

### `scrollHalfPage : (Direction, Index, Count, VisibleCount) -> Number` [PURE]
Calculate new index for half-page scroll (Ctrl+d, Ctrl+u). Returns new index.

```javascript
// Direction: 'up' | 'down'

scrollHalfPage('down', 5, 100, 20)  => 15   // Move down ~10 items (half of 20)
scrollHalfPage('up', 15, 100, 20)   => 5    // Move up ~10 items
scrollHalfPage('down', 95, 100, 20) => 99   // Clamped to max
scrollHalfPage('up', 3, 100, 20)    => 0    // Clamped to min
```

---

## Core - Status Bar

### `renderStatusBar : (Mode, Message, SiteConfig) -> void` [I/O]
Render the full status bar (logo, mode indicator, message area).

```javascript
renderStatusBar('NORMAL', '', youtubeConfig)      // [Logo] NORMAL
renderStatusBar('COMMAND', '', youtubeConfig)     // [Logo] COMMAND
renderStatusBar('NORMAL', 'Copied URL', config)   // [Logo] NORMAL  Copied URL
```

---

## Core - Layout

### `renderFocusMode : (SiteConfig, AppState) -> void` [I/O]
Render the full focus mode overlay (content area + command line + status bar).

```javascript
renderFocusMode(youtubeConfig, state)
// Creates overlay with site's theme, ready for content
```

### `renderListing : (Array<ContentItem>, SelectedIdx, RenderItem?) -> void` [I/O]
Render a list of items with selection state. Uses default rendering or custom `RenderItem` function.

```javascript
renderListing(videos, 0)                    // Default rendering, first selected
renderListing(comments, 2, renderComment)   // Custom renderer, third selected
```

### `applyTheme : SiteTheme -> void` [I/O]
Apply CSS custom properties from theme to focus mode container.

```javascript
applyTheme({ accent: '#ff0000', bgPrimary: '#002b36', ... })
// Sets --accent, --bg-primary, etc.
```

---

## Core - Keyboard

### `initKeyboard : SiteConfig -> void` [I/O]
Initialize Mousetrap with site's key bindings.

```javascript
initKeyboard(youtubeConfig)
// Registers all bindings from config
```

### `bind : (Keys, Callback) -> void` [I/O]
Bind a key or key sequence to a callback.

```javascript
bind('j', () => moveDown())
bind('gg', () => goToTop())
bind('yy', () => copyUrl())
```

### `isInputElement : Element -> Boolean` [PURE]
Check if element is an input/textarea/contenteditable.

```javascript
isInputElement(document.querySelector('input'))                    => true
isInputElement(document.querySelector('div'))                      => false
isInputElement(document.querySelector('[contenteditable="true"]')) => true
```

---

## Core - Orchestration

### `initSite : SiteConfig -> void` [I/O]
Entry point — initialize focus mode, keyboard, navigation observer.

```javascript
initSite(youtubeConfig)
// Sets up everything for the site
```

### `onNavigate : (OldUrl, NewUrl) -> void` [I/O]
Handle SPA navigation — reset state, re-render for new page type.

```javascript
onNavigate('https://youtube.com/', 'https://youtube.com/watch?v=abc')
// Detects change, updates UI for watch page
```

### `setupNavigationObserver : Callback -> void` [I/O]
Watch for SPA URL changes, call callback on change.

```javascript
setupNavigationObserver((oldUrl, newUrl) => onNavigate(oldUrl, newUrl))
```

---

## Core - Actions

### `copyToClipboard : String -> void` [I/O]
Copy text to clipboard, show confirmation message.

```javascript
copyToClipboard('https://youtube.com/watch?v=abc')
// Copies, shows "Copied URL"
```

### `navigateTo : String -> void` [I/O]
Navigate current tab to URL.

```javascript
navigateTo('/feed/history')
```

### `openInNewTab : String -> void` [I/O]
Open URL in new tab.

```javascript
openInNewTab('https://youtube.com/watch?v=abc')
```

---

## Core - Palette

### `openPalette : (AppState, Mode) -> AppState` [PURE]
Open command palette in specified mode.

```javascript
openPalette(state, 'command')
  => { ...state, modalState: 'palette', paletteQuery: '', paletteSelectedIdx: 0 }
```

### `closePalette : AppState -> AppState` [PURE]
Close palette.

```javascript
closePalette(state)
  => { ...state, modalState: null, paletteQuery: '' }
```

### `renderPalette : (Items, SelectedIdx) -> void` [I/O]
Render palette dropdown with items and selection.

```javascript
renderPalette([{label: 'Copy URL', keys: 'yy'}, ...], 0)
```

### `filterItems : (Array<Item>, Query) -> Array<Item>` [PURE]
Filter items by query (fuzzy or substring match).

```javascript
filterItems([{label: 'Copy URL'}, {label: 'Go Home'}], 'copy')
  => [{label: 'Copy URL'}]

filterItems(items, '')  => items  // Empty returns all
```

---

## YouTube - Scraping

All scrapers **throw on failure** for easier debugging.

### `getYouTubePageType : () -> YouTubePageType` [PURE]
Determine current page type from URL.

```javascript
// URL: youtube.com/watch?v=abc
getYouTubePageType()  => 'watch'

// URL: youtube.com/
getYouTubePageType()  => 'home'

// URL: youtube.com/shorts/xyz
getYouTubePageType()  => 'shorts'
```

### `getVideoContext : () -> VideoContext` [I/O]
Scrape current video's metadata. Throws if not on watch page or elements missing.

```javascript
getVideoContext()
  => { videoId: 'abc123', title: 'Video Title', chapters: [...], ... }
```

### `getVideos : () -> Array<ContentItem>` [I/O]
Scrape video items from current page. **Filters out Shorts**. Throws if DOM not ready.

```javascript
getVideos()
  => [{ id: 'abc', title: 'Video 1', url: '/watch?v=abc', ... }, ...]
```

### `getChapters : () -> Array<Chapter>` [I/O]
Scrape chapters from video. Throws if elements missing.

```javascript
getChapters()
  => [{ title: 'Intro', time: 0, timeText: '0:00' }, ...]

// Video without chapters
getChapters()  => []  // Empty array, not an error
```

### `getComments : () -> CommentsResult` [I/O]
Scrape top-level comments with status.

```javascript
getComments()
  => { comments: [...], status: 'loaded' }

getComments()  // Still loading
  => { comments: [], status: 'loading' }

getComments()  // Disabled
  => { comments: [], status: 'disabled' }
```

### `getDescription : () -> String` [I/O]
Scrape full video description text. Throws if element missing.

```javascript
getDescription()
  => "In this video we explore...\n\nLinks:\n..."
```

---

## YouTube - Commands

### `getYouTubeCommands : VideoContext? -> Array<Command>` [PURE]
Get available commands based on context.

```javascript
// On watch page
getYouTubeCommands(videoContext)
  => [{ key: 'yy', label: 'Copy video URL', ... },
      { key: 'c', label: 'Show chapters', enabled: true }, ...]

// On listing page
getYouTubeCommands(null)
  => [{ key: 'gh', label: 'Go home', ... }, ...]  // No video commands
```

### `getYouTubeKeySequences : VideoContext? -> Object` [PURE]
Get key sequence bindings.

```javascript
getYouTubeKeySequences(videoContext)
  => { 'yy': copyUrl, 'gh': goHome, ... }
```

---

## YouTube - Video Player

All player functions **no-op silently** if video element not found.

### `togglePlayPause : () -> void` [I/O]
Toggle video play/pause state.

### `seekRelative : Number -> void` [I/O]
Seek forward/backward by seconds.

```javascript
seekRelative(10)   // Forward 10s
seekRelative(-5)   // Back 5s
```

### `setPlaybackRate : Number -> void` [I/O]
Set video playback speed. **Clamps to YouTube's valid rates** (0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2).

```javascript
setPlaybackRate(1.5)  // Sets 1.5x
setPlaybackRate(1.3)  // Clamps to 1.25x
setPlaybackRate(3.0)  // Clamps to 2x
```

Note: Commands only expose 1x, 1.5x, 2x.

### `toggleMute : () -> void` [I/O]
Toggle video mute state.

### `toggleFullscreen : () -> void` [I/O]
Toggle fullscreen mode.

### `seekToChapter : Chapter -> void` [I/O]
Seek to a chapter's timestamp.

```javascript
seekToChapter({ title: 'Main Topic', time: 65, timeText: '1:05' })
```

---

## YouTube - Layout

### `renderWatchPage : (VideoContext, Container) -> void` [I/O]
Render watch page layout (video info, chapters hint, comments).

```javascript
renderWatchPage(videoContext, container)
```

### `renderVideoInfo : (VideoContext, Container) -> void` [I/O]
Render video metadata section.

```javascript
renderVideoInfo(videoContext, container)
```

### `renderComments : (Array<Comment>, YouTubeState, Container) -> void` [I/O]
Render comments list with selection state.

```javascript
renderComments(comments, { commentSelectedIdx: 2 }, container)
```

---

## Summary

| Category | Functions | Pure | I/O |
|----------|-----------|------|-----|
| Core - State | 3 | 3 | 0 |
| Core - View/DOM | 7 | 2 | 5 |
| Core - Status Bar | 1 | 0 | 1 |
| Core - Layout | 3 | 0 | 3 |
| Core - Keyboard | 3 | 1 | 2 |
| Core - Orchestration | 3 | 0 | 3 |
| Core - Actions | 3 | 0 | 3 |
| Core - Palette | 4 | 2 | 2 |
| YouTube - Scraping | 6 | 1 | 5 |
| YouTube - Commands | 2 | 2 | 0 |
| YouTube - Player | 6 | 0 | 6 |
| YouTube - Layout | 3 | 0 | 3 |
| **Total** | **44** | **11** | **33** |
