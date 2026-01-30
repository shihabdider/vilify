// Navigation Watcher
// Detects YouTube SPA navigation and triggers callbacks

/**
 * Create a navigation watcher that detects URL changes
 * @param {Function} callback - Called when URL changes
 * @returns {{ stop: () => void }}
 * 
 * Examples:
 *   const watcher = createNavigationWatcher(() => {
 *     console.log('URL changed');
 *   });
 *   // Later: watcher.stop();
 */
export function createNavigationWatcher(callback) {
  let lastUrl = location.href;
  let debounceTimer = null;
  const DEBOUNCE_MS = 100;
  
  // Debounced callback to handle rapid URL changes
  function onUrlChange() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      callback();
      debounceTimer = null;
    }, DEBOUNCE_MS);
  }
  
  // Method 1: Listen for popstate (back/forward)
  function handlePopstate() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      onUrlChange();
    }
  }
  window.addEventListener('popstate', handlePopstate);
  
  // Method 2: Watch for YouTube's yt-navigate-finish event
  function handleYtNavigate() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      onUrlChange();
    }
  }
  document.addEventListener('yt-navigate-finish', handleYtNavigate);
  
  // Method 3: MutationObserver on title (YouTube updates title on navigation)
  const titleObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      onUrlChange();
    }
  });
  
  const titleEl = document.querySelector('title');
  if (titleEl) {
    titleObserver.observe(titleEl, { childList: true });
  }
  
  // Method 4: Polling fallback (in case other methods miss)
  const pollInterval = setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      onUrlChange();
    }
  }, 500);
  
  // Return stop function
  return {
    stop() {
      window.removeEventListener('popstate', handlePopstate);
      document.removeEventListener('yt-navigate-finish', handleYtNavigate);
      titleObserver.disconnect();
      clearInterval(pollInterval);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    }
  };
}
