// Data Bridge - Runs in MAIN world (page context)
// Captures ytInitialData and YouTube events, sends to content script via CustomEvent
// This file must be built separately and runs directly in the page context

const BRIDGE_EVENT = '__vilify_data__';

/**
 * Send data to content script via CustomEvent
 */
function send(type, data) {
  document.dispatchEvent(new CustomEvent(BRIDGE_EVENT, {
    detail: { type, data }
  }));
}

/**
 * Wait for ytInitialData to be available and send it
 */
function waitForInitialData() {
  // Check if already available
  if (typeof ytInitialData !== 'undefined' && ytInitialData) {
    send('initialData', ytInitialData);
    return;
  }
  
  // Poll until available (YouTube sets this during page load)
  const interval = setInterval(() => {
    if (typeof ytInitialData !== 'undefined' && ytInitialData) {
      send('initialData', ytInitialData);
      clearInterval(interval);
    }
  }, 10);
  
  // Stop polling after 10 seconds (fallback to DOM scraping will happen)
  setTimeout(() => {
    clearInterval(interval);
    if (typeof ytInitialData === 'undefined' || !ytInitialData) {
      send('dataTimeout', null);
    }
  }, 10000);
}

/**
 * Wait for ytInitialPlayerResponse to be available (watch pages)
 */
function waitForPlayerResponse() {
  if (typeof ytInitialPlayerResponse !== 'undefined' && ytInitialPlayerResponse) {
    send('playerResponse', ytInitialPlayerResponse);
    return;
  }
  
  // Poll briefly for player response
  const interval = setInterval(() => {
    if (typeof ytInitialPlayerResponse !== 'undefined' && ytInitialPlayerResponse) {
      send('playerResponse', ytInitialPlayerResponse);
      clearInterval(interval);
    }
  }, 50);
  
  // Stop polling after 3 seconds
  setTimeout(() => clearInterval(interval), 3000);
}

/**
 * Handle YouTube SPA navigation
 * yt-navigate-finish fires when navigation completes and data is ready
 */
document.addEventListener('yt-navigate-finish', () => {
  // Small delay to ensure YouTube has updated ytInitialData
  setTimeout(() => {
    if (typeof ytInitialData !== 'undefined' && ytInitialData) {
      send('initialData', ytInitialData);
    }
    if (typeof ytInitialPlayerResponse !== 'undefined' && ytInitialPlayerResponse) {
      send('playerResponse', ytInitialPlayerResponse);
    }
  }, 50);
});

/**
 * Handle page data updates (happens after some async operations)
 */
document.addEventListener('yt-page-data-updated', () => {
  if (typeof ytInitialData !== 'undefined' && ytInitialData) {
    send('initialData', ytInitialData);
  }
});

/**
 * Handle player ready event (watch pages)
 */
document.addEventListener('yt-player-updated', () => {
  if (typeof ytInitialPlayerResponse !== 'undefined' && ytInitialPlayerResponse) {
    send('playerResponse', ytInitialPlayerResponse);
  }
});

/**
 * Alternative navigation event (used on mobile/some pages)
 */
window.addEventListener('state-navigateend', () => {
  setTimeout(() => {
    if (typeof ytInitialData !== 'undefined' && ytInitialData) {
      send('initialData', ytInitialData);
    }
  }, 50);
});

/**
 * Intercept fetch requests to capture continuation data (lazy loaded videos)
 */
function interceptFetch() {
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    // Check if this is a browse API call (continuation/lazy load)
    const url = args[0]?.url || args[0];
    if (typeof url === 'string' && url.includes('/youtubei/v1/browse')) {
      try {
        // Clone response to read body without consuming it
        const clone = response.clone();
        const data = await clone.json();
        
        // Check if this has continuation items (lazy loaded content)
        if (data?.onResponseReceivedActions || data?.continuationContents) {
          send('continuationData', data);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    return response;
  };
}

// Initialize - start waiting for data
waitForInitialData();
waitForPlayerResponse();
interceptFetch();
