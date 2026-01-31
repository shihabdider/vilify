// ==UserScript==
// @name         Vilify Data Interception Spike
// @namespace    https://github.com/user1/vilify
// @version      0.1.0
// @description  Explore YouTube data interception for scraping engine
// @author       user1
// @match        https://www.youtube.com/*
// @match        https://youtube.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  // =============================================================================
  // DATA STORE
  // =============================================================================
  
  window.__vilifySpike = {
    initialData: null,
    playerResponse: null,
    apiResponses: [],
    videos: new Map(),
    chapters: [],
  };

  const store = window.__vilifySpike;

  // =============================================================================
  // FETCH INTERCEPTION
  // =============================================================================

  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    
    if (url && url.includes('/youtubei/v1/')) {
      try {
        const clone = response.clone();
        const data = await clone.json();
        
        const endpoint = url.match(/\/youtubei\/v1\/(\w+)/)?.[1] || 'unknown';
        
        store.apiResponses.push({
          endpoint,
          url,
          timestamp: Date.now(),
          data,
        });
        
        console.log(`[Vilify Spike] Intercepted /youtubei/v1/${endpoint}`, {
          url,
          dataKeys: Object.keys(data),
          data,
        });
        
        // Process specific endpoints
        if (endpoint === 'browse' || endpoint === 'search') {
          extractVideosFromResponse(data, endpoint);
        }
        if (endpoint === 'next') {
          extractRecommendationsFromResponse(data);
        }
        if (endpoint === 'player') {
          extractPlayerData(data);
        }
      } catch (e) {
        // Not JSON or other error, ignore
      }
    }
    
    return response;
  };

  // =============================================================================
  // INITIAL DATA EXTRACTION
  // =============================================================================

  function extractInitialData() {
    // Method 1: window.ytInitialData (if accessible)
    if (window.ytInitialData) {
      store.initialData = window.ytInitialData;
      console.log('[Vilify Spike] Found window.ytInitialData', {
        keys: Object.keys(store.initialData),
        data: store.initialData,
      });
      processInitialData(store.initialData);
      return;
    }

    // Method 2: Parse from script tag
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent;
      
      // ytInitialData
      if (text.includes('ytInitialData')) {
        const match = text.match(/var\s+ytInitialData\s*=\s*({.+?});/s);
        if (match) {
          try {
            store.initialData = JSON.parse(match[1]);
            console.log('[Vilify Spike] Parsed ytInitialData from script', {
              keys: Object.keys(store.initialData),
              data: store.initialData,
            });
            processInitialData(store.initialData);
          } catch (e) {
            console.error('[Vilify Spike] Failed to parse ytInitialData', e);
          }
        }
      }
      
      // ytInitialPlayerResponse
      if (text.includes('ytInitialPlayerResponse')) {
        const match = text.match(/var\s+ytInitialPlayerResponse\s*=\s*({.+?});/s);
        if (match) {
          try {
            store.playerResponse = JSON.parse(match[1]);
            console.log('[Vilify Spike] Parsed ytInitialPlayerResponse from script', {
              keys: Object.keys(store.playerResponse),
              data: store.playerResponse,
            });
            extractPlayerData(store.playerResponse);
          } catch (e) {
            console.error('[Vilify Spike] Failed to parse ytInitialPlayerResponse', e);
          }
        }
      }
    }
  }

  // =============================================================================
  // DATA PROCESSORS
  // =============================================================================

  function processInitialData(data) {
    const pageType = detectPageType(data);
    console.log('[Vilify Spike] Page type:', pageType);
    
    // Extract videos based on page type
    const videos = extractVideosFromInitialData(data);
    console.log(`[Vilify Spike] Extracted ${videos.length} videos from initial data`, videos);
    
    videos.forEach(v => store.videos.set(v.videoId, v));
  }

  function detectPageType(data) {
    // Check for various page indicators
    if (data.contents?.twoColumnWatchNextResults) return 'watch';
    if (data.contents?.twoColumnBrowseResultsRenderer) {
      const tabs = data.contents.twoColumnBrowseResultsRenderer.tabs;
      if (tabs?.some(t => t.tabRenderer?.title === 'Home')) return 'channel';
      return 'browse';
    }
    if (data.contents?.twoColumnSearchResultsRenderer) return 'search';
    if (data.contents?.singleColumnBrowseResultsRenderer) return 'single-column';
    return 'unknown';
  }

  function extractVideosFromInitialData(data) {
    const videos = [];
    
    // Recursively find video renderers
    findVideoRenderers(data, videos);
    
    return videos;
  }

  function findVideoRenderers(obj, results, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 20) return;
    
    // Check for video renderer types
    const rendererTypes = [
      'videoRenderer',
      'compactVideoRenderer', 
      'gridVideoRenderer',
      'playlistVideoRenderer',
      'richItemRenderer',
      'reelItemRenderer',
    ];
    
    for (const type of rendererTypes) {
      if (obj[type]) {
        const video = extractVideoFromRenderer(obj[type], type);
        if (video) {
          results.push(video);
        }
      }
    }
    
    // Also check richItemRenderer -> content -> videoRenderer
    if (obj.richItemRenderer?.content?.videoRenderer) {
      const video = extractVideoFromRenderer(obj.richItemRenderer.content.videoRenderer, 'videoRenderer');
      if (video) {
        results.push(video);
      }
    }
    
    // Recurse into arrays and objects
    if (Array.isArray(obj)) {
      obj.forEach(item => findVideoRenderers(item, results, depth + 1));
    } else {
      Object.values(obj).forEach(val => findVideoRenderers(val, results, depth + 1));
    }
  }

  function extractVideoFromRenderer(renderer, type) {
    try {
      const videoId = renderer.videoId;
      if (!videoId) return null;
      
      // Skip Shorts
      if (renderer.navigationEndpoint?.reelWatchEndpoint) return null;
      
      const title = renderer.title?.runs?.[0]?.text || 
                    renderer.title?.simpleText ||
                    renderer.headline?.runs?.[0]?.text;
      
      const channelName = renderer.ownerText?.runs?.[0]?.text ||
                          renderer.shortBylineText?.runs?.[0]?.text ||
                          renderer.longBylineText?.runs?.[0]?.text;
      
      const channelUrl = renderer.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl ||
                         renderer.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl;
      
      const viewCount = renderer.viewCountText?.simpleText ||
                        renderer.viewCountText?.runs?.map(r => r.text).join('');
      
      const publishedTime = renderer.publishedTimeText?.simpleText ||
                            renderer.publishedTimeText?.runs?.[0]?.text;
      
      const duration = renderer.lengthText?.simpleText ||
                       renderer.lengthText?.runs?.[0]?.text;
      
      const thumbnail = renderer.thumbnail?.thumbnails?.slice(-1)[0]?.url;
      
      return {
        videoId,
        title,
        channelName,
        channelUrl,
        viewCount,
        publishedTime,
        duration,
        thumbnail,
        _source: type,
      };
    } catch (e) {
      console.error('[Vilify Spike] Error extracting video', e, renderer);
      return null;
    }
  }

  function extractVideosFromResponse(data, endpoint) {
    const videos = [];
    findVideoRenderers(data, videos);
    console.log(`[Vilify Spike] Extracted ${videos.length} videos from ${endpoint} response`, videos);
    videos.forEach(v => store.videos.set(v.videoId, v));
  }

  function extractRecommendationsFromResponse(data) {
    const videos = [];
    findVideoRenderers(data, videos);
    console.log(`[Vilify Spike] Extracted ${videos.length} recommendations`, videos);
    videos.forEach(v => store.videos.set(v.videoId, v));
  }

  function extractPlayerData(data) {
    // Extract chapters from player response
    const chapters = [];
    
    const markers = data.videoDetails?.markers ||
                    data.playerOverlays?.playerOverlayRenderer?.decoratedPlayerBarRenderer?.
                      decoratedPlayerBarRenderer?.playerBar?.multiMarkersPlayerBarRenderer?.
                      markersMap;
    
    if (markers) {
      console.log('[Vilify Spike] Found markers in player response', markers);
    }
    
    // Chapters can be in different places
    const chapterData = data.engagementPanels?.find(p => 
      p.engagementPanelSectionListRenderer?.content?.macroMarkersListRenderer
    );
    
    if (chapterData) {
      const chapterList = chapterData.engagementPanelSectionListRenderer.content.macroMarkersListRenderer.contents;
      chapterList?.forEach(item => {
        const marker = item.macroMarkersListItemRenderer;
        if (marker) {
          chapters.push({
            title: marker.title?.simpleText || marker.title?.runs?.[0]?.text,
            timeRangeStartMillis: marker.timeRangeStartMillis,
            time: Math.floor(marker.timeRangeStartMillis / 1000),
            thumbnail: marker.thumbnail?.thumbnails?.slice(-1)[0]?.url,
          });
        }
      });
    }
    
    if (chapters.length > 0) {
      store.chapters = chapters;
      console.log('[Vilify Spike] Extracted chapters from player response', chapters);
    }
    
    // Also log video details
    if (data.videoDetails) {
      console.log('[Vilify Spike] Video details', {
        videoId: data.videoDetails.videoId,
        title: data.videoDetails.title,
        channelId: data.videoDetails.channelId,
        shortDescription: data.videoDetails.shortDescription?.substring(0, 200),
        lengthSeconds: data.videoDetails.lengthSeconds,
        keywords: data.videoDetails.keywords,
        viewCount: data.videoDetails.viewCount,
        author: data.videoDetails.author,
      });
    }
  }

  // =============================================================================
  // SPA NAVIGATION HANDLING
  // =============================================================================

  let lastUrl = location.href;
  
  // Watch for URL changes (YouTube SPA)
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log('[Vilify Spike] URL changed to:', lastUrl);
      // Re-extract initial data after navigation
      setTimeout(extractInitialData, 500);
    }
  });

  // =============================================================================
  // CONSOLE HELPERS
  // =============================================================================

  window.__vilifyHelpers = {
    // Get all collected videos
    getVideos: () => Array.from(store.videos.values()),
    
    // Get chapters
    getChapters: () => store.chapters,
    
    // Get raw initial data
    getInitialData: () => store.initialData,
    
    // Get all API responses
    getApiResponses: () => store.apiResponses,
    
    // Clear collected data
    clear: () => {
      store.videos.clear();
      store.chapters = [];
      store.apiResponses = [];
      console.log('[Vilify Spike] Data cleared');
    },
    
    // Summary
    summary: () => {
      console.log('[Vilify Spike] Summary:', {
        videosCollected: store.videos.size,
        chaptersFound: store.chapters.length,
        apiCallsIntercepted: store.apiResponses.length,
        endpoints: [...new Set(store.apiResponses.map(r => r.endpoint))],
      });
    },
  };

  // =============================================================================
  // INITIALIZATION
  // =============================================================================

  // Wait for DOM ready, then extract initial data
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      extractInitialData();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    extractInitialData();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  console.log('[Vilify Spike] Data interception initialized. Helpers available at window.__vilifyHelpers');
  console.log('[Vilify Spike] Commands: __vilifyHelpers.getVideos(), .getChapters(), .summary(), .getApiResponses()');

})();
