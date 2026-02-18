// Command palette - Bottom drawer for commands
// Following HTDP design from .design/DATA.md and .design/BLUEPRINT.md

import type { AppState } from '../types';
import { el, clear, updateListSelection } from './view';

// Palette CSS styles - Neovim-style completion menu
const PALETTE_CSS = `
  /* Completion menu - cursor-following, auto-width */
  .vilify-drawer {
    position: fixed; bottom: 32px; left: 16px;
    max-height: 50vh;
    background: var(--bg-2);
    border: 1px solid var(--bg-3);
    display: none; flex-direction: column;
    z-index: 10000;
    width: fit-content;
    min-width: 180px;
    transition: left 0.06s ease-out;
  }
  .vilify-drawer.open { display: flex; }

  .vilify-drawer-list {
    flex: 1; overflow-y: auto; max-height: 400px;
    scrollbar-width: thin;
    scrollbar-color: var(--bg-3) transparent;
    padding: 4px 0;
  }
  .vilify-drawer-list::-webkit-scrollbar { width: 4px; }
  .vilify-drawer-list::-webkit-scrollbar-track { background: transparent; }
  .vilify-drawer-list::-webkit-scrollbar-thumb { background: var(--bg-3); }

  .vilify-drawer-footer {
    padding: 4px 10px; border-top: 1px solid var(--bg-3);
    font-size: 11px; color: var(--txt-3);
  }

  /* Command items - flat list, no groups */
  .vilify-cmd-item {
    display: flex; align-items: center;
    padding: 3px 12px;
    cursor: pointer;
    white-space: nowrap;
  }
  .vilify-cmd-item:hover { background: var(--bg-3); }
  .vilify-cmd-item.selected { background: var(--bg-3); }
  .vilify-cmd-item.selected .vilify-cmd-label { color: var(--txt-1); }
  .vilify-cmd-item.selected .vilify-cmd-keys { color: var(--txt-2); }
  .vilify-cmd-keys { font-size: 11px; color: var(--txt-3); min-width: 56px; margin-right: 8px; }
  .vilify-cmd-keys kbd { background: transparent; border: none; padding: 0; margin-right: 2px; font-size: 11px; font-family: var(--font-mono); }
  .vilify-cmd-label { color: var(--txt-2); font-size: 12px; }
  .vilify-cmd-item:hover .vilify-cmd-label { color: var(--txt-1); }
  .vilify-cmd-item:hover .vilify-cmd-keys { color: var(--txt-2); }
`;

/** A command item or group header in the palette */
export interface PaletteItem {
  label?: string;
  keys?: string;
  group?: string;
  action?: () => void;
  [key: string]: any;
}

// Module-level state for DOM elements
let drawerEl: HTMLElement | null = null;
let listEl: HTMLElement | null = null;
let stylesInjected: boolean = false;
let measureSpan: HTMLSpanElement | null = null;

/**
 * Inject palette styles into the document.
 * [I/O]
 *
 * @example
 * injectPaletteStyles()  // Adds <style> element to head
 */
export function injectPaletteStyles(): void {
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
export function filterItems(items: PaletteItem[], query: string): PaletteItem[] {
  // Template: Self-referential (list) - iteration
  // If no query, return all items
  if (!query) return items;

  const q = query.toLowerCase();

  return items.filter((item) => {
    // Filter out group headers - they'll be re-added by caller if needed
    if (item.group) return false;

    // Check label match
    const labelMatch = item.label?.toLowerCase().includes(q);

    // Check keys match (strip whitespace from both for comparison)
    const keysMatch = item.keys?.toLowerCase().replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));

    return labelMatch || keysMatch;
  });
}

/**
 * Filter commands for colon-mode palette display.
 * Keeps only commands with colon-prefixed keys, revealing hidden commands
 * (colorscheme, font) when the query matches their prefix.
 * [PURE]
 *
 * @param {PaletteItem[]} commands - Full command list
 * @param {string} query - User query (without leading colon)
 * @returns {PaletteItem[]} Filtered commands for display
 */
export function filterColonCommands(commands: PaletteItem[], query: string): PaletteItem[] {
  const queryLower = query.toLowerCase();
  const showHidden = queryLower.startsWith('colo') || queryLower.startsWith('set guifont');
  const colonOnly = commands.filter(c => c.group || (c.keys?.startsWith(':') && (!c.hidden || showHidden)));
  // Normalize ':colorscheme ' to ':colo ' so it matches command keys
  const normalized = queryLower.startsWith('colorscheme') ? 'colo' + query.slice('colorscheme'.length) : query;
  return filterItems(colonOnly, normalized.trim());
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
export function openPalette(state: AppState, mode?: string): AppState {
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
export function closePalette(state: AppState): AppState {
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
function createPaletteDrawer(): void {
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
export function renderPalette(items: PaletteItem[], selectedIdx: number): void {
  // Template: I/O - DOM mutation
  // Ensure drawer exists
  if (!drawerEl) createPaletteDrawer();

  // Clear existing content
  clear(listEl);

  // Flat list — skip group headers, track actionable index for selection
  let actionIdx = 0;
  items.forEach((item) => {
    if (item.group) return;

    const isSelected = actionIdx === selectedIdx;

    const children = [];
    if (item.keys && !item.hidden) {
      children.push(el('span', { class: 'vilify-cmd-keys' }, [item.keys]));
    }
    children.push(el('span', { class: 'vilify-cmd-label' }, [item.label]));

    const itemEl = el(
      'div',
      { class: isSelected ? 'vilify-cmd-item selected' : 'vilify-cmd-item' },
      children
    );

    if (item.action) {
      itemEl.addEventListener('click', () => item.action());
    }

    listEl.appendChild(itemEl);
    actionIdx++;
  });

  // Scroll selected item into view
  const selectedEl = listEl.querySelector('.vilify-cmd-item.selected');
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }

  // Reposition after content changes (menu width may have changed)
  updatePalettePosition();
}

/**
 * Scroll the palette list by one page in the given direction.
 * [I/O]
 */
export function scrollPalette(direction: 'up' | 'down'): void {
  if (!listEl) return;
  const step = listEl.clientHeight * 0.8;
  listEl.scrollBy({ top: direction === 'down' ? step : -step, behavior: 'smooth' });
}

/**
 * Position the palette drawer at the text cursor in the status bar input.
 * Uses a hidden span to measure text width, then sets drawer left offset.
 * Clamps to viewport so the menu never overflows off-screen.
 * [I/O]
 */
export function updatePalettePosition(): void {
  if (!drawerEl) return;

  const input = document.getElementById('vilify-status-input') as HTMLInputElement | null;
  if (!input) return;

  // Lazily create a reusable measurement span
  if (!measureSpan) {
    measureSpan = document.createElement('span');
    measureSpan.style.cssText =
      'position:absolute;visibility:hidden;white-space:pre;pointer-events:none;';
    document.body.appendChild(measureSpan);
  }

  // Mirror the input's font so measurement is accurate
  const cs = getComputedStyle(input);
  measureSpan.style.fontFamily = cs.fontFamily;
  measureSpan.style.fontSize = cs.fontSize;
  measureSpan.style.fontWeight = cs.fontWeight;
  measureSpan.style.letterSpacing = cs.letterSpacing;
  measureSpan.textContent = input.value;

  const inputRect = input.getBoundingClientRect();
  const textWidth = measureSpan.offsetWidth;
  const cursorX = inputRect.left + textWidth;

  // Clamp: don't let the menu overflow past the right edge of the viewport
  const menuWidth = drawerEl.offsetWidth || 180;
  const maxLeft = window.innerWidth - menuWidth - 8;
  const left = Math.max(0, Math.min(cursorX, maxLeft));

  drawerEl.style.left = `${left}px`;
}

/**
 * Show palette drawer.
 * [I/O]
 *
 * @example
 * showPalette()  // Makes drawer visible
 */
export function showPalette(): void {
  // Template: I/O - DOM mutation
  // Ensure drawer exists
  if (!drawerEl) createPaletteDrawer();

  // Add 'open' class to show drawer
  drawerEl.classList.add('open');

  // Position at cursor
  updatePalettePosition();
}

/**
 * Hide palette drawer.
 * [I/O]
 *
 * @example
 * hidePalette()  // Hides drawer
 */
export function hidePalette(): void {
  // Template: I/O - DOM mutation
  // Remove 'open' class to hide drawer
  if (drawerEl) {
    drawerEl.classList.remove('open');
  }
}
