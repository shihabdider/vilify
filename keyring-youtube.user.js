// ==UserScript==
// @name         Keyring - YouTube
// @namespace    https://github.com/user/keyring
// @version      0.1.0
// @description  Cmd+K command palette for YouTube
// @author       user
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
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--yt-bg-secondary);
      color: var(--yt-text-primary);
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000000;
      opacity: 0;
      transition: opacity 0.2s;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
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

  function focusSearchBox() {
    const searchInput = document.querySelector('input#search');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
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
    cmds.push({ label: 'Search', icon: '🔍', action: () => focusSearchBox(), keys: '/' });

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
      cmds.push({ label: 'Copy video URL', icon: '🔗', action: copyVideoUrl });
      cmds.push({ 
        label: 'Copy URL at current time', 
        icon: '⏱', 
        action: copyVideoUrlAtTime,
        meta: formatTimestamp(videoCtx.currentTime)
      });
      cmds.push({ label: 'Copy video title', icon: '📝', action: copyVideoTitle });
      cmds.push({ label: 'Copy title + URL', icon: '📋', action: copyVideoTitleAndUrl });

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
      'gh': () => navigateTo('/'),
      'gs': () => navigateTo('/feed/subscriptions'),
      'gi': () => navigateTo('/feed/history'),
      'gl': () => navigateTo('/feed/library'),
      'gt': () => navigateTo('/feed/trending'),
      '/': () => focusSearchBox(),
    };

    // Video-specific sequences
    if (videoCtx) {
      sequences['gc'] = () => videoCtx.channelUrl && navigateTo(videoCtx.channelUrl);
      sequences['g1'] = () => setPlaybackRate(1);
      sequences['g2'] = () => setPlaybackRate(2);
    }

    return sequences;
  }

  // ============================================
  // Rendering
  // ============================================
  function render() {
    let html = '';
    let idx = 0;

    for (const item of items) {
      if (item.group) {
        html += `<div class="keyring-group-label">${escapeHtml(item.group)}</div>`;
      } else {
        const sel = idx === selectedIdx ? 'selected' : '';
        const keys = item.keys 
          ? `<span class="keyring-shortcut">${item.keys.split(' ').map(k => `<kbd>${k}</kbd>`).join('')}</span>` 
          : '';
        const meta = item.meta 
          ? `<span class="keyring-meta">${escapeHtml(item.meta)}</span>` 
          : '';
        html += `
          <div class="keyring-item ${sel}" data-idx="${idx}">
            <span class="keyring-icon">${item.icon || '▸'}</span>
            <span class="keyring-label">${escapeHtml(item.label)}</span>
            ${meta}
            ${keys}
          </div>
        `;
        idx++;
      }
    }

    if (idx === 0) {
      html = '<div class="keyring-empty">No matching commands</div>';
    }

    listEl.innerHTML = html;
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

  function executeItem(idx) {
    const actionable = getActionableItems();
    const item = actionable[idx];
    if (item?.action) {
      closePalette();
      item.action();
    }
  }

  // ============================================
  // UI Creation
  // ============================================
  function createUI() {
    // Inject styles
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Create overlay
    overlay = document.createElement('div');
    overlay.id = 'keyring-overlay';
    overlay.innerHTML = `
      <div id="keyring-modal">
        <div id="keyring-header">
          <div id="keyring-header-logo"></div>
          <div id="keyring-header-title">Command Palette</div>
        </div>
        <div id="keyring-input-wrapper">
          <input id="keyring-input" type="text" placeholder="Type a command..." autocomplete="off" spellcheck="false">
        </div>
        <div id="keyring-list"></div>
        <div id="keyring-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    inputEl = document.getElementById('keyring-input');
    listEl = document.getElementById('keyring-list');

    // Event listeners
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closePalette();
    });
    inputEl.addEventListener('input', onInput);
    inputEl.addEventListener('keydown', onInputKeydown);
  }

  // ============================================
  // Open / Close
  // ============================================
  function openPalette() {
    if (!overlay) createUI();
    items = getCommands();
    selectedIdx = 0;
    inputEl.value = '';
    render();
    overlay.classList.add('open');
    inputEl.focus();
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
    const query = inputEl.value.trim().toLowerCase();
    
    items = getCommands();
    
    if (query.length > 0) {
      items = items.filter(item => {
        if (item.group) return true;
        const labelMatch = item.label?.toLowerCase().includes(query);
        const keysMatch = item.keys?.toLowerCase().replace(/\s+/g, '').includes(query);
        return labelMatch || keysMatch;
      });
      
      // Remove empty groups
      items = items.filter((item, i, arr) => {
        if (item.group) {
          const next = arr[i + 1];
          return next && !next.group;
        }
        return true;
      });
    }
    
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
      executeItem(selectedIdx);
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
    // Don't intercept when typing in inputs (except our palette)
    const isInput = e.target.tagName === 'INPUT' || 
                    e.target.tagName === 'TEXTAREA' || 
                    e.target.isContentEditable;
    
    if (isInput && e.target !== inputEl) {
      return;
    }

    // Cmd/Ctrl+K to toggle palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      e.stopPropagation();
      if (isPaletteOpen()) {
        closePalette();
      } else {
        openPalette();
      }
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
      clearTimeout(keyTimer);
      keySeq += e.key.toLowerCase();
      keyTimer = setTimeout(() => { keySeq = ''; }, KEY_SEQ_TIMEOUT_MS);

      const sequences = getKeySequences();
      if (sequences[keySeq]) {
        e.preventDefault();
        sequences[keySeq]();
        keySeq = '';
      } else if (keySeq.length >= 2) {
        // Reset if no match and we have 2+ chars
        keySeq = e.key.toLowerCase();
      }
    }
  }, true); // Use capture to intercept before YouTube

  console.log('[Keyring] YouTube palette loaded');

})();
