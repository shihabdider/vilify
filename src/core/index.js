// Core orchestration - Main entry point for Vilify
// Following HTDP design from .design/DATA.md and .design/BLUEPRINT.md

import { createAppState, getMode } from './state.js';
import { el, clear, updateListSelection, showMessage, flashBoundary, navigateList, isInputElement } from './view.js';
import { injectLoadingStyles, showLoadingScreen, hideLoadingScreen } from './loading.js';
import { setupNavigationObserver } from './navigation.js';
import { setupKeyboardHandler } from './keyboard.js';
import { injectFocusModeStyles, applyTheme, renderFocusMode, renderListing, setInputCallbacks, updateStatusBar, removeFocusMode } from './layout.js';
import { injectPaletteStyles, filterItems, openPalette, closePalette, renderPalette, showPalette, hidePalette } from './palette.js';
import { copyToClipboard, navigateTo, openInNewTab } from './actions.js';
import { injectModalStyles, renderFilterDrawer, showFilterDrawer, hideFilterDrawer, updateFilterQuery, navigateFilterSelection, selectFilterItem } from './modals.js';
import { injectDrawerStyles, renderDrawer, handleDrawerKey, closeDrawer } from './drawer.js';

// =============================================================================
// MODULE STATE
// =============================================================================

/** @type {AppState|null} Main application state */
let state = null;

/** @type {Object|null} Site-specific state (e.g., YouTubeState) */
let siteState = null;

/** @type {SiteConfig|null} Current site configuration */
let currentConfig = null;

/** @type {number|null} Content polling timer */
let pollTimer = null;

/** @type {number} Last seen video count for polling */
let lastVideoCount = 0;

/** @type {string|null} Previously rendered drawer state (to avoid re-render) */
let lastRenderedDrawer = null;

// =============================================================================
// CONSTANTS
// =============================================================================

const POLL_INTERVAL_MS = 200;

// =============================================================================
// CONTENT POLLING
// =============================================================================

/**
 * Start polling for content changes on listing pages.
 * Re-renders when new videos are detected.
 * [I/O]
 */
function startContentPolling() {
  stopContentPolling();
  lastVideoCount = 0;
  
  const poll = () => {
    const pageType = currentConfig?.getPageType?.() || 'other';
    
    // Don't poll on watch page
    if (pageType === 'watch') {
      stopContentPolling();
      return;
    }
    
    // Count video elements in DOM (YouTube-specific selectors)
    const currentCount = document.querySelectorAll(
      'ytd-rich-item-renderer, ytd-video-renderer, ' +
      'ytd-compact-video-renderer, ytd-grid-video-renderer, ' +
      'ytd-playlist-video-renderer, yt-lockup-view-model'
    ).length;
    
    // Check if YouTube is still loading content
    const isLoading = !!document.querySelector(
      'ytd-continuation-item-renderer, tp-yt-paper-spinner, ' +
      '#spinner, ytd-ghost-grid-renderer, ' +
      'ytd-rich-grid-renderer[is-loading], .ytd-ghost-grid-renderer'
    );
    
    // Re-render if video count changed and not currently loading
    if (currentCount !== lastVideoCount && !isLoading && currentCount > 0) {
      lastVideoCount = currentCount;
      render();
    }
    
    pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
  };
  
  poll();
}

/**
 * Stop content polling.
 * [I/O]
 */
function stopContentPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize site with configuration.
 * Entry point - shows loading, waits for content, sets up handlers.
 * [I/O]
 */
export function initSite(config) {
  currentConfig = config;

  // Inject styles early (before content loads)
  injectLoadingStyles();
  injectFocusModeStyles();
  injectPaletteStyles();
  injectModalStyles();
  injectDrawerStyles();

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

    // Set up input callbacks for status bar
    setInputCallbacks({
      onFilterChange: handleFilterChange,
      onFilterSubmit: handleFilterSubmit,
      onFilterNavigate: handleFilterNavigate,
      onSearchChange: handleSearchChange,
      onSearchSubmit: handleSearchSubmit,
      onCommandChange: handleCommandChange,
      onCommandSubmit: handleCommandSubmit,
      onCommandNavigate: handleCommandNavigate,
      onDrawerChange: handleDrawerChange,
      onDrawerSubmit: handleDrawerSubmit,
      onDrawerNavigate: handleDrawerNavigate,
      onEscape: handleInputEscape,
    });

    // Set up keyboard handling
    setupKeyboardHandler(config, getState, setState, {
      onNavigate: handleListNavigation,
      onSelect: handleSelect,
      onEscape: handleEscape,
      onRender: render,
      onNextCommentPage: handleNextCommentPage,
      onPrevCommentPage: handlePrevCommentPage,
      onDrawerKey: handleSiteDrawerKey,
    });

    // Set up SPA navigation observer
    setupNavigationObserver(handleNavigation);

    // Add focus mode class to body
    document.body.classList.add('vilify-focus-mode');

    // Initial render
    render();

    // Hide loading screen
    hideLoadingScreen();

    // Start content polling for listing pages
    const pageType = config.getPageType ? config.getPageType() : 'other';
    if (pageType !== 'watch') {
      startContentPolling();
    }

    // Call site's onContentReady hook if provided
    if (config.onContentReady) {
      config.onContentReady();
    }

    console.log('[Vilify] Initialized');
  });
}

/**
 * Wait for page content to be ready.
 */
function waitForContent(config, timeout = 5000) {
  return new Promise((resolve) => {
    const start = Date.now();

    const check = () => {
      const pageType = config.getPageType ? config.getPageType() : 'other';

      let ready = false;
      if (pageType === 'watch') {
        ready = !!document.querySelector('video.html5-main-video');
      } else {
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

function getState() {
  return state;
}

function setState(newState) {
  state = newState;
  render();
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Main render function.
 */
function render() {
  if (!state || !currentConfig) return;

  const pageType = currentConfig.getPageType ? currentConfig.getPageType() : 'other';

  // Ensure focus mode container exists
  let container = document.getElementById('vilify-content');
  if (!container) {
    renderFocusMode(currentConfig, state);
    container = document.getElementById('vilify-content');
  }

  // Update status bar (mode badge, input visibility)
  // Focus input when entering filter, command, or drawer mode
  const isSiteDrawer = state.drawerState !== null && 
                       state.drawerState !== 'palette' && 
                       state.drawerState !== 'filter';
  const shouldFocusInput = state.drawerState === 'filter' || 
                           state.drawerState === 'palette' || 
                           state.localFilterActive ||
                           isSiteDrawer;
  
  // Get drawer placeholder if site drawer is open
  let drawerPlaceholder = null;
  if (isSiteDrawer && currentConfig.getDrawerHandler) {
    const handler = currentConfig.getDrawerHandler(state.drawerState);
    if (handler?.getFilterPlaceholder) {
      drawerPlaceholder = handler.getFilterPlaceholder();
    }
  }
  
  updateStatusBar(state, shouldFocusInput, drawerPlaceholder);

  // Render content based on page type and layout config
  if (currentConfig.layouts && currentConfig.layouts[pageType]) {
    const layout = currentConfig.layouts[pageType];

    if (typeof layout === 'function') {
      layout(state, siteState, container);
    } else if (layout === 'listing') {
      const items = currentConfig.getItems ? currentConfig.getItems() : [];

      // Apply local filter if active (matches title or channel/meta)
      const filtered = state.localFilterActive
        ? items.filter((i) => {
            const q = state.localFilterQuery.toLowerCase();
            return i.title?.toLowerCase().includes(q) || i.meta?.toLowerCase().includes(q);
          })
        : items;

      renderListing(filtered, state.selectedIdx, container);
    }
  }

  // Handle palette rendering
  if (state.drawerState === 'palette') {
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
            state = { ...state, drawerState: 'filter' };
            render();
          },
          openSearch: () => {
            const searchInput = document.querySelector('input#search');
            if (searchInput) searchInput.focus();
          },
          exitFocusMode: () => {
            state.focusModeActive = false;
            removeFocusMode();
            document.body.classList.remove('vilify-watch-page');
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

  // Handle site-specific drawer rendering (description, chapters, etc.)
  // isSiteDrawer already declared above for status bar
  // Only render drawer when drawer state changes (avoid resetting scroll/selection)
  if (isSiteDrawer) {
    if (state.drawerState !== lastRenderedDrawer) {
      const handler = currentConfig.getDrawerHandler ? 
                      currentConfig.getDrawerHandler(state.drawerState) : null;
      renderDrawer(state.drawerState, handler);
      lastRenderedDrawer = state.drawerState;
    }
  } else if (state.drawerState !== 'filter') {
    // Close any open site drawer when switching to palette or closing
    if (lastRenderedDrawer !== null) {
      closeDrawer();
      lastRenderedDrawer = null;
    }
  }

  // Handle filter drawer rendering
  if (state.drawerState === 'filter') {
    const items = currentConfig.getItems ? currentConfig.getItems() : [];
    renderFilterDrawer(items, 
      (query) => { /* filter change handled internally */ },
      (item) => {
        // Navigate to selected item
        if (item?.url) {
          state = { ...state, drawerState: null };
          navigateTo(item.url);
        }
      }
    );
    showFilterDrawer();
  } else {
    hideFilterDrawer();
  }
}

// =============================================================================
// INPUT HANDLERS (for status bar input)
// =============================================================================

function handleFilterChange(value) {
  state.localFilterQuery = value;
  
  // If filter drawer is open, update it
  if (state.drawerState === 'filter') {
    updateFilterQuery(value);
  } else {
    render();
  }
}

function handleFilterSubmit(value, shiftKey) {
  // If filter drawer is open, select from drawer
  if (state.drawerState === 'filter') {
    selectFilterItem();
    return;
  }
  
  // Otherwise select from main list
  const items = currentConfig.getItems ? currentConfig.getItems() : [];
  const filtered = items.filter((i) => i.title?.toLowerCase().includes(value.toLowerCase()));
  const item = filtered[state.selectedIdx];

  if (item?.url) {
    if (shiftKey) {
      openInNewTab(item.url);
    } else {
      navigateTo(item.url);
    }
  }
}

function handleFilterNavigate(direction) {
  // If filter drawer is open, navigate within it
  if (state.drawerState === 'filter') {
    navigateFilterSelection(direction);
  }
}

// =============================================================================
// DRAWER INPUT HANDLERS (for site-specific drawers like chapters)
// =============================================================================

function handleDrawerChange(value, mode) {
  // Update the active drawer's filter query
  if (!state.drawerState || state.drawerState === 'palette' || state.drawerState === 'filter') {
    return;
  }
  
  const handler = currentConfig.getDrawerHandler ? 
                  currentConfig.getDrawerHandler(state.drawerState) : null;
  
  if (handler?.updateQuery) {
    handler.updateQuery(value);
  }
}

function handleDrawerSubmit(value, shiftKey, mode) {
  // Trigger selection in the active drawer via keyboard handler
  if (!state.drawerState || state.drawerState === 'palette' || state.drawerState === 'filter') {
    return;
  }
  
  const handler = currentConfig.getDrawerHandler ? 
                  currentConfig.getDrawerHandler(state.drawerState) : null;
  
  if (handler?.onKey) {
    const result = handler.onKey('Enter', state);
    if (result.handled) {
      state = result.newState;
      render();
    }
  }
}

function handleDrawerNavigate(direction, mode) {
  // Navigate in the active drawer
  if (!state.drawerState || state.drawerState === 'palette' || state.drawerState === 'filter') {
    return;
  }
  
  const handler = currentConfig.getDrawerHandler ? 
                  currentConfig.getDrawerHandler(state.drawerState) : null;
  
  if (handler?.onKey) {
    const key = direction === 'down' ? 'ArrowDown' : 'ArrowUp';
    const result = handler.onKey(key, state);
    if (result.handled) {
      state = result.newState;
      // Don't need full render, just navigation
    }
  }
}

function handleSearchChange(value) {
  state.siteSearchQuery = value;
}

function handleSearchSubmit(value) {
  if (value.trim()) {
    navigateTo('/results?search_query=' + encodeURIComponent(value.trim()));
  }
}

function handleCommandChange(value) {
  state.paletteQuery = value;
  state.paletteSelectedIdx = 0;
  render();
}

function handleCommandSubmit(value, shiftKey) {
  // Check for :q exit command explicitly (like userscript)
  if (value.trim().toLowerCase() === ':q') {
    // Full cleanup like userscript exitFocusMode()
    state = closePalette(state);
    state.focusModeActive = false;
    
    // Stop content polling
    stopContentPolling();
    
    // Remove focus mode overlay and all classes
    removeFocusMode();
    document.body.classList.remove('vilify-watch-page', 'vilify-loading');
    
    // Remove loading overlay if present
    hideLoadingScreen();
    
    // Remove any modal drawers
    const modals = document.querySelectorAll(
      '.vilify-filter-drawer, .vilify-chapter-drawer, .vilify-description-drawer, ' +
      '#vilify-loading-overlay, .vilify-overlay'
    );
    modals.forEach(m => m.remove());
    
    showMessage('Focus mode off (refresh to re-enable)');
    return;
  }

  // Execute selected command
  const commands = currentConfig.getCommands
    ? currentConfig.getCommands({ state, siteState, navigateTo, copyToClipboard })
    : [];

  const query = value.startsWith(':') ? value.slice(1) : value;
  const filtered = filterItems(commands, query);
  const actionable = filtered.filter((c) => !c.group);
  const item = actionable[state.paletteSelectedIdx];

  if (item?.action) {
    state = closePalette(state);
    state.localFilterActive = false;
    item.action();
    render();
  }
}

function handleCommandNavigate(direction) {
  const commands = currentConfig.getCommands
    ? currentConfig.getCommands({ state, siteState, navigateTo, copyToClipboard })
    : [];

  const query = state.paletteQuery.startsWith(':') ? state.paletteQuery.slice(1) : state.paletteQuery;
  const filtered = filterItems(commands, query);
  const actionable = filtered.filter((c) => !c.group);
  const count = actionable.length;

  if (count === 0) return;

  // Don't wrap at boundaries - flash instead
  if (direction === 'down') {
    if (state.paletteSelectedIdx >= count - 1) {
      flashBoundary();
      return;
    }
    state.paletteSelectedIdx = state.paletteSelectedIdx + 1;
  } else {
    if (state.paletteSelectedIdx <= 0) {
      flashBoundary();
      return;
    }
    state.paletteSelectedIdx = state.paletteSelectedIdx - 1;
  }

  render();
}

function handleInputEscape() {
  // Close any open modal
  if (state.drawerState === 'palette') {
    state = closePalette(state);
  } else if (state.drawerState === 'filter') {
    state = { ...state, drawerState: null };
  }
  state.localFilterActive = false;
  state.localFilterQuery = '';
  state.siteSearchActive = false;
  state.siteSearchQuery = '';
  render();
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

function handleListNavigation(direction) {
  const items = currentConfig.getItems ? currentConfig.getItems() : [];
  
  // Apply filter if active (matches title or channel/meta)
  const filtered = state.localFilterActive
    ? items.filter((i) => {
        const q = state.localFilterQuery.toLowerCase();
        return i.title?.toLowerCase().includes(q) || i.meta?.toLowerCase().includes(q);
      })
    : items;

  const result = navigateList(direction, state.selectedIdx, filtered.length);

  state.selectedIdx = result.index;

  if (result.boundary) {
    flashBoundary();
  }

  render();
}

function handleSelect(shiftKey) {
  if (state.drawerState === 'palette') {
    handleCommandSubmit(state.paletteQuery, shiftKey);
  } else {
    const items = currentConfig.getItems ? currentConfig.getItems() : [];
    
    // Apply filter if active (matches title or channel/meta)
    const filtered = state.localFilterActive
      ? items.filter((i) => {
          const q = state.localFilterQuery.toLowerCase();
          return i.title?.toLowerCase().includes(q) || i.meta?.toLowerCase().includes(q);
        })
      : items;

    const item = filtered[state.selectedIdx];

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
 * Handle key events for site-specific drawers
 * Delegates to the drawer handler from site config
 */
function handleSiteDrawerKey(key) {
  if (!state.drawerState) return false;
  if (state.drawerState === 'palette' || state.drawerState === 'filter') return false;
  
  const handler = currentConfig.getDrawerHandler ? 
                  currentConfig.getDrawerHandler(state.drawerState) : null;
  
  if (!handler) return false;
  
  const result = handleDrawerKey(key, state, handler);
  
  if (result.handled) {
    const drawerClosed = result.newState.drawerState === null;
    state = result.newState;
    // Only full render when drawer closes - drawer handles its own internal updates
    if (drawerClosed) {
      render();
    }
    return true;
  }
  
  return false;
}

function handleEscape() {
  if (state.drawerState === 'palette') {
    state = closePalette(state);
    render();
  } else if (state.drawerState !== null) {
    // Close any open drawer (site-specific drawers)
    closeDrawer();
    state = { ...state, drawerState: null };
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

function handleNavigation(oldUrl, newUrl) {
  console.log('[Vilify] Navigation:', oldUrl, '->', newUrl);

  // Show loading screen immediately
  showLoadingScreen(currentConfig);

  // Stop any existing content polling
  stopContentPolling();

  state.selectedIdx = 0;
  state.localFilterQuery = '';
  state.localFilterActive = false;
  state.drawerState = null;
  state.lastUrl = newUrl;
  lastRenderedDrawer = null;

  // Reset site-specific state if needed
  if (currentConfig.createSiteState) {
    siteState = currentConfig.createSiteState();
  }

  // Remove watch page class if leaving watch page
  document.body.classList.remove('vilify-watch-page');

  waitForContent(currentConfig).then(() => {
    render();
    
    // Hide loading screen after content ready
    hideLoadingScreen();
    
    // Start content polling for listing pages
    const pageType = currentConfig.getPageType ? currentConfig.getPageType() : 'other';
    if (pageType !== 'watch') {
      startContentPolling();
    }
  });
}

function handleNextCommentPage() {
  if (currentConfig.watch?.nextCommentPage && siteState) {
    siteState = currentConfig.watch.nextCommentPage(siteState);
    // Don't call render() - nextCommentPage already updates the UI directly
    // Calling render() would re-render the entire watch page and reset comments
  }
}

function handlePrevCommentPage() {
  if (currentConfig.watch?.prevCommentPage && siteState) {
    siteState = currentConfig.watch.prevCommentPage(siteState);
    // Don't call render() - prevCommentPage already updates the UI directly
    // Calling render() would re-render the entire watch page and reset comments
  }
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

export { createAppState, getMode } from './state.js';
export { el, clear, showMessage } from './view.js';
export { copyToClipboard, navigateTo, openInNewTab } from './actions.js';
