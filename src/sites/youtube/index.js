// YouTube site configuration

import { getVideos, getChapters, getComments, getYouTubePageType, getVideoContext, getDescription } from './scraper.js';
import { getYouTubeCommands, getYouTubeKeySequences, getYouTubeSingleKeyActions } from './commands.js';
import * as player from './player.js';

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
  
  // Page renderers - TODO: implement
  renderers: {},
};

// Re-export for direct imports
export * from './scraper.js';
export * from './commands.js';
export * from './player.js';
