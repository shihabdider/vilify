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
  
  /* Chapter filter input */
  .vilify-chapter-filter {
    padding: 8px 16px;
    border-bottom: 1px solid var(--bg-3);
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
    descriptionContent.textContent = description;
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
  
  chapterDrawer = el('div', { class: 'vilify-chapter-drawer' }, [
    filterContainer,
    chapterListEl,
    footer,
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
