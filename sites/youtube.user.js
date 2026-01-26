// ==UserScript==
// @name         Vilify - YouTube
// @namespace    https://github.com/shihabdider/vilify
// @version      0.2.1
// @description  Vim-style command palette for YouTube
// @author       shihabdider
// @updateURL    https://raw.githubusercontent.com/shihabdider/vilify/main/sites/youtube.user.js
// @downloadURL  https://raw.githubusercontent.com/shihabdider/vilify/main/sites/youtube.user.js
// @match        https://www.youtube.com/*
// @match        https://youtube.com/*
// @grant        GM_setClipboard
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // ============================================
  // Early Loading Screen
  // ============================================
  // Inject loading styles immediately to prevent flash of YouTube UI
  // This runs at document-start, before YouTube renders anything
  const LOADING_CSS = `
    /* Hide YouTube UI immediately during loading */
    body.vilify-loading ytd-app,
    body.vilify-loading #content,
    body.vilify-loading ytd-browse,
    body.vilify-loading ytd-watch-flexy,
    body.vilify-loading ytd-search {
      visibility: hidden !important;
    }

    /* Loading overlay */
    #vilify-loading-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999999;
      background: #002b36;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: 'Roboto', 'Arial', sans-serif;
    }

    #vilify-loading-overlay.hidden {
      display: none;
    }

    .vilify-loading-logo {
      width: 120px;
      height: 27px;
      margin-bottom: 24px;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 20"><path fill="%23dc322f" d="M27.973 18.652c-.322.964-.994 1.723-1.858 2.099C23.835 21.6 15 21.6 15 21.6s-8.835 0-11.115-.849c-.864-.376-1.536-1.135-1.858-2.099C1.2 16.432 1.2 12 1.2 12s0-4.432.827-6.652c.322-.964.994-1.723 1.858-2.099C6.165 2.4 15 2.4 15 2.4s8.835 0 11.115.849c.864.376 1.536 1.135 1.858 2.099.827 2.22.827 6.652.827 6.652s0 4.432-.827 6.652z" transform="translate(0,-2)"/><path fill="%23FFF" d="M12 15.6l7.2-4.8L12 6v9.6z" transform="translate(0,-2)"/><text x="32" y="15" fill="%2393a1a1" font-family="Arial,sans-serif" font-size="14" font-weight="bold">YouTube</text></svg>') no-repeat center;
      background-size: contain;
    }

    .vilify-loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #073642;
      border-top-color: #dc322f;
      border-radius: 50%;
      animation: vilify-spin 0.8s linear infinite;
    }

    @keyframes vilify-spin {
      to { transform: rotate(360deg); }
    }

    .vilify-loading-text {
      margin-top: 16px;
      color: #657b83;
      font-size: 14px;
    }
  `;

  function injectLoadingScreen() {
    // Inject loading CSS into head (or html if head not ready)
    const style = document.createElement('style');
    style.id = 'vilify-loading-styles';
    style.textContent = LOADING_CSS;
    (document.head || document.documentElement).appendChild(style);

    // Add loading class to body (or html if body not ready)
    const target = document.body || document.documentElement;
    target.classList.add('vilify-loading');

    // Create loading overlay as soon as we can
    function createOverlay() {
      if (document.getElementById('vilify-loading-overlay')) return;
      
      const overlay = document.createElement('div');
      overlay.id = 'vilify-loading-overlay';
      
      // Use DOM methods instead of innerHTML (YouTube uses Trusted Types)
      const logo = document.createElement('div');
      logo.className = 'vilify-loading-logo';
      
      const spinner = document.createElement('div');
      spinner.className = 'vilify-loading-spinner';
      
      const text = document.createElement('div');
      text.className = 'vilify-loading-text';
      text.textContent = 'Loading...';
      
      overlay.appendChild(logo);
      overlay.appendChild(spinner);
      overlay.appendChild(text);
      
      // Append to body if available, otherwise wait
      if (document.body) {
        document.body.appendChild(overlay);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          document.body.appendChild(overlay);
          document.body.classList.add('vilify-loading');
        }, { once: true });
      }
    }

    createOverlay();
  }

  function hideLoadingScreen() {
    const overlay = document.getElementById('vilify-loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      // Remove after transition
      setTimeout(() => overlay.remove(), 300);
    }
    document.body?.classList.remove('vilify-loading');
    document.documentElement.classList.remove('vilify-loading');
  }

  // Inject loading screen immediately (runs at document-start)
  injectLoadingScreen();

  // ============================================
  // Styles - TUI Theme (Solarized Dark BG + YouTube Colors)
  // ============================================
  // Uses Solarized Dark backgrounds for that nice dark blue-green,
  // but with brighter YouTube-style text (white/gray) and red accents.
  // ============================================
  const CSS = `
    :root {
      /* Solarized Dark - Background layers */
      --bg-1: #002b36;            /* Base03 - Main background */
      --bg-2: #073642;            /* Base02 - Panels, cards */
      --bg-3: #0a4a5c;            /* Lighter - Borders, hover */
      
      /* YouTube-style text hierarchy (brighter than pure Solarized) */
      --txt-1: #f1f1f1;           /* Primary text - near white */
      --txt-2: #aaaaaa;           /* Body text - light gray */
      --txt-3: #717171;           /* Secondary, muted */
      --txt-4: #3ea6ff;           /* YouTube blue - links, labels */
      
      /* YouTube accent colors */
      --yt-red: #ff0000;          /* Pure YouTube red */
      --yt-red-hover: #cc0000;    /* Darker red for hover */
      --txt-accent: var(--txt-4); /* Blue for links */
      --txt-num: #f1f1f1;         /* Numbers in white */
      --txt-err: var(--yt-red);   /* Errors in red */
      
      /* Legacy mappings for compatibility */
      --bg-primary: var(--bg-1);
      --bg-secondary: var(--bg-2);
      --bg-hover: var(--bg-3);
      --text-primary: var(--txt-1);
      --text-secondary: var(--txt-3);
      --text-emphasis: var(--txt-1);
      --border: var(--bg-3);
      --accent: var(--yt-red);
      --accent-hover: var(--yt-red-hover);
      --accent-alt: var(--txt-4);
      --selection: var(--yt-red);
      --error: var(--yt-red);
      
      /* Font - Monospace for TUI aesthetic */
      --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
      --font-main: var(--font-mono);
    }

    /* ====== Shared Modal Base Classes (TUI Style) ====== */
    .vilify-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      align-items: flex-start;
      justify-content: center;
      padding-top: 15vh;
      z-index: 9999999;
      font-family: var(--font-mono);
      font-size: 14px;
      line-height: 1.5;
    }

    .vilify-overlay.open {
      display: flex;
    }

    .vilify-modal {
      position: relative;
      max-width: 90vw;
      max-height: 70vh;
      background: var(--bg-1);
      border: 2px solid var(--bg-3);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .vilify-modal-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--bg-3);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .vilify-modal-title {
      font-size: 14px;
      font-weight: 400;
      color: var(--txt-2);
    }

    .vilify-modal-input-wrapper {
      padding: 12px 16px;
      border-bottom: 1px solid var(--bg-3);
    }

    .vilify-modal-input {
      width: 100%;
      padding: 8px 0;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--bg-3);
      font-size: 14px;
      font-family: var(--font-mono);
      color: var(--txt-1);
      outline: none;
      box-sizing: border-box;
    }

    .vilify-modal-input:focus {
      border-bottom-color: var(--txt-3);
    }

    .vilify-modal-input::placeholder {
      color: var(--txt-4);
    }

    .vilify-modal-list {
      flex: 1;
      overflow-y: auto;
      max-height: 400px;
      scrollbar-width: thin;
      scrollbar-color: var(--bg-3) transparent;
    }

    .vilify-modal-list::-webkit-scrollbar {
      width: 6px;
    }

    .vilify-modal-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .vilify-modal-list::-webkit-scrollbar-thumb {
      background: var(--bg-3);
    }

    .vilify-modal-footer {
      display: flex;
      gap: 16px;
      padding: 12px 16px;
      border-top: 1px solid var(--bg-3);
      font-size: 12px;
      color: var(--txt-3);
    }

    .vilify-modal-footer kbd {
      background: transparent;
      border: 1px solid var(--bg-3);
      padding: 1px 5px;
      margin: 0 4px;
      font-size: 11px;
      font-family: var(--font-mono);
    }

    .vilify-modal-empty {
      padding: 40px;
      text-align: center;
      color: var(--txt-3);
      font-size: 14px;
    }

    /* Hide YouTube UI when focus mode is active */
    body.vilify-focus-mode ytd-app {
      visibility: hidden !important;
    }

    /* Base player visibility for non-watch pages */
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
    
    /* On watch page, make player and ALL its ancestors visible */
    body.vilify-focus-mode.vilify-watch-page ytd-watch-flexy {
      visibility: visible !important;
    }
    
    body.vilify-focus-mode.vilify-watch-page ytd-watch-flexy > * {
      visibility: hidden !important;
    }
    
    body.vilify-focus-mode.vilify-watch-page #player-container,
    body.vilify-focus-mode.vilify-watch-page #player-container-outer,
    body.vilify-focus-mode.vilify-watch-page #player-container-inner,
    body.vilify-focus-mode.vilify-watch-page #player,
    body.vilify-focus-mode.vilify-watch-page #movie_player,
    body.vilify-focus-mode.vilify-watch-page #movie_player * {
      visibility: visible !important;
    }

    /* Prevent scrolling on YouTube's hidden content */
    body.vilify-focus-mode {
      overflow: hidden !important;
    }

    /* ====== Focus Mode Overlay (TUI Style) ====== */
    #vilify-focus {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: var(--bg-1);
      font-family: var(--font-mono);
      color: var(--txt-2);
      display: flex;
      flex-direction: column;
      visibility: visible !important;
    }

    .vilify-header {
      height: 48px;
      padding: 0 24px;
      border-bottom: 2px solid var(--bg-3);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      box-sizing: border-box;
    }

    .vilify-logo {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .vilify-logo-icon {
      width: 90px;
      height: 20px;
      /* Solarized red (#dc322f) for the play button */
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 20"><path fill="%23dc322f" d="M27.973 18.652c-.322.964-.994 1.723-1.858 2.099C23.835 21.6 15 21.6 15 21.6s-8.835 0-11.115-.849c-.864-.376-1.536-1.135-1.858-2.099C1.2 16.432 1.2 12 1.2 12s0-4.432.827-6.652c.322-.964.994-1.723 1.858-2.099C6.165 2.4 15 2.4 15 2.4s8.835 0 11.115.849c.864.376 1.536 1.135 1.858 2.099.827 2.22.827 6.652.827 6.652s0 4.432-.827 6.652z" transform="translate(0,-2)"/><path fill="%23FFF" d="M12 15.6l7.2-4.8L12 6v9.6z" transform="translate(0,-2)"/><text x="32" y="15" fill="%2393a1a1" font-family="Arial,sans-serif" font-size="14" font-weight="bold">YouTube</text></svg>') no-repeat center;
      background-size: contain;
    }

    .vilify-mode {
      color: var(--txt-3);
      font-size: 12px;
    }

    .vilify-filter-wrapper,
    .vilify-search-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--txt-4);
      font-size: 14px;
    }

    .vilify-filter-wrapper.hidden,
    .vilify-search-wrapper.hidden {
      display: none;
    }

    #vilify-filter,
    #vilify-search {
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--bg-3);
      color: var(--txt-1);
      font-family: var(--font-mono);
      font-size: 14px;
      padding: 4px 8px;
      width: 300px;
      outline: none;
    }

    #vilify-filter:focus,
    #vilify-search:focus {
      border-bottom-color: var(--txt-3);
    }

    #vilify-filter::placeholder,
    #vilify-search::placeholder {
      color: var(--txt-3);
    }

    #vilify-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px 0;
      transition: background-color 0.15s ease-out;
      scrollbar-width: thin;
      scrollbar-color: var(--bg-3) transparent;
    }

    #vilify-content::-webkit-scrollbar {
      width: 6px;
    }

    #vilify-content::-webkit-scrollbar-track {
      background: transparent;
    }

    #vilify-content::-webkit-scrollbar-thumb {
      background: var(--bg-3);
    }

    /* Watch page: no padding, content fills space, transparent for video */
    body.vilify-watch-page #vilify-content {
      padding: 0;
      overflow: hidden;
      background: transparent;
    }

    #vilify-content.flash-end {
      background-color: var(--bg-2);
    }

    .vilify-footer {
      height: 40px;
      padding: 0 24px;
      border-top: 2px solid var(--bg-3);
      color: var(--txt-3);
      font-size: 12px;
      display: flex;
      align-items: center;
      flex-shrink: 0;
      box-sizing: border-box;
    }

    /* ====== Video Items (TUI Style) ====== */
    .vilify-video-item {
      display: flex;
      align-items: flex-start;
      padding: 12px 24px;
      cursor: pointer;
      max-width: 900px;
      margin: 0 auto;
    }

    .vilify-video-item:hover {
      background: var(--bg-2);
    }

    .vilify-video-item.selected {
      background: var(--bg-2);
      outline: 2px solid var(--yt-red);
      outline-offset: -2px;
    }

    .vilify-thumb-wrapper {
      width: 200px;
      height: 113px;
      margin-right: 16px;
      flex-shrink: 0;
      overflow: hidden;
      background: var(--bg-2);
      border: 1px solid var(--bg-3);
    }

    .vilify-video-item.selected .vilify-thumb-wrapper {
      border-color: var(--yt-red);
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
      color: var(--txt-2);
      margin-bottom: 4px;
      font-size: 14px;
      font-weight: 400;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .vilify-video-item.selected .vilify-video-title {
      color: var(--txt-1);
    }

    .vilify-video-meta {
      color: var(--txt-3);
      font-size: 12px;
    }

    .vilify-empty {
      padding: 40px;
      text-align: center;
      color: var(--txt-3);
      font-size: 14px;
    }

    /* Watch page - sidebar layout: overlay only covers sidebar, not video */
    body.vilify-focus-mode.vilify-watch-page #vilify-focus {
      left: auto;
      right: 0;
      width: 350px;
      background: var(--bg-1);
      border-left: 2px solid var(--bg-3);
    }
    
    /* Header spans full width on watch page, positioned separately */
    body.vilify-focus-mode.vilify-watch-page .vilify-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      width: 100%;
      z-index: 10001;
      background: var(--bg-1);
    }
    
    /* Footer spans full width on watch page */
    body.vilify-focus-mode.vilify-watch-page .vilify-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      z-index: 10001;
      background: var(--bg-1);
    }
    
    /* Adjust content area to account for fixed header */
    body.vilify-focus-mode.vilify-watch-page #vilify-content {
      margin-top: 48px;
      margin-bottom: 40px;
      height: calc(100vh - 48px - 40px);
      display: flex;
      flex-direction: column;
    }

    body.vilify-focus-mode.vilify-watch-page #movie_player {
      position: fixed !important;
      top: 48px !important;  /* below header */
      left: 0 !important;
      width: calc(100% - 350px) !important;
      height: calc(100vh - 48px - 40px) !important;  /* viewport minus header and footer */
      z-index: 10000 !important;  /* between header/footer (10001) and sidebar overlay */
      visibility: visible !important;
    }
    
    /* Ensure video element and all player internals are visible */
    body.vilify-focus-mode.vilify-watch-page #movie_player,
    body.vilify-focus-mode.vilify-watch-page #movie_player * {
      visibility: visible !important;
    }

    .vilify-watch-layout {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .vilify-watch-sidebar {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--bg-1);
      overflow: hidden;
    }

    /* ====== Watch Page Info Panel (TUI Style) ====== */
    .vilify-watch-info {
      position: relative;
      padding: 16px 16px 12px;
      border: 2px solid var(--bg-3);
      margin: 12px;
      flex-shrink: 0;
    }

    /* Panel label */
    .vilify-watch-info::before {
      content: 'video';
      position: absolute;
      top: -10px;
      left: 10px;
      background: var(--bg-1);
      color: var(--txt-3);
      padding: 0 6px;
      font-size: 12px;
    }

    .vilify-watch-title {
      font-size: 14px;
      font-weight: 400;
      color: var(--txt-1);
      margin: 0 0 8px 0;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .vilify-channel-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .vilify-channel-name {
      color: var(--txt-2);
      font-size: 13px;
      font-weight: 400;
    }

    .vilify-subscribe-btn {
      background: transparent;
      border: 1px solid var(--txt-err);
      color: var(--txt-err);
      padding: 4px 12px;
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 400;
      cursor: pointer;
    }

    .vilify-subscribe-btn:hover {
      background: var(--txt-err);
      color: var(--bg-1);
    }

    .vilify-subscribe-btn.subscribed {
      border-color: var(--txt-3);
      color: var(--txt-3);
    }

    .vilify-subscribe-btn.subscribed:hover {
      background: var(--bg-3);
    }

    .vilify-description-hint {
      color: var(--txt-3);
      font-size: 11px;
    }

    .vilify-description-hint kbd {
      background: transparent;
      border: 1px solid var(--bg-3);
      padding: 1px 5px;
      font-size: 10px;
      margin: 0 2px;
      font-family: var(--font-mono);
    }

    /* ====== Description Modal (TUI Style) ====== */
    #vilify-desc-overlay {
      padding-top: 10vh;
    }

    #vilify-desc-modal {
      position: relative;
      width: 700px;
      max-height: 80vh;
    }

    #vilify-desc-modal::before {
      content: 'description';
      position: absolute;
      top: -10px;
      left: 12px;
      background: var(--bg-1);
      color: var(--txt-3);
      padding: 0 6px;
      font-size: 12px;
      z-index: 1;
    }

    #vilify-desc-header {
      padding: 16px 20px;
      justify-content: space-between;
    }

    #vilify-desc-close {
      background: none;
      border: 1px solid var(--bg-3);
      color: var(--txt-3);
      font-size: 14px;
      cursor: pointer;
      padding: 2px 8px;
      font-family: var(--font-mono);
    }

    #vilify-desc-close:hover {
      border-color: var(--txt-3);
      color: var(--txt-1);
    }

    #vilify-desc-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      scrollbar-width: thin;
      scrollbar-color: var(--bg-3) transparent;
    }

    #vilify-desc-text {
      color: var(--txt-2);
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
    }

    #vilify-desc-footer {
      padding: 12px 20px;
    }

    /* ====== Comments Panel (TUI Style) ====== */
    .vilify-comments {
      position: relative;
      flex: 1;
      overflow: hidden;
      padding: 16px 16px 12px;
      margin: 12px;
      border: 2px solid var(--bg-3);
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    .vilify-comments-header {
      color: var(--txt-3);
      font-size: 12px;
      font-weight: 400;
      text-transform: lowercase;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--bg-3);
      flex-shrink: 0;
    }

    .vilify-comments-list {
      flex: 1;
      overflow: hidden;
    }

    .vilify-comment {
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--bg-3);
    }

    .vilify-comment:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .vilify-comment-author {
      color: var(--txt-accent);
      font-size: 12px;
      font-weight: 400;
      margin-bottom: 4px;
    }

    .vilify-comment-text {
      color: var(--txt-2);
      font-size: 12px;
      line-height: 1.4;
    }

    .vilify-comments-pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 10px 0 0;
      margin-top: auto;
      border-top: 1px solid var(--bg-3);
      font-size: 11px;
      color: var(--txt-3);
      flex-shrink: 0;
    }

    .vilify-comments-pagination kbd {
      background: transparent;
      border: 1px solid var(--bg-3);
      padding: 1px 5px;
      font-size: 10px;
      font-family: var(--font-mono);
    }

    .vilify-comments-page-info {
      min-width: 50px;
      text-align: center;
    }

    /* ====== Chapter Picker (TUI Style) ====== */
    #vilify-chapter-modal {
      position: relative;
      width: 500px;
    }

    #vilify-chapter-modal::before {
      content: 'chapters';
      position: absolute;
      top: -10px;
      left: 12px;
      background: var(--bg-1);
      color: var(--txt-3);
      padding: 0 6px;
      font-size: 12px;
      z-index: 1;
    }

    .vilify-chapter-item {
      display: flex;
      align-items: center;
      padding: 10px 16px;
      cursor: pointer;
      gap: 12px;
    }

    .vilify-chapter-item:hover {
      background: var(--bg-2);
    }

    .vilify-chapter-item.selected {
      background: var(--bg-2);
      outline: 2px solid var(--yt-red);
      outline-offset: -2px;
    }

    .vilify-chapter-thumb {
      width: 80px;
      height: 45px;
      background: var(--bg-3);
      object-fit: cover;
      flex-shrink: 0;
      border: 1px solid var(--bg-3);
    }

    .vilify-chapter-item.selected .vilify-chapter-thumb {
      border-color: var(--yt-red);
    }

    .vilify-chapter-info {
      flex: 1;
      min-width: 0;
    }

    .vilify-chapter-title {
      font-size: 13px;
      color: var(--txt-2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .vilify-chapter-item.selected .vilify-chapter-title {
      color: var(--txt-1);
    }

    .vilify-chapter-time {
      font-size: 12px;
      color: var(--txt-3);
      margin-top: 2px;
    }

    /* ====== Command Palette (TUI Style) ====== */
    #keyring-overlay {
      font-family: var(--font-mono);
    }

    #keyring-modal {
      position: relative;
      width: 560px;
    }

    #keyring-modal::before {
      content: 'commands';
      position: absolute;
      top: -10px;
      left: 12px;
      background: var(--bg-1);
      color: var(--txt-3);
      padding: 0 6px;
      font-size: 12px;
      z-index: 1;
    }

    #keyring-header {
      display: none;  /* Hide old header, using ::before label */
    }

    .keyring-group-label {
      padding: 16px 16px 8px;
      font-size: 12px;
      font-weight: 400;
      text-transform: lowercase;
      letter-spacing: 0;
      color: var(--txt-3);
      background: var(--bg-1);
    }

    .keyring-item {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
      color: var(--txt-2);
      background: transparent;
    }

    .keyring-item:hover {
      background: var(--bg-2);
    }

    .keyring-item.selected {
      background: var(--bg-2);
      outline: 2px solid var(--yt-red);
      outline-offset: -2px;
    }

    .keyring-item.selected .keyring-label {
      color: var(--txt-1);
    }

    .keyring-item.selected .keyring-shortcut kbd {
      border-color: var(--txt-3);
      color: var(--txt-1);
    }

    .keyring-item.selected .keyring-meta {
      color: var(--txt-2);
    }

    /* Terminal-style icon prefix */
    .keyring-icon {
      width: auto;
      margin-right: 8px;
      font-size: 14px;
      color: var(--txt-3);
      background: transparent;
    }

    .keyring-icon::before {
      content: '>';
    }

    /* Hide emoji, show prefix */
    .keyring-icon:not(:empty)::before {
      content: none;
    }

    .keyring-item.selected .keyring-icon {
      color: var(--yt-red);
    }

    .keyring-thumbnail {
      width: 80px;
      height: 45px;
      margin-right: 12px;
      background: var(--bg-2);
      object-fit: cover;
      flex-shrink: 0;
      border: 1px solid var(--bg-3);
    }

    .keyring-item.selected .keyring-thumbnail {
      border-color: var(--yt-red);
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
      color: var(--txt-3);
      margin-left: 8px;
    }

    .keyring-shortcut {
      margin-left: 12px;
      display: flex;
      gap: 4px;
    }

    .keyring-shortcut kbd {
      background: transparent;
      border: 1px solid var(--bg-3);
      padding: 2px 6px;
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--txt-3);
    }

    #keyring-footer {
      gap: 16px;
    }

    #keyring-footer kbd {
      background: transparent;
    }

    /* ====== Toast Notifications (TUI Style) ====== */
    .keyring-toast {
      position: fixed;
      bottom: 32px;
      right: 32px;
      background: var(--bg-2);
      color: var(--txt-2);
      padding: 12px 20px;
      border: 2px solid var(--bg-3);
      font-size: 14px;
      font-weight: 400;
      font-family: var(--font-mono);
      z-index: 10000000;
      opacity: 0;
      transition: opacity 0.2s;
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
  // Selectors Registry
  // ============================================
  const SELECTORS = {
    watch: {
      title: [
        'h1.ytd-watch-metadata yt-formatted-string',
        'h1.ytd-watch-metadata',
        '#title h1 yt-formatted-string',
        '#title h1',
        'ytd-watch-metadata h1',
        'h1.ytd-video-primary-info-renderer',
        '#info-contents h1 yt-formatted-string',
        'yt-formatted-string.ytd-watch-metadata'
      ],
      channel: [
        'ytd-video-owner-renderer #channel-name a',
        'ytd-video-owner-renderer ytd-channel-name a',
        'ytd-video-owner-renderer #channel-name yt-formatted-string a',
        '#owner #channel-name a',
        '#owner ytd-channel-name a',
        '#channel-name a',
        'ytd-channel-name#channel-name a',
        '#upload-info #channel-name a',
        '#top-row ytd-video-owner-renderer a.yt-simple-endpoint'
      ],
      subscribeButton: [
        'ytd-subscribe-button-renderer button',
        '#subscribe-button button',
        'ytd-video-owner-renderer ytd-subscribe-button-renderer button',
        '#owner ytd-subscribe-button-renderer button'
      ],
      likeButton: [
        'like-button-view-model button',
        '#segmented-like-button button'
      ],
      description: [
        'ytd-watch-metadata #description-inner',
        'ytd-watch-metadata ytd-text-inline-expander',
        '#description ytd-text-inline-expander',
        '#description-inner',
        'ytd-text-inline-expander#description-inline-expander',
        '#description .content',
        'ytd-expandable-video-description-body-renderer #description-inner',
        '#description yt-attributed-string'
      ]
    },
    listing: {
      newLayout: 'yt-lockup-view-model',
      oldLayout: [
        'ytd-rich-item-renderer',
        'ytd-video-renderer',
        'ytd-compact-video-renderer',
        'ytd-grid-video-renderer',
        'ytd-playlist-video-renderer'
      ],
      thumbnailLink: 'a.yt-lockup-view-model__content-image',
      titleLink: 'a.yt-lockup-metadata-view-model__title',
      channelNew: [
        '.yt-content-metadata-view-model-wiz__metadata-text',
        '.yt-content-metadata-view-model__metadata-text',
        '.yt-content-metadata-view-model__metadata span.yt-core-attributed-string',
        'ytd-channel-name a',
        '#channel-name a',
        '.ytd-channel-name'
      ],
      channelOld: [
        '#channel-name #text',
        '#channel-name a',
        '.ytd-channel-name a',
        '#text.ytd-channel-name',
        'ytd-channel-name #text-container',
        '[itemprop="author"] [itemprop="name"]'
      ],
      videoLink: 'a#video-title-link, a#video-title, a.ytd-thumbnail',
      videoTitle: '#video-title'
    },
    comments: {
      thread: [
        'ytd-comment-thread-renderer',
        'ytd-comment-view-model',
        'ytd-comment-renderer'
      ],
      author: [
        '#author-text',
        '#author-text span',
        'a#author-text',
        '.ytd-comment-view-model #author-text',
        '#header-author #author-text',
        'h3 a'
      ],
      content: [
        '#content-text',
        '#content-text span',
        'yt-attributed-string#content-text',
        '.ytd-comment-view-model #content-text',
        '#comment-content #content-text'
      ]
    }
  };

  /**
   * Query the first matching element from a list of selectors
   * @param {string[]} selectors - Array of CSS selectors to try
   * @param {Element} [context=document] - Context element to query within
   * @returns {Element|null} - First matching element or null
   */
  function queryFirst(selectors, context = document) {
    for (const sel of selectors) {
      const el = context.querySelector(sel);
      if (el?.textContent?.trim()) return el;
    }
    return null;
  }

  /**
   * Query the first matching element (without text content check)
   * @param {string[]} selectors - Array of CSS selectors to try
   * @param {Element} [context=document] - Context element to query within
   * @returns {Element|null} - First matching element or null
   */
  function queryFirstEl(selectors, context = document) {
    for (const sel of selectors) {
      const el = context.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

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
    const titleEl = queryFirst(SELECTORS.watch.title);
    if (titleEl) {
      ctx.title = titleEl.textContent.trim();
    }

    // Get channel name
    const channelEl = queryFirst(SELECTORS.watch.channel);
    if (channelEl) {
      ctx.channelName = channelEl.textContent.trim();
      ctx.channelUrl = channelEl.href;
    }

    // Check if subscribed
    const subButton = queryFirstEl(SELECTORS.watch.subscribeButton);
    if (subButton) {
      const label = subButton.getAttribute('aria-label') || '';
      ctx.isSubscribed = label.toLowerCase().includes('unsubscribe');
    }

    // Get like button state
    const likeButton = queryFirstEl(SELECTORS.watch.likeButton);
    if (likeButton) {
      ctx.isLiked = likeButton.getAttribute('aria-pressed') === 'true';
    }

    return ctx;
  }



  // ============================================
  // YouTube DOM Polling
  // ============================================
  // Unified polling system to detect when YouTube has finished loading content.
  // Instead of fragile "wait for stability" heuristics, we poll periodically
  // and check for YouTube's loading indicators.
  
  const POLL_INTERVAL_MS = 200;
  let pollTimer = null;
  let lastVideoCount = 0;
  let lastPollTime = 0;
  
  /**
   * Check if YouTube is currently loading content
   * Returns true if loading indicators are present
   */
  function isYouTubeLoading() {
    // Check for continuation/loading spinners
    const hasSpinner = !!document.querySelector(
      'ytd-continuation-item-renderer, ' +
      'tp-yt-paper-spinner, ' +
      '#spinner, ' +
      'ytd-ghost-grid-renderer, ' +  // Skeleton placeholders
      'ytd-rich-grid-renderer[is-loading], ' +
      '.ytd-ghost-grid-renderer'
    );
    
    // Check for skeleton/placeholder items (empty video cards loading)
    const skeletons = document.querySelectorAll(
      'ytd-rich-item-renderer:empty, ' +
      'ytd-video-renderer:empty, ' +
      '#contents > .ytd-item-section-renderer:empty'
    );
    
    return hasSpinner || skeletons.length > 0;
  }
  
  /**
   * Get current video count from YouTube's DOM
   * Counts all video-like elements across different page layouts
   */
  function getYouTubeVideoCount() {
    const elements = document.querySelectorAll(
      'ytd-rich-item-renderer, ' +
      'ytd-video-renderer, ' +
      'ytd-compact-video-renderer, ' +
      'ytd-grid-video-renderer, ' +
      'ytd-playlist-video-renderer, ' +
      'yt-lockup-view-model'
    );
    return elements.length;
  }
  
  /**
   * Start polling for content changes
   * Calls onUpdate whenever new content is detected
   */
  function startContentPolling(onUpdate) {
    stopContentPolling();
    
    lastVideoCount = 0;
    lastPollTime = Date.now();
    
    function poll() {
      const pageType = getPageType();
      
      // On watch pages, don't poll for videos
      if (pageType === 'watch') {
        stopContentPolling();
        return;
      }
      
      const currentCount = getYouTubeVideoCount();
      const isLoading = isYouTubeLoading();
      
      // If video count changed and not currently loading, update
      if (currentCount !== lastVideoCount && !isLoading) {
        lastVideoCount = currentCount;
        if (currentCount > 0) {
          onUpdate();
        }
      }
      
      // Also update if we have videos and haven't updated in a while (fallback)
      // This catches cases where loading indicators disappear but count didn't change
      if (currentCount > 0 && !isLoading && Date.now() - lastPollTime > 1000) {
        lastPollTime = Date.now();
        // Only call onUpdate if this is truly new content
        const currentScrapedCount = document.querySelectorAll('.vilify-video-item').length;
        if (currentCount > currentScrapedCount) {
          onUpdate();
        }
      }
      
      pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
    }
    
    poll();
  }
  
  function stopContentPolling() {
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  }
  
  /**
   * Wait for YouTube to finish initial content load
   * Resolves when content is available and not loading
   */
  function waitForYouTubeContent(maxWait = 5000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      function check() {
        const pageType = getPageType();
        
        // On watch page, wait for video player
        if (pageType === 'watch') {
          const hasPlayer = document.querySelector('#movie_player video');
          if (hasPlayer) {
            resolve();
            return;
          }
        } else {
          // On listing pages, wait for videos and no loading indicators
          const videoCount = getYouTubeVideoCount();
          const isLoading = isYouTubeLoading();
          
          if (videoCount > 0 && !isLoading) {
            resolve();
            return;
          }
        }
        
        // Timeout fallback
        if (Date.now() - startTime >= maxWait) {
          resolve();
          return;
        }
        
        setTimeout(check, POLL_INTERVAL_MS);
      }
      
      check();
    });
  }

  // ============================================
  // Video Scraping
  // ============================================
  // No caching - always scrape fresh to avoid stale data races
  
  function scrapeVideos() {
    const videos = [];
    const seen = new Set();
    
    /**
     * Helper to add a video if not already seen
     */
    function addVideo(videoId, title, channelName) {
      if (seen.has(videoId)) return;
      seen.add(videoId);
      videos.push({
        type: 'video',
        videoId,
        title,
        channelName,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        url: `/watch?v=${videoId}`
      });
    }
    
    /**
     * Extract video ID from a URL
     */
    function extractVideoId(url) {
      if (!url) return null;
      const match = url.match(/\/watch\?v=([^&]+)/);
      return match ? match[1] : null;
    }

    // Strategy 1: New YouTube layout (yt-lockup-view-model)
    const newLayoutElements = document.querySelectorAll(SELECTORS.listing.newLayout);
    for (const el of newLayoutElements) {
      const thumbLink = el.querySelector(SELECTORS.listing.thumbnailLink);
      const videoId = extractVideoId(thumbLink?.href);
      if (!videoId) continue;

      const titleLink = el.querySelector(SELECTORS.listing.titleLink);
      const title = titleLink?.textContent?.trim();
      if (!title) continue;

      const channelEl = queryFirst(SELECTORS.listing.channelNew, el);
      const channelName = channelEl?.textContent?.trim() || '';

      addVideo(videoId, title, channelName);
    }

    // Strategy 2: Old layout selectors (always try, not just fallback)
    const oldElements = document.querySelectorAll(SELECTORS.listing.oldLayout.join(','));
    for (const el of oldElements) {
      const link = el.querySelector(SELECTORS.listing.videoLink);
      const videoId = extractVideoId(link?.href);
      if (!videoId) continue;

      const titleEl = el.querySelector(SELECTORS.listing.videoTitle);
      const title = titleEl?.textContent?.trim();
      if (!title) continue;

      const channelEl = queryFirst(SELECTORS.listing.channelOld, el);
      const channelName = channelEl?.textContent?.trim() || '';

      addVideo(videoId, title, channelName);
    }
    
    // Strategy 3: Search results - ytd-video-renderer with different structure
    // Search pages use ytd-video-renderer but with slightly different internal structure
    const searchVideoElements = document.querySelectorAll('ytd-video-renderer');
    for (const el of searchVideoElements) {
      // Try multiple ways to find the video link
      const link = el.querySelector('a#video-title') || 
                   el.querySelector('a.ytd-thumbnail') ||
                   el.querySelector('a[href*="/watch?v="]');
      const videoId = extractVideoId(link?.href);
      if (!videoId) continue;

      // Try multiple ways to find the title
      const titleEl = el.querySelector('#video-title') ||
                      el.querySelector('h3 a') ||
                      el.querySelector('yt-formatted-string#video-title');
      const title = titleEl?.textContent?.trim();
      if (!title) continue;

      // Channel name
      const channelEl = el.querySelector('ytd-channel-name a') ||
                        el.querySelector('#channel-name a') ||
                        el.querySelector('.ytd-channel-name');
      const channelName = channelEl?.textContent?.trim() || '';

      addVideo(videoId, title, channelName);
    }
    
    // Strategy 4: Playlist renderers (for playlist pages and search results)
    const playlistVideoElements = document.querySelectorAll('ytd-playlist-video-renderer');
    for (const el of playlistVideoElements) {
      const link = el.querySelector('a#video-title') ||
                   el.querySelector('a[href*="/watch?v="]');
      const videoId = extractVideoId(link?.href);
      if (!videoId) continue;

      const titleEl = el.querySelector('#video-title');
      const title = titleEl?.textContent?.trim();
      if (!title) continue;

      const channelEl = el.querySelector('#channel-name a') ||
                        el.querySelector('ytd-channel-name a');
      const channelName = channelEl?.textContent?.trim() || '';

      addVideo(videoId, title, channelName);
    }
    
    // Strategy 5: Generic fallback - find any link to a video with a title nearby
    // This catches edge cases we might have missed
    if (videos.length === 0) {
      const allVideoLinks = document.querySelectorAll('a[href*="/watch?v="]');
      for (const link of allVideoLinks) {
        const videoId = extractVideoId(link.href);
        if (!videoId) continue;
        
        // Look for a title in the link itself or nearby
        const title = link.textContent?.trim() ||
                      link.getAttribute('title') ||
                      link.closest('[class*="renderer"]')?.querySelector('#video-title, h3, [id*="title"]')?.textContent?.trim();
        if (!title || title.length < 3) continue;
        
        // Skip if this looks like a channel link or other non-video link
        if (link.href.includes('/channel/') || link.href.includes('/@')) continue;
        
        addVideo(videoId, title, '');
      }
    }

    return videos;
  }

  function getVideoDescription() {
    const descEl = queryFirst(SELECTORS.watch.description);
    return descEl?.textContent?.trim() || '';
  }

  function scrapeComments() {
    const comments = [];
    
    // Find comment elements using selector list
    let commentEls = [];
    for (const sel of SELECTORS.comments.thread) {
      commentEls = document.querySelectorAll(sel);
      if (commentEls.length > 0) break;
    }
    
    for (const el of Array.from(commentEls)) {
      const authorEl = queryFirst(SELECTORS.comments.author, el);
      const contentEl = queryFirst(SELECTORS.comments.content, el);
      
      const author = authorEl?.textContent?.trim() || '';
      const text = contentEl?.textContent?.trim() || '';
      
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
    const seenKeys = new Set();
    
    function addChapter(title, time, timeText, thumbnailUrl) {
      // Deduplicate by title + time combination
      const key = `${title}::${Math.round(time)}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      chapters.push({ title, time, timeText, thumbnailUrl });
    }
    
    // Method 1: From chapter markers in progress bar
    const chapterMarkers = document.querySelectorAll('.ytp-chapter-hover-container');
    for (const marker of chapterMarkers) {
      const title = marker.querySelector('.ytp-chapter-title')?.textContent?.trim();
      const timeText = marker.dataset.startTime || marker.getAttribute('data-start-time');
      if (title && timeText) {
        addChapter(title, parseFloat(timeText), null, null);
      }
    }
    
    // Method 2: From description chapters panel (ytd-macro-markers-list-item-renderer)
    const chapterItems = document.querySelectorAll('ytd-macro-markers-list-item-renderer');
    for (const item of chapterItems) {
      const titleEl = item.querySelector('#details h4, #title');
      const timeEl = item.querySelector('#time, #details #time');
      const thumbEl = item.querySelector('img');
      
      if (titleEl && timeEl) {
        const timeText = timeEl.textContent.trim();
        const time = parseTimestamp(timeText);
        addChapter(titleEl.textContent.trim(), time, timeText, thumbEl?.src || null);
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
  // Description Modal (zo/zc)
  // ============================================
  let descOverlay = null;

  function createDescriptionModal() {
    if (descOverlay) return;

    const closeBtn = button({ id: 'vilify-desc-close', textContent: '×' });
    closeBtn.addEventListener('click', closeDescriptionModal);

    const modal = div({ id: 'vilify-desc-modal', className: 'vilify-modal' }, [
      div({ id: 'vilify-desc-header', className: 'vilify-modal-header' }, [
        span({ id: 'vilify-desc-title', className: 'vilify-modal-title', textContent: 'Description' }),
        closeBtn
      ]),
      div({ id: 'vilify-desc-content' }, [div({ id: 'vilify-desc-text' })]),
      div({ id: 'vilify-desc-footer', className: 'vilify-modal-footer' }, [
        'Press ', createElement('kbd', { textContent: 'zc' }), ' or ',
        createElement('kbd', { textContent: 'Esc' }), ' to close'
      ])
    ]);

    descOverlay = div({ id: 'vilify-desc-overlay', className: 'vilify-overlay' }, [modal]);
    descOverlay.addEventListener('click', e => {
      if (e.target === descOverlay) closeDescriptionModal();
    });
    document.body.appendChild(descOverlay);
  }

  function openDescriptionModal() {
    if (getPageType() !== 'watch') {
      showToast('No description on this page');
      return;
    }

    const description = getVideoDescription();
    if (!description) {
      showToast('No description available');
      return;
    }

    if (!descOverlay) createDescriptionModal();
    
    const textEl = document.getElementById('vilify-desc-text');
    if (textEl) textEl.textContent = description;
    
    descOverlay.classList.add('open');
  }

  function closeDescriptionModal() {
    if (descOverlay) {
      descOverlay.classList.remove('open');
    }
  }

  const isDescriptionModalOpen = () => isOverlayOpen(descOverlay);

  // Aliases for command palette and key sequences
  const toggleDescriptionOpen = openDescriptionModal;
  const toggleDescriptionClose = closeDescriptionModal;

  let watchPageRetryCount = 0;
  const WATCH_PAGE_MAX_RETRIES = 10;
  const WATCH_PAGE_RETRY_DELAY = 500;

  function renderWatchPage() {
    const content = document.getElementById('vilify-content');
    if (!content) return;
    
    clearElement(content);
    
    const ctx = getVideoContext();
    
    // If no context or missing critical data, retry
    if (!ctx || (!ctx.title && !ctx.channelName)) {
      if (watchPageRetryCount < WATCH_PAGE_MAX_RETRIES) {
        watchPageRetryCount++;
        content.appendChild(div({ className: 'vilify-empty', textContent: 'Loading video info...' }));
        setTimeout(renderWatchPage, WATCH_PAGE_RETRY_DELAY);
        return;
      }
    }
    
    // Reset retry count on successful render
    watchPageRetryCount = 0;
    
    if (!ctx) {
      content.appendChild(div({ className: 'vilify-empty', textContent: 'Could not load video info' }));
      return;
    }
    
    // Create sidebar layout (entire overlay is the sidebar on watch page)
    const sidebar = div({ className: 'vilify-watch-sidebar' });
    
    // Video info section
    const subBtn = button({ 
      className: ctx.isSubscribed ? 'vilify-subscribe-btn subscribed' : 'vilify-subscribe-btn',
      textContent: ctx.isSubscribed ? 'Subscribed' : 'Subscribe'
    });
    subBtn.addEventListener('click', () => {
      const ytSubBtn = document.querySelector('ytd-subscribe-button-renderer button, #subscribe-button button');
      if (ytSubBtn) ytSubBtn.click();
    });
    
    const videoInfo = div({ className: 'vilify-watch-info' }, [
      createElement('h1', { className: 'vilify-watch-title', textContent: ctx.title || 'Untitled' }),
      div({ className: 'vilify-channel-row' }, [
        span({ className: 'vilify-channel-name', textContent: ctx.channelName || 'Unknown channel' }),
        subBtn
      ]),
      div({ className: 'vilify-description-hint' }, [
        createElement('kbd', { textContent: 'zo' }), ' description  ',
        createElement('kbd', { textContent: 'f' }), ' chapters'
      ])
    ]);
    
    sidebar.appendChild(videoInfo);
    
    // Comments section - build structure first, populate after DOM ready
    const commentsList = div({ className: 'vilify-comments-list' });
    const paginationEl = div({ 
      className: 'vilify-comments-pagination',
      style: 'display: none'
    }, [
      createElement('kbd', { textContent: 'ctrl+b' }),
      span({ className: 'vilify-comments-page-info', textContent: '1 / 1' }),
      createElement('kbd', { textContent: 'ctrl+f' })
    ]);
    
    const commentsSection = div({ className: 'vilify-comments' }, [
      div({ className: 'vilify-comments-header', textContent: 'Comments' }),
      commentsList,
      paginationEl
    ]);
    
    sidebar.appendChild(commentsSection);
    content.appendChild(sidebar);
    
    // Now that DOM is ready, populate comments with proper height calculation
    const comments = scrapeComments();
    commentPage = 0;
    commentPageStarts = [0];
    
    if (comments.length === 0) {
      commentsList.appendChild(div({ className: 'vilify-empty', textContent: 'Loading comments...' }));
      setupCommentObserver();
    } else {
      // Use updateCommentsUI which calculates proper pagination based on height
      updateCommentsUI(comments);
    }
  }

  let commentObserver = null;
  let commentLoadAttempts = 0;
  const MAX_COMMENT_LOAD_ATTEMPTS = 5;
  
  // Comment pagination state
  let commentPage = 0;
  let commentPageStarts = [0]; // Array of starting indices for each page

  function setupCommentObserver() {
    if (commentObserver) return; // Already observing
    
    const commentsContainer = document.querySelector('ytd-comments, #comments');
    if (!commentsContainer) return;
    
    // Trigger YouTube to load comments by scrolling the hidden page
    triggerCommentLoad();
    
    commentObserver = new MutationObserver(() => {
      const comments = scrapeComments();
      if (comments.length > 0) {
        // Found comments, update the UI
        updateCommentsUI(comments);
        // Stop observing once we have comments
        commentObserver.disconnect();
        commentObserver = null;
      }
    });
    
    commentObserver.observe(commentsContainer, { childList: true, subtree: true });
  }

  function triggerCommentLoad() {
    // YouTube lazy-loads comments when the comments section scrolls into view
    // Since we hide the YouTube UI, we need to programmatically trigger this
    
    // Method 1: Scroll the hidden YouTube page to trigger IntersectionObserver
    const ytdApp = document.querySelector('ytd-app');
    if (ytdApp) {
      // Temporarily make it scrollable and scroll to comments area
      const originalOverflow = document.body.style.overflow;
      const commentsSection = document.querySelector('#comments, ytd-comments');
      
      if (commentsSection) {
        // Scroll the comments section into "view" (even though it's hidden)
        commentsSection.scrollIntoView({ behavior: 'instant', block: 'start' });
        
        // Also try dispatching scroll events on various containers
        const scrollContainers = [
          document.documentElement,
          document.body,
          document.querySelector('ytd-app'),
          document.querySelector('ytd-watch-flexy'),
          document.querySelector('#page-manager')
        ];
        
        scrollContainers.forEach(container => {
          if (container) {
            container.dispatchEvent(new Event('scroll', { bubbles: true }));
          }
        });
      }
    }
    
    // Method 2: If comments still haven't loaded after a delay, try clicking the comments section
    commentLoadAttempts++;
    if (commentLoadAttempts < MAX_COMMENT_LOAD_ATTEMPTS) {
      setTimeout(() => {
        const comments = scrapeComments();
        if (comments.length === 0) {
          // Try scrolling again
          triggerCommentLoad();
        } else {
          updateCommentsUI(comments);
        }
      }, 1000);
    }
  }

  function renderCommentsPage(comments, startIdx, commentsList, maxHeight) {
    // Render comments starting from startIdx until we'd overflow maxHeight
    // Returns the index of the next comment (for the next page)
    clearElement(commentsList);
    
    let i = startIdx;
    while (i < comments.length) {
      const comment = comments[i];
      const commentEl = createElement('div', { className: 'vilify-comment' }, [
        createElement('div', { className: 'vilify-comment-author', textContent: '@' + comment.author.replace(/^@/, '') }),
        createElement('div', { className: 'vilify-comment-text', textContent: comment.text })
      ]);
      commentsList.appendChild(commentEl);
      
      // Check if we've overflowed
      if (commentsList.scrollHeight > maxHeight && i > startIdx) {
        // Remove this comment - it doesn't fit
        commentsList.removeChild(commentEl);
        break;
      }
      i++;
    }
    
    return i; // Next page starts here
  }

  function updateCommentsUI(comments) {
    const commentsList = document.querySelector('.vilify-comments-list');
    const paginationEl = document.querySelector('.vilify-comments-pagination');
    if (!commentsList) return;
    
    if (comments.length === 0) {
      clearElement(commentsList);
      commentsList.appendChild(createElement('div', { 
        className: 'vilify-empty', 
        textContent: 'No comments available' 
      }));
      if (paginationEl) paginationEl.style.display = 'none';
      return;
    }
    
    // Get available height for comments list
    const commentsContainer = document.querySelector('.vilify-comments');
    const headerEl = document.querySelector('.vilify-comments-header');
    const paginationHeight = paginationEl ? paginationEl.offsetHeight : 50;
    const headerHeight = headerEl ? headerEl.offsetHeight : 30;
    const containerHeight = commentsContainer ? commentsContainer.offsetHeight : 400;
    const availableHeight = containerHeight - headerHeight - paginationHeight - 20;
    
    // Ensure we have page start for current page
    if (commentPage < 0) commentPage = 0;
    while (commentPageStarts.length <= commentPage) {
      commentPageStarts.push(0); // Will be calculated properly below
    }
    
    // Render current page and get next page start
    const startIdx = commentPageStarts[commentPage];
    const nextPageStart = renderCommentsPage(comments, startIdx, commentsList, availableHeight);
    
    // Update page starts array
    if (nextPageStart < comments.length) {
      commentPageStarts[commentPage + 1] = nextPageStart;
    }
    
    // Calculate total pages (estimate based on what we know)
    // We know exact pages up to current+1, estimate the rest
    let totalPages;
    if (nextPageStart >= comments.length) {
      // We're on or past the last page
      totalPages = commentPage + 1;
      // Trim the array
      commentPageStarts.length = totalPages;
    } else {
      // Estimate remaining pages based on average comments per page so far
      const commentsShown = nextPageStart;
      const avgPerPage = commentsShown / (commentPage + 1);
      const remainingComments = comments.length - nextPageStart;
      const estimatedRemainingPages = Math.ceil(remainingComments / avgPerPage);
      totalPages = commentPage + 1 + estimatedRemainingPages;
    }
    
    // Update pagination display
    if (paginationEl) {
      if (totalPages > 1 || commentPage > 0) {
        paginationEl.style.display = '';
        const pageInfo = paginationEl.querySelector('.vilify-comments-page-info');
        if (pageInfo) {
          pageInfo.textContent = `${commentPage + 1} / ${totalPages}`;
        }
      } else {
        paginationEl.style.display = 'none';
      }
    }
  }

  function nextCommentPage() {
    const comments = scrapeComments();
    const totalPages = commentPageStarts.length;
    
    if (commentPage < totalPages - 1) {
      commentPage++;
      updateCommentsUI(comments);
    } else {
      // At last page - try to load more comments from YouTube
      loadMoreComments();
    }
  }

  function prevCommentPage() {
    if (commentPage > 0) {
      commentPage--;
      const comments = scrapeComments();
      updateCommentsUI(comments);
    } else {
      showToast('Already at first page');
    }
  }

  function loadMoreComments() {
    if (getPageType() !== 'watch') return;
    
    showToast('Loading more comments...');
    
    // Method 1: Find and click the continuation spinner/button
    const continuationTriggers = [
      'ytd-comments ytd-continuation-item-renderer',
      'ytd-comments #continuations',
      'ytd-comments tp-yt-paper-spinner',
      '#comments ytd-continuation-item-renderer'
    ];
    
    for (const selector of continuationTriggers) {
      const el = document.querySelector(selector);
      if (el) {
        // Scroll it into view to trigger IntersectionObserver
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        // Also try clicking if it's a button
        if (el.click) el.click();
      }
    }
    
    // Method 2: Scroll the main page to trigger lazy loading
    const scrollTargets = [
      document.querySelector('ytd-comments'),
      document.querySelector('#comments'),
      document.documentElement
    ];
    
    for (const target of scrollTargets) {
      if (target) {
        // Scroll down to trigger loading
        if (target === document.documentElement) {
          window.scrollBy(0, 1000);
        } else {
          target.scrollTop += 500;
        }
      }
    }
    
    // Method 3: Dispatch scroll events to trigger observers
    const scrollEvent = new Event('scroll', { bubbles: true });
    document.dispatchEvent(scrollEvent);
    window.dispatchEvent(scrollEvent);
    
    // Check for new comments after delay
    const oldCommentCount = scrapeComments().length;
    setTimeout(() => {
      const comments = scrapeComments();
      
      if (comments.length > oldCommentCount) {
        // New comments loaded - recalculate pages first
        const oldPageCount = commentPageStarts.length;
        updateCommentsUI(comments); // This recalculates commentPageStarts
        
        // If we have more pages now, advance to next page
        if (commentPageStarts.length > oldPageCount) {
          commentPage++;
          updateCommentsUI(comments);
        }
        const totalPages = commentPageStarts.length;
        showToast(`Loaded ${comments.length - oldCommentCount} more (page ${commentPage + 1}/${totalPages})`);
      } else {
        showToast('No more comments available');
      }
    }, 2000);
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

  function toggleSubscribe() {
    const ctx = getVideoContext();
    
    if (ctx?.isSubscribed) {
      // Already subscribed - need to open dropdown and click Unsubscribe
      const notificationBtn = document.querySelector('ytd-subscribe-button-renderer button, #subscribe-button button');
      if (notificationBtn) {
        notificationBtn.click();
        // Wait for dropdown to appear, then click Unsubscribe, then confirm
        setTimeout(() => {
          // Find and click "Unsubscribe" in dropdown
          const formattedStrings = document.querySelectorAll('tp-yt-paper-listbox yt-formatted-string');
          let found = false;
          for (const el of formattedStrings) {
            if (el.textContent?.trim() === 'Unsubscribe') {
              const clickable = el.closest('tp-yt-paper-item') || el.closest('ytd-menu-service-item-renderer');
              if (clickable) {
                clickable.click();
                found = true;
                break;
              }
            }
          }
          
          // Wait for confirmation dialog and click confirm
          setTimeout(() => {
            const confirmBtn = document.querySelector('#confirm-button button, yt-confirm-dialog-renderer #confirm-button button, button[aria-label="Unsubscribe"]');
            if (confirmBtn) {
              confirmBtn.click();
              showToast('Unsubscribed');
              setTimeout(() => updateSubscribeButton(false), 500);
            } else if (!found) {
              showToast('Unsubscribe option not found');
            }
          }, 400);
        }, 400);
      }
    } else {
      // Not subscribed - click subscribe button directly
      const ytSubBtn = document.querySelector('ytd-subscribe-button-renderer button, #subscribe-button button');
      if (ytSubBtn) {
        ytSubBtn.click();
        showToast('Subscribed');
        setTimeout(() => updateSubscribeButton(true), 500);
      } else {
        showToast('Subscribe button not found');
      }
    }
  }

  function updateSubscribeButton(isSubscribed) {
    // Update our UI button directly with the known state
    const ourBtn = document.querySelector('.vilify-subscribe-btn');
    if (ourBtn) {
      ourBtn.textContent = isSubscribed ? 'Subscribed' : 'Subscribe';
      ourBtn.classList.toggle('subscribed', isSubscribed);
    }
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
      cmds.push({ label: 'Toggle mute', icon: videoCtx.muted ? '🔇' : '🔊', action: toggleMute, keys: 'Shift+M' });
      cmds.push({ label: 'Show description', icon: '📖', action: toggleDescriptionOpen, keys: 'Z O' });
      cmds.push({ label: 'Close description', icon: '📕', action: toggleDescriptionClose, keys: 'Z C' });
      cmds.push({ label: 'Next comment page', icon: '💬', action: nextCommentPage, keys: 'Ctrl+F' });
      cmds.push({ label: 'Prev comment page', icon: '💬', action: prevCommentPage, keys: 'Ctrl+B' });
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
          label: videoCtx.isSubscribed ? 'Unsubscribe' : 'Subscribe', 
          icon: videoCtx.isSubscribed ? '✓' : '⊕', 
          action: toggleSubscribe,
          keys: 'm'
        });
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
      // Subscribe (mark channel)
      sequences['m'] = toggleSubscribe;
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
      // Shift+M = toggle mute
      actions['M'] = toggleMute;
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
    clearElement(listEl);

    let idx = 0;

    for (const item of items) {
      if (item.group) {
        listEl.appendChild(div({ className: 'keyring-group-label', textContent: item.group }));
      } else {
        const isVideo = item.type === 'video';
        const children = [];

        if (isVideo) {
          children.push(img({ className: 'keyring-thumbnail', src: item.thumbnailUrl, alt: '' }));
          const metaChildren = [span({ className: 'keyring-label', textContent: item.title })];
          if (item.channelName) {
            metaChildren.push(span({ className: 'keyring-meta', textContent: item.channelName }));
          }
          children.push(div({ className: 'keyring-video-meta' }, metaChildren));
        } else {
          children.push(span({ className: 'keyring-icon', textContent: item.icon || '▸' }));
          children.push(span({ className: 'keyring-label', textContent: item.label }));
          if (item.meta) {
            children.push(span({ className: 'keyring-meta', textContent: item.meta }));
          }
          if (item.keys) {
            children.push(span({ className: 'keyring-shortcut' }, 
              item.keys.split(' ').map(k => createElement('kbd', { textContent: k }))
            ));
          }
        }

        listEl.appendChild(div({
          className: `keyring-item ${idx === selectedIdx ? 'selected' : ''}`,
          'data-idx': String(idx),
          'data-type': item.type || 'command'
        }, children));
        idx++;
      }
    }

    if (idx === 0) {
      listEl.appendChild(div({ className: 'vilify-modal-empty', textContent: 'No matching commands' }));
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
    updateListSelection(listEl, '.keyring-item', selectedIdx);
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

  // Shorthand element creators
  const div = (attrs, children) => createElement('div', attrs, children);
  const span = (attrs, children) => createElement('span', attrs, children);
  const img = (attrs) => createElement('img', attrs);
  const input = (attrs) => createElement('input', attrs);
  const button = (attrs, children) => createElement('button', attrs, children);

  // Generic list selection updater
  function updateListSelection(container, itemSelector, selectedIdx) {
    const items = container.querySelectorAll(itemSelector);
    items.forEach((el, i) => el.classList.toggle('selected', i === selectedIdx));
    const sel = container.querySelector(`${itemSelector}.selected`);
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  // Check if an overlay element is open
  const isOverlayOpen = (overlay) => overlay?.classList.contains('open');

  // Clear all children from an element
  const clearElement = (el) => { while (el.firstChild) el.removeChild(el.firstChild); };

  function createFocusOverlay() {
    if (focusOverlay) return;
    
    focusOverlay = div({ id: 'vilify-focus' });
    
    // Header with filter and search
    const header = div({ className: 'vilify-header' }, [
      div({ className: 'vilify-logo' }, [div({ className: 'vilify-logo-icon' })])
    ]);
    
    // Filter input (hidden by default)
    const filterInput = input({
      id: 'vilify-filter', type: 'text', placeholder: 'filter videos...',
      autocomplete: 'off', spellcheck: 'false'
    });
    header.appendChild(div({ className: 'vilify-filter-wrapper hidden', 'data-mode': 'filter' }, [
      span({ textContent: '/' }), filterInput
    ]));
    
    // Search input (hidden by default)
    const searchInput = input({
      id: 'vilify-search', type: 'text', placeholder: 'search youtube...',
      autocomplete: 'off', spellcheck: 'false'
    });
    header.appendChild(div({ className: 'vilify-search-wrapper hidden', 'data-mode': 'search' }, [
      span({ textContent: '?' }), searchInput
    ]));
    
    header.appendChild(span({ className: 'vilify-mode', textContent: '[/] filter  [i] search  [:] commands' }));
    
    focusOverlay.appendChild(header);
    focusOverlay.appendChild(div({ id: 'vilify-content' }));
    focusOverlay.appendChild(div({ className: 'vilify-footer', textContent: 'j/k navigate · enter select · shift+enter new tab · :q quit' }));
    
    document.body.appendChild(focusOverlay);
    
    // Event listeners
    filterInput.addEventListener('input', onFilterInput);
    filterInput.addEventListener('keydown', onFilterKeydown);
    searchInput.addEventListener('keydown', onSearchKeydown);
  }

  function toggleFilter(show) {
    const wrapper = document.querySelector('.vilify-filter-wrapper');
    const input = document.getElementById('vilify-filter');
    if (!wrapper || !input) return;
    
    filterActive = show;
    wrapper.classList.toggle('hidden', !show);
    if (show) {
      input.value = filterQuery;
      input.focus();
    } else {
      input.blur();
    }
  }

  const openFilter = () => toggleFilter(true);
  const closeFilter = () => toggleFilter(false);

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
        if (selectedIdx < items.length - 1) {
          selectedIdx++;
          updateVideoSelection();
        } else {
          flashEndOfList();
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const items = document.querySelectorAll('.vilify-video-item');
      if (items.length > 0) {
        if (selectedIdx > 0) {
          selectedIdx--;
          updateVideoSelection();
        } else {
          flashEndOfList();
        }
      }
    }
  }

  // ============================================
  // Search Input (Focus Mode)
  // ============================================
  let searchActive = false;

  function toggleSearch(show) {
    const wrapper = document.querySelector('.vilify-search-wrapper');
    const input = document.getElementById('vilify-search');
    if (!wrapper || !input) return;
    
    searchActive = show;
    wrapper.classList.toggle('hidden', !show);
    if (show) {
      input.value = '';
      input.focus();
    } else {
      input.blur();
    }
  }

  const openSearch = () => toggleSearch(true);
  const closeSearch = () => toggleSearch(false);

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

    chapterInputEl = input({
      id: 'vilify-chapter-input', className: 'vilify-modal-input', type: 'text',
      placeholder: 'Filter chapters...', autocomplete: 'off', spellcheck: 'false'
    });
    chapterListEl = div({ id: 'vilify-chapter-list', className: 'vilify-modal-list' });

    const modal = div({ id: 'vilify-chapter-modal', className: 'vilify-modal' }, [
      div({ id: 'vilify-chapter-header', className: 'vilify-modal-header' }, [
        span({ className: 'vilify-modal-title', textContent: 'Jump to Chapter' })
      ]),
      div({ className: 'vilify-modal-input-wrapper' }, [chapterInputEl]),
      chapterListEl,
      div({ className: 'vilify-modal-footer' }, [
        createFooterHint(['↑', '↓'], 'navigate'),
        createFooterHint(['↵'], 'jump'),
        createFooterHint(['esc'], 'close')
      ])
    ]);

    chapterOverlay = div({ id: 'vilify-chapter-overlay', className: 'vilify-overlay' }, [modal]);
    chapterOverlay.addEventListener('click', e => {
      if (e.target === chapterOverlay) closeChapterPicker();
    });
    chapterInputEl.addEventListener('input', onChapterInput);
    chapterInputEl.addEventListener('keydown', onChapterKeydown);
    document.body.appendChild(chapterOverlay);
  }

  // Shared footer hint creator (used by chapter picker and command palette)
  function createFooterHint(keys, label) {
    return span({}, [...keys.map(k => createElement('kbd', { textContent: k })), ' ' + label]);
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

  const isChapterPickerOpen = () => isOverlayOpen(chapterOverlay);

  function renderChapterList(filter = '') {
    clearElement(chapterListEl);

    let filtered = chapterItems;
    if (filter) {
      const q = filter.toLowerCase();
      filtered = chapterItems.filter(ch => ch.title.toLowerCase().includes(q));
    }

    if (filtered.length === 0) {
      chapterListEl.appendChild(div({
        className: 'vilify-modal-empty',
        textContent: filter ? `No chapters matching "${filter}"` : 'No chapters found'
      }));
      return;
    }

    filtered.forEach((chapter, idx) => {
      const children = [];
      if (chapter.thumbnailUrl) {
        children.push(img({ className: 'vilify-chapter-thumb', src: chapter.thumbnailUrl, alt: '' }));
      }
      children.push(div({ className: 'vilify-chapter-info' }, [
        div({ className: 'vilify-chapter-title', textContent: chapter.title }),
        div({ className: 'vilify-chapter-time', textContent: chapter.timeText || formatTimestamp(chapter.time) })
      ]));

      const item = div({
        className: `vilify-chapter-item ${idx === chapterSelectedIdx ? 'selected' : ''}`,
        'data-idx': String(idx),
        'data-time': String(chapter.time)
      }, children);

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
    updateListSelection(chapterListEl, '.vilify-chapter-item', chapterSelectedIdx);
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
    clearElement(content);
    
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
      content.appendChild(div({ className: 'vilify-empty', textContent: message }));
      return;
    }
    
    // Clamp selectedIdx to valid range
    if (selectedIdx >= filtered.length) {
      selectedIdx = Math.max(0, filtered.length - 1);
    }
    
    filtered.forEach((video, idx) => {
      const item = div({
        className: `vilify-video-item ${idx === selectedIdx ? 'selected' : ''}`,
        'data-idx': String(idx),
        'data-url': video.url
      }, [
        div({ className: 'vilify-thumb-wrapper' }, [
          img({ className: 'vilify-thumb', src: video.thumbnailUrl, alt: '' })
        ]),
        div({ className: 'vilify-video-info' }, [
          div({ className: 'vilify-video-title', textContent: video.title }),
          div({ className: 'vilify-video-meta', textContent: video.channelName || '' })
        ])
      ]);
      
      content.appendChild(item);
      
      // Event listeners
      item.addEventListener('click', () => executeVideoItem(idx, false));
      item.addEventListener('mouseenter', () => {
        selectedIdx = idx;
        updateVideoSelection();
      });
    });
    
    // Scroll selected item into view
    updateVideoSelection();
  }

  function updateVideoSelection() {
    updateListSelection(document, '.vilify-video-item', selectedIdx);
  }

  function flashEndOfList() {
    const content = document.getElementById('vilify-content');
    if (!content) return;
    content.classList.add('flash-end');
    setTimeout(() => content.classList.remove('flash-end'), 150);
  }

  /**
   * Check if the current page supports "load more" functionality.
   * Home page is excluded to prevent doomscrolling.
   */
  function supportsLoadMore() {
    const pageType = getPageType();
    // These pages support loading more videos
    return ['search', 'subscriptions', 'history', 'library', 'playlist', 'channel'].includes(pageType);
  }

  let isLoadingMoreVideos = false;

  /**
   * Trigger YouTube to load more videos by scrolling the hidden page.
   * Shows a toast and re-renders when new videos are detected.
   */
  function loadMoreVideos() {
    if (isLoadingMoreVideos) return;
    if (!supportsLoadMore()) {
      flashEndOfList();
      return;
    }

    isLoadingMoreVideos = true;
    showToast('Loading more videos...');

    const oldVideoCount = scrapeVideos().length;

    // Method 1: Find and trigger continuation elements
    const continuationTriggers = [
      'ytd-continuation-item-renderer',
      '#continuations',
      'tp-yt-paper-spinner',
      'ytd-rich-grid-renderer ytd-continuation-item-renderer',
      'ytd-section-list-renderer ytd-continuation-item-renderer'
    ];

    for (const selector of continuationTriggers) {
      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        if (el.click) el.click();
      }
    }

    // Method 2: Scroll the main page to trigger lazy loading
    const scrollTargets = [
      document.querySelector('ytd-browse'),
      document.querySelector('ytd-search'),
      document.querySelector('ytd-section-list-renderer'),
      document.querySelector('#contents'),
      document.documentElement
    ];

    for (const target of scrollTargets) {
      if (target) {
        if (target === document.documentElement) {
          window.scrollBy(0, 2000);
        } else {
          target.scrollTop += 1000;
        }
      }
    }

    // Method 3: Dispatch scroll events to trigger observers
    const scrollEvent = new Event('scroll', { bubbles: true });
    document.dispatchEvent(scrollEvent);
    window.dispatchEvent(scrollEvent);

    // Check for new videos after delay
    setTimeout(() => {
      const videos = scrapeVideos();
      isLoadingMoreVideos = false;

      if (videos.length > oldVideoCount) {
        const newCount = videos.length - oldVideoCount;
        showToast(`Loaded ${newCount} more video${newCount === 1 ? '' : 's'}`);
        // Re-render with new videos, keeping selection at the end
        selectedIdx = oldVideoCount; // Move to first new video
        renderVideoList(videos, filterQuery);
      } else {
        showToast('No more videos available');
        flashEndOfList();
      }
    }, 1500);
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
    injectStyles();

    inputEl = input({
      id: 'keyring-input', className: 'vilify-modal-input', type: 'text',
      placeholder: 'Type a command...', autocomplete: 'off', spellcheck: 'false'
    });
    listEl = div({ id: 'keyring-list', className: 'vilify-modal-list' });

    const modal = div({ id: 'keyring-modal', className: 'vilify-modal' }, [
      div({ id: 'keyring-header', className: 'vilify-modal-header' }, [
        div({ id: 'keyring-header-logo' }),
        div({ className: 'vilify-modal-title', textContent: 'Command Palette' })
      ]),
      div({ className: 'vilify-modal-input-wrapper' }, [inputEl]),
      listEl,
      div({ id: 'keyring-footer', className: 'vilify-modal-footer' }, [
        createFooterHint(['↑', '↓'], 'navigate'),
        createFooterHint(['↵'], 'select'),
        createFooterHint(['⇧↵'], 'new tab'),
        createFooterHint(['esc'], 'close')
      ])
    ]);

    overlay = div({ id: 'keyring-overlay', className: 'vilify-overlay' }, [modal]);
    overlay.addEventListener('click', e => { if (e.target === overlay) closePalette(); });
    inputEl.addEventListener('input', onInput);
    inputEl.addEventListener('keydown', onInputKeydown);
    document.body.appendChild(overlay);
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

  const isPaletteOpen = () => isOverlayOpen(overlay);

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
      if (isDescriptionModalOpen()) {
        e.preventDefault();
        closeDescriptionModal();
        return;
      }
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

    // Ctrl+f/b for comment pagination on watch page
    if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      if (e.key === 'f' || e.key === 'b') {
        if (focusModeActive && getPageType() === 'watch' && !isPaletteOpen() && !isChapterPickerOpen() && !isDescriptionModalOpen()) {
          e.preventDefault();
          if (e.key === 'f') {
            nextCommentPage();
          } else {
            prevCommentPage();
          }
          return;
        }
      }
    }

    // Vim-style sequences when palette is closed
    if (!isPaletteOpen() && !isChapterPickerOpen() && !isDescriptionModalOpen() && !isInput) {
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

      // j/k/arrow navigation in focus mode (listing pages only)
      if (focusModeActive && !isPaletteOpen() && !filterActive && getPageType() !== 'watch') {
        const items = document.querySelectorAll('.vilify-video-item');
        const count = items.length;
        if (e.key === 'j' || e.key === 'ArrowDown') {
          e.preventDefault();
          if (count > 0) {
            if (selectedIdx < count - 1) { selectedIdx++; updateVideoSelection(); }
            else { loadMoreVideos(); }
          }
          return;
        }
        if (e.key === 'k' || e.key === 'ArrowUp') {
          e.preventDefault();
          if (count > 0) {
            if (selectedIdx > 0) { selectedIdx--; updateVideoSelection(); }
            else { flashEndOfList(); }
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
    if (!focusModeActive) {
      // Still need to hide loading screen even if focus mode is disabled
      hideLoadingScreen();
      return;
    }
    
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
      // Stop polling on watch pages
      stopContentPolling();
    } else {
      document.body.classList.remove('vilify-watch-page');
      const videos = scrapeVideos();
      renderVideoList(videos);
      // Start polling for more videos loading (replaces MutationObserver approach)
      startContentPolling(onContentUpdate);
    }

    // Hide the loading screen now that our UI is ready
    hideLoadingScreen();
  }

  function exitFocusMode() {
    focusModeActive = false;
    stopContentPolling();
    document.body.classList.remove('vilify-focus-mode', 'vilify-watch-page');
    if (focusOverlay) {
      focusOverlay.remove();
      focusOverlay = null;
    }
    // Hide loading screen in case it's still visible
    hideLoadingScreen();
    showToast('Focus mode off (refresh to re-enable)');
  }

  function showLoading() {
    const content = document.getElementById('vilify-content');
    if (!content) return;
    clearElement(content);
    content.appendChild(div({ className: 'vilify-empty', textContent: 'Loading...' }));
  }

  /**
   * Handle content update from polling - re-render video list if needed
   */
  function onContentUpdate() {
    if (!focusModeActive || filterActive || searchActive) return;
    if (getPageType() === 'watch') return;
    
    const videos = scrapeVideos();
    const currentItems = document.querySelectorAll('.vilify-video-item').length;
    
    // Only re-render if we have more videos than currently displayed
    if (videos.length > currentItems) {
      renderVideoList(videos);
    }
  }

  // ============================================
  // SPA Navigation Detection
  // ============================================
  // YouTube is an SPA - detect navigation without full page loads
  let lastUrl = location.href;
  let settingsApplied = false;

  function onNavigate() {
    // Stop any existing content polling
    stopContentPolling();
    
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
    selectedIdx = 0;
    watchPageRetryCount = 0;
    commentPage = 0;
    // Clean up comment observer
    if (commentObserver) {
      commentObserver.disconnect();
      commentObserver = null;
    }
    commentLoadAttempts = 0;
    
    if (focusModeActive) {
      // Show loading in our overlay
      showLoading();
      // Wait for YouTube to finish loading, then initialize
      waitForYouTubeContent().then(() => {
        initFocusMode();
      });
    }
    console.log('[Vilify] Navigated to:', location.pathname);
  }

  // Watch for URL changes and apply settings when video is ready
  let observer = null;
  
  function setupObserver() {
    if (observer || !document.body) return;
    
    observer = new MutationObserver(() => {
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
  }

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
    setupObserver();
    // Wait for YouTube to finish loading, then initialize
    waitForYouTubeContent().then(() => {
      initFocusMode();
    });
  }

  // Run on initial load - wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[Vilify] YouTube focus mode loaded');

})();
