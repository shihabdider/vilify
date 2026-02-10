// Vilify - Content Script Entry Point
// Loads when matching site patterns are detected
// Note: data-bridge.js runs separately in MAIN world to capture ytInitialData

import { initSite } from './core/index.js';
import { youtubeConfig } from './sites/youtube/index.js';
import { googleConfig } from './sites/google/index.js';

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
export function getSiteConfig() {
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

// Initialize UI when DOM is ready
const config = getSiteConfig();

if (config) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initSite(config));
  } else {
    initSite(config);
  }
} else {
  console.log('[Vilify] No supported site detected');
}
