// Google site configuration
// Supports search results page with Solarized Dark theme + Google Blue accent

import type { SiteConfig, SiteTheme, GoogleState, AppState, ContentItem, PageConfig, App, KeyContext, DrawerHandler, ListPageState } from '../../types';
import { getGooglePageType, scrapeSearchResults, scrapeImageResults, scrapeResultsFromContainer } from './scraper';
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
import { openHelpWindow } from '../../core/help-window';
import { getGoogleHelpSections } from './help-sections';
import { getGoogleCommands } from './commands';

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
  bg1: 'hsl(192, 100%, 11%)',      // Solarized base03
  bg2: 'hsl(192, 81%, 14%)',       // Solarized base02
  bg3: 'hsl(193, 80%, 20%)',       // Slightly lighter for hover
  txt1: 'hsl(0, 0%, 95%)',         // Primary text
  txt2: 'hsl(0, 0%, 67%)',         // Secondary text
  txt3: 'hsl(0, 0%, 44%)',         // Tertiary text
  txt4: 'hsl(217, 89%, 61%)',      // Google Blue for links
  accent: 'hsl(217, 89%, 61%)',    // Google Blue accent
  accentHover: 'hsl(219, 62%, 52%)',
  modeNormal: 'hsl(136, 52%, 43%)',   // Google Green
  modeSearch: 'hsl(217, 89%, 61%)',   // Google Blue
  modeCommand: 'hsl(45, 97%, 50%)',   // Google Yellow
  modeFilter: 'hsl(4, 81%, 56%)',     // Google Red
  modeReplace: 'hsl(5, 81%, 56%)',
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
 * Get current pagination offset from URL's `start` parameter.
 * [PURE]
 * @returns {number} Current start offset (0-based)
 */
function getPageStart(): number {
  const params = new URLSearchParams(location.search);
  return parseInt(params.get('start') || '0', 10) || 0;
}

/**
 * Navigate to a Google search results page at a given start offset.
 * Preserves all existing URL parameters.
 * [I/O]
 */
function navigateToPage(start: number): void {
  const params = new URLSearchParams(location.search);
  if (start > 0) {
    params.set('start', String(start));
  } else {
    params.delete('start');
  }
  location.href = '/search?' + params.toString();
}

/** Track how many pages have been loaded (for infinite scroll) */
let loadedPageCount = 1;

/**
 * Navigate to previous page of Google search results.
 * Uses URL `start` parameter (decrements by 10, min 0).
 * [I/O]
 */
function prevPage(): void {
  const current = getPageStart();
  if (current <= 0) {
    showMessage('Already on first page');
    return;
  }
  navigateToPage(Math.max(0, current - 10));
}

/**
 * Fetch the next page of Google results and return them as ContentItems.
 * Builds the next page URL using the current start offset + pages already loaded,
 * fetches the HTML, parses it with DOMParser, and runs the scraper on it.
 * [I/O]
 */
async function fetchNextPageResults(): Promise<ContentItem[]> {
  const baseStart = getPageStart();
  const nextStart = baseStart + (loadedPageCount * 10);

  const params = new URLSearchParams(location.search);
  params.set('start', String(nextStart));
  const url = '/search?' + params.toString();

  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Run the same selector strategies on the fetched document
    const container = doc.querySelector('#rso')
      || doc.querySelector('#search')
      || doc.querySelector('#main');
    if (!container) return [];

    const results = scrapeResultsFromContainer(container);
    if (results.length > 0) {
      loadedPageCount++;
    }
    return results;
  } catch (e) {
    return [];
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
  sequences['C-d'] = () => app?.navigate?.('down', 10);
  sequences['C-u'] = () => app?.navigate?.('up', 10);
  sequences['C-e'] = () => app?.navigate?.('down');
  sequences['C-y'] = () => app?.navigate?.('up');
  sequences['G'] = () => app?.goToBottom?.();

  // (3) Listing-page navigation (always on listing pages)
  sequences['ArrowDown'] = () => app?.navigate?.('down');
  sequences['ArrowUp'] = () => app?.navigate?.('up');
  sequences['ArrowLeft'] = () => app?.navigate?.('left');
  sequences['ArrowRight'] = () => app?.navigate?.('right');
  sequences['Enter'] = () => app?.select?.(false);
  sequences['S-Enter'] = () => app?.select?.(true);

  // (4) Listing + !filterActive + !searchActive: j/k navigate
  if (!context?.filterActive && !context?.searchActive) {
    sequences['j'] = () => app?.navigate?.('down');
    sequences['k'] = () => app?.navigate?.('up');
    
    // Grid navigation for images
    if (pageType === 'images') {
      sequences['h'] = () => app?.navigate?.('left');
      sequences['l'] = () => app?.navigate?.('right');
    }
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
  waitForContent: () =>
    document.querySelector('#rso') !== null ||
    document.querySelector('#search') !== null,
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

  getHelpSections: getGoogleHelpSections,

  tabs: [
    { label: 'Web', shortcut: 'go', type: 'search', path: '/search' },
    { label: 'Images', shortcut: 'gi', type: 'images', path: '/search' },
  ],
  hints: {
    list: [
      { key: 'hjkl', label: 'move' },
      { key: 'gg', label: 'top' }, { key: 'G', label: 'bottom' },
      { key: '↵', label: 'open' },
      { key: 'yy', label: 'copy' },
      { key: 'i', label: 'search' }, { key: '/', label: 'filter' }, { key: ':', label: 'cmd' },
    ],
  },

  fetchMoreItems: fetchNextPageResults,
  onTopBoundary: prevPage,

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
   * @param {App} app - The main app object with callbacks.
   * @returns {Array<Command>}
   */
  getCommands: (app) => getGoogleCommands(app),

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
