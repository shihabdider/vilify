// YouTube transcript fetching

/**
 * Format seconds to timestamp string
 * @param {number} seconds - Time in seconds  
 * @returns {string} Formatted like '0:45' or '1:02:05'
 */
export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Decode HTML entities in text
 * @param {string} text - Text with HTML entities
 * @returns {string} Decoded text
 */
export function decodeHtmlEntities(text) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

/**
 * Parse YouTube transcript XML into lines
 * @param {string} xmlText - XML string from caption track
 * @returns {Array<TranscriptLine>}
 */
export function parseTranscriptXml(xmlText) {
  const lines = [];
  // Match <text start="0" dur="2.5">content</text>
  // Also handle <text start="0" dur="2.5"/> (self-closing)
  const regex = /<text[^>]*start="([^"]*)"[^>]*dur="([^"]*)"[^>]*>([^<]*)<\/text>/g;
  let match;
  
  while ((match = regex.exec(xmlText)) !== null) {
    const time = parseFloat(match[1]);
    const text = decodeHtmlEntities(match[3]).trim();
    if (text) {  // Skip empty lines
      lines.push({
        time,
        timeText: formatTime(time),
        duration: parseFloat(match[2]),
        text
      });
    }
  }
  
  return lines;
}

/**
 * Get caption tracks from ytInitialPlayerResponse
 * @returns {Array<{baseUrl: string, languageCode: string}>|null}
 */
function getCaptionTracks() {
  try {
    // Try to get from window.ytInitialPlayerResponse
    const playerResponse = window.ytInitialPlayerResponse;
    if (playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
      return playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
    }
    
    // Fallback: try to find in page scripts
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent || '';
      if (text.includes('captionTracks')) {
        const match = text.match(/"captionTracks":\s*(\[[\s\S]*?\])/);
        if (match) {
          try {
            return JSON.parse(match[1]);
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    console.error('[Vilify] Error getting caption tracks:', e);
  }
  return null;
}

/**
 * Fetch transcript for current video
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<TranscriptResult>}
 */
export async function fetchTranscript(videoId) {
  try {
    const captionTracks = getCaptionTracks();
    
    if (!captionTracks || captionTracks.length === 0) {
      return { status: 'unavailable', lines: [], language: null };
    }
    
    // Get first track (usually default language)
    const track = captionTracks[0];
    const response = await fetch(track.baseUrl);
    const xmlText = await response.text();
    
    const lines = parseTranscriptXml(xmlText);
    
    if (lines.length === 0) {
      return { status: 'unavailable', lines: [], language: null };
    }
    
    return { 
      status: 'loaded', 
      lines, 
      language: track.languageCode || track.vssId?.replace('.', '') || 'en' 
    };
  } catch (e) {
    console.error('[Vilify] Error fetching transcript:', e);
    return { status: 'unavailable', lines: [], language: null };
  }
}
