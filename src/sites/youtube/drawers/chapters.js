// YouTube chapter drawer
// Uses core's createListDrawer factory

import { createListDrawer } from '../../../core/drawer.js';
import { el } from '../../../core/view.js';
import { getChapters } from '../scraper.js';
import { seekToChapter } from '../player.js';
import { showMessage } from '../../../core/view.js';

/**
 * Create chapter picker drawer for YouTube watch page.
 * Uses core's createListDrawer with YouTube-specific configuration.
 * [PURE] (returns handler)
 *
 * @returns {DrawerHandler}
 */
export function createChapterDrawer() {
  return createListDrawer({
    id: 'chapters',
    
    getItems: () => getChapters(),
    
    renderItem: (chapter, isSelected) => {
      const itemEl = el('div', {}, [
        el('span', { 
          class: 'vilify-chapter-time',
          style: 'color: var(--accent); font-family: var(--font-mono); font-size: 12px; min-width: 50px;'
        }, [chapter.timeText || '0:00']),
        el('span', { 
          class: 'vilify-chapter-title',
          style: `color: ${isSelected ? 'var(--txt-1)' : 'var(--txt-2)'}; font-size: 13px; flex: 1;`
        }, [chapter.title || 'Untitled']),
      ]);
      return itemEl;
    },
    
    onSelect: (chapter) => {
      seekToChapter(chapter);
      showMessage(`Jumped to: ${chapter.title}`);
    },
    
    filterPlaceholder: 'Filter chapters...',
    
    matchesFilter: (chapter, query) => 
      chapter.title?.toLowerCase().includes(query.toLowerCase())
  });
}

/** @type {DrawerHandler|null} Cached drawer instance */
let chapterDrawer = null;

/**
 * Get or create the chapter drawer handler.
 * Caches the handler for reuse.
 * @returns {DrawerHandler}
 */
export function getChapterDrawer() {
  if (!chapterDrawer) {
    chapterDrawer = createChapterDrawer();
  }
  return chapterDrawer;
}

/**
 * Reset the cached drawer (call when navigating away from watch page)
 */
export function resetChapterDrawer() {
  if (chapterDrawer && chapterDrawer.cleanup) {
    chapterDrawer.cleanup();
  }
  chapterDrawer = null;
}
