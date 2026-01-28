// Core module exports
// TODO: Export all core functionality

export { createAppState, resetState, getMode, createYouTubeState } from './state.js';
export { initKeyboard, handleKey } from './keyboard.js';
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
export { renderLayout } from './layout.js';
export { showLoading, hideLoading } from './loading.js';
export { observeNavigation } from './navigation.js';
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
