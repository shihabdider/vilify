// YouTube description drawer
// Uses core's createContentDrawer factory

import { createContentDrawer } from '../../../core/drawer';
import { getDescription } from '../scraper';

/**
 * Create description drawer for YouTube watch page.
 * Uses core's createContentDrawer with YouTube-specific configuration.
 * [PURE] (returns handler)
 *
 * @returns {DrawerHandler}
 */
export function createDescriptionDrawer() {
  return createContentDrawer({
    id: 'description',
    getContent: () => getDescription(),
    emptyMessage: 'No description available'
  });
}

/** @type {DrawerHandler|null} Cached drawer instance */
let descriptionDrawer = null;

/**
 * Get or create the description drawer handler.
 * Caches the handler for reuse.
 * @returns {DrawerHandler}
 */
export function getDescriptionDrawer() {
  if (!descriptionDrawer) {
    descriptionDrawer = createDescriptionDrawer();
  }
  return descriptionDrawer;
}

/**
 * Reset the cached drawer (call when navigating away from watch page)
 */
export function resetDescriptionDrawer() {
  if (descriptionDrawer && descriptionDrawer.cleanup) {
    descriptionDrawer.cleanup();
  }
  descriptionDrawer = null;
}
