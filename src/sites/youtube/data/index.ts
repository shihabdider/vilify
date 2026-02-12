// YouTube Data Provider
// Public API for the hybrid data layer
// Receives data from data-bridge.js (running in MAIN world)

import type { ContentItem, VideoContext } from '../../../types';
import type { RawVideo } from './extractors';
import type { NavigationWatcherHandle } from './navigation';
import { detectPageTypeFromData } from './initial-data';
import { extractVideosFromData, extractVideosForPage, extractVideoContext } from './extractors';
import { scrapeDOMVideos, scrapeDOMVideoContext, scrapeDOMRecommendations } from './dom-fallback';
import { createNavigationWatcher } from './navigation';

// =============================================================================
// BRIDGE EVENT NAME (must match data-bridge.js)
// =============================================================================

const BRIDGE_EVENT = '__vilify_data__';

// =============================================================================
// DATA PROVIDER INTERFACE
// =============================================================================

/** Public interface for the YouTube data provider */
export interface DataProvider {
  getVideos: () => ContentItem[];
  getVideoContext: () => VideoContext | null;
  getRecommendations: () => ContentItem[];
  getPageType: () => string;
  waitForData: (timeout?: number) => Promise<void>;
  waitForWatchData: (onReady: () => void, timeout?: number) => void;
  startWatching: () => void;
  stopWatching: () => void;
  _getCachedData: () => { cachedInitialData: any; cachedPlayerResponse: any; cachedPageType: string | null };
}

// =============================================================================
// NORMALIZATION
// =============================================================================

/**
 * Get thumbnail URL for a video ID
 */
function getThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * Transform raw Video to ContentItem format expected by the UI
 */
function toContentItem(video: RawVideo): ContentItem {
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
export function createDataProvider(): DataProvider {
  // Cached data from bridge
  let cachedInitialData: any = null;
  let cachedPlayerResponse: any = null;
  let cachedPageType: string | null = null;
  let cachedContinuationVideos: RawVideo[] = []; // Videos from lazy load continuations
  
  // Callbacks waiting for data
  let dataReadyCallbacks: Array<() => void> = [];
  let bridgeListenerInstalled: boolean = false;
  let navigationWatcher: NavigationWatcherHandle | null = null;
  
  // Callbacks waiting for player response (watch pages)
  let playerResponseCallbacks: Array<() => void> = [];
  
  /**
   * Handle data from the MAIN world bridge
   */
  function onBridgeData(event: any): void {
    const { type, data } = event.detail || {};
    
    if (type === 'initialData' && data) {
      cachedInitialData = data;
      cachedPageType = detectPageTypeFromData(data);
      notifyDataReady();
    }
    
    if (type === 'playerResponse' && data) {
      cachedPlayerResponse = data;
      // Notify any callbacks waiting for player response
      notifyPlayerResponseReady();
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
  function extractVideosFromContinuation(data: any): RawVideo[] {
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
  function extractVideoFromRenderer(item: any): RawVideo | null {
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
  function notifyDataReady(): void {
    const callbacks = dataReadyCallbacks;
    dataReadyCallbacks = [];
    for (const cb of callbacks) {
      cb();
    }
  }
  
  /**
   * Notify all waiting callbacks that player response is ready
   */
  function notifyPlayerResponseReady(): void {
    const callbacks = playerResponseCallbacks;
    playerResponseCallbacks = [];
    for (const cb of callbacks) {
      cb();
    }
  }
  
  /**
   * Install bridge event listener
   */
  function installBridgeListener(): void {
    if (bridgeListenerInstalled) return;
    document.addEventListener(BRIDGE_EVENT, onBridgeData);
    bridgeListenerInstalled = true;
  }
  
  /**
   * Wait for data to be ready from bridge
   * @returns {Promise<void>}
   */
  function waitForData(timeout: number = 5000): Promise<void> {
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
   * Wait for watch page data (both initialData and playerResponse)
   * @param {Function} onReady - Callback when data is ready
   * @param {number} timeout - Timeout in ms
   */
  function waitForWatchData(onReady: () => void, timeout: number = 2000): void {
    // If we already have both, call immediately
    if (cachedInitialData && cachedPlayerResponse) {
      onReady();
      return;
    }
    
    let resolved = false;
    const resolve = () => {
      if (resolved) return;
      resolved = true;
      onReady();
    };
    
    // Wait for player response if we don't have it
    if (!cachedPlayerResponse) {
      playerResponseCallbacks.push(resolve);
    }
    
    // Also wait for initial data if missing
    if (!cachedInitialData) {
      dataReadyCallbacks.push(resolve);
    }
    
    // Timeout fallback - render with whatever we have
    setTimeout(resolve, timeout);
  }
  
  /**
   * Get videos for current page
   * Combines initial bridge data with continuation data from lazy loading
   * @returns {Array<ContentItem>}
   */
  function getVideos(): ContentItem[] {
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
  function augmentDuration(items: ContentItem[]): ContentItem[] {
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
  function getVideoContext(): VideoContext | null {
    // Try extraction from bridge data
    if (cachedInitialData && cachedPlayerResponse) {
      const ctx = extractVideoContext(cachedInitialData, cachedPlayerResponse);
      if (ctx) {
        // Augment with live video element data
        const videoEl = document.querySelector('video.html5-main-video') as HTMLVideoElement | null;
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
  function getRecommendations(): ContentItem[] {
    // Check if we're on watch page (from cache or URL)
    const isWatchPage = cachedPageType === 'watch' || window.location.pathname === '/watch';
    
    if (isWatchPage && cachedInitialData) {
      const videos = extractVideosForPage(cachedInitialData, 'watch');
      if (videos.length > 0) {
        return videos.map(toContentItem);
      }
    }
    
    // Fallback to DOM scraping
    return scrapeDOMRecommendations();
  }
  
  /**
   * Get current page type
   */
  function getPageType(): string {
    return cachedPageType || 'other';
  }
  
  /**
   * Clear cached data (called on navigation)
   */
  function clearCache(): void {
    // Don't clear initial data - bridge will send new data
    // Reset page type so we re-detect, and clear continuation cache
    cachedPageType = null;
    cachedContinuationVideos = [];
  }
  
  /**
   * Start watching for navigation
   */
  function startWatching(): void {
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
  function stopWatching(): void {
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
    waitForWatchData,
    startWatching,
    stopWatching,
    // For debugging
    _getCachedData: () => ({ cachedInitialData, cachedPlayerResponse, cachedPageType }),
  };
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let dataProviderInstance: DataProvider | null = null;

/**
 * Get the singleton data provider instance
 */
export function getDataProvider(): DataProvider {
  if (!dataProviderInstance) {
    dataProviderInstance = createDataProvider();
  }
  return dataProviderInstance;
}

// Re-export types and utilities for convenience
export { detectPageTypeFromData } from './initial-data';
export { extractVideosFromData, extractVideosForPage, extractVideoContext, extractChaptersFromData } from './extractors';
export { createNavigationWatcher } from './navigation';
