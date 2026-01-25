// ==UserScript==
// @name         Vilify - YouTube
// @namespace    https://github.com/shihabdider/vilify
// @version      0.1.0
// @description  Vim-style command palette for YouTube
// @author       shihabdider
// @updateURL    https://raw.githubusercontent.com/shihabdider/vilify/main/vilify-youtube.user.js
// @downloadURL  https://raw.githubusercontent.com/shihabdider/vilify/main/vilify-youtube.user.js
// @match        https://www.youtube.com/*
// @match        https://youtube.com/*
// @grant        GM_setClipboard
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // ============================================
  // Styles - YouTube Dark Theme
  // ============================================
  const CSS = `
    :root {
      --yt-bg-primary: #0f0f0f;
      --yt-bg-secondary: #272727;
      --yt-bg-hover: #3f3f3f;
      --yt-text-primary: #f1f1f1;
      --yt-text-secondary: #aaaaaa;
      --yt-red: #ff0000;
      --yt-red-hover: #cc0000;
      --yt-border: #3f3f3f;
      --yt-font: 'Roboto', 'Arial', sans-serif;
    }

    #keyring-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      align-items: flex-start;
      justify-content: center;
      padding-top: 15vh;
      z-index: 9999999;
      font-family: var(--yt-font);
    }

    #keyring-overlay.open {
      display: flex;
    }

    #keyring-modal {
      width: 560px;
      max-width: 90vw;
      max-height: 70vh;
      background: var(--yt-bg-primary);
      border: 1px solid var(--yt-border);
      border-radius: 12px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    #keyring-header {
      background: var(--yt-bg-secondary);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--yt-border);
    }

    #keyring-header-logo {
      width: 24px;
      height: 24px;
      background: var(--yt-red);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #keyring-header-logo::before {
      content: '';
      width: 0;
      height: 0;
      border-left: 8px solid white;
      border-top: 5px solid transparent;
      border-bottom: 5px solid transparent;
      margin-left: 2px;
    }

    #keyring-header-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--yt-text-primary);
    }

    #keyring-input-wrapper {
      padding: 12px 16px;
      background: var(--yt-bg-primary);
      border-bottom: 1px solid var(--yt-border);
    }

    #keyring-input {
      width: 100%;
      padding: 10px 12px;
      background: var(--yt-bg-secondary);
      border: 1px solid var(--yt-border);
      border-radius: 8px;
      font-size: 14px;
      font-family: var(--yt-font);
      color: var(--yt-text-primary);
      outline: none;
    }

    #keyring-input::placeholder {
      color: var(--yt-text-secondary);
    }

    #keyring-input:focus {
      border-color: var(--yt-red);
    }

    #keyring-list {
      flex: 1;
      overflow-y: auto;
      max-height: 400px;
    }

    .keyring-group-label {
      padding: 12px 16px 8px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--yt-text-secondary);
      background: var(--yt-bg-primary);
    }

    .keyring-item {
      display: flex;
      align-items: center;
      padding: 10px 16px;
      cursor: pointer;
      font-size: 14px;
      color: var(--yt-text-primary);
      background: var(--yt-bg-primary);
    }

    .keyring-item:hover {
      background: var(--yt-bg-hover);
    }

    .keyring-item.selected {
      background: var(--yt-red);
    }

    .keyring-item.selected .keyring-shortcut kbd {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .keyring-item.selected .keyring-meta {
      color: rgba(255, 255, 255, 0.8);
    }

    .keyring-icon {
      width: 32px;
      height: 32px;
      margin-right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: var(--yt-text-secondary);
      background: var(--yt-bg-secondary);
      border-radius: 6px;
    }

    .keyring-item.selected .keyring-icon {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

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
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      white-space: normal;
      line-height: 1.3;
    }

    .keyring-video-meta {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
    }

    .keyring-video-meta .keyring-label {
      font-size: 14px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      white-space: normal;
      line-height: 1.3;
    }

    .keyring-video-meta .keyring-meta {
      margin-left: 0;
      margin-top: 2px;
    }

    .keyring-label {
      flex: 1;
    }

    .keyring-meta {
      font-size: 12px;
      color: var(--yt-text-secondary);
      margin-left: 8px;
    }

    .keyring-shortcut {
      margin-left: 12px;
      display: flex;
      gap: 4px;
    }

    .keyring-shortcut kbd {
      background: var(--yt-bg-secondary);
      border: 1px solid var(--yt-border);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      font-family: var(--yt-font);
      color: var(--yt-text-secondary);
    }

    #keyring-footer {
      display: flex;
      gap: 20px;
      padding: 10px 16px;
      background: var(--yt-bg-secondary);
      border-top: 1px solid var(--yt-border);
      font-size: 12px;
      color: var(--yt-text-secondary);
    }

    #keyring-footer kbd {
      background: var(--yt-bg-primary);
      border: 1px solid var(--yt-border);
      border-radius: 4px;
      padding: 2px 6px;
      margin: 0 4px;
      font-size: 11px;
    }

    .keyring-empty {
      padding: 40px;
      text-align: center;
      color: var(--yt-text-secondary);
      font-size: 14px;
    }

    .keyring-toast {
      position: fixed;
      bottom: 32px;
      right: 32px;
      background: var(--yt-bg-primary);
      color: var(--yt-text-primary);
      padding: 16px 24px;
      border-radius: 12px;
      border: 1px solid var(--yt-border);
      font-size: 15px;
      font-weight: 500;
      font-family: var(--yt-font);
      z-index: 10000000;
      opacity: 0;
      transition: opacity 0.2s;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }

    .keyring-toast.show {
      opacity: 1;
    }
  `;

  // ============================================
  // Constants
  // ============================================
  const TOAST_DURATION_MS = 2000;
  const KEY_SEQ_TIMEOUT_MS = 500;

  // ============================================
  // State
  // ============================================
  let overlay = null;
  let inputEl = null;
  let listEl = null;
  let items = [];
  let selectedIdx = 0;

  // ============================================
  // Utilities
  // ============================================
  function escapeHtml(str) {
    const el = document.createElement('div');
    el.textContent = str || '';
    return el.innerHTML;
  }

  function showToast(message) {
    let toast = document.querySelector('.keyring-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'keyring-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), TOAST_DURATION_MS);
  }

  function copyToClipboard(text) {
    if (typeof GM_setClipboard === 'function') {
      GM_setClipboard(text);
      showToast('Copied to clipboard');
    } else {
      navigator.clipboard.writeText(text)
        .then(() => showToast('Copied to clipboard'))
        .catch(() => showToast('Failed to copy'));
    }
  }

  // ============================================
  // YouTube Context Detection
  // ============================================
  function getPageType() {
    const path = location.pathname;
    const params = new URLSearchParams(location.search);
    
    if (path === '/watch' && params.get('v')) {
      return 'watch';
    } else if (path === '/' || path === '') {
      return 'home';
    } else if (path === '/results') {
      return 'search';
    } else if (path.startsWith('/@') || path.startsWith('/channel/') || path.startsWith('/c/')) {
      return 'channel';
    } else if (path === '/playlist') {
      return 'playlist';
    } else if (path === '/feed/subscriptions') {
      return 'subscriptions';
    } else if (path === '/feed/history') {
      return 'history';
    } else if (path === '/feed/library') {
      return 'library';
    } else if (path.startsWith('/shorts/')) {
      return 'shorts';
    }
    return 'other';
  }

  function getVideoContext() {
    if (getPageType() !== 'watch') return null;

    const params = new URLSearchParams(location.search);
    const videoId = params.get('v');
    if (!videoId) return null;

    const ctx = {
      videoId,
      url: location.href,
      cleanUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };

    // Get video element
    const video = document.querySelector('video.html5-main-video');
    if (video) {
      ctx.video = video;
      ctx.currentTime = video.currentTime;
      ctx.duration = video.duration;
      ctx.paused = video.paused;
      ctx.playbackRate = video.playbackRate;
      ctx.volume = video.volume;
      ctx.muted = video.muted;
    }

    // Get title
    const titleEl = document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata');
    if (titleEl) {
      ctx.title = titleEl.textContent.trim();
    }

    // Get channel name
    const channelEl = document.querySelector('#channel-name a, ytd-video-owner-renderer a');
    if (channelEl) {
      ctx.channelName = channelEl.textContent.trim();
      ctx.channelUrl = channelEl.href;
    }

    // Check if subscribed
    const subButton = document.querySelector('ytd-subscribe-button-renderer button');
    if (subButton) {
      ctx.isSubscribed = subButton.getAttribute('aria-label')?.includes('Unsubscribe');
    }

    // Get like button state
    const likeButton = document.querySelector('like-button-view-model button, #segmented-like-button button');
    if (likeButton) {
      ctx.isLiked = likeButton.getAttribute('aria-pressed') === 'true';
    }

    return ctx;
  }

  function getChannelContext() {
    const pageType = getPageType();
    if (pageType !== 'channel') return null;

    const ctx = {
      url: location.href,
    };

    // Get channel name
    const nameEl = document.querySelector('#channel-name, #text.ytd-channel-name');
    if (nameEl) {
      ctx.name = nameEl.textContent.trim();
    }

    return ctx;
  }

  // ============================================
  // Video Scraping
  // ============================================
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

    // New YouTube layout uses yt-lockup-view-model for video items
    // Old layout used ytd-*-renderer elements
    const newLayoutElements = document.querySelectorAll('yt-lockup-view-model');
    
    // Try new layout first (yt-lockup-view-model)
    for (const el of newLayoutElements) {

      // Get thumbnail link (has video URL)
      const thumbLink = el.querySelector('a.yt-lockup-view-model__content-image');
      if (!thumbLink?.href) continue;

      // Extract video ID
      const match = thumbLink.href.match(/\/watch\?v=([^&]+)/);
      if (!match) continue;
      const videoId = match[1];

      // Skip duplicates
      if (seen.has(videoId)) continue;
      seen.add(videoId);

      // Get title from title link
      const titleLink = el.querySelector('a.yt-lockup-metadata-view-model__title');
      const title = titleLink?.textContent?.trim();
      if (!title) continue;

      // Get channel name from metadata - try multiple selectors for different YT layouts
      let channelName = '';
      const channelSelectors = [
        '.yt-content-metadata-view-model-wiz__metadata-text',
        '.yt-content-metadata-view-model__metadata-text', 
        '.yt-content-metadata-view-model__metadata span.yt-core-attributed-string',
        'ytd-channel-name a',
        '#channel-name a',
        '.ytd-channel-name'
      ];
      for (const sel of channelSelectors) {
        const channelEl = el.querySelector(sel);
        if (channelEl?.textContent?.trim()) {
          channelName = channelEl.textContent.trim();
          break;
        }
      }

      videos.push({
        type: 'video',
        videoId,
        title,
        channelName,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        url: `/watch?v=${videoId}`
      });
    }

    // Fall back to old layout selectors if no videos found
    if (videos.length === 0) {
      const oldSelectors = [
        'ytd-rich-item-renderer',           // Home, subscriptions grid
        'ytd-video-renderer',               // Search results, channel videos
        'ytd-compact-video-renderer',       // Sidebar recommendations
        'ytd-grid-video-renderer',          // Channel videos grid
        'ytd-playlist-video-renderer'       // Playlist items
      ];

      const oldElements = document.querySelectorAll(oldSelectors.join(','));

      for (const el of oldElements) {

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

        // Get channel name - try multiple selectors
        let channelName = '';
        const channelSelectors = [
          '#channel-name #text',
          '#channel-name a',
          '.ytd-channel-name a',
          '#text.ytd-channel-name',
          'ytd-channel-name #text-container',
          '[itemprop="author"] [itemprop="name"]'
        ];
        for (const sel of channelSelectors) {
          const channelEl = el.querySelector(sel);
          if (channelEl?.textContent?.trim()) {
            channelName = channelEl.textContent.trim();
            break;
          }
        }

        videos.push({
          type: 'video',
          videoId,
          title,
          channelName,
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          url: `/watch?v=${videoId}`
        });
      }
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

  function formatTimestamp(seconds) {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function getTimestampUrl(videoId, seconds) {
    const t = Math.floor(seconds);
    return `https://www.youtube.com/watch?v=${videoId}&t=${t}s`;
  }

  // ============================================
  // Video Controls
  // ============================================
  function getVideo() {
    return document.querySelector('video.html5-main-video');
  }

  function togglePlayPause() {
    const video = getVideo();
    if (!video) return;
    if (video.paused) {
      video.play();
      showToast('Playing');
    } else {
      video.pause();
      showToast('Paused');
    }
  }

  function seekRelative(seconds) {
    const video = getVideo();
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    showToast(`${seconds > 0 ? '+' : ''}${seconds}s`);
  }

  function setPlaybackRate(rate) {
    const video = getVideo();
    if (!video) return;
    video.playbackRate = rate;
    showToast(`Speed: ${rate}x`);
  }

  function toggleMute() {
    const video = getVideo();
    if (!video) return;
    video.muted = !video.muted;
    showToast(video.muted ? 'Muted' : 'Unmuted');
  }

  function toggleFullscreen() {
    const player = document.querySelector('#movie_player');
    if (!player) return;
    
    // Use YouTube's fullscreen button
    const fsButton = player.querySelector('.ytp-fullscreen-button');
    if (fsButton) {
      fsButton.click();
    }
  }

  function toggleTheaterMode() {
    const theaterButton = document.querySelector('.ytp-size-button');
    if (theaterButton) {
      theaterButton.click();
      showToast('Theater mode toggled');
    }
  }

  function toggleCaptions() {
    const ccButton = document.querySelector('.ytp-subtitles-button');
    if (ccButton) {
      ccButton.click();
      const isOn = ccButton.getAttribute('aria-pressed') === 'true';
      showToast(isOn ? 'Captions off' : 'Captions on');
    }
  }

  function seekToPercent(percent) {
    const video = getVideo();
    if (!video || !video.duration) return;
    video.currentTime = video.duration * (percent / 100);
  }

  // ============================================
  // Navigation
  // ============================================
  function navigateTo(path) {
    location.href = path;
  }

  function openInNewTab(url) {
    window.open(url, '_blank');
  }

  function getSearchInput() {
    return document.querySelector('input#search') || 
           document.querySelector('ytd-searchbox input') ||
           document.querySelector('input[name="search_query"]');
  }

  function focusSearchBox() {
    const searchInput = getSearchInput();
    if (searchInput) {
      // Attach Escape handler directly to the input if not already done
      if (!searchInput.dataset.keyringEscapeHandler) {
        searchInput.dataset.keyringEscapeHandler = 'true';
        searchInput.addEventListener('keydown', e => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            searchInput.blur();
            showToast('Exited search');
          }
        }, true);
      }
      searchInput.focus();
      // Small delay before select to ensure focus completes
      setTimeout(() => searchInput.select(), 10);
      showToast('Search focused (Esc to exit)');
    }
  }

  function blurSearchBox() {
    const searchInput = document.querySelector('input#search') || 
                        document.querySelector('ytd-searchbox input') ||
                        document.querySelector('input[name="search_query"]');
    if (searchInput && document.activeElement === searchInput) {
      searchInput.blur();
      return true;
    }
    return false;
  }

  // ============================================
  // Copy Functions
  // ============================================
  function copyVideoUrl() {
    const ctx = getVideoContext();
    if (!ctx) {
      showToast('No video on this page');
      return;
    }
    copyToClipboard(ctx.cleanUrl);
  }

  function copyVideoUrlAtTime() {
    const ctx = getVideoContext();
    if (!ctx) {
      showToast('No video on this page');
      return;
    }
    const url = getTimestampUrl(ctx.videoId, ctx.currentTime);
    copyToClipboard(url);
  }

  function copyVideoTitle() {
    const ctx = getVideoContext();
    if (!ctx?.title) {
      showToast('Could not get video title');
      return;
    }
    copyToClipboard(ctx.title);
  }

  function copyVideoTitleAndUrl() {
    const ctx = getVideoContext();
    if (!ctx?.title) {
      showToast('Could not get video info');
      return;
    }
    copyToClipboard(`${ctx.title}\n${ctx.cleanUrl}`);
  }

  // ============================================
  // Commands
  // ============================================
  function getCommands() {
    const pageType = getPageType();
    const videoCtx = getVideoContext();
    const cmds = [];

    // Navigation - always available
    cmds.push({ group: 'Navigation' });
    cmds.push({ label: 'Home', icon: '🏠', action: () => navigateTo('/'), keys: 'G H' });
    cmds.push({ label: 'Subscriptions', icon: '📺', action: () => navigateTo('/feed/subscriptions'), keys: 'G S' });
    cmds.push({ label: 'History', icon: '⏱', action: () => navigateTo('/feed/history'), keys: 'G I' });
    cmds.push({ label: 'Library', icon: '📚', action: () => navigateTo('/feed/library'), keys: 'G L' });
    cmds.push({ label: 'Trending', icon: '🔥', action: () => navigateTo('/feed/trending'), keys: 'G T' });
    cmds.push({ label: 'Search', icon: '🔍', action: () => focusSearchBox(), keys: 'I' });

    // Video controls - only on watch page
    if (pageType === 'watch' && videoCtx) {
      cmds.push({ group: 'Playback' });
      cmds.push({ 
        label: videoCtx.paused ? 'Play' : 'Pause', 
        icon: videoCtx.paused ? '▶' : '⏸', 
        action: togglePlayPause, 
        keys: 'Space' 
      });
      cmds.push({ label: 'Skip back 10s', icon: '⏪', action: () => seekRelative(-10), keys: 'J' });
      cmds.push({ label: 'Skip forward 10s', icon: '⏩', action: () => seekRelative(10), keys: 'L' });
      cmds.push({ label: 'Skip back 5s', icon: '◀', action: () => seekRelative(-5), keys: '←' });
      cmds.push({ label: 'Skip forward 5s', icon: '▶', action: () => seekRelative(5), keys: '→' });
      
      cmds.push({ group: 'Speed' });
      cmds.push({ label: 'Speed 0.5x', icon: '🐢', action: () => setPlaybackRate(0.5) });
      cmds.push({ label: 'Speed 1x', icon: '⏱', action: () => setPlaybackRate(1), keys: 'G 1' });
      cmds.push({ label: 'Speed 1.25x', icon: '🏃', action: () => setPlaybackRate(1.25) });
      cmds.push({ label: 'Speed 1.5x', icon: '🏃', action: () => setPlaybackRate(1.5) });
      cmds.push({ label: 'Speed 2x', icon: '🚀', action: () => setPlaybackRate(2), keys: 'G 2' });

      cmds.push({ group: 'View' });
      cmds.push({ label: 'Toggle fullscreen', icon: '⛶', action: toggleFullscreen, keys: 'F' });
      cmds.push({ label: 'Theater mode', icon: '🎬', action: toggleTheaterMode, keys: 'T' });
      cmds.push({ label: 'Toggle captions', icon: '💬', action: toggleCaptions, keys: 'C' });
      cmds.push({ label: 'Toggle mute', icon: videoCtx.muted ? '🔇' : '🔊', action: toggleMute, keys: 'M' });

      cmds.push({ group: 'Copy' });
      cmds.push({ label: 'Copy video URL', icon: '🔗', action: copyVideoUrl, keys: 'Y Y' });
      cmds.push({ 
        label: 'Copy URL at current time', 
        icon: '⏱', 
        action: copyVideoUrlAtTime,
        meta: formatTimestamp(videoCtx.currentTime),
        keys: '⇧Y'
      });
      cmds.push({ label: 'Copy video title', icon: '📝', action: copyVideoTitle, keys: 'Y T' });
      cmds.push({ label: 'Copy title + URL', icon: '📋', action: copyVideoTitleAndUrl, keys: 'Y A' });

      // Channel navigation
      if (videoCtx.channelUrl) {
        cmds.push({ group: 'Channel' });
        cmds.push({ 
          label: `Go to ${videoCtx.channelName || 'channel'}`, 
          icon: '👤', 
          action: () => navigateTo(videoCtx.channelUrl),
          keys: 'G C'
        });
        cmds.push({ 
          label: `${videoCtx.channelName || 'Channel'} videos`, 
          icon: '🎥', 
          action: () => navigateTo(videoCtx.channelUrl + '/videos')
        });
      }
    }

    return cmds;
  }

  function getKeySequences() {
    const videoCtx = getVideoContext();
    
    const sequences = {
      // Palette shortcuts
      '/': () => openPalette('video'),
      ':': () => openPalette('command'),
      // Navigation: g + key
      'gh': () => navigateTo('/'),
      'gs': () => navigateTo('/feed/subscriptions'),
      'gi': () => navigateTo('/feed/history'),
      'gl': () => navigateTo('/feed/library'),
      'gt': () => navigateTo('/feed/trending'),
      'i': () => focusSearchBox(),
    };

    // Video-specific sequences
    if (videoCtx) {
      // Navigation
      sequences['gc'] = () => videoCtx.channelUrl && navigateTo(videoCtx.channelUrl);
      
      // Speed
      sequences['g1'] = () => setPlaybackRate(1);
      sequences['g2'] = () => setPlaybackRate(2);
      
      // Yank (copy): y + key
      sequences['yy'] = copyVideoUrl;           // yy = yank URL (like vim yy for yank line)
      sequences['yt'] = copyVideoTitle;         // yt = yank title
      sequences['ya'] = copyVideoTitleAndUrl;   // ya = yank all
    }

    return sequences;
  }

  // Single-key sequences (including Shift+ modifiers) handled separately
  function getSingleKeyActions() {
    const videoCtx = getVideoContext();
    const actions = {};
    
    if (videoCtx) {
      // Shift+Y = yank URL at current time
      actions['Y'] = copyVideoUrlAtTime;
    }
    
    return actions;
  }

  // ============================================
  // Item Retrieval (Videos + Commands)
  // ============================================
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
        (v.channelName && v.channelName.toLowerCase().includes(searchQuery))
      );
    }

    // If no videos available, fall back to commands
    if (videos.length === 0) {
      return getItems(':' + searchQuery);
    }

    return videos;
  }

  // ============================================
  // Rendering
  // ============================================
  function render() {
    // Clear list using DOM API (YouTube blocks innerHTML due to Trusted Types CSP)
    while (listEl.firstChild) {
      listEl.removeChild(listEl.firstChild);
    }

    let idx = 0;

    for (const item of items) {
      if (item.group) {
        listEl.appendChild(createElement('div', { 
          className: 'keyring-group-label', 
          textContent: item.group 
        }));
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
    }

    if (idx === 0) {
      listEl.appendChild(createElement('div', { 
        className: 'keyring-empty', 
        textContent: 'No matching commands' 
      }));
    }

    bindItemEvents();
  }

  function bindItemEvents() {
    listEl.querySelectorAll('.keyring-item').forEach(el => {
      el.addEventListener('click', () => {
        const i = parseInt(el.dataset.idx, 10);
        executeItem(i);
      });
      el.addEventListener('mouseenter', () => {
        selectedIdx = parseInt(el.dataset.idx, 10);
        updateSelection();
      });
    });
  }

  function updateSelection() {
    listEl.querySelectorAll('.keyring-item').forEach(el => {
      const i = parseInt(el.dataset.idx, 10);
      el.classList.toggle('selected', i === selectedIdx);
    });
    const sel = listEl.querySelector('.keyring-item.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function getActionableItems() {
    return items.filter(i => !i.group);
  }

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

  // ============================================
  // UI Creation
  // ============================================
  function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [key, val] of Object.entries(attrs)) {
      if (key === 'textContent') {
        el.textContent = val;
      } else if (key === 'className') {
        el.className = val;
      } else {
        el.setAttribute(key, val);
      }
    }
    for (const child of children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    }
    return el;
  }

  // Inject styles immediately so toasts work before palette is opened
  function injectStyles() {
    if (document.getElementById('keyring-styles')) return;
    const style = document.createElement('style');
    style.id = 'keyring-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  injectStyles();

  function createUI() {
    // Ensure styles are injected
    injectStyles();

    // Create overlay using DOM APIs (YouTube blocks innerHTML due to Trusted Types CSP)
    overlay = createElement('div', { id: 'keyring-overlay' });

    const modal = createElement('div', { id: 'keyring-modal' });

    // Header
    const header = createElement('div', { id: 'keyring-header' }, [
      createElement('div', { id: 'keyring-header-logo' }),
      createElement('div', { id: 'keyring-header-title', textContent: 'Command Palette' })
    ]);

    // Input wrapper
    inputEl = createElement('input', {
      id: 'keyring-input',
      type: 'text',
      placeholder: 'Type a command...',
      autocomplete: 'off',
      spellcheck: 'false'
    });
    const inputWrapper = createElement('div', { id: 'keyring-input-wrapper' }, [inputEl]);

    // List
    listEl = createElement('div', { id: 'keyring-list' });

    // Footer
    // Footer
    const footer = createElement('div', { id: 'keyring-footer' }, [
      createFooterHint(['↑', '↓'], 'navigate'),
      createFooterHint(['↵'], 'select'),
      createFooterHint(['⇧↵'], 'new tab'),
      createFooterHint(['esc'], 'close')
    ]);

    modal.appendChild(header);
    modal.appendChild(inputWrapper);
    modal.appendChild(listEl);
    modal.appendChild(footer);
    overlay.appendChild(modal);

    document.body.appendChild(overlay);

    // Event listeners
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closePalette();
    });
    inputEl.addEventListener('input', onInput);
    inputEl.addEventListener('keydown', onInputKeydown);
  }

  function createFooterHint(keys, label) {
    const span = createElement('span');
    for (const key of keys) {
      span.appendChild(createElement('kbd', { textContent: key }));
    }
    span.appendChild(document.createTextNode(' ' + label));
    return span;
  }

  // ============================================
  // Open / Close
  // ============================================
  function openPalette(mode = 'video') {
    if (!overlay) createUI();
    if (mode === 'command') {
      inputEl.value = ':';
      items = getItems(':');
    } else {
      inputEl.value = '';
      items = getItems('');
    }
    selectedIdx = 0;
    render();
    overlay.classList.add('open');
    inputEl.focus();
    // Place cursor after the colon in command mode
    if (mode === 'command') {
      inputEl.setSelectionRange(1, 1);
    }
  }

  function closePalette() {
    if (overlay) overlay.classList.remove('open');
  }

  function isPaletteOpen() {
    return overlay?.classList.contains('open');
  }

  // ============================================
  // Input Handling
  // ============================================
  function onInput() {
    const query = inputEl.value;
    items = getItems(query);
    selectedIdx = 0;
    render();
  }

  function onInputKeydown(e) {
    const actionable = getActionableItems();
    const count = actionable.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (count > 0) {
        selectedIdx = (selectedIdx + 1) % count;
        updateSelection();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (count > 0) {
        selectedIdx = (selectedIdx - 1 + count) % count;
        updateSelection();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeItem(selectedIdx, e.shiftKey);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
    }
  }

  // ============================================
  // Global Keyboard Handler
  // ============================================
  let keySeq = '';
  let keyTimer = null;

  document.addEventListener('keydown', e => {
    // Don't intercept when typing in inputs (except our palette and special cases)
    const isInput = e.target.tagName === 'INPUT' || 
                    e.target.tagName === 'TEXTAREA' || 
                    e.target.isContentEditable;
    // Check if we're in YouTube's search box
    const isYouTubeSearch = isInput && (
      e.target.id === 'search' || 
      e.target.closest('ytd-searchbox') ||
      e.target.closest('#search-form')
    );
    
    // Allow Escape to blur search box
    if (e.key === 'Escape' && isYouTubeSearch) {
      e.preventDefault();
      e.stopPropagation();
      e.target.blur();
      showToast('Exited search');
      return;
    }

    if (isInput && e.target !== inputEl) {
      return;
    }



    // Escape to close
    if (e.key === 'Escape' && isPaletteOpen()) {
      e.preventDefault();
      closePalette();
      return;
    }

    // Vim-style sequences when palette is closed
    if (!isPaletteOpen() && !isInput) {
      // Ignore modifier keys alone
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
        return;
      }

      // Check single-key actions first (like Shift+Y)
      const singleKeyActions = getSingleKeyActions();
      if (singleKeyActions[e.key]) {
        e.preventDefault();
        singleKeyActions[e.key]();
        keySeq = '';
        return;
      }

      clearTimeout(keyTimer);
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      keySeq += key;
      keyTimer = setTimeout(() => { keySeq = ''; }, KEY_SEQ_TIMEOUT_MS);

      const sequences = getKeySequences();
      
      // Check for exact match
      if (sequences[keySeq]) {
        e.preventDefault();
        sequences[keySeq]();
        keySeq = '';
        return;
      }
      
      // Check if any sequence starts with current keySeq (potential match)
      const hasPrefix = Object.keys(sequences).some(s => s.startsWith(keySeq));
      if (!hasPrefix) {
        // No potential match, reset
        keySeq = '';
      }
    }
  }, true); // Use capture to intercept before YouTube

  // ============================================
  // Default Video Settings
  // ============================================
  const DEFAULT_PLAYBACK_RATE = 2;

  function applyDefaultSettings() {
    const video = getVideo();
    if (video && video.playbackRate !== DEFAULT_PLAYBACK_RATE) {
      video.playbackRate = DEFAULT_PLAYBACK_RATE;
    }
  }

  // ============================================
  // SPA Navigation Detection
  // ============================================
  // YouTube is an SPA - detect navigation without full page loads
  let lastUrl = location.href;
  let settingsApplied = false;

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

  // Watch for URL changes and apply settings when video is ready
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      onNavigate();
    }
    // Apply default settings when on watch page and not yet applied
    if (!settingsApplied && getPageType() === 'watch') {
      const video = getVideo();
      if (video && video.readyState >= 1) {
        applyDefaultSettings();
        settingsApplied = true;
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Also handle popstate (back/forward)
  window.addEventListener('popstate', () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      onNavigate();
    }
  });

  console.log('[Keyring] YouTube palette loaded');

})();
