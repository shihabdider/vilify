# World Program Design

Vilify follows the HtDP World Program model: unified state, pure event handlers, pure render, with I/O isolated at the boundary.

## WorldState

**WorldState** is `AppState` - the complete state of the application at any moment.

```
AppState
├── core: AppCore                    # Extension-level (persists)
│   ├── focusModeActive: Boolean
│   └── lastUrl: String
├── ui: UIState                      # UI state (partially resets on nav)
│   ├── drawer: DrawerType
│   ├── paletteQuery: String
│   ├── paletteSelectedIdx: Number
│   ├── selectedIdx: Number
│   ├── filterActive: Boolean
│   ├── filterQuery: String
│   ├── searchActive: Boolean
│   ├── searchQuery: String
│   ├── keySeq: String
│   ├── sort: SortState { field, direction }
│   ├── message: Message | null
│   └── boundaryFlash: BoundaryFlash | null
├── site: SiteState | null           # Site-wide (persists across pages)
└── page: PageState | null           # Page-specific (resets on nav)
```

### Initial State

```javascript
const INITIAL_STATE = {
  core: { focusModeActive: true, lastUrl: '' },
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
  site: null,  // Created by site.createSiteState()
  page: null   // Created based on page type
}
```

Created by `createAppState : SiteConfig → AppState`.

## Events

| Event Type | Trigger | Description |
|------------|---------|-------------|
| **KeyDown** | User keyboard input | Main interaction method |
| **UrlChange** | SPA navigation (popstate/pushState) | Page transitions |
| **ContentTick** | Polling timer (200ms on listing pages) | Detect new content |
| **FlashTick** | Timer after message/boundary flash | Auto-clear feedback |
| **InputChange** | Status bar input typing | Filter/search/palette input |

## Event → Handler Mapping

### Keyboard Events (on-key)

| Key | Mode/State | Handler | Action |
|-----|------------|---------|--------|
| `Escape` | drawer open | onDrawerClose | Close drawer |
| `Escape` | filterActive | onFilterToggle | Exit filter mode |
| `Escape` | searchActive | onSearchToggle | Exit search mode |
| `j` / `↓` | listing, !filterActive | onNavigate | Move selection down |
| `k` / `↑` | listing, !filterActive | onNavigate | Move selection up |
| `↓` / `↑` | any (including filter) | onNavigate | Arrow nav always works |
| `Enter` | any | onSelect | Select current item |
| `/` | normal | onFilterToggle | Enter filter mode |
| `:` | normal | onDrawerOpen('palette') | Open command palette |
| `i` | normal | onSearchToggle | Enter search mode |
| `g` | normal | onKeySeqUpdate | Start key sequence |
| `h` after `g` | keySeq='g' | (execute action) | Complete sequence |
| (timeout) | keySeq pending | onKeySeqClear | Clear partial sequence |
| Single key | normal | (site actions) | Y, M, f, m, c, etc. |

### Navigation Events (on-url-change)

| Event | Handler | Action |
|-------|---------|--------|
| URL changed | onUrlChange | Reset page state, update pageType |

### Timer Events

| Event | Condition | Handler | Action |
|-------|-----------|---------|--------|
| ContentTick | listing page | onItemsUpdate | Update items from DOM |
| FlashTick | message set | onClearFlash | Clear expired message |
| FlashTick | boundaryFlash set | onClearFlash | Clear expired flash |

### Input Events

| Input Mode | Handler | Action |
|------------|---------|--------|
| Filter active | onFilterChange | Update filterQuery |
| Palette open | onPaletteQueryChange | Update paletteQuery |
| Search active | onSearchChange | Update searchQuery |

## Handler Signatures

All handlers are **pure functions**: they take state and return new state with no side effects.

### State Transitions

```
createAppState      : SiteConfig → AppState
onNavigate          : AppState × Direction → AppState
onSelect            : AppState × Boolean → AppState
onFilterToggle      : AppState → AppState
onFilterChange      : AppState × String → AppState
onSearchToggle      : AppState → AppState
onSearchChange      : AppState × String → AppState
onDrawerOpen        : AppState × DrawerType → AppState
onDrawerClose       : AppState → AppState
onPaletteQueryChange: AppState × String → AppState
onPaletteNavigate   : AppState × Direction → AppState
onKeySeqUpdate      : AppState × String → AppState
onKeySeqClear       : AppState → AppState
onSortChange        : AppState × SortField × Direction → AppState
onUrlChange         : AppState × String × SiteConfig → AppState
onItemsUpdate       : AppState × Item[] → AppState
onShowMessage       : AppState × String → AppState
onBoundaryHit       : AppState × Edge → AppState
onClearFlash        : AppState → AppState
```

### State Queries

```
getMode         : AppState → Mode
getVisibleItems : AppState × Item[] → Item[]
```

### Render (to-draw)

```
toView   : AppState × SiteConfig → ViewTree    (iteration 022)
applyView: ViewTree × DOM → void               (iteration 022)
```

## I/O Boundary

The I/O shell (`initSite` in `src/core/index.js`) handles all side effects:

### Event Listeners
- `document.addEventListener('keydown', ...)` - keyboard events
- `setupNavigationObserver(...)` - URL change detection
- Status bar input `oninput`/`onkeydown` - input events

### Timers
- Content polling timer (200ms interval on listing pages)
- Flash timeout (auto-clear after display duration)
- Key sequence timeout (500ms to complete sequence)

### DOM Operations
- Reading items from page (scraping)
- Rendering overlay UI
- Scrolling, focusing inputs
- Clipboard operations

### Pattern

```javascript
// I/O Shell (impure)
document.addEventListener('keydown', (event) => {
  const state = getState();
  
  // Call pure handler
  const newState = onKeyDown(state, event.key);
  
  // Apply state update (I/O)
  setState(newState);
  
  // Render (I/O)
  render();
});
```

All business logic lives in pure handlers. The shell is a thin wrapper that:
1. Captures events
2. Calls pure handlers
3. Applies state changes
4. Triggers re-render

## State Flow

```
Event → I/O Shell → Pure Handler → New State → Render → DOM
         ↑                                        |
         └────────────────────────────────────────┘
```

## Notes

- **State is complete**: All info needed between events lives in AppState
- **Handlers are pure**: No side effects, just state → state
- **Render is pure** (future): State → visual, no mutations
- **I/O at boundary**: Framework handles actual DOM/events
- **Site state opaque**: Core treats site/page state as opaque objects
