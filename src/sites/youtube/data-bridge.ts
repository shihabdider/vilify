// Data Bridge - Runs in MAIN world (page context)
// Captures ytInitialData and YouTube events, sends to content script via CustomEvent
// This file must be built separately and runs directly in the page context

// YouTube globals available in main world context
declare const ytInitialData: any;
declare const ytInitialPlayerResponse: any;
declare const ytcfg: { get: (key: string) => any } | undefined;

const BRIDGE_EVENT = '__vilify_data__';

/**
 * Send data to content script via CustomEvent
 */
function send(type: string, data: any): void {
  document.dispatchEvent(new CustomEvent(BRIDGE_EVENT, {
    detail: { type, data }
  }));
}

/**
 * Wait for ytInitialData to be available and send it
 */
function waitForInitialData(): void {
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
function waitForPlayerResponse(): void {
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
function interceptFetch(): void {
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    // Check if this is a browse API call (continuation/lazy load)
    const url = (args[0] as any)?.url || args[0];
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
 * Get authorization header for YouTube API calls
 */
function getAuthHeader(): Promise<string | null> {
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
 * Get full YouTube API context from ytcfg (matching YouTube's format)
 */
function getFullApiContext(): any {
  if (typeof ytcfg === 'undefined' || !ytcfg.get) {
    return null;
  }
  
  // Try to get the full innertube context that YouTube uses
  const innertubeContext = ytcfg.get('INNERTUBE_CONTEXT');
  if (innertubeContext) {
    console.log('[Vilify Bridge] Using INNERTUBE_CONTEXT from ytcfg');
    return innertubeContext;
  }
  
  // Fallback to building our own
  console.log('[Vilify Bridge] Building context manually');
  return {
    client: {
      hl: ytcfg.get('HL') || 'en',
      gl: ytcfg.get('GL') || 'US',
      remoteHost: ytcfg.get('REMOTE_HOST') || '',
      deviceMake: '',
      deviceModel: '',
      visitorData: ytcfg.get('VISITOR_DATA') || '',
      userAgent: navigator.userAgent,
      clientName: 'WEB',
      clientVersion: ytcfg.get('INNERTUBE_CLIENT_VERSION') || '2.20240101.00.00',
      osName: navigator.platform.includes('Mac') ? 'Macintosh' : navigator.platform.includes('Win') ? 'Windows' : 'Linux',
      osVersion: '',
      originalUrl: location.href,
      platform: 'DESKTOP',
      clientFormFactor: 'UNKNOWN_FORM_FACTOR',
      userInterfaceTheme: 'USER_INTERFACE_THEME_DARK',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      browserName: 'Chrome',
      browserVersion: navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || '',
    },
    user: {
      lockedSafetyMode: false
    },
    request: {
      useSsl: true,
      internalExperimentFlags: [],
      consistencyTokenJars: []
    }
  };
}

/**
 * Shared helper for YouTube playlist API calls.
 * Handles auth, headers, fetch, and response checking.
 * 
 * @param buildBody - Receives API context, returns request body
 * @param logLabel - Label for console logs (e.g. 'Add', 'Remove', 'Undo')
 * @param isSuccess - Custom success check (default: STATUS_SUCCEEDED)
 */
async function callPlaylistApi(
  buildBody: (context: any) => Record<string, any>,
  logLabel: string,
  isSuccess?: (data: any, response: Response) => boolean
): Promise<{ success: boolean; error?: string }> {
  const context = getFullApiContext();
  if (!context) {
    return { success: false, error: 'No API context' };
  }
  
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return { success: false, error: 'Not signed in' };
  }
  
  const apiKey = typeof ytcfg !== 'undefined' && ytcfg.get ? ytcfg.get('INNERTUBE_API_KEY') : null;
  const url = `https://www.youtube.com/youtubei/v1/browse/edit_playlist?prettyPrint=false${apiKey ? `&key=${apiKey}` : ''}`;
  
  const body = buildBody(context);
  
  console.log(`[Vilify Bridge] ${logLabel} - Sending to API:`, url);
  console.log(`[Vilify Bridge] ${logLabel} request body:`, JSON.stringify(body, null, 2));
  
  const visitorData = context.client?.visitorData || '';
  const authUser = typeof ytcfg !== 'undefined' && ytcfg.get
    ? (ytcfg.get('SESSION_INDEX') ?? '0')
    : '0';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-Origin': 'https://www.youtube.com',
        'X-Goog-AuthUser': String(authUser),
        'X-Goog-Visitor-Id': visitorData,
        'X-Youtube-Client-Name': '1',
        'X-Youtube-Client-Version': context.client.clientVersion,
        'X-Youtube-Bootstrap-Logged-In': 'true',
      },
      body: JSON.stringify(body),
      credentials: 'include',
      cache: 'no-store'
    });
    
    const data = await response.json();
    console.log(`[Vilify Bridge] ${logLabel} API response:`, response.status, JSON.stringify(data, null, 2));
    
    const successCheck = isSuccess || ((d, r) => r.ok && d?.status === 'STATUS_SUCCEEDED');
    if (successCheck(data, response)) {
      return { success: true };
    }
    return { success: false, error: data?.error?.message || 'Unknown API response' };
  } catch (e) {
    console.error(`[Vilify Bridge] ${logLabel} API error:`, e);
    return { success: false, error: e.message };
  }
}

/**
 * Add video to Watch Later playlist via YouTube API
 */
async function addToWatchLater(videoId: string): Promise<{ success: boolean; error?: string }> {
  return callPlaylistApi(
    (context) => {
      const body: Record<string, any> = {
        context,
        actions: [{
          addedVideoId: videoId,
          action: 'ACTION_ADD_VIDEO'
        }],
        playlistId: 'WL'
      };
      
      // Add click tracking if available
      if (typeof ytInitialData !== 'undefined' && ytInitialData?.responseContext?.serviceTrackingParams) {
        body.clickTracking = {
          clickTrackingParams: btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(20))))
        };
      }
      
      return body;
    },
    'Add',
    // Broader success check: STATUS_SUCCEEDED or playlistEditResults
    (data, response) => {
      if (!response.ok) return false;
      return data?.status === 'STATUS_SUCCEEDED' || !!data?.playlistEditResults;
    }
  );
}

/**
 * Remove video from Watch Later playlist via YouTube API
 * @param {string} setVideoId - Playlist item ID (NOT the video ID)
 */
async function removeFromWatchLater(setVideoId: string): Promise<{ success: boolean; error?: string }> {
  return callPlaylistApi(
    (context) => ({
      context,
      actions: [{
        setVideoId: setVideoId,
        action: 'ACTION_REMOVE_VIDEO'
      }],
      params: 'CAFAAQ%3D%3D',  // Required param for removal
      playlistId: 'WL'
    }),
    'Remove'
  );
}

/**
 * Undo removal - re-add video to Watch Later at specific position
 * @param {string} videoId - Video ID to add back
 * @param {number} position - Position to insert at
 */
async function undoRemoveFromWatchLater(videoId: string, position: number): Promise<{ success: boolean; error?: string }> {
  return callPlaylistApi(
    (context) => ({
      context,
      actions: [{
        addedVideoId: videoId,
        action: 'ACTION_ADD_VIDEO',
        addedVideoPosition: position
      }],
      params: 'IAE%3D',  // Required param for positional add
      playlistId: 'WL'
    }),
    'Undo'
  );
}

/**
 * Get playlist item data (setVideoId) for a video from ytInitialData
 * @param {string} videoId - Video ID to look up
 * @returns {{ setVideoId: string, position: number } | null}
 */
function getPlaylistItemData(videoId: string): { setVideoId: string; position: number } | null {
  if (typeof ytInitialData === 'undefined' || !ytInitialData) {
    return null;
  }
  
  // Navigate to playlist contents
  const contents = ytInitialData?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]
    ?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
    ?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents;
  
  if (!contents) {
    console.log('[Vilify Bridge] Could not find playlist contents in ytInitialData');
    return null;
  }
  
  // Find the video in the playlist
  for (let i = 0; i < contents.length; i++) {
    const renderer = contents[i]?.playlistVideoRenderer;
    if (renderer?.videoId === videoId) {
      const setVideoId = renderer.setVideoId;
      if (setVideoId) {
        console.log('[Vilify Bridge] Found setVideoId:', setVideoId, 'at position:', i);
        return { setVideoId, position: i };
      }
    }
  }
  
  console.log('[Vilify Bridge] Video not found in playlist data:', videoId);
  return null;
}

/**
 * Listen for commands from content script
 */
document.addEventListener('__vilify_command__', async (event: Event) => {
  const { command, data, requestId } = (event as CustomEvent).detail || {};
  console.log('[Vilify Bridge] Received command:', command, data);
  
  if (command === 'addToWatchLater' && data?.videoId) {
    const result = await addToWatchLater(data.videoId);
    console.log('[Vilify Bridge] Watch Later result:', result);
    document.dispatchEvent(new CustomEvent('__vilify_response__', {
      detail: { requestId, result }
    }));
  }
  
  if (command === 'getPlaylistItemData' && data?.videoId) {
    const result = getPlaylistItemData(data.videoId);
    console.log('[Vilify Bridge] Playlist item data:', result);
    document.dispatchEvent(new CustomEvent('__vilify_response__', {
      detail: { requestId, result }
    }));
  }
  
  if (command === 'removeFromWatchLater' && data?.setVideoId) {
    const result = await removeFromWatchLater(data.setVideoId);
    console.log('[Vilify Bridge] Remove result:', result);
    document.dispatchEvent(new CustomEvent('__vilify_response__', {
      detail: { requestId, result }
    }));
  }
  
  if (command === 'undoRemoveFromWatchLater' && data?.videoId !== undefined) {
    const result = await undoRemoveFromWatchLater(data.videoId, data.position);
    console.log('[Vilify Bridge] Undo result:', result);
    document.dispatchEvent(new CustomEvent('__vilify_response__', {
      detail: { requestId, result }
    }));
  }
});

console.log('[Vilify Bridge] Command listener registered');

// Initialize - start waiting for data
waitForInitialData();
waitForPlayerResponse();
interceptFetch();
