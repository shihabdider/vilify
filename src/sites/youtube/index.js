// YouTube site configuration

import { getVideos, getChapters, getComments, getYouTubePageType, getVideoContext, getDescription } from './scraper.js';
import { getYouTubeCommands, getYouTubeKeySequences, getYouTubeSingleKeyActions } from './commands.js';
import * as player from './player.js';
import * as watch from './watch.js';

export const youtubeConfig = {
  name: 'youtube',
  matches: ['*://www.youtube.com/*', '*://youtube.com/*'],
  
  // Page detection
  pages: {
    watch: /\/watch/,
    home: /^\/$/,
    search: /\/results/,
    channel: /\/@|\/channel\//,
  },
  
  // Scrapers
  scrapers: {
    videos: getVideos,
    chapters: getChapters,
    comments: getComments,
    pageType: getYouTubePageType,
    videoContext: getVideoContext,
    description: getDescription,
  },
  
  // Commands
  getCommands: getYouTubeCommands,
  getKeySequences: getYouTubeKeySequences,
  getSingleKeyActions: getYouTubeSingleKeyActions,
  
  // Player controls
  player: {
    getVideo: player.getVideo,
    togglePlayPause: player.togglePlayPause,
    seekRelative: player.seekRelative,
    setPlaybackRate: player.setPlaybackRate,
    toggleMute: player.toggleMute,
    toggleFullscreen: player.toggleFullscreen,
    toggleTheaterMode: player.toggleTheaterMode,
    toggleCaptions: player.toggleCaptions,
    seekToChapter: player.seekToChapter,
    seekToPercent: player.seekToPercent,
    applyDefaultVideoSettings: player.applyDefaultVideoSettings,
  },
  
  // Watch page renderers
  watch: {
    injectWatchStyles: watch.injectWatchStyles,
    renderWatchPage: watch.renderWatchPage,
    renderVideoInfo: watch.renderVideoInfo,
    renderComments: watch.renderComments,
    nextCommentPage: watch.nextCommentPage,
    prevCommentPage: watch.prevCommentPage,
    triggerCommentLoad: watch.triggerCommentLoad,
  },
};

// Re-export for direct imports
export * from './scraper.js';
export * from './commands.js';
export * from './player.js';
export * from './watch.js';
