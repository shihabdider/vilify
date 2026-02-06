// DOM Fallback Scraper
// Wraps existing scraper.js functions with _source tagging

import { getVideos as scrapeVideos, getVideoContext as scrapeVideoContext, getRecommendedVideos as scrapeRecommended } from '../scraper.js';

/**
 * Scrape videos from DOM as fallback
 * @returns {Array<Video>}
 */
export function scrapeDOMVideos() {
  const items = scrapeVideos();
  
  // Return items as-is since scraper.js already returns ContentItem format
  // with data.viewCount and data.duration populated
  return items;
}

/**
 * Scrape video context from DOM as fallback
 * @returns {VideoContext|null}
 */
export function scrapeDOMVideoContext() {
  const ctx = scrapeVideoContext();
  if (!ctx) return null;
  
  return {
    videoId: ctx.videoId,
    cleanUrl: ctx.cleanUrl || `https://www.youtube.com/watch?v=${ctx.videoId}`,
    title: ctx.title,
    channelName: ctx.channelName,  // Watch page uses channelName
    channel: ctx.channelName,       // Alias for compatibility
    channelUrl: ctx.channelUrl,
    description: ctx.description || '',
    chapters: ctx.chapters || [],
    duration: ctx.duration || 0,
    currentTime: ctx.currentTime || 0,
    views: ctx.views || null,
    uploadDate: ctx.uploadDate || null,
    keywords: [],
    isSubscribed: ctx.isSubscribed || false,
    paused: ctx.paused ?? true,
    playbackRate: ctx.playbackRate || 1,
    _source: 'dom',
  };
}

/**
 * Scrape recommendations from DOM as fallback
 * @returns {Array<ContentItem>}
 */
export function scrapeDOMRecommendations() {
  const items = scrapeRecommended();
  
  // scraper.js already returns ContentItem format, just add _source tag
  return items.map(item => ({
    ...item,
    _source: 'dom',
  }));
}
