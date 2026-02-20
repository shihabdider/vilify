// YouTube site configuration
// Following HTDP design from .design/DATA.md and .design/BLUEPRINT.md

import type { SiteConfig, SiteTheme, YouTubeState, AppState, ContentItem, PageConfig, App, KeyContext, DrawerHandler } from '../../types';
import { getYouTubePageType, getDescription, getChapters, extractVideoId } from './scraper';
import { getDataProvider } from './data/index';
import { getYouTubeCommands, getYouTubeKeySequences, getYouTubeBlockedNativeKeys, addToWatchLater, getPlaylistItemData, removeFromWatchLater, undoRemoveFromWatchLater, dismissVideo, clickUndoDismiss } from './commands';
import { applyDefaultVideoSettings, seekToChapter } from './player';
import { injectWatchStyles, renderWatchPage, nextCommentPage, prevCommentPage } from './watch';
import { getYouTubeDrawerHandler, resetYouTubeDrawers, setRecommendedItems } from './drawers/index';
import { fetchTranscript } from './transcript';
import { 
  createListPageState, 
  createWatchPageState,
  onTranscriptRequest, 
  onTranscriptLoad, 
  onChaptersRequest, 
  onChaptersLoad 
} from './state';
import { renderYouTubeItem, injectYouTubeItemStyles } from './items';
import { getYouTubeHelpSections } from './help-sections';
import { renderListing, updateSortIndicator, updateItemCount } from '../../core/layout';
import { getSortLabel } from '../../core/sort';
import { getVisibleItems } from '../../core/state';
import { getPageItems } from '../../core/view-tree';

// =============================================================================
// THEME
// =============================================================================

/**
 * YouTube theme - Solarized Dark with YouTube red accent
 * @type {SiteTheme}
 */
const youtubeTheme: SiteTheme = {
  bg1: 'hsl(240, 14%, 14%)',
  bg2: 'hsl(240, 15%, 19%)',
  bg3: 'hsl(240, 14%, 24%)',
  txt1: 'hsl(50, 36%, 77%)',
  txt2: 'hsl(49, 30%, 68%)',
  txt3: 'hsl(53, 4%, 43%)',
  txt4: 'hsl(220, 53%, 67%)',
  accent: 'hsl(358, 51%, 51%)',
  accentHover: 'hsl(0, 82%, 53%)',
  modeNormal: 'hsl(205, 69%, 49%)',
  modeSearch: 'hsl(68, 100%, 30%)',
  modeCommand: 'hsl(18, 80%, 44%)',
  modeFilter: 'hsl(331, 64%, 52%)',
  modeReplace: 'hsl(1, 71%, 52%)',
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
function createYouTubeState(): YouTubeState {
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
function renderYouTubeListing(state: AppState, siteState: YouTubeState, container: HTMLElement): void {
  injectYouTubeItemStyles();

  // Use state.page.videos (same source as handleSelect) so sort/filter
  // produces identical ordering for both visual display and item selection.
  // Previously this called dp.getVideos() directly, which could diverge from
  // state.page.videos when continuation data arrived between content polls.
  const allItems = getPageItems(state);
  const items = getVisibleItems(state, allItems);

  const { sort, selectedIdx, watchLaterAdded, watchLaterRemoved, dismissedVideos } = state.ui;

  // Update sort indicator and count in status bar
  updateSortIndicator(getSortLabel(sort.field, sort.direction));
  updateItemCount(items.length);

  // Custom renderer that includes watch later status and dismissed status
  const renderer = (item, isSelected) => renderYouTubeItem(item, isSelected, watchLaterAdded, watchLaterRemoved, dismissedVideos);

  renderListing(items, selectedIdx, container, renderer);
}

/** Current watch page retry timer */
let watchRetryTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Clear any pending watch page retry
 */
function clearWatchRetry(): void {
  if (watchRetryTimer) {
    clearTimeout(watchRetryTimer);
    watchRetryTimer = null;
  }
}

/**
 * Render watch page with retry logic for async metadata loading
 * [I/O]
 */
function renderWatchWithRetry(state: AppState, siteState: YouTubeState, container: HTMLElement, retryCount: number = 0): void {
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
  const watchLaterAdded = state?.ui?.watchLaterAdded || null;
  renderWatchPage(ctx, siteState, container, watchLaterAdded);
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
const listingPageConfig: PageConfig = {
  render: renderYouTubeListing,
  waitForContent: () =>
    document.querySelectorAll(
      'ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model'
    ).length > 0,
  // No special lifecycle needed for listing pages
};

/**
 * Watch page config with lifecycle hooks.
 * @type {PageConfig}
 */
const watchPageConfig: PageConfig = {
  render: (state, siteState, container) => {
    renderWatchWithRetry(state, siteState, container, 0);
  },
  waitForContent: () => document.querySelector('video.html5-main-video') !== null,
  
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
    
    const dp = getDataProvider();
    
    // Set loading state immediately using pure transitions
    ctx.updateSiteState(state => onTranscriptRequest(state, videoId));
    ctx.updateSiteState(state => onChaptersRequest(state, videoId));
    
    // Wait for watch data (initialData + playerResponse) then re-render
    // This ensures views/uploadDate are available from bridge data
    dp.waitForWatchData(() => {
      ctx.render();
    }, 2000);
    
    // Async I/O - fetch transcript (delay for player API readiness)
    setTimeout(async () => {
      console.log('[Vilify] Fetching transcript for', videoId);
      const result = await fetchTranscript(videoId);
      console.log('[Vilify] Transcript result:', result.status, result.lines.length, 'lines');
      
      // Update state with result using pure transition
      // onTranscriptLoad validates videoId matches (ignores stale results)
      ctx.updateSiteState(state => onTranscriptLoad(state, result));
      // Re-render to show transcript hint in video info box
      ctx.render();
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
      // Re-render to update UI with chapters data
      ctx.render();
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
export const youtubeConfig: SiteConfig = {
  name: 'youtube',
  matches: ['*://www.youtube.com/*', '*://youtube.com/*'],
  theme: youtubeTheme,
  logo: null,

  getHelpSections: getYouTubeHelpSections,

  waitForData: async (timeout = 5000) => {
    const dp = getDataProvider();
    if (dp.waitForData) {
      await dp.waitForData(timeout);
    }
  },

  getPositionLabel: (state) => {
    if (state.page?.type === 'watch' && state.page.chapters.length > 0) {
      return `chapters: ${state.page.chapters.length}`;
    }
    return null;
  },

  tabs: [
    { label: 'Home', shortcut: 'gh', type: 'home', path: '/' },
    { label: 'Subscriptions', shortcut: 'gs', type: 'subscriptions', path: '/feed/subscriptions' },
    { label: 'Watch Later', shortcut: 'gw', type: 'playlist', path: '/playlist?list=WL' },
    { label: 'History', shortcut: 'gy', type: 'history', path: '/feed/history' },
  ],
  hints: {
    list: [
      { key: 'j', label: '' }, { key: 'k', label: 'move' },
      { key: 'gg', label: 'top' }, { key: 'G', label: 'bottom' },
      { key: '↵', label: 'play' },
      { key: 'dd', label: 'dismiss' }, { key: 'mw', label: 'watch later' },
      { key: 'i', label: 'search' }, { key: '/', label: 'filter' }, { key: ':', label: 'cmd' },
    ],
    detail: [
      { key: 'zp', label: 'chapters' }, { key: 't', label: 'transcript' },
      { key: '[', label: '' }, { key: ']', label: 'comments' },
      { key: 'zr', label: 'rec' }, { key: 'gc', label: 'channel' },
      { key: 'i', label: 'search' }, { key: ':', label: 'cmd' },
    ],
  },

  /**
   * Get current page type from URL.
   * @returns {YouTubePageType}
   */
  getPageType: getYouTubePageType,

  /**
   * Get items for current page.
   * @deprecated Use createPageState() instead - items should come from state.page
   * Returns videos for all pages (including recommended videos on watch page).
   * @returns {Array<ContentItem>}
   */
  getItems: () => {
    // Use DataProvider which extracts from ytInitialData (with DOM fallback)
    const dp = getDataProvider();
    return dp.getVideos();
  },

  /**
   * Create page state for current page type.
   * Fetches data from DataProvider and returns appropriate PageState.
   * [I/O - reads from DataProvider]
   * 
   * @returns {YouTubePageState} Page state for current page
   */
  createPageState: () => {
    const pageType = getYouTubePageType();
    const dp = getDataProvider();
    
    if (pageType === 'watch') {
      // Watch page: includes video context, recommended, and chapters
      const videoContext = dp.getVideoContext?.() ?? null;
      const recommended = dp.getRecommendations?.() ?? [];
      const chapters = getChapters();
      
      // Cache recommended items for the drawer handler
      setRecommendedItems(recommended);
      
      return createWatchPageState(videoContext, recommended, chapters);
    }
    
    // Clear recommended items cache on non-watch pages
    setRecommendedItems([]);
    
    // All other pages are list pages
    const videos = dp.getVideos?.() ?? [];
    return createListPageState(videos);
  },

  /**
   * Get available commands for command palette.
   * @param {Object} ctx - Context with state, callbacks
   * @returns {Array<Command>}
   */
  getCommands: (ctx) => getYouTubeCommands(ctx),

  /**
   * Get ALL key sequence bindings (including navigation, modifiers, multi-key).
   * @param {Object} app - App callbacks (navigate, select, openPalette, etc.)
   * @param {KeyContext} context - Current keyboard context
   * @returns {Object<string, Function>}
   */
  getKeySequences: (app, context) => getYouTubeKeySequences(app, context),

  /**
   * Get keys to block (preventDefault+stopPropagation) on YouTube pages.
   * @param {KeyContext} context - Current keyboard context
   * @returns {string[]}
   */
  getBlockedNativeKeys: (context) => getYouTubeBlockedNativeKeys(context),

  /**
   * Check if a DOM target is YouTube's native search input.
   * Used by the keyboard engine for Escape-to-blur behavior.
   * @param {HTMLElement} target - Event target element
   * @returns {boolean}
   */
  isNativeSearchInput: (target) => {
    return target.id === 'search' || 
           !!target.closest?.('ytd-searchbox') || 
           !!target.closest?.('#search-form');
  },

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
   * Add a video to Watch Later playlist.
   * @param {string} videoId - Video ID to add
   * @returns {Promise<boolean>} True if added successfully
   */
  addToWatchLater,

  /**
   * Get playlist item data for removal (setVideoId and position).
   * @param {string} videoId - Video ID to look up
   * @returns {Promise<{ setVideoId: string, position: number } | null>}
   */
  getPlaylistItemData,

  /**
   * Remove a video from Watch Later playlist.
   * @param {string} setVideoId - Playlist item ID (NOT the video ID)
   * @returns {Promise<boolean>} True if removed successfully
   */
  removeFromWatchLater,

  /**
   * Undo removal - re-add video to Watch Later at specific position.
   * @param {string} videoId - Video ID to add back
   * @param {number} position - Position to insert at
   * @returns {Promise<boolean>} True if added back successfully
   */
  undoRemoveFromWatchLater,

  /**
   * Dismiss a video via YouTube's "Not interested" dropdown action.
   * @param {string} videoId - Video ID to dismiss
   * @returns {Promise<boolean>} True if YouTube's native action was triggered
   */
  dismissVideo,

  /**
   * Click YouTube's native "Undo" button after a "Not interested" dismissal.
   * @returns {Promise<boolean>} True if Undo button was found and clicked
   */
  clickUndoDismiss,

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
export * from './scraper';
export * from './commands';
export * from './player';
export * from './watch';
