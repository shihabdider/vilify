# HtDP Architecture Analysis

Comparing Vilify's current architecture to HtDP's World model and proposing refinements.

---

## 1. HtDP World Model Recap

The World model for interactive programs follows this pattern:

```
big-bang : WorldState → WorldState
  - initial-state : WorldState
  - on-tick  : WorldState → WorldState           (time-based updates)
  - on-key   : WorldState × KeyEvent → WorldState (keyboard input)
  - on-mouse : WorldState × MouseEvent → WorldState (mouse input)  
  - to-draw  : WorldState → Image                (render to view)
  - stop-when: WorldState → Boolean              (termination)
```

**Key Principles:**
1. **Single State Value** - One WorldState flows through everything
2. **Pure Transition Functions** - State updates are pure: `(State, Event) → State`
3. **Pure Render Function** - `to-draw` is pure: `State → View`
4. **Side Effects Isolated** - Only `big-bang` performs I/O (DOM, timers, fetch)
5. **Unidirectional Flow** - Event → State Update → Render → (repeat)

---

## 2. Current Architecture Assessment

### What We Have Now

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CURRENT ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Module-level mutable state (src/core/index.js):                          │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  let state = null;        // AppState                               │  │
│   │  let siteState = null;    // YouTubeState                           │  │
│   │  let currentConfig = null; // SiteConfig                            │  │
│   │  let pollTimer = null;                                              │  │
│   │  let lastVideoCount = 0;                                            │  │
│   │  let lastRenderedDrawer = null;                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   Mixed concerns in render():                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  function render() {                                                │  │
│   │    // Reads mutable state                                           │  │
│   │    // Conditionally creates DOM                                     │  │
│   │    // Calls site-specific layouts                                   │  │
│   │    // Manages drawer lifecycle                                      │  │
│   │    // Updates status bar                                            │  │
│   │  }                                                                  │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   Callbacks mutate state directly:                                          │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  setupKeyboardHandler(..., { onNavigate, onSelect, ... })           │  │
│   │  // Callbacks call setState() which mutates and triggers render()   │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Gaps vs HtDP World Model

| HtDP Principle | Current Status | Gap |
|----------------|----------------|-----|
| Single State Value | Split: `state` + `siteState` + `currentConfig` | State is fragmented |
| Pure Transitions | Callbacks mutate via `setState()` | Not pure functions |
| Pure Render | `render()` has conditionals, creates DOM | Side effects mixed in |
| Isolated Side Effects | Scattered (keyboard.js, index.js, drawer.js) | No clear boundary |
| Unidirectional Flow | Mostly yes, but drawer handlers self-update | Some circular paths |

---

## 3. Proposed Abstraction Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              APP (Extension)                                 │
│                                                                             │
│   Responsibilities:                                                         │
│   - WorldState management (big-bang)                                        │
│   - Event dispatch (keyboard, navigation, timers)                           │
│   - Site detection and loading                                              │
│   - Core rendering infrastructure                                           │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                           SITE (e.g., YouTube)                      │  │
│   │                                                                     │  │
│   │   Responsibilities:                                                 │  │
│   │   - Site-specific state (YouTubeState)                              │  │
│   │   - Site-specific commands and keybindings                          │  │
│   │   - Site-specific drawers (chapters, transcript)                    │  │
│   │   - Data providers (fetch intercept, extractors)                    │  │
│   │   - Page type detection                                             │  │
│   │                                                                     │  │
│   │   ┌─────────────────────────────────────────────────────────────┐  │  │
│   │   │                    PAGE (e.g., /watch)                      │  │  │
│   │   │                                                             │  │  │
│   │   │   Responsibilities:                                         │  │  │
│   │   │   - Page-specific layout                                    │  │  │
│   │   │   - Page-specific data extraction                           │  │  │
│   │   │   - Page-specific commands (watch has playback, list has sort│  │  │
│   │   │   - Page-specific state transitions                         │  │  │
│   │   │                                                             │  │  │
│   │   └─────────────────────────────────────────────────────────────┘  │  │
│   │                                                                     │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Type Definitions for Hierarchy

```
App
├── WorldState           # Combined state for entire app
├── AppConfig            # Extension-level config
└── bigBang()            # Main orchestration

Site (e.g., YouTube)
├── SiteConfig           # Site-specific configuration  
├── SiteState            # Site-specific state (YouTubeState)
├── DataProvider         # Site-specific data extraction
└── pages: Map<PageType, PageConfig>

Page (e.g., /watch, /home)
├── PageConfig           # Page-specific configuration
├── layout: LayoutDef    # How to render this page
├── getItems()           # What items to show
├── commands()           # Available commands
└── onKey()              # Page-specific key handling
```

---

## 4. Proposed WorldState

### Current (Fragmented)

```js
// Separate variables in index.js
let state = AppState;      // UI state
let siteState = YouTubeState;  // Site state  
let currentConfig = SiteConfig; // Config (not state!)
```

### Proposed (Unified)

```js
// WorldState: Single source of truth
type WorldState = {
  // App-level state
  app: {
    focusModeActive: boolean,
    lastUrl: string,
  },
  
  // UI state (what's being shown)
  ui: {
    drawer: DrawerState,
    selectedIdx: number,
    filterQuery: string,
    filterActive: boolean,
    searchQuery: string,
    searchActive: boolean,
    keySeq: string,
    sort: { field: SortField, direction: 'asc' | 'desc' },
  },
  
  // Site-specific state (null if no site matched)
  site: SiteState | null,  // e.g., YouTubeState
  
  // Derived/cached (computed from above, not source of truth)
  derived: {
    pageType: PageType,
    items: Item[],          // Current items (filtered, sorted)
    videoContext: VideoContext | null,  // Watch page only
  }
}
```

**Note:** `SiteConfig` is NOT state - it's configuration. It should be passed to functions, not stored in state.

---

## 5. Proposed Event Handlers (Pure Functions)

### Current (Impure)

```js
// Current: Callback mutates state directly
function handleListNavigation(direction) {
  const items = currentConfig.getItems();  // Reads global
  const result = navigateList(direction, state.selectedIdx, items.length);
  state.selectedIdx = result.index;  // Mutates global
  render();  // Side effect
}
```

### Proposed (Pure)

```js
// Pure state transition function
// onNavigate : WorldState × Direction → WorldState
function onNavigate(world: WorldState, direction: Direction): WorldState {
  const items = world.derived.items;
  const newIdx = navigateList(direction, world.ui.selectedIdx, items.length);
  
  return {
    ...world,
    ui: { ...world.ui, selectedIdx: newIdx.index }
  };
}

// Pure: no side effects, returns new state
// Side effects (render, flash) handled by big-bang
```

### Full Event Handler Signatures

```
// Keyboard events
onKey      : WorldState × KeyEvent × SiteConfig → WorldState
onKeySeq   : WorldState × string × SiteConfig → WorldState

// Navigation events  
onNavigate : WorldState × Direction → WorldState
onSelect   : WorldState × boolean → WorldState  // boolean = shift key
onUrlChange: WorldState × URL × SiteConfig → WorldState

// Input events
onFilterChange : WorldState × string → WorldState
onSearchChange : WorldState × string → WorldState
onCommandChange: WorldState × string → WorldState

// Timer events
onTick : WorldState × SiteConfig → WorldState  // For content polling

// Data events (async results)
onDataReady    : WorldState × Data → WorldState
onTranscriptReady: WorldState × TranscriptResult → WorldState
```

---

## 6. Proposed Render (Pure-ish)

### Current (Mixed)

```js
function render() {
  if (!state || !currentConfig) return;  // Guard
  
  const pageType = currentConfig.getPageType();  // Derives
  
  // Creates DOM if missing (side effect)
  let container = document.getElementById('vilify-content');
  if (!container) {
    renderFocusMode(currentConfig, state);
    container = document.getElementById('vilify-content');
  }
  
  // Updates status bar (side effect)
  updateStatusBar(state, shouldFocusInput, drawerPlaceholder);
  
  // Conditional rendering based on layout (mixed)
  if (typeof layout === 'function') {
    layout(state, siteState, container);
  }
  // ... more conditionals
}
```

### Proposed (Separated)

```js
// PURE: Compute what to render
// toView : WorldState × SiteConfig → ViewTree
function toView(world: WorldState, config: SiteConfig): ViewTree {
  const pageType = world.derived.pageType;
  const layout = config.layouts[pageType];
  
  return {
    statusBar: {
      mode: getMode(world),
      input: getInputState(world),
      sort: world.ui.sort,
      count: world.derived.items.length,
    },
    content: {
      type: typeof layout === 'function' ? 'custom' : layout,
      items: world.derived.items,
      selectedIdx: world.ui.selectedIdx,
      pageType,
    },
    drawer: world.ui.drawer ? {
      type: world.ui.drawer,
      // drawer-specific view data
    } : null,
  };
}

// IMPURE: Apply view to DOM (isolated side effects)
// applyView : ViewTree × DOM → void
function applyView(view: ViewTree, root: Element): void {
  // Diff and patch DOM
  // All DOM manipulation isolated here
}
```

---

## 7. Proposed Big-Bang Structure

```js
// big-bang : SiteConfig → void
function bigBang(config: SiteConfig): void {
  // 1. Initialize world state
  let world: WorldState = createInitialWorld(config);
  
  // 2. Initial render
  const view = toView(world, config);
  applyView(view, document.body);
  
  // 3. Set up event listeners (the only place with side effects)
  
  // Keyboard events
  document.addEventListener('keydown', (event) => {
    const newWorld = onKey(world, event, config);
    if (newWorld !== world) {
      world = newWorld;
      applyView(toView(world, config), document.body);
    }
  }, true);
  
  // URL change events
  observeNavigation((oldUrl, newUrl) => {
    world = onUrlChange(world, newUrl, config);
    applyView(toView(world, config), document.body);
  });
  
  // Tick (content polling)
  setInterval(() => {
    const newWorld = onTick(world, config);
    if (newWorld !== world) {
      world = newWorld;
      applyView(toView(world, config), document.body);
    }
  }, POLL_INTERVAL);
  
  // Data provider events
  config.dataProvider.onData((data) => {
    world = onDataReady(world, data);
    applyView(toView(world, config), document.body);
  });
}

// Entry point
const config = detectSite(location.href);  // Returns SiteConfig or null
if (config) {
  bigBang(config);
}
```

---

## 8. Refactored Module Responsibilities

### Current vs Proposed

```
CURRENT                              PROPOSED
─────────────────────────────────────────────────────────────────────────
src/core/index.js                    src/core/big-bang.js
  - initSite()                         - bigBang()
  - Module-level state                 - Event loop
  - render()                           - Side effect isolation
  - All event handlers                 
                                     src/core/world.js
src/core/state.js                      - WorldState type
  - createAppState()                   - createInitialWorld()
  - getMode()                          - Derived state computation
                                       - getMode(), getItems(), etc.

src/core/keyboard.js                 src/core/events.js
  - setupKeyboardHandler()             - onKey()
  - handleKeyEvent()                   - onKeySeq()
  - Callback-based                     - onNavigate(), onSelect()
                                       - All pure transition functions

src/core/layout.js                   src/core/view.js (renamed)
  - renderFocusMode()                  - toView() - pure view computation
  - renderListing()                    - applyView() - DOM patching
  - updateStatusBar()                  - View tree types
  - Mixed DOM creation/update        
                                     src/core/effects.js (new)
                                       - showMessage() (toast)
                                       - flashBoundary()
                                       - copyToClipboard()
                                       - All side effects that aren't DOM
```

---

## 9. Site/Page Configuration Refinement

### Current SiteConfig

```js
// Flat - mixes site and page concerns
type SiteConfig = {
  name: string,
  matches: string[],
  theme: SiteTheme,
  getPageType: () => PageType,      // Site-level
  getItems: () => Item[],           // Page-level (varies by page)
  getCommands: (ctx) => Command[],  // Mixed
  layouts: { [page]: LayoutDef },   // Page-level
  // ...
}
```

### Proposed SiteConfig + PageConfig

```js
// Site-level configuration
type SiteConfig = {
  name: string,
  matches: string[],
  theme: SiteTheme,
  
  // Site-level functions
  getPageType: (url: URL) => PageType,
  createSiteState: () => SiteState,
  dataProvider: DataProvider,
  
  // Page configurations
  pages: Map<PageType, PageConfig>,
  
  // Site-wide commands (navigation, search)
  globalCommands: (ctx) => Command[],
  globalKeySequences: (ctx) => KeyMap,
}

// Page-level configuration
type PageConfig = {
  layout: LayoutDef,
  
  // Page-specific functions
  getItems: (state: WorldState) => Item[],
  getCommands: (ctx) => Command[],
  getKeySequences: (ctx) => KeyMap,
  
  // Page-specific drawers
  drawers: Map<DrawerState, DrawerConfig>,
  
  // Page lifecycle
  onEnter?: (state: WorldState) => WorldState,  // e.g., fetch transcript
  onLeave?: (state: WorldState) => WorldState,  // e.g., cleanup
}
```

### Example: YouTube Config

```js
const youtubeConfig: SiteConfig = {
  name: 'youtube',
  matches: ['*://www.youtube.com/*'],
  theme: youtubeTheme,
  
  getPageType: (url) => {
    if (url.pathname === '/watch') return 'watch';
    if (url.pathname === '/results') return 'search';
    // ...
  },
  
  createSiteState: () => ({
    transcript: null,
    commentPage: 0,
    // ...
  }),
  
  dataProvider: youtubeDataProvider,
  
  globalCommands: (ctx) => [
    { label: 'Home', keys: 'G H', action: () => navigateTo('/') },
    { label: 'Subscriptions', keys: 'G S', action: () => navigateTo('/feed/subscriptions') },
  ],
  
  pages: new Map([
    ['watch', watchPageConfig],
    ['home', listingPageConfig],
    ['search', listingPageConfig],
    ['subscriptions', listingPageConfig],
    // ...
  ]),
};

const watchPageConfig: PageConfig = {
  layout: renderWatchPage,
  
  getItems: (world) => world.site.recommendedVideos,
  
  getCommands: (ctx) => [
    { label: 'Play/Pause', keys: 'Space', action: togglePlayPause },
    { label: 'Chapters', keys: 'F', action: () => openDrawer('chapters') },
    // ...
  ],
  
  drawers: new Map([
    ['chapters', chapterDrawerConfig],
    ['description', descriptionDrawerConfig],
    ['transcript', transcriptDrawerConfig],
  ]),
  
  onEnter: (world) => {
    // Trigger transcript fetch
    return { ...world, site: { ...world.site, transcript: { status: 'loading' } } };
  },
};

const listingPageConfig: PageConfig = {
  layout: 'listing',
  
  getItems: (world) => {
    let items = world.site.videos;
    if (world.ui.filterActive) {
      items = filterItems(items, world.ui.filterQuery);
    }
    if (world.ui.sort.field) {
      items = sortItems(items, world.ui.sort.field, world.ui.sort.direction);
    }
    return items;
  },
  
  getCommands: (ctx) => [
    { label: 'Filter', keys: '/', action: () => openFilter() },
    { label: 'Sort by date', keys: ':sort da', action: () => sortBy('date') },
    // ...
  ],
  
  drawers: new Map(),  // No page-specific drawers
};
```

---

## 10. Migration Path

### Phase 1: Unify State
1. Combine `state` + `siteState` into single `WorldState`
2. Move derived values (items, pageType) to computed getters
3. Keep current render/event structure

### Phase 2: Pure Transitions
1. Extract pure transition functions from handlers
2. Handlers call transition, then render
3. Test transition functions in isolation

### Phase 3: Separate View
1. Extract `toView()` pure function
2. Create `ViewTree` type
3. Isolate DOM patching to `applyView()`

### Phase 4: Big-Bang
1. Create `bigBang()` orchestration
2. Move all event listener setup there
3. Remove module-level state

### Phase 5: Site/Page Refinement
1. Extract `PageConfig` from `SiteConfig`
2. Implement page-specific handlers
3. Add onEnter/onLeave lifecycle

---

## 11. Benefits of HtDP Alignment

| Benefit | Description |
|---------|-------------|
| **Testability** | Pure functions can be unit tested without DOM |
| **Predictability** | State transitions are explicit and traceable |
| **Debugging** | Can log/replay state transitions |
| **Time Travel** | Can implement undo/redo by storing state history |
| **Hot Reload** | Can swap transition functions without losing state |
| **Reasoning** | Easier to understand data flow |
| **Extensibility** | Adding new sites/pages follows clear pattern |

---

## 12. Diagram: Proposed Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BIG-BANG                                        │
│                         (Side Effect Boundary)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Events (I/O)              Pure Core                    Effects (I/O)      │
│   ┌──────────┐         ┌─────────────────┐              ┌──────────────┐   │
│   │ keyboard │────────▶│                 │              │              │   │
│   │  events  │         │   Transition    │              │  applyView() │   │
│   └──────────┘         │   Functions     │              │  (DOM patch) │   │
│                        │                 │              │              │   │
│   ┌──────────┐         │  onKey()        │   ViewTree   │              │   │
│   │   URL    │────────▶│  onNavigate()   │─────────────▶│              │   │
│   │ changes  │         │  onSelect()     │              │              │   │
│   └──────────┘         │  onTick()       │              └──────────────┘   │
│                        │  onDataReady()  │                                  │
│   ┌──────────┐         │                 │              ┌──────────────┐   │
│   │  timer   │────────▶│                 │              │ showMessage()│   │
│   │  ticks   │         │                 │              │ copyToClip() │   │
│   └──────────┘         │  ┌───────────┐  │              │ navigate()   │   │
│                        │  │           │  │              └──────────────┘   │
│   ┌──────────┐         │  │WorldState │  │                     ▲          │
│   │  data    │────────▶│  │           │  │                     │          │
│   │ provider │         │  └───────────┘  │              ┌──────────────┐   │
│   └──────────┘         │        │        │              │   Effects    │   │
│                        │        ▼        │              │   from       │   │
│                        │  ┌───────────┐  │──────────────│  transitions │   │
│                        │  │ toView()  │  │              └──────────────┘   │
│                        │  └───────────┘  │                                  │
│                        └─────────────────┘                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Legend:
  ────▶  Data flow (immutable)
  Events enter from left, effects exit to right
  Pure core in the middle (no I/O)
```

---

## Summary

The current architecture has the right intuitions but mixes concerns:
- State is fragmented
- Transitions have side effects
- Render is impure

Aligning with HtDP World model means:
1. **Unified WorldState** - Single source of truth
2. **Pure Transitions** - `(State, Event) → State`
3. **Pure View** - `State → ViewTree`
4. **Isolated Effects** - Only in big-bang boundary
5. **Clear Hierarchy** - App > Site > Page abstractions

The migration can be incremental, starting with state unification.
