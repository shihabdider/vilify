// YouTube item rendering
// Custom item renderer for YouTube video listings with two-column layout

import { el } from '../../core/view.js';

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
`;

// Track if styles have been injected
let stylesInjected = false;

/**
 * Inject YouTube item styles
 * [I/O]
 */
export function injectYouTubeItemStyles() {
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
 * [PURE]
 * 
 * @param {ContentItem} item - Video content item
 * @param {boolean} isSelected - Whether item is selected
 * @returns {HTMLElement} Rendered item element
 * 
 * @example
 * renderYouTubeItem({ title: 'Video', meta: 'Channel · 2d ago', data: { viewCount: '1M views', duration: '12:34' } }, true)
 * // Returns element with two-column layout
 */
export function renderYouTubeItem(item, isSelected) {
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
  const classes = isSelected ? 'vilify-item selected' : 'vilify-item';

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

  return el('div', { class: classes }, [thumbEl, infoEl]);
}
