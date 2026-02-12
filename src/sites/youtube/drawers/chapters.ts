// YouTube chapter drawer
// Uses core's createListDrawer factory

import { createListDrawer } from '../../../core/drawer';
import { el, showMessage } from '../../../core/view';
import { seekToChapter } from '../player';
import type { ChaptersResult, DrawerHandler, Chapter } from '../../../types';

/**
 * Create chapter picker drawer for YouTube watch page.
 * Uses core's createListDrawer with YouTube-specific configuration.
 * [PURE] (returns handler)
 *
 * @param {ChaptersResult} chaptersResult - Chapters data from state
 * @returns {DrawerHandler}
 */
export function createChapterDrawer(chaptersResult: ChaptersResult): DrawerHandler {
  return createListDrawer({
    id: 'chapters',
    
    getItems: () => chaptersResult.chapters,
    
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

let chapterDrawer: DrawerHandler | null = null;

let cachedChapters: ChaptersResult | null = null;

/**
 * Get or create the chapter drawer handler.
 * Recreates if chapters data changed.
 * @param {ChaptersResult} chaptersResult - Chapters data from state
 * @returns {DrawerHandler}
 */
export function getChapterDrawer(chaptersResult: ChaptersResult): DrawerHandler | null {
  // Recreate if chapters changed
  if (!chapterDrawer || chaptersResult !== cachedChapters) {
    if (chapterDrawer?.cleanup) {
      chapterDrawer.cleanup();
    }
    chapterDrawer = createChapterDrawer(chaptersResult);
    cachedChapters = chaptersResult;
  }
  return chapterDrawer;
}

/**
 * Reset the cached drawer (call when navigating away from watch page)
 */
export function resetChapterDrawer(): void {
  if (chapterDrawer?.cleanup) {
    chapterDrawer.cleanup();
  }
  chapterDrawer = null;
  cachedChapters = null;
}
