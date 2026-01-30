// Modal rendering - Generic filter drawer
// Following HTDP design from .design/DATA.md and .design/STYLES.md
// Site-specific drawers (chapters, description) moved to site implementations

import { el, clear, updateListSelection } from './view.js';

// =============================================================================
// CSS STYLES
// =============================================================================

const MODAL_CSS = `
  /* Filter drawer - bottom drawer with thumbnails */
  .vilify-filter-drawer {
    position: fixed;
    bottom: 32px;
    left: 0;
    right: 0;
    max-height: 50vh;
    background: var(--bg-1);
    border-top: 2px solid var(--bg-3);
    display: none;
    flex-direction: column;
    z-index: 10000;
  }
  
  .vilify-filter-drawer.open {
    display: flex;
  }
  
  .vilify-filter-list {
    flex: 1;
    overflow-y: auto;
    max-height: 350px;
    scrollbar-width: none;
  }
  
  .vilify-filter-list::-webkit-scrollbar {
    display: none;
  }
  
  .vilify-filter-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 8px 16px;
    cursor: pointer;
  }
  
  .vilify-filter-item:hover {
    background: var(--bg-2);
  }
  
  .vilify-filter-item.selected {
    background: var(--bg-2);
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  
  .vilify-filter-thumb {
    width: 64px;
    height: 36px;
    object-fit: cover;
    background: var(--bg-2);
    flex-shrink: 0;
  }
  
  .vilify-filter-info {
    flex: 1;
    min-width: 0;
  }
  
  .vilify-filter-title {
    color: var(--txt-2);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .vilify-filter-item.selected .vilify-filter-title {
    color: var(--txt-1);
  }
  
  .vilify-filter-meta {
    color: var(--txt-3);
    font-size: 11px;
    margin-top: 2px;
  }
  
  .vilify-filter-empty {
    color: var(--txt-3);
    font-style: italic;
    text-align: center;
    padding: 20px;
  }
  
  .vilify-filter-footer {
    padding: 8px 16px;
    border-top: 1px solid var(--bg-3);
    font-size: 11px;
    color: var(--txt-3);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .vilify-filter-footer kbd {
    background: transparent;
    border: 1px solid var(--bg-3);
    padding: 1px 5px;
    margin-left: 4px;
    font-family: var(--font-mono);
    font-size: 10px;
  }
`;

// Track if styles have been injected
let stylesInjected = false;

// =============================================================================
// STYLE INJECTION
// =============================================================================

/**
 * Inject modal styles into document
 * [I/O]
 */
export function injectModalStyles() {
  if (stylesInjected) return;
  
  const styleEl = document.createElement('style');
  styleEl.id = 'vilify-modal-styles';
  styleEl.textContent = MODAL_CSS;
  document.head.appendChild(styleEl);
  
  stylesInjected = true;
}

// =============================================================================
// FILTER DRAWER
// =============================================================================

/** @type {HTMLElement|null} Filter drawer element */
let filterDrawer = null;

/** @type {HTMLElement|null} Filter list element */
let filterListEl = null;

/** @type {HTMLElement|null} Filter footer element */
let filterFooterCount = null;

/** @type {Array<Object>} Full item list for filtering */
let allFilterItems = [];

/** @type {string} Current filter query */
let filterQuery = '';

/** @type {number} Current selected index in filter */
let filterSelectedIdx = 0;

/** @type {Function|null} Callback when filter changes */
let onFilterChange = null;

/** @type {Function|null} Callback when item is selected */
let onFilterSelect = null;

/**
 * Create filter drawer element (no input - uses status bar input)
 * [I/O]
 */
function createFilterDrawer() {
  filterListEl = el('div', { class: 'vilify-filter-list' }, []);
  
  filterFooterCount = el('span', {}, ['0 results']);
  
  // Footer only shows count - hints are on status bar
  const footer = el('div', { class: 'vilify-filter-footer' }, [
    filterFooterCount,
  ]);
  
  // No input - uses status bar input instead
  filterDrawer = el('div', { class: 'vilify-filter-drawer' }, [
    filterListEl,
    footer,
  ]);
  
  document.body.appendChild(filterDrawer);
}

/**
 * Filter items by query
 * [PURE]
 */
function filterItems(items, query) {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter(item => 
    item.title?.toLowerCase().includes(q) ||
    item.meta?.toLowerCase().includes(q)
  );
}

/**
 * Render filter list
 * [I/O]
 */
function renderFilterList() {
  if (!filterListEl) return;
  
  clear(filterListEl);
  
  const filtered = filterItems(allFilterItems, filterQuery);
  
  if (filtered.length === 0) {
    filterListEl.appendChild(el('div', { class: 'vilify-filter-empty' }, [
      filterQuery ? 'No matching videos' : 'No videos available'
    ]));
    if (filterFooterCount) {
      filterFooterCount.textContent = '0 results';
    }
    return;
  }
  
  filtered.forEach((item, idx) => {
    const isSelected = idx === filterSelectedIdx;
    const itemEl = el('div', {
      class: `vilify-filter-item ${isSelected ? 'selected' : ''}`,
      'data-idx': idx,
    }, [
      item.thumbnail 
        ? el('img', { class: 'vilify-filter-thumb', src: item.thumbnail, alt: '' }, [])
        : el('div', { class: 'vilify-filter-thumb' }, []),
      el('div', { class: 'vilify-filter-info' }, [
        el('div', { class: 'vilify-filter-title' }, [item.title || 'Untitled']),
        item.meta ? el('div', { class: 'vilify-filter-meta' }, [item.meta]) : null,
      ].filter(Boolean)),
    ]);
    
    filterListEl.appendChild(itemEl);
  });
  
  if (filterFooterCount) {
    filterFooterCount.textContent = `${filtered.length} result${filtered.length === 1 ? '' : 's'}`;
  }
  
  updateListSelection(filterListEl, '.vilify-filter-item', filterSelectedIdx);
}

/**
 * Update filter selection
 * [I/O]
 */
function updateFilterSelection(idx) {
  if (!filterListEl) return;
  updateListSelection(filterListEl, '.vilify-filter-item', idx);
}

/**
 * Render filter drawer with items
 * [I/O]
 * 
 * @param {Array<Object>} items - Items to display
 * @param {Function} onChange - Callback when filter changes
 * @param {Function} onSelect - Callback when item is selected
 */
export function renderFilterDrawer(items, onChange, onSelect) {
  injectModalStyles();
  
  if (!filterDrawer) {
    createFilterDrawer();
  }
  
  allFilterItems = items || [];
  filterQuery = '';
  filterSelectedIdx = 0;
  onFilterChange = onChange;
  onFilterSelect = onSelect;
  
  renderFilterList();
}

/**
 * Show filter drawer
 * [I/O]
 */
export function showFilterDrawer() {
  if (!filterDrawer) return;
  filterDrawer.classList.add('open');
}

/**
 * Hide filter drawer and reset
 * [I/O]
 */
export function hideFilterDrawer() {
  if (!filterDrawer) return;
  filterDrawer.classList.remove('open');
  
  filterQuery = '';
  filterSelectedIdx = 0;
}

/**
 * Get filtered items
 * [PURE]
 */
export function getFilteredItems() {
  return filterItems(allFilterItems, filterQuery);
}

/**
 * Update filter query from external input (status bar)
 * [I/O]
 */
export function updateFilterQuery(query) {
  filterQuery = query;
  filterSelectedIdx = 0;
  renderFilterList();
}

/**
 * Navigate filter selection up/down
 * [I/O]
 */
export function navigateFilterSelection(direction) {
  const filtered = filterItems(allFilterItems, filterQuery);
  if (direction === 'up' && filterSelectedIdx > 0) {
    filterSelectedIdx--;
    updateFilterSelection(filterSelectedIdx);
  } else if (direction === 'down' && filterSelectedIdx < filtered.length - 1) {
    filterSelectedIdx++;
    updateFilterSelection(filterSelectedIdx);
  }
}

/**
 * Select current filter item
 * [I/O]
 */
export function selectFilterItem() {
  const filtered = filterItems(allFilterItems, filterQuery);
  if (filtered.length > 0 && onFilterSelect) {
    onFilterSelect(filtered[filterSelectedIdx]);
  }
}
