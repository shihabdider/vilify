// Navigation observer - Detect SPA URL changes
// Following HTDP design from .design/BLUEPRINT.md

/**
 * Set up navigation observer for SPA URL changes.
 * Uses MutationObserver on body to detect YouTube's SPA navigation.
 * Also listens for popstate (back/forward button).
 * [I/O]
 *
 * @param {Function} onNavigate - Callback (oldUrl, newUrl) => void
 * @returns {MutationObserver} The observer (can be disconnected to stop)
 *
 * @example
 * setupNavigationObserver((oldUrl, newUrl) => {
 *   console.log('Navigated from', oldUrl, 'to', newUrl);
 *   site.handleNavigation(newUrl);
 * })
 * // Sets up observer, site handles the reaction
 */
export function setupNavigationObserver(onNavigate) {
  // Template: I/O - Set up MutationObserver and event listeners
  let lastUrl = location.href;

  /**
   * Check if URL changed and call callback
   */
  const checkUrlChange = () => {
    if (location.href !== lastUrl) {
      const oldUrl = lastUrl;
      lastUrl = location.href;
      onNavigate(oldUrl, location.href);
    }
  };

  // Use MutationObserver to detect DOM changes that indicate navigation
  // YouTube's SPA modifies the DOM without triggering standard navigation events
  const observer = new MutationObserver(() => {
    checkUrlChange();
  });

  // Wait for body to be available, then observe
  const startObserving = () => {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } else {
      // Body not ready, try again shortly
      setTimeout(startObserving, 10);
    }
  };

  startObserving();

  // Also listen for popstate (back/forward navigation)
  const handlePopstate = () => {
    checkUrlChange();
  };

  window.addEventListener('popstate', handlePopstate);

  // Store cleanup function on observer for convenience
  const originalDisconnect = observer.disconnect.bind(observer);
  observer.disconnect = () => {
    originalDisconnect();
    window.removeEventListener('popstate', handlePopstate);
  };

  return observer;
}

// Legacy export for backward compatibility
export { setupNavigationObserver as observeNavigation };
