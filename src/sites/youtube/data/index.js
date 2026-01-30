// YouTube Data Provider
// Public API for the hybrid data layer

import { parseInitialData, parsePlayerResponse } from './initial-data.js';
import { extractVideosFromData, extractVideoContext } from './extractors.js';
import { scrapeDOMVideos, scrapeDOMVideoContext, scrapeDOMRecommendations } from './dom-fallback.js';
import { createNavigationWatcher } from './navigation.js';

// =============================================================================
// DATA PROVIDER
// =============================================================================

/**
 * Create the data provider facade
 * @returns {DataProvider}
 */
export function createDataProvider() {
  // Cached data (refreshed on navigation)
  let cachedInitialData = null;
  let cachedPlayerResponse = null;
  let cachedPageType = null;
  let navigationWatcher = null;
  
  /**
   * Refresh cached data from page
   */
  function refresh() {
    const result = parseInitialData();
    if (result.ok) {
      cachedInitialData = result.data;
      cachedPageType = result.pageType;
    } else {
      cachedInitialData = null;
      cachedPageType = 'other';
    }
    
    // Parse player response on watch page
    if (cachedPageType === 'watch') {
      cachedPlayerResponse = parsePlayerResponse();
    } else {
      cachedPlayerResponse = null;
    }
  }
  
  /**
   * Get videos for current page
   * @returns {Array<Video>}
   */
  function getVideos() {
    // Ensure we have data
    if (cachedInitialData === null) {
      refresh();
    }
    
    // Try extraction from initial data first
    if (cachedInitialData) {
      const videos = extractVideosFromData(cachedInitialData);
      if (videos.length > 0) {
        return videos;
      }
    }
    
    // Fallback to DOM scraping
    return scrapeDOMVideos();
  }
  
  /**
   * Get video context for watch page
   * @returns {VideoContext|null}
   */
  function getVideoContext() {
    // Ensure we have data
    if (cachedInitialData === null) {
      refresh();
    }
    
    // Try extraction from initial data + player response
    if (cachedInitialData && cachedPlayerResponse) {
      const ctx = extractVideoContext(cachedInitialData, cachedPlayerResponse);
      if (ctx) {
        // Augment with live video element data
        const videoEl = document.querySelector('video.html5-main-video');
        if (videoEl) {
          ctx.currentTime = videoEl.currentTime || 0;
          ctx.paused = videoEl.paused ?? true;
          ctx.playbackRate = videoEl.playbackRate || 1;
        }
        return ctx;
      }
    }
    
    // Fallback to DOM scraping
    return scrapeDOMVideoContext();
  }
  
  /**
   * Get recommended videos (watch page sidebar)
   * @returns {Array<Video>}
   */
  function getRecommendations() {
    // Ensure we have data
    if (cachedInitialData === null) {
      refresh();
    }
    
    // On watch page, recommendations are in secondary results
    if (cachedPageType === 'watch' && cachedInitialData) {
      const secondary = cachedInitialData?.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults;
      const results = secondary?.results || [];
      
      const videos = [];
      const seen = new Set();
      
      for (const item of results) {
        // Try lockupViewModel (new format)
        if (item.lockupViewModel) {
          const { extractLockupViewModel } = require('./extractors.js');
          const video = extractLockupViewModel(item.lockupViewModel);
          if (video && !seen.has(video.videoId)) {
            seen.add(video.videoId);
            videos.push(video);
          }
        }
        // Try compactVideoRenderer (old format)
        if (item.compactVideoRenderer) {
          const { extractCompactVideoRenderer } = require('./extractors.js');
          const video = extractCompactVideoRenderer(item.compactVideoRenderer);
          if (video && !seen.has(video.videoId)) {
            seen.add(video.videoId);
            videos.push(video);
          }
        }
      }
      
      if (videos.length > 0) {
        return videos;
      }
    }
    
    // Fallback to DOM
    return scrapeDOMRecommendations();
  }
  
  /**
   * Get current page type
   * @returns {PageType}
   */
  function getPageType() {
    if (cachedPageType === null) {
      refresh();
    }
    return cachedPageType || 'other';
  }
  
  /**
   * Start watching for navigation (auto-refresh on URL change)
   */
  function startWatching() {
    if (!navigationWatcher) {
      navigationWatcher = createNavigationWatcher(() => {
        refresh();
      });
    }
  }
  
  /**
   * Stop watching for navigation
   */
  function stopWatching() {
    if (navigationWatcher) {
      navigationWatcher.stop();
      navigationWatcher = null;
    }
  }
  
  // Auto-start navigation watching
  startWatching();
  
  return {
    getVideos,
    getVideoContext,
    getRecommendations,
    getPageType,
    refresh,
    startWatching,
    stopWatching,
  };
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let dataProviderInstance = null;

/**
 * Get the singleton data provider instance
 * @returns {DataProvider}
 */
export function getDataProvider() {
  if (!dataProviderInstance) {
    dataProviderInstance = createDataProvider();
  }
  return dataProviderInstance;
}

// Re-export types and utilities for convenience
export { parseInitialData, parsePlayerResponse } from './initial-data.js';
export { extractVideosFromData, extractVideoContext, extractChaptersFromData } from './extractors.js';
export { createNavigationWatcher } from './navigation.js';
