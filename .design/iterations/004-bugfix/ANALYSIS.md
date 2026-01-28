# Race Condition Analysis

## The Problem

The extension scrapes content once and doesn't retry, but YouTube loads DOM elements asynchronously. The userscript handles this with polling and retry loops.

## Comparison

### Extension (`src/core/index.js`)

```javascript
function waitForContent(config, timeout = 5000) {
  // Checks if content is ready
  // If items.length > 0 OR timeout expires → resolves immediately
  // NO RETRY LOGIC after initial render
}
```

- One-shot scrape on init
- No re-render when DOM updates
- No retry for watch page metadata
- No comment loading retry

### Userscript (`sites/youtube.user.js`)

1. **Content Polling** (`startContentPolling` lines 1961-1975):
   - Runs every 200ms on listing pages
   - Detects video count changes
   - Calls `onContentUpdate()` → re-renders

2. **Watch Page Retry** (`renderWatchPage` lines 1288-1302):
   - If `!ctx.title && !ctx.channelName`, shows "Loading..."
   - Retries up to 10 times with 500ms delays
   - Only gives up after all retries exhausted

3. **Comment Observer** (line 1385):
   - MutationObserver watches comment section
   - Re-renders when comments appear

4. **Constants**:
   ```javascript
   POLL_INTERVAL_MS: 200,
   WATCH_PAGE_MAX_RETRIES: 10,
   WATCH_PAGE_RETRY_DELAY: 500,
   MAX_COMMENT_LOAD_ATTEMPTS: 5
   ```

## Root Causes by Issue

| Issue | Extension Behavior | Userscript Behavior |
|-------|-------------------|---------------------|
| Home page few videos | Scrapes once, misses late-loading | Polls every 200ms, re-renders on change |
| History/Library empty | Same selectors, no retry | Polls + handles different renderers |
| Watch "Untitled" | One scrape attempt | 10 retries @ 500ms each |
| Comments stuck | One scrape attempt | Observer + 5 retry attempts |
| Content after keypress | `render()` re-scrapes | Continuous polling |

## Why Modal Open/Close "Fixes" It

1. User opens modal → some time passes
2. User closes modal → `render()` called
3. `render()` calls `getVideoContext()` again
4. By now YouTube has populated DOM → data appears

## Fixes Required

### 1. Content Polling (Listing Pages)

Add to `src/core/index.js`:

```javascript
let pollTimer = null;

function startContentPolling() {
  stopContentPolling();
  let lastCount = 0;
  
  const poll = () => {
    const pageType = currentConfig.getPageType?.() || 'other';
    if (pageType === 'watch') {
      stopContentPolling();
      return;
    }
    
    // Count video elements in DOM
    const currentCount = document.querySelectorAll(
      'ytd-rich-item-renderer, ytd-video-renderer, ' +
      'ytd-compact-video-renderer, ytd-grid-video-renderer, ' +
      'ytd-playlist-video-renderer, yt-lockup-view-model'
    ).length;
    
    // Check if still loading
    const isLoading = !!document.querySelector(
      'ytd-continuation-item-renderer, tp-yt-paper-spinner, ' +
      '#spinner, ytd-ghost-grid-renderer'
    );
    
    if (currentCount !== lastCount && !isLoading && currentCount > 0) {
      lastCount = currentCount;
      render();
    }
    
    pollTimer = setTimeout(poll, 200);
  };
  
  poll();
}

function stopContentPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}
```

Call `startContentPolling()` after initial render (for non-watch pages).

### 2. Watch Page Retry Loop

Add to YouTube's watch layout (`src/sites/youtube/watch.js`):

```javascript
const WATCH_MAX_RETRIES = 10;
const WATCH_RETRY_DELAY = 500;

let watchRetryCount = 0;

export function renderWatchLayout(state, siteState, container, config) {
  const ctx = config.getVideoContext();
  
  // If metadata missing and retries remaining, schedule retry
  if ((!ctx?.title && !ctx?.channelName) && watchRetryCount < WATCH_MAX_RETRIES) {
    watchRetryCount++;
    container.innerHTML = '<div class="vilify-loading-message">Loading video info...</div>';
    setTimeout(() => renderWatchLayout(state, siteState, container, config), WATCH_RETRY_DELAY);
    return;
  }
  
  // Reset for next navigation
  watchRetryCount = 0;
  
  // ... rest of render logic
}
```

### 3. Comment Loading

Either:
- **Option A**: MutationObserver on `#comments` section
- **Option B**: Retry loop when `status === 'loading'`

Option B (simpler):

```javascript
export function getComments() {
  // ... existing code
}

// In watch layout render:
function renderComments(container, retryCount = 0) {
  const { comments, status } = getComments();
  
  if (status === 'loading' && retryCount < 5) {
    container.innerHTML = '<div class="vilify-loading-message">Loading comments...</div>';
    setTimeout(() => renderComments(container, retryCount + 1), 500);
    return;
  }
  
  // Render comments or "disabled" message
}
```

## Implementation Order

1. **Watch page retry** - Most visible fix, easy to implement
2. **Content polling** - Fixes listing pages
3. **Comment retry** - Polish

## Files to Modify

| File | Changes |
|------|---------|
| `src/core/index.js` | Add polling functions, call on init/navigation |
| `src/sites/youtube/watch.js` | Add retry loop for metadata |
| `src/sites/youtube/scraper.js` | Maybe add comment retry (or handle in watch.js) |
