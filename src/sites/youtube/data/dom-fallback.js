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
    title: ctx.title,
    channel: ctx.channelName,
    channelUrl: ctx.channelUrl,
    description: ctx.description || '',
    chapters: ctx.chapters || [],
    duration: ctx.duration || 0,
    currentTime: ctx.currentTime || 0,
    viewCount: ctx.views || null,
    keywords: [],
    isSubscribed: ctx.isSubscribed || false,
    paused: ctx.paused ?? true,
    playbackRate: ctx.playbackRate || 1,
    _source: 'dom',
  };
}

/**
 * Scrape recommendations from DOM as fallback
 * @returns {Array<Video>}
 */
export function scrapeDOMRecommendations() {
  const items = scrapeRecommended();
  
  return items.map(item => ({
    videoId: item.id,
    title: item.title,
    channel: item.meta?.split(' · ')[0] || null,
    channelUrl: null,
    views: null,
    published: null,
    duration: null,
    thumbnail: item.thumbnail,
    _source: 'dom',
  }));
}
