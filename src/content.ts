// Vilify - Content Script Entry Point
// Loads when matching site patterns are detected
// Note: data-bridge.js runs separately in MAIN world to capture ytInitialData

import type { SiteConfig } from './types';
import { initSite } from './core/index';
import { injectLoadingStyles } from './core/loading';
import { youtubeConfig } from './sites/youtube/index';
import { googleConfig } from './sites/google/index';

/**
 * Detect current site and return appropriate config.
 * 
 * Signature: getSiteConfig : () → SiteConfig | null
 * Purpose: Detect current site and return appropriate config
 * 
 * Examples:
 *   // On youtube.com
 *   getSiteConfig() => youtubeConfig
 *   // On google.com
 *   getSiteConfig() => googleConfig
 *   // On other site
 *   getSiteConfig() => null
 * 
 * @returns {SiteConfig|null} Site config or null if unsupported site
 */
export function getSiteConfig(): SiteConfig | null {
  const hostname = location.hostname;
  
  if (hostname === 'www.youtube.com' || hostname === 'youtube.com') {
    return youtubeConfig;
  }
  
  if (hostname === 'www.google.com' || hostname === 'google.com') {
    if (location.pathname.startsWith('/search')) {
      return googleConfig;
    }
    return null;
  }
  
  return null;
}

console.log('[Vilify] Content script loaded');

// Check if Vilify was disabled for this session
try {
  if (sessionStorage.getItem('vilify-disabled') === 'true') {
    console.log('[Vilify] Disabled for this session.');
    // To re-enable, the user can click the extension icon or open a new tab.
    // We can also add a command to re-enable it.
  } else {
    // Ensure any old session flags are cleared when starting a new session.
    sessionStorage.removeItem('vilify-disabled');
    initialize();
  }
} catch (e) {
  console.error('[Vilify] Failed to access sessionStorage:', e);
  initialize(); // Proceed if sessionStorage is inaccessible
}


function initialize() {
  // Initialize UI when DOM is ready
  const config: SiteConfig | null = getSiteConfig();

  if (config) {
    // Inject loading styles immediately at document_start, before DOM is ready,
    // so CSS that hides Google/YouTube content is present from the very start.
    injectLoadingStyles();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initSite(config));
    } else {
      initSite(config);
    }
  } else {
    console.log('[Vilify] No supported site detected');
  }
}
