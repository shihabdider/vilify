/**
 * YouTube Site Configuration
 * 
 * SiteConfig for YouTube integration.
 */

import { getYouTubePageType, getVideos, getVideoContext } from './scrape.js';
import { getYouTubeCommands, getYouTubeKeySequences } from './commands.js';
import { renderWatchPage } from './layout.js';
import { createYouTubeState } from './state.js';

/**
 * YouTube theme - Solarized Dark with YouTube red accent.
 */
export const youtubeTheme = {
  bg1: '#002b36',
  bg2: '#073642',
  bg3: '#0a4a5c',
  txt1: '#f1f1f1',
  txt2: '#aaaaaa',
  txt3: '#717171',
  txt4: '#3ea6ff',
  accent: '#ff0000',
  accentHover: '#cc0000',
};

/**
 * YouTube site configuration.
 */
export const youtubeConfig = {
  name: 'youtube',
  matches: ['*://www.youtube.com/*'],
  theme: youtubeTheme,
  
  // State management
  createSiteState: createYouTubeState,
  
  // Page type detection
  getPageType: getYouTubePageType,
  
  // Get context for current page (VideoContext for watch page)
  getContext: () => {
    const pageType = getYouTubePageType();
    if (pageType === 'watch') {
      try {
        return getVideoContext();
      } catch (e) {
        console.warn('[Vilify] Failed to get video context:', e);
        return null;
      }
    }
    return null;
  },
  
  // Get items for listing pages
  getItems: () => {
    const pageType = getYouTubePageType();
    if (pageType === 'watch') {
      // Watch page uses custom layout, not listing
      return [];
    }
    try {
      return getVideos();
    } catch (e) {
      console.warn('[Vilify] Failed to get videos:', e);
      return [];
    }
  },
  
  // Commands
  getCommands: (ctx) => getYouTubeCommands(ctx),
  
  // Key bindings
  getKeySequences: (ctx) => getYouTubeKeySequences(ctx),
  
  // Layouts per page type
  layouts: {
    home: 'listing',
    search: 'listing',
    subscriptions: 'listing',
    channel: 'listing',
    playlist: 'listing',
    history: 'listing',
    library: 'listing',
    trending: 'listing',
    watch: (ctx, container) => renderWatchPage(ctx, container),
    shorts: 'listing',
    other: 'listing',
  },
  
  // Use default item rendering
  renderItem: null,
  
  // Optional: handle "load more" at list boundary
  onLoadMore: null,
};

export default youtubeConfig;
