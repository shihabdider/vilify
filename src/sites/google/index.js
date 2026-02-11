// Google site configuration
// Supports search results page with Solarized Dark theme + Google Blue accent

import { getGooglePageType, scrapeSearchResults } from './scraper.js';
import { renderGoogleItem, injectGoogleItemStyles } from './items.js';
import { renderListing, updateSortIndicator, updateItemCount } from '../../core/layout.js';
import { sortItems, getSortLabel } from '../../core/sort.js';
import { showMessage } from '../../core/view.js';
import { getCachedPage, setCachedPage } from './page-cache.js';

// =============================================================================
// THEME
// =============================================================================

/**
 * Google theme - Solarized Dark with Google Blue accent
 * @type {SiteTheme}
 * 
 * Google brand colors (for reference):
 * - Blue: #4285F4
 * - Red: #EA4335
 * - Yellow: #FBBC04
 * - Green: #34A853
 */
const googleTheme = {
  bg1: '#002b36',      // Solarized base03
  bg2: '#073642',      // Solarized base02
  bg3: '#0a4a5c',      // Slightly lighter for hover
  txt1: '#f1f1f1',     // Primary text
  txt2: '#aaaaaa',     // Secondary text
  txt3: '#717171',     // Tertiary text
  txt4: '#4285F4',     // Google Blue for links
  accent: '#4285F4',   // Google Blue accent
  accentHover: '#3367D6',
};

// =============================================================================
// SITE STATE
// =============================================================================

/**
 * Create initial Google-specific state.
 * Google has minimal state needs - no special features like YouTube's transcript.
 * [PURE]
 *
 * @returns {GoogleState} Initial Google state
 */
function createGoogleState() {
  return {};
}

// =============================================================================
// PAGE STATE
// =============================================================================

/**
 * Create list page state for Google search results.
 * [PURE]
 * 
 * @param {Array<ContentItem>} results - Search results
 * @returns {ListPageState}
 */
function createGoogleListPageState(results = []) {
  return {
    type: 'list',
    videos: results  // Reusing 'videos' field name for compatibility
  };
}

// =============================================================================
// LISTING LAYOUT
// =============================================================================

/**
 * Render Google search results listing.
 * [I/O]
 * 
 * @param {AppState} state - App state
 * @param {GoogleState} siteState - Google state (unused for now)
 * @param {HTMLElement} container - Container to render into
 */
function renderGoogleListing(state, siteState, container) {
  // Inject Google-specific item styles
  injectGoogleItemStyles();
  
  let items = state.page?.videos || [];
  
  const { filterActive, filterQuery, sort, selectedIdx } = state.ui;
  
  // Apply local filter if active
  if (filterActive) {
    const q = filterQuery.toLowerCase();
    items = items.filter(i => 
      i.title?.toLowerCase().includes(q) || 
      i.meta?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q)
    );
  }
  
  // Apply sorting if active
  if (sort.field) {
    items = sortItems(items, sort.field, sort.direction);
  }
  
  // Update sort indicator and count in status bar
  updateSortIndicator(getSortLabel(sort.field, sort.direction));
  updateItemCount(items.length);
  
  // Use custom renderer (no thumbnails, shows description)
  renderListing(items, selectedIdx, container, renderGoogleItem);
}

// =============================================================================
// PAGINATION
// =============================================================================

/**
 * Navigate to next page of Google search results.
 * [I/O]
 */
function nextPage() {
  // Find the "Next" link in Google's pagination
  const nextLink = document.querySelector('a#pnnext');
  if (nextLink) {
    nextLink.click();
  } else {
    showMessage('No next page');
  }
}

/**
 * Navigate to previous page of Google search results.
 * [I/O]
 */
function prevPage() {
  // Find the "Previous" link in Google's pagination
  const prevLink = document.querySelector('a#pnprev');
  if (prevLink) {
    prevLink.click();
  } else {
    showMessage('No previous page');
  }
}

// =============================================================================
// KEY SEQUENCES
// =============================================================================

/**
 * Get key sequence bindings for Google.
 * 
 * @param {Object} app - App callbacks (openLocalFilter, etc.)
 * @returns {Object<string, Function>} Key sequence map
 */
function getGoogleKeySequences(app) {
  return {
    // Filter: / opens local filter
    '/': () => {
      app?.openLocalFilter?.();
    },
    // Search: i opens search mode
    'i': () => app?.openSearch?.(),
    // Command palette
    ':': () => app?.openPalette?.('command'),
    // Go to top
    'gg': () => app?.goToTop?.(),
    // Go to web search results
    'go': () => { throw new Error('not implemented: go sequence (navigate to /search?q=<current query>)'); },
    // Go to image search results
    'gi': () => { throw new Error('not implemented: gi sequence (navigate to /search?q=<current query>&udm=2)'); },
  };
}

/**
 * Get single-key actions for Google (with modifiers).
 * 
 * @param {Object} app - App callbacks
 * @returns {Object<string, Function>} Single key action map
 */
function getGoogleSingleKeyActions(app) {
  return {
    // Ctrl+F: next page (forward)
    'F': () => nextPage(),
    // Ctrl+B: previous page (back)
    'B': () => prevPage(),
    // Shift+G: go to bottom
    'G': () => app?.goToBottom?.(),
  };
}

// =============================================================================
// PAGE CONFIGS
// =============================================================================

/**
 * Search results page configuration.
 * @type {PageConfig}
 */
const searchPageConfig = {
  waitForContent: () => document.querySelector('#rso') !== null,
  render: renderGoogleListing,
};

/**
 * Other pages - no overlay.
 * @type {PageConfig}
 */
const otherPageConfig = {
  waitForContent: () => true,
  render: () => {},  // No overlay on non-search pages
};

// =============================================================================
// SITE CONFIG
// =============================================================================

/**
 * Google site configuration.
 * Defines theme, page detection, scrapers, and page configs.
 * 
 * Signature: googleConfig : SiteConfig
 * Purpose: Google site configuration (theme, pages, scraper)
 * 
 * @type {SiteConfig}
 */
export const googleConfig = {
  name: 'google',
  matches: ['*://www.google.com/search*', '*://google.com/search*'],
  theme: googleTheme,
  logo: null,
  searchUrl: (query) => { throw new Error('not implemented: searchUrl (type-aware: should append &udm=2 on images page)'); },
  searchPlaceholder: 'Search Google...',

  getPageCache: (url) => getCachedPage(url),
  setPageCache: (url, items) => setCachedPage(url, items),

  /**
   * Get current page type from URL.
   * @returns {GooglePageType}
   */
  getPageType: getGooglePageType,

  /**
   * Get items for current page.
   * @returns {Array<ContentItem>}
   */
  getItems: scrapeSearchResults,

  /**
   * Create page state for current page type.
   * [I/O - reads from DOM]
   * 
   * @returns {GooglePageState} Page state for current page
   */
  createPageState: () => {
    const pageType = getGooglePageType();
    
    if (pageType === 'search') {
      const results = scrapeSearchResults();
      return createGoogleListPageState(results);
    }
    
    if (pageType === 'images') {
      // Stub: return empty list state for images (to be implemented with proper scraping)
      return createGoogleListPageState([]);
    }
    
    // Non-search pages get empty state
    return createGoogleListPageState([]);
  },

  /**
   * Get available commands for command palette.
   * Google has minimal commands - just the core ones.
   * @param {Object} ctx - Context with state, callbacks
   * @returns {Array<Command>}
   */
  getCommands: () => [],

  /**
   * Get key sequence bindings.
   * @param {Object} app - App callbacks (openLocalFilter, etc.)
   * @returns {Object<string, Function>}
   */
  getKeySequences: getGoogleKeySequences,

  /**
   * Get single-key actions (Ctrl+F/B for pagination).
   * @param {Object} app - App callbacks
   * @returns {Object<string, Function>}
   */
  getSingleKeyActions: getGoogleSingleKeyActions,

  /**
   * Get drawer handler for site-specific drawers.
   * Google has no drawers.
   * @param {string} drawerState - Current drawer state
   * @returns {DrawerHandler|null}
   */
  getDrawerHandler: () => null,

  /**
   * Page configurations per page type.
   * @type {Record<string, PageConfig>}
   */
  pages: {
    search: searchPageConfig,
    images: searchPageConfig,  // Stub: reuse search config (proper image grid later)
    other: otherPageConfig,
  },

  /**
   * Factory for site-specific state.
   * @returns {GoogleState}
   */
  createSiteState: createGoogleState,
};

// =============================================================================
// RE-EXPORTS
// =============================================================================

export * from './scraper.js';
