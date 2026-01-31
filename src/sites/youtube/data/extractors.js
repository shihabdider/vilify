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
  
  if (content.videoRenderer) {
    return extractVideoRenderer(content.videoRenderer);
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
  
  // Typically: [channel, views, date] or [channel, "views · date"]
  const channel = parts[0] || null;
  const viewsAndDate = parts.slice(1).join(' · ');
  
  // Try to split views and date
  let views = null;
  let published = null;
  if (viewsAndDate) {
    // Common patterns: "1M views", "2 days ago"
    const viewsMatch = viewsAndDate.match(/[\d.,]+[KMB]?\s*views?/i);
    if (viewsMatch) {
      views = viewsMatch[0];
      published = viewsAndDate.replace(views, '').replace(/^[\s·]+|[\s·]+$/g, '') || null;
    } else {
      // Might just be date
      published = viewsAndDate;
    }
  }
  
  // Extract thumbnail
  const thumbPath = 'contentImage.collectionThumbnailViewModel.primaryThumbnail.thumbnailViewModel.image.sources';
  const thumbnails = get(model, thumbPath);
  
  // Also try simpler path
  const altThumbPath = 'contentImage.thumbnailViewModel.image.sources';
  const altThumbnails = get(model, altThumbPath);
  
  return {
    videoId: contentId,
    title: getText(meta.title),
    channel,
    channelUrl: null, // Not easily available in lockup format
    views,
    published,
    duration: null, // Duration in overlay, complex to extract
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
// RECURSIVE VIDEO EXTRACTION
// =============================================================================

/**
 * Recursively extract all videos from ytInitialData
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
