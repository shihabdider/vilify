/**
 * YouTube Scraping
 * 
 * DOM scraping functions for YouTube content.
 * All scrapers throw on failure for easier debugging.
 */

/**
 * Selectors for YouTube elements (supports both old and new layouts)
 */
const SELECTORS = {
  // New layout (2024+)
  newLayout: 'yt-lockup-view-model',
  thumbnailLink: 'a.yt-lockup-view-model__content-image',
  titleLink: 'a.yt-lockup-metadata-view-model__title',
  channelNew: [
    '.yt-content-metadata-view-model-wiz__metadata-text',
    '.yt-content-metadata-view-model__metadata-text',
    'ytd-channel-name a',
    '#channel-name a'
  ],
  metadataNew: '.yt-content-metadata-view-model-wiz__metadata-text, .yt-content-metadata-view-model__metadata-text',
  
  // Old layout
  oldLayout: [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-grid-video-renderer'
  ],
  videoLink: 'a#video-title-link, a#video-title, a.ytd-thumbnail, a#thumbnail',
  videoTitle: '#video-title',
  channelOld: ['#channel-name a', 'ytd-channel-name a', '#text.ytd-channel-name'],
  metadataOld: '#metadata-line span, .inline-metadata-item'
};

/**
 * Query first matching selector from a list
 */
function queryFirst(selectors, parent = document) {
  for (const sel of selectors) {
    const el = parent.querySelector(sel);
    if (el) return el;
  }
  return null;
}

/**
 * Extract video ID from URL
 */
function extractVideoId(url) {
  if (!url) return null;
  const match = url.match(/[?&]v=([^&]+)/) || url.match(/\/shorts\/([^?&]+)/);
  return match ? match[1] : null;
}

/**
 * [PURE] Determine current page type from URL.
 */
export function getYouTubePageType() {
  const pathname = window.location.pathname;
  const search = window.location.search;
  
  if (pathname === '/watch' && search.includes('v=')) return 'watch';
  if (pathname === '/' || pathname === '') return 'home';
  if (pathname.startsWith('/shorts/')) return 'shorts';
  if (pathname === '/feed/subscriptions') return 'subscriptions';
  if (pathname === '/feed/history') return 'history';
  if (pathname === '/feed/library') return 'library';
  if (pathname === '/feed/trending') return 'trending';
  if (pathname === '/results') return 'search';
  if (pathname.startsWith('/playlist')) return 'playlist';
  if (pathname.startsWith('/@') || pathname.startsWith('/c/') || pathname.startsWith('/channel/')) return 'channel';
  
  return 'other';
}

/**
 * [I/O] Scrape current video's metadata.
 * Throws if not on watch page or elements missing.
 */
export function getVideoContext() {
  const pageType = getYouTubePageType();
  if (pageType !== 'watch') {
    throw new Error('Not on watch page');
  }
  
  const video = document.querySelector('video.html5-main-video');
  if (!video) {
    throw new Error('Video element not found');
  }
  
  // Get video ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('v');
  if (!videoId) {
    throw new Error('Video ID not found in URL');
  }
  
  // Scrape title
  const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title, #title h1');
  const title = titleEl?.textContent?.trim() || null;
  
  // Scrape channel name and URL
  const channelEl = document.querySelector('#channel-name a, ytd-channel-name a, #owner #channel-name a');
  const channelName = channelEl?.textContent?.trim() || null;
  const channelUrl = channelEl?.getAttribute('href') || null;
  
  // Scrape view count
  const viewsEl = document.querySelector('#info-strings yt-formatted-string, #info span, .view-count');
  const views = viewsEl?.textContent?.trim() || null;
  
  // Scrape upload date
  const dateEl = document.querySelector('#info-strings yt-formatted-string:last-child, #info-text span:last-child');
  const uploadDate = dateEl?.textContent?.trim() || null;
  
  // Scrape description
  const descEl = document.querySelector('#description-inline-expander, #description, ytd-text-inline-expander');
  const description = descEl?.textContent?.trim() || null;
  
  // Get player state
  const currentTime = video.currentTime || 0;
  const duration = video.duration || 0;
  const paused = video.paused;
  const playbackRate = video.playbackRate || 1;
  const volume = video.volume || 1;
  const muted = video.muted;
  
  // Get chapters
  let chapters = [];
  try {
    chapters = getChapters();
  } catch (e) {
    // Chapters are optional
  }
  
  return {
    videoId,
    url: window.location.href,
    cleanUrl: `https://www.youtube.com/watch?v=${videoId}`,
    title,
    channelName,
    channelUrl,
    uploadDate,
    description,
    views,
    isSubscribed: false,
    isLiked: false,
    currentTime,
    duration,
    paused,
    playbackRate,
    volume,
    muted,
    chapters,
  };
}

/**
 * [I/O] Scrape video items from current page.
 * Filters out Shorts. Throws if DOM not ready.
 */
export function getVideos() {
  const videos = [];
  const seen = new Set();
  
  const addVideo = (videoId, title, channelName, thumbnail) => {
    if (!videoId || seen.has(videoId)) return;
    seen.add(videoId);
    
    videos.push({
      type: 'content',
      id: videoId,
      title: title || 'Untitled',
      url: `/watch?v=${videoId}`,
      thumbnail: thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      meta: channelName || '',
      subtitle: null,
      data: { videoId },
    });
  };
  
  // Strategy 1: New layout (yt-lockup-view-model) - 2024+
  document.querySelectorAll(SELECTORS.newLayout).forEach(el => {
    const thumbLink = el.querySelector(SELECTORS.thumbnailLink);
    const href = thumbLink?.href || '';
    
    // Skip shorts
    if (href.includes('/shorts/')) return;
    
    const videoId = extractVideoId(href);
    if (!videoId) return;
    
    const titleLink = el.querySelector(SELECTORS.titleLink);
    const title = titleLink?.textContent?.trim();
    if (!title) return;
    
    const channelEl = queryFirst(SELECTORS.channelNew, el);
    const channelName = channelEl?.textContent?.trim() || '';
    
    const thumbImg = el.querySelector('img');
    const thumbnail = thumbImg?.src || null;
    
    addVideo(videoId, title, channelName, thumbnail);
  });
  
  // Strategy 2: Old layout (ytd-*-renderer)
  const oldLayoutSelector = SELECTORS.oldLayout.join(', ');
  document.querySelectorAll(oldLayoutSelector).forEach(el => {
    const linkEl = el.querySelector(SELECTORS.videoLink);
    const href = linkEl?.href || linkEl?.getAttribute('href') || '';
    
    // Skip shorts
    if (href.includes('/shorts/')) return;
    
    const videoId = extractVideoId(href);
    if (!videoId) return;
    
    const titleEl = el.querySelector(SELECTORS.videoTitle);
    const title = titleEl?.textContent?.trim();
    if (!title) return;
    
    const channelEl = queryFirst(SELECTORS.channelOld, el);
    const channelName = channelEl?.textContent?.trim() || '';
    
    const thumbImg = el.querySelector('img');
    const thumbnail = thumbImg?.src || null;
    
    addVideo(videoId, title, channelName, thumbnail);
  });
  
  console.log('[Vilify] Scraped', videos.length, 'videos');
  
  return videos;
}

/**
 * [I/O] Scrape chapters from video.
 * Returns empty array if no chapters (not an error).
 */
export function getChapters() {
  const chapters = [];
  
  // Try chapter panel
  const chapterRenderers = document.querySelectorAll('ytd-macro-markers-list-item-renderer');
  
  if (chapterRenderers.length > 0) {
    chapterRenderers.forEach(renderer => {
      const titleEl = renderer.querySelector('#details h4, .macro-markers-list-item-title');
      const timeEl = renderer.querySelector('#time, .ytd-thumbnail-overlay-time-status-renderer');
      
      const title = titleEl?.textContent?.trim() || '';
      const timeText = timeEl?.textContent?.trim() || '0:00';
      const time = parseTimeToSeconds(timeText);
      
      if (title) {
        chapters.push({ title, time, timeText });
      }
    });
    
    return chapters;
  }
  
  // Try parsing description for timestamps
  const descEl = document.querySelector('#description-inline-expander, #description');
  const description = descEl?.textContent || '';
  
  // Match patterns like "0:00 Introduction" or "1:23:45 Chapter"
  const timestampRegex = /(\d{1,2}:)?(\d{1,2}):(\d{2})\s+(.+?)(?=\n|$)/g;
  let match;
  
  while ((match = timestampRegex.exec(description)) !== null) {
    const timeText = match[0].split(/\s+/)[0];
    const title = match[4].trim();
    const time = parseTimeToSeconds(timeText);
    
    chapters.push({ title, time, timeText });
  }
  
  return chapters;
}

/**
 * Parse time string to seconds.
 */
function parseTimeToSeconds(timeStr) {
  const parts = timeStr.split(':').map(Number);
  
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  
  return 0;
}

/**
 * [I/O] Scrape top-level comments with status.
 */
export function getComments() {
  // Check for "Comments are turned off"
  const disabledEl = document.querySelector('#message.ytd-comments-header-renderer');
  if (disabledEl?.textContent?.toLowerCase().includes('turned off')) {
    return { comments: [], status: 'disabled' };
  }
  
  // Check for loading state
  const commentSection = document.querySelector('ytd-comments#comments');
  const spinner = commentSection?.querySelector('tp-yt-paper-spinner');
  if (spinner && !spinner.hasAttribute('hidden')) {
    return { comments: [], status: 'loading' };
  }
  
  // Scrape comments - try multiple selectors
  const comments = [];
  const commentSelectors = [
    'ytd-comment-thread-renderer',
    'ytd-comment-view-model',
    'ytd-comment-renderer'
  ];
  
  for (const selector of commentSelectors) {
    const renderers = document.querySelectorAll(selector);
    if (renderers.length === 0) continue;
    
    renderers.forEach(renderer => {
      try {
        const authorEl = renderer.querySelector('#author-text, #author-text span, a#author-text, h3 a');
        const textEl = renderer.querySelector('#content-text, #content-text span, yt-attributed-string#content-text');
        
        const author = authorEl?.textContent?.trim() || 'Unknown';
        const text = textEl?.textContent?.trim() || '';
        
        if (text) {
          comments.push({ author, text });
        }
      } catch (e) {
        // Skip problematic comments
      }
    });
    
    if (comments.length > 0) break;
  }
  
  if (comments.length === 0 && !disabledEl) {
    return { comments: [], status: 'loading' };
  }
  
  return { comments, status: 'loaded' };
}

/**
 * [I/O] Scrape full video description text.
 */
export function getDescription() {
  const descEl = document.querySelector('#description-inline-expander, #description, ytd-text-inline-expander');
  if (!descEl) {
    throw new Error('Description element not found');
  }
  
  return descEl.textContent?.trim() || '';
}
