// YouTube Data Extractors
// Pure functions that extract Video from various YouTube renderer formats

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Safely get nested property
 * @param {Object} obj 
 * @param {string} path - Dot-separated path like 'a.b.c'
 * @returns {*}
 */
function get(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

/**
 * Get text from YouTube's text objects (runs or simpleText)
 * @param {Object} textObj - { runs: [{text}] } or { simpleText: string }
 * @returns {string|null}
 */
function getText(textObj) {
  if (!textObj) return null;
  if (typeof textObj === 'string') return textObj;
  if (textObj.simpleText) return textObj.simpleText;
  if (textObj.runs) return textObj.runs.map(r => r.text).join('');
  if (textObj.content) return textObj.content; // New format
  // Try accessibility fallback
  if (textObj.accessibility?.accessibilityData?.label) {
    return textObj.accessibility.accessibilityData.label;
  }
  return null;
}

/**
 * Get best thumbnail URL from thumbnails array
 * @param {Array} thumbnails - Array of { url, width, height }
 * @returns {string|null}
 */
function getBestThumbnail(thumbnails) {
  if (!thumbnails?.length) return null;
  // Prefer medium quality (mqdefault ~320px)
  const sorted = [...thumbnails].sort((a, b) => (a.width || 0) - (b.width || 0));
  // Find one around 320px or take the middle one
  const medium = sorted.find(t => (t.width || 0) >= 320) || sorted[Math.floor(sorted.length / 2)];
  return medium?.url || null;
}

/**
 * Format seconds to timestamp string
 * @param {number} seconds 
 * @returns {string}
 */
function formatTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Check if renderer is a Short (should be filtered out)
 * @param {Object} renderer 
 * @returns {boolean}
 */
function isShort(renderer) {
  // Shorts have reelWatchEndpoint
  if (renderer.navigationEndpoint?.reelWatchEndpoint) return true;
  // Or have /shorts/ in the URL
  const url = renderer.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url;
  if (url?.includes('/shorts/')) return true;
  return false;
}

// =============================================================================
// VIDEO RENDERER (Search results, feeds)
// =============================================================================

/**
 * Extract Video from videoRenderer
 * @param {Object} renderer - videoRenderer object
 * @returns {Video|null}
 */
export function extractVideoRenderer(renderer) {
  const videoId = renderer.videoId;
  if (!videoId) return null;
  
  // Filter Shorts
  if (isShort(renderer)) return null;
  
  // Extract channel URL from navigation endpoint
  const channelNav = renderer.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint;
  const channelUrl = channelNav?.canonicalBaseUrl || null;
  
  const title = getText(renderer.title);
  const channel = getText(renderer.ownerText) || getText(renderer.shortBylineText);
  const views = getText(renderer.viewCountText);
  const published = getText(renderer.publishedTimeText);
  
  return {
    videoId,
    title,
    channel,
    channelUrl,
    views,
    published,
    duration: getText(renderer.lengthText),
    thumbnail: getBestThumbnail(renderer.thumbnail?.thumbnails),
    _source: 'initialData',
  };
}

// =============================================================================
// COMPACT VIDEO RENDERER (Old recommendations sidebar)
// =============================================================================

/**
 * Extract Video from compactVideoRenderer
 * @param {Object} renderer - compactVideoRenderer object
 * @returns {Video|null}
 */
export function extractCompactVideoRenderer(renderer) {
  const videoId = renderer.videoId;
  if (!videoId) return null;
  
  if (isShort(renderer)) return null;
  
  const channelNav = renderer.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint;
  const channelUrl = channelNav?.canonicalBaseUrl || null;
  
  return {
    videoId,
    title: getText(renderer.title),
    channel: getText(renderer.shortBylineText) || getText(renderer.longBylineText),
    channelUrl,
    views: getText(renderer.viewCountText),
    published: getText(renderer.publishedTimeText),
    duration: getText(renderer.lengthText),
    thumbnail: getBestThumbnail(renderer.thumbnail?.thumbnails),
    _source: 'initialData',
  };
}

// =============================================================================
// GRID VIDEO RENDERER (Channel grids)
// =============================================================================

/**
 * Extract Video from gridVideoRenderer
 * @param {Object} renderer - gridVideoRenderer object
 * @returns {Video|null}
 */
export function extractGridVideoRenderer(renderer) {
  const videoId = renderer.videoId;
  if (!videoId) return null;
  
  if (isShort(renderer)) return null;
  
  return {
    videoId,
    title: getText(renderer.title),
    channel: getText(renderer.shortBylineText),
    channelUrl: null, // Grid renderers are already on channel page
    views: getText(renderer.viewCountText),
    published: getText(renderer.publishedTimeText),
    duration: getText(renderer.lengthText) || getText(renderer.thumbnailOverlays?.[0]?.thumbnailOverlayTimeStatusRenderer?.text),
    thumbnail: getBestThumbnail(renderer.thumbnail?.thumbnails),
    _source: 'initialData',
  };
}

// =============================================================================
// PLAYLIST VIDEO RENDERER
// =============================================================================

/**
 * Extract Video from playlistVideoRenderer
 * @param {Object} renderer - playlistVideoRenderer object
 * @returns {Video|null}
 */
export function extractPlaylistVideoRenderer(renderer) {
  const videoId = renderer.videoId;
  if (!videoId) return null;
  
  if (isShort(renderer)) return null;
  
  const channelNav = renderer.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint;
  const channelUrl = channelNav?.canonicalBaseUrl || null;
  
  return {
    videoId,
    title: getText(renderer.title),
    channel: getText(renderer.shortBylineText),
    channelUrl,
    views: null, // Playlist items don't show views
    published: null,
    duration: getText(renderer.lengthText),
    thumbnail: getBestThumbnail(renderer.thumbnail?.thumbnails),
    _source: 'initialData',
  };
}

// =============================================================================
// RICH ITEM RENDERER (Home feed - wraps videoRenderer)
// =============================================================================

/**
 * Extract Video from richItemRenderer
 * @param {Object} renderer - richItemRenderer object
 * @returns {Video|null}
 */
export function extractRichItemRenderer(renderer) {
  // richItemRenderer wraps content which contains the actual renderer
  const content = renderer.content;
  if (!content) return null;
  
  // Old format: videoRenderer inside content
  if (content.videoRenderer) {
    return extractVideoRenderer(content.videoRenderer);
  }
  
  // New format: lockupViewModel inside content (home page 2024+)
  if (content.lockupViewModel) {
    return extractLockupViewModel(content.lockupViewModel);
  }
  
  // Could also wrap shorts, ads, etc. - ignore those
  return null;
}

// =============================================================================
// LOCKUP VIEW MODEL (New recommendations format)
// =============================================================================

/**
 * Extract Video from lockupViewModel
 * @param {Object} model - lockupViewModel object
 * @returns {Video|null}
 */
export function extractLockupViewModel(model) {
  const contentId = model.contentId;
  if (!contentId) return null;
  

  
  // Filter out playlists/mixes (contentId starts with RD or PL)
  if (contentId.startsWith('RD') || contentId.startsWith('PL')) return null;
  
  const meta = model.metadata?.lockupMetadataViewModel;
  if (!meta) return null;
  
  // Extract metadata rows (channel, views, date)
  const rows = meta.metadata?.contentMetadataViewModel?.metadataRows || [];
  const parts = rows.flatMap(r => 
    r.metadataParts?.map(p => getText(p.text)).filter(Boolean) || []
  );
  
  // First part is usually channel, rest could be views, date, or description
  // Filter out long text (likely description) - keep only short metadata
  const channel = parts[0] || null;
  const metaParts = parts.slice(1).filter(p => p.length < 50); // Filter out descriptions
  
  // Try to extract views and date from remaining parts
  let views = null;
  let published = null;
  for (const part of metaParts) {
    // Check for view count pattern
    if (!views && part.match(/[\d.,]+[KMB]?\s*views?/i)) {
      views = part;
    }
    // Check for date patterns: "X ago", "Streamed X ago", etc.
    else if (!published && (part.match(/ago$/i) || part.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i))) {
      published = part;
    }
  }
  
  // Extract thumbnail
  const thumbPath = 'contentImage.collectionThumbnailViewModel.primaryThumbnail.thumbnailViewModel.image.sources';
  const thumbnails = get(model, thumbPath);
  
  // Also try simpler path
  const altThumbPath = 'contentImage.thumbnailViewModel.image.sources';
  const altThumbnails = get(model, altThumbPath);
  
  // Extract duration from overlays
  // YouTube uses various structures across pages, but duration is always in
  // thumbnailBadgeViewModel.text matching pattern like "1:23" or "1:23:45"
  let duration = null;
  const overlays = get(model, 'contentImage.thumbnailViewModel.overlays') || [];
  
  // Recursive search for duration in badge view models
  const DURATION_PATTERN = /^\d+:\d{2}(:\d{2})?$/;
  
  function findDurationInObject(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 10) return null;
    
    // Check if this is a thumbnailBadgeViewModel with duration text
    if (obj.thumbnailBadgeViewModel?.text) {
      const text = obj.thumbnailBadgeViewModel.text;
      if (DURATION_PATTERN.test(text)) return text;
    }
    
    // Legacy format check
    if (obj.thumbnailOverlayTimeStatusViewModel?.text || obj.thumbnailOverlayTimeStatusRenderer?.text) {
      const text = getText(obj.thumbnailOverlayTimeStatusViewModel?.text || obj.thumbnailOverlayTimeStatusRenderer?.text);
      if (text && DURATION_PATTERN.test(text)) return text;
    }
    
    // Recurse into arrays and objects
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const found = findDurationInObject(item, depth + 1);
        if (found) return found;
      }
    } else {
      for (const val of Object.values(obj)) {
        const found = findDurationInObject(val, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }
  
  duration = findDurationInObject(overlays);
  
  // Fallback: try inlinePlayerData.lengthSeconds
  if (!duration) {
    const lengthSeconds = get(model, 'inlinePlayerData.lengthSeconds');
    if (lengthSeconds) {
      duration = formatTimestamp(parseInt(lengthSeconds, 10));
    }
  }
  
  return {
    videoId: contentId,
    title: getText(meta.title),
    channel,
    channelUrl: null, // Not easily available in lockup format
    views,
    published,
    duration,
    thumbnail: getBestThumbnail(thumbnails || altThumbnails),
    _source: 'initialData',
  };
}

// =============================================================================
// CHAPTERS EXTRACTION
// =============================================================================

/**
 * Extract chapters from ytInitialData engagement panels
 * @param {Object} data - ytInitialData
 * @returns {Array<Chapter>}
 */
export function extractChaptersFromData(data) {
  const chapters = [];
  const panels = data?.engagementPanels || [];
  
  for (const panel of panels) {
    const section = panel.engagementPanelSectionListRenderer;
    if (!section) continue;
    
    const content = section.content;
    if (!content?.macroMarkersListRenderer) continue;
    
    const markers = content.macroMarkersListRenderer.contents || [];
    
    for (const marker of markers) {
      const item = marker.macroMarkersListItemRenderer;
      if (!item) continue;
      
      const title = getText(item.title);
      // Time can be in startTimeSeconds (new) or timeRangeStartMillis (old)
      const timeMs = item.onTap?.watchEndpoint?.startTimeSeconds ?? item.timeRangeStartMillis;
      
      if (!title || timeMs === undefined) continue;
      
      const time = Math.floor(timeMs / 1000);
      
      chapters.push({
        title,
        time,
        timeText: formatTimestamp(time),
        thumbnailUrl: getBestThumbnail(item.thumbnail?.thumbnails),
      });
    }
  }
  
  return chapters;
}

// =============================================================================
// VIDEO CONTEXT (Watch page)
// =============================================================================

/**
 * Extract VideoContext from parsed data
 * @param {Object} initialData - ytInitialData
 * @param {Object|null} playerResponse - ytInitialPlayerResponse
 * @returns {VideoContext|null}
 */
export function extractVideoContext(initialData, playerResponse) {
  // Must be watch page
  if (!initialData?.contents?.twoColumnWatchNextResults) {
    return null;
  }
  
  const videoDetails = playerResponse?.videoDetails;
  if (!videoDetails?.videoId) {
    return null;
  }
  
  // Extract chapters
  const chapters = extractChaptersFromData(initialData);
  
  // Format view count with commas
  let views = null;
  if (videoDetails.viewCount) {
    const count = parseInt(videoDetails.viewCount, 10);
    views = count.toLocaleString() + ' views';
  }
  
  // Try to get upload date from primary info
  let uploadDate = null;
  const primary = initialData?.contents?.twoColumnWatchNextResults?.results?.results?.contents;
  if (primary) {
    for (const content of primary) {
      const dateText = content?.videoPrimaryInfoRenderer?.dateText;
      if (dateText) {
        uploadDate = getText(dateText);
        break;
      }
    }
  }
  
  return {
    videoId: videoDetails.videoId,
    title: videoDetails.title || null,
    channelName: videoDetails.author || null,
    channel: videoDetails.author || null, // Alias for compatibility
    channelUrl: videoDetails.channelId ? `/channel/${videoDetails.channelId}` : null,
    description: videoDetails.shortDescription || '',
    chapters,
    duration: parseInt(videoDetails.lengthSeconds, 10) || 0,
    currentTime: 0, // Will be updated from video element
    views,
    uploadDate,
    keywords: videoDetails.keywords || [],
    isSubscribed: false, // Need DOM for this
    paused: true, // Will be updated from video element
    playbackRate: 1,
    _source: 'playerResponse',
  };
}

// =============================================================================
// PAGE-SPECIFIC EXTRACTORS
// =============================================================================

/**
 * Extract videos for a specific page type from data.
 * Uses targeted paths instead of recursive walk for better reliability.
 * 
 * @param {Object} data - ytInitialData or API response
 * @param {string} pageType - Current page type
 * @returns {Array<Video>}
 */
export function extractVideosForPage(data, pageType) {
  switch (pageType) {
    case 'home':
      return extractHomeVideos(data);
    case 'search':
      return extractSearchVideos(data);
    case 'channel':
      return extractChannelVideos(data);
    case 'subscriptions':
      return extractSubscriptionsVideos(data);
    case 'playlist':
      return extractPlaylistVideos(data);
    case 'history':
    case 'library':
      return extractHistoryVideos(data);
    case 'watch':
      return extractWatchRecommendations(data);
    default:
      // Fallback to recursive for unknown pages
      return extractVideosFromData(data);
  }
}

/**
 * Extract videos from home page data.
 * Path: contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.richGridRenderer.contents
 * 
 * @param {Object} data
 * @returns {Array<Video>}
 */
function extractHomeVideos(data) {
  const videos = [];
  const seen = new Set();
  
  // Primary path for home page
  const tabs = get(data, 'contents.twoColumnBrowseResultsRenderer.tabs') || [];
  for (const tab of tabs) {
    const contents = get(tab, 'tabRenderer.content.richGridRenderer.contents') || [];
    extractFromContents(contents, videos, seen);
  }
  
  // Also check singleColumnBrowseResultsRenderer (mobile/alternate layout)
  const singleTabs = get(data, 'contents.singleColumnBrowseResultsRenderer.tabs') || [];
  for (const tab of singleTabs) {
    const contents = get(tab, 'tabRenderer.content.sectionListRenderer.contents') || [];
    extractFromContents(contents, videos, seen);
  }
  
  // If still no videos, try recursive fallback on home page
  if (videos.length === 0) {
    return extractVideosFromData(data);
  }
  
  return videos;
}

/**
 * Extract videos from search results.
 * Path: contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents
 * 
 * @param {Object} data
 * @returns {Array<Video>}
 */
function extractSearchVideos(data) {
  const videos = [];
  const seen = new Set();
  
  // Primary path for search
  const sections = get(data, 'contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents') || [];
  
  for (const section of sections) {
    // itemSectionRenderer contains the actual results
    const items = get(section, 'itemSectionRenderer.contents') || [];
    extractFromContents(items, videos, seen);
  }
  
  return videos;
}

/**
 * Extract videos from channel page.
 * Find "Videos" or "Home" tab, then extract from richGridRenderer.
 * 
 * @param {Object} data
 * @returns {Array<Video>}
 */
function extractChannelVideos(data) {
  const videos = [];
  const seen = new Set();
  
  const tabs = get(data, 'contents.twoColumnBrowseResultsRenderer.tabs') || [];
  
  for (const tab of tabs) {
    const tabTitle = get(tab, 'tabRenderer.title');
    const isSelected = get(tab, 'tabRenderer.selected');
    
    // Extract from selected tab or Videos/Home tabs
    if (isSelected || tabTitle === 'Videos' || tabTitle === 'Home') {
      // Rich grid (modern layout)
      const richContents = get(tab, 'tabRenderer.content.richGridRenderer.contents') || [];
      extractFromContents(richContents, videos, seen);
      
      // Section list (alternate layout)
      const sectionContents = get(tab, 'tabRenderer.content.sectionListRenderer.contents') || [];
      for (const section of sectionContents) {
        const items = get(section, 'itemSectionRenderer.contents') || [];
        extractFromContents(items, videos, seen);
        
        // Shelf renderer (featured videos)
        const shelfItems = get(section, 'shelfRenderer.content.horizontalListRenderer.items') || [];
        extractFromContents(shelfItems, videos, seen);
      }
    }
  }
  
  return videos;
}

/**
 * Extract videos from subscriptions page.
 * 
 * @param {Object} data
 * @returns {Array<Video>}
 */
function extractSubscriptionsVideos(data) {
  const videos = [];
  const seen = new Set();
  
  const tabs = get(data, 'contents.twoColumnBrowseResultsRenderer.tabs') || [];
  
  for (const tab of tabs) {
    // Rich grid layout
    const richContents = get(tab, 'tabRenderer.content.richGridRenderer.contents') || [];
    extractFromContents(richContents, videos, seen);
    
    // Section list layout
    const sectionContents = get(tab, 'tabRenderer.content.sectionListRenderer.contents') || [];
    for (const section of sectionContents) {
      const items = get(section, 'itemSectionRenderer.contents') || [];
      extractFromContents(items, videos, seen);
    }
  }
  
  return videos;
}

/**
 * Extract videos from playlist page.
 * 
 * @param {Object} data
 * @returns {Array<Video>}
 */
function extractPlaylistVideos(data) {
  const videos = [];
  const seen = new Set();
  
  const tabs = get(data, 'contents.twoColumnBrowseResultsRenderer.tabs') || [];
  
  for (const tab of tabs) {
    const sectionContents = get(tab, 'tabRenderer.content.sectionListRenderer.contents') || [];
    
    for (const section of sectionContents) {
      // Playlist video list
      const playlistItems = get(section, 'playlistVideoListRenderer.contents') ||
                           get(section, 'itemSectionRenderer.contents') || [];
      extractFromContents(playlistItems, videos, seen);
    }
  }
  
  return videos;
}

/**
 * Extract videos from history/library pages.
 * 
 * @param {Object} data
 * @returns {Array<Video>}
 */
function extractHistoryVideos(data) {
  const videos = [];
  const seen = new Set();
  
  const tabs = get(data, 'contents.twoColumnBrowseResultsRenderer.tabs') || [];
  
  for (const tab of tabs) {
    const sectionContents = get(tab, 'tabRenderer.content.sectionListRenderer.contents') || [];
    
    for (const section of sectionContents) {
      const items = get(section, 'itemSectionRenderer.contents') || [];
      extractFromContents(items, videos, seen);
    }
  }
  
  return videos;
}

/**
 * Extract videos from a contents array (shared helper).
 * Handles all renderer types.
 * 
 * @param {Array} contents - Array of content items
 * @param {Array<Video>} videos - Output array
 * @param {Set<string>} seen - Deduplication set
 */
function extractFromContents(contents, videos, seen) {
  for (const item of contents) {
    let video = null;
    
    // Handle wrapper types that contain nested content arrays
    if (item.itemSectionRenderer?.contents) {
      extractFromContents(item.itemSectionRenderer.contents, videos, seen);
      continue;
    }
    if (item.richSectionRenderer?.content?.richShelfRenderer?.contents) {
      extractFromContents(item.richSectionRenderer.content.richShelfRenderer.contents, videos, seen);
      continue;
    }
    
    // Check each renderer type
    if (item.videoRenderer) {
      video = extractVideoRenderer(item.videoRenderer);
    } else if (item.compactVideoRenderer) {
      video = extractCompactVideoRenderer(item.compactVideoRenderer);
    } else if (item.gridVideoRenderer) {
      video = extractGridVideoRenderer(item.gridVideoRenderer);
    } else if (item.playlistVideoRenderer) {
      video = extractPlaylistVideoRenderer(item.playlistVideoRenderer);
    } else if (item.richItemRenderer) {
      video = extractRichItemRenderer(item.richItemRenderer);
    } else if (item.lockupViewModel) {
      video = extractLockupViewModel(item.lockupViewModel);
    }
    // Also handle nested lockupViewModel in shortsLockupViewModel etc
    else if (item.shortsLockupViewModel) {
      // Skip shorts
    }
    
    if (video && !seen.has(video.videoId)) {
      seen.add(video.videoId);
      videos.push(video);
    }
    
    // Recurse into continuation items (but not too deep)
    if (item.continuationItemRenderer) {
      // Skip - these are "load more" triggers, not content
    }
  }
}

// =============================================================================
// WATCH PAGE RECOMMENDATIONS
// =============================================================================

/**
 * Extract recommended videos from watch page sidebar.
 * Path: contents.twoColumnWatchNextResults.secondaryResults.secondaryResults.results
 * 
 * @param {Object} data - ytInitialData
 * @returns {Array<Video>}
 */
function extractWatchRecommendations(data) {
  const videos = [];
  const seen = new Set();
  
  // Primary path for watch page recommendations
  const secondary = get(data, 'contents.twoColumnWatchNextResults.secondaryResults.secondaryResults');
  const results = secondary?.results || [];
  
  extractFromContents(results, videos, seen);
  
  // Also check for autoplay video
  const autoplay = get(data, 'contents.twoColumnWatchNextResults.autoplay.autoplay.sets');
  if (autoplay) {
    for (const set of autoplay) {
      const autoplayItems = set?.autoplayVideo ? [set.autoplayVideo] : [];
      extractFromContents(autoplayItems, videos, seen);
    }
  }
  
  return videos;
}

// =============================================================================
// RECURSIVE VIDEO EXTRACTION (FALLBACK)
// =============================================================================

/**
 * Recursively extract all videos from ytInitialData.
 * Used as fallback when page-specific extractor doesn't match.
 * 
 * @param {Object} data - ytInitialData or any nested object
 * @returns {Array<Video>}
 */
export function extractVideosFromData(data) {
  const videos = [];
  const seen = new Set();
  
  function walk(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 20) return;
    
    // Check for renderer types
    if (obj.videoRenderer) {
      const video = extractVideoRenderer(obj.videoRenderer);
      if (video && !seen.has(video.videoId)) {
        seen.add(video.videoId);
        videos.push(video);
      }
    }
    
    if (obj.compactVideoRenderer) {
      const video = extractCompactVideoRenderer(obj.compactVideoRenderer);
      if (video && !seen.has(video.videoId)) {
        seen.add(video.videoId);
        videos.push(video);
      }
    }
    
    if (obj.gridVideoRenderer) {
      const video = extractGridVideoRenderer(obj.gridVideoRenderer);
      if (video && !seen.has(video.videoId)) {
        seen.add(video.videoId);
        videos.push(video);
      }
    }
    
    if (obj.playlistVideoRenderer) {
      const video = extractPlaylistVideoRenderer(obj.playlistVideoRenderer);
      if (video && !seen.has(video.videoId)) {
        seen.add(video.videoId);
        videos.push(video);
      }
    }
    
    if (obj.richItemRenderer) {
      const video = extractRichItemRenderer(obj.richItemRenderer);
      if (video && !seen.has(video.videoId)) {
        seen.add(video.videoId);
        videos.push(video);
      }
    }
    
    if (obj.lockupViewModel) {
      const video = extractLockupViewModel(obj.lockupViewModel);
      if (video && !seen.has(video.videoId)) {
        seen.add(video.videoId);
        videos.push(video);
      }
    }
    
    // Recurse into arrays and objects
    if (Array.isArray(obj)) {
      for (const item of obj) {
        walk(item, depth + 1);
      }
    } else {
      for (const val of Object.values(obj)) {
        walk(val, depth + 1);
      }
    }
  }
  
  walk(data);
  return videos;
}
