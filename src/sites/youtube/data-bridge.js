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

/**
 * Get YouTube API context from ytcfg
 */
function getApiContext() {
  if (typeof ytcfg === 'undefined' || !ytcfg.get) {
    return null;
  }
  
  return {
    client: {
      hl: ytcfg.get('HL') || 'en',
      gl: ytcfg.get('GL') || 'US',
      clientName: 'WEB',
      clientVersion: ytcfg.get('INNERTUBE_CLIENT_VERSION') || '2.20240101.00.00',
      visitorData: ytcfg.get('VISITOR_DATA') || '',
    }
  };
}

/**
 * Get authorization header for YouTube API calls
 */
function getAuthHeader() {
  // YouTube uses SAPISIDHASH for auth
  const sapisid = document.cookie.match(/SAPISID=([^;]+)/)?.[1];
  if (!sapisid) return null;
  
  const timestamp = Math.floor(Date.now() / 1000);
  const origin = 'https://www.youtube.com';
  
  // SAPISIDHASH = SHA1(timestamp + " " + SAPISID + " " + origin)
  // We need to use SubtleCrypto for SHA1
  return new Promise(async (resolve) => {
    try {
      const str = `${timestamp} ${sapisid} ${origin}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      resolve(`SAPISIDHASH ${timestamp}_${hashHex}`);
    } catch (e) {
      resolve(null);
    }
  });
}

/**
 * Add video to Watch Later playlist via YouTube API
 */
async function addToWatchLater(videoId) {
  const context = getApiContext();
  if (!context) {
    return { success: false, error: 'No API context' };
  }
  
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return { success: false, error: 'Not signed in' };
  }
  
  const apiKey = typeof ytcfg !== 'undefined' && ytcfg.get ? ytcfg.get('INNERTUBE_API_KEY') : null;
  const url = `https://www.youtube.com/youtubei/v1/browse/edit_playlist${apiKey ? `?key=${apiKey}` : ''}`;
  
  const body = {
    context,
    actions: [{
      addedVideoId: videoId,
      action: 'ACTION_ADD_VIDEO'
    }],
    playlistId: 'WL'
  };
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-Origin': 'https://www.youtube.com',
      },
      body: JSON.stringify(body),
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      // Check if the response indicates success
      const status = data?.status;
      if (status === 'STATUS_SUCCEEDED' || !data?.error) {
        return { success: true };
      }
      return { success: false, error: data?.error?.message || 'API error' };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Listen for commands from content script
 */
document.addEventListener('__vilify_command__', async (event) => {
  const { command, data, requestId } = event.detail || {};
  
  if (command === 'addToWatchLater' && data?.videoId) {
    const result = await addToWatchLater(data.videoId);
    // Send result back to content script
    document.dispatchEvent(new CustomEvent('__vilify_response__', {
      detail: { requestId, result }
    }));
  }
});

// Initialize - start waiting for data
waitForInitialData();
waitForPlayerResponse();
interceptFetch();
