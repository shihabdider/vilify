// YouTube recommended videos drawer
// Uses core's createListDrawer factory

import { createListDrawer } from '../../../core/drawer.js';
import { el } from '../../../core/view.js';

/** @type {Array<ContentItem>} Cached recommended items */
let cachedRecommended = [];

/** @type {DrawerHandler|null} Cached drawer instance */
let recommendedDrawer = null;

/** @type {Array<ContentItem>|null} Items used to create current drawer */
let drawerItems = null;

/**
 * Update the cached recommended items.
 * Call this when page state changes.
 * 
 * @param {Array<ContentItem>} items - Recommended items from state.page.recommended
 */
export function setRecommendedItems(items) {
  cachedRecommended = items || [];
}

/**
 * Create recommended videos drawer for YouTube watch page.
 * Uses core's createListDrawer with YouTube-specific configuration.
 * [PURE] (returns handler)
 *
 * @param {Array<ContentItem>} items - Recommended video items
 * @returns {DrawerHandler}
 */
export function createRecommendedDrawer(items) {
  return createListDrawer({
    id: 'recommended',
    
    getItems: () => items,
    
    renderItem: (item, isSelected) => {
      // Build meta string
      const metaParts = [];
      if (item.meta) metaParts.push(item.meta);
      if (item.data?.duration) metaParts.push(item.data.duration);
      const metaText = metaParts.join(' · ');
      
      const itemEl = el('div', { 
        style: 'display: flex; gap: 10px; align-items: center;'
      }, [
        // Thumbnail
        item.thumbnail ? 
          el('img', { 
            src: item.thumbnail, 
            style: 'width: 80px; height: 45px; object-fit: cover; border-radius: 4px; flex-shrink: 0;'
          }, []) :
          el('div', { 
            style: 'width: 80px; height: 45px; background: var(--bg3); border-radius: 4px; flex-shrink: 0;'
          }, []),
        // Info
        el('div', { style: 'flex: 1; min-width: 0;' }, [
          el('div', { 
            style: `color: ${isSelected ? 'var(--txt-1)' : 'var(--txt-2)'}; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`
          }, [item.title || 'Untitled']),
          metaText ? el('div', { 
            style: 'color: var(--txt-3); font-size: 11px; margin-top: 2px;'
          }, [metaText]) : null
        ].filter(Boolean))
      ]);
      return itemEl;
    },
    
    onSelect: (item) => {
      // Navigate to the video
      if (item.url) {
        window.location.href = item.url;
      }
    },
    
    filterPlaceholder: 'Filter recommended...',
    
    matchesFilter: (item, query) => {
      const q = query.toLowerCase();
      return (
        item.title?.toLowerCase().includes(q) ||
        item.meta?.toLowerCase().includes(q)
      );
    }
  });
}

/**
 * Get or create the recommended drawer handler.
 * Recreates if items changed.
 * @returns {DrawerHandler|null}
 */
export function getRecommendedDrawer() {
  // Return null if no items
  if (!cachedRecommended || cachedRecommended.length === 0) {
    return null;
  }
  
  // Recreate if items changed
  if (!recommendedDrawer || drawerItems !== cachedRecommended) {
    if (recommendedDrawer?.cleanup) {
      recommendedDrawer.cleanup();
    }
    recommendedDrawer = createRecommendedDrawer(cachedRecommended);
    drawerItems = cachedRecommended;
  }
  
  return recommendedDrawer;
}

/**
 * Reset the cached drawer (call when navigating away from watch page)
 */
export function resetRecommendedDrawer() {
  if (recommendedDrawer?.cleanup) {
    recommendedDrawer.cleanup();
  }
  recommendedDrawer = null;
  drawerItems = null;
  cachedRecommended = [];
}
