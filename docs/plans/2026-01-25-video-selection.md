# Video Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add video selection to the Cmd+K palette, showing videos from the current YouTube page with thumbnail previews.

**Architecture:** Scrape video data from YouTube's DOM elements, render as palette items with thumbnails, handle navigation on selection. Use `:` prefix to switch to commands-only mode.

**Tech Stack:** Vanilla JS, DOM APIs, existing palette infrastructure.

---

## Task 1: Add Video Scraping Function

**Files:**
- Modify: `keyring-youtube.user.js`

**Step 1: Add scrapeVideos function after getChannelContext**

Add this after the `getChannelContext` function (around line 400):

```javascript
  // ============================================
  // Video Scraping
  // ============================================
  const MAX_VIDEOS = 15;
  const VIDEO_CACHE_MS = 2000;
  let videoCache = null;
  let videoCacheTime = 0;

  function scrapeVideos() {
    // Return cached results if fresh
    if (videoCache && Date.now() - videoCacheTime < VIDEO_CACHE_MS) {
      return videoCache;
    }

    const videos = [];
    const seen = new Set();

    // Selectors for different YouTube video elements
    const selectors = [
      'ytd-rich-item-renderer',           // Home, subscriptions grid
      'ytd-video-renderer',               // Search results, channel videos
      'ytd-compact-video-renderer',       // Sidebar recommendations
      'ytd-grid-video-renderer',          // Channel videos grid
      'ytd-playlist-video-renderer'       // Playlist items
    ];

    const elements = document.querySelectorAll(selectors.join(','));

    for (const el of elements) {
      if (videos.length >= MAX_VIDEOS) break;

      // Get video link
      const link = el.querySelector('a#video-title-link, a#video-title, a.ytd-thumbnail');
      if (!link?.href) continue;

      // Extract video ID
      const match = link.href.match(/\/watch\?v=([^&]+)/);
      if (!match) continue;
      const videoId = match[1];

      // Skip duplicates
      if (seen.has(videoId)) continue;
      seen.add(videoId);

      // Get title
      const titleEl = el.querySelector('#video-title');
      const title = titleEl?.textContent?.trim();
      if (!title) continue;

      // Get channel name
      const channelEl = el.querySelector('#channel-name a, .ytd-channel-name a, #text.ytd-channel-name');
      const channelName = channelEl?.textContent?.trim() || '';

      videos.push({
        type: 'video',
        videoId,
        title,
        channelName,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        url: `/watch?v=${videoId}`
      });
    }

    // Cache results
    videoCache = videos;
    videoCacheTime = Date.now();

    return videos;
  }

  function clearVideoCache() {
    videoCache = null;
    videoCacheTime = 0;
  }
```

**Step 2: Clear cache on navigation**

Find the `onNavigate` function and add `clearVideoCache()`:

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
    console.log('[Keyring] Navigated to:', location.pathname);
  }
```

**Step 3: Commit**

```bash
git add keyring-youtube.user.js
git commit -m "feat: add video scraping function"
```

---

## Task 2: Add Thumbnail CSS Styles

**Files:**
- Modify: `keyring-youtube.user.js`

**Step 1: Add thumbnail styles to CSS constant**

Add after `.keyring-icon` styles (around line 175):

```css
    .keyring-thumbnail {
      width: 80px;
      height: 45px;
      margin-right: 12px;
      border-radius: 6px;
      background: var(--yt-bg-secondary);
      object-fit: cover;
      flex-shrink: 0;
    }

    .keyring-item.selected .keyring-thumbnail {
      outline: 2px solid white;
      outline-offset: -2px;
    }

    .keyring-item .keyring-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .keyring-video-meta {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
    }

    .keyring-video-meta .keyring-label {
      font-size: 14px;
    }

    .keyring-video-meta .keyring-meta {
      margin-left: 0;
      margin-top: 2px;
    }
```

**Step 2: Commit**

```bash
git add keyring-youtube.user.js
git commit -m "feat: add thumbnail CSS styles"
```

---

## Task 3: Update Rendering for Videos

**Files:**
- Modify: `keyring-youtube.user.js`

**Step 1: Update render function to handle video items**

Replace the item rendering section in the `render()` function. Find the `else` block that renders non-group items and replace with:

```javascript
      } else {
        const isVideo = item.type === 'video';
        const itemEl = createElement('div', {
          className: `keyring-item ${idx === selectedIdx ? 'selected' : ''}`,
          'data-idx': String(idx),
          'data-type': item.type || 'command'
        });

        if (isVideo) {
          // Video item with thumbnail
          const img = createElement('img', {
            className: 'keyring-thumbnail',
            src: item.thumbnailUrl,
            alt: ''
          });
          itemEl.appendChild(img);

          const meta = createElement('div', { className: 'keyring-video-meta' });
          meta.appendChild(createElement('span', {
            className: 'keyring-label',
            textContent: item.title
          }));
          if (item.channelName) {
            meta.appendChild(createElement('span', {
              className: 'keyring-meta',
              textContent: item.channelName
            }));
          }
          itemEl.appendChild(meta);
        } else {
          // Command item with icon
          itemEl.appendChild(createElement('span', {
            className: 'keyring-icon',
            textContent: item.icon || '▸'
          }));

          itemEl.appendChild(createElement('span', {
            className: 'keyring-label',
            textContent: item.label
          }));

          if (item.meta) {
            itemEl.appendChild(createElement('span', {
              className: 'keyring-meta',
              textContent: item.meta
            }));
          }

          if (item.keys) {
            const shortcut = createElement('span', { className: 'keyring-shortcut' });
            for (const key of item.keys.split(' ')) {
              shortcut.appendChild(createElement('kbd', { textContent: key }));
            }
            itemEl.appendChild(shortcut);
          }
        }

        listEl.appendChild(itemEl);
        idx++;
      }
```

**Step 2: Commit**

```bash
git add keyring-youtube.user.js
git commit -m "feat: update render function for video items"
```

---

## Task 4: Update Item Execution for Videos

**Files:**
- Modify: `keyring-youtube.user.js`

**Step 1: Update executeItem to handle videos and Shift+Enter**

Replace the `executeItem` function:

```javascript
  function executeItem(idx, newTab = false) {
    const actionable = getActionableItems();
    const item = actionable[idx];
    if (!item) return;

    closePalette();

    if (item.type === 'video') {
      if (newTab) {
        openInNewTab(item.url);
      } else {
        navigateTo(item.url);
      }
    } else if (item.action) {
      item.action();
    }
  }
```

**Step 2: Update onInputKeydown to handle Shift+Enter**

Find the Enter key handler in `onInputKeydown` and update:

```javascript
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeItem(selectedIdx, e.shiftKey);
    } else if (e.key === 'Escape') {
```

**Step 3: Commit**

```bash
git add keyring-youtube.user.js
git commit -m "feat: handle video selection and Shift+Enter for new tab"
```

---

## Task 5: Update openPalette and Filtering Logic

**Files:**
- Modify: `keyring-youtube.user.js`

**Step 1: Create getItems function that combines videos and commands**

Add after `getKeySequences` function:

```javascript
  function getItems(query = '') {
    const isCommandMode = query.startsWith(':');
    const searchQuery = isCommandMode ? query.slice(1).trim().toLowerCase() : query.trim().toLowerCase();

    if (isCommandMode) {
      // Command mode: show only commands
      let cmds = getCommands();
      if (searchQuery) {
        cmds = cmds.filter(item => {
          if (item.group) return true;
          const labelMatch = item.label?.toLowerCase().includes(searchQuery);
          const keysMatch = item.keys?.toLowerCase().replace(/\s+/g, '').includes(searchQuery);
          return labelMatch || keysMatch;
        });
        // Remove empty groups
        cmds = cmds.filter((item, i, arr) => {
          if (item.group) {
            const next = arr[i + 1];
            return next && !next.group;
          }
          return true;
        });
      }
      return cmds;
    }

    // Default mode: show videos, filter by query
    let videos = scrapeVideos();

    if (searchQuery) {
      videos = videos.filter(v =>
        v.title.toLowerCase().includes(searchQuery) ||
        v.channelName.toLowerCase().includes(searchQuery)
      );
    }

    // If no videos match and we have a query, fall back to showing commands
    if (videos.length === 0 && searchQuery) {
      return getItems(':' + searchQuery);
    }

    return videos;
  }
```

**Step 2: Update openPalette to use getItems**

```javascript
  function openPalette() {
    if (!overlay) createUI();
    items = getItems('');
    selectedIdx = 0;
    inputEl.value = '';
    render();
    overlay.classList.add('open');
    inputEl.focus();
  }
```

**Step 3: Update onInput to use getItems**

Replace the `onInput` function:

```javascript
  function onInput() {
    const query = inputEl.value;
    items = getItems(query);
    selectedIdx = 0;
    render();
  }
```

**Step 4: Commit**

```bash
git add keyring-youtube.user.js
git commit -m "feat: integrate video scraping with palette filtering"
```

---

## Task 6: Update Footer Hints

**Files:**
- Modify: `keyring-youtube.user.js`

**Step 1: Update footer to show video-specific hints**

Find the `createUI` function and update the footer:

```javascript
    // Footer
    const footer = createElement('div', { id: 'keyring-footer' }, [
      createFooterHint(['↑', '↓'], 'navigate'),
      createFooterHint(['↵'], 'select'),
      createFooterHint(['⇧↵'], 'new tab'),
      createFooterHint([':'], 'commands'),
      createFooterHint(['esc'], 'close')
    ]);
```

**Step 2: Commit**

```bash
git add keyring-youtube.user.js
git commit -m "feat: update footer hints for video selection"
```

---

## Task 7: Testing and Polish

**Step 1: Manual testing checklist**

Test on each page type:
- [ ] Home page - videos appear in palette
- [ ] Subscriptions - videos appear
- [ ] Watch page - sidebar videos appear
- [ ] Search results - videos appear
- [ ] Channel page - channel videos appear
- [ ] Enter navigates to video
- [ ] Shift+Enter opens in new tab
- [ ] `:` prefix shows commands
- [ ] Typing filters videos by title/channel
- [ ] No match on videos falls back to commands

**Step 2: Final commit**

```bash
git add keyring-youtube.user.js
git commit -m "feat: complete video selection in command palette"
git tag v1.1.0
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Video scraping function with caching |
| 2 | Thumbnail CSS styles |
| 3 | Render function for video items |
| 4 | Execute item for videos + Shift+Enter |
| 5 | getItems function with `:` prefix filtering |
| 6 | Update footer hints |
| 7 | Testing and polish |
