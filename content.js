/**
 * Vilify Content Script Entry Point
 * 
 * Detects the current site and initializes the appropriate configuration.
 */

import { initSite } from './core/orchestration.js';
import youtubeConfig from './sites/youtube/config.js';

/**
 * Map of hostname patterns to site configs.
 */
const SITE_CONFIGS = {
  'www.youtube.com': youtubeConfig,
};

/**
 * Initialize Vilify for the current site.
 */
function init() {
  const hostname = window.location.hostname;
  const config = SITE_CONFIGS[hostname];
  
  if (!config) {
    console.log('[Vilify] No config found for', hostname);
    return;
  }
  
  console.log('[Vilify] Initializing for', config.name);
  initSite(config);
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
