// Modal rendering - Description and Chapter picker drawers
// Following HTDP design from .design/DATA.md and .design/STYLES.md
// Both use the bottom drawer pattern like the command palette

import { el, clear, updateListSelection } from './view.js';

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {HTMLElement|null} Description drawer element */
let descriptionDrawer = null;

/** @type {HTMLElement|null} Description content element */
let descriptionContent = null;

/** @type {HTMLElement|null} Chapter picker drawer element */
let chapterDrawer = null;

/** @type {HTMLElement|null} Chapter list element */
let chapterListEl = null;

/** @type {HTMLElement|null} Chapter filter input element */
let chapterFilterInput = null;

// =============================================================================
// CSS STYLES
// =============================================================================

const MODAL_CSS = `
  /* Description drawer - bottom drawer pattern */
  .vilify-description-drawer {
    position: fixed;
    bottom: 32px; /* Above status bar */
    left: 0;
    right: 0;
    max-height: 50vh;
    background: var(--bg-1);
    border-top: 2px solid var(--bg-3);
    display: none;
    flex-direction: column;
    z-index: 10000;
  }
  
  .vilify-description-drawer.open {
    display: flex;
  }
  
  .vilify-description-content {
    flex: 1;
    overflow-y: auto;
    max-height: 400px;
    padding: 16px;
    color: var(--txt-2);
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
    scrollbar-width: none;
  }
  
  .vilify-description-content::-webkit-scrollbar {
    display: none;
  }
  
  .vilify-description-empty {
    color: var(--txt-3);
    font-style: italic;
    text-align: center;
    padding: 20px;
  }
  
  .vilify-description-footer {
    padding: 8px 16px;
    border-top: 1px solid var(--bg-3);
    font-size: 11px;
    color: var(--txt-3);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .vilify-description-footer kbd {
    background: transparent;
    border: 1px solid var(--bg-3);
    padding: 1px 5px;
    margin-left: 4px;
    font-family: var(--font-mono);
    font-size: 10px;
  }
  
  /* Chapter picker drawer - bottom drawer pattern */
  .vilify-chapter-drawer {
    position: fixed;
    bottom: 32px; /* Above status bar */
    left: 0;
    right: 0;
    max-height: 50vh;
    background: var(--bg-1);
    border-top: 2px solid var(--bg-3);
    display: none;
    flex-direction: column;
    z-index: 10000;
  }
  
  .vilify-chapter-drawer.open {
    display: flex;
  }
  
  /* Chapter filter input - at bottom */
  .vilify-chapter-filter {
    padding: 8px 16px;
    border-top: 1px solid var(--bg-3);
  }
  
  .vilify-chapter-filter input {
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--bg-3);
    color: var(--txt-1);
    font-family: var(--font-mono);
    font-size: 14px;
    padding: 4px 0;
    outline: none;
  }
  
  .vilify-chapter-filter input:focus {
    border-bottom-color: var(--txt-3);
  }
  
  .vilify-chapter-filter input::placeholder {
    color: var(--txt-3);
  }
  
  .vilify-chapter-list {
    flex: 1;
    overflow-y: auto;
    max-height: 350px;
    scrollbar-width: none;
  }
  
  .vilify-chapter-list::-webkit-scrollbar {
    display: none;
  }
  
  .vilify-chapter-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    cursor: pointer;
    border-bottom: 1px solid var(--bg-2);
  }
  
  .vilify-chapter-item:last-child {
    border-bottom: none;
  }
  
  .vilify-chapter-item:hover {
    background: var(--bg-2);
  }
  
  .vilify-chapter-item.selected {
    background: var(--bg-2);
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  
  .vilify-chapter-time {
    color: var(--accent);
    font-family: var(--font-mono);
    font-size: 12px;
    min-width: 50px;
  }
  
  .vilify-chapter-title {
    color: var(--txt-2);
    font-size: 13px;
    flex: 1;
  }
  
  .vilify-chapter-item.selected .vilify-chapter-title {
    color: var(--txt-1);
  }
  
  .vilify-chapter-empty {
    color: var(--txt-3);
    font-style: italic;
    text-align: center;
    padding: 20px;
  }
  
  .vilify-chapter-footer {
    padding: 8px 16px;
    border-top: 1px solid var(--bg-3);
    font-size: 11px;
    color: var(--txt-3);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .vilify-chapter-footer kbd {
    background: transparent;
    border: 1px solid var(--bg-3);
    padding: 1px 5px;
    margin-left: 4px;
    font-family: var(--font-mono);
    font-size: 10px;
  }
  
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
// DESCRIPTION DRAWER
// =============================================================================

/**
 * Create description drawer element
 * [I/O]
 */
function createDescriptionDrawer() {
  descriptionContent = el('div', { class: 'vilify-description-content' }, []);
  
  const footer = el('div', { class: 'vilify-description-footer' }, [
    el('span', {}, ['description']),
    el('span', {}, [
      el('kbd', {}, ['j']),
      el('kbd', {}, ['k']),
      ' scroll ',
      el('kbd', {}, ['Esc']),
      ' close',
    ]),
  ]);
  
  descriptionDrawer = el('div', { class: 'vilify-description-drawer' }, [
    descriptionContent,
    footer,
  ]);
  
  document.body.appendChild(descriptionDrawer);
}

/**
 * Render description drawer with content
 * [I/O]
 * 
 * @param {string} description - Description text to display
 */
export function renderDescriptionModal(description) {
  injectModalStyles();
  
  if (!descriptionDrawer) {
    createDescriptionDrawer();
  }
  
  if (!descriptionContent) return;
  
  clear(descriptionContent);
  
  if (description && description.trim()) {
    // Clean up whitespace issues from YouTube descriptions
    const cleaned = description
      .trim()
      .replace(/\r\n/g, '\n')           // Normalize line endings
      .replace(/[\u00A0\u200B\u2028\u2029]/g, ' ')  // Replace special Unicode whitespace
      .replace(/[ \t]+/g, ' ')          // Collapse multiple spaces/tabs to single space
      .replace(/\n[ \t]+/g, '\n')       // Remove leading spaces on lines
      .replace(/[ \t]+\n/g, '\n')       // Remove trailing spaces on lines
      .replace(/\n{2,}/g, '\n\n')       // Collapse 2+ newlines to exactly 2
      .replace(/^\n+/, '')              // Remove leading newlines
      .replace(/\n+$/, '');             // Remove trailing newlines
    descriptionContent.textContent = cleaned;
  } else {
    descriptionContent.appendChild(el('div', { class: 'vilify-description-empty' }, ['No description available']));
  }
  
  // Reset scroll position
  descriptionContent.scrollTop = 0;
}

/**
 * Show description drawer
 * [I/O]
 */
export function showDescriptionModal() {
  if (!descriptionDrawer) return;
  descriptionDrawer.classList.add('open');
}

/**
 * Hide description drawer
 * [I/O]
 */
export function hideDescriptionModal() {
  if (!descriptionDrawer) return;
  descriptionDrawer.classList.remove('open');
}

/**
 * Scroll description content
 * [I/O]
 * 
 * @param {'up'|'down'} direction - Scroll direction
 */
export function scrollDescription(direction) {
  if (!descriptionContent) return;
  
  const scrollAmount = 100; // pixels per j/k press
  if (direction === 'down') {
    descriptionContent.scrollTop += scrollAmount;
  } else {
    descriptionContent.scrollTop -= scrollAmount;
  }
}

// =============================================================================
// CHAPTER PICKER DRAWER
// =============================================================================

/** @type {Array<Object>} Full chapter list for filtering */
let allChapters = [];

/** @type {string} Current filter query */
let chapterQuery = '';

/** @type {Function|null} Callback when filter changes */
let onChapterFilterChange = null;

/**
 * Create chapter picker drawer element
 * [I/O]
 */
function createChapterDrawer() {
  chapterFilterInput = el('input', {
    type: 'text',
    placeholder: 'Filter chapters...',
    id: 'vilify-chapter-filter-input',
  }, []);
  
  const filterContainer = el('div', { class: 'vilify-chapter-filter' }, [chapterFilterInput]);
  
  chapterListEl = el('div', { class: 'vilify-chapter-list' }, []);
  
  const footer = el('div', { class: 'vilify-chapter-footer' }, [
    el('span', {}, ['chapters']),
    el('span', {}, [
      el('kbd', {}, ['↑']),
      el('kbd', {}, ['↓']),
      ' navigate ',
      el('kbd', {}, ['↵']),
      ' jump ',
      el('kbd', {}, ['Esc']),
      ' close',
    ]),
  ]);
  
  // Filter input at BOTTOM (after list and footer)
  chapterDrawer = el('div', { class: 'vilify-chapter-drawer' }, [
    chapterListEl,
    footer,
    filterContainer,
  ]);
  
  // Wire up filter input
  chapterFilterInput.addEventListener('input', (e) => {
    chapterQuery = e.target.value;
    if (onChapterFilterChange) {
      onChapterFilterChange(chapterQuery);
    }
  });
  
  // Prevent input events from bubbling to keyboard handler
  chapterFilterInput.addEventListener('keydown', (e) => {
    // Allow Escape to close drawer
    if (e.key === 'Escape') {
      return; // Let it bubble
    }
    // Allow Enter to select
    if (e.key === 'Enter') {
      return; // Let it bubble
    }
    // Allow arrow keys for navigation (j/k stay in input for typing)
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      return; // Let it bubble
    }
    // Stop other keys from triggering shortcuts
    e.stopPropagation();
  });
  
  document.body.appendChild(chapterDrawer);
}

/**
 * Filter chapters by query (fuzzy match on title)
 * [PURE]
 * 
 * @param {Array<Object>} chapters - Chapters to filter
 * @param {string} query - Filter query
 * @returns {Array<Object>} Filtered chapters
 */
function filterChapters(chapters, query) {
  if (!query) return chapters;
  
  const lowerQuery = query.toLowerCase();
  return chapters.filter(ch => 
    ch.title?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Render chapter list
 * [I/O]
 * 
 * @param {Array<Object>} chapters - Chapters to display
 * @param {number} selectedIdx - Currently selected index
 */
function renderChapterList(chapters, selectedIdx) {
  if (!chapterListEl) return;
  
  clear(chapterListEl);
  
  if (!chapters || chapters.length === 0) {
    chapterListEl.appendChild(el('div', { class: 'vilify-chapter-empty' }, [
      chapterQuery ? 'No matching chapters' : 'No chapters available'
    ]));
    return;
  }
  
  chapters.forEach((chapter, idx) => {
    const isSelected = idx === selectedIdx;
    const itemEl = el('div', {
      class: `vilify-chapter-item ${isSelected ? 'selected' : ''}`,
      'data-idx': idx,
    }, [
      el('span', { class: 'vilify-chapter-time' }, [chapter.timeText || '0:00']),
      el('span', { class: 'vilify-chapter-title' }, [chapter.title || 'Untitled']),
    ]);
    
    chapterListEl.appendChild(itemEl);
  });
  
  // Update selection and scroll into view
  updateListSelection(chapterListEl, '.vilify-chapter-item', selectedIdx);
}

/**
 * Render chapter picker drawer with chapters
 * [I/O]
 * 
 * @param {Array<Object>} chapters - Chapters to display
 * @param {number} selectedIdx - Currently selected chapter index
 * @param {Function} onFilterChange - Callback when filter changes
 */
export function renderChapterModal(chapters, selectedIdx, onFilterChange) {
  injectModalStyles();
  
  if (!chapterDrawer) {
    createChapterDrawer();
  }
  
  // Store for filtering
  allChapters = chapters || [];
  onChapterFilterChange = onFilterChange;
  
  // Apply current filter
  const filtered = filterChapters(allChapters, chapterQuery);
  renderChapterList(filtered, selectedIdx);
}

/**
 * Show chapter drawer and focus input
 * [I/O]
 */
export function showChapterModal() {
  if (!chapterDrawer) return;
  chapterDrawer.classList.add('open');
  
  // Focus filter input
  setTimeout(() => {
    if (chapterFilterInput) {
      chapterFilterInput.focus();
    }
  }, 10);
}

/**
 * Hide chapter drawer and reset filter
 * [I/O]
 */
export function hideChapterModal() {
  if (!chapterDrawer) return;
  chapterDrawer.classList.remove('open');
  
  // Reset filter
  chapterQuery = '';
  if (chapterFilterInput) {
    chapterFilterInput.value = '';
  }
}

/**
 * Update chapter selection without full re-render
 * [I/O]
 * 
 * @param {number} selectedIdx - New selected index
 */
export function updateChapterSelection(selectedIdx) {
  if (!chapterListEl) return;
  updateListSelection(chapterListEl, '.vilify-chapter-item', selectedIdx);
}

/**
 * Get filtered chapters based on current query
 * [PURE]
 * 
 * @returns {Array<Object>} Filtered chapters
 */
export function getFilteredChapters() {
  return filterChapters(allChapters, chapterQuery);
}

/**
 * Re-render chapter list with new selection
 * [I/O]
 * 
 * @param {number} selectedIdx - Selected index
 */
export function rerenderChapterList(selectedIdx) {
  const filtered = filterChapters(allChapters, chapterQuery);
  renderChapterList(filtered, selectedIdx);
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
