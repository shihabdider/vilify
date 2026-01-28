// YouTube site configuration
// Following HTDP design from .design/DATA.md and .design/BLUEPRINT.md

import { getYouTubePageType, getVideos, getVideoContext } from './scraper.js';
import { getYouTubeCommands, getYouTubeKeySequences } from './commands.js';
import { applyDefaultVideoSettings } from './player.js';
import { injectWatchStyles, renderWatchPage, nextCommentPage, prevCommentPage } from './watch.js';

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
  };
}

// =============================================================================
// SITE CONFIG
// =============================================================================

/**
 * YouTube site configuration.
 * Defines theme, page detection, scrapers, commands, and layouts.
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
   * Returns videos for listing pages, empty for watch page.
   * @returns {Array<ContentItem>}
   */
  getItems: () => {
    const pageType = getYouTubePageType();
    if (pageType === 'watch') return [];
    return getVideos();
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
   * Layout definitions per page type.
   * Maps YouTubePageType to LayoutDef.
   * @type {Layouts}
   */
  layouts: {
    home: 'listing',
    search: 'listing',
    subscriptions: 'listing',
    channel: 'listing',
    playlist: 'listing',
    history: 'listing',
    library: 'listing',
    shorts: 'listing',
    other: 'listing',
    watch: (state, siteState, container) => {
      // Custom watch page layout
      injectWatchStyles();
      document.body.classList.add('vilify-watch-page');
      const ctx = getVideoContext();
      renderWatchPage(ctx, siteState, container);
    },
  },

  /**
   * Factory for site-specific state.
   * @returns {YouTubeState}
   */
  createSiteState: createYouTubeState,

  /**
   * Called after initial render completes.
   * Applies default video settings on watch page.
   */
  onContentReady: () => {
    if (getYouTubePageType() === 'watch') {
      applyDefaultVideoSettings();
    }
  },

  /**
   * Watch page specific functions (for comment pagination).
   */
  watch: {
    nextCommentPage,
    prevCommentPage,
  },
};

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Re-export for direct imports
export * from './scraper.js';
export * from './commands.js';
export * from './player.js';
export * from './watch.js';
