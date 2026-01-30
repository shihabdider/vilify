# Function Blueprints

## Core - State

### `createAppState : () -> AppState` [PURE]
Creates initial application state with all defaults.

```javascript
createAppState() 
  => { focusModeActive: false, modalState: null, paletteQuery: '', 
       paletteSelectedIdx: 0, selectedIdx: 0, localFilterActive: false,
       localFilterQuery: '', siteSearchActive: false, siteSearchQuery: '',
       keySeq: '', lastUrl: '' }
```

### `resetState : AppState -> AppState` [PURE]
Returns a fresh state, discarding all current values. Equivalent to `createAppState()`.

```javascript
resetState({ focusModeActive: true, ... })
  => { focusModeActive: false, ... }
```

### `getMode : AppState -> 'NORMAL' | 'COMMAND' | 'FILTER' | 'SEARCH'` [PURE]
Derives display mode from current state.

```javascript
getMode({ modalState: null, localFilterActive: false, siteSearchActive: false, ... })  => 'NORMAL'
getMode({ modalState: 'palette', paletteQuery: ':', ... })                              => 'COMMAND'
getMode({ modalState: null, localFilterActive: true, ... })                             => 'FILTER'
getMode({ modalState: null, siteSearchActive: true, ... })                              => 'SEARCH'
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
Display a toast message. Auto-clears after timeout.

```javascript
showMessage("Copied URL")   // Shows toast, auto-clears after timeout
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

## Core - Loading Screen

### `showLoadingScreen : SiteConfig -> void` [I/O]
Show loading overlay using SiteTheme colors and optional site logo.

```javascript
showLoadingScreen(youtubeConfig)
// Creates overlay with bg1 background, accent spinner, optional logo
```

### `hideLoadingScreen : () -> void` [I/O]
Hide and remove loading overlay.

```javascript
hideLoadingScreen()
// Fades out and removes overlay element
```

---

## Core - Layout

### `renderFocusMode : (SiteConfig, AppState) -> void` [I/O]
Render the full focus mode overlay (header, content area, footer).

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
applyTheme({ accent: '#ff0000', bg1: '#002b36', ... })
// Sets --accent, --bg-1, etc.
```

---

## Core - Keyboard

### `setupKeyboardHandler : (SiteConfig, AppState, Callbacks) -> void` [I/O]
Initialize capture-phase keyboard listener with site's key sequences.

Callbacks structure:
- onKeySequence: (seq) => void - called when a sequence matches
- onNavigate: (direction) => void - for j/k navigation
- onSelect: (shiftKey) => void - for Enter
- onEscape: () => void - for Escape handling

```javascript
setupKeyboardHandler(youtubeConfig, state, {
  onKeySequence: (seq) => executeSequence(seq),
  onNavigate: (dir) => moveSelection(dir),
  onSelect: (shift) => executeItem(shift),
  onEscape: () => closeModal()
})
// Registers capture-phase keydown listener
```

### `handleKeyEvent : (KeyboardEvent, KeySeq, Sequences, Timeout) -> { action: Function | null, newSeq: String, shouldPrevent: Boolean }` [PURE]
Process a key event against registered sequences. Returns action to execute (if any), updated sequence, and whether to prevent default.

```javascript
// User presses 'g', no match yet but 'gh' exists
handleKeyEvent(event, '', { 'gh': goHome, 'gs': goSubs }, 500)
  => { action: null, newSeq: 'g', shouldPrevent: false }

// User presses 'h' after 'g'
handleKeyEvent(event, 'g', { 'gh': goHome, 'gs': goSubs }, 500)
  => { action: goHome, newSeq: '', shouldPrevent: true }

// User presses 'x', no match, no prefix match
handleKeyEvent(event, '', { 'gh': goHome }, 500)
  => { action: null, newSeq: '', shouldPrevent: false }
```

### `isInputElement : Element -> Boolean` [PURE]
Check if element is an input/textarea/contenteditable.

```javascript
isInputElement(document.querySelector('input'))                    => true
isInputElement(document.querySelector('div'))                      => false
isInputElement(document.querySelector('[contenteditable="true"]')) => true
```

---

## Core - Navigation Observer

### `setupNavigationObserver : (onNavigate: (oldUrl, newUrl) -> void) -> void` [I/O]
Watch for SPA URL changes using MutationObserver. Calls callback when URL changes.

```javascript
setupNavigationObserver((oldUrl, newUrl) => {
  console.log('Navigated from', oldUrl, 'to', newUrl);
  site.handleNavigation(newUrl);
})
// Sets up observer, site handles the reaction
```

---

## Core - Orchestration

### `initSite : SiteConfig -> void` [I/O]
Entry point — show loading screen, wait for content, initialize focus mode, set up keyboard and navigation.

```javascript
initSite(youtubeConfig)
// Sets up everything for the site
```

---

## Core - Actions

### `copyToClipboard : String -> void` [I/O]
Copy text to clipboard, show confirmation message.

```javascript
copyToClipboard('https://youtube.com/watch?v=abc')
// Copies, shows "Copied to clipboard"
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
  => { ...state, modalState: 'palette', paletteQuery: ':', paletteSelectedIdx: 0 }

openPalette(state, 'video')
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

## Core - Local Filter

### `openLocalFilter : AppState -> AppState` [PURE]
Open local filter input.

```javascript
openLocalFilter(state)
  => { ...state, localFilterActive: true }
```

### `closeLocalFilter : AppState -> AppState` [PURE]
Close local filter, optionally clearing query.

```javascript
closeLocalFilter(state)
  => { ...state, localFilterActive: false, localFilterQuery: '' }
```

---

## Core - Site Search

### `openSiteSearch : AppState -> AppState` [PURE]
Open site search input.

```javascript
openSiteSearch(state)
  => { ...state, siteSearchActive: true, siteSearchQuery: '' }
```

### `closeSiteSearch : AppState -> AppState` [PURE]
Close site search.

```javascript
closeSiteSearch(state)
  => { ...state, siteSearchActive: false }
```

---

## YouTube - Scraping

All scrapers return sensible defaults on failure (empty arrays, null contexts) rather than throwing.

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

### `getVideoContext : () -> VideoContext | null` [I/O]
Scrape current video's metadata. Returns null if not on watch page or elements missing.

```javascript
getVideoContext()
  => { videoId: 'abc123', title: 'Video Title', chapters: [...], ... }

// Not on watch page
getVideoContext()  => null
```

### `getVideos : () -> Array<ContentItem>` [I/O]
Scrape video items from current page. Filters out Shorts. Uses multiple strategies for YouTube's varying layouts.

```javascript
getVideos()
  => [{ type: 'content', id: 'abc', title: 'Video 1', url: '/watch?v=abc', ... }, ...]

// No videos found
getVideos()  => []
```

### `getChapters : () -> Array<Chapter>` [I/O]
Scrape chapters from video. Returns empty array if none found.

```javascript
getChapters()
  => [{ title: 'Intro', time: 0, timeText: '0:00' }, ...]

// Video without chapters
getChapters()  => []
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
Scrape full video description text. Returns empty string if not found.

```javascript
getDescription()
  => "In this video we explore...\n\nLinks:\n..."

getDescription()  // Not found
  => ""
```

---

## YouTube - Commands

### `getYouTubeCommands : VideoContext? -> Array<Command>` [PURE]
Get available commands based on context.

```javascript
// On watch page
getYouTubeCommands(videoContext)
  => [{ label: 'Copy video URL', keys: 'Y Y', ... },
      { label: 'Show chapters', keys: 'F', ... }, ...]

// On listing page
getYouTubeCommands(null)
  => [{ label: 'Go home', keys: 'G H', ... }, ...]  // No video commands
```

### `getYouTubeKeySequences : VideoContext? -> Object` [PURE]
Get key sequence bindings.

```javascript
getYouTubeKeySequences(videoContext)
  => { 'yy': copyUrl, 'gh': goHome, 'zo': openDescription, ... }
```

---

## YouTube - Video Player

All player functions no-op silently if video element not found.

### `togglePlayPause : () -> void` [I/O]
Toggle video play/pause state.

### `seekRelative : Number -> void` [I/O]
Seek forward/backward by seconds.

```javascript
seekRelative(10)   // Forward 10s
seekRelative(-5)   // Back 5s
```

### `setPlaybackRate : Number -> void` [I/O]
Set video playback speed.

```javascript
setPlaybackRate(1.5)  // Sets 1.5x
setPlaybackRate(2)    // Sets 2x
```

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
Render watch page layout (video info panel, comments section).

```javascript
renderWatchPage(videoContext, container)
```

### `renderVideoInfo : (VideoContext, Container) -> void` [I/O]
Render video metadata section (title, channel, subscribe button).

```javascript
renderVideoInfo(videoContext, container)
```

### `renderComments : (CommentsResult, YouTubeState, Container) -> void` [I/O]
Render comments list with pagination.

```javascript
renderComments(commentsResult, youtubeState, container)
```

---

## YouTube - Content Polling (Site-Specific)

### `startYouTubeContentPolling : (onUpdate: () -> void) -> void` [I/O]
Start polling for new video content (infinite scroll detection). Calls onUpdate when new videos detected.

```javascript
startYouTubeContentPolling(() => {
  const videos = getVideos();
  renderListing(videos, state.selectedIdx);
})
```

### `stopYouTubeContentPolling : () -> void` [I/O]
Stop content polling.

```javascript
stopYouTubeContentPolling()
```

---

## YouTube - Watch Page (Site-Specific)

### `waitForWatchPageContent : (maxRetries: Number, delay: Number, onReady: () -> void, onFail: () -> void) -> void` [I/O]
Wait for watch page content to load (video element, metadata). Retries with delay.

```javascript
waitForWatchPageContent(10, 500,
  () => renderWatchPage(getVideoContext(), container),
  () => showMessage('Failed to load video info')
)
```

### `triggerCommentLoad : () -> void` [I/O]
Scroll to comments section to trigger YouTube's lazy loading.

```javascript
triggerCommentLoad()
// Scrolls to comments, dispatches scroll events
```

### `applyDefaultVideoSettings : () -> void` [I/O]
Apply default settings to video (e.g., 2x playback speed).

```javascript
applyDefaultVideoSettings()
// Sets video.playbackRate = 2
```

---

## YouTube - Comment Window (Site-Specific)

Comments are displayed using a sliding window approach. Module-level state tracks:
- `commentStartIdx`: First comment index in current view
- `commentEndIdx`: End index (exclusive) of current view  
- `commentStartHistory`: Stack of previous start positions for back navigation

### `nextCommentPage : YouTubeState -> YouTubeState` [I/O]
Advance comment window to show next set of comments. Pushes current position to history.

```javascript
// Currently showing comments 1-9, advances to 10-17
nextCommentPage(state)
// commentStartHistory now contains [0]
// commentStartIdx = 9, renders and sets commentEndIdx = 17

// At end of loaded comments, triggers loadMoreComments
nextCommentPage(state)  // when commentEndIdx >= comments.length
// Calls loadMoreComments(), returns state unchanged
```

### `prevCommentPage : YouTubeState -> YouTubeState` [I/O]
Go back to previous comment window by popping from history.

```javascript
// Currently showing 10-17, history = [0]
prevCommentPage(state)
// Pops 0 from history, shows comments 1-9

// Already at first window, history empty
prevCommentPage(state)
// Returns state unchanged
```

### `loadMoreComments : () -> void` [I/O]
Trigger loading of more comments from YouTube (scroll, click continuation).
Does NOT auto-advance - just refreshes current view with new total.

```javascript
loadMoreComments()
// Scrolls, clicks continuation elements, waits for new comments
// Shows message "Loaded X more comments - press ^f to continue"
// User presses Ctrl+F again to see new comments
```

### `updateCommentsUI : (Array<Comment>) -> void` [I/O]
Render comments starting from commentStartIdx until container is full.
Updates commentEndIdx and displays "startIdx-endIdx / total" in pagination.

```javascript
updateCommentsUI(comments)
// Renders comments[commentStartIdx..commentEndIdx]
// Shows "1-9 / 45" in pagination footer
```

---

## Summary

| Category | Functions | Pure | I/O |
|----------|-----------|------|-----|
| Core - State | 3 | 3 | 0 |
| Core - View/DOM | 6 | 2 | 4 |
| Core - Loading Screen | 2 | 0 | 2 |
| Core - Layout | 3 | 0 | 3 |
| Core - Keyboard | 3 | 2 | 1 |
| Core - Navigation Observer | 1 | 0 | 1 |
| Core - Orchestration | 1 | 0 | 1 |
| Core - Actions | 3 | 0 | 3 |
| Core - Palette | 4 | 2 | 2 |
| Core - Local Filter | 2 | 2 | 0 |
| Core - Site Search | 2 | 2 | 0 |
| YouTube - Scraping | 6 | 1 | 5 |
| YouTube - Commands | 2 | 2 | 0 |
| YouTube - Player | 6 | 0 | 6 |
| YouTube - Layout | 3 | 0 | 3 |
| YouTube - Content Polling | 2 | 0 | 2 |
| YouTube - Watch Page | 3 | 0 | 3 |
| YouTube - Comment Window | 4 | 0 | 4 |
| **Total** | **56** | **16** | **40** |
