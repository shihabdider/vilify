# Blueprint - Iteration 009: Module Boundaries

## Overview

Functions to refactor core modules and move YouTube-specific code to site implementation. This is a restructuring iteration - no new user-facing features, but cleaner architecture.

**Dependencies**: Uses types from iteration DATA.md:
- Context, DrawerState, DrawerHandler, ListDrawerConfig, PageConfig, SiteConfig, AppState

---

## B1: Core modals.js has no YouTube code

### createListDrawer

**Signature**: `createListDrawer : ListDrawerConfig -> DrawerHandler`
**Purpose**: Factory that creates a DrawerHandler for filterable list drawers. Manages filter query and selected index internally via closure.
**Where**: Core (`src/core/drawer.js`)
**Type**: [PURE] (returns handler; handler methods have IO)

**Examples**:
```js
// Create a list drawer from config
const drawer = createListDrawer({
  id: 'chapters',
  getItems: () => [{ title: 'Intro', time: 0 }, { title: 'Main', time: 60 }],
  renderItem: (item, isSelected) => {
    const el = document.createElement('div');
    el.textContent = item.title;
    el.className = isSelected ? 'selected' : '';
    return el;
  },
  onSelect: (item) => console.log('Selected:', item.title),
  filterPlaceholder: 'Filter...',
  matchesFilter: null
});

// Returns DrawerHandler
drawer.render    // (container) => void
drawer.onKey     // (key, state) => { handled, newState }
drawer.cleanup   // () => void

// Escape closes drawer
drawer.onKey('Escape', { drawerState: 'chapters', ... })
// => { handled: true, newState: { drawerState: null, ... } }

// ArrowDown moves selection (internal state)
drawer.onKey('ArrowDown', state)
// => { handled: true, newState: state }

// ArrowUp moves selection up
drawer.onKey('ArrowUp', state)
// => { handled: true, newState: state }

// Enter calls onSelect with selected item, closes drawer
drawer.onKey('Enter', state)
// => { handled: true, newState: { drawerState: null, ... } }
// Side effect: onSelect(selectedItem) called

// Typing updates filter query (internal state), re-renders
drawer.onKey('i', state)  // filter query becomes 'i', shows 'Intro'
// => { handled: true, newState: state }

// Backspace removes last char from query
drawer.onKey('Backspace', state)
// => { handled: true, newState: state }

// Custom matchesFilter
const labelDrawer = createListDrawer({
  ...config,
  matchesFilter: (label, query) => label.name.toLowerCase().includes(query)
});

// No items match filter - selection stays at 0
drawer.onKey('x', state)  // query 'x' matches nothing
// => { handled: true, newState: state }  // selectedIdx clamped to 0
```

**Template**:
```js
function createListDrawer(config) {
  // Inventory: config (ListDrawerConfig)
  //   .id: String
  //   .getItems: () => Array<Object>
  //   .renderItem: (item, isSelected) => HTMLElement
  //   .onSelect: (item) => void
  //   .filterPlaceholder: String
  //   .matchesFilter: ((item, query) => Boolean) | null
  
  // Internal state (closure-scoped)
  let query = '';
  let selectedIdx = 0;
  
  const getFilteredItems = () => {
    const items = config.getItems();
    if (!query) return items;
    const match = config.matchesFilter || ((item, q) => 
      item.title?.toLowerCase().includes(q.toLowerCase())
    );
    return items.filter(item => match(item, query));
  };
  
  return {
    render: (container) => {
      // Template (compound): access config fields
      // 1. Create filter input with config.filterPlaceholder
      // 2. Get filtered items via getFilteredItems()
      // 3. Render each with config.renderItem(item, idx === selectedIdx)
      // 4. Append to container
    },
    
    onKey: (key, state) => {
      // Template (enumeration): case per key type
      // Escape: return { handled: true, newState: { ...state, drawerState: null } }
      // ArrowDown: selectedIdx = min(selectedIdx + 1, filteredItems.length - 1)
      // ArrowUp: selectedIdx = max(selectedIdx - 1, 0)
      // Enter: call config.onSelect(filteredItems[selectedIdx]), close drawer
      // Backspace: query = query.slice(0, -1)
      // Single char: query += key
      // Re-render after state change
    },
    
    cleanup: () => {
      query = '';
      selectedIdx = 0;
    }
  };
}
```

---

### createPaletteDrawer

**Signature**: `createPaletteDrawer : (() => Array<Command>) -> DrawerHandler`
**Purpose**: Creates the command palette drawer. Takes a function to get current commands (varies by page/context). Manages query and selection internally.
**Where**: Core (`src/core/drawer.js` or `src/core/palette.js`)
**Type**: [PURE] (returns handler; handler methods have IO)

**Examples**:
```js
// Create palette with command getter
const palette = createPaletteDrawer(() => [
  { label: 'Home', icon: '🏠', action: goHome, keys: 'G H', group: 'Navigation' },
  { label: 'Speed 2x', icon: '🏃', action: setSpeed2x, keys: null, group: 'Playback' }
]);

// Renders input + grouped command list
palette.render(container);
// => <input> + <div class="group">Navigation</div> + commands...

// Escape closes
palette.onKey('Escape', { drawerState: 'palette', ... })
// => { handled: true, newState: { drawerState: null, ... } }

// Typing filters commands
palette.onKey('h', state)  // query 'h' matches 'Home'
// => { handled: true, newState: state }

// Arrow navigation
palette.onKey('ArrowDown', state)
// => { handled: true, newState: state }

// Enter executes command and closes
palette.onKey('Enter', state)
// => { handled: true, newState: { drawerState: null, ... } }
// Side effect: selectedCommand.action() called

// Empty query shows all commands grouped
palette.onKey('Backspace', state)  // clear query
// => shows all commands in groups
```

**Template**:
```js
function createPaletteDrawer(getCommands) {
  // Inventory: getCommands (() => Array<Command>)
  
  // Internal state
  let query = '';
  let selectedIdx = 0;
  
  const getFilteredCommands = () => {
    const commands = getCommands();
    if (!query) return commands;
    return commands.filter(cmd => 
      cmd.label?.toLowerCase().includes(query.toLowerCase())
    );
  };
  
  return {
    render: (container) => {
      // 1. Create input
      // 2. Get filtered commands
      // 3. Group by cmd.group (if no query) or flat list (if filtering)
      // 4. Render each command with selection highlight
    },
    
    onKey: (key, state) => {
      // Escape: close
      // ArrowDown/Up: navigate
      // Enter: execute selectedCommand.action(), close
      // Backspace: remove char
      // Char: append to query
    },
    
    cleanup: () => {
      query = '';
      selectedIdx = 0;
    }
  };
}
```

---

## B2: Core state.js has no YouTube code

### createAppState

**Signature**: `createAppState : () -> AppState`
**Purpose**: Creates initial app state. No site-specific state - that's handled by sites via getSiteState().
**Where**: Core (`src/core/state.js`)
**Type**: [PURE]

**Examples**:
```js
createAppState()
// => {
//   focusModeActive: false,
//   drawerState: null,
//   selectedIdx: 0,
//   localFilterActive: false,
//   localFilterQuery: '',
//   siteSearchActive: false,
//   siteSearchQuery: '',
//   keySeq: '',
//   lastUrl: ''
// }
```

**Template**:
```js
function createAppState() {
  // Template (compound): create with default field values
  return {
    focusModeActive: false,
    drawerState: null,
    selectedIdx: 0,
    localFilterActive: false,
    localFilterQuery: '',
    siteSearchActive: false,
    siteSearchQuery: '',
    keySeq: '',
    lastUrl: ''
  };
}
```

---

### createYouTubeState

**Signature**: `createYouTubeState : () -> YouTubeState`
**Purpose**: Creates initial YouTube-specific state. Relocated from core/state.js.
**Where**: YouTube (`src/sites/youtube/state.js`)
**Type**: [PURE]

**Examples**:
```js
createYouTubeState()
// => {
//   chapterQuery: '',
//   chapterSelectedIdx: 0,
//   settingsApplied: false,
//   watchPageRetryCount: 0,
//   commentLoadAttempts: 0
// }
```

**Template**:
```js
function createYouTubeState() {
  // Template (compound): create with default field values
  return {
    chapterQuery: '',
    chapterSelectedIdx: 0,
    settingsApplied: false,
    watchPageRetryCount: 0,
    commentLoadAttempts: 0
  };
}
```

---

## B3: Core keyboard.js has no hardcoded modes

### handleDrawerKey

**Signature**: `handleDrawerKey : (Key, AppState, DrawerHandler | null) -> { handled: Boolean, newState: AppState }`
**Purpose**: Routes key events to the appropriate drawer handler. If no handler (null), returns unhandled. Core handles 'palette' drawer internally; site drawers are passed in.
**Where**: Core (`src/core/keyboard.js`)
**Type**: [PURE] (delegates to handler which may have IO)

**Examples**:
```js
// No drawer open - not handled
handleDrawerKey('j', { drawerState: null, ... }, null)
// => { handled: false, newState: state }

// Palette drawer - core handles internally
handleDrawerKey('Escape', { drawerState: 'palette', ... }, paletteHandler)
// => { handled: true, newState: { drawerState: null, ... } }

// Site drawer - delegates to handler
const chapterHandler = { onKey: (k, s) => ({ handled: true, newState: s }) };
handleDrawerKey('ArrowDown', { drawerState: 'chapters', ... }, chapterHandler)
// => { handled: true, newState: state }

// Handler returns unhandled - bubble up
const passiveHandler = { onKey: (k, s) => ({ handled: false, newState: s }) };
handleDrawerKey('?', state, passiveHandler)
// => { handled: false, newState: state }
```

**Template**:
```js
function handleDrawerKey(key, state, handler) {
  // Inventory:
  //   key: String
  //   state: AppState (has .drawerState)
  //   handler: DrawerHandler | null
  
  // Template (union on drawerState):
  if (state.drawerState === null) {
    return { handled: false, newState: state };
  }
  
  if (handler === null) {
    return { handled: false, newState: state };
  }
  
  // Delegate to handler
  return handler.onKey(key, state);
}
```

---

## B4: Core index.js has no YouTube concepts

### getPageConfig

**Signature**: `getPageConfig : SiteConfig -> PageConfig | null`
**Purpose**: Gets the PageConfig for the current page by calling site's getPageType() and looking up in pages map.
**Where**: Core (`src/core/index.js`)
**Type**: [PURE] (but getPageType may read URL)

**Examples**:
```js
// YouTube on home page
const ytConfig = {
  getPageType: () => 'home',
  pages: {
    home: homePageConfig,
    watch: watchPageConfig
  }
};
getPageConfig(ytConfig)
// => homePageConfig

// YouTube on watch page
const ytConfigWatch = {
  getPageType: () => 'watch',
  pages: { home: homePageConfig, watch: watchPageConfig }
};
getPageConfig(ytConfigWatch)
// => watchPageConfig

// Unknown page type
const ytConfigOther = {
  getPageType: () => 'shorts',
  pages: { home: homePageConfig, watch: watchPageConfig }
};
getPageConfig(ytConfigOther)
// => null
```

**Template**:
```js
function getPageConfig(siteConfig) {
  // Inventory:
  //   siteConfig: SiteConfig
  //     .getPageType: () => String
  //     .pages: { [pageType]: PageConfig }
  
  // Template (compound + mapping lookup):
  const pageType = siteConfig.getPageType();
  return siteConfig.pages[pageType] || null;
}
```

---

### renderDrawer

**Signature**: `renderDrawer : (DrawerState, DrawerHandler | null, HTMLElement) -> void`
**Purpose**: Renders the current drawer into the container. If drawerState is null, clears container. If 'palette', uses core palette. Otherwise delegates to provided handler.
**Where**: Core (`src/core/index.js` or `src/core/drawer.js`)
**Type**: [IO] (mutates DOM)

**Examples**:
```js
// No drawer - clear container
renderDrawer(null, null, container)
// => container.innerHTML = ''

// Palette drawer
renderDrawer('palette', paletteHandler, container)
// => paletteHandler.render(container)

// Site-specific drawer
renderDrawer('chapters', chapterHandler, container)
// => chapterHandler.render(container)

// Unknown drawer with no handler - clear container
renderDrawer('unknown', null, container)
// => container.innerHTML = ''
```

**Template**:
```js
function renderDrawer(drawerState, handler, container) {
  // Inventory:
  //   drawerState: DrawerState (null | 'palette' | String)
  //   handler: DrawerHandler | null
  //   container: HTMLElement
  
  // Template (union on drawerState):
  if (drawerState === null) {
    container.innerHTML = '';
    return;
  }
  
  if (handler === null) {
    container.innerHTML = '';
    return;
  }
  
  handler.render(container);
}
```

---

### getDrawerHandler

**Signature**: `getDrawerHandler : (DrawerState, PageConfig | null, DrawerHandler) -> DrawerHandler | null`
**Purpose**: Gets the appropriate drawer handler for the current drawer state. Returns palette handler for 'palette', delegates to page config for site-specific drawers.
**Where**: Core (`src/core/index.js`)
**Type**: [PURE]

**Examples**:
```js
// Palette drawer - return core palette handler
getDrawerHandler('palette', watchPageConfig, paletteHandler)
// => paletteHandler

// Site drawer - delegate to page config
const watchPageConfig = {
  getDrawerHandler: (ds) => ds === 'chapters' ? chapterHandler : null
};
getDrawerHandler('chapters', watchPageConfig, paletteHandler)
// => chapterHandler

// No drawer open
getDrawerHandler(null, watchPageConfig, paletteHandler)
// => null

// Unknown drawer
getDrawerHandler('unknown', watchPageConfig, paletteHandler)
// => null (page config returns null)

// No page config
getDrawerHandler('chapters', null, paletteHandler)
// => null
```

**Template**:
```js
function getDrawerHandler(drawerState, pageConfig, paletteHandler) {
  // Inventory:
  //   drawerState: DrawerState
  //   pageConfig: PageConfig | null
  //   paletteHandler: DrawerHandler
  
  // Template (union on drawerState):
  if (drawerState === null) {
    return null;
  }
  
  if (drawerState === 'palette') {
    return paletteHandler;
  }
  
  // Site-specific drawer
  if (pageConfig === null || pageConfig.getDrawerHandler === null) {
    return null;
  }
  
  return pageConfig.getDrawerHandler(drawerState);
}
```

---

## B5: YouTube chapter drawer works

### createChapterDrawer

**Signature**: `createChapterDrawer : (() => Array<Chapter>, (Chapter) => void) -> DrawerHandler`
**Purpose**: Creates chapter picker drawer using createListDrawer. Takes scraper function and seek callback.
**Where**: YouTube (`src/sites/youtube/drawers/chapters.js`)
**Type**: [PURE] (returns handler)

**Examples**:
```js
const chapterDrawer = createChapterDrawer(
  () => scrapeChapters(),  // returns [{ title, time, timeText }, ...]
  (chapter) => seekTo(chapter.time)
);

// Returns a DrawerHandler
chapterDrawer.render(container)
// => filter input + chapter list with times

chapterDrawer.onKey('Enter', state)
// => seeks to selected chapter, closes drawer
```

**Template**:
```js
function createChapterDrawer(getChapters, onSeek) {
  // Inventory:
  //   getChapters: () => Array<Chapter>
  //   onSeek: (Chapter) => void
  
  // Delegate to core createListDrawer
  return createListDrawer({
    id: 'chapters',
    getItems: getChapters,
    renderItem: (chapter, isSelected) => {
      // Create element showing timeText + title
      // Highlight if isSelected
    },
    onSelect: onSeek,
    filterPlaceholder: 'Filter chapters...',
    matchesFilter: (chapter, query) => 
      chapter.title.toLowerCase().includes(query.toLowerCase())
  });
}
```

---

## B6: YouTube description drawer works

### createDescriptionDrawer

**Signature**: `createDescriptionDrawer : (() => String | null) -> DrawerHandler`
**Purpose**: Creates description drawer with scrollable text. Custom implementation (not a list drawer).
**Where**: YouTube (`src/sites/youtube/drawers/description.js`)
**Type**: [PURE] (returns handler)

**Examples**:
```js
const descDrawer = createDescriptionDrawer(() => scrapeDescription());

descDrawer.render(container)
// => scrollable div with description text

descDrawer.onKey('Escape', state)
// => { handled: true, newState: { drawerState: null, ... } }

descDrawer.onKey('j', state)  // scroll down
// => { handled: true, newState: state }

descDrawer.onKey('k', state)  // scroll up
// => { handled: true, newState: state }

descDrawer.onKey('g', state)  // scroll to top
// => { handled: true, newState: state }

descDrawer.onKey('G', state)  // scroll to bottom
// => { handled: true, newState: state }
```

**Template**:
```js
function createDescriptionDrawer(getDescription) {
  // Inventory:
  //   getDescription: () => String | null
  
  let scrollContainer = null;
  
  return {
    render: (container) => {
      const desc = getDescription();
      // Create scrollable div with description text
      // Store reference to scrollContainer for key handling
    },
    
    onKey: (key, state) => {
      // Template (enumeration on key):
      // Escape: close drawer
      // j: scroll down
      // k: scroll up
      // g: scroll to top
      // G: scroll to bottom
      // Other: not handled
    },
    
    cleanup: () => {
      scrollContainer = null;
    }
  };
}
```

---

## B7: YouTube PageConfigs

### homePageConfig

**Signature**: `homePageConfig : PageConfig`
**Purpose**: Configuration for YouTube home page (listing of recommended videos).
**Where**: YouTube (`src/sites/youtube/pages/home.js` or `src/sites/youtube/index.js`)
**Type**: [DATA]

**Examples**:
```js
homePageConfig = {
  layout: 'listing',
  getItems: () => scrapeHomeVideos(),
  getCommands: (ctx) => [
    { label: 'Search', icon: '🔍', action: focusSearch, keys: '/', group: 'Navigation' },
    // ... navigation commands
  ],
  getKeySequences: (ctx) => ({
    'g h': () => navigateTo('/'),
    'g s': () => navigateTo('/feed/subscriptions'),
    // ...
  }),
  getDrawerHandler: null,  // no custom drawers on home
  renderItem: null  // use default video rendering
}
```

**Template**:
```js
const homePageConfig = {
  // Template (compound): define all PageConfig fields
  layout: 'listing',
  getItems: () => { /* scrape videos */ },
  getCommands: (ctx) => [ /* commands */ ],
  getKeySequences: (ctx) => ({ /* key mappings */ }),
  getDrawerHandler: null,
  renderItem: null
};
```

---

### watchPageConfig

**Signature**: `watchPageConfig : PageConfig`
**Purpose**: Configuration for YouTube watch page (video player + comments).
**Where**: YouTube (`src/sites/youtube/pages/watch.js` or `src/sites/youtube/index.js`)
**Type**: [DATA]

**Examples**:
```js
watchPageConfig = {
  layout: (ctx, container) => renderWatchPage(ctx, container),
  getItems: null,  // not a listing
  getCommands: (ctx) => [
    { label: 'Chapters', icon: '📑', action: openChapters, keys: 'F', group: 'Navigation' },
    { label: 'Description', icon: '📝', action: openDescription, keys: 'Z O', group: 'Info' },
    // ... playback commands with ctx.siteState for current speed, etc.
  ],
  getKeySequences: (ctx) => ({
    'f': () => openDrawer('chapters'),
    'z o': () => openDrawer('description'),
    'Space': () => togglePlay(),
    // ...
  }),
  getDrawerHandler: (drawerState) => {
    if (drawerState === 'chapters') return chapterDrawer;
    if (drawerState === 'description') return descriptionDrawer;
    return null;
  },
  renderItem: null
}
```

**Template**:
```js
const watchPageConfig = {
  // Template (compound): define all PageConfig fields
  layout: (ctx, container) => { /* custom watch layout */ },
  getItems: null,
  getCommands: (ctx) => [ /* commands */ ],
  getKeySequences: (ctx) => ({ /* key mappings */ }),
  getDrawerHandler: (drawerState) => {
    // Template (union on drawerState):
    if (drawerState === 'chapters') return chapterDrawer;
    if (drawerState === 'description') return descriptionDrawer;
    return null;
  },
  renderItem: null
};
```

---

### searchPageConfig

**Signature**: `searchPageConfig : PageConfig`
**Purpose**: Configuration for YouTube search results page.
**Where**: YouTube (`src/sites/youtube/pages/search.js` or `src/sites/youtube/index.js`)
**Type**: [DATA]

**Examples**:
```js
searchPageConfig = {
  layout: 'listing',
  getItems: () => scrapeSearchResults(),
  getCommands: (ctx) => [ /* similar to home */ ],
  getKeySequences: (ctx) => ({ /* similar to home */ }),
  getDrawerHandler: null,
  renderItem: null
}
```

---

### channelPageConfig

**Signature**: `channelPageConfig : PageConfig`
**Purpose**: Configuration for YouTube channel pages.
**Where**: YouTube (`src/sites/youtube/pages/channel.js` or `src/sites/youtube/index.js`)
**Type**: [DATA]

**Examples**:
```js
channelPageConfig = {
  layout: 'listing',
  getItems: () => scrapeChannelVideos(),
  getCommands: (ctx) => [
    { label: 'Subscribe', icon: '🔔', action: toggleSubscribe, keys: 'S', group: 'Channel' },
    // ...
  ],
  getKeySequences: (ctx) => ({ /* ... */ }),
  getDrawerHandler: null,
  renderItem: null
}
```

---

## Summary

| Function | Behavior | Where | Type |
|----------|----------|-------|------|
| createListDrawer | B1 | Core | PURE |
| createPaletteDrawer | B1 | Core | PURE |
| createAppState | B2 | Core | PURE |
| createYouTubeState | B2 | YouTube | PURE |
| handleDrawerKey | B3 | Core | PURE |
| getPageConfig | B4 | Core | PURE |
| renderDrawer | B4 | Core | IO |
| getDrawerHandler | B4 | Core | PURE |
| createChapterDrawer | B5 | YouTube | PURE |
| createDescriptionDrawer | B6 | YouTube | PURE |
| homePageConfig | B7 | YouTube | DATA |
| watchPageConfig | B7 | YouTube | DATA |
| searchPageConfig | B7 | YouTube | DATA |
| channelPageConfig | B7 | YouTube | DATA |

---

## File Structure After Refactor

```
src/
├── core/
│   ├── drawer.js           # NEW: createListDrawer, createPaletteDrawer
│   ├── state.js            # MODIFIED: createAppState only (no YouTube)
│   ├── keyboard.js         # MODIFIED: handleDrawerKey (no hardcoded modes)
│   ├── index.js            # MODIFIED: getPageConfig, renderDrawer, getDrawerHandler
│   └── ...
│
└── sites/youtube/
    ├── state.js            # NEW: createYouTubeState
    ├── drawers/
    │   ├── chapters.js     # NEW: createChapterDrawer
    │   └── description.js  # NEW: createDescriptionDrawer
    ├── pages/              # NEW or inline in index.js
    │   ├── home.js
    │   ├── watch.js
    │   ├── search.js
    │   └── channel.js
    ├── index.js            # MODIFIED: YouTubeConfig with pages map
    └── ...
```

---

## Migration Notes

1. **Rename throughout**: `modalState` → `drawerState`, `modal` → `drawer`
2. **Remove from core/modals.js**: `renderChapterModal`, `renderDescriptionModal`
3. **Remove from core/state.js**: `createYouTubeState`
4. **Remove from core/keyboard.js**: Hardcoded 'chapters'/'description' handling
5. **Remove from core/index.js**: Direct calls to `config.getChapters()`, `config.seekToChapter()`
6. **Palette state**: Move `paletteQuery`, `paletteSelectedIdx` from AppState to internal palette drawer state
