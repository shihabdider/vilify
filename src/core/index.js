// Core orchestration - Main entry point for Vilify
// Following HTDP design from .design/DATA.md and .design/BLUEPRINT.md

import { createAppState, getMode } from './state.js';
import { el, clear, updateListSelection, showMessage, flashBoundary, navigateList, isInputElement } from './view.js';
import { injectLoadingStyles, showLoadingScreen, hideLoadingScreen } from './loading.js';
import { setupNavigationObserver } from './navigation.js';
import { setupKeyboardHandler } from './keyboard.js';
import { injectFocusModeStyles, applyTheme, renderFocusMode, renderListing } from './layout.js';
import { injectPaletteStyles, filterItems, openPalette, closePalette, renderPalette, showPalette, hidePalette } from './palette.js';
import { copyToClipboard, navigateTo, openInNewTab } from './actions.js';

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {AppState|null} Main application state */
let state = null;

/** @type {Object|null} Site-specific state (e.g., YouTubeState) */
let siteState = null;

/** @type {SiteConfig|null} Current site configuration */
let currentConfig = null;

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize site with configuration.
 * Entry point - shows loading, waits for content, sets up handlers.
 * [I/O]
 *
 * @param {SiteConfig} config - Site configuration object
 *
 * @example
 * initSite(youtubeConfig)
 * // Sets up everything for the site
 */
export function initSite(config) {
  // Template: I/O - orchestration with multiple side effects
  // Inventory: config (SiteConfig)

  currentConfig = config;

  // Inject styles early (before content loads)
  injectLoadingStyles();
  injectFocusModeStyles();
  injectPaletteStyles();

  // Show loading screen with site theme
  showLoadingScreen(config);

  // Wait for content then initialize
  waitForContent(config).then(() => {
    // Create initial state
    state = createAppState();
    state.focusModeActive = true;
    state.lastUrl = location.href;

    // Create site-specific state if factory provided
    if (config.createSiteState) {
      siteState = config.createSiteState();
    }

    // Apply site theme
    if (config.theme) {
      applyTheme(config.theme);
    }

    // Set up keyboard handling
    setupKeyboardHandler(config, getState, setState, {
      onNavigate: handleListNavigation,
      onSelect: handleSelect,
      onEscape: handleEscape,
      onRender: render,
      onNextCommentPage: handleNextCommentPage,
      onPrevCommentPage: handlePrevCommentPage,
    });

    // Set up SPA navigation observer
    setupNavigationObserver(handleNavigation);

    // Add focus mode class to body
    document.body.classList.add('vilify-focus-mode');

    // Initial render
    render();

    // Hide loading screen
    hideLoadingScreen();

    // Call site's onContentReady hook if provided
    if (config.onContentReady) {
      config.onContentReady();
    }

    console.log('[Vilify] Initialized');
  });
}

/**
 * Wait for page content to be ready.
 * For watch pages, waits for video element.
 * For listing pages, waits for items to appear.
 * [I/O]
 *
 * @param {SiteConfig} config - Site configuration
 * @param {number} timeout - Max time to wait in ms
 * @returns {Promise<void>} Resolves when content is ready or timeout
 */
function waitForContent(config, timeout = 5000) {
  // Template: I/O - polling with timeout
  return new Promise((resolve) => {
    const start = Date.now();

    const check = () => {
      const pageType = config.getPageType ? config.getPageType() : 'other';

      // Determine if content is ready based on page type
      let ready = false;
      if (pageType === 'watch') {
        // Watch page: wait for video element
        ready = !!document.querySelector('video.html5-main-video');
      } else {
        // Listing page: wait for items
        const items = config.getItems ? config.getItems() : [];
        ready = items.length > 0;
      }

      if (ready || Date.now() - start > timeout) {
        resolve();
      } else {
        setTimeout(check, 200);
      }
    };

    check();
  });
}

// =============================================================================
// STATE ACCESSORS
// =============================================================================

/**
 * Get current app state (for keyboard handler).
 * @returns {AppState} Current state
 */
function getState() {
  return state;
}

/**
 * Set app state and trigger re-render.
 * @param {AppState} newState - New state
 */
function setState(newState) {
  state = newState;
  render();
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Main render function.
 * Renders focus mode container, content based on page type, and palette if open.
 * [I/O]
 */
function render() {
  // Template: I/O - DOM mutation
  if (!state || !currentConfig) return;

  const pageType = currentConfig.getPageType ? currentConfig.getPageType() : 'other';

  // Ensure focus mode container exists
  let container = document.getElementById('vilify-content');
  if (!container) {
    renderFocusMode(currentConfig, state);
    container = document.getElementById('vilify-content');
  }

  // Update status bar
  updateStatusBar();

  // Render content based on page type and layout config
  if (currentConfig.layouts && currentConfig.layouts[pageType]) {
    const layout = currentConfig.layouts[pageType];

    if (typeof layout === 'function') {
      // Custom layout renderer
      layout(state, siteState, container);
    } else if (layout === 'listing') {
      // Built-in listing layout
      const items = currentConfig.getItems ? currentConfig.getItems() : [];

      // Apply local filter if active
      const filtered = state.localFilterActive
        ? items.filter((i) => i.title?.toLowerCase().includes(state.localFilterQuery.toLowerCase()))
        : items;

      renderListing(filtered, state.selectedIdx, container);
    }
    // 'detail' layout would go here if needed
  }

  // Handle palette rendering
  if (state.modalState === 'palette') {
    const commands = currentConfig.getCommands
      ? currentConfig.getCommands({
          state,
          siteState,
          navigateTo,
          copyToClipboard,
          openPalette: (mode) => {
            state = openPalette(state, mode);
            render();
          },
          openFilter: () => {
            state = { ...state, localFilterActive: true };
            render();
          },
          openSearch: () => {
            // Focus YouTube search box
            const searchInput = document.querySelector('input#search');
            if (searchInput) searchInput.focus();
          },
        })
      : [];

    // Filter commands by query (strip leading ':' for command mode)
    const query = state.paletteQuery.startsWith(':')
      ? state.paletteQuery.slice(1)
      : state.paletteQuery;
    const filtered = filterItems(commands, query);

    renderPalette(filtered, state.paletteSelectedIdx);
    showPalette();
  } else {
    hidePalette();
  }
}

/**
 * Update status bar with current mode and input state.
 * [I/O]
 */
function updateStatusBar() {
  // Template: I/O - DOM mutation
  const mode = getMode(state);

  // Update mode badge
  const badge = document.querySelector('.vilify-mode-badge');
  if (badge) {
    badge.textContent = mode;
  }

  // Update status input visibility and value
  const input = document.querySelector('.vilify-status-input');
  if (input) {
    if (state.localFilterActive || state.siteSearchActive || state.modalState === 'palette') {
      input.style.display = 'block';
      input.value = state.localFilterActive
        ? state.localFilterQuery
        : state.siteSearchActive
          ? state.siteSearchQuery
          : state.paletteQuery;
    } else {
      input.style.display = 'none';
    }
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle list navigation (j/k/arrows).
 * @param {'up' | 'down' | 'top' | 'bottom'} direction - Navigation direction
 */
function handleListNavigation(direction) {
  // Template: I/O - state mutation
  const items = currentConfig.getItems ? currentConfig.getItems() : [];
  const result = navigateList(direction, state.selectedIdx, items.length);

  state.selectedIdx = result.index;

  if (result.boundary) {
    flashBoundary();
  }

  render();
}

/**
 * Handle item selection (Enter key).
 * @param {boolean} shiftKey - Whether Shift was held
 */
function handleSelect(shiftKey) {
  // Template: I/O - conditional action
  if (state.modalState === 'palette') {
    // Execute selected palette command
    const commands = currentConfig.getCommands
      ? currentConfig.getCommands({
          state,
          siteState,
          navigateTo,
          copyToClipboard,
        })
      : [];

    const query = state.paletteQuery.startsWith(':')
      ? state.paletteQuery.slice(1)
      : state.paletteQuery;
    const filtered = filterItems(commands, query);

    // Filter out group headers for index calculation
    const actionable = filtered.filter((c) => !c.group);
    const item = actionable[state.paletteSelectedIdx];

    if (item?.action) {
      state = closePalette(state);
      item.action();
      render();
    }
  } else {
    // Navigate to selected item
    const items = currentConfig.getItems ? currentConfig.getItems() : [];
    const item = items[state.selectedIdx];

    if (item?.url) {
      if (shiftKey) {
        openInNewTab(item.url);
      } else {
        navigateTo(item.url);
      }
    }
  }
}

/**
 * Handle Escape key press.
 * Closes modals, filters, and search in priority order.
 */
function handleEscape() {
  // Template: I/O - state mutation with priority
  if (state.modalState) {
    state = closePalette(state);
    render();
  } else if (state.localFilterActive) {
    state.localFilterActive = false;
    state.localFilterQuery = '';
    render();
  } else if (state.siteSearchActive) {
    state.siteSearchActive = false;
    state.siteSearchQuery = '';
    render();
  }
}

/**
 * Handle SPA navigation (URL change).
 * @param {string} oldUrl - Previous URL
 * @param {string} newUrl - New URL
 */
function handleNavigation(oldUrl, newUrl) {
  // Template: I/O - state reset and re-render
  console.log('[Vilify] Navigation:', oldUrl, '->', newUrl);

  // Reset selection and filter state
  state.selectedIdx = 0;
  state.localFilterQuery = '';
  state.localFilterActive = false;
  state.lastUrl = newUrl;

  // Reset site-specific state if needed
  if (currentConfig.createSiteState) {
    siteState = currentConfig.createSiteState();
  }

  // Wait for new content then re-render
  waitForContent(currentConfig).then(render);
}

/**
 * Handle next comment page (Ctrl+f on watch page).
 */
function handleNextCommentPage() {
  // Template: I/O - delegate to site-specific handler
  if (currentConfig.watch?.nextCommentPage && siteState) {
    siteState = currentConfig.watch.nextCommentPage(siteState);
    render();
  }
}

/**
 * Handle previous comment page (Ctrl+b on watch page).
 */
function handlePrevCommentPage() {
  // Template: I/O - delegate to site-specific handler
  if (currentConfig.watch?.prevCommentPage && siteState) {
    siteState = currentConfig.watch.prevCommentPage(siteState);
    render();
  }
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Re-export commonly used functions for sites
export { createAppState, getMode } from './state.js';
export { el, clear, showMessage } from './view.js';
export { copyToClipboard, navigateTo, openInNewTab } from './actions.js';
