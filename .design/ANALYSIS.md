# Analysis

**Problem**: Refactor Vilify to align with HtDP World model - unified AppState, pure transitions, isolated side effects
**Type**: Interactive (World program)
**Iteration**: 021 (htdp-refactor)
**Simplified Scope**: Unify state + pure transitions in `src/core/` only

## Information

| Information | Description |
|-------------|-------------|
| Focus mode | Whether the overlay is active |
| Current page | What type of page we're on (watch, home, search, etc.) |
| Content items | Videos, search results, comments being displayed |
| Selection | Which item is currently highlighted |
| Filter/Search | User's filter query and whether it's active |
| Drawer | Which modal is open (command palette, chapters, transcript, etc.) |
| Key sequence | Partial vim-style key sequences (e.g., `g` waiting for second key) |
| Sort | Current sort field and direction |
| Site data | YouTube-specific: transcript, chapters, video context |
| User events | Keyboard input, URL navigation, timer ticks |
| View output | What the DOM should look like given current state |

## Data Needs

| Name | Represents | Classification | Status |
|------|------------|----------------|--------|
| AppState | Unified state for entire app | Compound (core, ui, site, page) | ✓ complete |
| AppCore | Extension-level state | Compound (focusModeActive, lastUrl) | ✓ complete |
| UIState | UI state | Compound (drawer, selectedIdx, filter, search, keySeq, sort, message, boundaryFlash) | ✓ complete |
| Message | Flash message | Compound (text, timestamp) | ✓ complete |
| BoundaryFlash | List boundary flash | Compound (edge, timestamp) | ✓ complete |
| SortState | Sort configuration | Compound (field, direction) | ✓ complete |
| SiteState | Site-wide state (generic base) | Compound (varies by site) | ✓ (site-defined) |
| PageState | Page-specific state | Union (site-defined) | ✓ (site-defined) |
| YouTubePageState | YouTube page state | Union (WatchPageState \| ListPageState) | ✓ complete |
| WatchPageState | Watch page state | Compound (videoContext, recommended, chapters) | ✓ complete |
| ListPageState | List page state | Compound (videos) | ✓ complete |
| DrawerType | Which drawer is open | Itemization (null \| 'palette' \| SiteDrawerType) | ✓ complete |
| YouTubeDrawerType | YouTube drawer types | Enumeration | ✓ complete |
| YouTubeSortField | YouTube sort fields | Enumeration | ✓ complete |
| Direction | Navigation direction | Enumeration (up, down) | existing |
| Mode | Current input mode | Enumeration | existing |

## State Hierarchy

```
AppState (Core)
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
│   ├── message: Message | null { text, timestamp }
│   └── boundaryFlash: BoundaryFlash | null { edge, timestamp }
├── site: SiteState | null           # Site-wide (site-defined, persists)
└── page: PageState | null           # Page-specific (site-defined, resets on nav)

YouTubePageState (YouTube-specific)
├── WatchPageState { type: 'watch', videoContext, recommended, chapters }
└── ListPageState { type: 'list', videos }

Site-Specific Extensions:
├── DrawerType: null | 'palette' | YouTubeDrawerType
├── SortField: YouTubeSortField ('date' | 'duration' | 'title' | 'channel' | 'views')
└── PageState: YouTubePageState
```

## Wish List

See WISHES.md for full list with signatures and purposes.

### Summary

| Category | Functions |
|----------|-----------|
| State Creation | createAppState |
| Core Transitions | onNavigate, onSelect, onFilterChange, onFilterToggle, onDrawerOpen, onDrawerClose, onKeySeqUpdate, onKeySeqClear, onSortChange, onUrlChange, onItemsUpdate |
| State Queries | getMode, getVisibleItems |

## Future Iterations

| # | Name | Scope |
|---|------|-------|
| 022 | pure-view | Extract `toView()` pure function, create ViewTree type, isolate DOM in `applyView()` |
| 023 | init-orchestration | Create `init()` entry point, move all event listener setup there, remove module-level state |
| 024 | site-page-config | Extract PageConfig from SiteConfig, implement page lifecycle (onEnter/onLeave) |
| 025 | youtube-cleanup | YouTube-specific state/transition cleanup |

## Notes

- This refactoring preserves existing behavior while improving architecture
- Focus on `src/core/` only - site-specific code adapts to new core interface
- Existing render() kept for now - will be purified in iteration 022
- Key insight: PageState resets on navigation, SiteState persists
