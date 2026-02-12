// Main World Bridge
// Injects a script into the page's main world to capture ytInitialData and fetch responses
// Communicates back to content script via CustomEvents

const BRIDGE_EVENT_NAME = '__vilify_data__';

/**
 * Script to inject into the main world.
 * This runs in the page's context and can access:
 * - window.ytInitialData
 * - window.ytInitialPlayerResponse
 * - window.fetch (to intercept API calls)
 */
const MAIN_WORLD_SCRIPT = `
(function() {
  // Prevent double-installation
  if (window.__vilifyBridgeInstalled) return;
  window.__vilifyBridgeInstalled = true;

  // Send data to content script
  function sendToContentScript(type, data) {
    document.dispatchEvent(new CustomEvent('${BRIDGE_EVENT_NAME}', {
      detail: { type, data }
    }));
  }

  // Capture and preserve existing ytInitialData before redefining property
  let lastInitialData = window.ytInitialData || null;
  let lastPlayerResponse = window.ytInitialPlayerResponse || null;

  // Send immediately if data already exists
  if (lastInitialData) {
    sendToContentScript('initialData', lastInitialData);
  }
  if (lastPlayerResponse) {
    sendToContentScript('playerResponse', lastPlayerResponse);
  }

  // Watch for ytInitialData to be set (on SPA navigation, YouTube may re-set it)
  // Use try-catch in case property is non-configurable
  try {
    Object.defineProperty(window, 'ytInitialData', {
      configurable: true,
      enumerable: true,
      get() { return lastInitialData; },
      set(value) {
        lastInitialData = value;
        if (value) {
          sendToContentScript('initialData', value);
        }
      }
    });
  } catch (e) {
    // Property might already be defined and non-configurable
    // Fall back to polling
    console.log('[Vilify] Could not define ytInitialData property, using polling');
    setInterval(() => {
      if (window.ytInitialData && window.ytInitialData !== lastInitialData) {
        lastInitialData = window.ytInitialData;
        sendToContentScript('initialData', lastInitialData);
      }
    }, 100);
  }

  // Also watch ytInitialPlayerResponse
  try {
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      configurable: true,
      enumerable: true,
      get() { return lastPlayerResponse; },
      set(value) {
        lastPlayerResponse = value;
        if (value) {
          sendToContentScript('playerResponse', value);
        }
      }
    });
  } catch (e) {
    // Fallback polling for player response
    setInterval(() => {
      if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse !== lastPlayerResponse) {
        lastPlayerResponse = window.ytInitialPlayerResponse;
        sendToContentScript('playerResponse', lastPlayerResponse);
      }
    }, 100);
  }

  // Intercept fetch for API responses
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    // Extract URL
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    
    // Only intercept YouTube API calls
    if (url?.includes('/youtubei/v1/')) {
      try {
        const clone = response.clone();
        const data = await clone.json();
        const endpoint = url.match(/\\/youtubei\\/v1\\/(\\w+)/)?.[1] || 'unknown';
        sendToContentScript('apiResponse', { endpoint, data });
      } catch (e) {
        // Not JSON or parse error - ignore
      }
    }
    
    return response;
  };

  console.log('[Vilify] Main world bridge installed');
})();
`;

/**
 * Install the main world bridge.
 * Injects a script into the page's main context.
 * 
 * @param {function} onData - Callback: (type: string, data: Object) => void
 *   type: 'initialData' | 'playerResponse' | 'apiResponse'
 *   data: The captured data
 * @returns {{ uninstall: () => void }}
 */
export function installMainWorldBridge(onData: (type: string, data: any) => void): { uninstall: () => void } {
  // Listen for messages from main world
  function handleBridgeEvent(event: any): void {
    const { type, data } = event.detail || {};
    if (type && data) {
      onData(type, data);
    }
  }
  
  document.addEventListener(BRIDGE_EVENT_NAME, handleBridgeEvent);
  
  // Inject script into main world
  // Must happen as early as possible to intercept ytInitialData
  function injectScript(): boolean {
    const script = document.createElement('script');
    script.textContent = MAIN_WORLD_SCRIPT;
    
    // Insert at document start to run before YouTube's scripts
    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(script);
      script.remove(); // Clean up - script has already executed
      return true;
    }
    return false;
  }
  
  // Try to inject immediately
  if (!injectScript()) {
    // If document not ready, wait for first element
    const observer = new MutationObserver((mutations, obs) => {
      if (injectScript()) {
        obs.disconnect();
      }
    });
    observer.observe(document.documentElement || document, { 
      childList: true, 
      subtree: true 
    });
  }
  
  console.log('[Vilify] Main world bridge script injected');
  
  return {
    uninstall() {
      document.removeEventListener(BRIDGE_EVENT_NAME, handleBridgeEvent);
    }
  };
}
