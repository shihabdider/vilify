// YouTube Data Provider
// Public API for the hybrid data layer

import { parseInitialData, parsePlayerResponse } from './initial-data.js';
import { extractVideosFromData, extractVideoContext } from './extractors.js';
import { scrapeDOMVideos, scrapeDOMVideoContext, scrapeDOMRecommendations } from './dom-fallback.js';
import { createNavigationWatcher } from './navigation.js';

// =============================================================================
// NORMALIZATION
// =============================================================================

/**
 * Get thumbnail URL for a video ID
 * @param {string} videoId - YouTube video ID
 * @returns {string} Thumbnail URL
 */
function getThumbnailUrl(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * Transform raw Video to ContentItem format expected by the UI
 * @param {Video} video - Raw video object from extractors
 * @returns {ContentItem} Formatted content item
 */
function toContentItem(video) {
  // Build meta string from channel and date (views/duration go in data for second row)
  const metaParts = [];
  if (video.channel) metaParts.push(video.channel);
  if (video.published) metaParts.push(video.published);
  const meta = metaParts.join(' · ') || null;

  return {
    type: 'content',
    id: video.videoId,
    title: video.title || 'Untitled',
    url: `/watch?v=${video.videoId}`,
    thumbnail: video.thumbnail || getThumbnailUrl(video.videoId),
    meta,
    subtitle: null,
    data: {
      videoId: video.videoId,
      channelUrl: video.channelUrl || null,
      viewCount: video.views || null,
      duration: video.duration || null,
    },
  };
}

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
   * @returns {Array<ContentItem>}
   */
  function getVideos() {
    // Always refresh to get latest data (handles SPA navigation timing)
    refresh();
    
    // Try extraction from initial data first
    if (cachedInitialData) {
      const videos = extractVideosFromData(cachedInitialData);
      if (videos.length > 0) {
        // Transform raw Video objects to ContentItem format
        const items = videos.map(toContentItem);
        
        // Augment with DOM-scraped duration if missing
        // (ytInitialData often doesn't have duration in lockup format)
        const domVideos = scrapeDOMVideos();
        const domMap = new Map(domVideos.map(v => [v.id, v]));
        
        for (const item of items) {
          if (!item.data.duration) {
            const domItem = domMap.get(item.id);
            if (domItem?.data?.duration) {
              item.data.duration = domItem.data.duration;
            }
          }
        }
        
        return items;
      }
    }
    
    // Fallback to DOM scraping (already returns ContentItem format)
    return scrapeDOMVideos();
  }
  
  /**
   * Get video context for watch page
   * @returns {VideoContext|null}
   */
  function getVideoContext() {
    // Always refresh to get latest data (handles SPA navigation timing)
    refresh();
    
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
        // Transform raw Video objects to ContentItem format
        return videos.map(toContentItem);
      }
    }
    
    // Fallback to DOM (already returns ContentItem format)
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
