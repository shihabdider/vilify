# Architecture Diagrams

Visual overview of Vilify's data types and module organization.

---

## 1. Module Organization (Set Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VILIFY EXTENSION                                │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                           src/core/                                   │  │
│  │                      (Site-Agnostic Layer)                            │  │
│  │                                                                       │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │  │
│  │   │  AppState   │  │ DrawerState │  │  SortField  │  │  Command   │  │  │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │  │
│  │                                                                       │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │  │
│  │   │ SiteConfig  │  │  SiteTheme  │  │   Layouts   │  │ LayoutDef  │  │  │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │  │
│  │                                                                       │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │  │
│  │   │ContentItem  │  │ GroupHeader │  │    Item     │  │DrawerHandler│ │  │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │  │
│  │                                                                       │  │
│  │   ┌───────────────────┐                                               │  │
│  │   │ ListDrawerConfig  │                                               │  │
│  │   └───────────────────┘                                               │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    │ imports                                │
│                                    ▼                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       src/sites/youtube/                              │  │
│  │                      (YouTube-Specific Layer)                         │  │
│  │                                                                       │  │
│  │   ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐    │  │
│  │   │YouTubePageType│  │ VideoContext  │  │      Chapter          │    │  │
│  │   └───────────────┘  └───────────────┘  └───────────────────────┘    │  │
│  │                                                                       │  │
│  │   ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐    │  │
│  │   │    Comment    │  │ CommentStatus │  │    CommentsResult     │    │  │
│  │   └───────────────┘  └───────────────┘  └───────────────────────┘    │  │
│  │                                                                       │  │
│  │   ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐    │  │
│  │   │TranscriptLine │  │TranscriptStatus│ │   TranscriptResult    │    │  │
│  │   └───────────────┘  └───────────────┘  └───────────────────────┘    │  │
│  │                                                                       │  │
│  │   ┌───────────────────┐                                               │  │
│  │   │   YouTubeState    │                                               │  │
│  │   └───────────────────┘                                               │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Type Relationships

```
                              ┌──────────────────┐
                              │    SiteConfig    │
                              │                  │
                              │  name            │
                              │  matches[]       │
                              │  theme ──────────┼──────────────┐
                              │  layouts ────────┼────────┐     │
                              │  getPageType()   │        │     │
                              │  getItems() ─────┼──┐     │     │
                              │  getCommands()───┼──┼─┐   │     │
                              │  getDrawerHandler│  │ │   │     │
                              │  createSiteState │  │ │   │     │
                              └────────┬─────────┘  │ │   │     │
                                       │            │ │   │     │
           ┌───────────────────────────┘            │ │   │     │
           │                                        │ │   │     │
           ▼                                        │ │   │     │
┌─────────────────────┐                             │ │   │     │
│   DrawerHandler     │                             │ │   │     │
│                     │                             │ │   │     │
│  render()           │                             │ │   │     │
│  onKey()            │                             │ │   │     │
│  cleanup()          │                             │ │   │     │
│  updateQuery()      │                             │ │   │     │
│  getFilterPlaceholder│                            │ │   │     │
└─────────────────────┘                             │ │   │     │
           ▲                                        │ │   │     │
           │ creates                                │ │   │     │
           │                                        │ │   │     │
┌─────────────────────┐                             │ │   │     │
│  ListDrawerConfig   │                             │ │   │     │
│                     │                             │ │   │     │
│  id                 │                             │ │   │     │
│  getItems()         │                             │ │   │     │
│  renderItem()       │                             │ │   │     │
│  onSelect()         │                             │ │   │     │
│  filterPlaceholder  │                             │ │   │     │
│  matchesFilter()    │                             │ │   │     │
└─────────────────────┘                             │ │   │     │
                                                    │ │   │     │
                     ┌──────────────────────────────┘ │   │     │
                     │  ┌────────────────────────────-┘   │     │
                     │  │                                 │     │
                     ▼  ▼                                 ▼     ▼
              ┌────────────┐                      ┌─────────┐ ┌───────────┐
              │    Item    │                      │ Layouts │ │ SiteTheme │
              │  (union)   │                      │         │ │           │
              └─────┬──────┘                      │ {page:  │ │ bg1, bg2  │
                    │                             │  Layout}│ │ txt1,txt2 │
        ┌───────────┼───────────┐                 └────┬────┘ │ accent    │
        │           │           │                      │      └───────────┘
        ▼           ▼           ▼                      ▼
┌───────────┐ ┌───────────┐ ┌───────────┐      ┌───────────┐
│  Command  │ │ContentItem│ │GroupHeader│      │ LayoutDef │
│           │ │           │ │           │      │  (union)  │
│ label     │ │ type      │ │ group     │      └─────┬─────┘
│ icon      │ │ id        │ └───────────┘            │
│ action()  │ │ title     │               ┌──────────┼──────────┐
│ keys      │ │ url       │               │          │          │
│ meta      │ │ thumbnail │               ▼          ▼          ▼
│ group     │ │ meta      │          'listing'  'detail'   Function
└───────────┘ │ subtitle  │
              │ data{}    │
              └───────────┘
```

---

## 3. Application State Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            AppState                                      │
│                                                                         │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────────┐  │
│  │ focusModeActive │  │   drawerState    │  │     selectedIdx       │  │
│  │    (Boolean)    │  │   (DrawerState)  │  │      (Number)         │  │
│  └─────────────────┘  └────────┬─────────┘  └───────────────────────┘  │
│                                │                                        │
│  ┌─────────────────┐  ┌────────┴─────────┐  ┌───────────────────────┐  │
│  │  paletteQuery   │  │                  │  │  localFilterActive    │  │
│  │    (String)     │  │   DrawerState    │  │     (Boolean)         │  │
│  └─────────────────┘  │     (enum)       │  └───────────────────────┘  │
│                       │                  │                              │
│  ┌─────────────────┐  │  null            │  ┌───────────────────────┐  │
│  │paletteSelectedIdx│ │  'palette'       │  │  localFilterQuery     │  │
│  │    (Number)     │  │  'recommended'   │  │      (String)         │  │
│  └─────────────────┘  │  'chapters'  ────┼──┼─► YouTube-specific    │  │
│                       │  'description'───┼──┘                        │  │
│  ┌─────────────────┐  │  'transcript'────┼─────► YouTube-specific    │  │
│  │    sortField    │  │                  │                           │  │
│  │   (SortField)   │  └──────────────────┘  ┌───────────────────────┐  │
│  └────────┬────────┘                        │    siteSearchActive   │  │
│           │                                 │      (Boolean)        │  │
│  ┌────────┴────────┐                        └───────────────────────┘  │
│  │   SortField     │                                                   │
│  │    (enum)       │                        ┌───────────────────────┐  │
│  │                 │                        │   siteSearchQuery     │  │
│  │  null           │                        │      (String)         │  │
│  │  'date'         │                        └───────────────────────┘  │
│  │  'duration'     │                                                   │
│  │  'title'        │                        ┌───────────────────────┐  │
│  │  'channel'      │                        │       keySeq          │  │
│  │  'views'        │                        │      (String)         │  │
│  └─────────────────┘                        └───────────────────────┘  │
│                                                                         │
│  ┌─────────────────┐                        ┌───────────────────────┐  │
│  │  sortDirection  │                        │       lastUrl         │  │
│  │ ('asc'|'desc')  │                        │      (String)         │  │
│  └─────────────────┘                        └───────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. YouTube Type Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              YouTubeState                                    │
│                                                                             │
│   chapterQuery ─────────┐                                                   │
│   chapterSelectedIdx    │  (Used internally by chapter drawer)              │
│   commentPage ──────────┼──────────────────────────────────────┐            │
│   commentPageStarts[]   │                                      │            │
│   settingsApplied       │                                      │            │
│   watchPageRetryCount   │                                      │            │
│   commentLoadAttempts   │                                      │            │
│   transcript ───────────┼─────────┐                            │            │
│                         │         │                            │            │
└─────────────────────────┼─────────┼────────────────────────────┼────────────┘
                          │         │                            │
                          │         ▼                            │
                          │  ┌──────────────────┐                │
                          │  │ TranscriptResult │                │
                          │  │                  │                │
                          │  │  status ─────────┼───┐            │
                          │  │  lines[] ────────┼─┐ │            │
                          │  │  language        │ │ │            │
                          │  └──────────────────┘ │ │            │
                          │                       │ │            │
                          │         ┌─────────────┘ │            │
                          │         │               │            │
                          │         ▼               ▼            │
                          │  ┌──────────────┐ ┌─────────────────┐│
                          │  │TranscriptLine│ │TranscriptStatus ││
                          │  │              │ │     (enum)      ││
                          │  │  time        │ │                 ││
                          │  │  timeText    │ │  'loading'      ││
                          │  │  duration    │ │  'loaded'       ││
                          │  │  text        │ │  'unavailable'  ││
                          │  └──────────────┘ └─────────────────┘│
                          │                                      │
                          │                                      │
                          ▼                                      ▼
                   ┌──────────────────┐                  ┌──────────────────┐
                   │   VideoContext   │                  │  CommentsResult  │
                   │                  │                  │                  │
                   │  videoId         │                  │  comments[] ─────┼──┐
                   │  url             │                  │  status ─────────┼─┐│
                   │  cleanUrl        │                  └──────────────────┘ ││
                   │  title           │                                       ││
                   │  channelName     │                       ┌───────────────┘│
                   │  channelUrl      │                       │                │
                   │  uploadDate      │                       ▼                │
                   │  description     │              ┌─────────────────┐       │
                   │  views           │              │  CommentStatus  │       │
                   │  isSubscribed    │              │     (enum)      │       │
                   │  isLiked         │              │                 │       │
                   │  currentTime     │              │  'loading'      │       │
                   │  duration        │              │  'disabled'     │       │
                   │  paused          │              │  'loaded'       │       │
                   │  playbackRate    │              └─────────────────┘       │
                   │  volume          │                                        │
                   │  muted           │                       ┌────────────────┘
                   │  chapters[] ─────┼───┐                   │
                   └──────────────────┘   │                   ▼
                                          │           ┌─────────────┐
                                          │           │   Comment   │
                                          ▼           │             │
                                   ┌─────────────┐    │  author     │
                                   │   Chapter   │    │  text       │
                                   │             │    └─────────────┘
                                   │  title      │
                                   │  time       │
                                   │  timeText   │
                                   │  thumbnailUrl│
                                   └─────────────┘
```

---

## 5. Data Flow Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                  USER INPUT                                   │
│                           (keyboard events, clicks)                           │
└─────────────────────────────────────┬────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              KEYBOARD HANDLER                                 │
│                            (src/core/keyboard.js)                            │
│                                                                              │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐ │
│   │  Key Sequences  │    │ Single-Key Acts │    │   Drawer Key Handling   │ │
│   │   (gh, gs, yy)  │    │    (Y, M, G)    │    │  (Escape, Enter, j/k)   │ │
│   └────────┬────────┘    └────────┬────────┘    └───────────┬─────────────┘ │
└────────────┼──────────────────────┼─────────────────────────┼────────────────┘
             │                      │                         │
             └──────────────────────┼─────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                               STATE UPDATE                                    │
│                             (src/core/state.js)                              │
│                                                                              │
│                    ┌───────────────────────────────┐                         │
│                    │          AppState             │                         │
│                    │  + YouTubeState (site-specific)│                        │
│                    └───────────────┬───────────────┘                         │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                                 RENDER                                        │
│                             (src/core/index.js)                              │
│                                                                              │
│   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐ │
│   │   Status Bar    │    │   Main Content  │    │        Drawers          │ │
│   │  (mode, input)  │    │ (listing/watch) │    │ (palette, chapters...)  │ │
│   └─────────────────┘    └─────────────────┘    └─────────────────────────┘ │
│                                    │                                         │
│                          ┌─────────┴─────────┐                               │
│                          ▼                   ▼                               │
│               ┌─────────────────┐  ┌─────────────────┐                       │
│               │  Listing Page   │  │   Watch Page    │                       │
│               │                 │  │                 │                       │
│               │  ┌───────────┐  │  │  ┌───────────┐  │                       │
│               │  │Item[]     │  │  │  │VideoContext│ │                       │
│               │  │(filtered) │  │  │  │+ Comments │  │                       │
│               │  │(sorted)   │  │  │  │+ Chapters │  │                       │
│               │  └───────────┘  │  │  └───────────┘  │                       │
│               └─────────────────┘  └─────────────────┘                       │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              DATA PROVIDERS                                   │
│                         (src/sites/youtube/data/)                            │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         DataProvider                                 │   │
│   │                                                                      │   │
│   │   ┌───────────────────┐              ┌───────────────────────────┐  │   │
│   │   │  Fetch Intercept  │─────────────▶│       Extractors          │  │   │
│   │   │ (API responses)   │              │  (parse ytInitialData)    │  │   │
│   │   └───────────────────┘              └───────────────────────────┘  │   │
│   │            │                                      │                 │   │
│   │            │ fallback                             │                 │   │
│   │            ▼                                      ▼                 │   │
│   │   ┌───────────────────┐              ┌───────────────────────────┐  │   │
│   │   │   DOM Fallback    │              │      getVideos()          │  │   │
│   │   │  (scrape DOM)     │              │    getVideoContext()      │  │   │
│   │   └───────────────────┘              └───────────────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. File Organization

```
vilify/
├── src/
│   ├── core/                          # Site-agnostic primitives
│   │   ├── index.js                   # Main orchestration
│   │   ├── state.js                   # AppState management
│   │   ├── keyboard.js                # Key sequence engine
│   │   ├── layout.js                  # Focus mode, status bar, listing
│   │   ├── drawer.js                  # Drawer factories
│   │   ├── palette.js                 # Command palette
│   │   ├── sort.js                    # List sorting
│   │   ├── view.js                    # DOM utilities
│   │   ├── loading.js                 # Loading screen
│   │   ├── navigation.js              # SPA navigation observer
│   │   └── actions.js                 # Copy/navigate helpers
│   │
│   └── sites/
│       └── youtube/                   # YouTube implementation
│           ├── index.js               # SiteConfig export
│           ├── scraper.js             # DOM scraping
│           ├── commands.js            # Commands & key bindings
│           ├── player.js              # Video player controls
│           ├── watch.js               # Watch page layout
│           ├── transcript.js          # Transcript fetching
│           ├── items.js               # Custom item rendering
│           │
│           ├── drawers/               # YouTube-specific drawers
│           │   ├── index.js           # Drawer exports
│           │   ├── chapters.js        # Chapter picker
│           │   ├── description.js     # Description viewer
│           │   └── transcript.js      # Transcript viewer
│           │
│           └── data/                  # Data provider
│               ├── index.js           # DataProvider abstraction
│               ├── fetch-intercept.js # API interception
│               ├── extractors.js      # Data extraction
│               ├── dom-fallback.js    # DOM scraping fallback
│               ├── initial-data.js    # ytInitialData parsing
│               ├── navigation.js      # SPA navigation handling
│               └── main-world-bridge.js # Content script bridge
│
├── .design/                           # Design documentation
│   ├── PROJECT.md                     # Project overview
│   ├── DATA.md                        # Type definitions
│   ├── STYLES.md                      # Visual design
│   ├── SCRAPING.md                    # DOM selectors
│   └── ARCHITECTURE.md                # This file
│
└── dist/                              # Build output
    └── content.js                     # Bundled extension
```

---

## 7. Type Classification Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TYPE CLASSIFICATIONS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   COMPOUNDS (access all fields)                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Core:     SiteConfig, SiteTheme, Command, ContentItem, GroupHeader, │   │
│   │           DrawerHandler, ListDrawerConfig, AppState                 │   │
│   │                                                                     │   │
│   │ YouTube:  VideoContext, Chapter, Comment, CommentsResult,           │   │
│   │           TranscriptLine, TranscriptResult, YouTubeState            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   UNIONS (case per variant)                                                 │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Item         = Command | ContentItem | GroupHeader                  │   │
│   │ LayoutDef    = 'listing' | 'detail' | RenderFunction                │   │
│   │ DrawerState  = null | 'palette' | 'recommended' | 'chapters' | ...  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ENUMS (case per variant)                                                  │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Core:     SortField (null|'date'|'duration'|'title'|'channel'|'views')│  │
│   │                                                                     │   │
│   │ YouTube:  YouTubePageType ('watch'|'home'|'search'|'channel'|...)   │   │
│   │           CommentStatus ('loading'|'disabled'|'loaded')             │   │
│   │           TranscriptStatus ('loading'|'loaded'|'unavailable')       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   MAPPINGS (iterate keys)                                                   │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Layouts = { [PageType]: LayoutDef }                                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Dependency Rules Visualization

```
                    ┌─────────────────────────────────────┐
                    │           DEPENDENCY RULES          │
                    └─────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │                         src/core/                                │
    │                    (NO SITE IMPORTS)                             │
    │                                                                  │
    │    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
    │    │ index.js │  │ state.js │  │keyboard.js│ │ layout.js│      │
    │    └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
    │         │             │             │             │             │
    │         └──────┬──────┴──────┬──────┴──────┬──────┘             │
    │                │             │             │                     │
    │                ▼             ▼             ▼                     │
    │         ┌──────────┐  ┌──────────┐  ┌──────────┐               │
    │         │ drawer.js│  │ palette.js│ │  sort.js │               │
    │         └──────────┘  └──────────┘  └──────────┘               │
    │                │             │             │                     │
    │                └──────┬──────┴─────────────┘                     │
    │                       │                                          │
    │                       ▼                                          │
    │              ┌──────────────────┐                                │
    │              │     view.js      │                                │
    │              │   actions.js     │                                │
    │              │   loading.js     │                                │
    │              │  navigation.js   │                                │
    │              └──────────────────┘                                │
    │                                                                  │
    └────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 │ CAN IMPORT
                                 ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                                                                  │
    │                     src/sites/youtube/                           │
    │                    (CAN IMPORT CORE)                             │
    │                                                                  │
    │    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
    │    │ index.js │  │commands.js│ │ player.js│  │ watch.js │      │
    │    └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
    │         │             │             │             │             │
    │         │             └──────┬──────┴─────────────┘             │
    │         │                    │                                   │
    │         │                    ▼                                   │
    │         │        ┌─────────────────────────┐                    │
    │         │        │      scraper.js         │                    │
    │         │        │     transcript.js       │                    │
    │         │        │       items.js          │                    │
    │         │        └───────────┬─────────────┘                    │
    │         │                    │                                   │
    │         │                    ▼                                   │
    │         │         ┌──────────────────┐                          │
    │         └────────▶│    drawers/      │                          │
    │                   │      data/       │                          │
    │                   └──────────────────┘                          │
    │                                                                  │
    └──────────────────────────────────────────────────────────────────┘

                    ❌ sites/ MUST NOT import from other sites/
                    ❌ core/ MUST NOT import from sites/
```
