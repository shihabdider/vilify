// Fetch Interceptor for YouTube API
// Captures /youtubei/v1/ responses for fresh data on SPA navigation

/**
 * Install fetch interceptor for YouTube API calls.
 * Captures browse, search, next, and player responses.
 * 
 * @param {function} onData - Callback: (endpoint: string, data: Object) => void
 * @returns {{ uninstall: () => void }}
 * 
 * @example
 * const intercept = installFetchIntercept((endpoint, data) => {
 *   console.log('Captured:', endpoint, data);
 * });
 * // Later: intercept.uninstall();
 */
export function installFetchIntercept(onData) {
  // Guard against double-installation
  if (window.__vilifyFetchInstalled) {
    console.log('[Vilify] Fetch intercept already installed');
    return { uninstall: () => {} };
  }
  
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    // Extract URL from args (can be string or Request object)
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    
    // Only intercept YouTube API calls
    if (url?.includes('/youtubei/v1/')) {
      try {
        // Clone response so we can read it without consuming
        const clone = response.clone();
        const data = await clone.json();
        
        // Extract endpoint name (browse, search, next, player, etc.)
        const endpoint = url.match(/\/youtubei\/v1\/(\w+)/)?.[1] || 'unknown';
        
        console.log(`[Vilify] Intercepted /youtubei/v1/${endpoint}`);
        
        // Notify callback
        onData(endpoint, data);
      } catch (e) {
        // Not JSON or parse error - ignore silently
      }
    }
    
    return response;
  };
  
  window.__vilifyFetchInstalled = true;
  console.log('[Vilify] Fetch intercept installed');
  
  return {
    uninstall() {
      window.fetch = originalFetch;
      window.__vilifyFetchInstalled = false;
      console.log('[Vilify] Fetch intercept uninstalled');
    }
  };
}
