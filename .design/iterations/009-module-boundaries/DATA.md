# Data Definitions - Iteration 009: Module Boundaries

## Overview

Types introduced or modified to enforce clean separation between site-agnostic core and site-specific implementations.

**Key changes:**
- Rename "modal" → "drawer" throughout (all UI panels are drawers from status bar)
- Introduce PageConfig to group page-specific behavior
- Move drawer-specific state out of AppState (each drawer manages its own)
- Add Context type for passing state to page functions

**References**: This iteration uses these existing types from master DATA.md:
- SiteTheme (Core)
- LayoutDef (Core)
- Command (Core)
- Item (Core)
- YouTubeState (YouTube) - code relocation only, no type changes

---

## Context (NEW)

A Context is a structure:
- state: AppState - current app state
- siteState: Object | null - site-specific state (YouTubeState, etc.)

**Where**: Core

**Examples**:
```js
// YouTube watch page context
{
  state: { focusModeActive: true, drawerState: null, selectedIdx: 0, ... },
  siteState: { chapterQuery: '', chapterSelectedIdx: 0, settingsApplied: true, ... }
}

// Site without custom state
{
  state: { focusModeActive: true, ... },
  siteState: null
}
```

---

## DrawerState (NEW)

A DrawerState is one of:
- null - no drawer open
- 'palette' - command palette drawer (core)
- String - site-specific drawer identifier

**Where**: Core

**Examples**:
```js
null           // Normal state, no drawer
'palette'      // Command palette (core-owned)
'chapters'     // YouTube chapter picker
'description'  // YouTube description drawer
'labels'       // Gmail label picker (future)
```

**Note**: Core only handles 'palette'. Any other string is delegated to the site via `PageConfig.getDrawerHandler()`.

---

## DrawerHandler (NEW)

A DrawerHandler is a structure:
- render: Function - (container) => void, renders drawer content into container
- onKey: Function - (key, state) => { handled: Boolean, newState: AppState }
- cleanup: Function | null - () => void, optional teardown when drawer closes

**Where**: Core (interface that sites implement)

**Examples**:
```js
// YouTube chapter drawer handler
{
  render: (container) => {
    // Render chapter list with filter input
    container.innerHTML = '<div class="drawer">...</div>';
  },
  onKey: (key, state) => {
    if (key === 'Escape') {
      return { handled: true, newState: { ...state, drawerState: null } };
    }
    if (key === 'ArrowDown') {
      // Move selection down in chapter list (state managed internally)
      return { handled: true, newState: state };
    }
    return { handled: false, newState: state };
  },
  cleanup: () => {
    // Optional: clear internal state
  }
}

// YouTube description drawer handler
{
  render: (container) => {
    // Render scrollable description text
  },
  onKey: (key, state) => {
    if (key === 'Escape') {
      return { handled: true, newState: { ...state, drawerState: null } };
    }
    // j/k for scrolling handled internally
    return { handled: false, newState: state };
  },
  cleanup: null
}
```

**Note**: Each drawer manages its own internal state (filter query, selected index, etc.) via closures or module-level state. AppState only tracks which drawer is open.

---

## ListDrawerConfig (NEW)

A ListDrawerConfig is a structure:
- id: String - unique drawer identifier (e.g., 'chapters', 'labels')
- getItems: Function - () => Array\<Object\>, returns current items to display
- renderItem: Function - (item, isSelected) => HTMLElement
- onSelect: Function - (item) => void, called when user presses Enter
- filterPlaceholder: String - placeholder text for filter input
- matchesFilter: Function | null - (item, query) => Boolean, custom filter logic (null = default title match)

**Where**: Core

**Examples**:
```js
// YouTube chapter picker
{
  id: 'chapters',
  getItems: () => scrapeChapters(),
  renderItem: (chapter, isSelected) => {
    const el = document.createElement('div');
    el.textContent = `${chapter.timeText} ${chapter.title}`;
    el.className = isSelected ? 'selected' : '';
    return el;
  },
  onSelect: (chapter) => seekTo(chapter.time),
  filterPlaceholder: 'Filter chapters...',
  matchesFilter: null  // default: match on title
}

// GitHub label picker
{
  id: 'labels',
  getItems: () => getRepoLabels(),
  renderItem: (label, isSelected) => {
    const el = document.createElement('div');
    el.innerHTML = `<span style="background:${label.color}">●</span> ${label.name}`;
    return el;
  },
  onSelect: (label) => toggleLabel(label.id),
  filterPlaceholder: 'Filter labels...',
  matchesFilter: (label, query) => label.name.toLowerCase().includes(query.toLowerCase())
}
```

**Usage**: Core provides `createListDrawer(config)` which returns a `DrawerHandler`. Sites use this for the common "filterable list" pattern (~80% of drawers). For custom drawers (like description), sites implement `DrawerHandler` directly.

---

## PageConfig (NEW)

A PageConfig is a structure:
- layout: LayoutDef - 'listing', 'detail', or custom render function
- getItems: Function | null - () => Array\<Item\>, null for non-listing pages
- getCommands: Function - (ctx: Context) => Array\<Command\>
- getKeySequences: Function - (ctx: Context) => Object
- getDrawerHandler: Function | null - (drawerState) => DrawerHandler | null
- renderItem: Function | null - (item, isSelected) => HTMLElement, optional override

**Where**: Core

**Examples**:
```js
// YouTube home page
{
  layout: 'listing',
  getItems: () => scrapeHomeVideos(),
  getCommands: (ctx) => homeCommands,
  getKeySequences: (ctx) => homeKeymap,
  getDrawerHandler: null,  // no custom drawers
  renderItem: null  // use default
}

// YouTube watch page
{
  layout: (ctx, container) => renderWatchPage(ctx, container),
  getItems: null,  // not a listing page
  getCommands: (ctx) => watchCommands(ctx),
  getKeySequences: (ctx) => watchKeymap,
  getDrawerHandler: (drawerState) => {
    if (drawerState === 'chapters') return chapterDrawer;
    if (drawerState === 'description') return descriptionDrawer;
    return null;
  },
  renderItem: null
}

// Gmail inbox
{
  layout: 'listing',
  getItems: () => scrapeEmails(),
  getCommands: (ctx) => inboxCommands,
  getKeySequences: (ctx) => inboxKeymap,
  getDrawerHandler: (drawerState) => {
    if (drawerState === 'labels') return labelDrawer;
    return null;
  },
  renderItem: (email, isSelected) => renderEmailRow(email, isSelected)
}
```

**Note**: A site is a collection of pages. Each page defines its own layout, scraper, commands, keybindings, and drawers.

---

## SiteConfig (MODIFIED)

A SiteConfig is a structure:
- name: String - site identifier ('youtube', 'gmail', etc.)
- matches: Array\<String\> - URL patterns for site matching
- theme: SiteTheme - color scheme
- logo: HTMLElement | null - branding for loading screen
- getPageType: Function - () => String
- pages: Object - { [pageType]: PageConfig }
- getSiteState: Function | null - () => Object, site-specific state (YouTubeState, etc.)
- onContentReady: Function | null - () => void, called after render completes

**Where**: Core

**Removed fields** (moved to PageConfig):
- ~~getItems~~ → `PageConfig.getItems`
- ~~getCommands~~ → `PageConfig.getCommands`
- ~~getKeySequences~~ → `PageConfig.getKeySequences`
- ~~layouts~~ → replaced by `pages` (each PageConfig has `layout`)
- ~~renderItem~~ → `PageConfig.renderItem`

**Examples**:
```js
// YouTube
{
  name: 'youtube',
  matches: ['*://www.youtube.com/*'],
  theme: { bg1: '#002b36', accent: '#ff0000', ... },
  logo: createYouTubeLogo(),
  getPageType: () => detectYouTubePage(),
  pages: {
    home: homePageConfig,
    watch: watchPageConfig,
    search: searchPageConfig,
    channel: channelPageConfig
  },
  getSiteState: () => youtubeState,
  onContentReady: null
}

// Simple site with no custom state
{
  name: 'hackernews',
  matches: ['*://news.ycombinator.com/*'],
  theme: { bg1: '#002b36', accent: '#ff6600', ... },
  logo: null,
  getPageType: () => 'listing',
  pages: {
    listing: hnListingConfig
  },
  getSiteState: null,
  onContentReady: null
}
```

---

## AppState (MODIFIED)

An AppState is a structure:
- focusModeActive: Boolean - is focus mode overlay showing?
- drawerState: DrawerState - which drawer is open (renamed from modalState)
- selectedIdx: Number - selected item index in listing
- localFilterActive: Boolean - is local filter input shown?
- localFilterQuery: String - current local filter text
- siteSearchActive: Boolean - is site search input focused?
- siteSearchQuery: String - current site search text
- keySeq: String - current key sequence being built
- lastUrl: String - for detecting SPA navigation

**Where**: Core

**Removed fields** (drawer-specific state managed internally by each drawer):
- ~~paletteQuery~~ → managed by palette drawer
- ~~paletteSelectedIdx~~ → managed by palette drawer
- ~~modalState~~ → renamed to `drawerState`

**Examples**:
```js
// Initial state
{ focusModeActive: true, drawerState: null, selectedIdx: 0,
  localFilterActive: false, localFilterQuery: '',
  siteSearchActive: false, siteSearchQuery: '',
  keySeq: '', lastUrl: 'https://youtube.com/' }

// Palette drawer open (palette manages its own query/selection)
{ focusModeActive: true, drawerState: 'palette', selectedIdx: 0,
  localFilterActive: false, localFilterQuery: '',
  siteSearchActive: false, siteSearchQuery: '',
  keySeq: '', lastUrl: '...' }

// YouTube chapter drawer open
{ focusModeActive: true, drawerState: 'chapters', selectedIdx: 0,
  localFilterActive: false, localFilterQuery: '',
  siteSearchActive: false, siteSearchQuery: '',
  keySeq: '', lastUrl: '...' }
```

---

## ModalState (DELETED)

Replaced by `DrawerState`. All UI panels are drawers from the status bar, not modals.

---

## Summary

| Type | Classification | Where | Status |
|------|---------------|-------|--------|
| Context | Compound | Core | NEW |
| DrawerState | Union | Core | NEW (replaces ModalState) |
| DrawerHandler | Compound | Core | NEW |
| ListDrawerConfig | Compound | Core | NEW |
| PageConfig | Compound | Core | NEW |
| SiteConfig | Compound | Core | MODIFIED |
| AppState | Compound | Core | MODIFIED |
| ModalState | - | - | DELETED |

---

## Code Relocation (No Type Changes)

- `createYouTubeState()` moves from `src/core/state.js` to `src/sites/youtube/state.js`
- YouTubeState type definition unchanged
