// YouTube drawer exports

import { getChapterDrawer, resetChapterDrawer } from './chapters.js';
import { getDescriptionDrawer, resetDescriptionDrawer } from './description.js';
import { getTranscriptDrawer, resetTranscriptDrawer } from './transcript.js';

// Re-export for external use
export { getChapterDrawer, resetChapterDrawer, getDescriptionDrawer, resetDescriptionDrawer, getTranscriptDrawer, resetTranscriptDrawer };

/**
 * Get drawer handler for the given drawer state.
 * Returns null for unknown drawer states or when data is not loaded.
 * [PURE]
 *
 * @param {string} drawerState - Current drawer state
 * @param {YouTubeState|null} siteState - Site-specific state (for transcript/chapters)
 * @returns {DrawerHandler|null}
 */
export function getYouTubeDrawerHandler(drawerState, siteState) {
  if (drawerState === 'chapters') {
    if (siteState?.chapters?.status === 'loaded') {
      return getChapterDrawer(siteState.chapters);
    }
    return null;
  }
  
  if (drawerState === 'description') {
    return getDescriptionDrawer();
  }
  
  if (drawerState === 'transcript') {
    if (siteState?.transcript?.status === 'loaded') {
      return getTranscriptDrawer(siteState.transcript);
    }
    return null;
  }
  
  return null;
}

/**
 * Reset all YouTube drawers (call on navigation)
 */
export function resetYouTubeDrawers() {
  resetChapterDrawer();
  resetDescriptionDrawer();
  resetTranscriptDrawer();
}
