// Drawer primitives - Generic drawer infrastructure for Vilify
// Following HTDP design from .design/iterations/009-module-boundaries/DATA.md

import { el, clear, updateListSelection } from './view';
import type { DrawerHandler, AppState } from '../types';

// =============================================================================
// CSS STYLES
// =============================================================================

const DRAWER_CSS = `
  /* Generic drawer - bottom sheet pattern */
  .vilify-drawer {
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
  
  .vilify-drawer.open {
    display: flex;
  }
  
  /* List drawer styles */
  .vilify-drawer-list {
    flex: 1;
    overflow-y: auto;
    max-height: 350px;
    scrollbar-width: none;
  }
  
  .vilify-drawer-list::-webkit-scrollbar {
    display: none;
  }
  
  .vilify-drawer-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    cursor: pointer;
    border-bottom: 1px solid var(--bg-2);
  }
  
  .vilify-drawer-item:last-child {
    border-bottom: none;
  }
  
  .vilify-drawer-item:hover {
    background: var(--bg-2);
  }
  
  .vilify-drawer-item.selected {
    background: var(--bg-2);
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  
  .vilify-drawer-empty {
    color: var(--txt-3);
    font-style: italic;
    text-align: center;
    padding: 20px;
  }
  
  /* Filter input at bottom */
  .vilify-drawer-filter {
    padding: 8px 16px;
    border-top: 1px solid var(--bg-3);
  }
  
  .vilify-drawer-filter input {
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
  
  .vilify-drawer-filter input:focus {
    border-bottom-color: var(--txt-3);
  }
  
  .vilify-drawer-filter input::placeholder {
    color: var(--txt-3);
  }
  
  .vilify-drawer-footer {
    padding: 8px 16px;
    border-top: 1px solid var(--bg-3);
    font-size: 11px;
    color: var(--txt-3);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .vilify-drawer-footer kbd {
    background: transparent;
    border: 1px solid var(--bg-3);
    padding: 1px 5px;
    margin-left: 4px;
    font-family: var(--font-mono);
    font-size: 10px;
  }
  
  /* Content drawer (scrollable text) */
  .vilify-drawer-content {
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
  
  .vilify-drawer-content::-webkit-scrollbar {
    display: none;
  }
`;

// Track if styles have been injected
let stylesInjected = false;

/**
 * Inject drawer styles into document
 * [I/O]
 */
export function injectDrawerStyles(): void {
  if (stylesInjected) return;
  
  const styleEl = document.createElement('style');
  styleEl.id = 'vilify-drawer-styles';
  styleEl.textContent = DRAWER_CSS;
  document.head.appendChild(styleEl);
  
  stylesInjected = true;
}

// =============================================================================
// CONFIG TYPES
// =============================================================================

interface ListDrawerConfig {
  id: string;
  getItems: () => any[];
  renderItem: (item: any, isSelected: boolean) => HTMLElement;
  onSelect: (item: any) => void;
  filterPlaceholder: string;
  matchesFilter?: ((item: any, query: string) => boolean) | null;
}

interface ContentDrawerConfig {
  id: string;
  getContent: () => string | null;
  emptyMessage?: string;
}

// =============================================================================
// LIST DRAWER FACTORY
// =============================================================================

/**
 * Create a filterable list drawer from configuration.
 * Returns a DrawerHandler that manages its own internal state.
 * [PURE] (returns handler; handler methods have I/O)
 *
 * @param {ListDrawerConfig} config - Drawer configuration
 * @returns {DrawerHandler} Handler with render, onKey, cleanup methods
 *
 * @example
 * const chapterDrawer = createListDrawer({
 *   id: 'chapters',
 *   getItems: () => scrapeChapters(),
 *   renderItem: (ch, sel) => renderChapterItem(ch, sel),
 *   onSelect: (ch) => seekTo(ch.time),
 *   filterPlaceholder: 'Filter chapters...',
 *   matchesFilter: null
 * });
 */
export function createListDrawer(config: ListDrawerConfig): DrawerHandler {
  // Internal state (closure-scoped)
  let query = '';
  let selectedIdx = 0;
  let drawerEl: HTMLElement | null = null;
  let listEl: HTMLElement | null = null;
  
  /**
   * Get items filtered by current query
   */
  const getFilteredItems = () => {
    const items = config.getItems();
    if (!query) return items;
    
    const match = config.matchesFilter || ((item, q) => 
      item.title?.toLowerCase().includes(q.toLowerCase())
    );
    return items.filter(item => match(item, query));
  };
  
  /**
   * Render the list of items
   */
  const renderList = () => {
    if (!listEl) return;
    
    clear(listEl);
    
    const filtered = getFilteredItems();
    
    if (filtered.length === 0) {
      listEl.appendChild(el('div', { class: 'vilify-drawer-empty' }, [
        query ? 'No matches' : 'No items'
      ]));
      return;
    }
    
    // Clamp selectedIdx to valid range
    selectedIdx = Math.min(selectedIdx, filtered.length - 1);
    selectedIdx = Math.max(selectedIdx, 0);
    
    filtered.forEach((item, idx) => {
      const isSelected = idx === selectedIdx;
      const itemEl = config.renderItem(item, isSelected);
      itemEl.classList.add('vilify-drawer-item');
      if (isSelected) {
        itemEl.classList.add('selected');
      }
      itemEl.dataset.idx = String(idx);
      listEl.appendChild(itemEl);
    });
    
    // Scroll selected into view
    updateListSelection(listEl, '.vilify-drawer-item', selectedIdx);
  };
  
  return {
    /**
     * Render drawer into container (uses status bar input, not own input)
     * @param {HTMLElement} container
     */
    render: (container) => {
      injectDrawerStyles();
      
      // Create drawer structure (no input - uses status bar)
      listEl = el('div', { class: 'vilify-drawer-list' }, []);
      
      drawerEl = el('div', { class: 'vilify-drawer open' }, [
        listEl,
      ]);
      
      container.appendChild(drawerEl);
      renderList();
    },
    
    /**
     * Update filter query (called from status bar input)
     * @param {string} newQuery
     */
    updateQuery: (newQuery) => {
      query = newQuery;
      selectedIdx = 0;
      renderList();
    },
    
    /**
     * Get current filter placeholder
     * @returns {string}
     */
    getFilterPlaceholder: () => config.filterPlaceholder,
    
    /**
     * Handle key event
     * @param {string} key - Key that was pressed
     * @param {AppState} state - Current app state
     * @returns {{ handled: boolean, newState: AppState }}
     */
    onKey: (key, state) => {
      const filtered = getFilteredItems();
      
      // Helper to close drawer
      const closeDrawer = () => ({ ...state, ui: { ...state.ui, drawer: null } });
      
      if (key === 'Escape') {
        return { handled: true, newState: closeDrawer() };
      }
      
      if (key === 'ArrowDown' || key === 'j') {
        if (selectedIdx < filtered.length - 1) {
          selectedIdx++;
          renderList();
        }
        return { handled: true, newState: state };
      }
      
      if (key === 'ArrowUp' || key === 'k') {
        if (selectedIdx > 0) {
          selectedIdx--;
          renderList();
        }
        return { handled: true, newState: state };
      }
      
      if (key === 'Enter') {
        if (filtered.length > 0 && filtered[selectedIdx]) {
          config.onSelect(filtered[selectedIdx]);
        }
        return { handled: true, newState: closeDrawer() };
      }
      
      return { handled: false, newState: state };
    },
    
    /**
     * Cleanup drawer state
     */
    cleanup: () => {
      query = '';
      selectedIdx = 0;
      if (drawerEl) {
        drawerEl.remove();
        drawerEl = null;
      }
      listEl = null;
    }
  };
}

// =============================================================================
// CONTENT DRAWER FACTORY
// =============================================================================

/**
 * Create a scrollable content drawer (for text content like descriptions).
 * [PURE] (returns handler; handler methods have I/O)
 *
 * @param {Object} config - Drawer configuration
 * @param {string} config.id - Unique drawer identifier
 * @param {() => string|null} config.getContent - Function to get content text
 * @param {string} config.emptyMessage - Message when no content
 * @returns {DrawerHandler} Handler with render, onKey, cleanup methods
 */
export function createContentDrawer(config: ContentDrawerConfig): DrawerHandler {
  let drawerEl: HTMLElement | null = null;
  let contentEl: HTMLElement | null = null;
  
  const SCROLL_AMOUNT = 100;
  
  return {
    /**
     * Render drawer into container
     * @param {HTMLElement} container
     */
    render: (container) => {
      injectDrawerStyles();
      
      const content = config.getContent();
      
      contentEl = el('div', { class: 'vilify-drawer-content' }, []);
      
      if (content && content.trim()) {
        // Clean up whitespace
        const cleaned = content
          .trim()
          .replace(/\r\n/g, '\n')
          .replace(/[\u00A0\u200B\u2028\u2029]/g, ' ')
          .replace(/[ \t]+/g, ' ')
          .replace(/\n[ \t]+/g, '\n')
          .replace(/[ \t]+\n/g, '\n')
          .replace(/\n{2,}/g, '\n\n')
          .replace(/^\n+/, '')
          .replace(/\n+$/, '');
        contentEl.textContent = cleaned;
      } else {
        contentEl.appendChild(el('div', { class: 'vilify-drawer-empty' }, [
          config.emptyMessage || 'No content'
        ]));
      }
      
      drawerEl = el('div', { class: 'vilify-drawer open' }, [
        contentEl,
      ]);
      
      container.appendChild(drawerEl);
      
      // Reset scroll
      contentEl.scrollTop = 0;
    },
    
    /**
     * Handle key event
     * @param {string} key - Key that was pressed
     * @param {AppState} state - Current app state
     * @returns {{ handled: boolean, newState: AppState }}
     */
    onKey: (key, state) => {
      // Helper to close drawer
      const closeDrawerState = () => ({ ...state, ui: { ...state.ui, drawer: null } });
      
      if (key === 'Escape') {
        return { handled: true, newState: closeDrawerState() };
      }
      
      if ((key === 'j' || key === 'ArrowDown') && contentEl) {
        contentEl.scrollTop += SCROLL_AMOUNT;
        return { handled: true, newState: state };
      }
      
      if ((key === 'k' || key === 'ArrowUp') && contentEl) {
        contentEl.scrollTop -= SCROLL_AMOUNT;
        return { handled: true, newState: state };
      }
      
      if (key === 'g' && contentEl) {
        contentEl.scrollTop = 0;
        return { handled: true, newState: state };
      }
      
      if (key === 'G' && contentEl) {
        contentEl.scrollTop = contentEl.scrollHeight;
        return { handled: true, newState: state };
      }
      
      return { handled: false, newState: state };
    },
    
    /**
     * Cleanup drawer state
     */
    cleanup: () => {
      if (drawerEl) {
        drawerEl.remove();
        drawerEl = null;
      }
      contentEl = null;
    }
  };
}

// =============================================================================
// DRAWER MANAGER
// =============================================================================

/** Currently active drawer handler */
let activeDrawer: DrawerHandler | null = null;

/** Drawer container element */
let drawerContainer: HTMLElement | null = null;

/**
 * Get or create the drawer container element
 * @returns {HTMLElement}
 */
function getDrawerContainer(): HTMLElement {
  if (!drawerContainer) {
    drawerContainer = el('div', { id: 'vilify-drawer-container' }, []);
    document.body.appendChild(drawerContainer);
  }
  return drawerContainer;
}

/**
 * Render a drawer using the provided handler
 * [I/O]
 *
 * @param {DrawerState} drawerState - Current drawer state
 * @param {DrawerHandler|null} handler - Handler for this drawer
 */
export function renderDrawer(drawerState: string | null, handler: DrawerHandler | null): void {
  const container = getDrawerContainer();
  
  // Cleanup previous drawer
  if (activeDrawer && activeDrawer.cleanup) {
    activeDrawer.cleanup();
  }
  activeDrawer = null;
  clear(container);
  
  // No drawer to show
  if (drawerState === null || handler === null) {
    return;
  }
  
  // Render new drawer
  activeDrawer = handler;
  handler.render(container);
}

/**
 * Handle key event for active drawer
 * [PURE]
 *
 * @param {string} key - Key that was pressed
 * @param {AppState} state - Current app state
 * @param {DrawerHandler|null} handler - Handler for current drawer
 * @returns {{ handled: boolean, newState: AppState }}
 */
export function handleDrawerKey(key: string, state: AppState, handler: DrawerHandler | null): { handled: boolean; newState: AppState } {
  if (state.ui.drawer === null || handler === null) {
    return { handled: false, newState: state };
  }
  
  return handler.onKey(key, state);
}

/**
 * Close active drawer and cleanup
 * [I/O]
 */
export function closeDrawer(): void {
  if (activeDrawer && activeDrawer.cleanup) {
    activeDrawer.cleanup();
  }
  activeDrawer = null;
  
  if (drawerContainer) {
    clear(drawerContainer);
  }
}
