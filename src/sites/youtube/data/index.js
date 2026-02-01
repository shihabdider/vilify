// YouTube Data Provider
// Public API for the hybrid data layer
// Receives data from data-bridge.js (running in MAIN world)

import { detectPageTypeFromData } from './initial-data.js';
import { extractVideosFromData, extractVideosForPage, extractVideoContext } from './extractors.js';
import { scrapeDOMVideos, scrapeDOMVideoContext, scrapeDOMRecommendations } from './dom-fallback.js';
import { createNavigationWatcher } from './navigation.js';

// =============================================================================
// BRIDGE EVENT NAME (must match data-bridge.js)
// =============================================================================

const BRIDGE_EVENT = '__vilify_data__';

// =============================================================================
// NORMALIZATION
// =============================================================================

/**
 * Get thumbnail URL for a video ID
 */
function getThumbnailUrl(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * Transform raw Video to ContentItem format expected by the UI
 */
function toContentItem(video) {
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
 */
export function createDataProvider() {
  // Cached data from bridge
  let cachedInitialData = null;
  let cachedPlayerResponse = null;
  let cachedPageType = null;
  
  // Callbacks waiting for data
  let dataReadyCallbacks = [];
  let bridgeListenerInstalled = false;
  let navigationWatcher = null;
  
  /**
   * Handle data from the MAIN world bridge
   */
  function onBridgeData(event) {
    const { type, data } = event.detail || {};
    
    if (type === 'initialData' && data) {
      cachedInitialData = data;
      cachedPageType = detectPageTypeFromData(data);
      console.log('[Vilify] Received ytInitialData from bridge, pageType:', cachedPageType);
      notifyDataReady();
    }
    
    if (type === 'playerResponse' && data) {
      cachedPlayerResponse = data;
      console.log('[Vilify] Received playerResponse from bridge');
    }
    
    if (type === 'dataTimeout') {
      console.log('[Vilify] Bridge timeout - falling back to DOM');
      notifyDataReady(); // Let UI render with DOM fallback
    }
  }
  
  /**
   * Notify all waiting callbacks that data is ready
   */
  function notifyDataReady() {
    const callbacks = dataReadyCallbacks;
    dataReadyCallbacks = [];
    for (const cb of callbacks) {
      cb();
    }
  }
  
  /**
   * Install bridge event listener
   */
  function installBridgeListener() {
    if (bridgeListenerInstalled) return;
    document.addEventListener(BRIDGE_EVENT, onBridgeData);
    bridgeListenerInstalled = true;
    console.log('[Vilify] Bridge listener installed');
  }
  
  /**
   * Wait for data to be ready from bridge
   * @returns {Promise<void>}
   */
  function waitForData(timeout = 5000) {
    // If we already have data, resolve immediately
    if (cachedInitialData) {
      return Promise.resolve();
    }
    
    return new Promise((resolve) => {
      // Add to callback list
      dataReadyCallbacks.push(resolve);
      
      // Timeout fallback
      setTimeout(() => {
        // Remove from callbacks if still waiting
        const idx = dataReadyCallbacks.indexOf(resolve);
        if (idx !== -1) {
          dataReadyCallbacks.splice(idx, 1);
          console.log('[Vilify] waitForData timeout');
          resolve();
        }
      }, timeout);
    });
  }
  
  /**
   * Get videos for current page
   * @returns {Array<ContentItem>}
   */
  function getVideos() {
    // Try bridge data first
    if (cachedInitialData) {
      const pageType = cachedPageType || 'other';
      const videos = extractVideosForPage(cachedInitialData, pageType);
      if (videos.length > 0) {
        console.log(`[Vilify] Using bridge data (${pageType}): ${videos.length} videos`);
        const items = videos.map(v => ({ ...toContentItem(v), _source: 'bridge' }));
        return augmentDuration(items);
      }
    }
    
    // Fallback to DOM scraping
    console.log('[Vilify] Using DOM fallback');
    const items = scrapeDOMVideos();
    return items.map(item => ({ ...item, _source: 'dom' }));
  }
  
  /**
   * Augment items with DOM-scraped duration if missing
   */
  function augmentDuration(items) {
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
  
  /**
   * Get video context for watch page
   */
  function getVideoContext() {
    // Try extraction from bridge data
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
   */
  function getRecommendations() {
    if (cachedPageType === 'watch' && cachedInitialData) {
      const secondary = cachedInitialData?.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults;
      const results = secondary?.results || [];
      
      const videos = [];
      const seen = new Set();
      
      for (const item of results) {
        if (item.lockupViewModel) {
          const { extractLockupViewModel } = require('./extractors.js');
          const video = extractLockupViewModel(item.lockupViewModel);
          if (video && !seen.has(video.videoId)) {
            seen.add(video.videoId);
            videos.push(video);
          }
        }
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
        return videos.map(toContentItem);
      }
    }
    
    return scrapeDOMRecommendations();
  }
  
  /**
   * Get current page type
   */
  function getPageType() {
    return cachedPageType || 'other';
  }
  
  /**
   * Clear cached data (called on navigation)
   */
  function clearCache() {
    // Don't clear - bridge will send new data
    // Just reset page type so we re-detect
    cachedPageType = null;
  }
  
  /**
   * Start watching for navigation
   */
  function startWatching() {
    installBridgeListener();
    
    if (!navigationWatcher) {
      navigationWatcher = createNavigationWatcher(() => {
        clearCache();
      });
    }
  }
  
  /**
   * Stop watching
   */
  function stopWatching() {
    if (navigationWatcher) {
      navigationWatcher.stop();
      navigationWatcher = null;
    }
    if (bridgeListenerInstalled) {
      document.removeEventListener(BRIDGE_EVENT, onBridgeData);
      bridgeListenerInstalled = false;
    }
  }
  
  // Auto-start
  startWatching();
  
  return {
    getVideos,
    getVideoContext,
    getRecommendations,
    getPageType,
    waitForData,
    startWatching,
    stopWatching,
    // For debugging
    _getCachedData: () => ({ cachedInitialData, cachedPlayerResponse, cachedPageType }),
  };
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let dataProviderInstance = null;

/**
 * Get the singleton data provider instance
 */
export function getDataProvider() {
  if (!dataProviderInstance) {
    dataProviderInstance = createDataProvider();
  }
  return dataProviderInstance;
}

// Re-export types and utilities for convenience
export { detectPageTypeFromData } from './initial-data.js';
export { extractVideosFromData, extractVideosForPage, extractVideoContext, extractChaptersFromData } from './extractors.js';
export { createNavigationWatcher } from './navigation.js';
