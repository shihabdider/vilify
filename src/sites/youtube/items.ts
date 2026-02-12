// YouTube item rendering
// Custom item renderer for YouTube video listings with two-column layout

import { el } from '../../core/view';
import type { ContentItem, WatchLaterRemoval } from '../../types';

// =============================================================================
// CSS STYLES
// =============================================================================

const YOUTUBE_ITEM_CSS = `
  /* Second meta row for views/duration */
  .vilify-item-meta2 {
    color: var(--txt-3);
    font-size: 12px;
    margin-top: 2px;
  }
  
  /* Watch Later indicator - right side badge */
  .vilify-watch-later-badge {
    background: var(--bg-2);
    border: 1px solid var(--bg-3);
    color: var(--txt-2);
    padding: 2px 6px;
    font-size: 11px;
    text-transform: uppercase;
    font-family: var(--font-mono);
    margin-left: auto;
    flex-shrink: 0;
    align-self: flex-start;
  }
  
  /* Removed from Watch Later - grayed out */
  .vilify-item.vilify-removed {
    opacity: 0.4;
  }
  
  .vilify-removed-badge {
    background: var(--bg-2);
    border: 1px solid var(--bg-3);
    color: var(--txt-3);
    padding: 2px 6px;
    font-size: 11px;
    text-transform: uppercase;
    font-family: var(--font-mono);
    margin-left: auto;
    flex-shrink: 0;
    align-self: flex-start;
    text-decoration: line-through;
  }
`;

// Track if styles have been injected
let stylesInjected = false;

/**
 * Inject YouTube item styles
 * [I/O]
 */
export function injectYouTubeItemStyles(): void {
  if (stylesInjected) return;
  
  const styleEl = document.createElement('style');
  styleEl.id = 'vilify-youtube-item-styles';
  styleEl.textContent = YOUTUBE_ITEM_CSS;
  document.head.appendChild(styleEl);
  
  stylesInjected = true;
}

// =============================================================================
// ITEM RENDERER
// =============================================================================

/**
 * Custom item renderer for YouTube videos.
 * Two-column layout: left has thumbnail + info (title, meta, meta2), right has subscribe button.
 * Shows a badge on items that have been added to Watch Later.
 * Shows grayed-out style for items removed from Watch Later or dismissed.
 * [PURE]
 * 
 * @param {ContentItem} item - Video content item
 * @param {boolean} isSelected - Whether item is selected
 * @param {Set<string>} watchLaterAdded - Set of video IDs added to Watch Later
 * @param {Map<string, object>} watchLaterRemoved - Map of video IDs removed from Watch Later
 * @param {Set<string>} dismissedVideos - Set of video IDs dismissed via "Not interested"
 * @returns {HTMLElement} Rendered item element
 * 
 * @example
 * renderYouTubeItem({ title: 'Video', meta: 'Channel · 2d ago', data: { viewCount: '1M views', duration: '12:34' } }, true, new Set(), new Map(), new Set())
 * // Returns element with two-column layout
 */
export function renderYouTubeItem(item: ContentItem, isSelected: boolean, watchLaterAdded: Set<string> = new Set(), watchLaterRemoved: Map<string, WatchLaterRemoval> = new Map(), dismissedVideos: Set<string> = new Set()): HTMLElement {
  // Handle group headers
  if ('group' in item && item.group) {
    return el('div', { class: 'vilify-group-header' }, [item.group]);
  }

  // Handle commands (from palette) - shouldn't happen in listing but be safe
  if ('label' in item && 'action' in item) {
    // Use default command rendering
    const classes = isSelected ? 'vilify-item selected' : 'vilify-item';
    return el('div', { class: classes }, [item.label || '']);
  }

  // ContentItem: video
  const videoId = item.data?.videoId;
  const isInWatchLater = videoId && watchLaterAdded.has(videoId);
  const isRemoved = videoId && watchLaterRemoved.has(videoId);
  const isDismissed = videoId && dismissedVideos.has(videoId);
  
  // Build class list
  let classes = isSelected ? 'vilify-item selected' : 'vilify-item';
  if (isRemoved || isDismissed) {
    classes += ' vilify-removed';
  }

  // Build second meta row from viewCount and duration
  const meta2Parts = [];
  if (item.data?.viewCount) meta2Parts.push(item.data.viewCount);
  if (item.data?.duration) meta2Parts.push(item.data.duration);
  const meta2Text = meta2Parts.join(' · ');

  // Thumbnail
  const thumbEl = item.thumbnail
    ? el('img', { class: 'vilify-thumb', src: item.thumbnail, alt: '' }, [])
    : el('div', { class: 'vilify-thumb' }, []);

  // Info column: title, meta, meta2
  const infoChildren = [
    el('div', { class: 'vilify-item-title' }, [item.title || ''])
  ];
  
  if (item.meta) {
    infoChildren.push(el('div', { class: 'vilify-item-meta' }, [item.meta]));
  }
  
  if (meta2Text) {
    infoChildren.push(el('div', { class: 'vilify-item-meta2' }, [meta2Text]));
  }

  const infoEl = el('div', { class: 'vilify-item-info' }, infoChildren);

  // Build item children: thumb, info, and optionally badge on right
  const itemChildren = [thumbEl, infoEl];
  
  if (isRemoved) {
    itemChildren.push(el('div', { class: 'vilify-removed-badge' }, ['WL']));
  } else if (isDismissed) {
    itemChildren.push(el('div', { class: 'vilify-removed-badge' }, ['✕']));
  } else if (isInWatchLater) {
    itemChildren.push(el('div', { class: 'vilify-watch-later-badge' }, ['WL']));
  }

  return el('div', { class: classes }, itemChildren);
}
