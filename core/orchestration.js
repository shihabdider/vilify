/**
 * Core Orchestration
 * 
 * Entry point and SPA navigation handling.
 */

import { createAppState, getMode } from './state.js';
import { initKeyboard, bind, unbindAll } from './keyboard.js';
import { renderFocusMode, toggleFocusMode, applyTheme, renderListing, getContentContainer } from './layout.js';
import { renderStatusBar, updateMode } from './status-bar.js';
import { navigateList, scrollHalfPage } from './navigation.js';
import { updateListSelection, flashBoundary } from './dom.js';

/** Global application state */
let appState = null;

/** Current site config */
let currentConfig = null;

/** Site-specific state */
let siteState = null;

/**
 * [I/O] Entry point — initialize focus mode, keyboard, navigation observer.
 *
 * Examples:
 *   initSite(youtubeConfig)
 *   // Sets up everything for the site
 */
export function initSite(siteConfig) {
  currentConfig = siteConfig;
  appState = createAppState();
  appState.lastUrl = window.location.href;
  
  // Initialize site-specific state if the site has a createState function
  if (siteConfig.createSiteState) {
    siteState = siteConfig.createSiteState();
  }
  
  // Render initial focus mode (hidden)
  renderFocusMode(siteConfig, appState);
  
  // Set up core keyboard bindings
  setupCoreBindings(siteConfig);
  
  // Set up navigation observer
  setupNavigationObserver((oldUrl, newUrl) => {
    onNavigate(oldUrl, newUrl, siteConfig, appState);
  });
  
  console.log('[Vilify] Initialized for', siteConfig.name);
}

/**
 * Set up core keyboard bindings (focus mode toggle, navigation, etc.)
 */
function setupCoreBindings(siteConfig) {
  // Toggle focus mode with Escape
  bind('escape', () => {
    appState.focusModeActive = !appState.focusModeActive;
    toggleFocusMode(appState.focusModeActive);
    
    if (appState.focusModeActive) {
      refreshContent(siteConfig);
    }
  });
  
  // Vim-style navigation
  bind('j', () => handleNavigation('down', siteConfig));
  bind('k', () => handleNavigation('up', siteConfig));
  bind('g g', () => handleNavigation('top', siteConfig));
  bind('shift+g', () => handleNavigation('bottom', siteConfig));
  
  // Half-page scroll
  bind('ctrl+d', () => handleHalfPage('down', siteConfig));
  bind('ctrl+u', () => handleHalfPage('up', siteConfig));
  
  // Enter to select
  bind('enter', () => handleSelect(siteConfig, false));
  bind('shift+enter', () => handleSelect(siteConfig, true));
  
  // Site-specific bindings
  if (siteConfig.getKeySequences) {
    const ctx = getContext(siteConfig);
    const sequences = siteConfig.getKeySequences(ctx);
    
    for (const [keys, callback] of Object.entries(sequences)) {
      bind(keys, callback);
    }
  }
}

/**
 * Handle j/k/gg/G navigation
 */
function handleNavigation(direction, siteConfig) {
  if (!appState.focusModeActive) return;
  
  const items = getItems(siteConfig);
  const { index, boundary } = navigateList(direction, appState.selectedIdx, items.length);
  
  if (boundary) {
    // At boundary - could load more or flash
    if (boundary === 'bottom' && siteConfig.onLoadMore) {
      siteConfig.onLoadMore();
    } else {
      flashBoundary();
    }
  }
  
  appState.selectedIdx = index;
  updateSelection(siteConfig);
}

/**
 * Handle Ctrl+d/u half-page navigation
 */
function handleHalfPage(direction, siteConfig) {
  if (!appState.focusModeActive) return;
  
  const items = getItems(siteConfig);
  const visibleCount = 10; // Approximate visible items
  
  appState.selectedIdx = scrollHalfPage(direction, appState.selectedIdx, items.length, visibleCount);
  updateSelection(siteConfig);
}

/**
 * Handle Enter to select item
 */
function handleSelect(siteConfig, newTab) {
  if (!appState.focusModeActive) return;
  
  const items = getItems(siteConfig);
  const item = items[appState.selectedIdx];
  
  if (!item) return;
  
  if (item.url) {
    if (newTab) {
      window.open(item.url, '_blank');
    } else {
      window.location.href = item.url;
    }
  } else if (item.action) {
    item.action();
  }
}

/**
 * Update visual selection
 */
function updateSelection(siteConfig) {
  const content = getContentContainer();
  if (!content) return;
  
  updateListSelection(content, '.vilify-item', appState.selectedIdx);
}

/**
 * Get items for current page
 */
function getItems(siteConfig) {
  if (!siteConfig.getItems) return [];
  
  try {
    return siteConfig.getItems();
  } catch (e) {
    console.error('[Vilify] Failed to get items:', e);
    return [];
  }
}

/**
 * Get context for current page (e.g., VideoContext for YouTube watch page)
 */
function getContext(siteConfig) {
  if (!siteConfig.getContext) return null;
  
  try {
    return siteConfig.getContext();
  } catch (e) {
    return null;
  }
}

/**
 * Refresh content for current page
 */
function refreshContent(siteConfig) {
  const pageType = siteConfig.getPageType ? siteConfig.getPageType() : 'default';
  const layout = siteConfig.layouts ? siteConfig.layouts[pageType] : 'listing';
  
  if (typeof layout === 'function') {
    // Custom layout renderer
    const ctx = getContext(siteConfig);
    const container = getContentContainer();
    layout(ctx, container);
  } else {
    // Built-in listing layout
    const items = getItems(siteConfig);
    renderListing(items, appState.selectedIdx, siteConfig.renderItem);
  }
  
  // Update mode
  updateMode(getMode(appState));
}

/**
 * [I/O] Handle SPA navigation — reset state, re-render for new page type.
 *
 * Examples:
 *   onNavigate('https://youtube.com/', 'https://youtube.com/watch?v=abc')
 *   // Detects change, updates UI for watch page
 */
export function onNavigate(oldUrl, newUrl, siteConfig, state) {
  console.log('[Vilify] Navigation:', oldUrl, '->', newUrl);
  
  // Reset selection
  appState.selectedIdx = 0;
  appState.lastUrl = newUrl;
  
  // Refresh content if focus mode is active
  if (appState.focusModeActive) {
    // Small delay to let SPA content load
    setTimeout(() => refreshContent(siteConfig), 500);
  }
}

/**
 * [I/O] Watch for SPA URL changes, call callback on change.
 *
 * Examples:
 *   setupNavigationObserver((oldUrl, newUrl) => onNavigate(oldUrl, newUrl))
 */
export function setupNavigationObserver(callback) {
  let lastUrl = window.location.href;
  
  // Override pushState
  const originalPushState = history.pushState;
  history.pushState = function(...args) {
    const result = originalPushState.apply(this, args);
    const newUrl = window.location.href;
    if (newUrl !== lastUrl) {
      callback(lastUrl, newUrl);
      lastUrl = newUrl;
    }
    return result;
  };
  
  // Override replaceState
  const originalReplaceState = history.replaceState;
  history.replaceState = function(...args) {
    const result = originalReplaceState.apply(this, args);
    const newUrl = window.location.href;
    if (newUrl !== lastUrl) {
      callback(lastUrl, newUrl);
      lastUrl = newUrl;
    }
    return result;
  };
  
  // Listen for popstate (back/forward)
  window.addEventListener('popstate', () => {
    const newUrl = window.location.href;
    if (newUrl !== lastUrl) {
      callback(lastUrl, newUrl);
      lastUrl = newUrl;
    }
  });
}

/**
 * Get current application state (for debugging)
 */
export function getAppState() {
  return appState;
}

/**
 * Get current site state (for debugging)
 */
export function getSiteState() {
  return siteState;
}
