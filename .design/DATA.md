# Data Definitions

## Core Types

Types are ordered top-down: parent types before their children.

### AppState

An AppState is a structure:
- core: AppCore - extension-level state (persists)
- ui: UIState - UI state (partially resets on nav)
- site: SiteState | null - site-wide state (YouTubeState, GmailState, etc.)
- page: PageState | null - page-specific state (YouTubePageState, GmailPageState, etc.)

**Classification**: Compound

**Interpretation**: The complete state of the Vilify extension at any moment. All state lives here - no module-level variables. SiteState and PageState are site-defined; core treats them as opaque.

**Hierarchy**:
```
AppState
├── core: AppCore           # Extension-level (persists)
│   ├── focusModeActive
│   └── lastUrl
├── ui: UIState             # UI state (partially resets on nav)
│   ├── drawer
│   ├── paletteQuery
│   ├── paletteSelectedIdx
│   ├── selectedIdx
│   ├── filterActive
│   ├── filterQuery
│   ├── searchActive
│   ├── searchQuery
│   ├── keySeq
│   ├── sort { field, direction }
│   ├── message
│   └── boundaryFlash
├── site: SiteState | null  # Site-wide (persists across pages)
│   └── (site-specific fields)
└── page: PageState | null  # Page-specific (resets on nav)
    └── (site-specific, discriminated by type)
```

Examples:
```js
// Initial state on YouTube home
{
  core: { focusModeActive: true, lastUrl: 'https://youtube.com/' },
  ui: {
    drawer: null,
    paletteQuery: '',
    paletteSelectedIdx: 0,
    selectedIdx: 0,
    filterActive: false,
    filterQuery: '',
    searchActive: false,
    searchQuery: '',
    keySeq: '',
    sort: { field: null, direction: 'desc' },
    message: null,
    boundaryFlash: null
  },
  site: { settingsApplied: false, commentPage: 0, commentPageStarts: [0], transcript: null },
  page: { type: 'list', videos: [...] }
}

// Watch page with transcript drawer open
{
  core: { focusModeActive: true, lastUrl: 'https://youtube.com/watch?v=abc' },
  ui: {
    drawer: 'transcript',
    paletteQuery: '',
    paletteSelectedIdx: 0,
    selectedIdx: 2,
    filterActive: false,
    filterQuery: '',
    searchActive: false,
    searchQuery: '',
    keySeq: '',
    sort: { field: null, direction: 'desc' },
    message: null,
    boundaryFlash: null
  },
  site: { settingsApplied: true, commentPage: 0, commentPageStarts: [0], transcript: { status: 'loaded', lines: [...], language: 'en' } },
  page: { type: 'watch', videoContext: {...}, recommended: [...], chapters: [...] }
}

// With flash message after copy
{
  core: { focusModeActive: true, lastUrl: '...' },
  ui: { ..., message: { text: 'Copied!', timestamp: 1706812345000 }, ... },
  site: { ... },
  page: { ... }
}
```

---

### AppCore

An AppCore is a structure:
- focusModeActive: Boolean - is focus mode overlay showing?
- lastUrl: String - for detecting SPA navigation

**Classification**: Compound

**Interpretation**: Extension-level state that persists for the lifetime of the extension on a page.

Examples:
```js
{ focusModeActive: true, lastUrl: 'https://youtube.com/' }
{ focusModeActive: false, lastUrl: 'https://youtube.com/watch?v=abc' }
```

---

### UIState

A UIState is a structure:
- drawer: DrawerType - which drawer is open (null = none)
- paletteQuery: String - command palette input text
- paletteSelectedIdx: Number - selected item in palette
- selectedIdx: Number - selected item in main listing
- filterActive: Boolean - is filter mode on?
- filterQuery: String - filter input text
- searchActive: Boolean - is site search focused?
- searchQuery: String - site search text
- keySeq: String - partial key sequence (e.g., 'g')
- sort: SortState - current sort settings
- message: Message | null - flash message to display
- boundaryFlash: BoundaryFlash | null - edge flash when hitting list boundary

**Classification**: Compound

**Interpretation**: All UI-related state. Some fields reset on navigation (selectedIdx, filterQuery), others persist (sort). Flash fields auto-clear after timeout.

Examples:
```js
// Normal browsing
{
  drawer: null, paletteQuery: '', paletteSelectedIdx: 0,
  selectedIdx: 3, filterActive: false, filterQuery: '',
  searchActive: false, searchQuery: '', keySeq: '',
  sort: { field: null, direction: 'desc' },
  message: null, boundaryFlash: null
}

// With flash message
{
  drawer: null, paletteQuery: '', paletteSelectedIdx: 0,
  selectedIdx: 0, filterActive: false, filterQuery: '',
  searchActive: false, searchQuery: '', keySeq: '',
  sort: { field: null, direction: 'desc' },
  message: { text: 'Copied!', timestamp: 1706812345000 },
  boundaryFlash: null
}

// Hit top of list
{
  drawer: null, paletteQuery: '', paletteSelectedIdx: 0,
  selectedIdx: 0, filterActive: false, filterQuery: '',
  searchActive: false, searchQuery: '', keySeq: '',
  sort: { field: null, direction: 'desc' },
  message: null,
  boundaryFlash: { edge: 'top', timestamp: 1706812345000 }
}

// Command palette open
{
  drawer: 'palette', paletteQuery: ':sort', paletteSelectedIdx: 2,
  selectedIdx: 0, filterActive: false, filterQuery: '',
  searchActive: false, searchQuery: '', keySeq: '',
  sort: { field: null, direction: 'desc' },
  message: null, boundaryFlash: null
}
```

---

### Message

A Message is a structure:
- text: String - message text to display
- timestamp: Number - when the message was created (ms since epoch)

**Classification**: Compound

**Interpretation**: A temporary flash message shown to the user. Renderer uses timestamp to auto-dismiss after timeout.

Examples:
```js
{ text: 'Copied!', timestamp: 1706812345000 }
{ text: 'No transcript available', timestamp: 1706812346000 }
{ text: 'URL copied to clipboard', timestamp: 1706812347000 }
```

---

### BoundaryFlash

A BoundaryFlash is a structure:
- edge: 'top' | 'bottom' - which edge was hit
- timestamp: Number - when the flash was triggered (ms since epoch)

**Classification**: Compound

**Interpretation**: Visual feedback when user tries to navigate past list boundaries. Renderer uses timestamp to auto-dismiss and edge to position the flash effect.

Examples:
```js
{ edge: 'top', timestamp: 1706812345000 }    // Hit top of list
{ edge: 'bottom', timestamp: 1706812346000 } // Hit bottom of list
```

---

### SortState

A SortState is a structure:
- field: SortField | null - which field to sort by (null = default order)
- direction: 'asc' | 'desc' - sort direction

**Classification**: Compound

**Interpretation**: Current sort configuration for listings. SortField is site-defined.

Examples:
```js
{ field: null, direction: 'desc' }      // Default order
{ field: 'date', direction: 'desc' }    // Newest first (YouTube)
{ field: 'title', direction: 'asc' }    // A-Z
{ field: 'received', direction: 'desc' } // Most recent (Gmail)
```

---

### SortField

A SortField is site-defined (String).

Core treats SortField as opaque - each site defines its own valid values.
See YouTubeSortField, GmailSortField in site-specific sections.

---

### DrawerType

A DrawerType is one of:
- null - no drawer open (Core)
- 'palette' - command palette open (Core)
- SiteDrawerType - site-specific drawers (site-defined)

**Classification**: Itemization (extensible union)

**Interpretation**: Which drawer is currently open. Core owns `null` and `'palette'`. Sites extend with their own drawer types (see YouTubeDrawerType, GmailDrawerType in site-specific sections).

Core Examples:
```js
null           // Normal state, no drawer
'palette'      // Command palette is open
```

YouTube Examples (see YouTubeDrawerType):
```js
'recommended'  // Filter drawer for recommended videos (watch page)
'chapters'     // Chapter picker is open
'description'  // Description drawer is open
'transcript'   // Transcript drawer is open
```

---

### Item

An Item is one of:
- Command
- ContentItem
- GroupHeader

**Classification**: Itemization (union)

**Interpretation**: A displayable item in a list (command palette or content listing).

Examples:
```js
// Group header followed by commands
{ group: 'Navigation' }
{ label: 'Home', icon: '🏠', action: ..., keys: 'G H', ... }
{ label: 'Subscriptions', icon: '📺', action: ..., keys: 'G S', ... }

// Content items in a listing
{ type: 'content', id: 'abc', title: 'Video Title', ... }
{ type: 'content', id: 'def', title: 'Another Video', ... }
```

---

### ContentItem

A ContentItem is a structure:
- type: 'content' - literal string (discriminator)
- id: String - unique identifier
- title: String - primary text
- url: String - where to navigate on select
- thumbnail: String | null - image URL
- meta: String | null - secondary info (channel · date)
- subtitle: String | null - third line
- data: Object | null - site-specific extra data

**Classification**: Compound

**Interpretation**: A content item in a listing (video, email, issue, etc.).

Examples:
```js
// YouTube video
{ type: 'content', id: 'abc123', title: 'Cool Video',
  url: '/watch?v=abc123', thumbnail: 'https://i.ytimg.com/...',
  meta: 'Channel Name · 2 days ago', subtitle: null,
  data: { videoId: 'abc123', channelUrl: '/@channel', duration: '12:34', viewCount: '1.2M views' } }

// Gmail email
{ type: 'content', id: 'msg123', title: 'Meeting tomorrow',
  url: '/mail/u/0/#inbox/msg123', thumbnail: null,
  meta: 'John Smith · 10:30 AM', subtitle: 'Hey, just wanted to confirm...',
  data: { labels: ['inbox'], unread: true } }

// GitHub issue
{ type: 'content', id: '42', title: 'Fix login bug',
  url: '/org/repo/issues/42', thumbnail: null,
  meta: '#42 · opened by alice', subtitle: null,
  data: { labels: ['bug'], state: 'open' } }
```

---

### GroupHeader

A GroupHeader is a structure:
- group: String - group name

**Classification**: Compound

**Interpretation**: A visual separator/header in a list of items.

Examples:
```js
{ group: 'Navigation' }
{ group: 'Playback' }
{ group: 'Copy' }
```

---

### Command

A Command is a structure:
- label: String - display name
- icon: String - emoji or symbol
- action: Function - () => void
- keys: String | null - shortcut hint (shown in UI)
- meta: String | null - extra info
- group: String | null - for grouping in palette

**Classification**: Compound

**Interpretation**: An action available in the command palette.

Examples:
```js
// Navigation command
{ label: 'Home', icon: '🏠', action: () => navigateTo('/'),
  keys: 'G H', meta: null, group: 'Navigation' }

// Context-aware command
{ label: 'Copy URL at time', icon: '⏱', action: copyUrlAtTime,
  keys: '⇧Y', meta: '2:34', group: 'Copy' }

// Command without shortcut
{ label: 'Speed 1.5x', icon: '🏃', action: () => setSpeed(1.5),
  keys: null, meta: null, group: 'Speed' }
```

---

### SiteConfig

A SiteConfig is a structure:
- name: String - site identifier ('youtube', 'gmail', etc.)
- matches: Array\<String\> - URL patterns for matching
- theme: SiteTheme - color scheme for this site
- logo: HTMLElement | null - optional branding element for loading screen
- getPageType: Function - () => PageType
- getItems: Function - () => Array\<Item\>
- getCommands: Function - (ctx) => Array\<Command\>
- getKeySequences: Function - (ctx) => Object
- getSingleKeyActions: Function - (ctx) => Object - single-key actions including Shift modifiers
- getDrawerHandler: Function - (drawerState, siteState) => DrawerHandler | null
- getDescription: Function | null - () => String - get description text (YouTube)
- getChapters: Function | null - () => Array\<Chapter\> - get chapters (YouTube)
- seekToChapter: Function | null - (chapter) => void - seek to chapter (YouTube)
- layouts: Layouts - mapping of page types to layout definitions
- createSiteState: Function | null - () => SiteState - factory for site-specific state
- onContentReady: Function | null - () => void, called after render completes
- watch: Object | null - watch page specific functions (YouTube)
  - nextCommentPage: Function - (siteState) => siteState
  - prevCommentPage: Function - (siteState) => siteState

**Classification**: Compound

**Interpretation**: Configuration for a supported site. Note: Will be refactored in iteration 024 to separate site-level and page-level concerns.

Examples:
```js
// YouTube - custom watch layout, drawers, custom item rendering
{
  name: 'youtube',
  matches: ['*://www.youtube.com/*', '*://youtube.com/*'],
  theme: { bg1: '#002b36', accent: '#ff0000', ... },
  logo: null,
  getPageType: () => 'watch',
  getItems: () => [...],
  getCommands: (ctx) => [...],
  getKeySequences: (ctx) => ({ 'gh': goHome, ... }),
  getSingleKeyActions: (ctx) => ({ 'Y': copyUrl, ... }),
  getDrawerHandler: (drawerState, siteState) => drawerState === 'chapters' ? chapterDrawer : null,
  getDescription: () => getDescription(),
  getChapters: () => getChapters(),
  seekToChapter: (ch) => seekTo(ch.time),
  layouts: { home: 'listing', watch: renderWatchPage },
  createSiteState: () => ({ settingsApplied: false, ... }),
  onContentReady: () => applyDefaultVideoSettings(),
  watch: { nextCommentPage, prevCommentPage }
}

// Minimal site config
{
  name: 'google',
  matches: ['*://www.google.com/search*'],
  theme: { bg1: '#002b36', accent: '#4285f4', ... },
  logo: null,
  getPageType: () => 'results',
  getItems: () => [...],
  getCommands: (ctx) => [...],
  getKeySequences: (ctx) => ({}),
  getSingleKeyActions: (ctx) => ({}),
  getDrawerHandler: () => null,
  layouts: { results: 'listing' },
  createSiteState: null,
  onContentReady: null
}
```

---

### SiteTheme

A SiteTheme is a structure:
- bg1: Color - main background
- bg2: Color - panels, cards
- bg3: Color - borders, hover states
- txt1: Color - primary text
- txt2: Color - secondary text
- txt3: Color - muted text
- txt4: Color - labels, decorative
- accent: Color - site's brand color
- accentHover: Color - hover state for accent

**Classification**: Compound

**Interpretation**: Color scheme for a site's overlay UI.

Examples:
```js
// YouTube - Solarized Dark with YouTube red
{ bg1: '#002b36', bg2: '#073642', bg3: '#0a4a5c',
  txt1: '#f1f1f1', txt2: '#aaaaaa', txt3: '#717171', txt4: '#3ea6ff',
  accent: '#ff0000', accentHover: '#cc0000' }

// Gmail - Solarized Dark with Gmail blue
{ bg1: '#002b36', bg2: '#073642', bg3: '#0a4a5c',
  txt1: '#f1f1f1', txt2: '#aaaaaa', txt3: '#717171', txt4: '#4285f4',
  accent: '#4285f4', accentHover: '#3367d6' }

// GitHub - Solarized Dark with GitHub green
{ bg1: '#002b36', bg2: '#073642', bg3: '#0a4a5c',
  txt1: '#f1f1f1', txt2: '#aaaaaa', txt3: '#717171', txt4: '#238636',
  accent: '#238636', accentHover: '#2ea043' }
```

---

### Layouts

A Layouts is a mapping:
- keys: PageType (site-specific strings)
- values: LayoutDef

**Classification**: Mapping

**Interpretation**: Maps page types to their layout definitions.

Examples:
```js
// YouTube
{ home: 'listing', search: 'listing', subscriptions: 'listing',
  watch: (state, siteState, container) => renderWatchPage(state, siteState, container) }

// Gmail
{ inbox: 'listing', thread: 'detail', compose: renderCompose }
```

---

### LayoutDef

A LayoutDef is one of:
- 'listing' - built-in scrollable item list
- 'detail' - built-in main + optional sidebar
- RenderFunction - custom: (state, siteState, container) => void

**Classification**: Itemization (union)

**Interpretation**: How to render a page type.

Examples:
```js
'listing'                                       // Use built-in listing layout
'detail'                                        // Use built-in detail layout
(state, siteState, container) => renderWatch()  // Custom render function
```

---

### DrawerHandler

A DrawerHandler is a structure returned by drawer factory functions:
- render: Function - (container: HTMLElement) => void - render drawer into container
- onKey: Function - (key: string, state: AppState) => { handled: boolean, newState: AppState }
- cleanup: Function - () => void - cleanup drawer state and DOM
- updateQuery: Function | null - (query: string) => void - update filter query (list drawers only)
- getFilterPlaceholder: Function | null - () => string - get placeholder text for status bar input

**Classification**: Compound

**Interpretation**: Handler for an open drawer, providing render/key handling/cleanup.

Examples:
```js
// List drawer handler (chapters)
{
  render: (container) => { /* create and append drawer DOM */ },
  onKey: (key, state) => {
    if (key === 'Escape') return { handled: true, newState: { ...state, drawerState: null } };
    if (key === 'Enter') { selectItem(); return { handled: true, newState: { ...state, drawerState: null } }; }
    return { handled: false, newState: state };
  },
  cleanup: () => { /* remove DOM, reset internal state */ },
  updateQuery: (q) => { /* filter items by query */ },
  getFilterPlaceholder: () => 'Filter chapters...'
}

// Content drawer handler (description)
{
  render: (container) => { /* render scrollable text */ },
  onKey: (key, state) => {
    if (key === 'Escape') return { handled: true, newState: { ...state, drawerState: null } };
    if (key === 'j') { scrollDown(); return { handled: true, newState: state }; }
    return { handled: false, newState: state };
  },
  cleanup: () => { /* remove DOM */ },
  updateQuery: null,
  getFilterPlaceholder: null
}
```

---

### ListDrawerConfig

A ListDrawerConfig is a structure passed to createListDrawer:
- id: String - unique drawer identifier
- getItems: Function - () => Array\<Item\> - get items to display
- renderItem: Function - (item, isSelected) => HTMLElement - render single item
- onSelect: Function - (item) => void - called when item is selected
- filterPlaceholder: String - placeholder text for filter input
- matchesFilter: Function | null - (item, query) => boolean - custom filter matcher

**Classification**: Compound

**Interpretation**: Configuration for creating a list-style drawer.

Examples:
```js
// Chapter drawer config
{
  id: 'chapters',
  getItems: () => getChapters(),
  renderItem: (ch, selected) => el('div', {}, [ch.title]),
  onSelect: (ch) => seekToChapter(ch),
  filterPlaceholder: 'Filter chapters...',
  matchesFilter: null  // Use default title matching
}

// Transcript drawer config
{
  id: 'transcript',
  getItems: () => transcript.lines,
  renderItem: (line, selected) => el('div', {}, [line.timeText, line.text]),
  onSelect: (line) => seekTo(line.time),
  filterPlaceholder: 'Filter transcript...',
  matchesFilter: (line, q) => line.text.toLowerCase().includes(q.toLowerCase())
}
```

---

## View Types (Iteration 022)

Types for pure view computation. These represent the UI as data, separate from DOM.

### ViewTree

A ViewTree is a structure:
- statusBar: StatusBarView - status bar state
- content: ContentView - main content area
- drawer: DrawerView | null - drawer state (null = closed)

**Classification**: Compound

**Interpretation**: Complete view state computed from AppState. This is the pure "image" that gets applied to DOM. No DOM references, no side effects.

**Hierarchy**:
```
ViewTree
├── statusBar: StatusBarView
│   ├── mode
│   ├── inputVisible
│   ├── inputValue
│   ├── inputPlaceholder
│   ├── inputFocus
│   ├── sortLabel
│   ├── itemCount
│   └── hints
├── content: ContentView
│   ├── type: 'listing' | 'custom' | 'empty'
│   ├── items (for listing)
│   ├── selectedIdx
│   └── render (for custom)
└── drawer: DrawerView | null
    ├── type
    ├── visible
    ├── items (for palette)
    ├── selectedIdx
    └── handler (for site drawers)
```

Examples:
```js
// Normal listing mode
{
  statusBar: {
    mode: 'NORMAL',
    inputVisible: false,
    inputValue: '',
    inputPlaceholder: '',
    inputFocus: false,
    sortLabel: null,
    itemCount: 24,
    hints: null
  },
  content: {
    type: 'listing',
    items: [{ title: 'Video 1', ... }, ...],
    selectedIdx: 0,
    render: null
  },
  drawer: null
}

// Filter mode with palette open
{
  statusBar: {
    mode: 'COMMAND',
    inputVisible: true,
    inputValue: ':sort',
    inputPlaceholder: 'Command...',
    inputFocus: true,
    sortLabel: 'date↓',
    itemCount: 24,
    hints: '↑↓ navigate ↵ select esc close'
  },
  content: {
    type: 'listing',
    items: [...],
    selectedIdx: 3,
    render: null
  },
  drawer: {
    type: 'palette',
    visible: true,
    items: [{ label: 'Sort by date', ... }, ...],
    selectedIdx: 0,
    handler: null
  }
}
```

---

### StatusBarView

A StatusBarView is a structure:
- mode: String - mode badge text ('NORMAL', 'FILTER', 'COMMAND', etc.)
- inputVisible: Boolean - show status bar input?
- inputValue: String - current input value
- inputPlaceholder: String - input placeholder text
- inputFocus: Boolean - should input be focused?
- sortLabel: String | null - sort indicator text (e.g., 'date↓')
- itemCount: Number | null - item count to display
- hints: String | null - hint text for current mode

**Classification**: Compound

**Interpretation**: Pure data representing status bar state. No DOM references.

Examples:
```js
// Normal mode
{
  mode: 'NORMAL',
  inputVisible: false,
  inputValue: '',
  inputPlaceholder: '',
  inputFocus: false,
  sortLabel: null,
  itemCount: 42,
  hints: null
}

// Filter mode
{
  mode: 'FILTER',
  inputVisible: true,
  inputValue: 'react',
  inputPlaceholder: 'Filter...',
  inputFocus: true,
  sortLabel: 'title↑',
  itemCount: 5,
  hints: '↑↓ navigate ↵ select esc close'
}

// Drawer mode (chapters)
{
  mode: 'CHAPTERS',
  inputVisible: true,
  inputValue: '',
  inputPlaceholder: 'Filter chapters...',
  inputFocus: true,
  sortLabel: null,
  itemCount: null,
  hints: '↑↓ navigate ↵ select esc close'
}
```

---

### ContentView

A ContentView is a structure:
- type: 'listing' | 'custom' | 'empty' - content type
- items: Item[] - items to display (for listing type)
- selectedIdx: Number - selected item index
- render: Function | null - custom render function (for custom type)

**Classification**: Compound

**Interpretation**: Pure data representing main content area. For 'listing', items are pre-filtered/sorted. For 'custom', render function handles layout (watch page, etc.).

Examples:
```js
// Listing page
{
  type: 'listing',
  items: [
    { title: 'Video 1', meta: '100K views', url: '/watch?v=abc', ... },
    { title: 'Video 2', meta: '50K views', url: '/watch?v=def', ... }
  ],
  selectedIdx: 0,
  render: null
}

// Watch page (custom layout)
{
  type: 'custom',
  items: [],
  selectedIdx: 0,
  render: (container) => { /* watch page layout */ }
}

// Empty state
{
  type: 'empty',
  items: [],
  selectedIdx: 0,
  render: null
}
```

---

### DrawerView

A DrawerView is a structure:
- type: DrawerType - drawer type ('palette', 'chapters', etc.)
- visible: Boolean - is drawer visible?
- items: Item[] - items to display (for palette)
- selectedIdx: Number - selected item in drawer
- handler: DrawerHandler | null - handler for site-specific drawers

**Classification**: Compound

**Interpretation**: Pure data representing drawer state. For palette, items are filtered commands. For site drawers, handler manages rendering.

Examples:
```js
// Command palette
{
  type: 'palette',
  visible: true,
  items: [
    { label: 'Sort by date', keys: ':sd', action: ... },
    { label: 'Sort by views', keys: ':sv', action: ... }
  ],
  selectedIdx: 0,
  handler: null
}

// Site drawer (chapters)
{
  type: 'chapters',
  visible: true,
  items: [],  // Handler manages its own items
  selectedIdx: 0,
  handler: { render: ..., onKey: ..., cleanup: ... }
}

// No drawer
null
```

---

## YouTube-Specific Types

### YouTubeDrawerType

A YouTubeDrawerType is one of:
- 'recommended' - recommended filter drawer (watch page)
- 'chapters' - chapter picker
- 'description' - description drawer
- 'transcript' - transcript drawer

**Classification**: Enumeration (extends core DrawerType)

**Interpretation**: YouTube-specific drawers. Combined with core DrawerType (null, 'palette').

Examples:
```js
'recommended'  // Filter drawer for recommended videos
'chapters'     // Chapter picker
'description'  // Video description
'transcript'   // Video transcript
```

---

### YouTubeSortField

A YouTubeSortField is one of:
- 'date' - sort by upload date
- 'duration' - sort by video duration
- 'title' - sort alphabetically by title
- 'channel' - sort alphabetically by channel name
- 'views' - sort by view count

**Classification**: Enumeration (implements core SortField)

**Interpretation**: Fields available for sorting YouTube listings.

Examples:
```js
'date'      // Sort by upload date (recent first by default)
'duration'  // Sort by duration (longest first by default)
'title'     // Sort alphabetically A-Z
'channel'   // Sort by channel name A-Z
'views'     // Sort by view count (highest first by default)
```

---

### YouTubePageType

A YouTubePageType is one of:
- 'watch' - video player page
- 'home' - YouTube home
- 'search' - search results
- 'channel' - channel page
- 'playlist' - playlist page
- 'subscriptions' - subscriptions feed
- 'history' - watch history
- 'library' - library page
- 'shorts' - YouTube Shorts
- 'other' - anything else

Examples:
```js
'watch'         // /watch?v=abc123
'search'        // /results?search_query=cats
'channel'       // /@mkbhd
'subscriptions' // /feed/subscriptions
```

---

### YouTubePageState

A YouTubePageState is one of:
- WatchPageState - watch page state
- ListPageState - list page state (home, search, subscriptions, etc.)

**Classification**: Itemization (discriminated union, implements core PageState)

**Interpretation**: Page-specific state for YouTube. Resets when navigating between pages.

Examples:
```js
// Watch page
{ type: 'watch', videoContext: {...}, recommended: [...], chapters: [...] }

// List page
{ type: 'list', videos: [...] }
```

---

### WatchPageState

A WatchPageState is a structure:
- type: 'watch' - discriminator
- videoContext: VideoContext | null - current video metadata
- recommended: Array\<ContentItem\> - recommended videos
- chapters: Array\<Chapter\> - video chapters

**Classification**: Compound

**Interpretation**: State specific to the YouTube watch page.

Examples:
```js
// Fully loaded watch page
{
  type: 'watch',
  videoContext: { videoId: 'abc', title: 'Cool Video', channelName: 'Creator', ... },
  recommended: [{ type: 'content', id: 'xyz', title: 'Related Video', ... }, ...],
  chapters: [{ title: 'Intro', time: 0, timeText: '0:00' }, ...]
}

// Before data loads
{
  type: 'watch',
  videoContext: null,
  recommended: [],
  chapters: []
}
```

---

### ListPageState

A ListPageState is a structure:
- type: 'list' - discriminator
- videos: Array\<ContentItem\> - videos/items on the page

**Classification**: Compound

**Interpretation**: State specific to YouTube list pages (home, search, subscriptions, channel, etc.).

Examples:
```js
// Loaded list page
{
  type: 'list',
  videos: [
    { type: 'content', id: 'abc', title: 'Video 1', url: '/watch?v=abc', ... },
    { type: 'content', id: 'def', title: 'Video 2', url: '/watch?v=def', ... }
  ]
}

// Empty/loading
{ type: 'list', videos: [] }
```

---

### VideoContext

A VideoContext is a structure:
- videoId: String - e.g., 'abc123'
- url: String - full URL
- cleanUrl: String - normalized URL
- title: String | null - video title
- channelName: String | null - channel name
- channelUrl: String | null - link to channel
- uploadDate: String | null - "2 days ago", "Jan 5, 2024"
- description: String | null - video description
- views: String | null - "1.2M views"
- isSubscribed: Boolean - subscribed to channel?
- isLiked: Boolean - liked this video?
- currentTime: Number - playback position in seconds
- duration: Number - video length in seconds
- paused: Boolean - is video paused?
- playbackRate: Number - current speed
- volume: Number - 0-1
- muted: Boolean - is muted?
- chapters: Array\<Chapter\> - list of chapters (may be empty)

Examples:
```js
// Watching a video with chapters
{
  videoId: 'dQw4w9WgXcQ',
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  cleanUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  title: 'Rick Astley - Never Gonna Give You Up',
  channelName: 'Rick Astley', channelUrl: '/@RickAstley',
  uploadDate: 'Oct 25, 2009', description: 'Official video...',
  views: null, isSubscribed: false, isLiked: false,
  currentTime: 47, duration: 213, paused: false,
  playbackRate: 2, volume: 0.8, muted: false,
  chapters: [
    { title: 'Intro', time: 0, timeText: '0:00', thumbnailUrl: null },
    { title: 'Chorus', time: 43, timeText: '0:43', thumbnailUrl: null }
  ]
}

// Video without chapters
{
  videoId: 'xyz789', ...,
  chapters: []
}
```

---

### Chapter

A Chapter is a structure:
- title: String - chapter name
- time: Number - timestamp in seconds
- timeText: String - formatted time
- thumbnailUrl: String | null - chapter thumbnail URL

Examples:
```js
{ title: 'Intro', time: 0, timeText: '0:00', thumbnailUrl: null }
{ title: 'The Problem', time: 45, timeText: '0:45', thumbnailUrl: 'https://...' }
{ title: 'Solution', time: 180, timeText: '3:00', thumbnailUrl: null }
{ title: 'Conclusion', time: 3661, timeText: '1:01:01', thumbnailUrl: null }
```

Note: Deduplication should be handled when scraping chapters.

---

### Comment

A Comment is a structure:
- author: String - username
- text: String - comment content

Examples:
```js
{ author: 'musicfan42', text: 'This song never gets old!' }
{ author: 'firstcommenter', text: 'First!' }
{ author: 'thoughtful_viewer', text: 'Great explanation at 3:45, really helped me understand.' }
```

Note: Replies are deferred to later scope. v1 shows top-level comments only.

---

### CommentStatus

A CommentStatus is one of:
- 'loading' - comments section hasn't loaded yet
- 'disabled' - comments are turned off for this video
- 'loaded' - comments have been loaded (may be empty)

Examples:
```js
'loading'   // Comments section still loading
'disabled'  // "Comments are turned off"
'loaded'    // Comments ready (check array for actual comments)
```

---

### CommentsResult

A CommentsResult is a structure:
- comments: Array\<Comment\> - list of comments (may be empty)
- status: CommentStatus - loading state

Examples:
```js
// Comments loaded successfully
{ comments: [{ author: 'user1', text: 'Great!' }, ...], status: 'loaded' }

// Still loading
{ comments: [], status: 'loading' }

// Comments disabled
{ comments: [], status: 'disabled' }
```

---

### TranscriptLine

A TranscriptLine is a structure:
- time: Number - start time in seconds
- timeText: String - formatted time (e.g., '1:23')
- duration: Number - duration in seconds
- text: String - transcript text

Examples:
```js
{ time: 0, timeText: '0:00', duration: 3.5, text: 'Hello and welcome to the video.' }
{ time: 3.5, timeText: '0:03', duration: 4.2, text: 'Today we are going to talk about...' }
{ time: 83, timeText: '1:23', duration: 2.8, text: 'This is the key point.' }
```

---

### TranscriptStatus

A TranscriptStatus is one of:
- 'loading' - transcript is being fetched
- 'loaded' - transcript successfully loaded
- 'unavailable' - no transcript available for this video

Examples:
```js
'loading'      // Fetching transcript from YouTube
'loaded'       // Transcript ready
'unavailable'  // Video has no captions/transcript
```

---

### TranscriptResult

A TranscriptResult is a structure:
- status: TranscriptStatus - loading state
- videoId: String - video ID this result is for (for validation)
- lines: Array\<TranscriptLine\> - transcript lines (empty if not loaded)
- language: String | null - language code (e.g., 'en')

**Classification**: Compound

**Interpretation**: Represents the current state of transcript fetching for a video.
The videoId field enables validating that a loaded result matches the current video
(important for async operations when user may have navigated away).

Examples:
```js
// Transcript loaded
{ status: 'loaded', videoId: 'dQw4w9WgXcQ', lines: [{ time: 0, timeText: '0:00', duration: 3, text: 'Hello' }, ...], language: 'en' }

// Still loading
{ status: 'loading', videoId: 'dQw4w9WgXcQ', lines: [], language: null }

// No transcript available
{ status: 'unavailable', videoId: 'dQw4w9WgXcQ', lines: [], language: null }
```

### Pure Transitions for TranscriptResult

| Function | Signature | Purpose |
|----------|-----------|---------|
| onTranscriptRequest | YouTubeState × String → YouTubeState | Mark transcript as loading for videoId |
| onTranscriptLoad | YouTubeState × TranscriptResult → YouTubeState | Store fetched transcript (validates videoId) |

---

### ChaptersResult

A ChaptersResult is a structure:
- status: ChaptersStatus - loading state ('loading' | 'loaded')
- videoId: String - video ID this result is for (for validation)
- chapters: Array\<Chapter\> - chapter list (empty if loading or no chapters)

**Classification**: Compound

**Interpretation**: Represents the current state of chapters fetching for a video.
The videoId field enables validating that a loaded result matches the current video
(important for async operations when user may have navigated away).

Examples:
```js
// Chapters loaded (with chapters)
{ status: 'loaded', videoId: 'dQw4w9WgXcQ', chapters: [
  { title: 'Intro', time: 0, timeText: '0:00', thumbnailUrl: '...' },
  { title: 'Main Content', time: 120, timeText: '2:00', thumbnailUrl: '...' }
]}

// Chapters loaded (no chapters in video)
{ status: 'loaded', videoId: 'abc123', chapters: [] }

// Still loading
{ status: 'loading', videoId: 'dQw4w9WgXcQ', chapters: [] }
```

### Pure Transitions for ChaptersResult

| Function | Signature | Purpose |
|----------|-----------|---------|
| onChaptersRequest | YouTubeState × String → YouTubeState | Mark chapters as loading for videoId |
| onChaptersLoad | YouTubeState × ChaptersResult → YouTubeState | Store fetched chapters (validates videoId) |
| onChaptersClear | YouTubeState → YouTubeState | Clear chapters state |

---

### YouTubeState

A YouTubeState is a structure:
- chapterQuery: String - filter text in chapter picker (used by drawer internally)
- chapterSelectedIdx: Number - selected chapter index (used by drawer internally)
- commentPage: Number - current comment page index (0-based)
- commentPageStarts: Array\<Number\> - start indices for each comment page
- settingsApplied: Boolean - have we set default playback rate?
- watchPageRetryCount: Number - internal retry tracking
- commentLoadAttempts: Number - internal retry tracking
- transcript: TranscriptResult | null - cached transcript data for current video
- chapters: ChaptersResult | null - cached chapters data for current video

Note: Drawer state (which drawer is open) is in AppState.drawerState.
Note: Drawer handlers manage their own internal state (query, selection index) via closures.

Examples:
```js
// Initial state on watch page
{ chapterQuery: '', chapterSelectedIdx: 0,
  commentPage: 0, commentPageStarts: [0],
  settingsApplied: false, watchPageRetryCount: 0, commentLoadAttempts: 0,
  transcript: null, chapters: null }

// After transcript and chapters loaded
{ chapterQuery: '', chapterSelectedIdx: 0,
  commentPage: 0, commentPageStarts: [0],
  settingsApplied: true, watchPageRetryCount: 0, commentLoadAttempts: 0,
  transcript: { status: 'loaded', videoId: 'abc', lines: [...], language: 'en' },
  chapters: { status: 'loaded', videoId: 'abc', chapters: [...] } }

// After navigating to second comment page
{ chapterQuery: '', chapterSelectedIdx: 0,
  commentPage: 1, commentPageStarts: [0, 5],
  settingsApplied: true, watchPageRetryCount: 0, commentLoadAttempts: 0,
  transcript: { status: 'loaded', videoId: 'abc', lines: [...], language: 'en' },
  chapters: { status: 'loaded', videoId: 'abc', chapters: [] } }
```

---

## Summary: Data → Template Rules

| Type | Classification | Where | Template Rule |
|------|---------------|-------|---------------|
| SiteConfig | Compound | Core | Access all fields |
| SiteTheme | Compound | Core | Access all fields |
| LayoutDef | Union | Core | Case per variant ('listing' / 'detail' / Function) |
| Layouts | Mapping | Core | Iterate keys |
| Command | Compound | Core | Access all fields |
| ContentItem | Compound | Core | Access all fields |
| GroupHeader | Compound | Core | Access all fields |
| Item | Union | Core | Case per variant (Command / ContentItem / GroupHeader) |
| DrawerState | Union | Core | Case per variant (null / 'palette' / site-specific values) |
| DrawerHandler | Compound | Core | Access all fields |
| ListDrawerConfig | Compound | Core | Access all fields |
| AppState | Compound | Core | Access all fields |
| SortField | Enum | Core | Case per variant |
| YouTubePageType | Enum | YouTube | Case per variant |
| VideoContext | Compound | YouTube | Access all fields |
| Chapter | Compound | YouTube | Access all fields |
| Comment | Compound | YouTube | Access all fields |
| CommentStatus | Enum | YouTube | Case per variant |
| CommentsResult | Compound | YouTube | Access all fields |
| TranscriptLine | Compound | YouTube | Access all fields |
| TranscriptStatus | Enum | YouTube | Case per variant |
| TranscriptResult | Compound | YouTube | Access all fields |
| ChaptersResult | Compound | YouTube | Access all fields |
| YouTubeState | Compound | YouTube | Access all fields |

---

## Deferred to Later

- **Comment replies**: Nested comments with parent/child relationships
- **Caching**: itemCache, itemCacheTime for performance optimization
- **Transcript language selection**: Currently defaults to English
