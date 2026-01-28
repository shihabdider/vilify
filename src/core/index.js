// Core module exports
// TODO: Export all core functionality

export { createAppState, resetState, getMode, createYouTubeState } from './state.js';
export { createKeyboardState, handleKeyEvent, setupKeyboardHandler } from './keyboard.js';
export {
  el,
  clear,
  updateListSelection,
  showMessage,
  flashBoundary,
  navigateList,
  scrollHalfPage,
  isInputElement
} from './view.js';
export {
  injectFocusModeStyles,
  applyTheme,
  renderFocusMode,
  renderListing,
  renderDefaultItem,
  updateStatusMessage,
  updateModeBadge,
  removeFocusMode,
  getContentContainer
} from './layout.js';
export {
  injectLoadingStyles,
  showLoadingScreen,
  hideLoadingScreen,
  showLoading,
  hideLoading
} from './loading.js';
export { setupNavigationObserver, observeNavigation } from './navigation.js';
export { openPalette, closePalette } from './palette.js';
export { copyToClipboard, navigate } from './actions.js';

/**
 * Initialize a site with the given configuration
 * @param {Object} siteConfig - Site-specific configuration
 */
export function initSite(siteConfig) {
  // TODO: Implement site initialization
  console.log('[Vilify] Initializing site:', siteConfig.name);
}
