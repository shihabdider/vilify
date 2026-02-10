// Watch page layout
// Implements watch page rendering following HTDP design from .design/DATA.md and .design/BLUEPRINT.md

import { el, clear, showMessage } from '../../core/view.js';
import { getComments, getYouTubePageType, formatDuration } from './scraper.js';

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
  
  /* Watch page content area - flexbox for stretching comments */
  body.vilify-watch-page #vilify-content {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 32px); /* Full height minus status bar */
    overflow: hidden;
  }
  
  /* TUI box pattern */
  .vilify-tui-box {
    position: relative; border: 2px solid var(--bg-3);
    padding: 16px; margin: 12px;
  }
  .vilify-tui-box::before {
    content: attr(data-label);
    position: absolute; top: -9px; left: 10px;
    background: var(--bg-1); color: var(--txt-3);
    padding: 0 6px; font-size: 12px; line-height: 1;
  }
  
  /* Video info box - fixed height */
  .vilify-tui-box[data-label="video"] {
    flex-shrink: 0;
  }
  
  /* Comments section - uses ::after for border so ::before label can sit above it */
  .vilify-comments {
    position: relative;
    flex: 1;
    margin: 12px;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .vilify-comments::before {
    content: 'comments';
    position: absolute;
    top: -10px;
    left: 10px;
    background: var(--bg-1);
    color: var(--txt-3);
    padding: 0 6px;
    font-size: 12px;
    z-index: 1;
  }
  .vilify-comments::after {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px solid var(--bg-3);
    pointer-events: none;
  }
  
  /* Video info panel */
  .vilify-watch-title { font-size: 14px; color: var(--txt-1); margin: 0 0 8px; line-height: 1.4; }
  .vilify-watch-channel { 
    color: var(--txt-2); font-size: 13px;
    display: flex; align-items: baseline;
    flex-wrap: nowrap;
    width: 100%;
  }
  .vilify-watch-channel-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 0 1 auto;
    min-width: 0;
  }
  .vilify-watch-stats { color: var(--txt-3); font-size: 12px; margin-top: 4px; }
  
  /* Subscription status indicator (after channel name) */
  /* "subscribed" = grey, "subscribe" = red */
  .vilify-sub-status { color: var(--txt-3); flex: 0 0 auto; white-space: nowrap; margin-left: 4px; }
  .vilify-sub-status.not-subscribed { color: var(--accent); }
  
  /* Action hints — 3-column grid, rows fill left-to-right */
  .vilify-watch-actions {
    display: grid;
    grid-template-columns: repeat(3, auto);
    gap: 6px 10px;
    justify-content: start;
    margin-top: 12px;
    font-size: 11px;
  }
  
  /* Individual action hint */
  .vilify-action-hint {
    color: var(--txt-3);
  }
  .vilify-action-hint kbd {
    border: 1px solid var(--bg-3);
    padding: 1px 5px;
    font-size: 10px;
    margin-right: 4px;
    color: var(--txt-3);
  }
  .vilify-action-hint.vilify-wl-added {
    opacity: 0.4;
  }
  
  /* Comments list - NO scrolling, pagination handles overflow */
  .vilify-comments-list { 
    flex: 1; 
    overflow: hidden;
    padding: 20px 16px 12px; /* Top padding for label clearance */
    min-height: 0;
  }
  .vilify-comments-list::-webkit-scrollbar { width: 6px; }
  .vilify-comments-list::-webkit-scrollbar-track { background: transparent; }
  .vilify-comments-list::-webkit-scrollbar-thumb { background: var(--bg-3); }
  .vilify-comment { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--bg-3); }
  .vilify-comment:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .vilify-comment-author { color: var(--txt-4); font-size: 12px; font-weight: 400; margin-bottom: 4px; word-wrap: break-word; overflow-wrap: break-word; }
  .vilify-comment-text { color: var(--txt-2); font-size: 12px; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word; }
  .vilify-comments-pagination {
    display: flex; align-items: center; justify-content: center; gap: 12px;
    padding: 10px 16px; border-top: 1px solid var(--bg-3);
    font-size: 11px; color: var(--txt-3); flex-shrink: 0;
  }
  .vilify-comments-pagination kbd {
    background: transparent; border: 1px solid var(--bg-3);
    padding: 1px 5px; font-size: 10px; font-family: var(--font-mono);
  }
  .vilify-comments-page-info { min-width: 50px; text-align: center; }
  
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
export function renderWatchPage(ctx, state, container, watchLaterAdded = null) {
  // Template: Compound - access ctx fields, I/O for DOM
  // Inventory: ctx (VideoContext|null), state (YouTubeState), container (HTMLElement)
  
  // Reset comment window for new video
  commentStartIdx = 0;
  commentEndIdx = 0;
  commentStartHistory = [];
  stopCommentObserver();
  
  clear(container);
  
  // Handle loading state
  if (!ctx) {
    container.appendChild(
      el('div', { class: 'vilify-empty' }, ['Loading video info...'])
    );
    return;
  }
  
  // Render video info section
  const infoBox = renderVideoInfoBox(ctx, state, watchLaterAdded);
  container.appendChild(infoBox);
  
  // Trigger comment loading (YouTube lazy loads comments)
  triggerCommentLoad();
  
  // Render comments section
  const commentsResult = getComments();
  const commentsBox = renderCommentsBox(commentsResult, state);
  container.appendChild(commentsBox);
  
  // Always set up retry/observer unless comments are disabled.
  // YouTube lazy-loads comments, so even if we have some initially,
  // more may arrive. The observer will stop when comments stabilize.
  if (commentsResult.status !== 'disabled') {
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
 * @param {YouTubeState} siteState - YouTube-specific state (optional)
 * @returns {HTMLElement} Video info box
 */
function renderVideoInfoBox(ctx, siteState = null, watchLaterAdded = null) {
  // Template: Compound - access all fields from ctx
  // Inventory: ctx.title, ctx.channelName, ctx.isSubscribed, ctx.uploadDate
  
  // Channel with subscription status (always visible)
  // Wrap channel name in span for truncation, keep subscribe status visible
  const channelNameEl = el('span', { class: 'vilify-watch-channel-name' }, [ctx.channelName || 'Unknown']);
  const subStatusClass = ctx.isSubscribed ? 'vilify-sub-status' : 'vilify-sub-status not-subscribed';
  const subStatusText = ctx.isSubscribed ? '· subscribed' : '· subscribe';
  const subStatusEl = el('span', { class: subStatusClass, id: 'vilify-sub-status' }, [subStatusText]);
  const channelEl = el('div', { class: 'vilify-watch-channel' }, [channelNameEl, subStatusEl]);
  
  // Stats row: upload date · views · duration (all on one line)
  const statsParts = [];
  if (ctx.uploadDate) statsParts.push(ctx.uploadDate);
  if (ctx.views) statsParts.push(ctx.views);
  if (ctx.duration) statsParts.push(formatDuration(ctx.duration));
  const statsText = statsParts.join(' · ');
  const statsEl = statsText
    ? el('div', { class: 'vilify-watch-stats' }, [statsText])
    : null;
  
  // Action grid — 3 columns, 2 rows
  // Row 1: ms, mw, (empty)
  // Row 2: f, t, zo
  const subText = ctx.isSubscribed ? 'unsub' : 'sub';
  const videoId = ctx.videoId;
  const isInWatchLater = videoId && watchLaterAdded?.has(videoId);
  const wlClass = isInWatchLater ? 'vilify-action-hint vilify-wl-added' : 'vilify-action-hint';
  const wlText = isInWatchLater ? 'added' : 'watch later';
  
  const actionChildren = [
    // Row 1
    el('span', { class: 'vilify-action-hint', id: 'vilify-sub-action' }, [
      el('kbd', {}, ['ms']),
      subText
    ]),
    el('span', { class: wlClass, id: 'vilify-wl-action' }, [
      el('kbd', {}, ['mw']),
      wlText
    ]),
    // Empty cell to complete row 1
    el('span', {}, []),
    // Row 2: f (always), t (conditional), zo (always)
    el('span', { class: 'vilify-action-hint' }, [
      el('kbd', {}, ['f']),
      'ch'
    ]),
  ];
  
  if (siteState?.transcript?.status === 'loaded') {
    actionChildren.push(
      el('span', { class: 'vilify-action-hint' }, [
        el('kbd', {}, ['t']),
        'transcript'
      ])
    );
  }
  
  actionChildren.push(
    el('span', { class: 'vilify-action-hint' }, [
      el('kbd', {}, ['zo']),
      'desc'
    ])
  );
  
  const actionsRow = el('div', { class: 'vilify-watch-actions' }, actionChildren);
  
  // Build info box with TUI pattern
  const children = [
    el('h1', { class: 'vilify-watch-title' }, [ctx.title || 'Untitled']),
    channelEl,
  ];
  if (statsEl) children.push(statsEl);
  children.push(actionsRow);
  
  const infoBox = el('div', { class: 'vilify-tui-box', 'data-label': 'video' }, children);
  
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

/** Track current starting index for comments window */
let commentStartIdx = 0;

/** Track current ending index (exclusive) for comments window */
let commentEndIdx = 0;

/** History of start positions for going back */
let commentStartHistory = [];

/**
 * Create comments box element (initial structure)
 * [I/O]
 * 
 * @param {CommentsResult} commentsResult - Comments data with status
 * @param {YouTubeState} state - YouTube state for pagination
 * @returns {HTMLElement} Comments box element
 */
function renderCommentsBox(commentsResult, state) {
  const { comments, status } = commentsResult;
  
  // Create the list container
  const commentsList = el('div', { class: 'vilify-comments-list' }, []);
  
  // Create pagination
  const paginationEl = el('div', { class: 'vilify-comments-pagination', id: 'vilify-comments-pagination' }, [
    el('kbd', {}, ['^b']),
    el('span', { class: 'vilify-comments-page-info' }, ['1 / 1']),
    el('kbd', {}, ['^f'])
  ]);
  paginationEl.style.display = 'none';
  
  // Handle status variants - show message
  if (status === 'loading') {
    commentsList.appendChild(
      el('div', { class: 'vilify-comments-status' }, ['Loading comments...'])
    );
  } else if (status === 'disabled') {
    commentsList.appendChild(
      el('div', { class: 'vilify-comments-status' }, ['Comments are disabled'])
    );
  } else if (comments.length === 0) {
    commentsList.appendChild(
      el('div', { class: 'vilify-comments-status' }, ['No comments yet'])
    );
  }
  
  // Build comments box - use vilify-comments class (not tui-box) for proper label/border styling
  const commentsBox = el('div', { class: 'vilify-comments' }, [
    commentsList,
    paginationEl
  ]);
  
  // If we have comments, render them after box is in DOM (need height)
  if (status === 'loaded' && comments.length > 0) {
    // Use requestAnimationFrame to ensure layout is computed
    requestAnimationFrame(() => {
      updateCommentsUI(comments);
    });
  }
  
  return commentsBox;
}

/**
 * Render comments into list element until height is exceeded
 * [I/O]
 * 
 * @param {Array<Comment>} comments - All comments
 * @param {number} startIdx - Index to start from
 * @param {HTMLElement} listEl - List container
 * @param {number} maxHeight - Maximum height before stopping
 * @returns {number} End index (exclusive) - how many comments were rendered
 */
function renderCommentsWindow(comments, startIdx, listEl, maxHeight) {
  clear(listEl);
  const originalOverflow = listEl.style.overflow;
  listEl.style.overflow = 'hidden';
  
  let i = startIdx;
  while (i < comments.length) {
    const comment = comments[i];
    const commentEl = renderComment(comment);
    listEl.appendChild(commentEl);
    
    // Check if we've exceeded available height (but always show at least one)
    if (listEl.scrollHeight > maxHeight && i > startIdx) {
      listEl.removeChild(commentEl);
      break;
    }
    i++;
  }
  
  listEl.style.overflow = originalOverflow;
  return i;
}

/**
 * Update comments UI - renders comments starting from commentStartIdx
 * [I/O]
 * 
 * @param {Array<Comment>} comments - All comments
 */
function updateCommentsUI(comments) {
  const commentsList = document.querySelector('.vilify-comments-list');
  const paginationEl = document.getElementById('vilify-comments-pagination');
  const commentsBox = document.querySelector('.vilify-comments');
  if (!commentsList) return;
  
  if (comments.length === 0) {
    clear(commentsList);
    commentsList.appendChild(
      el('div', { class: 'vilify-comments-status' }, ['No comments available'])
    );
    if (paginationEl) paginationEl.style.display = 'none';
    return;
  }
  
  // Clamp startIdx to valid range
  if (commentStartIdx < 0) commentStartIdx = 0;
  if (commentStartIdx >= comments.length) commentStartIdx = Math.max(0, comments.length - 1);
  
  // Get available height
  let availableHeight = commentsList.clientHeight;
  if (availableHeight < 100 && commentsBox) {
    const paginationHeight = paginationEl ? paginationEl.offsetHeight : 40;
    availableHeight = commentsBox.clientHeight - paginationHeight - 32;
  }
  if (availableHeight < 100) {
    availableHeight = 300;
  }
  
  // Render comments starting from commentStartIdx until we run out of space
  commentEndIdx = renderCommentsWindow(comments, commentStartIdx, commentsList, availableHeight);
  
  // Update pagination - show "1-10 / 45" style
  if (paginationEl) {
    paginationEl.style.display = '';
    const pageInfo = paginationEl.querySelector('.vilify-comments-page-info');
    if (pageInfo) {
      pageInfo.textContent = `${commentStartIdx + 1}-${commentEndIdx} / ${comments.length}`;
    }
  }
  
  console.log('[Vilify] updateCommentsUI:', { total: comments.length, startIdx: commentStartIdx, endIdx: commentEndIdx, availableHeight });
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
  
  // Remove leading @ if present to avoid @@
  const authorName = comment.author.replace(/^@/, '');
  
  return el('div', { class: 'vilify-comment' }, [
    el('div', { class: 'vilify-comment-author' }, [`@${authorName}`]),
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
 * [I/O - re-renders comments]
 * 
 * @param {YouTubeState} state - Current YouTube state
 * @returns {YouTubeState} Updated state with incremented page
 */
export function nextCommentPage(state) {
  const { comments } = getComments();
  
  // Next window starts where current window ends
  const nextStart = commentEndIdx;
  
  // If we're already showing all comments, try to load more
  if (nextStart >= comments.length) {
    loadMoreComments();
    return state;
  }
  
  // Save current position to history before advancing
  commentStartHistory.push(commentStartIdx);
  
  // Advance window
  commentStartIdx = nextStart;
  updateCommentsUI(comments);
  
  return state;
}

/**
 * Go to previous comment window
 * [I/O - re-renders comments]
 * 
 * @param {YouTubeState} state - Current YouTube state
 * @returns {YouTubeState} Updated state
 */
export function prevCommentPage(state) {
  // If we have history, go back to previous position
  if (commentStartHistory.length > 0) {
    commentStartIdx = commentStartHistory.pop();
    const { comments } = getComments();
    updateCommentsUI(comments);
    return state;
  }
  
  // No history - already at the beginning
  if (commentStartIdx <= 0) {
    return state;
  }
  
  // Fallback: go to start (shouldn't normally happen)
  commentStartIdx = 0;
  const { comments } = getComments();
  updateCommentsUI(comments);
  
  return state;
}

/**
 * Load more comments by scrolling in YouTube's DOM to trigger lazy loading
 * [I/O]
 */
function loadMoreComments() {
  if (getYouTubePageType() !== 'watch') return;
  
  showMessage('Loading more comments...');
  
  // Try to click/scroll to continuation elements to trigger YouTube's lazy loading
  const continuationSelectors = [
    'ytd-comments ytd-continuation-item-renderer',
    'ytd-comments #continuations',
    'ytd-comments tp-yt-paper-spinner',
    '#comments ytd-continuation-item-renderer'
  ];
  
  continuationSelectors.forEach(selector => {
    const elem = document.querySelector(selector);
    if (elem) {
      elem.scrollIntoView({ behavior: 'instant', block: 'center' });
      if (elem.click) elem.click();
    }
  });
  
  // Also scroll within the comments containers
  [
    document.querySelector('ytd-comments'),
    document.querySelector('#comments'),
    document.documentElement
  ].forEach(target => {
    if (target) {
      if (target === document.documentElement) {
        window.scrollBy(0, 1000);
      } else {
        target.scrollTop += 500;
      }
    }
  });
  
  // Dispatch scroll events to trigger YouTube's lazy loading
  const scrollEvent = new Event('scroll', { bubbles: true });
  document.dispatchEvent(scrollEvent);
  window.dispatchEvent(scrollEvent);
  
  // Check for new comments after a delay
  const oldCommentCount = getComments().comments.length;
  
  setTimeout(() => {
    const { comments } = getComments();
    if (comments.length > oldCommentCount) {
      // New comments loaded - just refresh current view (don't auto-advance)
      // User can press Ctrl+F again to see new comments
      updateCommentsUI(comments);
      showMessage(`Loaded ${comments.length - oldCommentCount} more comments - press ^f to continue`);
    } else {
      showMessage('No more comments available');
    }
  }, 2000);
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

/** Track MutationObserver for comments */
let commentObserver = null;

/**
 * Stop watching for comments
 */
function stopCommentObserver() {
  if (commentObserver) {
    commentObserver.disconnect();
    commentObserver = null;
  }
  if (commentRetryTimer) {
    clearTimeout(commentRetryTimer);
    commentRetryTimer = null;
  }
}

/**
 * Schedule a retry to refresh comments after YouTube loads them
 * Uses both MutationObserver and timer-based retry for reliability.
 * Stops when comments stabilize (no new comments for 3 consecutive checks).
 * [I/O]
 * 
 * @param {YouTubeState} state - YouTube state
 * @param {HTMLElement} container - Container element
 * @param {VideoContext} ctx - Video context
 */
function scheduleCommentRetry(state, container, ctx) {
  // Clear any existing watchers
  stopCommentObserver();
  
  let retryCount = 0;
  const maxRetries = 15;
  const retryDelay = 800;
  let stableCount = 0;        // How many consecutive checks with no new comments
  const stableThreshold = 3;  // Stop after this many stable checks
  
  // Initialize with current comment count
  const initialResult = getComments();
  let lastCommentCount = initialResult.comments.length;
  
  // Set up MutationObserver on comments container - keeps running to detect more comments
  const commentsContainer = document.querySelector('ytd-comments, #comments');
  if (commentsContainer) {
    commentObserver = new MutationObserver(() => {
      const { comments } = getComments();
      // Only update if we got MORE comments than before
      if (comments.length > lastCommentCount) {
        lastCommentCount = comments.length;
        stableCount = 0; // Reset stable counter
        console.log('[Vilify] MutationObserver detected comments:', comments.length);
        updateCommentsUI(comments);
      }
    });
    commentObserver.observe(commentsContainer, { childList: true, subtree: true });
  }
  
  // Timer-based retry to keep triggering comment loads
  function retry() {
    retryCount++;
    
    // Trigger scroll to comments
    triggerCommentLoad();
    
    // Check if comments loaded
    const commentsResult = getComments();
    const isDisabled = commentsResult.status === 'disabled';
    
    if (isDisabled) {
      stopCommentObserver();
      // Show disabled message
      const commentsList = document.querySelector('.vilify-comments-list');
      if (commentsList) {
        clear(commentsList);
        commentsList.appendChild(
          el('div', { class: 'vilify-comments-status' }, ['Comments are disabled'])
        );
      }
      return;
    }
    
    if (commentsResult.comments.length > lastCommentCount) {
      // Got more comments than before
      lastCommentCount = commentsResult.comments.length;
      stableCount = 0; // Reset stable counter
      console.log('[Vilify] Retry found comments:', lastCommentCount);
      updateCommentsUI(commentsResult.comments);
    } else {
      // No new comments this check
      stableCount++;
      console.log('[Vilify] Comments stable check:', stableCount, '/', stableThreshold);
    }
    
    // Stop if comments have stabilized or max retries reached
    if (stableCount >= stableThreshold) {
      console.log('[Vilify] Comments stabilized at', lastCommentCount);
      stopCommentObserver();
    } else if (retryCount < maxRetries) {
      commentRetryTimer = setTimeout(retry, retryDelay);
    } else {
      console.log('[Vilify] Max comment retries reached');
      stopCommentObserver();
    }
  }
  
  // Start first retry after delay
  commentRetryTimer = setTimeout(retry, retryDelay);
}

// =============================================================================
// SUBSCRIBE BUTTON
// =============================================================================

/**
 * Update the subscribe UI in video info box
 * Updates both the status indicator and action hint
 * [I/O]
 * 
 * @param {boolean} isSubscribed - New subscription state
 * 
 * @example
 * updateSubscribeButton(true)   // Shows "subscribed" (grey), action "unsub"
 * updateSubscribeButton(false)  // Shows "subscribe" (red), action "sub"
 */
export function updateSubscribeButton(isSubscribed) {
  // Update status indicator after channel name
  const statusEl = document.getElementById('vilify-sub-status');
  if (statusEl) {
    statusEl.textContent = isSubscribed ? '· subscribed' : '· subscribe';
    if (isSubscribed) {
      statusEl.classList.remove('not-subscribed');
    } else {
      statusEl.classList.add('not-subscribed');
    }
  }
  
  // Update action hint text
  const actionEl = document.getElementById('vilify-sub-action');
  if (actionEl) {
    // Update text (preserve kbd)
    actionEl.innerHTML = '';
    actionEl.appendChild(el('kbd', {}, ['ms']));
    actionEl.appendChild(document.createTextNode(isSubscribed ? 'unsub' : 'sub'));
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  WATCH_CSS
};
