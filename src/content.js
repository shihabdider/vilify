// Vilify - Content Script Entry Point
// Loads when matching site patterns are detected
// Note: data-bridge.js runs separately in MAIN world to capture ytInitialData

import { initSite } from './core/index.js';
import { youtubeConfig } from './sites/youtube/index.js';

console.log('[Vilify] Content script loaded');

// Initialize UI when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initSite(youtubeConfig));
} else {
  initSite(youtubeConfig);
}
