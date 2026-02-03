// Command palette - Bottom drawer for commands
// Following HTDP design from .design/DATA.md and .design/BLUEPRINT.md

import { el, clear, updateListSelection } from './view.js';

// Palette CSS styles - Bottom drawer pattern
const PALETTE_CSS = `
  /* Bottom drawer pattern */
  .vilify-drawer {
    position: fixed; bottom: 32px; left: 0; right: 0;
    max-height: 50vh; background: var(--bg-1);
    border-top: 2px solid var(--bg-3);
    display: none; flex-direction: column;
    z-index: 10000;
  }
  .vilify-drawer.open { display: flex; }
  
  .vilify-drawer-list {
    flex: 1; overflow-y: auto; max-height: 400px;
    scrollbar-width: none;
  }
  .vilify-drawer-list::-webkit-scrollbar { display: none; }
  
  .vilify-drawer-footer {
    padding: 6px 12px; border-top: 1px solid var(--bg-3);
    font-size: 11px; color: var(--txt-3);
  }
  
  /* Command items - keys first (fixed width), then label */
  .vilify-cmd-group { padding: 10px 16px 4px; color: var(--txt-3); font-size: 12px; text-transform: lowercase; }
  .vilify-cmd-item { display: flex; align-items: center; padding: 8px 16px; cursor: pointer; }
  .vilify-cmd-item:hover { background: var(--bg-2); }
  .vilify-cmd-item.selected { background: var(--bg-2); outline: 2px solid var(--accent); outline-offset: -2px; }
  .vilify-cmd-keys { font-size: 12px; color: var(--txt-3); min-width: 72px; }
  .vilify-cmd-keys kbd { background: transparent; border: 1px solid var(--bg-3); padding: 2px 6px; margin-right: 4px; }
  .vilify-cmd-label { color: var(--txt-2); font-size: 14px; }
  .vilify-cmd-item.selected .vilify-cmd-label { color: var(--txt-1); }
  .vilify-cmd-item.selected .vilify-cmd-keys { color: var(--txt-2); }
  .vilify-cmd-item.selected .vilify-cmd-keys kbd { border-color: var(--txt-3); }
`;

// Module-level state for DOM elements
let drawerEl = null;
let listEl = null;
let stylesInjected = false;

/**
 * Inject palette styles into the document.
 * [I/O]
 *
 * @example
 * injectPaletteStyles()  // Adds <style> element to head
 */
export function injectPaletteStyles() {
  // Template: I/O - DOM mutation
  // Only inject once
  if (stylesInjected) return;

  const styleEl = document.createElement('style');
  styleEl.textContent = PALETTE_CSS;
  document.head.appendChild(styleEl);
  stylesInjected = true;
}

/**
 * Filter items by query (substring match on label and keys).
 * [PURE]
 *
 * @param {Array<Object>} items - Items to filter (may include group headers)
 * @param {string} query - Search query
 * @returns {Array<Object>} Filtered items (group headers excluded)
 *
 * @example
 * filterItems([{label: 'Copy URL'}, {label: 'Go Home'}], 'copy')
 *   => [{label: 'Copy URL'}]
 *
 * filterItems(items, '')  => items (non-group items only if query empty, all items if truly empty)
 */
export function filterItems(items, query) {
  // Template: Self-referential (list) - iteration
  // If no query, return all items
  if (!query) return items;

  const q = query.toLowerCase();

  return items.filter((item) => {
    // Filter out group headers - they'll be re-added by caller if needed
    if (item.group) return false;

    // Check label match
    const labelMatch = item.label?.toLowerCase().includes(q);

    // Check keys match (strip whitespace for comparison)
    const keysMatch = item.keys?.toLowerCase().replace(/\s+/g, '').includes(q);

    return labelMatch || keysMatch;
  });
}

/**
 * Open command palette in specified mode.
 * Returns new state with palette open.
 * [PURE]
 *
 * @param {AppState} state - Current app state
 * @param {'command' | 'video' | string} mode - Palette mode
 * @returns {AppState} New state with palette open
 *
 * @example
 * openPalette(state, 'command')
 *   => { ...state, ui: { drawer: 'palette', paletteQuery: ':', paletteSelectedIdx: 0 } }
 *
 * openPalette(state, 'video')
 *   => { ...state, ui: { drawer: 'palette', paletteQuery: '', paletteSelectedIdx: 0 } }
 */
export function openPalette(state, mode) {
  // Template: Compound - return new state with updated fields
  return {
    ...state,
    ui: {
      ...state.ui,
      drawer: 'palette',
      paletteQuery: mode === 'command' ? ':' : '',
      paletteSelectedIdx: 0,
    }
  };
}

/**
 * Close palette.
 * Returns new state with palette closed.
 * [PURE]
 *
 * @param {AppState} state - Current app state
 * @returns {AppState} New state with palette closed
 *
 * @example
 * closePalette(state)
 *   => { ...state, ui: { ...state.ui, drawer: null, paletteQuery: '' } }
 */
export function closePalette(state) {
  // Template: Compound - return new state with cleared fields
  return {
    ...state,
    ui: {
      ...state.ui,
      drawer: null,
      paletteQuery: '',
    }
  };
}

/**
 * Create the drawer DOM structure.
 * [I/O]
 *
 * Creates:
 * - .vilify-drawer (container)
 *   - .vilify-drawer-list (scrollable item list)
 */
function createPaletteDrawer() {
  // Template: I/O - DOM creation
  // Create list container
  listEl = el('div', { class: 'vilify-drawer-list' }, []);

  // Create drawer container
  drawerEl = el('div', { class: 'vilify-drawer' }, [listEl]);

  // Append to body
  document.body.appendChild(drawerEl);
}

/**
 * Render palette drawer with items and selection.
 * [I/O]
 *
 * @param {Array<Object>} items - Items to render (may include group headers with .group property)
 * @param {number} selectedIdx - Index of selected item (excludes group headers)
 *
 * @example
 * renderPalette([{label: 'Copy URL', keys: 'yy'}, ...], 0)
 */
export function renderPalette(items, selectedIdx) {
  // Template: I/O - DOM mutation
  // Ensure drawer exists
  if (!drawerEl) createPaletteDrawer();

  // Clear existing content
  clear(listEl);

  // Track index for non-group items
  let idx = 0;

  // Render each item
  items.forEach((item) => {
    if (item.group) {
      // Render group header
      listEl.appendChild(el('div', { class: 'vilify-cmd-group' }, [item.group]));
    } else {
      // Render command item (no icon column - just label and keys)
      const isSelected = idx === selectedIdx;

      // Build kbd elements for keys
      const keysChildren = item.keys
        ? item.keys.split(' ').map((k) => el('kbd', {}, [k]))
        : [];

      const itemEl = el(
        'div',
        {
          class: `vilify-cmd-item ${isSelected ? 'selected' : ''}`,
          'data-idx': idx,
        },
        [
          // Keys first (fixed width column), then label
          el('span', { class: 'vilify-cmd-keys' }, keysChildren),
          el('span', { class: 'vilify-cmd-label' }, [item.label]),
        ]
      );

      listEl.appendChild(itemEl);
      idx++;
    }
  });

  // Update selection visual state and scroll into view
  updateListSelection(listEl, '.vilify-cmd-item', selectedIdx);
}

/**
 * Show palette drawer.
 * [I/O]
 *
 * @example
 * showPalette()  // Makes drawer visible
 */
export function showPalette() {
  // Template: I/O - DOM mutation
  // Ensure drawer exists
  if (!drawerEl) createPaletteDrawer();

  // Add 'open' class to show drawer
  drawerEl.classList.add('open');
}

/**
 * Hide palette drawer.
 * [I/O]
 *
 * @example
 * hidePalette()  // Hides drawer
 */
export function hidePalette() {
  // Template: I/O - DOM mutation
  // Remove 'open' class to hide drawer
  if (drawerEl) {
    drawerEl.classList.remove('open');
  }
}
