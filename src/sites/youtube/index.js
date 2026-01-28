// YouTube site configuration
// TODO: Implement YouTube site config

import { getVideos, getChapters, getComments, getYouTubePageType, getVideoContext, getDescription } from './scraper.js';

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
  
  // Commands - TODO: implement
  commands: [],
  
  // Player controls - TODO: implement
  player: {},
  
  // Page renderers - TODO: implement
  renderers: {},
};
