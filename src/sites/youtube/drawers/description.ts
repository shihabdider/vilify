// YouTube description drawer
// Uses core's createContentDrawer factory

import { createContentDrawer } from '../../../core/drawer';
import { getDescription } from '../scraper';
import type { DrawerHandler } from '../../../types';

/**
 * Create description drawer for YouTube watch page.
 * Uses core's createContentDrawer with YouTube-specific configuration.
 * [PURE] (returns handler)
 *
 * @returns {DrawerHandler}
 */
export function createDescriptionDrawer(): DrawerHandler {
  return createContentDrawer({
    id: 'description',
    getContent: () => getDescription(),
    emptyMessage: 'No description available'
  });
}

let descriptionDrawer: DrawerHandler | null = null;

/**
 * Get or create the description drawer handler.
 * Caches the handler for reuse.
 * @returns {DrawerHandler}
 */
export function getDescriptionDrawer(): DrawerHandler | null {
  if (!descriptionDrawer) {
    descriptionDrawer = createDescriptionDrawer();
  }
  return descriptionDrawer;
}

/**
 * Reset the cached drawer (call when navigating away from watch page)
 */
export function resetDescriptionDrawer(): void {
  if (descriptionDrawer && descriptionDrawer.cleanup) {
    descriptionDrawer.cleanup();
  }
  descriptionDrawer = null;
}
