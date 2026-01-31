// YouTube transcript fetching - DOM scraping approach

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
 * Parse timestamp string to seconds
 * @param {string} timeStr - Time string like '0:45' or '1:02:05'
 * @returns {number} Time in seconds
 */
function parseTimestamp(timeStr) {
  const parts = timeStr.split(':').map(p => parseInt(p, 10));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/**
 * Wait for an element to appear
 * @param {string} selector - CSS selector
 * @param {number} timeout - Max wait time in ms
 * @returns {Promise<Element|null>}
 */
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }
    
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Check if transcript panel is already open
 * @returns {boolean}
 */
function isTranscriptPanelOpen() {
  const panel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]');
  return panel && panel.getAttribute('visibility') === 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED';
}

/**
 * Scrape transcript lines from the DOM
 * @returns {Array<TranscriptLine>}
 */
function scrapeTranscriptFromDOM() {
  const lines = [];
  
  // Find transcript segments in the panel
  const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
  
  for (const segment of segments) {
    // Get timestamp
    const timestampEl = segment.querySelector('.segment-timestamp');
    const textEl = segment.querySelector('.segment-text');
    
    if (timestampEl && textEl) {
      const timeText = timestampEl.textContent.trim();
      const text = textEl.textContent.trim();
      const time = parseTimestamp(timeText);
      
      if (text) {
        lines.push({
          time,
          timeText,
          duration: 0, // Will be calculated from next segment
          text
        });
      }
    }
  }
  
  // Calculate durations based on next segment
  for (let i = 0; i < lines.length - 1; i++) {
    lines[i].duration = lines[i + 1].time - lines[i].time;
  }
  if (lines.length > 0) {
    lines[lines.length - 1].duration = 5; // Default 5 seconds for last segment
  }
  
  return lines;
}

/**
 * Find and click the "Show transcript" button
 * @returns {Promise<boolean>} - Whether button was found and clicked
 */
async function openTranscriptPanel() {
  // Check if already open
  if (isTranscriptPanelOpen()) {
    return true;
  }
  
  // Try to find the "Show transcript" button in video description
  // It's typically in the engagement panel or description
  const buttons = document.querySelectorAll('button, yt-button-shape button, ytd-button-renderer button');
  
  for (const btn of buttons) {
    const text = btn.textContent?.toLowerCase() || '';
    const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
    
    if (text.includes('show transcript') || ariaLabel.includes('show transcript')) {
      console.log('[Vilify] Found "Show transcript" button, clicking...');
      btn.click();
      
      // Wait for panel to open
      await new Promise(r => setTimeout(r, 1000));
      return true;
    }
  }
  
  // Try the description expand + transcript button approach
  // First expand description if collapsed
  const expandBtn = document.querySelector('#expand, tp-yt-paper-button#expand');
  if (expandBtn) {
    expandBtn.click();
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Look for transcript button again after expanding
  const transcriptBtn = document.querySelector('button[aria-label*="transcript" i], ytd-button-renderer:has([aria-label*="transcript" i])');
  if (transcriptBtn) {
    console.log('[Vilify] Found transcript button after expanding description');
    transcriptBtn.click();
    await new Promise(r => setTimeout(r, 1000));
    return true;
  }
  
  // Try to find the transcript chip in the engagement panel chips
  const chips = document.querySelectorAll('yt-chip-cloud-chip-renderer, ytd-engagement-panel-title-header-renderer');
  for (const chip of chips) {
    if (chip.textContent?.toLowerCase().includes('transcript')) {
      chip.click();
      await new Promise(r => setTimeout(r, 1000));
      return true;
    }
  }
  
  console.log('[Vilify] Could not find transcript button');
  return false;
}

/**
 * Close the transcript panel
 */
function closeTranscriptPanel() {
  const closeBtn = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] #visibility-button button');
  if (closeBtn) {
    closeBtn.click();
  }
}

/**
 * Check if video has transcript available
 * @returns {boolean}
 */
function hasTranscriptAvailable() {
  // Check for getTranscriptEndpoint in page data
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    if (script.textContent?.includes('getTranscriptEndpoint')) {
      return true;
    }
  }
  return false;
}

/**
 * Fetch transcript by opening panel and scraping DOM
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<TranscriptResult>}
 */
export async function fetchTranscript(videoId) {
  try {
    console.log('[Vilify] Fetching transcript for', videoId);
    
    // Check if transcript is available
    if (!hasTranscriptAvailable()) {
      console.log('[Vilify] No transcript endpoint found - video has no captions');
      return { status: 'unavailable', lines: [], language: null };
    }
    
    // Check if panel already has segments (maybe from previous load)
    let lines = scrapeTranscriptFromDOM();
    if (lines.length > 0) {
      console.log('[Vilify] Found existing transcript in DOM:', lines.length, 'lines');
      return { status: 'loaded', lines, language: 'en' };
    }
    
    // Try to open the transcript panel
    const panelOpened = await openTranscriptPanel();
    
    if (!panelOpened) {
      console.log('[Vilify] Could not open transcript panel');
      return { status: 'unavailable', lines: [], language: null };
    }
    
    // Wait for segments to load
    await waitForElement('ytd-transcript-segment-renderer', 3000);
    await new Promise(r => setTimeout(r, 500)); // Extra wait for all segments
    
    // Scrape the transcript
    lines = scrapeTranscriptFromDOM();
    
    // Close the panel (we have the data now)
    closeTranscriptPanel();
    
    console.log('[Vilify] Scraped', lines.length, 'transcript lines');
    
    if (lines.length === 0) {
      return { status: 'unavailable', lines: [], language: null };
    }
    
    return { 
      status: 'loaded', 
      lines, 
      language: 'en'
    };
  } catch (e) {
    console.error('[Vilify] Error fetching transcript:', e);
    return { status: 'unavailable', lines: [], language: null };
  }
}
