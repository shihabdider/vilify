// Google site configuration
// Supports search results page with Solarized Dark theme + Google Blue accent

import type { SiteConfig, SiteTheme, GoogleState, AppState, ContentItem, PageConfig, App, KeyContext, DrawerHandler, ListPageState } from '../../types';
import { getGooglePageType, scrapeSearchResults, scrapeImageResults } from './scraper';
import { renderGoogleItem, injectGoogleItemStyles } from './items';
import { renderGoogleImageGrid, GRID_COLUMNS } from './grid';
import { renderListing, updateSortIndicator, updateItemCount } from '../../core/layout';
import { getSortLabel } from '../../core/sort';
import { getVisibleItems } from '../../core/state';
import { getPageItems } from '../../core/view-tree';
import { showMessage } from '../../core/view';
import { copyToClipboard, copyImageToClipboard } from '../../core/actions';
import { getCachedPage, setCachedPage } from './page-cache';
import { getSuggestDrawer, resetSuggestDrawer } from './suggest';

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
const googleTheme: SiteTheme = {
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
function createGoogleState(): GoogleState {
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
function createGoogleListPageState(results: ContentItem[] = []): ListPageState {
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
function renderGoogleListing(state: AppState, siteState: GoogleState, container: HTMLElement): void {
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
function nextPage(): void {
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
function prevPage(): void {
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
function navigateToSearch(extraParams: string = ''): void {
  const query = new URLSearchParams(location.search).get('q');
  if (!query) { showMessage('No search query'); return; }
  location.href = '/search?q=' + encodeURIComponent(query) + extraParams;
}

/**
 * Get ALL key sequence bindings for Google, including navigation keys,
 * modifier combos, and multi-key sequences. Context-conditional.
 *
 * Provides ALL key bindings for Google — navigation, modifiers, multi-key sequences.
 *
 * On listing pages (!filterActive, !searchActive): 'j', 'k' navigate,
 * 'ArrowDown', 'ArrowUp', 'Enter' always available on listing pages.
 *
 * @param {Object} app - App callbacks (openLocalFilter, goToBottom, navigate, etc.)
 * @param {KeyContext} context - Current keyboard context { pageType, filterActive, searchActive, drawer }
 * @returns {Object<string, Function>} Key sequence map
 */
function getGoogleKeySequences(app: any, context: KeyContext): Record<string, Function> {
  const pageType = context?.pageType;

  // (1) Always-available bindings
  const sequences = {
    '/': () => app?.openLocalFilter?.(),
    'i': () => {
      const q = new URLSearchParams(location.search).get('q') || '';
      app?.openSearch?.(q);
    },
    ':': () => app?.openPalette?.('command'),
    'gg': () => app?.goToTop?.(),
    'go': () => navigateToSearch(),
    'gi': () => navigateToSearch('&udm=2'),
    'yy': () => {
      const item = app?.getSelectedItem?.();
      if (!item) {
        showMessage('No item selected');
        return;
      }
      if (pageType === 'images' && (item.imageUrl || item.thumbnail)) {
        copyImageToClipboard(item.imageUrl || item.thumbnail);
      } else if (item.url) {
        copyToClipboard(item.url);
      }
    },
  };

  // (2) Modifier combos + Shift keys
  sequences['C-f'] = () => nextPage();
  sequences['C-b'] = () => prevPage();
  sequences['G'] = () => app?.goToBottom?.();

  // (3) Listing-page navigation (always on listing pages)
  sequences['ArrowDown'] = () => app?.navigate?.('down');
  sequences['ArrowUp'] = () => app?.navigate?.('up');
  sequences['Enter'] = () => app?.select?.(false);

  // (4) Listing + !filterActive + !searchActive: j/k navigate
  if (!context?.filterActive && !context?.searchActive) {
    sequences['j'] = () => app?.navigate?.('down');
    sequences['k'] = () => app?.navigate?.('up');
  }

  return sequences;
}

// =============================================================================
// PAGE CONFIGS
// =============================================================================

/**
 * Search results page configuration.
 * @type {PageConfig}
 */
const searchPageConfig: PageConfig = {
  waitForContent: () => document.querySelector('#rso') !== null,
  render: renderGoogleListing,
};

/**
 * Other pages - no overlay.
 * @type {PageConfig}
 */
const otherPageConfig: PageConfig = {
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
export const googleConfig: SiteConfig = {
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
   * Get ALL key sequence bindings (including navigation, modifiers, multi-key).
   * @param {Object} app - App callbacks (openLocalFilter, navigate, etc.)
   * @param {KeyContext} context - Current keyboard context
   * @returns {Object<string, Function>}
   */
  getKeySequences: getGoogleKeySequences,

  /**
   * Get keys to block on Google pages.
   * Google doesn't have native keyboard shortcuts that conflict,
   * so this returns an empty array.
   * @param {KeyContext} context - Current keyboard context
   * @returns {string[]}
   */
  getBlockedNativeKeys: (context) => [],

  /**
   * Check if a DOM target is Google's native search input.
   * Used by the keyboard engine for Escape-to-blur behavior.
   * @param {HTMLElement} target - Event target element
   * @returns {boolean}
   */
  isNativeSearchInput: (target) => {
    return !!target.closest?.('form[role="search"]') ||
           (target.tagName === 'TEXTAREA' && target.name === 'q') ||
           (target.tagName === 'INPUT' && target.name === 'q');
  },

  /**
   * Get drawer handler for site-specific drawers.
   * Returns suggest drawer handler for 'suggest' drawer state.
   * @param {string} drawerState - Current drawer state
   * @param {GoogleState} siteState - Google-specific state
   * @returns {DrawerHandler|null}
   */
  getDrawerHandler: (drawerState, siteState) => {
    if (drawerState === 'suggest') {
      return getSuggestDrawer({
        searchUrl: googleConfig.searchUrl,
        placeholder: 'Search Google...',
        initialQuery: new URLSearchParams(location.search).get('q') || '',
      });
    }
    return null;
  },

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

export * from './scraper';
