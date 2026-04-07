// YouTube transcript fetching - InnerTube API approach via data-bridge
// Sends command to data-bridge.ts (running in MAIN world) which has access to
// ytInitialData and ytcfg, calls /youtubei/v1/get_transcript, and returns parsed lines.

import type { TranscriptSegment } from '../../types';
import { formatTimestamp } from './format';

/** A single transcript line as returned from the bridge */
interface TranscriptLine {
  time: number;
  timeText: string;
  duration: number;
  text: string;
}

/** Result of fetchTranscript — stored in site state */
interface TranscriptFetchResult {
  status: 'loaded' | 'unavailable';
  videoId: string;
  lines: TranscriptLine[];
  language: string | null;
}

/** @deprecated Use formatTimestamp from ./format directly */
export { formatTimestamp as formatTime } from './format';

/**
 * Send a command to the data-bridge (MAIN world) and wait for response.
 * Follows the same pattern used by addToWatchLater, removeFromWatchLater, etc.
 * 
 * @param {string} command - Command name
 * @param {Object} data - Command data
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<any>} Bridge response result
 */
function sendBridgeCommand(command: string, data: any, timeout: number = 10000): Promise<any> {
  return new Promise((resolve) => {
    const requestId = `transcript_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const responseHandler = (event: Event) => {
      const { requestId: respId, result } = (event as CustomEvent).detail || {};
      if (respId === requestId) {
        document.removeEventListener('__vilify_response__', responseHandler);
        resolve(result);
      }
    };
    
    document.addEventListener('__vilify_response__', responseHandler);
    
    document.dispatchEvent(new CustomEvent('__vilify_command__', {
      detail: { command, data, requestId }
    }));
    
    // Timeout fallback
    setTimeout(() => {
      document.removeEventListener('__vilify_response__', responseHandler);
      resolve(null);
    }, timeout);
  });
}

/**
 * Fetch transcript via data-bridge InnerTube API call.
 * The bridge extracts transcript params from ytInitialData engagement panels
 * and calls /youtubei/v1/get_transcript directly.
 * 
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<TranscriptFetchResult>}
 */
export async function fetchTranscript(videoId: string): Promise<TranscriptFetchResult> {
  try {
    console.log('[Vilify] Fetching transcript for', videoId);
    
    const result = await sendBridgeCommand('fetchTranscript', { videoId });
    
    if (!result) {
      console.log('[Vilify] No response from bridge for transcript');
      return { status: 'unavailable', videoId, lines: [], language: null };
    }
    
    if (result.status === 'loaded' && result.lines?.length > 0) {
      console.log('[Vilify] Transcript loaded:', result.lines.length, 'lines');
      return {
        status: 'loaded',
        videoId: result.videoId || videoId,
        lines: result.lines,
        language: result.language || null,
      };
    }
    
    console.log('[Vilify] Transcript unavailable:', result.status);
    return { status: 'unavailable', videoId, lines: [], language: null };
  } catch (e) {
    console.error('[Vilify] Error fetching transcript:', e);
    return { status: 'unavailable', videoId, lines: [], language: null };
  }
}
