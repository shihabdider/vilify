// ==UserScript==
// @name         Vilify - YouTube
// @namespace    https://github.com/shihabdider/vilify
// @version      0.1.0
// @description  Vim-style command palette for YouTube
// @author       shihabdider
// @updateURL    https://raw.githubusercontent.com/shihabdider/vilify/main/sites/youtube.user.js
// @downloadURL  https://raw.githubusercontent.com/shihabdider/vilify/main/sites/youtube.user.js
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
      /* YouTube Dark Theme */
      --yt-bg-primary: #0f0f0f;
      --yt-bg-secondary: #272727;
      --yt-bg-hover: #3f3f3f;
      --yt-text-primary: #f1f1f1;
      --yt-text-secondary: #aaaaaa;
      --yt-border: #3f3f3f;
      --yt-accent: #ff0000;
      --yt-accent-hover: #cc0000;
      --yt-blue: #3ea6ff;
      
      /* Semantic mappings */
      --bg-primary: var(--yt-bg-primary);
      --bg-secondary: var(--yt-bg-secondary);
      --bg-hover: var(--yt-bg-hover);
      --text-primary: var(--yt-text-primary);
      --text-secondary: var(--yt-text-secondary);
      --text-emphasis: var(--yt-text-primary);
      --border: var(--yt-border);
      --accent: var(--yt-accent);
      --accent-alt: var(--yt-blue);
      --selection: var(--yt-accent);
      --error: var(--yt-accent);
      
      /* YouTube font stack */
      --font-main: 'Roboto', 'Arial', sans-serif;
      --font-mono: 'Roboto Mono', 'SF Mono', 'Monaco', 'Consolas', monospace;
    }

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

    #vilify-focus {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: var(--bg-primary);
      font-family: var(--font-main);
      color: var(--text-primary);
      display: flex;
      flex-direction: column;
      visibility: visible !important;
    }

    .vilify-header {
      padding: 12px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .vilify-logo {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .vilify-logo-icon {
      width: 90px;
      height: 20px;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 20"><path fill="%23FF0000" d="M27.973 18.652c-.322.964-.994 1.723-1.858 2.099C23.835 21.6 15 21.6 15 21.6s-8.835 0-11.115-.849c-.864-.376-1.536-1.135-1.858-2.099C1.2 16.432 1.2 12 1.2 12s0-4.432.827-6.652c.322-.964.994-1.723 1.858-2.099C6.165 2.4 15 2.4 15 2.4s8.835 0 11.115.849c.864.376 1.536 1.135 1.858 2.099.827 2.22.827 6.652.827 6.652s0 4.432-.827 6.652z" transform="translate(0,-2)"/><path fill="%23FFF" d="M12 15.6l7.2-4.8L12 6v9.6z" transform="translate(0,-2)"/><text x="32" y="15" fill="%23FFF" font-family="Arial,sans-serif" font-size="14" font-weight="bold">YouTube</text></svg>') no-repeat center;
      background-size: contain;
    }

    .vilify-mode {
      color: var(--text-secondary);
      font-size: 14px;
    }

    .vilify-filter-wrapper,
    .vilify-search-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--accent);
      font-size: 16px;
    }

    .vilify-filter-wrapper.hidden,
    .vilify-search-wrapper.hidden {
      display: none;
    }

    #vilify-filter,
    #vilify-search {
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--border);
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: 16px;
      padding: 4px 8px;
      width: 300px;
      outline: none;
    }

    #vilify-filter:focus,
    #vilify-search:focus {
      border-bottom-color: var(--accent);
    }

    #vilify-filter::placeholder,
    #vilify-search::placeholder {
      color: var(--text-secondary);
    }

    #vilify-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px 0;
    }

    .vilify-footer {
      padding: 12px 24px;
      border-top: 1px solid var(--border);
      color: var(--text-secondary);
      font-size: 14px;
      font-size: 12px;
    }

    .vilify-video-item {
      display: flex;
      align-items: flex-start;
      padding: 12px 24px;
      cursor: pointer;
      max-width: 900px;
      margin: 0 auto;
      border-radius: 12px;
    }

    .vilify-video-item:hover {
      background: var(--bg-secondary);
    }

    .vilify-video-item.selected {
      background: var(--bg-secondary);
      outline: 2px solid var(--accent);
      outline-offset: -2px;
    }

    .vilify-thumb-wrapper {
      width: 200px;
      height: 113px;
      margin-right: 16px;
      flex-shrink: 0;
      border-radius: 8px;
      overflow: hidden;
      background: var(--bg-secondary);
    }

    .vilify-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .vilify-video-info {
      flex: 1;
      min-width: 0;
      padding-top: 4px;
    }

    .vilify-video-title {
      color: var(--text-primary);
      margin-bottom: 4px;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.4;
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
      font-size: 16px;
    }

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
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 12px 0;
      line-height: 1.4;
    }

    .vilify-channel-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .vilify-channel-name {
      color: var(--text-primary);
      font-size: 16px;
      font-weight: 500;
    }

    .vilify-subscribe-btn {
      background: var(--accent);
      border: none;
      border-radius: 18px;
      color: white;
      padding: 8px 16px;
      font-family: var(--font-main);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }

    .vilify-subscribe-btn:hover {
      background: var(--accent-hover);
    }

    .vilify-subscribe-btn.subscribed {
      background: var(--bg-secondary);
      color: var(--text-primary);
    }

    .vilify-subscribe-btn.subscribed:hover {
      background: var(--bg-hover);
    }

    .vilify-description {
      margin-top: 12px;
    }

    .vilify-description-text {
      color: var(--text-primary);
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .vilify-description-text.collapsed {
      max-height: 80px;
      overflow: hidden;
    }

    .vilify-description-toggle {
      background: none;
      border: none;
      color: var(--text-primary);
      font-family: var(--font-main);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      padding: 8px 0;
    }

    .vilify-description-toggle:hover {
      color: var(--text-secondary);
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
      color: var(--text-primary);
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .vilify-comment-text {
      color: var(--text-primary);
      font-size: 14px;
      line-height: 1.4;
    }

    /* Chapter Picker */
    #vilify-chapter-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      align-items: flex-start;
      justify-content: center;
      padding-top: 15vh;
      z-index: 9999999;
      font-family: var(--font-main);
    }

    #vilify-chapter-overlay.open {
      display: flex;
    }

    #vilify-chapter-modal {
      width: 500px;
      max-width: 90vw;
      max-height: 70vh;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    #vilify-chapter-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    #vilify-chapter-header-title {
      font-size: 16px;
      font-weight: 500;
      color: var(--text-primary);
    }

    #vilify-chapter-input-wrapper {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }

    #vilify-chapter-input {
      width: 100%;
      padding: 10px 12px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 14px;
      font-family: var(--font-main);
      color: var(--text-primary);
      outline: none;
    }

    #vilify-chapter-input:focus {
      border-color: var(--accent);
    }

    #vilify-chapter-input::placeholder {
      color: var(--text-secondary);
    }

    #vilify-chapter-list {
      flex: 1;
      overflow-y: auto;
      max-height: 400px;
    }

    .vilify-chapter-item {
      display: flex;
      align-items: center;
      padding: 10px 16px;
      cursor: pointer;
      gap: 12px;
    }

    .vilify-chapter-item:hover {
      background: var(--bg-secondary);
    }

    .vilify-chapter-item.selected {
      background: var(--bg-secondary);
      outline: 2px solid var(--accent);
      outline-offset: -2px;
    }

    .vilify-chapter-thumb {
      width: 80px;
      height: 45px;
      border-radius: 6px;
      background: var(--bg-hover);
      object-fit: cover;
      flex-shrink: 0;
    }

    .vilify-chapter-info {
      flex: 1;
      min-width: 0;
    }

    .vilify-chapter-title {
      font-size: 14px;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .vilify-chapter-time {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .vilify-chapter-empty {
      padding: 40px;
      text-align: center;
      color: var(--text-secondary);
      font-size: 14px;
    }

    #vilify-chapter-footer {
      padding: 10px 16px;
      border-top: 1px solid var(--border);
      font-size: 12px;
      color: var(--text-secondary);
      display: flex;
      gap: 16px;
    }

    #vilify-chapter-footer kbd {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 2px 6px;
      margin: 0 4px;
      font-size: 11px;
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
      font-family: var(--font-mono);
    }

    #keyring-overlay.open {
      display: flex;
    }

    #keyring-modal {
      width: 560px;
      max-width: 90vw;
      max-height: 70vh;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    #keyring-header {
      background: var(--bg-secondary);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--border);
    }

    #keyring-header-logo {
      width: 24px;
      height: 24px;
      background: var(--accent);
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
      color: var(--text-primary);
    }

    #keyring-input-wrapper {
      padding: 12px 16px;
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border);
    }

    #keyring-input {
      width: 100%;
      padding: 10px 12px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 14px;
      font-family: var(--font-main);
      color: var(--text-primary);
      outline: none;
    }

    #keyring-input::placeholder {
      color: var(--text-secondary);
    }

    #keyring-input:focus {
      border-color: var(--accent);
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
      color: var(--text-secondary);
      background: var(--bg-primary);
    }

    .keyring-item {
      display: flex;
      align-items: center;
      padding: 10px 16px;
      cursor: pointer;
      font-size: 14px;
      color: var(--text-primary);
      background: var(--bg-primary);
    }

    .keyring-item:hover {
      background: var(--bg-hover);
    }

    .keyring-item.selected {
      background: var(--accent);
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
      color: var(--text-secondary);
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .keyring-item.selected .keyring-icon {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .keyring-thumbnail {
      width: 80px;
      height: 45px;
      margin-right: 12px;
      border-radius: 8px;
      background: var(--bg-secondary);
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
      color: var(--text-secondary);
      margin-left: 8px;
    }

    .keyring-shortcut {
      margin-left: 12px;
      display: flex;
      gap: 4px;
    }

    .keyring-shortcut kbd {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--text-secondary);
    }

    #keyring-footer {
      display: flex;
      gap: 20px;
      padding: 10px 16px;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border);
      font-size: 12px;
      color: var(--text-secondary);
    }

    #keyring-footer kbd {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 2px 6px;
      margin: 0 4px;
      font-size: 11px;
    }

    .keyring-empty {
      padding: 40px;
      text-align: center;
      color: var(--text-secondary);
      font-size: 14px;
    }

    .keyring-toast {
      position: fixed;
      bottom: 32px;
      right: 32px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      padding: 12px 20px;
      border-radius: 8px;
      border: none;
      font-size: 14px;
      font-weight: 500;
      font-family: var(--font-main);
      z-index: 10000000;
      opacity: 0;
      transition: opacity 0.2s;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
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
  let focusModeActive = true;
  let focusOverlay = null;
  let filterActive = false;
  let filterQuery = '';

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

    // Get title - try multiple selectors for different YouTube layouts
    const titleSelectors = [
      'h1.ytd-watch-metadata yt-formatted-string',
      'h1.ytd-watch-metadata',
      '#title h1 yt-formatted-string',
      '#title h1',
      'ytd-watch-metadata h1',
      'h1.ytd-video-primary-info-renderer',
      '#info-contents h1 yt-formatted-string',
      'yt-formatted-string.ytd-watch-metadata'
    ];
    for (const sel of titleSelectors) {
      const titleEl = document.querySelector(sel);
      if (titleEl?.textContent?.trim()) {
        ctx.title = titleEl.textContent.trim();
        break;
      }
    }

    // Get channel name - try multiple selectors
    const channelSelectors = [
      'ytd-video-owner-renderer #channel-name a',
      'ytd-video-owner-renderer ytd-channel-name a',
      'ytd-video-owner-renderer #channel-name yt-formatted-string a',
      '#owner #channel-name a',
      '#owner ytd-channel-name a',
      '#channel-name a',
      'ytd-channel-name#channel-name a',
      '#upload-info #channel-name a',
      '#top-row ytd-video-owner-renderer a.yt-simple-endpoint'
    ];
    for (const sel of channelSelectors) {
      const channelEl = document.querySelector(sel);
      if (channelEl?.textContent?.trim()) {
        ctx.channelName = channelEl.textContent.trim();
        ctx.channelUrl = channelEl.href;
        break;
      }
    }

    // Check if subscribed - multiple possible button structures
    const subButtonSelectors = [
      'ytd-subscribe-button-renderer button',
      '#subscribe-button button',
      'ytd-video-owner-renderer ytd-subscribe-button-renderer button',
      '#owner ytd-subscribe-button-renderer button'
    ];
    for (const sel of subButtonSelectors) {
      const subButton = document.querySelector(sel);
      if (subButton) {
        const label = subButton.getAttribute('aria-label') || '';
        ctx.isSubscribed = label.toLowerCase().includes('unsubscribe');
        break;
      }
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

  function getVideoDescription() {
    // Try multiple selectors for description - YouTube layout varies
    const descSelectors = [
      'ytd-watch-metadata #description-inner',
      'ytd-watch-metadata ytd-text-inline-expander',
      '#description ytd-text-inline-expander',
      '#description-inner',
      'ytd-text-inline-expander#description-inline-expander',
      '#description .content',
      'ytd-expandable-video-description-body-renderer #description-inner',
      '#description yt-attributed-string'
    ];
    for (const sel of descSelectors) {
      const descEl = document.querySelector(sel);
      if (descEl?.textContent?.trim()) {
        return descEl.textContent.trim();
      }
    }
    return '';
  }

  function scrapeComments() {
    const comments = [];
    // Try multiple selectors for different YouTube layouts
    const commentSelectors = [
      'ytd-comment-thread-renderer',
      'ytd-comment-view-model',
      'ytd-comment-renderer'
    ];
    
    let commentEls = [];
    for (const sel of commentSelectors) {
      commentEls = document.querySelectorAll(sel);
      if (commentEls.length > 0) break;
    }
    
    for (const el of Array.from(commentEls).slice(0, 20)) {
      // Try multiple author selectors
      const authorSelectors = [
        '#author-text',
        '#author-text span',
        'a#author-text',
        '.ytd-comment-view-model #author-text',
        '#header-author #author-text',
        'h3 a'
      ];
      let author = '';
      for (const sel of authorSelectors) {
        const authorEl = el.querySelector(sel);
        if (authorEl?.textContent?.trim()) {
          author = authorEl.textContent.trim();
          break;
        }
      }
      
      // Try multiple content selectors
      const contentSelectors = [
        '#content-text',
        '#content-text span',
        'yt-attributed-string#content-text',
        '.ytd-comment-view-model #content-text',
        '#comment-content #content-text'
      ];
      let text = '';
      for (const sel of contentSelectors) {
        const textEl = el.querySelector(sel);
        if (textEl?.textContent?.trim()) {
          text = textEl.textContent.trim();
          break;
        }
      }
      
      if (author && text) {
        comments.push({ author, text });
      }
    }
    
    return comments;
  }

  // ============================================
  // Chapter Scraping
  // ============================================
  function scrapeChapters() {
    const chapters = [];
    
    // Method 1: From chapter markers in progress bar
    const chapterMarkers = document.querySelectorAll('.ytp-chapter-hover-container');
    if (chapterMarkers.length > 0) {
      for (const marker of chapterMarkers) {
        const title = marker.querySelector('.ytp-chapter-title')?.textContent?.trim();
        const timeText = marker.dataset.startTime || marker.getAttribute('data-start-time');
        if (title && timeText) {
          chapters.push({
            title,
            time: parseFloat(timeText),
            thumbnailUrl: null
          });
        }
      }
    }
    
    // Method 2: From description chapters panel
    if (chapters.length === 0) {
      const chapterItems = document.querySelectorAll('ytd-macro-markers-list-item-renderer');
      for (const item of chapterItems) {
        const titleEl = item.querySelector('#details h4, #title');
        const timeEl = item.querySelector('#time, #details #time');
        const thumbEl = item.querySelector('img');
        
        if (titleEl && timeEl) {
          const timeText = timeEl.textContent.trim();
          const time = parseTimestamp(timeText);
          chapters.push({
            title: titleEl.textContent.trim(),
            time,
            timeText,
            thumbnailUrl: thumbEl?.src || null
          });
        }
      }
    }
    
    // Method 3: From expandable description chapters
    if (chapters.length === 0) {
      const descChapters = document.querySelectorAll('ytd-expandable-video-description-body-renderer ytd-macro-markers-list-item-renderer');
      for (const item of descChapters) {
        const titleEl = item.querySelector('h4, #title');
        const timeEl = item.querySelector('#time');
        const thumbEl = item.querySelector('img');
        
        if (titleEl && timeEl) {
          const timeText = timeEl.textContent.trim();
          const time = parseTimestamp(timeText);
          chapters.push({
            title: titleEl.textContent.trim(),
            time,
            timeText,
            thumbnailUrl: thumbEl?.src || null
          });
        }
      }
    }
    
    return chapters;
  }

  function parseTimestamp(str) {
    // Parse "1:23" or "1:23:45" to seconds
    const parts = str.split(':').map(p => parseInt(p, 10));
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  }

  // ============================================
  // Description Toggle (zo/zc)
  // ============================================
  function toggleDescriptionOpen() {
    const descText = document.querySelector('.vilify-description-text');
    const descToggle = document.querySelector('.vilify-description-toggle');
    if (descText && descToggle) {
      descText.classList.remove('collapsed');
      descToggle.textContent = '...less';
      showToast('Description expanded');
    }
  }

  function toggleDescriptionClose() {
    const descText = document.querySelector('.vilify-description-text');
    const descToggle = document.querySelector('.vilify-description-toggle');
    if (descText && descToggle) {
      descText.classList.add('collapsed');
      descToggle.textContent = '...more';
      showToast('Description collapsed');
    }
  }

  function toggleDescription() {
    const descText = document.querySelector('.vilify-description-text');
    const descToggle = document.querySelector('.vilify-description-toggle');
    if (descText && descToggle) {
      const isCollapsed = descText.classList.toggle('collapsed');
      descToggle.textContent = isCollapsed ? '...more' : '...less';
    }
  }

  let watchPageRetryCount = 0;
  const WATCH_PAGE_MAX_RETRIES = 10;
  const WATCH_PAGE_RETRY_DELAY = 500;

  function renderWatchPage() {
    const content = document.getElementById('vilify-content');
    if (!content) return;
    
    // Clear content
    while (content.firstChild) {
      content.removeChild(content.firstChild);
    }
    
    const ctx = getVideoContext();
    
    // If no context or missing critical data, retry
    if (!ctx || (!ctx.title && !ctx.channelName)) {
      if (watchPageRetryCount < WATCH_PAGE_MAX_RETRIES) {
        watchPageRetryCount++;
        content.appendChild(createElement('div', { 
          className: 'vilify-empty', 
          textContent: 'Loading video info...' 
        }));
        setTimeout(renderWatchPage, WATCH_PAGE_RETRY_DELAY);
        return;
      }
    }
    
    // Reset retry count on successful render
    watchPageRetryCount = 0;
    
    if (!ctx) {
      content.appendChild(createElement('div', { 
        className: 'vilify-empty', 
        textContent: 'Could not load video info' 
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
      className: ctx.isSubscribed ? 'vilify-subscribe-btn subscribed' : 'vilify-subscribe-btn',
      textContent: ctx.isSubscribed ? 'Subscribed' : 'Subscribe'
    });
    subBtn.addEventListener('click', () => {
      const ytSubBtn = document.querySelector('ytd-subscribe-button-renderer button, #subscribe-button button');
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
      textContent: '...more'
    });
    descToggle.addEventListener('click', () => {
      const isCollapsed = descText.classList.toggle('collapsed');
      descToggle.textContent = isCollapsed ? '...more' : '...less';
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
    
    // If no comments yet, set up observer to re-render when they load
    if (comments.length === 0) {
      setupCommentObserver();
    }
  }

  let commentObserver = null;
  function setupCommentObserver() {
    if (commentObserver) return; // Already observing
    
    const commentsContainer = document.querySelector('ytd-comments, #comments');
    if (!commentsContainer) return;
    
    commentObserver = new MutationObserver(() => {
      const comments = scrapeComments();
      if (comments.length > 0) {
        // Found comments, update the UI
        const commentsList = document.querySelector('.vilify-comments-list');
        if (commentsList) {
          while (commentsList.firstChild) {
            commentsList.removeChild(commentsList.firstChild);
          }
          comments.forEach(comment => {
            const commentEl = createElement('div', { className: 'vilify-comment' }, [
              createElement('div', { className: 'vilify-comment-author', textContent: comment.author }),
              createElement('div', { className: 'vilify-comment-text', textContent: comment.text })
            ]);
            commentsList.appendChild(commentEl);
          });
        }
        // Stop observing once we have comments
        commentObserver.disconnect();
        commentObserver = null;
      }
    });
    
    commentObserver.observe(commentsContainer, { childList: true, subtree: true });
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
      // Temporarily hide focus mode overlay to show YouTube's search
      if (focusModeActive && focusOverlay) {
        focusOverlay.style.display = 'none';
        document.body.classList.remove('vilify-focus-mode');
      }
      
      // Attach handlers if not already done
      if (!searchInput.dataset.vilifyEscapeHandler) {
        searchInput.dataset.vilifyEscapeHandler = 'true';
        
        // Escape cancels search and restores focus mode
        searchInput.addEventListener('keydown', e => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            searchInput.blur();
            searchInput.value = '';
            // Restore focus mode overlay (user cancelled)
            if (focusModeActive && focusOverlay) {
              focusOverlay.style.display = '';
              document.body.classList.add('vilify-focus-mode');
            }
            showToast('Search cancelled');
          }
        }, true);
        
        // Don't restore on blur - let navigation handler deal with it
        // This allows search submission to work properly
      }
      
      searchInput.focus();
      // Small delay before select to ensure focus completes
      setTimeout(() => searchInput.select(), 10);
      showToast('Search (Enter to search, Esc to cancel)');
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
    cmds.push({ label: 'History', icon: '⏱', action: () => navigateTo('/feed/history'), keys: 'G Y' });
    cmds.push({ label: 'Library', icon: '📚', action: () => navigateTo('/feed/library'), keys: 'G L' });
    cmds.push({ label: 'Trending', icon: '🔥', action: () => navigateTo('/feed/trending'), keys: 'G T' });
    cmds.push({ label: 'Search', icon: '🔍', action: () => focusSearchBox(), keys: 'I' });
    cmds.push({ label: 'Exit focus mode', icon: '×', action: exitFocusMode, keys: ':Q' });

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
      cmds.push({ label: 'Expand description', icon: '📖', action: toggleDescriptionOpen, keys: 'Z O' });
      cmds.push({ label: 'Collapse description', icon: '📕', action: toggleDescriptionClose, keys: 'Z C' });
      cmds.push({ label: 'Jump to chapter', icon: '📑', action: openChapterPicker, keys: 'F' });

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
      // Focus mode controls
      '/': () => {
        if (focusModeActive && getPageType() !== 'watch') {
          openFilter();
        } else {
          openPalette('video');
        }
      },
      ':': () => openPalette('command'),
      'i': () => openSearch(),
      
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
      // Description toggle (vim fold style)
      sequences['zo'] = toggleDescriptionOpen;
      sequences['zc'] = toggleDescriptionClose;
      // Chapter picker
      sequences['f'] = openChapterPicker;
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

  function createFocusOverlay() {
    if (focusOverlay) return;
    
    focusOverlay = createElement('div', { id: 'vilify-focus' });
    
    // Header with filter and search
    const header = createElement('div', { className: 'vilify-header' });
    const logo = createElement('div', { className: 'vilify-logo' });
    logo.appendChild(createElement('div', { className: 'vilify-logo-icon' }));
    header.appendChild(logo);
    
    // Filter input (hidden by default)
    const filterWrapper = createElement('div', { className: 'vilify-filter-wrapper hidden', 'data-mode': 'filter' });
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
    
    // Search input (hidden by default)
    const searchWrapper = createElement('div', { className: 'vilify-search-wrapper hidden', 'data-mode': 'search' });
    const searchInput = createElement('input', {
      id: 'vilify-search',
      type: 'text',
      placeholder: 'search youtube...',
      autocomplete: 'off',
      spellcheck: 'false'
    });
    searchWrapper.appendChild(createElement('span', { textContent: '?' }));
    searchWrapper.appendChild(searchInput);
    header.appendChild(searchWrapper);
    
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
    
    // Search input event listeners
    searchInput.addEventListener('keydown', onSearchKeydown);
  }

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

  // ============================================
  // Search Input (Focus Mode)
  // ============================================
  let searchActive = false;

  function openSearch() {
    const wrapper = document.querySelector('.vilify-search-wrapper');
    const input = document.getElementById('vilify-search');
    if (!wrapper || !input) return;
    
    searchActive = true;
    wrapper.classList.remove('hidden');
    input.value = '';
    input.focus();
  }

  function closeSearch() {
    const wrapper = document.querySelector('.vilify-search-wrapper');
    const input = document.getElementById('vilify-search');
    if (!wrapper || !input) return;
    
    searchActive = false;
    wrapper.classList.add('hidden');
    input.blur();
  }

  function onSearchKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSearch();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const query = e.target.value.trim();
      if (query) {
        closeSearch();
        // Navigate to YouTube search results
        navigateTo('/results?search_query=' + encodeURIComponent(query));
      }
    }
  }

  // ============================================
  // Chapter Picker (f key)
  // ============================================
  let chapterOverlay = null;
  let chapterInputEl = null;
  let chapterListEl = null;
  let chapterItems = [];
  let chapterSelectedIdx = 0;
  let chapterPickerActive = false;

  function createChapterPicker() {
    if (chapterOverlay) return;

    chapterOverlay = createElement('div', { id: 'vilify-chapter-overlay' });
    const modal = createElement('div', { id: 'vilify-chapter-modal' });

    // Header
    const header = createElement('div', { id: 'vilify-chapter-header' }, [
      createElement('span', { id: 'vilify-chapter-header-title', textContent: 'Jump to Chapter' })
    ]);

    // Input
    chapterInputEl = createElement('input', {
      id: 'vilify-chapter-input',
      type: 'text',
      placeholder: 'Filter chapters...',
      autocomplete: 'off',
      spellcheck: 'false'
    });
    const inputWrapper = createElement('div', { id: 'vilify-chapter-input-wrapper' }, [chapterInputEl]);

    // List
    chapterListEl = createElement('div', { id: 'vilify-chapter-list' });

    // Footer
    const footer = createElement('div', { id: 'vilify-chapter-footer' }, [
      createChapterFooterHint(['↑', '↓'], 'navigate'),
      createChapterFooterHint(['↵'], 'jump'),
      createChapterFooterHint(['esc'], 'close')
    ]);

    modal.appendChild(header);
    modal.appendChild(inputWrapper);
    modal.appendChild(chapterListEl);
    modal.appendChild(footer);
    chapterOverlay.appendChild(modal);
    document.body.appendChild(chapterOverlay);

    // Event listeners
    chapterOverlay.addEventListener('click', e => {
      if (e.target === chapterOverlay) closeChapterPicker();
    });
    chapterInputEl.addEventListener('input', onChapterInput);
    chapterInputEl.addEventListener('keydown', onChapterKeydown);
  }

  function createChapterFooterHint(keys, label) {
    const span = createElement('span');
    for (const key of keys) {
      span.appendChild(createElement('kbd', { textContent: key }));
    }
    span.appendChild(document.createTextNode(' ' + label));
    return span;
  }

  function openChapterPicker() {
    const chapters = scrapeChapters();
    if (chapters.length === 0) {
      showToast('No chapters found');
      return;
    }

    if (!chapterOverlay) createChapterPicker();
    
    chapterItems = chapters;
    chapterSelectedIdx = 0;
    chapterPickerActive = true;
    
    renderChapterList();
    chapterOverlay.classList.add('open');
    chapterInputEl.value = '';
    chapterInputEl.focus();
  }

  function closeChapterPicker() {
    if (chapterOverlay) {
      chapterOverlay.classList.remove('open');
    }
    chapterPickerActive = false;
  }

  function isChapterPickerOpen() {
    return chapterOverlay?.classList.contains('open');
  }

  function renderChapterList(filter = '') {
    while (chapterListEl.firstChild) {
      chapterListEl.removeChild(chapterListEl.firstChild);
    }

    let filtered = chapterItems;
    if (filter) {
      const q = filter.toLowerCase();
      filtered = chapterItems.filter(ch => ch.title.toLowerCase().includes(q));
    }

    if (filtered.length === 0) {
      chapterListEl.appendChild(createElement('div', {
        className: 'vilify-chapter-empty',
        textContent: filter ? `No chapters matching "${filter}"` : 'No chapters found'
      }));
      return;
    }

    filtered.forEach((chapter, idx) => {
      const item = createElement('div', {
        className: `vilify-chapter-item ${idx === chapterSelectedIdx ? 'selected' : ''}`,
        'data-idx': String(idx),
        'data-time': String(chapter.time)
      });

      // Thumbnail (if available)
      if (chapter.thumbnailUrl) {
        item.appendChild(createElement('img', {
          className: 'vilify-chapter-thumb',
          src: chapter.thumbnailUrl,
          alt: ''
        }));
      }

      // Info
      const info = createElement('div', { className: 'vilify-chapter-info' });
      info.appendChild(createElement('div', { className: 'vilify-chapter-title', textContent: chapter.title }));
      info.appendChild(createElement('div', { 
        className: 'vilify-chapter-time', 
        textContent: chapter.timeText || formatTimestamp(chapter.time) 
      }));
      item.appendChild(info);

      chapterListEl.appendChild(item);

      // Event listeners
      item.addEventListener('click', () => jumpToChapter(idx, filtered));
      item.addEventListener('mouseenter', () => {
        chapterSelectedIdx = idx;
        updateChapterSelection();
      });
    });
  }

  function updateChapterSelection() {
    const items = chapterListEl.querySelectorAll('.vilify-chapter-item');
    items.forEach((el, i) => {
      el.classList.toggle('selected', i === chapterSelectedIdx);
    });
    const sel = chapterListEl.querySelector('.vilify-chapter-item.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function jumpToChapter(idx, filteredList = null) {
    const list = filteredList || chapterItems;
    const chapter = list[idx];
    if (!chapter) return;

    const video = getVideo();
    if (video) {
      video.currentTime = chapter.time;
      showToast(`Jumped to: ${chapter.title}`);
    }
    closeChapterPicker();
  }

  function onChapterInput(e) {
    chapterSelectedIdx = 0;
    renderChapterList(e.target.value);
  }

  function onChapterKeydown(e) {
    const filter = chapterInputEl.value;
    let filtered = chapterItems;
    if (filter) {
      const q = filter.toLowerCase();
      filtered = chapterItems.filter(ch => ch.title.toLowerCase().includes(q));
    }
    const count = filtered.length;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeChapterPicker();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (count > 0) {
        chapterSelectedIdx = (chapterSelectedIdx + 1) % count;
        updateChapterSelection();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (count > 0) {
        chapterSelectedIdx = (chapterSelectedIdx - 1 + count) % count;
        updateChapterSelection();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      jumpToChapter(chapterSelectedIdx, filtered);
    }
  }

  // ============================================
  // Video List Rendering (Focus Mode)
  // ============================================
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
      const message = filterQuery 
        ? `No videos matching "${filterQuery}"` 
        : 'No videos found. Try scrolling to load more.';
      content.appendChild(createElement('div', { 
        className: 'vilify-empty', 
        textContent: message 
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

    // Check for :q command
    if (e.key === 'Enter' && inputEl.value.trim().toLowerCase() === ':q') {
      e.preventDefault();
      closePalette();
      exitFocusMode();
      return;
    }

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



    // Escape to close palettes
    if (e.key === 'Escape') {
      if (isChapterPickerOpen()) {
        e.preventDefault();
        closeChapterPicker();
        return;
      }
      if (isPaletteOpen()) {
        e.preventDefault();
        closePalette();
        return;
      }
    }

    // Vim-style sequences when palette is closed
    if (!isPaletteOpen() && !isChapterPickerOpen() && !isInput) {
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

      // Check for ZZ (exit focus mode)
      if (focusModeActive && keySeq === 'Z' && e.key === 'Z') {
        e.preventDefault();
        exitFocusMode();
        keySeq = '';
        return;
      }

      // j/k navigation in focus mode (listing pages only)
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
  // Focus Mode Initialization
  // ============================================
  function initFocusMode() {
    if (!focusModeActive) return;
    
    // Add focus mode class to body
    document.body.classList.add('vilify-focus-mode');
    
    // Create overlay if needed
    createFocusOverlay();
    
    // Ensure overlay is visible (may have been hidden for search)
    if (focusOverlay) {
      focusOverlay.style.display = '';
    }
    
    // Route to appropriate renderer
    const pageType = getPageType();
    
    if (pageType === 'watch') {
      document.body.classList.add('vilify-watch-page');
      renderWatchPage();
    } else {
      document.body.classList.remove('vilify-watch-page');
      const videos = scrapeVideos();
      renderVideoList(videos);
      // Watch for more videos loading
      setupVideoObserver();
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

  function waitForContent(callback, maxWait = 5000) {
    const startTime = Date.now();
    let lastVideoCount = 0;
    let stableCount = 0;
    
    function check() {
      const videoElements = document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, yt-lockup-view-model');
      const hasPlayer = document.querySelector('#movie_player video');
      const pageType = getPageType();
      
      // On watch page, wait for player
      if (pageType === 'watch') {
        if (hasPlayer) {
          callback();
        } else if (Date.now() - startTime < maxWait) {
          setTimeout(check, 100);
        } else {
          callback();
        }
        return;
      }
      
      // On listing pages, wait for videos to stabilize (stop loading more)
      const currentCount = videoElements.length;
      
      if (currentCount > 0) {
        if (currentCount === lastVideoCount) {
          stableCount++;
          // Wait for count to be stable for 3 checks (300ms)
          if (stableCount >= 3) {
            callback();
            return;
          }
        } else {
          stableCount = 0;
          lastVideoCount = currentCount;
        }
      }
      
      if (Date.now() - startTime < maxWait) {
        setTimeout(check, 100);
      } else {
        // Timeout - show what we have
        callback();
      }
    }
    
    check();
  }
  
  // Re-render video list when more videos load (lazy loading)
  function setupVideoObserver() {
    if (getPageType() === 'watch') return;
    
    let renderTimeout = null;
    const videoObserver = new MutationObserver(() => {
      if (!focusModeActive || filterActive || searchActive) return;
      
      // Debounce re-renders
      clearTimeout(renderTimeout);
      renderTimeout = setTimeout(() => {
        const videos = scrapeVideos();
        const currentItems = document.querySelectorAll('.vilify-video-item').length;
        // Only re-render if we have more videos
        if (videos.length > currentItems) {
          clearVideoCache();
          renderVideoList(scrapeVideos());
        }
      }, 500);
    });
    
    // Watch for new video elements being added
    const contentArea = document.querySelector('ytd-rich-grid-renderer, ytd-section-list-renderer, #contents');
    if (contentArea) {
      videoObserver.observe(contentArea, { childList: true, subtree: true });
    }
  }

  // ============================================
  // SPA Navigation Detection
  // ============================================
  // YouTube is an SPA - detect navigation without full page loads
  let lastUrl = location.href;
  let settingsApplied = false;

  function onNavigate() {
    if (isPaletteOpen()) {
      closePalette();
    }
    if (filterActive) {
      filterQuery = '';
      closeFilter();
    }
    if (searchActive) {
      closeSearch();
    }
    settingsApplied = false;
    clearVideoCache();
    selectedIdx = 0;
    watchPageRetryCount = 0;
    // Clean up comment observer
    if (commentObserver) {
      commentObserver.disconnect();
      commentObserver = null;
    }
    
    if (focusModeActive) {
      showLoading();
      waitForContent(() => {
        initFocusMode();
      });
    }
    console.log('[Vilify] Navigated to:', location.pathname);
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

})();
