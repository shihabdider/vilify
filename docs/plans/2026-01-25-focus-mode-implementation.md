# Focus Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace YouTube's default UI with a minimal, TUI-style focus mode overlay using Solarized Dark theme.

**Architecture:** CSS hides YouTube's UI immediately on load. A full-screen overlay renders a single-column video list (listing pages) or minimal player info (watch pages). Videos are scraped from the hidden DOM. Focus mode exits with `:q` or `ZZ`, re-enters on refresh.

**Tech Stack:** Vanilla JS, CSS injection via userscript, DOM scraping (existing approach)

---

## Task 1: Add Solarized Dark Theme Variables

**Files:**
- Modify: `sites/youtube.user.js` (CSS section, lines ~15-35)

**Step 1: Replace YouTube theme variables with Solarized Dark**

Find the CSS `:root` block and replace it:

```css
:root {
  /* Solarized Dark */
  --sol-base03: #002b36;
  --sol-base02: #073642;
  --sol-base01: #586e75;
  --sol-base00: #657b83;
  --sol-base0: #839496;
  --sol-base1: #93a1a1;
  --sol-blue: #268bd2;
  --sol-cyan: #2aa198;
  --sol-green: #859900;
  --sol-red: #dc322f;
  
  /* Semantic mappings */
  --bg-primary: var(--sol-base03);
  --bg-secondary: var(--sol-base02);
  --bg-hover: var(--sol-base01);
  --text-primary: var(--sol-base0);
  --text-secondary: var(--sol-base00);
  --text-emphasis: var(--sol-base1);
  --border: var(--sol-base01);
  --accent: var(--sol-blue);
  --accent-alt: var(--sol-cyan);
  --selection: var(--sol-green);
  --error: var(--sol-red);
  
  /* TUI font */
  --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Consolas', monospace;
}
```

**Step 2: Update CSS to use new variables**

Replace all `var(--yt-*)` references with new semantic variables:
- `--yt-bg-primary` → `--bg-primary`
- `--yt-bg-secondary` → `--bg-secondary`
- `--yt-bg-hover` → `--bg-hover`
- `--yt-text-primary` → `--text-primary`
- `--yt-text-secondary` → `--text-secondary`
- `--yt-red` → `--accent`
- `--yt-red-hover` → `--accent`
- `--yt-border` → `--border`
- `--yt-font` → `--font-mono`

**Step 3: Remove rounded corners**

Find all `border-radius` declarations and change to `0` or remove them.

**Step 4: Test manually**

- Open YouTube
- Press `:` to open command palette
- Verify: Solarized Dark colors, monospace font, no rounded corners

**Step 5: Commit**

```bash
git add sites/youtube.user.js
git commit -m "feat(youtube): switch to Solarized Dark theme with TUI aesthetics"
```

---

## Task 2: Add YouTube UI Hiding CSS

**Files:**
- Modify: `sites/youtube.user.js` (CSS section)

**Step 1: Add CSS to hide YouTube's UI**

Add this CSS block after the `:root` variables:

```css
/* Hide YouTube UI when focus mode is active */
body.vilify-focus-mode ytd-app {
  visibility: hidden !important;
}

body.vilify-focus-mode #movie_player {
  visibility: visible !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 1 !important;
}

body.vilify-focus-mode ytd-watch-flexy {
  visibility: hidden !important;
}

/* Prevent scrolling on YouTube's hidden content */
body.vilify-focus-mode {
  overflow: hidden !important;
}
```

**Step 2: Test manually**

- Add `vilify-focus-mode` class to body in dev tools
- Verify YouTube UI disappears
- Remove class, verify UI returns

**Step 3: Commit**

```bash
git add sites/youtube.user.js
git commit -m "feat(youtube): add CSS to hide YouTube UI in focus mode"
```

---

## Task 3: Create Focus Mode Overlay Structure

**Files:**
- Modify: `sites/youtube.user.js` (add new functions after `createUI`)

**Step 1: Add focus mode state variable**

Add near other state variables (around line 100):

```javascript
let focusModeActive = true;
let focusOverlay = null;
```

**Step 2: Add createFocusOverlay function**

Add after the `createElement` function:

```javascript
function createFocusOverlay() {
  if (focusOverlay) return;
  
  focusOverlay = createElement('div', { id: 'vilify-focus' });
  
  // Header
  const header = createElement('div', { className: 'vilify-header' }, [
    createElement('span', { className: 'vilify-logo', textContent: 'VILIFY' }),
    createElement('span', { className: 'vilify-mode', textContent: '[/] filter' })
  ]);
  
  // Content area (will be populated based on page type)
  const content = createElement('div', { id: 'vilify-content' });
  
  // Footer
  const footer = createElement('div', { className: 'vilify-footer', textContent: 'j/k navigate · enter select · shift+enter new tab · :q quit' });
  
  focusOverlay.appendChild(header);
  focusOverlay.appendChild(content);
  focusOverlay.appendChild(footer);
  
  document.body.appendChild(focusOverlay);
}
```

**Step 3: Add CSS for focus overlay structure**

Add to CSS section:

```css
#vilify-focus {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--bg-primary);
  font-family: var(--font-mono);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  visibility: visible !important;
}

.vilify-header {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.vilify-logo {
  color: var(--accent);
  font-weight: bold;
}

.vilify-mode {
  color: var(--text-secondary);
}

#vilify-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.vilify-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 12px;
}
```

**Step 4: Commit**

```bash
git add sites/youtube.user.js
git commit -m "feat(youtube): add focus mode overlay structure"
```

---

## Task 4: Implement Listing Page Video List

**Files:**
- Modify: `sites/youtube.user.js`

**Step 1: Add renderVideoList function**

```javascript
function renderVideoList(videos, filterQuery = '') {
  const content = document.getElementById('vilify-content');
  if (!content) return;
  
  // Clear content
  while (content.firstChild) {
    content.removeChild(content.firstChild);
  }
  
  // Filter videos if query provided
  let filtered = videos;
  if (filterQuery) {
    const q = filterQuery.toLowerCase();
    filtered = videos.filter(v => 
      v.title.toLowerCase().includes(q) ||
      (v.channelName && v.channelName.toLowerCase().includes(q))
    );
  }
  
  if (filtered.length === 0) {
    content.appendChild(createElement('div', { 
      className: 'vilify-empty', 
      textContent: 'No videos found' 
    }));
    return;
  }
  
  filtered.forEach((video, idx) => {
    const item = createElement('div', {
      className: `vilify-video-item ${idx === selectedIdx ? 'selected' : ''}`,
      'data-idx': String(idx),
      'data-url': video.url
    });
    
    // Thumbnail with box border
    const thumbWrapper = createElement('div', { className: 'vilify-thumb-wrapper' }, [
      createElement('img', { 
        className: 'vilify-thumb', 
        src: video.thumbnailUrl,
        alt: ''
      })
    ]);
    
    // Video info
    const info = createElement('div', { className: 'vilify-video-info' }, [
      createElement('div', { className: 'vilify-video-title', textContent: video.title }),
      createElement('div', { className: 'vilify-video-meta', textContent: video.channelName || '' })
    ]);
    
    item.appendChild(thumbWrapper);
    item.appendChild(info);
    content.appendChild(item);
    
    // Event listeners
    item.addEventListener('click', () => executeVideoItem(idx, false));
    item.addEventListener('mouseenter', () => {
      selectedIdx = idx;
      updateVideoSelection();
    });
  });
}
```

**Step 2: Add CSS for video list**

```css
.vilify-video-item {
  display: flex;
  align-items: flex-start;
  padding: 8px 16px;
  cursor: pointer;
  border-left: 2px solid transparent;
}

.vilify-video-item:hover {
  background: var(--bg-secondary);
}

.vilify-video-item.selected {
  background: var(--bg-secondary);
  border-left-color: var(--selection);
}

.vilify-thumb-wrapper {
  width: 120px;
  height: 68px;
  margin-right: 12px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  overflow: hidden;
}

.vilify-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vilify-video-info {
  flex: 1;
  min-width: 0;
}

.vilify-video-title {
  color: var(--text-primary);
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.vilify-video-meta {
  color: var(--text-secondary);
  font-size: 12px;
}

.vilify-empty {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
}
```

**Step 3: Add helper functions**

```javascript
function updateVideoSelection() {
  const items = document.querySelectorAll('.vilify-video-item');
  items.forEach((el, i) => {
    el.classList.toggle('selected', i === selectedIdx);
  });
  const sel = document.querySelector('.vilify-video-item.selected');
  if (sel) sel.scrollIntoView({ block: 'nearest' });
}

function executeVideoItem(idx, newTab) {
  const items = document.querySelectorAll('.vilify-video-item');
  const item = items[idx];
  if (!item) return;
  
  const url = item.dataset.url;
  if (newTab) {
    openInNewTab(url);
  } else {
    navigateTo(url);
  }
}
```

**Step 4: Commit**

```bash
git add sites/youtube.user.js
git commit -m "feat(youtube): implement focus mode video list for listing pages"
```

---

## Task 5: Implement Watch Page Layout

**Files:**
- Modify: `sites/youtube.user.js`

**Step 1: Add renderWatchPage function**

```javascript
function renderWatchPage() {
  const content = document.getElementById('vilify-content');
  if (!content) return;
  
  // Clear content
  while (content.firstChild) {
    content.removeChild(content.firstChild);
  }
  
  const ctx = getVideoContext();
  if (!ctx) {
    content.appendChild(createElement('div', { 
      className: 'vilify-empty', 
      textContent: 'Loading video...' 
    }));
    return;
  }
  
  // Video info section
  const videoInfo = createElement('div', { className: 'vilify-watch-info' });
  
  // Title
  videoInfo.appendChild(createElement('h1', { 
    className: 'vilify-watch-title', 
    textContent: ctx.title || 'Untitled' 
  }));
  
  // Channel row
  const channelRow = createElement('div', { className: 'vilify-channel-row' });
  channelRow.appendChild(createElement('span', { 
    className: 'vilify-channel-name', 
    textContent: ctx.channelName || 'Unknown channel' 
  }));
  
  // Subscribe button (proxy to YouTube's button)
  const subBtn = createElement('button', { 
    className: 'vilify-subscribe-btn',
    textContent: ctx.isSubscribed ? 'SUBSCRIBED' : 'SUBSCRIBE'
  });
  subBtn.addEventListener('click', () => {
    const ytSubBtn = document.querySelector('ytd-subscribe-button-renderer button');
    if (ytSubBtn) ytSubBtn.click();
  });
  channelRow.appendChild(subBtn);
  
  videoInfo.appendChild(channelRow);
  
  // Description
  const description = getVideoDescription();
  const descEl = createElement('div', { className: 'vilify-description' });
  const descText = createElement('div', { 
    className: 'vilify-description-text collapsed',
    textContent: description || 'No description'
  });
  const descToggle = createElement('button', { 
    className: 'vilify-description-toggle',
    textContent: '[show more]'
  });
  descToggle.addEventListener('click', () => {
    const isCollapsed = descText.classList.toggle('collapsed');
    descToggle.textContent = isCollapsed ? '[show more]' : '[show less]';
  });
  descEl.appendChild(descText);
  descEl.appendChild(descToggle);
  videoInfo.appendChild(descEl);
  
  content.appendChild(videoInfo);
  
  // Comments section
  const commentsSection = createElement('div', { className: 'vilify-comments' });
  commentsSection.appendChild(createElement('div', { 
    className: 'vilify-comments-header', 
    textContent: 'Comments' 
  }));
  
  const commentsList = createElement('div', { className: 'vilify-comments-list' });
  const comments = scrapeComments();
  
  if (comments.length === 0) {
    commentsList.appendChild(createElement('div', { 
      className: 'vilify-empty', 
      textContent: 'Loading comments...' 
    }));
  } else {
    comments.forEach(comment => {
      const commentEl = createElement('div', { className: 'vilify-comment' }, [
        createElement('div', { className: 'vilify-comment-author', textContent: comment.author }),
        createElement('div', { className: 'vilify-comment-text', textContent: comment.text })
      ]);
      commentsList.appendChild(commentEl);
    });
  }
  
  commentsSection.appendChild(commentsList);
  content.appendChild(commentsSection);
}

function getVideoDescription() {
  const descEl = document.querySelector('#description-inner, ytd-text-inline-expander #plain-snippet-text, #description .content');
  return descEl?.textContent?.trim() || '';
}

function scrapeComments() {
  const comments = [];
  const commentEls = document.querySelectorAll('ytd-comment-thread-renderer');
  
  for (const el of Array.from(commentEls).slice(0, 20)) {
    const authorEl = el.querySelector('#author-text');
    const textEl = el.querySelector('#content-text');
    
    if (authorEl && textEl) {
      comments.push({
        author: authorEl.textContent.trim(),
        text: textEl.textContent.trim()
      });
    }
  }
  
  return comments;
}
```

**Step 2: Add CSS for watch page**

```css
/* Watch page - player positioning */
body.vilify-focus-mode.vilify-watch-page #vilify-focus {
  top: 56.25vw; /* 16:9 aspect ratio */
  max-top: 70vh;
}

@media (min-width: 1200px) {
  body.vilify-focus-mode.vilify-watch-page #vilify-focus {
    top: 70vh;
  }
}

body.vilify-focus-mode.vilify-watch-page #movie_player {
  height: 56.25vw !important;
  max-height: 70vh !important;
  width: 100% !important;
}

.vilify-watch-info {
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.vilify-watch-title {
  font-size: 16px;
  font-weight: normal;
  color: var(--text-emphasis);
  margin: 0 0 8px 0;
}

.vilify-channel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.vilify-channel-name {
  color: var(--text-primary);
}

.vilify-subscribe-btn {
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  padding: 4px 12px;
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
}

.vilify-subscribe-btn:hover {
  background: var(--accent);
  color: var(--bg-primary);
}

.vilify-description {
  margin-top: 12px;
}

.vilify-description-text {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.vilify-description-text.collapsed {
  max-height: 60px;
  overflow: hidden;
}

.vilify-description-toggle {
  background: none;
  border: none;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 0;
}

.vilify-comments {
  padding: 16px;
}

.vilify-comments-header {
  color: var(--text-emphasis);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.vilify-comment {
  margin-bottom: 16px;
}

.vilify-comment-author {
  color: var(--accent-alt);
  font-size: 12px;
  margin-bottom: 4px;
}

.vilify-comment-text {
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.4;
}
```

**Step 3: Commit**

```bash
git add sites/youtube.user.js
git commit -m "feat(youtube): implement focus mode watch page layout"
```

---

## Task 6: Add Focus Mode Initialization and Page Routing

**Files:**
- Modify: `sites/youtube.user.js`

**Step 1: Add initFocusMode function**

```javascript
function initFocusMode() {
  if (!focusModeActive) return;
  
  // Add focus mode class to body
  document.body.classList.add('vilify-focus-mode');
  
  // Create overlay if needed
  createFocusOverlay();
  
  // Route to appropriate renderer
  const pageType = getPageType();
  
  if (pageType === 'watch') {
    document.body.classList.add('vilify-watch-page');
    renderWatchPage();
  } else {
    document.body.classList.remove('vilify-watch-page');
    const videos = scrapeVideos();
    renderVideoList(videos);
  }
}

function exitFocusMode() {
  focusModeActive = false;
  document.body.classList.remove('vilify-focus-mode', 'vilify-watch-page');
  if (focusOverlay) {
    focusOverlay.remove();
    focusOverlay = null;
  }
  showToast('Focus mode off (refresh to re-enable)');
}
```

**Step 2: Add waitForContent function**

```javascript
function waitForContent(callback, maxWait = 5000) {
  const startTime = Date.now();
  
  function check() {
    const hasVideos = document.querySelector('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, yt-lockup-view-model');
    const hasPlayer = document.querySelector('#movie_player video');
    const pageType = getPageType();
    
    // On watch page, wait for player; otherwise wait for videos
    const ready = pageType === 'watch' ? hasPlayer : hasVideos;
    
    if (ready) {
      callback();
    } else if (Date.now() - startTime < maxWait) {
      setTimeout(check, 100);
    } else {
      // Timeout - show anyway
      callback();
    }
  }
  
  check();
}
```

**Step 3: Update initialization at bottom of script**

Replace the existing initialization code at the bottom with:

```javascript
// ============================================
// Initialization
// ============================================
function init() {
  injectStyles();
  waitForContent(() => {
    initFocusMode();
  });
}

// Run on initial load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('[Vilify] YouTube focus mode loaded');
```

**Step 4: Update SPA navigation handler**

Update the `onNavigate` function:

```javascript
function onNavigate() {
  // Close palette on navigation
  if (isPaletteOpen()) {
    closePalette();
  }
  // Reset settings flag so they get applied on new video
  settingsApplied = false;
  // Clear video cache
  clearVideoCache();
  // Reset selection
  selectedIdx = 0;
  // Re-initialize focus mode for new page
  if (focusModeActive) {
    waitForContent(() => {
      initFocusMode();
    });
  }
  console.log('[Vilify] Navigated to:', location.pathname);
}
```

**Step 5: Test manually**

- Open YouTube home page
- Verify focus mode overlay appears with video list
- Navigate to a video
- Verify watch page layout (player + info + comments)
- Navigate to search results
- Verify video list appears

**Step 6: Commit**

```bash
git add sites/youtube.user.js
git commit -m "feat(youtube): add focus mode initialization and page routing"
```

---

## Task 7: Implement Filter Input for Listing Pages

**Files:**
- Modify: `sites/youtube.user.js`

**Step 1: Add filter input to focus overlay**

Update `createFocusOverlay` to include filter input:

```javascript
function createFocusOverlay() {
  if (focusOverlay) return;
  
  focusOverlay = createElement('div', { id: 'vilify-focus' });
  
  // Header with filter
  const header = createElement('div', { className: 'vilify-header' });
  header.appendChild(createElement('span', { className: 'vilify-logo', textContent: 'VILIFY' }));
  
  // Filter input (hidden by default)
  const filterWrapper = createElement('div', { className: 'vilify-filter-wrapper hidden' });
  const filterInput = createElement('input', {
    id: 'vilify-filter',
    type: 'text',
    placeholder: 'filter videos...',
    autocomplete: 'off',
    spellcheck: 'false'
  });
  filterWrapper.appendChild(createElement('span', { textContent: '/' }));
  filterWrapper.appendChild(filterInput);
  header.appendChild(filterWrapper);
  
  header.appendChild(createElement('span', { className: 'vilify-mode', textContent: '[/] filter  [i] search  [:] commands' }));
  
  // Content area
  const content = createElement('div', { id: 'vilify-content' });
  
  // Footer
  const footer = createElement('div', { className: 'vilify-footer', textContent: 'j/k navigate · enter select · shift+enter new tab · :q quit' });
  
  focusOverlay.appendChild(header);
  focusOverlay.appendChild(content);
  focusOverlay.appendChild(footer);
  
  document.body.appendChild(focusOverlay);
  
  // Filter input event listeners
  filterInput.addEventListener('input', onFilterInput);
  filterInput.addEventListener('keydown', onFilterKeydown);
}
```

**Step 2: Add filter state and functions**

```javascript
let filterActive = false;
let filterQuery = '';

function openFilter() {
  const wrapper = document.querySelector('.vilify-filter-wrapper');
  const input = document.getElementById('vilify-filter');
  if (!wrapper || !input) return;
  
  filterActive = true;
  wrapper.classList.remove('hidden');
  input.value = filterQuery;
  input.focus();
}

function closeFilter() {
  const wrapper = document.querySelector('.vilify-filter-wrapper');
  const input = document.getElementById('vilify-filter');
  if (!wrapper || !input) return;
  
  filterActive = false;
  wrapper.classList.add('hidden');
  input.blur();
}

function onFilterInput(e) {
  filterQuery = e.target.value;
  const videos = scrapeVideos();
  renderVideoList(videos, filterQuery);
}

function onFilterKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    filterQuery = '';
    closeFilter();
    const videos = scrapeVideos();
    renderVideoList(videos);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    closeFilter();
    // Execute selected video
    const items = document.querySelectorAll('.vilify-video-item');
    if (items.length > 0) {
      executeVideoItem(selectedIdx, e.shiftKey);
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const items = document.querySelectorAll('.vilify-video-item');
    if (items.length > 0) {
      selectedIdx = (selectedIdx + 1) % items.length;
      updateVideoSelection();
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    const items = document.querySelectorAll('.vilify-video-item');
    if (items.length > 0) {
      selectedIdx = (selectedIdx - 1 + items.length) % items.length;
      updateVideoSelection();
    }
  }
}
```

**Step 3: Add CSS for filter**

```css
.vilify-filter-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--accent);
}

.vilify-filter-wrapper.hidden {
  display: none;
}

#vilify-filter {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 14px;
  padding: 2px 4px;
  width: 200px;
  outline: none;
}

#vilify-filter:focus {
  border-bottom-color: var(--accent);
}

#vilify-filter::placeholder {
  color: var(--text-secondary);
}
```

**Step 4: Commit**

```bash
git add sites/youtube.user.js
git commit -m "feat(youtube): add filter input for listing pages"
```

---

## Task 8: Update Keyboard Handler for Focus Mode

**Files:**
- Modify: `sites/youtube.user.js`

**Step 1: Update getKeySequences to include new bindings**

```javascript
function getKeySequences() {
  const videoCtx = getVideoContext();
  
  const sequences = {
    // Focus mode controls
    '/': () => {
      if (focusModeActive && getPageType() !== 'watch') {
        openFilter();
      } else {
        openPalette('video');
      }
    },
    ':': () => openPalette('command'),
    'i': () => focusSearchBox(),
    
    // Navigation: g + key
    'gh': () => navigateTo('/'),
    'gs': () => navigateTo('/feed/subscriptions'),
    'gy': () => navigateTo('/feed/history'),
    'gl': () => navigateTo('/feed/library'),
    'gt': () => navigateTo('/feed/trending'),
  };

  // Video-specific sequences
  if (videoCtx) {
    sequences['gc'] = () => videoCtx.channelUrl && navigateTo(videoCtx.channelUrl);
    sequences['g1'] = () => setPlaybackRate(1);
    sequences['g2'] = () => setPlaybackRate(2);
    sequences['yy'] = copyVideoUrl;
    sequences['yt'] = copyVideoTitle;
    sequences['ya'] = copyVideoTitleAndUrl;
  }

  return sequences;
}
```

**Step 2: Add :q and ZZ exit commands**

Update the command palette input handler or add to key sequences:

```javascript
// In getCommands(), add exit command
cmds.push({ group: 'Focus Mode' });
cmds.push({ label: 'Exit focus mode', icon: '×', action: exitFocusMode, keys: ':q' });
```

Update keyboard handler to catch `:q` and `ZZ`:

```javascript
// Add to the global keydown handler, before the sequence check:
if (!isPaletteOpen() && focusModeActive && !filterActive) {
  // Check for ZZ (must be uppercase)
  if (keySeq === 'Z' && e.key === 'Z') {
    e.preventDefault();
    exitFocusMode();
    keySeq = '';
    return;
  }
}

// Add :q handling in command input
// When user types :q in command palette and presses Enter, call exitFocusMode()
```

**Step 3: Add j/k navigation in focus mode**

Update the keyboard handler to support j/k when filter is not active:

```javascript
// Add to global keydown handler when focus mode is active
if (focusModeActive && !isPaletteOpen() && !filterActive && getPageType() !== 'watch') {
  if (e.key === 'j') {
    e.preventDefault();
    const items = document.querySelectorAll('.vilify-video-item');
    if (items.length > 0) {
      selectedIdx = (selectedIdx + 1) % items.length;
      updateVideoSelection();
    }
    return;
  }
  if (e.key === 'k') {
    e.preventDefault();
    const items = document.querySelectorAll('.vilify-video-item');
    if (items.length > 0) {
      selectedIdx = (selectedIdx - 1 + items.length) % items.length;
      updateVideoSelection();
    }
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    executeVideoItem(selectedIdx, e.shiftKey);
    return;
  }
}
```

**Step 4: Test manually**

- Open YouTube home in focus mode
- Press `j`/`k` to navigate video list
- Press `/` to open filter, type to filter, Escape to close
- Press `i` to focus YouTube search
- Press `:` for command palette
- Type `:q` and Enter to exit focus mode
- Press `gy` to go to history

**Step 5: Commit**

```bash
git add sites/youtube.user.js
git commit -m "feat(youtube): update keyboard handler for focus mode with j/k navigation and :q/ZZ exit"
```

---

## Task 9: Remove gi Keybinding and Clean Up

**Files:**
- Modify: `sites/youtube.user.js`

**Step 1: Remove gi from key sequences**

In `getKeySequences()`, remove the `'gi'` line (it's now `'gy'` for history).

**Step 2: Update command palette navigation commands**

In `getCommands()`, update the History command keys display:

```javascript
cmds.push({ label: 'History', icon: '⏱', action: () => navigateTo('/feed/history'), keys: 'G Y' });
```

**Step 3: Remove old gi reference from any comments**

Search for any remaining references to `gi` for history and update.

**Step 4: Test manually**

- Verify `gi` does nothing
- Verify `gy` navigates to history
- Verify `:` shows History with `G Y` keys

**Step 5: Commit**

```bash
git add sites/youtube.user.js
git commit -m "feat(youtube): change history shortcut from gi to gy"
```

---

## Task 10: Polish and Edge Cases

**Files:**
- Modify: `sites/youtube.user.js`

**Step 1: Handle empty states gracefully**

Update `renderVideoList` to show helpful messages:

```javascript
if (filtered.length === 0) {
  const message = filterQuery 
    ? `No videos matching "${filterQuery}"` 
    : 'No videos found. Try scrolling to load more.';
  content.appendChild(createElement('div', { 
    className: 'vilify-empty', 
    textContent: message 
  }));
  return;
}
```

**Step 2: Add loading state**

```javascript
function showLoading() {
  const content = document.getElementById('vilify-content');
  if (!content) return;
  while (content.firstChild) {
    content.removeChild(content.firstChild);
  }
  content.appendChild(createElement('div', { 
    className: 'vilify-empty', 
    textContent: 'Loading...' 
  }));
}
```

**Step 3: Ensure focus mode doesn't break on edge cases**

- Handle pages with no videos (show message)
- Handle watch page before video loads (show loading)
- Handle navigation during filter (close filter, reset query)

Update `onNavigate`:

```javascript
function onNavigate() {
  if (isPaletteOpen()) {
    closePalette();
  }
  if (filterActive) {
    filterQuery = '';
    closeFilter();
  }
  settingsApplied = false;
  clearVideoCache();
  selectedIdx = 0;
  
  if (focusModeActive) {
    showLoading();
    waitForContent(() => {
      initFocusMode();
    });
  }
  console.log('[Vilify] Navigated to:', location.pathname);
}
```

**Step 4: Test edge cases**

- Navigate to a page with no videos
- Rapidly navigate between pages
- Open filter, then navigate away
- Open video that takes time to load

**Step 5: Commit**

```bash
git add sites/youtube.user.js
git commit -m "feat(youtube): polish focus mode with loading states and edge case handling"
```

---

## Task 11: Final Integration Test

**Files:**
- None (manual testing)

**Step 1: Full flow test**

1. Install updated userscript
2. Go to youtube.com - verify focus mode loads with video list
3. Press `j`/`k` - verify navigation works
4. Press `/` - verify filter opens
5. Type query - verify filtering works
6. Press `Escape` - verify filter closes
7. Press `Enter` on video - verify navigation to watch page
8. On watch page - verify player, title, channel, description, comments visible
9. Press `gy` - verify navigation to history
10. On history - verify video list works
11. Press `gs` - verify navigation to subscriptions
12. Press `:` - verify command palette opens
13. Type `:q` + Enter - verify exit focus mode
14. Verify full YouTube UI visible
15. Refresh - verify focus mode re-enabled

**Step 2: Cross-page test**

Test focus mode on each page type:
- Home (`/`)
- Subscriptions (`/feed/subscriptions`)
- History (`/feed/history`)
- Search results (`/results?search_query=test`)
- Channel page (`/@channelname`)
- Watch page (`/watch?v=...`)

**Step 3: Document any issues found**

If issues found, create follow-up tasks.

**Step 4: Final commit (if any fixes needed)**

```bash
git add sites/youtube.user.js
git commit -m "fix(youtube): address issues found in integration testing"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Solarized Dark theme + TUI variables |
| 2 | CSS to hide YouTube UI |
| 3 | Focus overlay structure |
| 4 | Video list for listing pages |
| 5 | Watch page layout |
| 6 | Initialization and page routing |
| 7 | Filter input |
| 8 | Keyboard handler updates |
| 9 | Remove gi, add gy |
| 10 | Polish and edge cases |
| 11 | Integration testing |

**Estimated time:** 2-3 hours

**Risk areas:**
- YouTube DOM selectors may need adjustment
- Watch page player positioning CSS may need tweaking
- Comments scraping may fail if YouTube changes structure
