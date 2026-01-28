/**
 * YouTube Scraping
 * 
 * DOM scraping functions for YouTube content.
 * All scrapers throw on failure for easier debugging.
 */

/**
 * [PURE] Determine current page type from URL.
 *
 * Examples:
 *   // URL: youtube.com/watch?v=abc
 *   getYouTubePageType()  => 'watch'
 *
 *   // URL: youtube.com/
 *   getYouTubePageType()  => 'home'
 *
 *   // URL: youtube.com/shorts/xyz
 *   getYouTubePageType()  => 'shorts'
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
  const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title');
  const title = titleEl?.textContent?.trim() || null;
  
  // Scrape channel name and URL
  const channelEl = document.querySelector('#channel-name a, ytd-channel-name a');
  const channelName = channelEl?.textContent?.trim() || null;
  const channelUrl = channelEl?.getAttribute('href') || null;
  
  // Scrape view count and upload date
  const infoEl = document.querySelector('#info-strings yt-formatted-string, #info span');
  const infoText = infoEl?.textContent || '';
  const viewsMatch = infoText.match(/([\d,.]+ views?)/i);
  const views = viewsMatch ? viewsMatch[1] : null;
  
  const dateEl = document.querySelector('#info-strings yt-formatted-string:nth-child(3), #info-text span:last-child');
  const uploadDate = dateEl?.textContent?.trim() || null;
  
  // Scrape description
  const descEl = document.querySelector('#description-inline-expander, #description');
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
    isSubscribed: false, // Would need more complex scraping
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
  
  // Try various video renderers used by YouTube
  const renderers = document.querySelectorAll(`
    ytd-rich-item-renderer,
    ytd-video-renderer,
    ytd-compact-video-renderer,
    ytd-grid-video-renderer
  `);
  
  if (renderers.length === 0) {
    throw new Error('No video renderers found - page may still be loading');
  }
  
  renderers.forEach((renderer, idx) => {
    try {
      // Get the link element
      const linkEl = renderer.querySelector('a#thumbnail, a.ytd-thumbnail');
      const href = linkEl?.getAttribute('href') || '';
      
      // Skip Shorts
      if (href.includes('/shorts/')) return;
      
      // Extract video ID
      const videoIdMatch = href.match(/[?&]v=([^&]+)/);
      if (!videoIdMatch) return;
      
      const videoId = videoIdMatch[1];
      
      // Get title
      const titleEl = renderer.querySelector('#video-title, h3 a, .title');
      const title = titleEl?.textContent?.trim() || 'Untitled';
      
      // Get channel name
      const channelEl = renderer.querySelector('#channel-name a, .ytd-channel-name a, #text a');
      const channel = channelEl?.textContent?.trim() || '';
      
      // Get thumbnail
      const thumbEl = renderer.querySelector('img');
      const thumbnail = thumbEl?.src || '';
      
      // Get metadata (views, time ago)
      const metaEls = renderer.querySelectorAll('#metadata-line span, .ytd-video-meta-block span');
      const metaParts = [];
      metaEls.forEach(el => {
        const text = el.textContent?.trim();
        if (text) metaParts.push(text);
      });
      const meta = [channel, ...metaParts].filter(Boolean).join(' · ');
      
      videos.push({
        type: 'content',
        id: videoId,
        title,
        url: `/watch?v=${videoId}`,
        thumbnail,
        meta,
        subtitle: null,
        data: { videoId, channelUrl: channelEl?.getAttribute('href') },
      });
    } catch (e) {
      // Skip problematic renderers
    }
  });
  
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
 * Handles "0:00", "1:23", "1:23:45" formats.
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
  
  // Scrape comments
  const comments = [];
  const commentRenderers = document.querySelectorAll('ytd-comment-thread-renderer');
  
  if (commentRenderers.length === 0 && !disabledEl) {
    // Might still be loading
    return { comments: [], status: 'loading' };
  }
  
  commentRenderers.forEach(renderer => {
    try {
      const authorEl = renderer.querySelector('#author-text');
      const textEl = renderer.querySelector('#content-text');
      
      const author = authorEl?.textContent?.trim() || 'Unknown';
      const text = textEl?.textContent?.trim() || '';
      
      if (text) {
        comments.push({ author, text });
      }
    } catch (e) {
      // Skip problematic comments
    }
  });
  
  return { comments, status: 'loaded' };
}

/**
 * [I/O] Scrape full video description text.
 */
export function getDescription() {
  const descEl = document.querySelector('#description-inline-expander, #description');
  if (!descEl) {
    throw new Error('Description element not found');
  }
  
  return descEl.textContent?.trim() || '';
}
