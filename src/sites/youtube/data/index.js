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
  let cachedContinuationVideos = []; // Videos from lazy load continuations
  
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
      notifyDataReady();
    }
    
    if (type === 'playerResponse' && data) {
      cachedPlayerResponse = data;
    }
    
    if (type === 'continuationData' && data) {
      // Extract videos from continuation response and add to cache
      const newVideos = extractVideosFromContinuation(data);
      if (newVideos.length > 0) {
        cachedContinuationVideos = [...cachedContinuationVideos, ...newVideos];
      }
    }
    
    if (type === 'dataTimeout') {
      notifyDataReady(); // Let UI render with DOM fallback
    }
  }
  
  /**
   * Extract videos from continuation response
   */
  function extractVideosFromContinuation(data) {
    const videos = [];
    
    // Handle onResponseReceivedActions format (common for browse continuations)
    if (data.onResponseReceivedActions) {
      for (const action of data.onResponseReceivedActions) {
        const items = action.appendContinuationItemsAction?.continuationItems || 
                      action.reloadContinuationItemsCommand?.continuationItems || [];
        for (const item of items) {
          const extracted = extractVideoFromRenderer(item);
          if (extracted) videos.push(extracted);
        }
      }
    }
    
    // Handle continuationContents format
    if (data.continuationContents) {
      const contents = data.continuationContents;
      const items = contents.richGridContinuation?.contents ||
                    contents.gridContinuation?.items ||
                    contents.sectionListContinuation?.contents || [];
      for (const item of items) {
        const extracted = extractVideoFromRenderer(item);
        if (extracted) videos.push(extracted);
      }
    }
    
    return videos;
  }
  
  /**
   * Extract a video from various renderer types
   */
  function extractVideoFromRenderer(item) {
    // Rich item renderer (home, channel)
    const richContent = item.richItemRenderer?.content;
    const renderer = richContent?.videoRenderer || 
                     item.gridVideoRenderer || 
                     item.videoRenderer ||
                     item.compactVideoRenderer;
    
    if (!renderer?.videoId) return null;
    
    return {
      videoId: renderer.videoId,
      title: renderer.title?.runs?.[0]?.text || renderer.title?.simpleText || '',
      channel: renderer.ownerText?.runs?.[0]?.text || renderer.shortBylineText?.runs?.[0]?.text || '',
      channelUrl: renderer.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl ||
                  renderer.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl || null,
      views: renderer.viewCountText?.simpleText || renderer.viewCountText?.runs?.[0]?.text || null,
      published: renderer.publishedTimeText?.simpleText || null,
      duration: renderer.lengthText?.simpleText || null,
      thumbnail: renderer.thumbnail?.thumbnails?.[0]?.url || null,
    };
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
          resolve();
        }
      }, timeout);
    });
  }
  
  /**
   * Get videos for current page
   * Combines initial bridge data with continuation data from lazy loading
   * @returns {Array<ContentItem>}
   */
  function getVideos() {
    // Try bridge data first
    if (cachedInitialData) {
      const pageType = cachedPageType || 'other';
      const initialVideos = extractVideosForPage(cachedInitialData, pageType);
      
      if (initialVideos.length > 0) {
        // Combine initial videos with continuation videos
        const allVideos = [...initialVideos, ...cachedContinuationVideos];
        
        // Dedupe by videoId
        const seen = new Set();
        const uniqueVideos = allVideos.filter(v => {
          if (seen.has(v.videoId)) return false;
          seen.add(v.videoId);
          return true;
        });
        
        const items = uniqueVideos.map(v => ({ ...toContentItem(v), _source: 'bridge' }));
        // Duration now extracted directly from API data (see extractors.js extractLockupViewModel)
        // No need for slow DOM augmentation
        return items;
      }
    }
    
    // Fallback to DOM scraping
    const domItems = scrapeDOMVideos();
    return domItems.map(item => ({ ...item, _source: 'dom' }));
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
        
        // Always get isSubscribed from DOM (not available in ytInitialData)
        const subBtn = document.querySelector('ytd-subscribe-button-renderer button');
        const subLabel = subBtn?.getAttribute('aria-label') || '';
        ctx.isSubscribed = subLabel.toLowerCase().includes('unsubscribe');
        
        return ctx;
      }
    }
    
    // Fallback to DOM scraping
    return scrapeDOMVideoContext();
  }
  
  /**
   * Get recommended videos (watch page sidebar)
   * Uses extractVideosForPage with 'watch' page type
   */
  function getRecommendations() {
    // Check if we're on watch page (from cache or URL)
    const isWatchPage = cachedPageType === 'watch' || window.location.pathname === '/watch';
    
    console.log('[Vilify] getRecommendations:', { isWatchPage, hasCachedData: !!cachedInitialData, cachedPageType });
    
    if (isWatchPage && cachedInitialData) {
      const videos = extractVideosForPage(cachedInitialData, 'watch');
      console.log('[Vilify] API extraction returned:', videos.length, 'videos');
      if (videos.length > 0) {
        const items = videos.map(toContentItem);
        console.log('[Vilify] Returning API items:', items.length, items[0]);
        return items;
      }
    }
    
    // Fallback to DOM scraping
    const domItems = scrapeDOMRecommendations();
    console.log('[Vilify] DOM fallback returned:', domItems.length, 'items', domItems[0]);
    return domItems;
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
    // Don't clear initial data - bridge will send new data
    // Reset page type so we re-detect, and clear continuation cache
    cachedPageType = null;
    cachedContinuationVideos = [];
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
