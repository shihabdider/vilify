// YouTube site configuration
// Following HTDP design from .design/DATA.md and .design/BLUEPRINT.md

import { getYouTubePageType, getDescription, getChapters, extractVideoId } from './scraper.js';
import { getDataProvider } from './data/index.js';
import { getYouTubeCommands, getYouTubeKeySequences, getYouTubeSingleKeyActions } from './commands.js';
import { applyDefaultVideoSettings, seekToChapter } from './player.js';
import { injectWatchStyles, renderWatchPage, nextCommentPage, prevCommentPage } from './watch.js';
import { getYouTubeDrawerHandler, resetYouTubeDrawers } from './drawers/index.js';
import { fetchTranscript } from './transcript.js';
import { onTranscriptRequest, onTranscriptLoad, onChaptersRequest, onChaptersLoad } from './state.js';
import { renderYouTubeItem, injectYouTubeItemStyles } from './items.js';
import { renderListing, updateSortIndicator, updateItemCount } from '../../core/layout.js';
import { sortItems, getSortLabel } from '../../core/sort.js';

// =============================================================================
// THEME
// =============================================================================

/**
 * YouTube theme - Solarized Dark with YouTube red accent
 * @type {SiteTheme}
 */
const youtubeTheme = {
  bg1: '#002b36',
  bg2: '#073642',
  bg3: '#0a4a5c',
  txt1: '#f1f1f1',
  txt2: '#aaaaaa',
  txt3: '#717171',
  txt4: '#3ea6ff',
  accent: '#ff0000',
  accentHover: '#cc0000',
};

// =============================================================================
// SITE STATE
// =============================================================================

/**
 * Create initial YouTube-specific state.
 * [PURE]
 *
 * @returns {YouTubeState} Initial YouTube state
 *
 * @example
 * createYouTubeState()
 *   => { chapterQuery: '', chapterSelectedIdx: 0,
 *        commentPage: 0, commentPageStarts: [0],
 *        settingsApplied: false, watchPageRetryCount: 0, commentLoadAttempts: 0 }
 */
function createYouTubeState() {
  // Template: Compound - construct all fields per YouTubeState definition
  return {
    chapterQuery: '',
    chapterSelectedIdx: 0,
    commentPage: 0,
    commentPageStarts: [0],
    settingsApplied: false,
    watchPageRetryCount: 0,
    commentLoadAttempts: 0,
    transcript: null,  // TranscriptResult | null - cached transcript data
    chapters: null,    // ChaptersResult | null - cached chapters data
  };
}

// =============================================================================
// WATCH PAGE RETRY LOGIC
// =============================================================================

const WATCH_MAX_RETRIES = 10;
const WATCH_RETRY_DELAY = 500;

// =============================================================================
// LISTING LAYOUT
// =============================================================================

/**
 * Render YouTube listing page with custom item renderer.
 * [I/O]
 * 
 * @param {AppState} state - App state
 * @param {YouTubeState} siteState - YouTube state
 * @param {HTMLElement} container - Container to render into
 */
function renderYouTubeListing(state, siteState, container) {
  injectYouTubeItemStyles();
  
  const dp = getDataProvider();
  let items = dp.getVideos();
  
  const { filterActive, filterQuery, sort, selectedIdx } = state.ui;
  
  // Apply local filter if active
  if (filterActive) {
    const q = filterQuery.toLowerCase();
    items = items.filter(i => 
      i.title?.toLowerCase().includes(q) || 
      i.meta?.toLowerCase().includes(q)
    );
  }
  
  // Apply sorting if active
  if (sort.field) {
    items = sortItems(items, sort.field, sort.direction);
  }
  
  // Update sort indicator and count in status bar
  updateSortIndicator(getSortLabel(sort.field, sort.direction));
  updateItemCount(items.length);
  
  renderListing(items, selectedIdx, container, renderYouTubeItem);
}

/** Current watch page retry timer */
let watchRetryTimer = null;

/**
 * Clear any pending watch page retry
 */
function clearWatchRetry() {
  if (watchRetryTimer) {
    clearTimeout(watchRetryTimer);
    watchRetryTimer = null;
  }
}

/**
 * Render watch page with retry logic for async metadata loading
 * [I/O]
 */
function renderWatchWithRetry(state, siteState, container, retryCount = 0) {
  injectWatchStyles();
  document.body.classList.add('vilify-watch-page');
  
  const dp = getDataProvider();
  const ctx = dp.getVideoContext();
  
  // Check if metadata is loaded (title AND channel should be present)
  const hasMetadata = ctx && (ctx.title || ctx.channelName);
  
  if (!hasMetadata && retryCount < WATCH_MAX_RETRIES) {
    // Show loading state and schedule retry
    container.innerHTML = `
      <div class="vilify-tui-box" data-label="video">
        <div class="vilify-watch-loading">Loading video info... (${retryCount + 1}/${WATCH_MAX_RETRIES})</div>
      </div>
    `;
    
    watchRetryTimer = setTimeout(() => {
      renderWatchWithRetry(state, siteState, container, retryCount + 1);
    }, WATCH_RETRY_DELAY);
    return;
  }
  
  // Clear any pending retry
  clearWatchRetry();
  
  // Render the watch page (will show "Untitled"/"Unknown" if still no data after retries)
  renderWatchPage(ctx, siteState, container);
}

// =============================================================================
// SITE CONFIG
// =============================================================================

// =============================================================================
// PAGE CONFIGURATIONS
// =============================================================================

/**
 * Default listing page config.
 * Used for home, search, subscriptions, channel, playlist, etc.
 * @type {PageConfig}
 */
const listingPageConfig = {
  render: renderYouTubeListing,
  // No special lifecycle needed for listing pages
};

/**
 * Watch page config with lifecycle hooks.
 * @type {PageConfig}
 */
const watchPageConfig = {
  render: (state, siteState, container) => {
    renderWatchWithRetry(state, siteState, container, 0);
  },
  
  /**
   * Called when entering watch page.
   * Applies video settings, initiates transcript and chapters fetch.
   * Uses pure state transitions for async data management.
   * 
   * @param {Object} ctx - Context with state management functions
   * @param {Function} ctx.getSiteState - Get current site state
   * @param {Function} ctx.updateSiteState - Update site state via function
   * @param {Function} ctx.render - Trigger re-render
   */
  onEnter: async (ctx) => {
    applyDefaultVideoSettings();
    
    const videoId = extractVideoId(location.href);
    if (!videoId) return;
    
    // Set loading state immediately using pure transitions
    ctx.updateSiteState(state => onTranscriptRequest(state, videoId));
    ctx.updateSiteState(state => onChaptersRequest(state, videoId));
    
    // Async I/O - fetch transcript (delay for player API readiness)
    setTimeout(async () => {
      console.log('[Vilify] Fetching transcript for', videoId);
      const result = await fetchTranscript(videoId);
      console.log('[Vilify] Transcript result:', result.status, result.lines.length, 'lines');
      
      // Update state with result using pure transition
      // onTranscriptLoad validates videoId matches (ignores stale results)
      ctx.updateSiteState(state => onTranscriptLoad(state, result));
    }, 500);
    
    // Async I/O - fetch chapters (slight delay for DOM to settle)
    setTimeout(() => {
      console.log('[Vilify] Fetching chapters for', videoId);
      const chapters = getChapters();
      console.log('[Vilify] Chapters result:', chapters.length, 'chapters');
      
      // Update state with result using pure transition
      ctx.updateSiteState(state => onChaptersLoad(state, {
        status: 'loaded',
        videoId,
        chapters
      }));
    }, 300);
  },
  
  /**
   * Called when leaving watch page.
   * Cleans up retry timer, drawers, and transcript state.
   */
  onLeave: () => {
    clearWatchRetry();
    resetYouTubeDrawers();
    // Note: transcript state cleared via onUrlChange in core
  },
  
  // Watch page specific functions
  nextCommentPage,
  prevCommentPage,
};

// =============================================================================
// SITE CONFIG
// =============================================================================

/**
 * YouTube site configuration.
 * Defines theme, page detection, scrapers, commands, and page configs.
 * @type {SiteConfig}
 */
export const youtubeConfig = {
  name: 'youtube',
  matches: ['*://www.youtube.com/*', '*://youtube.com/*'],
  theme: youtubeTheme,
  logo: null, // Could add YouTube logo data URL here

  /**
   * Get current page type from URL.
   * @returns {YouTubePageType}
   */
  getPageType: getYouTubePageType,

  /**
   * Get items for current page.
   * Returns videos for all pages (including recommended videos on watch page).
   * @returns {Array<ContentItem>}
   */
  getItems: () => {
    // Use DataProvider which extracts from ytInitialData (with DOM fallback)
    const dp = getDataProvider();
    return dp.getVideos();
  },

  /**
   * Get available commands for command palette.
   * @param {Object} ctx - Context with state, callbacks
   * @returns {Array<Command>}
   */
  getCommands: (ctx) => getYouTubeCommands(ctx),

  /**
   * Get key sequence bindings.
   * @param {Object} ctx - Context with state, callbacks
   * @returns {Object<string, Function>}
   */
  getKeySequences: (ctx) => getYouTubeKeySequences(ctx),

  /**
   * Get single-key actions (including Shift modifiers like Shift+Y)
   * @param {Object} ctx - Context with state, callbacks
   * @returns {Object<string, Function>}
   */
  getSingleKeyActions: (ctx) => getYouTubeSingleKeyActions(ctx),

  /**
   * Get video description text.
   * @returns {string}
   */
  getDescription,

  /**
   * Get video chapters.
   * @returns {Array<Chapter>}
   */
  getChapters,

  /**
   * Seek to a specific chapter.
   * @param {Chapter} chapter
   */
  seekToChapter,

  /**
   * Get drawer handler for site-specific drawers.
   * @param {string} drawerState - Current drawer state
   * @returns {DrawerHandler|null}
   */
  getDrawerHandler: getYouTubeDrawerHandler,

  /**
   * Page configurations per page type.
   * Maps YouTubePageType to PageConfig.
   * @type {Record<string, PageConfig>}
   */
  pages: {
    home: listingPageConfig,
    search: listingPageConfig,
    subscriptions: listingPageConfig,
    channel: listingPageConfig,
    playlist: listingPageConfig,
    history: listingPageConfig,
    library: listingPageConfig,
    shorts: listingPageConfig,
    other: listingPageConfig,
    watch: watchPageConfig,
  },

  /**
   * Factory for site-specific state.
   * @returns {YouTubeState}
   */
  createSiteState: createYouTubeState,
};

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Re-export for direct imports
export * from './scraper.js';
export * from './commands.js';
export * from './player.js';
export * from './watch.js';
