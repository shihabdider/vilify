// YouTube drawer exports

import { getChapterDrawer, resetChapterDrawer } from './chapters.js';
import { getDescriptionDrawer, resetDescriptionDrawer } from './description.js';

// Re-export for external use
export { getChapterDrawer, resetChapterDrawer, getDescriptionDrawer, resetDescriptionDrawer };

/**
 * Get drawer handler for the given drawer state.
 * Returns null for unknown drawer states.
 * [PURE]
 *
 * @param {string} drawerState - Current drawer state
 * @returns {DrawerHandler|null}
 */
export function getYouTubeDrawerHandler(drawerState) {
  if (drawerState === 'chapters') {
    return getChapterDrawer();
  }
  
  if (drawerState === 'description') {
    return getDescriptionDrawer();
  }
  
  return null;
}

/**
 * Reset all YouTube drawers (call on navigation)
 */
export function resetYouTubeDrawers() {
  resetChapterDrawer();
  resetDescriptionDrawer();
}
