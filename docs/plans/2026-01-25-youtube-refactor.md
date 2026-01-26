# YouTube Userscript Refactor Plan

**Date:** 2026-01-25  
**Current size:** 3173 lines (~50KB)  
**Target:** ~2000 lines (~35KB) - 35% reduction  
**Constraint:** Must remain a single file (userscript requirement)

## Problem Statement

The `sites/youtube.user.js` has grown organically and contains significant duplication:
- Three modal/picker UIs with nearly identical structure
- Repeated CSS patterns across components
- Selector arrays duplicated in multiple functions
- Similar list rendering logic repeated 3 times

## Refactoring Strategy

### Phase 1: Consolidate Selectors (~50 lines saved)

**Current:** Selector arrays scattered throughout functions
```javascript
// In getVideoContext()
const titleSelectors = ['h1.ytd-watch-metadata yt-formatted-string', ...];
// In scrapeVideos()  
const channelSelectors = ['.yt-content-metadata-view-model-wiz__metadata-text', ...];
// etc.
```

**After:** Centralized selector registry
```javascript
const SELECTORS = {
  video: {
    title: ['h1.ytd-watch-metadata yt-formatted-string', 'h1.ytd-watch-metadata', ...],
    channel: ['ytd-video-owner-renderer #channel-name a', ...],
    description: ['ytd-watch-metadata #description-inner', ...],
  },
  listing: {
    videoItem: ['yt-lockup-view-model', 'ytd-rich-item-renderer', ...],
    // ...
  }
};

function queryFirst(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.textContent?.trim()) return el;
  }
  return null;
}
```

**Files changed:** youtube.user.js  
**Risk:** Low - purely organizational

---

### Phase 2: CSS Consolidation (~150 lines saved)

**Current:** Repetitive modal styles
```css
#vilify-desc-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); ... }
#vilify-chapter-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); ... }
#keyring-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); ... }
```

**After:** Shared base classes
```css
.vilify-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: none;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: 9999999;
  font-family: var(--font-main);
}
.vilify-overlay.open { display: flex; }

.vilify-modal {
  max-width: 90vw;
  max-height: 70vh;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.vilify-modal-header { ... }
.vilify-modal-input { ... }
.vilify-modal-list { ... }
.vilify-modal-footer { ... }
```

**Consolidation targets:**
- Modal overlays: 3 → 1 base class
- Modal containers: 3 → 1 base class  
- Input styles: 4 → 1 base class
- List item styles: 3 → 1 base class + modifiers
- Footer hint styles: 3 → 1 base class

**Files changed:** youtube.user.js (CSS section)  
**Risk:** Low - CSS only, easy to verify visually

---

### Phase 3: Generic Modal Factory (~200 lines saved)

**Current:** Three separate modal implementations
- Description modal: `createDescriptionModal()`, `openDescriptionModal()`, `closeDescriptionModal()`
- Chapter picker: `createChapterPicker()`, `openChapterPicker()`, `closeChapterPicker()`
- Command palette: `createUI()`, `openPalette()`, `closePalette()`

**After:** Single modal factory
```javascript
function createModal(config) {
  const { id, title, placeholder, renderList, onSelect, onInput, footerHints } = config;
  
  // Returns { overlay, input, list, open(), close(), isOpen(), render() }
}

// Usage:
const descriptionModal = createModal({
  id: 'vilify-desc',
  title: 'Description',
  hasInput: false,
  footerHints: [['zc', 'Esc'], 'close'],
  renderContent: (container) => { /* render description text */ }
});

const chapterPicker = createModal({
  id: 'vilify-chapter',
  title: 'Jump to Chapter',
  placeholder: 'Filter chapters...',
  footerHints: [['↑', '↓'], 'navigate', ['↵'], 'jump', ['esc'], 'close'],
  renderList: (container, filter) => { /* render chapters */ },
  onSelect: (item) => { /* jump to chapter */ }
});

const commandPalette = createModal({
  id: 'keyring',
  title: 'Command Palette',
  placeholder: 'Type a command...',
  footerHints: [['↑', '↓'], 'navigate', ['↵'], 'select', ['⇧↵'], 'new tab', ['esc'], 'close'],
  renderList: (container, filter) => { /* render commands */ },
  onSelect: (item, shiftKey) => { /* execute command */ }
});
```

**Benefits:**
- Single keyboard navigation implementation
- Single open/close state management
- Consistent behavior across all modals
- Easier to add new pickers in future

**Files changed:** youtube.user.js  
**Risk:** Medium - need to preserve all existing behavior

---

### Phase 4: Generic List Renderer (~100 lines saved)

**Current:** Three list rendering implementations
- `render()` for command palette
- `renderChapterList()` for chapter picker
- `renderVideoList()` for focus mode

**After:** Single list renderer with item templates
```javascript
function renderList(container, items, config) {
  const { 
    selectedIdx, 
    emptyMessage,
    renderItem,      // (item, idx, isSelected) => HTMLElement
    onItemClick,
    onItemHover 
  } = config;
  
  container.innerHTML = '';
  
  if (items.length === 0) {
    container.appendChild(createElement('div', { 
      className: 'vilify-empty', 
      textContent: emptyMessage 
    }));
    return;
  }
  
  items.forEach((item, idx) => {
    const el = renderItem(item, idx, idx === selectedIdx);
    el.addEventListener('click', () => onItemClick(idx));
    el.addEventListener('mouseenter', () => onItemHover(idx));
    container.appendChild(el);
  });
}

// Item renderers
const itemRenderers = {
  video: (item, idx, selected) => createElement('div', { 
    className: `vilify-video-item ${selected ? 'selected' : ''}` 
  }, [/* thumbnail, title, channel */]),
  
  command: (item, idx, selected) => createElement('div', {
    className: `keyring-item ${selected ? 'selected' : ''}`
  }, [/* icon, label, shortcut */]),
  
  chapter: (item, idx, selected) => createElement('div', {
    className: `vilify-chapter-item ${selected ? 'selected' : ''}`
  }, [/* thumbnail, title, time */])
};
```

**Files changed:** youtube.user.js  
**Risk:** Medium - UI changes need visual verification

---

### Phase 5: Streamlined Element Creation (~30 lines saved)

**Current:**
```javascript
const header = createElement('div', { id: 'vilify-chapter-header' }, [
  createElement('span', { id: 'vilify-chapter-header-title', textContent: 'Jump to Chapter' })
]);
```

**After:** Shorthand helpers
```javascript
const el = (tag, attrs, children) => createElement(tag, attrs, children);
const div = (attrs, children) => el('div', attrs, children);
const span = (attrs, children) => el('span', attrs, children);

// Usage becomes more compact:
const header = div({ id: 'vilify-chapter-header' }, [
  span({ id: 'vilify-chapter-header-title', textContent: 'Jump to Chapter' })
]);
```

**Alternative:** Tagged template for HTML-like syntax (more complex but very concise)
```javascript
const header = html`
  <div id="vilify-chapter-header">
    <span id="vilify-chapter-header-title">Jump to Chapter</span>
  </div>
`;
```

**Files changed:** youtube.user.js  
**Risk:** Low - syntactic sugar only

---

### Phase 6: Combine Toggle Functions (~40 lines saved)

**Current:**
```javascript
function openFilter() { /* ... */ }
function closeFilter() { /* ... */ }
function openSearch() { /* ... */ }
function closeSearch() { /* ... */ }
function openDescriptionModal() { /* ... */ }
function closeDescriptionModal() { /* ... */ }
```

**After:**
```javascript
function toggleFilter(show) {
  const wrapper = document.querySelector('.vilify-filter-wrapper');
  const input = document.getElementById('vilify-filter');
  if (!wrapper || !input) return;
  
  filterActive = show;
  wrapper.classList.toggle('hidden', !show);
  if (show) {
    input.value = filterQuery;
    input.focus();
  } else {
    input.blur();
  }
}

// Keep aliases for readability
const openFilter = () => toggleFilter(true);
const closeFilter = () => toggleFilter(false);
```

**Files changed:** youtube.user.js  
**Risk:** Low - simple consolidation

---

### Phase 7: Data-Driven Key Bindings (~50 lines saved)

**Current:** Commands and key bindings defined separately
```javascript
function getCommands() {
  cmds.push({ label: 'Home', icon: '🏠', action: () => navigateTo('/'), keys: 'G H' });
  // ...
}

function getKeySequences() {
  sequences['gh'] = () => navigateTo('/');
  // ...
}
```

**After:** Unified command definitions
```javascript
const COMMANDS = {
  navigation: [
    { key: 'gh', label: 'Home', icon: '🏠', action: () => navigateTo('/') },
    { key: 'gs', label: 'Subscriptions', icon: '📺', action: () => navigateTo('/feed/subscriptions') },
    // ...
  ],
  playback: [
    { key: 'space', label: 'Play/Pause', icon: '▶', action: togglePlayPause, when: 'watch' },
    // ...
  ]
};

// Generate both command list and key sequences from single source
function getCommands() {
  return Object.entries(COMMANDS).flatMap(([group, cmds]) => [
    { group: group.charAt(0).toUpperCase() + group.slice(1) },
    ...cmds.filter(c => !c.when || c.when === getPageType())
           .map(c => ({ ...c, keys: formatKey(c.key) }))
  ]);
}

function getKeySequences() {
  return Object.fromEntries(
    Object.values(COMMANDS).flat()
      .filter(c => c.key && (!c.when || c.when === getPageType()))
      .map(c => [c.key, c.action])
  );
}
```

**Files changed:** youtube.user.js  
**Risk:** Medium - need to preserve all key bindings

---

## Implementation Order

1. **Phase 1: Selectors** (safest, enables later phases)
2. **Phase 2: CSS** (visual-only, easy to verify)
3. **Phase 6: Toggle functions** (quick win)
4. **Phase 5: Element creation** (quick win)
5. **Phase 4: List renderer** (prepares for Phase 3)
6. **Phase 3: Modal factory** (biggest win, depends on 4)
7. **Phase 7: Key bindings** (optional, nice-to-have)

## Testing Checklist

After each phase, verify:
- [ ] Focus mode activates on page load
- [ ] Video list renders on home/subscriptions
- [ ] j/k navigation works in video list
- [ ] `/` opens filter, typing filters videos
- [ ] `i` opens search input
- [ ] `:` opens command palette
- [ ] Watch page shows video info + comments
- [ ] `zo`/`zc` toggles description modal
- [ ] `f` opens chapter picker (on videos with chapters)
- [ ] `gh`, `gs`, `gy`, `gl`, `gt` navigation works
- [ ] `yy`, `yt`, `ya`, `Y` copy functions work
- [ ] Video playback controls work (space, j, l, arrows)
- [ ] `:q` and `ZZ` exit focus mode
- [ ] Escape closes any open modal

## Estimated Impact

| Phase | Lines Saved | Risk | Priority |
|-------|-------------|------|----------|
| 1. Selectors | ~50 | Low | High |
| 2. CSS | ~150 | Low | High |
| 3. Modal Factory | ~200 | Medium | High |
| 4. List Renderer | ~100 | Medium | High |
| 5. Element Creation | ~30 | Low | Medium |
| 6. Toggle Functions | ~40 | Low | Medium |
| 7. Key Bindings | ~50 | Medium | Low |
| **Total** | **~620** | | |

Final size estimate: ~2550 lines (20% reduction)

With aggressive CSS consolidation and removing dead code discovered during refactor, could reach ~2000 lines (35% reduction).
