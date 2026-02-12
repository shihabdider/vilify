// YouTube transcript drawer
// Uses core's createListDrawer factory + createCachedDrawer for instance caching

import { createListDrawer, createCachedDrawer } from '../../../core/drawer';
import { el, showMessage } from '../../../core/view';
import { seekToChapter } from '../player';
import type { TranscriptResult, DrawerHandler } from '../../../types';

/**
 * Create transcript drawer for YouTube watch page.
 * @param {TranscriptResult} transcript - Transcript data
 * @returns {DrawerHandler}
 */
export function createTranscriptDrawer(transcript: TranscriptResult): DrawerHandler {
  return createListDrawer({
    id: 'transcript',
    
    getItems: () => transcript.lines,
    
    renderItem: (line, isSelected) => {
      return el('div', {}, [
        el('span', { 
          class: 'vilify-transcript-time',
          style: 'color: var(--accent); font-family: var(--font-mono); font-size: 12px; min-width: 55px;'
        }, [line.timeText]),
        el('span', { 
          class: 'vilify-transcript-text',
          style: `color: ${isSelected ? 'var(--txt-1)' : 'var(--txt-2)'}; font-size: 13px; flex: 1;`
        }, [line.text]),
      ]);
    },
    
    onSelect: (line) => {
      seekToChapter(line);  // Reuse - both have .time field
      showMessage(`Jumped to ${line.timeText}`);
    },
    
    filterPlaceholder: 'Filter transcript...',
    
    matchesFilter: (line, query) => 
      line.text.toLowerCase().includes(query.toLowerCase())
  });
}

const cached = createCachedDrawer(createTranscriptDrawer);

/**
 * Get or create the transcript drawer handler.
 */
export function getTranscriptDrawer(transcript: TranscriptResult): DrawerHandler {
  return cached.get(transcript);
}

/**
 * Reset the cached drawer
 */
export function resetTranscriptDrawer(): void {
  cached.reset();
}
