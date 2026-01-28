// YouTube scrapers
// Implements video, chapter, and comment scraping using verified DOM selectors

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
export function extractVideoId(url) {
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
export function parseTimestamp(str) {
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
function getThumbnailUrl(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

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
export function getYouTubePageType() {
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
 * Scrape videos from home page layout (ytd-rich-item-renderer with yt-lockup-view-model)
 * @returns {Array<Object>} Raw video data objects
 */
function scrapeHomeLayout() {
  const videos = [];

  document.querySelectorAll('ytd-rich-item-renderer').forEach(item => {
    const lockup = item.querySelector('yt-lockup-view-model');
    if (!lockup) return;

    const titleLink = lockup.querySelector('a.yt-lockup-metadata-view-model__title');
    const href = titleLink?.href;
    const videoId = extractVideoId(href);
    if (!videoId) return;

    // Filter out Shorts
    if (href?.includes('/shorts/')) return;

    const title = titleLink?.textContent?.trim();
    const channelLink = lockup.querySelector('.yt-content-metadata-view-model__metadata-row a');
    const channel = channelLink?.textContent?.trim();
    const channelUrl = channelLink?.getAttribute('href');
    const metaTexts = lockup.querySelectorAll('.yt-content-metadata-view-model__metadata-text');

    // metaTexts[0] = channel, [1] = views, [2] = date
    const views = metaTexts[1]?.textContent?.trim();
    const uploadDate = metaTexts[2]?.textContent?.trim();

    videos.push({
      videoId,
      title,
      channel,
      channelUrl,
      views,
      uploadDate,
    });
  });

  return videos;
}

/**
 * Scrape videos from search results layout (ytd-video-renderer)
 * Also handles history page which uses ytd-video-renderer inside ytd-section-list-renderer
 * @returns {Array<Object>} Raw video data objects
 */
function scrapeSearchLayout() {
  const videos = [];

  document.querySelectorAll('ytd-video-renderer').forEach(item => {
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

    videos.push({
      videoId,
      title,
      channel,
      channelUrl,
      views,
      uploadDate,
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
function scrapeHistoryLayout() {
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

    videos.push({
      videoId,
      title,
      channel,
      channelUrl,
      views,
      uploadDate,
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

    videos.push({
      videoId,
      title,
      channel,
      channelUrl: null,
      views: null,
      uploadDate: null,
    });
  });

  return videos;
}

/**
 * Scrape videos from playlist layout (ytd-playlist-video-renderer)
 * @returns {Array<Object>} Raw video data objects
 */
function scrapePlaylistLayout() {
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

    videos.push({
      videoId,
      title,
      channel,
      channelUrl,
      views: null,
      uploadDate: null,
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
export function getVideos() {
  // Inventory: DOM elements from multiple renderers
  // Template: Try multiple strategies, deduplicate results

  // Try all layout strategies
  const homeVideos = scrapeHomeLayout();
  const searchVideos = scrapeSearchLayout();
  const playlistVideos = scrapePlaylistLayout();
  const historyVideos = scrapeHistoryLayout();

  // Combine all results
  const allRaw = [...homeVideos, ...searchVideos, ...playlistVideos, ...historyVideos];

  // Deduplicate by videoId
  const seen = new Set();
  const deduped = [];

  for (const video of allRaw) {
    if (seen.has(video.videoId)) continue;
    seen.add(video.videoId);
    deduped.push(video);
  }

  // Transform to ContentItem format
  return deduped.map(video => {
    // Build meta string from available data
    const metaParts = [];
    if (video.channel) metaParts.push(video.channel);
    if (video.views) metaParts.push(video.views);
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
export function getVideoContext() {
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
    uploadDate: null, // Not easily accessible, would need to expand description
    description,
    views: null, // Not easily accessible
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
export function getChapters() {
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
function getCommentStatus() {
  const commentsSection = document.querySelector('#comments, ytd-comments');
  if (!commentsSection) return 'loading';

  // Check if comments are disabled
  const disabledMessage = commentsSection.querySelector('ytd-message-renderer');
  if (disabledMessage?.textContent?.includes('turned off')) return 'disabled';

  // Check if still loading
  const spinner = commentsSection.querySelector('tp-yt-paper-spinner, #spinner');
  if (spinner) return 'loading';

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
export function getComments() {
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
export function getDescription() {
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
