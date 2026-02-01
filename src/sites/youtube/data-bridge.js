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
    console.log('[Vilify Bridge] ytInitialData already available');
    send('initialData', ytInitialData);
    return;
  }
  
  // Poll until available (YouTube sets this during page load)
  const startTime = Date.now();
  const interval = setInterval(() => {
    if (typeof ytInitialData !== 'undefined' && ytInitialData) {
      console.log('[Vilify Bridge] ytInitialData became available after', Date.now() - startTime, 'ms');
      send('initialData', ytInitialData);
      clearInterval(interval);
    }
  }, 10);
  
  // Stop polling after 10 seconds (fallback to DOM scraping will happen)
  setTimeout(() => {
    clearInterval(interval);
    if (typeof ytInitialData === 'undefined' || !ytInitialData) {
      console.log('[Vilify Bridge] ytInitialData not found after 10s');
      send('dataTimeout', null);
    }
  }, 10000);
}

/**
 * Wait for ytInitialPlayerResponse to be available (watch pages)
 */
function waitForPlayerResponse() {
  if (typeof ytInitialPlayerResponse !== 'undefined' && ytInitialPlayerResponse) {
    console.log('[Vilify Bridge] ytInitialPlayerResponse available');
    send('playerResponse', ytInitialPlayerResponse);
    return;
  }
  
  // Poll briefly for player response
  const interval = setInterval(() => {
    if (typeof ytInitialPlayerResponse !== 'undefined' && ytInitialPlayerResponse) {
      console.log('[Vilify Bridge] ytInitialPlayerResponse became available');
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
document.addEventListener('yt-navigate-finish', (event) => {
  console.log('[Vilify Bridge] yt-navigate-finish event');
  
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
  console.log('[Vilify Bridge] yt-page-data-updated event');
  
  if (typeof ytInitialData !== 'undefined' && ytInitialData) {
    send('initialData', ytInitialData);
  }
});

/**
 * Handle player ready event (watch pages)
 */
document.addEventListener('yt-player-updated', () => {
  console.log('[Vilify Bridge] yt-player-updated event');
  
  if (typeof ytInitialPlayerResponse !== 'undefined' && ytInitialPlayerResponse) {
    send('playerResponse', ytInitialPlayerResponse);
  }
});

/**
 * Alternative navigation event (used on mobile/some pages)
 */
window.addEventListener('state-navigateend', () => {
  console.log('[Vilify Bridge] state-navigateend event');
  
  setTimeout(() => {
    if (typeof ytInitialData !== 'undefined' && ytInitialData) {
      send('initialData', ytInitialData);
    }
  }, 50);
});

// Initialize - start waiting for data
waitForInitialData();
waitForPlayerResponse();

console.log('[Vilify Bridge] Initialized in MAIN world');
