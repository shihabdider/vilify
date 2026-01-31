# Data Definitions

## Core Types

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
- getDrawerHandler: Function - (drawerState) => DrawerHandler | null
- getDescription: Function | null - () => String - get description text (YouTube)
- getChapters: Function | null - () => Array\<Chapter\> - get chapters (YouTube)
- seekToChapter: Function | null - (chapter) => void - seek to chapter (YouTube)
- layouts: Layouts - mapping of page types to layout definitions
- createSiteState: Function | null - () => SiteState - factory for site-specific state
- onContentReady: Function | null - () => void, called after render completes
- watch: Object | null - watch page specific functions (YouTube)
  - nextCommentPage: Function - (siteState) => siteState
  - prevCommentPage: Function - (siteState) => siteState

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
  getDrawerHandler: (drawerState) => drawerState === 'chapters' ? chapterDrawer : null,
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

### LayoutDef

A LayoutDef is one of:
- 'listing' - built-in scrollable item list
- 'detail' - built-in main + optional sidebar
- RenderFunction - custom: (state, siteState, container) => void

Examples:
```js
'listing'                                       // Use built-in listing layout
'detail'                                        // Use built-in detail layout
(state, siteState, container) => renderWatch()  // Custom render function
```

---

### Layouts

A Layouts is a mapping:
- keys: PageType (site-specific strings)
- values: LayoutDef

Examples:
```js
// YouTube
{ home: 'listing', search: 'listing', subscriptions: 'listing',
  watch: (state, siteState, container) => renderWatchPage(state, siteState, container) }

// Gmail
{ inbox: 'listing', thread: 'detail', compose: renderCompose }
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

### ContentItem

A ContentItem is a structure:
- type: 'content' - literal string
- id: String - unique identifier
- title: String - primary text
- url: String - where to navigate on select
- thumbnail: String | null - image URL
- meta: String | null - secondary info
- subtitle: String | null - third line
- data: Object | null - site-specific extra data

Examples:
```js
// YouTube video
{ type: 'content', id: 'abc123', title: 'Cool Video',
  url: '/watch?v=abc123', thumbnail: 'https://i.ytimg.com/...',
  meta: 'Channel Name · 2 days ago', subtitle: null,
  data: { videoId: 'abc123', channelUrl: '/@channel' } }

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

Examples:
```js
{ group: 'Navigation' }
{ group: 'Playback' }
{ group: 'Copy' }
```

---

### Item

An Item is one of:
- Command
- ContentItem
- GroupHeader

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

### DrawerState

A DrawerState is one of:
- null - no drawer open
- 'palette' - command palette open
- 'filter' - filter drawer open
- 'chapters' - chapter picker open (YouTube)
- 'description' - description drawer open (YouTube)

Note: This is a unified enum. Core owns null, 'palette', and 'filter'. Sites extend with their own values.

Examples:
```js
null           // Normal state, no drawer
'palette'      // Command palette is open
'filter'       // Filter drawer is open
'chapters'     // Chapter picker is open (YouTube)
'description'  // Description drawer is open (YouTube)
```

---

### DrawerHandler

A DrawerHandler is a structure returned by drawer factory functions:
- render: Function - (container: HTMLElement) => void - render drawer into container
- onKey: Function - (key: string, state: AppState) => { handled: boolean, newState: AppState }
- cleanup: Function - () => void - cleanup drawer state and DOM
- updateQuery: Function | null - (query: string) => void - update filter query (list drawers only)
- getFilterPlaceholder: Function | null - () => string - get placeholder text for status bar input

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
```

---

### AppState

An AppState is a structure:
- focusModeActive: Boolean - is focus mode overlay showing?
- drawerState: DrawerState - which drawer is open (core + site drawers)
- paletteQuery: String - current text in palette input
- paletteSelectedIdx: Number - selected item index in palette
- selectedIdx: Number - selected item index in listing
- localFilterActive: Boolean - is local filter input shown?
- localFilterQuery: String - current local filter text
- siteSearchActive: Boolean - is site search input focused?
- siteSearchQuery: String - current site search text
- keySeq: String - current key sequence being built
- lastUrl: String - for detecting SPA navigation

Examples:
```js
// Initial state
{ focusModeActive: true, drawerState: null, paletteQuery: '',
  paletteSelectedIdx: 0, selectedIdx: 0, localFilterActive: false,
  localFilterQuery: '', siteSearchActive: false, siteSearchQuery: '',
  keySeq: '', lastUrl: 'https://youtube.com/' }

// Palette open in command mode
{ focusModeActive: true, drawerState: 'palette', paletteQuery: ':speed',
  paletteSelectedIdx: 2, selectedIdx: 0, localFilterActive: false,
  localFilterQuery: '', siteSearchActive: false, siteSearchQuery: '',
  keySeq: '', lastUrl: '...' }

// Local filtering of videos
{ focusModeActive: true, drawerState: null, paletteQuery: '',
  paletteSelectedIdx: 0, selectedIdx: 3, localFilterActive: true,
  localFilterQuery: 'music', siteSearchActive: false, siteSearchQuery: '',
  keySeq: '', lastUrl: '...' }

// Mid key-sequence (user pressed 'g')
{ focusModeActive: true, drawerState: null, paletteQuery: '',
  paletteSelectedIdx: 0, selectedIdx: 0, localFilterActive: false,
  localFilterQuery: '', siteSearchActive: false, siteSearchQuery: '',
  keySeq: 'g', lastUrl: '...' }

// Chapter drawer open (YouTube)
{ focusModeActive: true, drawerState: 'chapters', paletteQuery: '',
  paletteSelectedIdx: 0, selectedIdx: 0, localFilterActive: false,
  localFilterQuery: '', siteSearchActive: false, siteSearchQuery: '',
  keySeq: '', lastUrl: '...' }

// Description drawer open (YouTube)
{ focusModeActive: true, drawerState: 'description', paletteQuery: '',
  paletteSelectedIdx: 0, selectedIdx: 0, localFilterActive: false,
  localFilterQuery: '', siteSearchActive: false, siteSearchQuery: '',
  keySeq: '', lastUrl: '...' }
```

---

## YouTube-Specific Types

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

### YouTubeState

A YouTubeState is a structure:
- chapterQuery: String - filter text in chapter picker (used by drawer internally)
- chapterSelectedIdx: Number - selected chapter index (used by drawer internally)
- commentPage: Number - current comment page index (0-based)
- commentPageStarts: Array\<Number\> - start indices for each comment page
- settingsApplied: Boolean - have we set default playback rate?
- watchPageRetryCount: Number - internal retry tracking
- commentLoadAttempts: Number - internal retry tracking

Note: Drawer state (which drawer is open) is in AppState.drawerState.
Note: Drawer handlers manage their own internal state (query, selection index) via closures.

Examples:
```js
// Initial state on watch page
{ chapterQuery: '', chapterSelectedIdx: 0,
  commentPage: 0, commentPageStarts: [0],
  settingsApplied: false, watchPageRetryCount: 0, commentLoadAttempts: 0 }

// After navigating to second comment page
{ chapterQuery: '', chapterSelectedIdx: 0,
  commentPage: 1, commentPageStarts: [0, 5],
  settingsApplied: true, watchPageRetryCount: 0, commentLoadAttempts: 0 }
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
| DrawerState | Union | Core | Case per variant (null / 'palette' / 'filter' / site-specific values) |
| DrawerHandler | Compound | Core | Access all fields |
| ListDrawerConfig | Compound | Core | Access all fields |
| AppState | Compound | Core | Access all fields |
| YouTubePageType | Enum | YouTube | Case per variant |
| VideoContext | Compound | YouTube | Access all fields |
| Chapter | Compound | YouTube | Access all fields |
| Comment | Compound | YouTube | Access all fields |
| CommentStatus | Enum | YouTube | Case per variant |
| CommentsResult | Compound | YouTube | Access all fields |
| YouTubeState | Compound | YouTube | Access all fields |

---

## Deferred to Later

- **Comment replies**: Nested comments with parent/child relationships
- **Caching**: itemCache, itemCacheTime for performance optimization
