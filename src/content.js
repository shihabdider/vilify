// Vilify - Content Script Entry Point
// Loads when matching site patterns are detected

import { initSite } from './core/index.js';
import { youtubeConfig } from './sites/youtube/index.js';

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initSite(youtubeConfig));
} else {
  initSite(youtubeConfig);
}

console.log('[Vilify] Content script loaded');
