// YouTube transcript drawer
// Uses core's createListDrawer factory

import { createListDrawer } from '../../../core/drawer';
import { el, showMessage } from '../../../core/view';
import { seekToChapter } from '../player';

/**
 * Create transcript drawer for YouTube watch page.
 * @param {TranscriptResult} transcript - Transcript data
 * @returns {DrawerHandler}
 */
export function createTranscriptDrawer(transcript) {
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

/** @type {DrawerHandler|null} Cached drawer instance */
let transcriptDrawer = null;

/** @type {TranscriptResult|null} Cached transcript data */
let cachedTranscript = null;

/**
 * Get or create the transcript drawer handler.
 * @param {TranscriptResult} transcript - Transcript data
 * @returns {DrawerHandler}
 */
export function getTranscriptDrawer(transcript) {
  // Recreate if transcript changed
  if (!transcriptDrawer || transcript !== cachedTranscript) {
    if (transcriptDrawer?.cleanup) {
      transcriptDrawer.cleanup();
    }
    transcriptDrawer = createTranscriptDrawer(transcript);
    cachedTranscript = transcript;
  }
  return transcriptDrawer;
}

/**
 * Reset the cached drawer
 */
export function resetTranscriptDrawer() {
  if (transcriptDrawer?.cleanup) {
    transcriptDrawer.cleanup();
  }
  transcriptDrawer = null;
  cachedTranscript = null;
}
