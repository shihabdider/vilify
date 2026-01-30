# Iteration 009: Module Boundaries

## Goal

Move YouTube-specific code out of core modules to enforce clean separation between site-agnostic core and site-specific implementations.

## Problem

Several core files contain YouTube-specific code that violates module boundaries:

1. **`src/core/modals.js`** - Contains `renderChapterModal()`, `renderDescriptionModal()` which are YouTube-specific
2. **`src/core/state.js`** - Contains `createYouTubeState()` which should be in youtube/
3. **`src/core/keyboard.js`** - Has hardcoded handling for 'chapters' and 'description' modal states
4. **`src/core/index.js`** - Calls `config.getChapters()`, `config.seekToChapter()` - YouTube concepts leaked into orchestration

This makes it harder to add new sites and creates implicit coupling.

## Behaviors

| ID | Behavior | Test Method | Depends On | Est. Tokens |
|----|----------|-------------|------------|-------------|
| B1 | Core modals.js has no YouTube code | `grep -i "chapter\|description" src/core/modals.js` returns nothing YouTube-specific | - | 8K |
| B2 | Core state.js has no YouTube code | `grep -i "youtube" src/core/state.js` returns nothing | - | 2K |
| B3 | Core keyboard.js has no hardcoded modes | No 'chapters'/'description' string literals in keyboard.js | B1 | 5K |
| B4 | Core index.js has no YouTube concepts | No getChapters/seekToChapter calls in index.js | B1, B3 | 5K |
| B5 | YouTube chapter drawer works | Press `f` on watch page, chapter picker appears | B1 | 2K |
| B6 | YouTube description drawer works | Press `zo` on watch page, description appears | B1 | 2K |
| B7 | All existing functionality preserved | Run through test checklist, all features work | B1-B6 | 3K |

## Dependency Graph

```
B1 ──┬── B3 ──── B4 ──── B7
     │
     ├── B5
     │
     └── B6

B2 (independent) ──── B7
```

## Approach

### 1. Create Generic Drawer Primitive in Core

**`src/core/drawer.js`** (new file):
- `createDrawer(options)` - Factory for drawer instances
- Handles: show/hide, filter input, item list, selection, scroll
- Site provides: items, renderItem function, onSelect callback

### 2. Move YouTube Drawers to Site

**`src/sites/youtube/drawers/chapters.js`** (new file):
- Uses core drawer primitive
- Provides chapter items, chapter rendering, seek callback

**`src/sites/youtube/drawers/description.js`** (new file):
- Uses core drawer primitive (or simpler variant)
- Provides description content, scroll handling

### 3. Refactor Keyboard to Use Callbacks

Instead of hardcoding modal types, keyboard.js should:
- Check `state.modalState !== null`
- Call generic callbacks: `onModalNavigate`, `onModalSelect`, `onModalScroll`
- Site registers handlers for its modal types

### 4. Move YouTubeState to Site

**`src/sites/youtube/state.js`** (new file):
- Move `createYouTubeState()` from core
- Export for use in youtube/index.js

### 5. Clean Up Index.js

- Remove direct chapter/description handling
- Use generic modal rendering callback from site config

## New File Structure

```
src/
├── core/
│   ├── drawer.js           # NEW: Generic drawer primitive
│   ├── state.js            # MODIFIED: Remove createYouTubeState
│   ├── keyboard.js         # MODIFIED: Generic modal callbacks
│   ├── modals.js           # MODIFIED: Remove chapter/description, keep palette
│   └── index.js            # MODIFIED: Generic modal rendering
│
└── sites/youtube/
    ├── state.js            # NEW: YouTubeState
    ├── drawers/            # NEW: Directory
    │   ├── chapters.js     # NEW: Chapter picker
    │   └── description.js  # NEW: Description drawer
    ├── index.js            # MODIFIED: Register drawers
    └── ...
```

## Data Types Needed

### DrawerConfig (Core)

```
DrawerConfig is a structure:
- id: String - unique drawer identifier
- filterable: Boolean - show filter input?
- inputId: String | null - ID for filter input element
- inputPlaceholder: String - placeholder text
- onFilter: Function | null - (query) => void
- onSelect: Function - (item) => void
- onNavigate: Function | null - (direction) => void
- renderItem: Function - (item, isSelected) => HTMLElement
```

### ModalHandler (Core)

```
ModalHandler is a structure:
- render: Function - (container) => void
- onKey: Function - (key, state) => { handled: Boolean, newState: AppState }
- cleanup: Function | null - () => void
```

## SiteConfig Extensions

Add to SiteConfig:
- `getModalHandler: (modalState) => ModalHandler | null`

This lets sites define custom modal types without core knowing about them.

## Notes

- This is a refactor - no new user-facing features
- All existing functionality must be preserved
- Test thoroughly after each file change
- May need to update DATA.md with new types

## References

- Current violations documented in PROJECT.md "Current Issues" section
- `src/core/modals.js` - ~850 lines, significant YouTube code
- `src/core/keyboard.js` - lines 165-215 have chapter/description handling
