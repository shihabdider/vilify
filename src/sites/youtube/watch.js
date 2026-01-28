// Watch page layout
// Implements watch page rendering following HTDP design from .design/DATA.md and .design/BLUEPRINT.md

import { el, clear } from '../../core/view.js';
import { getVideoContext, getComments, getDescription, getChapters } from './scraper.js';

// =============================================================================
// CSS STYLES
// =============================================================================

const WATCH_CSS = `
  /* Watch page: player left, sidebar right */
  body.vilify-watch-page #vilify-focus {
    left: auto; right: 0; width: 350px;
    border-left: 2px solid var(--bg-3);
  }
  
  body.vilify-watch-page .vilify-status-bar {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: var(--bg-1); z-index: 10001;
  }
  
  body.vilify-watch-page #movie_player {
    position: fixed !important; top: 0 !important; left: 0 !important;
    width: calc(100% - 350px) !important; height: calc(100vh - 32px) !important;
    z-index: 10000 !important; visibility: visible !important;
  }
  
  /* TUI box pattern */
  .vilify-tui-box {
    position: relative; border: 2px solid var(--bg-3);
    padding: 16px; margin: 12px;
  }
  .vilify-tui-box::before {
    content: attr(data-label);
    position: absolute; top: -10px; left: 10px;
    background: var(--bg-1); color: var(--txt-3);
    padding: 0 6px; font-size: 12px;
  }
  
  /* Video info panel */
  .vilify-watch-title { font-size: 14px; color: var(--txt-1); margin: 0 0 8px; line-height: 1.4; }
  .vilify-watch-channel { color: var(--txt-2); font-size: 13px; margin-bottom: 8px; }
  .vilify-watch-hints { color: var(--txt-3); font-size: 11px; }
  .vilify-watch-hints kbd { border: 1px solid var(--bg-3); padding: 1px 5px; font-size: 10px; margin: 0 2px; }
  
  /* Channel row with subscribe button */
  .vilify-watch-channel-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  
  /* Subscribe button */
  .vilify-subscribe-btn {
    background: transparent; border: 1px solid var(--accent);
    color: var(--accent); padding: 4px 12px;
    font-family: var(--font-mono); font-size: 12px; cursor: pointer;
    flex-shrink: 0;
  }
  .vilify-subscribe-btn:hover { background: var(--accent); color: var(--bg-1); }
  .vilify-subscribe-btn.subscribed { border-color: var(--txt-3); color: var(--txt-3); }
  
  /* Comments */
  .vilify-comments-list { flex: 1; overflow-y: auto; padding: 16px; }
  .vilify-comment { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--bg-3); }
  .vilify-comment:last-child { border-bottom: none; }
  .vilify-comment-author { color: var(--txt-4); font-size: 12px; margin-bottom: 4px; }
  .vilify-comment-text { color: var(--txt-2); font-size: 12px; line-height: 1.4; }
  .vilify-comments-pagination {
    padding: 8px 16px; border-top: 1px solid var(--bg-3);
    font-size: 11px; color: var(--txt-3); text-align: center;
  }
  
  /* Comments loading/disabled states */
  .vilify-comments-status {
    padding: 16px; color: var(--txt-3); font-size: 12px; text-align: center;
  }
`;

// Track if styles have been injected
let stylesInjected = false;

// =============================================================================
// STYLE INJECTION
// =============================================================================

/**
 * Inject watch page styles into document
 * [I/O]
 * 
 * @example
 * injectWatchStyles()  // Adds <style> element to head
 */
export function injectWatchStyles() {
  // Template: I/O - DOM mutation
  // Guard: only inject once
  if (stylesInjected) return;
  
  const styleEl = document.createElement('style');
  styleEl.id = 'vilify-watch-styles';
  styleEl.textContent = WATCH_CSS;
  document.head.appendChild(styleEl);
  
  stylesInjected = true;
}

// =============================================================================
// WATCH PAGE LAYOUT
// =============================================================================

/**
 * Render watch page layout in container
 * [I/O]
 * 
 * @param {VideoContext|null} ctx - Video context from scraper
 * @param {YouTubeState} state - YouTube-specific state
 * @param {HTMLElement} container - Container to render into
 * 
 * @example
 * renderWatchPage(videoContext, youtubeState, container)
 * // Renders video info box and comments box
 */
export function renderWatchPage(ctx, state, container) {
  // Template: Compound - access ctx fields, I/O for DOM
  // Inventory: ctx (VideoContext|null), state (YouTubeState), container (HTMLElement)
  
  clear(container);
  
  // Handle loading state
  if (!ctx) {
    container.appendChild(
      el('div', { class: 'vilify-empty' }, ['Loading video info...'])
    );
    return;
  }
  
  // Render video info section
  const infoBox = renderVideoInfoBox(ctx);
  container.appendChild(infoBox);
  
  // Trigger comment loading (YouTube lazy loads comments)
  triggerCommentLoad();
  
  // Render comments section
  const commentsResult = getComments();
  const commentsBox = renderCommentsBox(commentsResult, state);
  container.appendChild(commentsBox);
  
  // Set up retry to re-check comments after they load
  if (commentsResult.status === 'loading') {
    scheduleCommentRetry(state, container, ctx);
  }
  
  // Add watch page class to body for CSS targeting
  document.body.classList.add('vilify-watch-page');
}

// =============================================================================
// VIDEO INFO SECTION
// =============================================================================

/**
 * Create video info box element
 * [PURE]
 * 
 * @param {VideoContext} ctx - Video context
 * @returns {HTMLElement} Video info box
 */
function renderVideoInfoBox(ctx) {
  // Template: Compound - access all fields from ctx
  // Inventory: ctx.title, ctx.channelName, ctx.isSubscribed
  
  // Subscribe button
  const subscribeBtn = el(
    'button',
    { 
      class: ctx.isSubscribed ? 'vilify-subscribe-btn subscribed' : 'vilify-subscribe-btn'
    },
    [ctx.isSubscribed ? 'Subscribed' : 'Subscribe']
  );
  
  // Channel row with channel name and subscribe button
  const channelRow = el('div', { class: 'vilify-watch-channel-row' }, [
    el('div', { class: 'vilify-watch-channel' }, [ctx.channelName || 'Unknown']),
    subscribeBtn
  ]);
  
  // Keyboard hints
  const hints = el('div', { class: 'vilify-watch-hints' }, [
    el('kbd', {}, ['m']), ' subscribe  ',
    el('kbd', {}, ['zo']), ' desc  ',
    el('kbd', {}, ['f']), ' chapters'
  ]);
  
  // Build info box with TUI pattern
  const infoBox = el('div', { class: 'vilify-tui-box', 'data-label': 'video' }, [
    el('h1', { class: 'vilify-watch-title' }, [ctx.title || 'Untitled']),
    channelRow,
    hints
  ]);
  
  return infoBox;
}

/**
 * Render video info section into container
 * [I/O]
 * 
 * @param {VideoContext} ctx - Video context
 * @param {HTMLElement} container - Container to render into
 * 
 * @example
 * renderVideoInfo(videoContext, container)
 * // Renders title, channel, subscribe button
 */
export function renderVideoInfo(ctx, container) {
  // Template: I/O - DOM mutation
  // Inventory: ctx (VideoContext), container (HTMLElement)
  
  clear(container);
  
  if (!ctx) {
    container.appendChild(
      el('div', { class: 'vilify-empty' }, ['No video info'])
    );
    return;
  }
  
  const infoBox = renderVideoInfoBox(ctx);
  container.appendChild(infoBox);
}

// =============================================================================
// COMMENTS SECTION
// =============================================================================

/** Number of comments per page */
const COMMENTS_PER_PAGE = 5;

/**
 * Create comments box element
 * [PURE]
 * 
 * @param {CommentsResult} commentsResult - Comments data with status
 * @param {YouTubeState} state - YouTube state for pagination
 * @returns {HTMLElement} Comments box element
 */
function renderCommentsBox(commentsResult, state) {
  // Template: Compound - access commentsResult.comments, commentsResult.status
  // Inventory: commentsResult (CommentsResult), state (YouTubeState)
  
  const { comments, status } = commentsResult;
  const commentPage = state?.commentPage || 0;
  
  // Handle status variants
  // Template: Enum - case per CommentStatus variant
  let listContent;
  
  if (status === 'loading') {
    listContent = [
      el('div', { class: 'vilify-comments-status' }, ['Loading comments...'])
    ];
  } else if (status === 'disabled') {
    listContent = [
      el('div', { class: 'vilify-comments-status' }, ['Comments are disabled'])
    ];
  } else {
    // Status is 'loaded'
    listContent = renderCommentsList(comments, commentPage);
  }
  
  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(comments.length / COMMENTS_PER_PAGE));
  const currentPage = commentPage + 1;
  const paginationText = `[^b] ${currentPage}/${totalPages} [^f]`;
  
  // Build comments box
  const commentsBox = el('div', { class: 'vilify-tui-box', 'data-label': 'comments' }, [
    el('div', { class: 'vilify-comments-list' }, listContent),
    el('div', { class: 'vilify-comments-pagination' }, [paginationText])
  ]);
  
  return commentsBox;
}

/**
 * Render list of comments for current page
 * [PURE]
 * 
 * @param {Array<Comment>} comments - All comments
 * @param {number} page - Current page (0-indexed)
 * @returns {Array<HTMLElement>} Comment elements
 */
function renderCommentsList(comments, page) {
  // Template: Self-referential (list) - iterate over comments
  // Inventory: comments (Array<Comment>), page (Number)
  
  if (comments.length === 0) {
    return [
      el('div', { class: 'vilify-comments-status' }, ['No comments yet'])
    ];
  }
  
  // Calculate page slice
  const start = page * COMMENTS_PER_PAGE;
  const end = start + COMMENTS_PER_PAGE;
  const pageComments = comments.slice(start, end);
  
  // Render each comment
  return pageComments.map(comment => renderComment(comment));
}

/**
 * Render single comment element
 * [PURE]
 * 
 * @param {Comment} comment - Comment data
 * @returns {HTMLElement} Comment element
 */
function renderComment(comment) {
  // Template: Compound - access comment.author, comment.text
  // Inventory: comment (Comment)
  
  return el('div', { class: 'vilify-comment' }, [
    el('div', { class: 'vilify-comment-author' }, [`@${comment.author}`]),
    el('div', { class: 'vilify-comment-text' }, [comment.text])
  ]);
}

/**
 * Render comments with pagination into container
 * [I/O]
 * 
 * @param {CommentsResult} commentsResult - Comments data with status
 * @param {YouTubeState} youtubeState - YouTube state for pagination
 * @param {HTMLElement} container - Container to render into
 * 
 * @example
 * renderComments(commentsResult, youtubeState, container)
 * // Renders paginated comments list
 */
export function renderComments(commentsResult, youtubeState, container) {
  // Template: I/O - DOM mutation
  // Inventory: commentsResult (CommentsResult), youtubeState (YouTubeState), container (HTMLElement)
  
  clear(container);
  
  const commentsBox = renderCommentsBox(commentsResult, youtubeState);
  container.appendChild(commentsBox);
}

// =============================================================================
// COMMENT PAGINATION
// =============================================================================

/**
 * Advance to next comment page
 * [PURE]
 * 
 * @param {YouTubeState} state - Current YouTube state
 * @returns {YouTubeState} Updated state with incremented page
 * 
 * @example
 * nextCommentPage({ commentPage: 0, commentPageStarts: [0, 5], ... })
 *   => { commentPage: 1, ... }
 * 
 * // Already at last known page
 * nextCommentPage({ commentPage: 1, commentPageStarts: [0, 5], ... })
 *   => { commentPage: 1, ... }  // No change
 */
export function nextCommentPage(state) {
  // Template: Compound - access state.commentPage, state.commentPageStarts
  // Inventory: state (YouTubeState)
  
  const currentPage = state.commentPage || 0;
  const pageStarts = state.commentPageStarts || [0];
  const maxPage = Math.max(0, pageStarts.length - 1);
  
  // Don't go past last known page
  if (currentPage >= maxPage) {
    return state;
  }
  
  return {
    ...state,
    commentPage: currentPage + 1
  };
}

/**
 * Go to previous comment page
 * [PURE]
 * 
 * @param {YouTubeState} state - Current YouTube state
 * @returns {YouTubeState} Updated state with decremented page
 * 
 * @example
 * prevCommentPage({ commentPage: 2, ... })
 *   => { commentPage: 1, ... }
 * 
 * prevCommentPage({ commentPage: 0, ... })
 *   => { commentPage: 0, ... }  // Already at first
 */
export function prevCommentPage(state) {
  // Template: Compound - access state.commentPage
  // Inventory: state (YouTubeState)
  
  const currentPage = state.commentPage || 0;
  
  // Don't go below 0
  if (currentPage <= 0) {
    return state;
  }
  
  return {
    ...state,
    commentPage: currentPage - 1
  };
}

// =============================================================================
// COMMENT LOADING
// =============================================================================

/**
 * Trigger comment loading by scrolling to comments section
 * [I/O]
 * 
 * @example
 * triggerCommentLoad()
 * // Scrolls to comments, dispatches scroll events
 */
export function triggerCommentLoad() {
  // Template: I/O - DOM interaction
  
  const commentsSection = document.querySelector('#comments, ytd-comments');
  if (commentsSection) {
    // Save current scroll position
    const scrollY = window.scrollY;
    
    // Scroll to comments to trigger lazy load
    commentsSection.scrollIntoView({ behavior: 'instant', block: 'start' });
    
    // Dispatch scroll events to trigger YouTube's lazy loading
    [document, window].forEach(target => {
      target.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    
    // Restore scroll position after a brief delay
    setTimeout(() => {
      window.scrollTo(0, scrollY);
    }, 100);
  }
}

/** Track active comment retry timer */
let commentRetryTimer = null;

/**
 * Schedule a retry to refresh comments after YouTube loads them
 * [I/O]
 * 
 * @param {YouTubeState} state - YouTube state
 * @param {HTMLElement} container - Container element
 * @param {VideoContext} ctx - Video context
 */
function scheduleCommentRetry(state, container, ctx) {
  // Clear any existing timer
  if (commentRetryTimer) {
    clearTimeout(commentRetryTimer);
  }
  
  let retryCount = 0;
  const maxRetries = 5;
  const retryDelay = 1000; // 1 second between retries
  
  function retry() {
    retryCount++;
    
    // Trigger another scroll to comments
    triggerCommentLoad();
    
    // Check if comments loaded
    const commentsResult = getComments();
    
    if (commentsResult.status === 'loaded' || commentsResult.status === 'disabled') {
      // Comments loaded or disabled, re-render the comments section
      const existingCommentsBox = container.querySelector('.vilify-tui-box[data-label="comments"]');
      if (existingCommentsBox) {
        const newCommentsBox = renderCommentsBox(commentsResult, state);
        existingCommentsBox.replaceWith(newCommentsBox);
      }
      commentRetryTimer = null;
    } else if (retryCount < maxRetries) {
      // Still loading, schedule another retry
      commentRetryTimer = setTimeout(retry, retryDelay);
    } else {
      // Max retries reached, stop trying
      commentRetryTimer = null;
    }
  }
  
  // Start first retry after delay
  commentRetryTimer = setTimeout(retry, retryDelay);
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  WATCH_CSS,
  COMMENTS_PER_PAGE
};
