# Iteration 007: List Pages Fixes - Blueprint

## Overview

Six fixes for list pages (home, history, subs, library, search results).

---

## 1. Instant Scroll

**Files:** `src/core/layout.js`, `src/core/view.js`

**Change:** Replace `behavior: 'smooth'` with `behavior: 'instant'`

### layout.js - `renderListing()`

```js
// Before (line ~188)
selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

// After
selectedEl.scrollIntoView({ block: 'nearest', behavior: 'instant' });
```

### view.js - `updateListSelection()`

```js
// Before
items[index].scrollIntoView({ block: 'nearest', behavior: 'instant' });

// After (already instant - verify)
items[index].scrollIntoView({ block: 'nearest', behavior: 'instant' });
```

---

## 2. Loading Screen on Navigation

**File:** `src/core/index.js` → `handleNavigation()`

**Change:** Show loading screen immediately when navigation detected, hide after content ready.

```js
// Before
function handleNavigation(oldUrl, newUrl) {
  console.log('[Vilify] Navigation:', oldUrl, '->', newUrl);
  stopContentPolling();
  state.selectedIdx = 0;
  // ...
  waitForContent(currentConfig).then(() => {
    render();
    // ...
  });
}

// After
function handleNavigation(oldUrl, newUrl) {
  console.log('[Vilify] Navigation:', oldUrl, '->', newUrl);
  
  // Show loading immediately
  showLoadingScreen(currentConfig);
  
  stopContentPolling();
  state.selectedIdx = 0;
  // ...
  waitForContent(currentConfig).then(() => {
    render();
    hideLoadingScreen();  // Hide after content ready
    // ...
  });
}
```

**Also need:** Import `showLoadingScreen`, `hideLoadingScreen` in index.js if not already.

---

## 3. Search Results Scraping Fix

**File:** `src/sites/youtube/scraper.js` → `scrapeSearchLayout()`

**Problem:** Some videos show "Untitled", missing from initial render.

**Fix:** Add fallback selectors from working userscript.

```js
// Before
function scrapeSearchLayout() {
  const videos = [];
  document.querySelectorAll('ytd-video-renderer').forEach(item => {
    const titleLink = item.querySelector('a#video-title, #video-title-link');
    const href = titleLink?.href;
    // ...
    const title = titleLink?.textContent?.trim();
    // ...
  });
  return videos;
}

// After
function scrapeSearchLayout() {
  const videos = [];
  document.querySelectorAll('ytd-video-renderer').forEach(item => {
    // Multiple fallbacks for link (from userscript)
    const link = item.querySelector('a#video-title') || 
                 item.querySelector('a.ytd-thumbnail') || 
                 item.querySelector('a[href*="/watch?v="]');
    const href = link?.href;
    const videoId = extractVideoId(href);
    if (!videoId) return;

    // Filter out Shorts
    if (href?.includes('/shorts/')) return;

    // Multiple fallbacks for title (from userscript)
    const titleEl = item.querySelector('#video-title') || 
                    item.querySelector('h3 a') || 
                    item.querySelector('yt-formatted-string#video-title');
    const title = titleEl?.textContent?.trim();
    if (!title) return;  // Skip if no title found

    const channelLink = item.querySelector('ytd-channel-name a, #channel-name a');
    const channel = channelLink?.textContent?.trim();
    const channelUrl = channelLink?.getAttribute('href');

    const metaSpans = item.querySelectorAll('#metadata-line span, .inline-metadata-item');
    const views = metaSpans[0]?.textContent?.trim();
    const uploadDate = metaSpans[1]?.textContent?.trim();

    videos.push({
      videoId,
      title,
      channel,
      channelUrl,
      views,
      uploadDate,
    });
  });
  return videos;
}
```

---

## 4. Filter Mode: Inline vs Modal

**File:** `src/sites/youtube/commands.js` → `getYouTubeKeySequences()`

**Change:** Route `/` based on page type.

```js
// Before
const sequences = {
  '/': () => {
    app?.openFilter?.();
  },
  // ...
};

// After
const sequences = {
  '/': () => {
    const pageType = getYouTubePageType();
    if (pageType === 'watch') {
      app?.openFilter?.();  // Open drawer for recommended videos
    } else {
      app?.openLocalFilter?.();  // Inline filter for listing pages
    }
  },
  // ...
};
```

**File:** `src/core/keyboard.js` → `setupKeyboardHandler()`

**Add:** New callback `openLocalFilter` in appCallbacks:

```js
const appCallbacks = {
  // ... existing callbacks
  openLocalFilter: () => {
    setState({ ...state, localFilterActive: true, localFilterQuery: '' });
  },
  // ...
};
```

---

## 5. `:q` Exit Focus Mode Fix

**File:** `src/core/index.js` → `handleCommandSubmit()`

**Change:** Add explicit `:q` check before command matching.

```js
// Before
function handleCommandSubmit(value, shiftKey) {
  const commands = currentConfig.getCommands ? currentConfig.getCommands({...}) : [];
  const query = value.startsWith(':') ? value.slice(1) : value;
  const filtered = filterItems(commands, query);
  // ...
}

// After
function handleCommandSubmit(value, shiftKey) {
  // Check for :q exit command explicitly
  if (value.trim().toLowerCase() === ':q') {
    state = closePalette(state);
    state.focusModeActive = false;
    removeFocusMode();
    document.body.classList.remove('vilify-watch-page');
    showMessage('Focus mode off (refresh to re-enable)');
    render();
    return;
  }
  
  const commands = currentConfig.getCommands ? currentConfig.getCommands({...}) : [];
  const query = value.startsWith(':') ? value.slice(1) : value;
  const filtered = filterItems(commands, query);
  // ...
}
```

---

## 6. Remove Trending Shortcut

**File:** `src/sites/youtube/commands.js`

### Remove from `getYouTubeKeySequences()`:

```js
// Delete this line
'gt': () => navigateTo('/feed/trending'),
```

### Remove from `getYouTubeCommands()`:

```js
// Delete this block
commands.push({
  type: 'command',
  label: 'Trending',
  icon: '🔥',
  action: () => navigateTo('/feed/trending'),
  keys: 'G T',
});
```

---

## Implementation Order

1. **#1 Instant scroll** - Simple, low risk
2. **#6 Remove trending** - Simple deletion
3. **#3 Search scraping** - Medium complexity, isolated
4. **#2 Loading on nav** - Medium complexity
5. **#4 Filter routing** - Needs new callback
6. **#5 :q exit** - Needs testing

---

## Testing Checklist

- [ ] j/k navigation scrolls instantly (no smooth animation)
- [ ] `gh`, `gy`, `gs`, `gl` show loading spinner immediately
- [ ] Search results show all videos with correct titles
- [ ] `/` on listing pages filters inline (no modal)
- [ ] `/` on watch page opens filter drawer
- [ ] `:q` exits focus mode with toast message
- [ ] `gt` no longer works (removed)
- [ ] Trending not in command palette
