// YouTube scrapers
// Implements video, chapter, and comment scraping using verified DOM selectors

import type { Chapter, ContentItem } from '../../types';

/** Raw video data scraped from DOM before transformation to ContentItem */
interface ScrapedVideo {
  videoId: string;
  title: string | undefined;
  channel: string | undefined;
  channelUrl: string | null | undefined;
  views: string | null | undefined;
  uploadDate: string | null | undefined;
  duration: string | null;
}

/** A single scraped comment */
export interface ScrapedComment {
  author: string;
  text: string;
}

/** Result from getComments() */
export interface CommentsResult {
  comments: ScrapedComment[];
  status: 'loading' | 'disabled' | 'loaded';
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract video ID from a YouTube URL
 * @param {string} url - YouTube URL (full or relative)
 * @returns {string|null} Video ID or null if not found
 * 
 * Examples:
 *   extractVideoId('/watch?v=abc123') => 'abc123'
 *   extractVideoId('https://youtube.com/watch?v=xyz&t=10') => 'xyz'
 *   extractVideoId('/shorts/abc') => null
 *   extractVideoId(null) => null
 */
export function extractVideoId(url: string | null | undefined): string | null {
  // Inventory: url (String|null)
  // Template: conditional for null, then pattern match
  if (!url) return null;
  const match = url.match(/\/watch\?v=([^&]+)/);
  return match ? match[1] : null;
}

/**
 * Parse timestamp string to seconds
 * @param {string} str - Timestamp like '1:23' or '1:23:45'
 * @returns {number} Total seconds
 * 
 * Examples:
 *   parseTimestamp('1:23') => 83
 *   parseTimestamp('1:23:45') => 5025
 *   parseTimestamp('0:00') => 0
 *   parseTimestamp('') => 0
 */
export function parseTimestamp(str: string | null | undefined): number {
  // Inventory: str (String)
  // Template: split and accumulate
  if (!str) return 0;
  const parts = str.split(':').map(p => parseInt(p, 10));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

/**
 * Get thumbnail URL for a video ID
 * @param {string} videoId - YouTube video ID
 * @returns {string} Thumbnail URL
 */
function getThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * Extract duration text from a video item's thumbnail overlay
 * @param {HTMLElement} element - Video item container
 * @returns {string|null} Duration like '12:34' or null
 * 
 * Examples:
 *   scrapeDuration(videoElement) => '12:34'
 *   scrapeDuration(liveElement) => null
 */
function scrapeDuration(element: Element): string | null {
  // Try specific selectors first
  const selectors = [
    'ytd-thumbnail-overlay-time-status-renderer #text',
    'ytd-thumbnail-overlay-time-status-renderer span',
    'span.ytd-thumbnail-overlay-time-status-renderer',
    '#overlays #text',
    '.badge-shape-wiz__text',
    'ytd-thumbnail-overlay-time-status-renderer',
    '[overlay-style="DEFAULT"] #text',
    'ytd-thumbnail #overlays span',
    '#thumbnail-container #overlays span',
  ];
  for (const sel of selectors) {
    const el = element.querySelector(sel);
    const text = el?.textContent?.trim();
    // Match duration pattern: digits and colons (e.g., 1:23, 1:23:45)
    if (text && text.match(/^\d+:\d{2}(:\d{2})?$/)) {
      return text;
    }
  }
  
  // Fallback: search all spans/divs for duration pattern
  const allElements = element.querySelectorAll('span, div');
  for (const el of allElements) {
    const text = el.textContent?.trim();
    // Only match exact duration format (not timestamps in descriptions)
    if (text && text.match(/^\d{1,2}:\d{2}(:\d{2})?$/) && text.length <= 10) {
      return text;
    }
  }
  
  return null;
}

/**
 * Scrape view count from watch page
 * @returns {string|null} View count like '1.2M views' or null
 * 
 * Examples:
 *   getWatchPageViews() => '1,234,567 views'
 *   getWatchPageViews() => '5,432 watching now'
 */
function getWatchPageViews(): string | null {
  const selectors = [
    '#info-strings yt-formatted-string',
    'ytd-watch-metadata #info span',
    'ytd-video-primary-info-renderer #info-text',
    '#info yt-formatted-string',
  ];
  
  for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      const text = el.textContent?.trim();
      if (text?.match(/views?$|watching/i)) {
        return text;
      }
    }
  }
  return null;
}

/** @deprecated Use formatTimestamp from ./format directly */
export { formatTimestamp as formatDuration } from './format';

// =============================================================================
// PAGE TYPE DETECTION
// =============================================================================

/**
 * Determine current YouTube page type from URL
 * @returns {'watch'|'home'|'search'|'channel'|'playlist'|'subscriptions'|'history'|'library'|'shorts'|'other'}
 * 
 * Examples:
 *   // URL: youtube.com/watch?v=abc
 *   getYouTubePageType() => 'watch'
 *   // URL: youtube.com/
 *   getYouTubePageType() => 'home'
 *   // URL: youtube.com/shorts/xyz
 *   getYouTubePageType() => 'shorts'
 */
export function getYouTubePageType(): string {
  // Inventory: location.pathname, location.search
  // Template: Enum - case per variant
  const path = location.pathname;
  const params = new URLSearchParams(location.search);

  if (path === '/watch' && params.get('v')) return 'watch';
  if (path === '/' || path === '') return 'home';
  if (path === '/results') return 'search';
  if (path.startsWith('/@') || path.startsWith('/channel/') || path.startsWith('/c/')) return 'channel';
  if (path === '/playlist') return 'playlist';
  if (path === '/feed/subscriptions') return 'subscriptions';
  if (path === '/feed/history') return 'history';
  if (path === '/feed/library') return 'library';
  if (path.startsWith('/shorts/')) return 'shorts';

  return 'other';
}

// =============================================================================
// VIDEO SCRAPING
// =============================================================================

/**
 * Scrape videos from new layout (yt-lockup-view-model)
 * Used on home page (inside ytd-rich-item-renderer) and history/library (standalone)
 * @returns {Array<Object>} Raw video data objects
 */
function scrapeLockupLayout(): ScrapedVideo[] {
  const videos = [];

  // Query yt-lockup-view-model directly - it may be inside ytd-rich-item-renderer (home)
  // or standalone (history, library, etc.)
  document.querySelectorAll('yt-lockup-view-model').forEach(lockup => {
    const titleLink = lockup.querySelector('a.yt-lockup-metadata-view-model__title');
    const href = titleLink?.href;
    const videoId = extractVideoId(href);
    if (!videoId) return;

    // Filter out Shorts
    if (href?.includes('/shorts/')) return;

    const title = titleLink?.textContent?.trim();
    if (!title) return;  // Skip if no title found
    
    // Channel can be a link (home page) or just text (history page)
    const channelLink = lockup.querySelector('.yt-content-metadata-view-model__metadata-row a');
    const metaTexts = lockup.querySelectorAll('.yt-content-metadata-view-model__metadata-text');
    
    // On home page: metaTexts[0] has channel link inside, [1] = views, [2] = date
    // On history page: metaTexts[0] = channel (no link), [1] = views, no date
    let channel = channelLink?.textContent?.trim();
    let channelUrl = channelLink?.getAttribute('href');
    
    // Fallback: if no link, get channel from first metadata text
    if (!channel && metaTexts.length > 0) {
      // Extract just the channel name (first part before any separator)
      const firstMeta = metaTexts[0]?.textContent?.trim();
      // Channel name is the first metadata, but may contain extra chars
      channel = firstMeta;
    }
    
    const views = metaTexts[1]?.textContent?.trim();
    const uploadDate = metaTexts[2]?.textContent?.trim();
    const duration = scrapeDuration(lockup);

    videos.push({
      videoId,
      title,
      channel,
      channelUrl,
      views,
      uploadDate,
      duration,
    });
  });

  return videos;
}

/**
 * Scrape videos from search results layout (ytd-video-renderer)
 * Also handles history page which uses ytd-video-renderer inside ytd-section-list-renderer
 * @returns {Array<Object>} Raw video data objects
 */
function scrapeSearchLayout(): ScrapedVideo[] {
  const videos = [];

  document.querySelectorAll('ytd-video-renderer').forEach(item => {
    // Multiple fallbacks for link (from working userscript)
    const link = item.querySelector('a#video-title') || 
                 item.querySelector('a.ytd-thumbnail') || 
                 item.querySelector('a[href*="/watch?v="]');
    const href = link?.href;
    const videoId = extractVideoId(href);
    if (!videoId) return;

    // Filter out Shorts
    if (href?.includes('/shorts/')) return;

    // Multiple fallbacks for title (from working userscript)
    const titleEl = item.querySelector('#video-title') || 
                    item.querySelector('h3 a') || 
                    item.querySelector('yt-formatted-string#video-title');
    const title = titleEl?.textContent?.trim();
    if (!title) return;  // Skip if no title found

    const channelLink = item.querySelector('ytd-channel-name a, #channel-name a');
    const channel = channelLink?.textContent?.trim();
    const channelUrl = channelLink?.getAttribute('href');

    const metaSpans = item.querySelectorAll('#metadata-line span, .inline-metadata-item');
    const views = metaSpans[0]?.textContent?.trim();
    const uploadDate = metaSpans[1]?.textContent?.trim();
    const duration = scrapeDuration(item);

    videos.push({
      videoId,
      title,
      channel,
      channelUrl,
      views,
      uploadDate,
      duration,
    });
  });

  return videos;
}

/**
 * Scrape videos from history/library layout
 * History page uses ytd-video-renderer inside ytd-section-list-renderer
 * Library page may use ytd-compact-video-renderer
 * @returns {Array<Object>} Raw video data objects
 */
function scrapeHistoryLayout(): ScrapedVideo[] {
  const videos = [];

  // History page: videos in section-list containers
  document.querySelectorAll('ytd-section-list-renderer ytd-video-renderer, ytd-item-section-renderer ytd-video-renderer').forEach(item => {
    const titleLink = item.querySelector('a#video-title, #video-title-link');
    const href = titleLink?.href;
    const videoId = extractVideoId(href);
    if (!videoId) return;

    // Filter out Shorts
    if (href?.includes('/shorts/')) return;

    const title = titleLink?.textContent?.trim();
    const channelLink = item.querySelector('ytd-channel-name a, #channel-name a');
    const channel = channelLink?.textContent?.trim();
    const channelUrl = channelLink?.getAttribute('href');

    const metaSpans = item.querySelectorAll('#metadata-line span, .inline-metadata-item');
    const views = metaSpans[0]?.textContent?.trim();
    const uploadDate = metaSpans[1]?.textContent?.trim();
    const duration = scrapeDuration(item);

    videos.push({
      videoId,
      title,
      channel,
      channelUrl,
      views,
      uploadDate,
      duration,
    });
  });

  // Library page: compact video renderers
  document.querySelectorAll('ytd-compact-video-renderer').forEach(item => {
    const titleLink = item.querySelector('a#video-title, #video-title-link, a.yt-simple-endpoint');
    const href = titleLink?.href;
    const videoId = extractVideoId(href);
    if (!videoId) return;

    // Filter out Shorts
    if (href?.includes('/shorts/')) return;

    const titleEl = item.querySelector('#video-title, .title');
    const title = titleEl?.textContent?.trim();
    const channelEl = item.querySelector('#channel-name, .ytd-channel-name');
    const channel = channelEl?.textContent?.trim();
    const duration = scrapeDuration(item);

    videos.push({
      videoId,
      title,
      channel,
      channelUrl: null,
      views: null,
      uploadDate: null,
      duration,
    });
  });

  return videos;
}

/**
 * Scrape videos from playlist layout (ytd-playlist-video-renderer)
 * @returns {Array<Object>} Raw video data objects
 */
function scrapePlaylistLayout(): ScrapedVideo[] {
  const videos = [];

  document.querySelectorAll('ytd-playlist-video-renderer').forEach(item => {
    const titleLink = item.querySelector('a#video-title, #video-title-link');
    const href = titleLink?.href;
    const videoId = extractVideoId(href);
    if (!videoId) return;

    // Filter out Shorts
    if (href?.includes('/shorts/')) return;

    const title = titleLink?.textContent?.trim();
    const channelEl = item.querySelector('ytd-channel-name a, #channel-name, .ytd-channel-name');
    const channel = channelEl?.textContent?.trim();
    const channelUrl = channelEl?.getAttribute?.('href');
    const duration = scrapeDuration(item);

    videos.push({
      videoId,
      title,
      channel,
      channelUrl,
      views: null,
      uploadDate: null,
      duration,
    });
  });

  return videos;
}

/**
 * Scrape video items from current page
 * Uses multiple strategies for YouTube's varying layouts
 * Filters out Shorts, deduplicates by videoId
 * @returns {Array<ContentItem>} List of video content items
 * 
 * Examples:
 *   getVideos() => [{ type: 'content', id: 'abc', title: 'Video 1', ... }, ...]
 *   getVideos() => []  // No videos found
 */
export function getVideos(): ContentItem[] {
  // Inventory: DOM elements from multiple renderers
  // Template: Try multiple strategies, deduplicate results

  // Try all layout strategies
  const lockupVideos = scrapeLockupLayout();  // New layout (home, history, library)
  const searchVideos = scrapeSearchLayout();
  const playlistVideos = scrapePlaylistLayout();
  const historyVideos = scrapeHistoryLayout();  // Old layout fallback

  // Combine all results
  const allRaw = [...lockupVideos, ...searchVideos, ...playlistVideos, ...historyVideos];

  // Deduplicate by videoId, preferring entries with titles
  const videoMap = new Map();

  for (const video of allRaw) {
    const existing = videoMap.get(video.videoId);
    if (!existing) {
      // First occurrence
      videoMap.set(video.videoId, video);
    } else if (!existing.title && video.title) {
      // Replace if existing has no title but new one does
      videoMap.set(video.videoId, video);
    }
  }

  const deduped = Array.from(videoMap.values());

  // Transform to ContentItem format
  return deduped.map(video => {
    // Build meta string from channel and upload date (views/duration go in data)
    const metaParts = [];
    if (video.channel) metaParts.push(video.channel);
    if (video.uploadDate) metaParts.push(video.uploadDate);
    const meta = metaParts.join(' · ') || null;

    return {
      type: 'content',
      id: video.videoId,
      title: video.title || 'Untitled',
      url: `/watch?v=${video.videoId}`,
      thumbnail: getThumbnailUrl(video.videoId),
      meta,
      subtitle: null,
      data: {
        videoId: video.videoId,
        channelUrl: video.channelUrl || null,
        viewCount: video.views || null,
        duration: video.duration || null,
      },
    };
  });
}

// =============================================================================
// WATCH PAGE CONTEXT
// =============================================================================

/**
 * Scrape current video's metadata from watch page
 * @returns {VideoContext|null} Video context or null if not on watch page
 * 
 * Examples:
 *   getVideoContext() => { videoId: 'abc123', title: 'Video Title', chapters: [...], ... }
 *   getVideoContext() => null  // Not on watch page
 */
export function getVideoContext(): Record<string, any> | null {
  // Inventory: URL, video element, metadata elements
  // Template: Compound - access all fields

  // Check if on watch page
  if (getYouTubePageType() !== 'watch') return null;

  // Get video ID from URL
  const params = new URLSearchParams(location.search);
  const videoId = params.get('v');
  if (!videoId) return null;

  // Get video element
  const video = document.querySelector('video.html5-main-video');

  // Get title - try multiple selectors (YouTube loads metadata async)
  const titleSelectors = [
    'h1.ytd-watch-metadata yt-formatted-string',
    'yt-formatted-string.style-scope.ytd-watch-metadata',
    'h1.ytd-watch-metadata',
    '#title h1 yt-formatted-string',
    '#title h1',
    'ytd-watch-metadata h1',
    '#above-the-fold #title yt-formatted-string',
    'ytd-video-primary-info-renderer h1 yt-formatted-string',
    'ytd-video-primary-info-renderer #title',
  ];
  let title = null;
  for (const sel of titleSelectors) {
    const el = document.querySelector(sel);
    if (el?.textContent?.trim()) {
      title = el.textContent.trim();
      break;
    }
  }

  // Get channel info - try multiple selectors
  const channelSelectors = [
    'ytd-video-owner-renderer #channel-name a',
    '#owner #channel-name a',
    '#owner ytd-channel-name a',
    'ytd-watch-metadata #owner a',
    '#above-the-fold ytd-channel-name a',
    'ytd-video-owner-renderer ytd-channel-name yt-formatted-string a',
  ];
  let channelName = null;
  let channelUrl = null;
  for (const sel of channelSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      channelName = el.textContent?.trim() || null;
      channelUrl = el.getAttribute('href') || null;
      if (channelName) break;
    }
  }
  
  // Fallback: try to get channel name without link
  if (!channelName) {
    const channelNameOnlySelectors = [
      'ytd-video-owner-renderer #channel-name',
      '#owner #channel-name',
      'ytd-channel-name yt-formatted-string',
    ];
    for (const sel of channelNameOnlySelectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) {
        channelName = el.textContent.trim();
        break;
      }
    }
  }

  // Get subscribe state
  const subBtn = document.querySelector('ytd-subscribe-button-renderer button');
  const subLabel = subBtn?.getAttribute('aria-label') || '';
  const isSubscribed = subLabel.toLowerCase().includes('unsubscribe');

  // Get upload date and views from info strings
  // YouTube shows these in #info-strings or the description area
  let uploadDate = null;
  let views = null;
  
  const infoSelectors = [
    '#info-strings yt-formatted-string',
    '#info span',
    'ytd-watch-metadata #info yt-formatted-string',
    '#description-inner ytd-video-primary-info-renderer #info-strings span',
  ];
  
  for (const sel of infoSelectors) {
    const els = document.querySelectorAll(sel);
    if (els.length > 0) {
      els.forEach(el => {
        const text = el.textContent?.trim() || '';
        // Check for view count pattern
        if (text.match(/views?$/i) || text.match(/^\d[\d,\.]*[KMB]?\s*views?$/i)) {
          views = text;
        }
        // Check for date patterns: "X ago", specific dates, "Premiered", "Streamed"
        if (text.match(/ago$/i) || text.match(/premiered/i) || text.match(/streamed/i) ||
            text.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d/i)) {
          uploadDate = text;
        }
      });
      if (uploadDate) break;
    }
  }

  // Get description
  const description = getDescription();

  // Get chapters
  const chapters = getChapters();

  // Build clean URL (without extra params)
  const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return {
    videoId,
    url: location.href,
    cleanUrl,
    title,
    channelName,
    channelUrl,
    uploadDate,
    description,
    views: getWatchPageViews(),
    isSubscribed,
    isLiked: false, // Complex to detect reliably
    currentTime: video?.currentTime || 0,
    duration: video?.duration || 0,
    paused: video?.paused ?? true,
    playbackRate: video?.playbackRate || 1,
    volume: video?.volume || 1,
    muted: video?.muted || false,
    chapters,
  };
}

// =============================================================================
// CHAPTERS
// =============================================================================

/**
 * Scrape chapters from video description panel
 * Tries description panel first (ytd-macro-markers-list-item-renderer)
 * Deduplicates by title+time
 * @returns {Array<Chapter>} List of chapters (empty if none found)
 * 
 * Examples:
 *   getChapters() => [{ title: 'Intro', time: 0, timeText: '0:00' }, ...]
 *   getChapters() => []  // Video without chapters
 */
export function getChapters(): Chapter[] {
  // Inventory: chapter renderer elements
  // Template: Self-referential (list) - iterate and accumulate

  const chapters = [];
  const seen = new Set();

  document.querySelectorAll('ytd-macro-markers-list-item-renderer').forEach(item => {
    // Try multiple selectors for title
    const titleEl = item.querySelector('h4, #title, #details h4');
    const title = titleEl?.textContent?.trim();

    // Try multiple selectors for time
    const timeEl = item.querySelector('#time, #details #time');
    const timeText = timeEl?.textContent?.trim();

    if (!title || !timeText) return;

    // Dedupe by title + time (YouTube often duplicates chapters)
    const key = `${title}::${timeText}`;
    if (seen.has(key)) return;
    seen.add(key);

    const time = parseTimestamp(timeText);

    // Get thumbnail if available
    const thumbEl = item.querySelector('#thumbnail img, yt-img-shadow img');
    const thumbnailUrl = thumbEl?.src || null;

    chapters.push({
      title,
      time,
      timeText,
      thumbnailUrl,
    });
  });

  return chapters;
}

// =============================================================================
// COMMENTS
// =============================================================================

/**
 * Get comment loading status
 * @returns {'loading'|'disabled'|'loaded'}
 */
function getCommentStatus(): 'loading' | 'disabled' | 'loaded' {
  const commentsSection = document.querySelector('#comments, ytd-comments');
  if (!commentsSection) return 'loading';

  // Check if comments are disabled
  const disabledMessage = commentsSection.querySelector('ytd-message-renderer');
  if (disabledMessage?.textContent?.includes('turned off')) return 'disabled';

  // Check if any comments have loaded - spinners may exist for loading MORE comments
  // (continuation items, sub-threads) even when initial batch is loaded
  const commentCount = document.querySelectorAll('ytd-comment-thread-renderer, ytd-comment-view-model').length;
  if (commentCount > 0) return 'loaded';

  // No comments yet - check if still loading (spinner in main section, not in continuation items)
  // Look for spinner that's a direct child of the comments section, not in ytd-continuation-item-renderer
  const mainSpinner = commentsSection.querySelector(
    '#contents > tp-yt-paper-spinner, ' +
    '#contents > #spinner, ' +
    'ytd-item-section-renderer > #contents > tp-yt-paper-spinner'
  );
  if (mainSpinner) return 'loading';

  // Fallback: if there's any spinner and no comments, still loading
  const anySpinner = commentsSection.querySelector('tp-yt-paper-spinner, #spinner');
  if (anySpinner) return 'loading';

  return 'loaded';
}

/**
 * Scrape top-level comments with status
 * Deduplicates comments by author + text prefix
 * @returns {CommentsResult} Comments array and status
 * 
 * Examples:
 *   getComments() => { comments: [...], status: 'loaded' }
 *   getComments() => { comments: [], status: 'loading' }
 *   getComments() => { comments: [], status: 'disabled' }
 */
export function getComments(): CommentsResult {
  // Inventory: comment thread elements
  // Template: Compound result with status enum

  const status = getCommentStatus();

  // If still loading or disabled, return early
  if (status !== 'loaded') {
    return { comments: [], status };
  }

  const comments = [];
  const seen = new Set();

  document.querySelectorAll('ytd-comment-thread-renderer, ytd-comment-view-model').forEach(el => {
    // Get author
    const authorEl = el.querySelector('#author-text, #author-text span, a#author-text');
    const author = authorEl?.textContent?.trim();

    // Get comment text
    const textEl = el.querySelector('#content-text, yt-attributed-string#content-text');
    const text = textEl?.textContent?.trim();

    if (!author || !text) return;

    // Dedupe by author + text prefix (YouTube duplicates in DOM)
    const key = `${author}::${text.substring(0, 50)}`;
    if (seen.has(key)) return;
    seen.add(key);

    comments.push({ author, text });
  });

  return { comments, status };
}

// =============================================================================
// RECOMMENDED VIDEOS
// =============================================================================

/**
 * Scrape recommended videos from watch page sidebar
 * Supports both old (ytd-compact-video-renderer) and new (yt-lockup-view-model) layouts
 * @returns {Array<ContentItem>} List of recommended video content items
 * 
 * Examples:
 *   getRecommendedVideos() => [{ type: 'content', id: 'abc', title: 'Related Video', ... }, ...]
 *   getRecommendedVideos() => []  // Not on watch page or no recommendations
 */
export function getRecommendedVideos(): ContentItem[] {
  // Inventory: DOM elements from various renderers in sidebar
  // Template: iterate and accumulate

  if (getYouTubePageType() !== 'watch') return [];

  const videos = [];
  const seen = new Set();

  // Strategy 1: New layout - yt-lockup-view-model (inside ytd-rich-item-renderer or standalone)
  // YouTube has been transitioning sidebars to this format
  document.querySelectorAll('#secondary yt-lockup-view-model, #related yt-lockup-view-model, ytd-watch-next-secondary-results-renderer yt-lockup-view-model').forEach(lockup => {
    const titleLink = lockup.querySelector('a.yt-lockup-metadata-view-model-wiz__title, a.yt-lockup-metadata-view-model__title');
    const href = titleLink?.href;
    const videoId = extractVideoId(href);
    if (!videoId || seen.has(videoId)) return;
    
    // Filter out Shorts
    if (href?.includes('/shorts/')) return;
    
    seen.add(videoId);
    
    const title = titleLink?.textContent?.trim();
    if (!title) return;
    
    // Get channel and metadata from new format
    const channelLink = lockup.querySelector('.yt-content-metadata-view-model-wiz__metadata-row a, .yt-content-metadata-view-model__metadata-row a');
    const metaTexts = lockup.querySelectorAll('.yt-content-metadata-view-model-wiz__metadata-text, .yt-content-metadata-view-model__metadata-text');
    
    let channel = channelLink?.textContent?.trim();
    // Fallback: if no link, channel might be in first metadata text
    if (!channel && metaTexts.length > 0) {
      channel = metaTexts[0]?.textContent?.trim();
    }
    
    const views = metaTexts[1]?.textContent?.trim();
    const uploadDate = metaTexts[2]?.textContent?.trim();
    const duration = scrapeDuration(lockup);
    
    // Build meta string
    const metaParts = [];
    if (channel) metaParts.push(channel);
    if (uploadDate) metaParts.push(uploadDate);
    const meta = metaParts.join(' · ') || null;
    
    videos.push({
      type: 'content',
      id: videoId,
      title: title || 'Untitled',
      url: `/watch?v=${videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      meta,
      subtitle: null,
      data: {
        videoId,
        channelUrl: channelLink?.getAttribute('href') || null,
        viewCount: views || null,
        duration: duration || null,
      },
    });
  });

  // Strategy 2: Old layout - ytd-compact-video-renderer (still used in some cases)
  document.querySelectorAll('#secondary ytd-compact-video-renderer, #related ytd-compact-video-renderer').forEach(item => {
    const titleEl = item.querySelector('#video-title, .title');
    const title = titleEl?.textContent?.trim();
    
    const linkEl = item.querySelector('a#thumbnail, a.yt-simple-endpoint');
    const href = linkEl?.href;
    const videoId = extractVideoId(href);
    
    if (!videoId || seen.has(videoId)) return;
    
    // Filter out Shorts
    if (href?.includes('/shorts/')) return;
    
    seen.add(videoId);
    
    // Get channel name
    const channelEl = item.querySelector('#channel-name, .ytd-channel-name, yt-formatted-string.ytd-channel-name');
    const channel = channelEl?.textContent?.trim();
    
    // Get view count and upload date
    const metaEl = item.querySelector('#metadata-line, .metadata');
    const metaText = metaEl?.textContent?.trim() || '';
    const duration = scrapeDuration(item);
    
    // Build meta string
    const metaParts = [];
    if (channel) metaParts.push(channel);
    if (metaText) metaParts.push(metaText);
    const meta = metaParts.join(' · ') || null;
    
    videos.push({
      type: 'content',
      id: videoId,
      title: title || 'Untitled',
      url: `/watch?v=${videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      meta,
      subtitle: null,
      data: {
        videoId,
        channelUrl: null,
        viewCount: null,
        duration: duration || null,
      },
    });
  });

  // Strategy 3: Rich item renderer wrapper (sometimes used in sidebar)
  document.querySelectorAll('#secondary ytd-rich-item-renderer, #related ytd-rich-item-renderer').forEach(item => {
    // May contain yt-lockup-view-model (handled above) or ytd-video-renderer
    const videoRenderer = item.querySelector('ytd-video-renderer');
    if (!videoRenderer) return; // lockup already handled above
    
    const titleEl = videoRenderer.querySelector('#video-title, a#video-title');
    const href = titleEl?.href;
    const videoId = extractVideoId(href);
    
    if (!videoId || seen.has(videoId)) return;
    
    // Filter out Shorts
    if (href?.includes('/shorts/')) return;
    
    seen.add(videoId);
    
    const title = titleEl?.textContent?.trim();
    const channelEl = videoRenderer.querySelector('ytd-channel-name a, #channel-name a');
    const channel = channelEl?.textContent?.trim();
    const duration = scrapeDuration(videoRenderer);
    
    const metaParts = [];
    if (channel) metaParts.push(channel);
    const meta = metaParts.join(' · ') || null;
    
    videos.push({
      type: 'content',
      id: videoId,
      title: title || 'Untitled',
      url: `/watch?v=${videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      meta,
      subtitle: null,
      data: {
        videoId,
        channelUrl: channelEl?.getAttribute('href') || null,
        viewCount: null,
        duration: duration || null,
      },
    });
  });

  return videos;
}

// =============================================================================
// DESCRIPTION
// =============================================================================

/**
 * Get video description text
 * @returns {string} Description text or empty string if not found
 * 
 * Examples:
 *   getDescription() => "In this video we explore...\n\nLinks:\n..."
 *   getDescription() => ""  // Not found
 */
export function getDescription(): string {
  // Inventory: description element
  // Template: Try multiple selectors, return text

  const selectors = [
    'ytd-text-inline-expander#description-inline-expander',
    '#description-inner',
    '#description',
    'ytd-expander#description',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.textContent?.trim()) {
      return el.textContent.trim();
    }
  }

  return '';
}
