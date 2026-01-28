/**
 * YouTube Layout
 * 
 * Custom rendering for YouTube pages.
 */

import { el, clear } from '../../core/dom.js';
import { getComments } from './scrape.js';

/**
 * [I/O] Render watch page layout (video info, chapters hint, comments).
 *
 * Examples:
 *   renderWatchPage(videoContext, container)
 */
export function renderWatchPage(videoContext, container) {
  if (!container) return;
  
  clear(container);
  
  // Video info section
  const infoSection = el('div', { class: 'vilify-video-info' }, []);
  renderVideoInfo(videoContext, infoSection);
  container.appendChild(infoSection);
  
  // Chapters hint (if available)
  if (videoContext.chapters && videoContext.chapters.length > 0) {
    const hint = renderChaptersHint(videoContext.chapters.length);
    container.appendChild(hint);
  }
  
  // Description section (collapsed)
  if (videoContext.description) {
    const descSection = renderDescriptionSection(videoContext.description);
    container.appendChild(descSection);
  }
  
  // Comments section
  const commentsSection = el('div', { class: 'vilify-comments-section' }, []);
  const { comments, status } = getComments();
  renderComments(comments, status, commentsSection);
  container.appendChild(commentsSection);
}

/**
 * [I/O] Render video metadata section.
 *
 * Examples:
 *   renderVideoInfo(videoContext, container)
 */
export function renderVideoInfo(videoContext, container) {
  // Title
  const title = el('h1', { class: 'vilify-video-title' }, [videoContext.title || 'Untitled']);
  container.appendChild(title);
  
  // Channel info
  const channelRow = el('div', { class: 'vilify-channel-row' }, []);
  
  if (videoContext.channelName) {
    const channelLink = el('a', { 
      class: 'vilify-channel-name',
      href: videoContext.channelUrl || '#',
    }, [videoContext.channelName]);
    channelRow.appendChild(channelLink);
  }
  
  container.appendChild(channelRow);
  
  // Meta info (views, date)
  const metaParts = [];
  if (videoContext.views) metaParts.push(videoContext.views);
  if (videoContext.uploadDate) metaParts.push(videoContext.uploadDate);
  
  if (metaParts.length > 0) {
    const metaRow = el('div', { class: 'vilify-video-meta' }, [metaParts.join(' · ')]);
    container.appendChild(metaRow);
  }
  
  // Playback info
  const playbackInfo = [];
  if (videoContext.playbackRate !== 1) {
    playbackInfo.push(`${videoContext.playbackRate}x`);
  }
  if (videoContext.paused) {
    playbackInfo.push('Paused');
  }
  
  if (playbackInfo.length > 0) {
    const playbackRow = el('div', { class: 'vilify-playback-info' }, [playbackInfo.join(' · ')]);
    container.appendChild(playbackRow);
  }
}

/**
 * [PURE] Render chapter hint element.
 */
export function renderChaptersHint(chapterCount) {
  return el('div', { class: 'vilify-hint' }, [
    `Press `,
    el('kbd', {}, ['c']),
    ` for ${chapterCount} chapter${chapterCount === 1 ? '' : 's'}`,
  ]);
}

/**
 * [PURE] Render collapsible description section.
 */
function renderDescriptionSection(description) {
  const maxLength = 200;
  const truncated = description.length > maxLength 
    ? description.substring(0, maxLength) + '...'
    : description;
  
  return el('div', { class: 'vilify-description' }, [
    el('div', { class: 'vilify-description-header' }, ['Description']),
    el('div', { class: 'vilify-description-text' }, [truncated]),
  ]);
}

/**
 * [I/O] Render comments list with status.
 */
export function renderComments(comments, status, container) {
  // Header
  const header = el('div', { class: 'vilify-comments-header' }, [
    status === 'loading' ? 'Comments (loading...)' :
    status === 'disabled' ? 'Comments are turned off' :
    `Comments (${comments.length})`,
  ]);
  container.appendChild(header);
  
  // Show message for non-loaded states
  if (status === 'loading') {
    container.appendChild(el('div', { class: 'vilify-comments-message' }, ['Scroll down to load comments...']));
    return;
  }
  
  if (status === 'disabled') {
    return;
  }
  
  if (comments.length === 0) {
    container.appendChild(el('div', { class: 'vilify-comments-message' }, ['No comments yet']));
    return;
  }
  
  // Comment list
  const list = el('div', { class: 'vilify-comment-list' }, []);
  
  comments.forEach((comment, idx) => {
    const commentEl = renderCommentItem(comment, false);
    list.appendChild(commentEl);
  });
  
  container.appendChild(list);
}

/**
 * [PURE] Render a single comment item.
 */
export function renderCommentItem(comment, isSelected) {
  const classes = ['vilify-comment'];
  if (isSelected) classes.push('selected');
  
  return el('div', { class: classes.join(' ') }, [
    el('div', { class: 'vilify-comment-author' }, [comment.author]),
    el('div', { class: 'vilify-comment-text' }, [comment.text]),
  ]);
}
