// Google site configuration
// Supports search results page with Solarized Dark theme + Google Blue accent

import { getGooglePageType, scrapeSearchResults, scrapeImageResults } from './scraper.js';
import { renderGoogleItem, injectGoogleItemStyles } from './items.js';
import { renderGoogleImageGrid, GRID_COLUMNS } from './grid.js';
import { renderListing, updateSortIndicator, updateItemCount } from '../../core/layout.js';
import { getSortLabel } from '../../core/sort.js';
import { getVisibleItems } from '../../core/state.js';
import { getPageItems } from '../../core/view-tree.js';
import { showMessage } from '../../core/view.js';
import { copyToClipboard, copyImageToClipboard } from '../../core/actions.js';
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
  
  const allItems = getPageItems(state);
  const items = getVisibleItems(state, allItems);
  
  const { sort, selectedIdx } = state.ui;
  
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
 * Navigate to a Google search page, preserving the current query.
 * [I/O - reads location, navigates]
 * 
 * @param {string} extraParams - Additional URL params to append (e.g. '&udm=2')
 */
function navigateToSearch(extraParams = '') {
  const query = new URLSearchParams(location.search).get('q');
  if (!query) { showMessage('No search query'); return; }
  location.href = '/search?q=' + encodeURIComponent(query) + extraParams;
}

/**
 * Get key sequence bindings for Google.
 * 
 * @param {Object} app - App callbacks (openLocalFilter, etc.)
 * @returns {Object<string, Function>} Key sequence map
 */
function getGoogleKeySequences(app) {
  const pageType = getGooglePageType();

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
    'go': () => navigateToSearch(),
    // Go to image search results
    'gi': () => navigateToSearch('&udm=2'),
    // yy: copy (page-type-aware)
    'yy': () => {
      const item = app?.getSelectedItem?.();
      if (!item) {
        showMessage('No item selected');
        return;
      }
      if (pageType === 'images' && item.thumbnail) {
        copyImageToClipboard(item.thumbnail);
      } else if (item.url) {
        copyToClipboard(item.url);
      }
    },
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
  searchUrl: (query) => {
    const base = '/search?q=' + encodeURIComponent(query);
    return getGooglePageType() === 'images' ? base + '&udm=2' : base;
  },
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
    
    if (pageType === 'images') {
      const results = scrapeImageResults();
      return createGoogleListPageState(results);
    }

    if (pageType === 'search') {
      const results = scrapeSearchResults();
      return createGoogleListPageState(results);
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
    images: {
      waitForContent: () => document.querySelector('#rso') !== null || document.querySelector('div[data-query]') !== null,
      render: renderGoogleImageGrid,
      gridColumns: GRID_COLUMNS,
      /**
       * Force-load lazy thumbnails that Google hasn't loaded yet.
       * Google Images uses IntersectionObserver to lazy-load thumbnails.
       * Images below the fold never load because our overlay prevents scrolling.
       * Fix: temporarily allow scrolling, scroll to trigger lazy loading, re-scrape.
       * [I/O]
       */
      onEnter: async (ctx) => {
        // Temporarily allow scrolling (body has overflow:hidden!important via vilify-focus-mode)
        document.body.classList.remove('vilify-focus-mode');

        // Scroll to bottom to trigger IntersectionObserver for all images
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(r => setTimeout(r, 300));

        // Scroll back to top and restore overlay
        window.scrollTo(0, 0);
        document.body.classList.add('vilify-focus-mode');

        // Re-scrape now that thumbnails have loaded
        ctx.refreshItems();
      },
    },
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
