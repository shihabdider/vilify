// View Tree - Pure view computation for Vilify
// Following HTDP design: State → ViewTree (pure), then applyView (I/O)
// See .design/DATA.md for ViewTree type definitions

import { getMode, getVisibleItems } from './state.js';
import { getSortLabel } from './sort.js';
import { filterItems } from './palette.js';

// =============================================================================
// STATUS BAR VIEW
// =============================================================================

/**
 * Compute status bar view from state.
 * [PURE]
 *
 * @param {AppState} state - Current application state
 * @param {string|null} drawerPlaceholder - Placeholder for site-specific drawers
 * @returns {StatusBarView} Status bar view data
 *
 * @example
 * // Normal mode
 * toStatusBarView({ ui: { drawer: null, filterActive: false } })
 *   => { mode: 'NORMAL', inputVisible: false, inputValue: '', ... }
 *
 * @example
 * // Filter mode
 * toStatusBarView({ ui: { filterActive: true, filterQuery: 'react' } })
 *   => { mode: 'FILTER', inputVisible: true, inputValue: 'react', inputPlaceholder: 'Filter...', ... }
 */
export function toStatusBarView(state, drawerPlaceholder = null) {
  const mode = getMode(state);
  
  // Extract values from state (support both nested and legacy formats)
  const filterQuery = state.ui?.filterQuery ?? state.localFilterQuery ?? '';
  const searchQuery = state.ui?.searchQuery ?? state.siteSearchQuery ?? '';
  const paletteQuery = state.ui?.paletteQuery ?? state.paletteQuery ?? '';
  const sortField = state.ui?.sort?.field ?? state.sortField ?? null;
  const sortDirection = state.ui?.sort?.direction ?? state.sortDirection ?? 'desc';
  
  // Determine if this is a site-specific drawer
  const isSiteDrawer = mode !== 'NORMAL' && mode !== 'COMMAND' && 
                       mode !== 'FILTER' && mode !== 'SEARCH' && 
                       mode !== 'DESCRIPTION';
  
  // Compute input visibility and value based on mode
  let inputVisible = false;
  let inputValue = '';
  let inputPlaceholder = '';
  let inputFocus = false;
  let hints = null;
  
  if (mode === 'FILTER') {
    inputVisible = true;
    inputValue = filterQuery;
    inputPlaceholder = 'Filter...';
    inputFocus = true;
    hints = '↑↓ navigate ↵ select esc close';
  } else if (mode === 'SEARCH') {
    inputVisible = true;
    inputValue = searchQuery;
    inputPlaceholder = 'Search YouTube...';
    inputFocus = true;
  } else if (mode === 'COMMAND') {
    inputVisible = true;
    inputValue = paletteQuery;
    inputPlaceholder = 'Command...';
    inputFocus = true;
    hints = '↑↓ navigate ↵ select esc close';
  } else if (mode === 'DESCRIPTION') {
    hints = 'j k scroll esc close';
  } else if (isSiteDrawer) {
    inputVisible = true;
    inputValue = '';
    inputPlaceholder = drawerPlaceholder || `Filter ${mode.toLowerCase()}...`;
    inputFocus = true;
    hints = '↑↓ navigate ↵ select esc close';
  }
  
  return {
    mode,
    inputVisible,
    inputValue,
    inputPlaceholder,
    inputFocus,
    sortLabel: getSortLabel(sortField, sortDirection),
    itemCount: null,  // Set by caller with actual count
    hints
  };
}

// =============================================================================
// CONTENT VIEW
// =============================================================================

/**
 * Compute content view from state.
 * [PURE]
 *
 * @param {AppState} state - Current application state
 * @param {SiteConfig} config - Site configuration
 * @param {Item[]} items - All items (before filtering)
 * @returns {ContentView} Content view data
 *
 * @example
 * // Listing page
 * toContentView(state, config, videos)
 *   => { type: 'listing', items: [...filtered/sorted], selectedIdx: 0, render: null }
 *
 * @example
 * // Custom layout (watch page)
 * toContentView(state, { pages: { watch: { render: fn } } }, [])
 *   => { type: 'custom', items: [], selectedIdx: 0, render: fn }
 */
export function toContentView(state, config, items) {
  const pageType = config?.getPageType?.() ?? 'other';
  const selectedIdx = state.ui?.selectedIdx ?? state.selectedIdx ?? 0;
  
  // Check for page configuration (new format) or layout (legacy)
  const pageConfig = config?.pages?.[pageType];
  const layout = pageConfig?.render ?? config?.layouts?.[pageType];
  
  if (typeof layout === 'function') {
    // Custom render function
    return {
      type: 'custom',
      items: [],
      selectedIdx,
      render: layout
    };
  }
  
  if (layout === 'listing' || !layout) {
    // Standard listing - apply filter and sort
    const visibleItems = getVisibleItems(state, items);
    
    if (visibleItems.length === 0) {
      return {
        type: 'empty',
        items: [],
        selectedIdx: 0,
        render: null
      };
    }
    
    return {
      type: 'listing',
      items: visibleItems,
      selectedIdx,
      render: null
    };
  }
  
  // Unknown layout type
  return {
    type: 'empty',
    items: [],
    selectedIdx: 0,
    render: null
  };
}

// =============================================================================
// DRAWER VIEW
// =============================================================================

/**
 * Compute drawer view from state.
 * [PURE]
 *
 * @param {AppState} state - Current application state
 * @param {SiteConfig} config - Site configuration
 * @param {Object} context - Additional context { commands, siteState }
 * @returns {DrawerView|null} Drawer view data, or null if no drawer open
 *
 * @example
 * // No drawer
 * toDrawerView({ ui: { drawer: null } }, config, {})
 *   => null
 *
 * @example
 * // Command palette
 * toDrawerView({ ui: { drawer: 'palette', paletteQuery: ':sort' } }, config, { commands })
 *   => { type: 'palette', visible: true, items: [...filtered], selectedIdx: 0, handler: null }
 */
export function toDrawerView(state, config, context = {}) {
  const { drawer, paletteSelectedIdx, paletteQuery } = state.ui;
  
  if (drawer === null) {
    return null;
  }
  
  if (drawer === 'palette') {
    // Command palette
    const commands = context.commands || [];
    const query = paletteQuery.startsWith(':') ? paletteQuery.slice(1) : paletteQuery;
    const filteredCommands = filterItems(commands, query);
    
    return {
      type: 'palette',
      visible: true,
      items: filteredCommands,
      selectedIdx: paletteSelectedIdx,
      handler: null
    };
  }
  
  // Site-specific drawer
  const handler = config?.getDrawerHandler?.(drawer, context.siteState) ?? null;
  
  return {
    type: drawer,
    visible: true,
    items: [],  // Handler manages its own items
    selectedIdx: 0,
    handler
  };
}

// =============================================================================
// MAIN VIEW FUNCTION
// =============================================================================

/**
 * Compute complete view tree from state.
 * [PURE] - No DOM access, no side effects.
 *
 * @param {AppState} state - Current application state
 * @param {SiteConfig} config - Site configuration
 * @param {Object} context - Additional context { items, commands, siteState }
 * @returns {ViewTree} Complete view tree
 *
 * @example
 * const view = toView(state, config, { items, commands, siteState });
 * // view = { statusBar: {...}, content: {...}, drawer: {...} }
 */
export function toView(state, config, context = {}) {
  const { items = [], commands = [], siteState = null } = context;
  
  // Get drawer placeholder for status bar
  let drawerPlaceholder = null;
  const drawer = state.ui.drawer;
  if (drawer && drawer !== 'palette') {
    const handler = config?.getDrawerHandler?.(drawer, siteState);
    if (handler?.getFilterPlaceholder) {
      drawerPlaceholder = handler.getFilterPlaceholder();
    }
  }
  
  // Compute all view components
  const statusBar = toStatusBarView(state, drawerPlaceholder);
  const content = toContentView(state, config, items);
  const drawerView = toDrawerView(state, config, { commands, siteState });
  
  // Set item count in status bar from content
  if (content.type === 'listing') {
    statusBar.itemCount = content.items.length;
  }
  
  return {
    statusBar,
    content,
    drawer: drawerView
  };
}

// =============================================================================
// VIEW COMPARISON HELPERS
// =============================================================================

/**
 * Check if two status bar views are equal (for diffing).
 * [PURE]
 *
 * @param {StatusBarView} a - First view
 * @param {StatusBarView} b - Second view
 * @returns {boolean} True if equal
 */
export function statusBarViewEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  
  return (
    a.mode === b.mode &&
    a.inputVisible === b.inputVisible &&
    a.inputValue === b.inputValue &&
    a.inputPlaceholder === b.inputPlaceholder &&
    a.inputFocus === b.inputFocus &&
    a.sortLabel === b.sortLabel &&
    a.itemCount === b.itemCount &&
    a.hints === b.hints
  );
}

/**
 * Check if two content views need re-render (shallow comparison).
 * [PURE]
 *
 * @param {ContentView} a - First view
 * @param {ContentView} b - Second view
 * @returns {boolean} True if need re-render
 */
export function contentViewChanged(a, b) {
  if (a === b) return false;
  if (!a || !b) return true;
  
  // Type change always requires re-render
  if (a.type !== b.type) return true;
  
  // Selection change requires update
  if (a.selectedIdx !== b.selectedIdx) return true;
  
  // Items array reference change (shallow)
  if (a.items !== b.items) return true;
  
  return false;
}

/**
 * Check if drawer view changed.
 * [PURE]
 *
 * @param {DrawerView|null} a - First view
 * @param {DrawerView|null} b - Second view
 * @returns {boolean} True if changed
 */
export function drawerViewChanged(a, b) {
  if (a === b) return false;
  if (!a || !b) return true;
  
  return (
    a.type !== b.type ||
    a.visible !== b.visible ||
    a.selectedIdx !== b.selectedIdx ||
    a.items !== b.items
  );
}
