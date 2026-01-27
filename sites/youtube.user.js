// ==UserScript==
// @name         Vilify - YouTube (HtDP Refactor)
// @namespace    https://github.com/shihabdider/vilify
// @version      0.3.0
// @description  Vim-style command palette for YouTube, refactored using HtDP principles
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

  // =============================================================================
  // SECTION 1: DATA DEFINITIONS
  // =============================================================================

  /**
   * A Video is a structure:
   * { type: 'video', videoId: String, title: String, channelName: String,
   *   uploadDate: String, url: String, thumbnailUrl: String }
   */

  /**
   * A Command is a structure:
   * { type: 'command', label: String, icon: String, action: Function, 
   *   keys: String, meta: String, group: String }
   */

  /**
   * A Chapter is a structure:
   * { title: String, time: Number, timeText: String, thumbnailUrl: String|null }
   */

  /**
   * A Comment is a structure:
   * { author: String, text: String }
   */

  /**
   * An Item is one of:
   * - Video
   * - Command
   * - { group: String } (group header)
   */

  /**
   * A PageType is one of:
   * - 'watch'         : Video player page
   * - 'home'          : YouTube home
   * - 'search'        : Search results
   * - 'channel'       : Channel page
   * - 'playlist'      : Playlist page
   * - 'subscriptions' : Subscriptions feed
   * - 'history'       : Watch history
   * - 'library'       : Library page
   * - 'shorts'        : YouTube Shorts
   * - 'other'         : Any other page
   */

  /**
   * A ModalType is one of:
   * - null            : No modal open
   * - 'palette'       : Command palette
   * - 'chapters'      : Chapter picker
   * - 'description'   : Description modal
   */

  /**
   * WorldState is a structure:
   * {
   *   focusModeActive: Boolean,
   *   filterActive: Boolean,
   *   filterQuery: String,
   *   searchActive: Boolean,
   *   selectedIdx: Number,
   *   openModal: ModalType,
   *   paletteQuery: String,
   *   chapterQuery: String,
   *   chapterSelectedIdx: Number,
   *   commentPage: Number,
   *   commentPageStarts: Array<Number>,
   *   keySeq: String,
   *   lastUrl: String,
   *   settingsApplied: Boolean
   * }
   */

  // =============================================================================
  // SECTION 2: CONSTANTS & ASSETS
  // =============================================================================

  const CONSTANTS = {
    POLL_INTERVAL_MS: 200,
    TOAST_DURATION_MS: 2000,
    KEY_SEQ_TIMEOUT_MS: 500,
    DEFAULT_PLAYBACK_RATE: 2,
    WATCH_PAGE_MAX_RETRIES: 10,
    WATCH_PAGE_RETRY_DELAY: 500,
    MAX_COMMENT_LOAD_ATTEMPTS: 5
  };

  const LOADING_CSS = `
    body.vilify-loading ytd-app,
    body.vilify-loading #content,
    body.vilify-loading ytd-browse,
    body.vilify-loading ytd-watch-flexy,
    body.vilify-loading ytd-search {
      visibility: hidden !important;
    }
    #vilify-loading-overlay {
      position: fixed; inset: 0; z-index: 99999999; background: #002b36;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: 'Roboto', 'Arial', sans-serif;
    }
    #vilify-loading-overlay.hidden { display: none; }
    .vilify-loading-logo {
      width: 120px; height: 27px; margin-bottom: 24px;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 20"><path fill="%23dc322f" d="M27.973 18.652c-.322.964-.994 1.723-1.858 2.099C23.835 21.6 15 21.6 15 21.6s-8.835 0-11.115-.849c-.864-.376-1.536-1.135-1.858-2.099C1.2 16.432 1.2 12 1.2 12s0-4.432.827-6.652c.322-.964.994-1.723 1.858-2.099C6.165 2.4 15 2.4 15 2.4s8.835 0 11.115.849c.864.376 1.536 1.135 1.858 2.099.827 2.22.827 6.652.827 6.652s0 4.432-.827 6.652z" transform="translate(0,-2)"/><path fill="%23FFF" d="M12 15.6l7.2-4.8L12 6v9.6z" transform="translate(0,-2)"/><text x="32" y="15" fill="%2393a1a1" font-family="Arial,sans-serif" font-size="14" font-weight="bold">YouTube</text></svg>') no-repeat center;
      background-size: contain;
    }
    .vilify-loading-spinner {
      width: 32px; height: 32px; border: 3px solid #073642; border-top-color: #dc322f;
      border-radius: 50%; animation: vilify-spin 0.8s linear infinite;
    }
    @keyframes vilify-spin { to { transform: rotate(360deg); } }
    .vilify-loading-text { margin-top: 16px; color: #657b83; font-size: 14px; }
  `;

  const CSS = `
    :root {
      --bg-1: #002b36; --bg-2: #073642; --bg-3: #0a4a5c;
      --txt-1: #f1f1f1; --txt-2: #aaaaaa; --txt-3: #717171; --txt-4: #3ea6ff;
      --yt-red: #ff0000; --yt-red-hover: #cc0000;
      --txt-accent: var(--txt-4); --txt-err: var(--yt-red);
      --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
    }

    /* Overlay base */
    .vilify-overlay {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7);
      display: none; align-items: flex-start; justify-content: center; padding-top: 15vh;
      z-index: 9999999; font-family: var(--font-mono); font-size: 14px; line-height: 1.5;
    }
    .vilify-overlay.open { display: flex; }

    /* Modal base */
    .vilify-modal {
      position: relative; max-width: 90vw; max-height: 70vh; background: var(--bg-1);
      border: 2px solid var(--bg-3); display: flex; flex-direction: column; overflow: hidden;
    }
    .vilify-modal-header { padding: 12px 16px; border-bottom: 1px solid var(--bg-3); display: flex; align-items: center; gap: 12px; }
    .vilify-modal-title { font-size: 14px; font-weight: 400; color: var(--txt-2); }
    .vilify-modal-input-wrapper { padding: 12px 16px; border-bottom: 1px solid var(--bg-3); }
    .vilify-modal-input {
      width: 100%; padding: 8px 0; background: transparent; border: none;
      border-bottom: 1px solid var(--bg-3); font-size: 14px; font-family: var(--font-mono);
      color: var(--txt-1); outline: none; box-sizing: border-box;
    }
    .vilify-modal-input:focus { border-bottom-color: var(--txt-3); }
    .vilify-modal-input::placeholder { color: var(--txt-4); }
    .vilify-modal-list { flex: 1; overflow-y: auto; max-height: 400px; scrollbar-width: thin; scrollbar-color: var(--bg-3) transparent; }
    .vilify-modal-list::-webkit-scrollbar { width: 6px; }
    .vilify-modal-list::-webkit-scrollbar-track { background: transparent; }
    .vilify-modal-list::-webkit-scrollbar-thumb { background: var(--bg-3); }
    .vilify-modal-footer { display: flex; gap: 16px; padding: 12px 16px; border-top: 1px solid var(--bg-3); font-size: 12px; color: var(--txt-3); }
    .vilify-modal-footer kbd { background: transparent; border: 1px solid var(--bg-3); padding: 1px 5px; margin: 0 4px; font-size: 11px; font-family: var(--font-mono); }
    .vilify-modal-empty { padding: 40px; text-align: center; color: var(--txt-3); font-size: 14px; }

    /* Hide YouTube UI when focus mode is active */
    body.vilify-focus-mode ytd-app { visibility: hidden !important; }
    body.vilify-focus-mode { overflow: hidden !important; }

    /* Focus Mode Overlay */
    #vilify-focus {
      position: fixed; inset: 0; z-index: 9999; background: var(--bg-1);
      font-family: var(--font-mono); color: var(--txt-2); display: flex; flex-direction: column; visibility: visible !important;
    }
    .vilify-header {
      height: 48px; padding: 0 24px; border-bottom: 2px solid var(--bg-3);
      display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; box-sizing: border-box;
    }
    .vilify-logo { display: flex; align-items: center; gap: 4px; }
    .vilify-logo-icon {
      width: 90px; height: 20px;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 20"><path fill="%23dc322f" d="M27.973 18.652c-.322.964-.994 1.723-1.858 2.099C23.835 21.6 15 21.6 15 21.6s-8.835 0-11.115-.849c-.864-.376-1.536-1.135-1.858-2.099C1.2 16.432 1.2 12 1.2 12s0-4.432.827-6.652c.322-.964.994-1.723 1.858-2.099C6.165 2.4 15 2.4 15 2.4s8.835 0 11.115.849c.864.376 1.536 1.135 1.858 2.099.827 2.22.827 6.652.827 6.652s0 4.432-.827 6.652z" transform="translate(0,-2)"/><path fill="%23FFF" d="M12 15.6l7.2-4.8L12 6v9.6z" transform="translate(0,-2)"/><text x="32" y="15" fill="%2393a1a1" font-family="Arial,sans-serif" font-size="14" font-weight="bold">YouTube</text></svg>') no-repeat center;
      background-size: contain;
    }
    .vilify-mode { color: var(--txt-3); font-size: 12px; }
    .vilify-filter-wrapper, .vilify-search-wrapper { display: flex; align-items: center; gap: 8px; color: var(--txt-4); font-size: 14px; }
    .vilify-filter-wrapper.hidden, .vilify-search-wrapper.hidden { display: none; }
    #vilify-filter, #vilify-search {
      background: transparent; border: none; border-bottom: 1px solid var(--bg-3);
      color: var(--txt-1); font-family: var(--font-mono); font-size: 14px; padding: 4px 8px; width: 300px; outline: none;
    }
    #vilify-filter:focus, #vilify-search:focus { border-bottom-color: var(--txt-3); }
    #vilify-filter::placeholder, #vilify-search::placeholder { color: var(--txt-3); }
    #vilify-content { flex: 1; overflow-y: auto; padding: 16px 0; transition: background-color 0.15s ease-out; scrollbar-width: thin; scrollbar-color: var(--bg-3) transparent; }
    #vilify-content::-webkit-scrollbar { width: 6px; }
    #vilify-content::-webkit-scrollbar-track { background: transparent; }
    #vilify-content::-webkit-scrollbar-thumb { background: var(--bg-3); }
    body.vilify-watch-page #vilify-content { padding: 0; overflow: hidden; background: transparent; }
    #vilify-content.flash-end { background-color: var(--bg-2); }
    .vilify-footer {
      height: 40px; padding: 0 24px; border-top: 2px solid var(--bg-3);
      color: var(--txt-3); font-size: 12px; display: flex; align-items: center; flex-shrink: 0; box-sizing: border-box;
    }

    /* Video Items */
    .vilify-video-item { display: flex; align-items: flex-start; padding: 12px 24px; cursor: pointer; max-width: 900px; margin: 0 auto; }
    .vilify-video-item:hover { background: var(--bg-2); }
    .vilify-video-item.selected { background: var(--bg-2); outline: 2px solid var(--yt-red); outline-offset: -2px; }
    .vilify-thumb-wrapper { width: 200px; height: 113px; margin-right: 16px; flex-shrink: 0; overflow: hidden; background: var(--bg-2); border: 1px solid var(--bg-3); }
    .vilify-video-item.selected .vilify-thumb-wrapper { border-color: var(--yt-red); }
    .vilify-thumb { width: 100%; height: 100%; object-fit: cover; }
    .vilify-video-info { flex: 1; min-width: 0; padding-top: 4px; }
    .vilify-video-title { color: var(--txt-2); margin-bottom: 4px; font-size: 14px; font-weight: 400; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .vilify-video-item.selected .vilify-video-title { color: var(--txt-1); }
    .vilify-video-meta { color: var(--txt-3); font-size: 12px; }
    .vilify-empty { padding: 40px; text-align: center; color: var(--txt-3); font-size: 14px; }

    /* Watch page sidebar layout */
    body.vilify-focus-mode.vilify-watch-page #vilify-focus { left: auto; right: 0; width: 350px; background: var(--bg-1); border-left: 2px solid var(--bg-3); }
    body.vilify-focus-mode.vilify-watch-page .vilify-header { position: fixed; top: 0; left: 0; right: 0; width: 100%; z-index: 10001; background: var(--bg-1); }
    body.vilify-focus-mode.vilify-watch-page .vilify-footer { position: fixed; bottom: 0; left: 0; right: 0; width: 100%; z-index: 10001; background: var(--bg-1); }
    body.vilify-focus-mode.vilify-watch-page #vilify-content { margin-top: 48px; margin-bottom: 40px; height: calc(100vh - 48px - 40px); display: flex; flex-direction: column; }
    body.vilify-focus-mode.vilify-watch-page #movie_player { position: fixed !important; top: 48px !important; left: 0 !important; width: calc(100% - 350px) !important; height: calc(100vh - 48px - 40px) !important; z-index: 10000 !important; visibility: visible !important; }
    body.vilify-focus-mode.vilify-watch-page #movie_player, body.vilify-focus-mode.vilify-watch-page #movie_player * { visibility: visible !important; }
    body.vilify-focus-mode.vilify-watch-page ytd-watch-flexy { visibility: visible !important; }
    body.vilify-focus-mode.vilify-watch-page ytd-watch-flexy > * { visibility: hidden !important; }
    body.vilify-focus-mode.vilify-watch-page #player-container, body.vilify-focus-mode.vilify-watch-page #player-container-outer,
    body.vilify-focus-mode.vilify-watch-page #player-container-inner, body.vilify-focus-mode.vilify-watch-page #player,
    body.vilify-focus-mode.vilify-watch-page #movie_player, body.vilify-focus-mode.vilify-watch-page #movie_player * { visibility: visible !important; }
    .vilify-watch-layout { display: flex; flex-direction: column; height: 100%; }
    .vilify-watch-sidebar { flex: 1; display: flex; flex-direction: column; background: var(--bg-1); overflow: hidden; }

    /* Watch Page Info Panel */
    .vilify-watch-info { position: relative; padding: 16px 16px 12px; border: 2px solid var(--bg-3); margin: 12px; flex-shrink: 0; }
    .vilify-watch-info::before { content: 'video'; position: absolute; top: -10px; left: 10px; background: var(--bg-1); color: var(--txt-3); padding: 0 6px; font-size: 12px; }
    .vilify-watch-title { font-size: 14px; font-weight: 400; color: var(--txt-1); margin: 0 0 8px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .vilify-channel-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .vilify-channel-name { color: var(--txt-2); font-size: 13px; font-weight: 400; }
    .vilify-subscribe-btn { background: transparent; border: 1px solid var(--txt-err); color: var(--txt-err); padding: 4px 12px; font-family: var(--font-mono); font-size: 12px; font-weight: 400; cursor: pointer; }
    .vilify-subscribe-btn:hover { background: var(--txt-err); color: var(--bg-1); }
    .vilify-subscribe-btn.subscribed { border-color: var(--txt-3); color: var(--txt-3); }
    .vilify-subscribe-btn.subscribed:hover { background: var(--bg-3); }
    .vilify-description-hint { color: var(--txt-3); font-size: 11px; }
    .vilify-description-hint kbd { background: transparent; border: 1px solid var(--bg-3); padding: 1px 5px; font-size: 10px; margin: 0 2px; font-family: var(--font-mono); }

    /* Description Modal */
    #vilify-desc-overlay { padding-top: 10vh; }
    #vilify-desc-modal { position: relative; width: 700px; max-height: 80vh; }
    #vilify-desc-modal::before { content: 'description'; position: absolute; top: -10px; left: 12px; background: var(--bg-1); color: var(--txt-3); padding: 0 6px; font-size: 12px; z-index: 1; }
    #vilify-desc-header { padding: 16px 20px; justify-content: space-between; }
    #vilify-desc-close { background: none; border: 1px solid var(--bg-3); color: var(--txt-3); font-size: 14px; cursor: pointer; padding: 2px 8px; font-family: var(--font-mono); }
    #vilify-desc-close:hover { border-color: var(--txt-3); color: var(--txt-1); }
    #vilify-desc-content { flex: 1; overflow-y: auto; padding: 20px; scrollbar-width: thin; scrollbar-color: var(--bg-3) transparent; }
    #vilify-desc-text { color: var(--txt-2); font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
    #vilify-desc-footer { padding: 12px 20px; }

    /* Comments Panel */
    .vilify-comments { position: relative; flex: 1; margin: 12px; min-height: 0; display: flex; flex-direction: column; }
    .vilify-comments::before { content: 'comments'; position: absolute; top: -10px; left: 10px; background: var(--bg-1); color: var(--txt-3); padding: 0 6px; font-size: 12px; z-index: 1; }
    .vilify-comments::after { content: ''; position: absolute; inset: 0; border: 2px solid var(--bg-3); pointer-events: none; }
    .vilify-comments-header { display: none; }
    .vilify-comments-list { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 20px 16px 12px; scrollbar-width: thin; scrollbar-color: var(--bg-3) transparent; }
    .vilify-comments-list::-webkit-scrollbar { width: 6px; }
    .vilify-comments-list::-webkit-scrollbar-track { background: transparent; }
    .vilify-comments-list::-webkit-scrollbar-thumb { background: var(--bg-3); }
    .vilify-comment { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--bg-3); }
    .vilify-comment:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .vilify-comment-author { color: var(--txt-accent); font-size: 12px; font-weight: 400; margin-bottom: 4px; }
    .vilify-comment-text { color: var(--txt-2); font-size: 12px; line-height: 1.4; }
    .vilify-comments-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 10px 16px; border-top: 1px solid var(--bg-3); font-size: 11px; color: var(--txt-3); flex-shrink: 0; }
    .vilify-comments-pagination kbd { background: transparent; border: 1px solid var(--bg-3); padding: 1px 5px; font-size: 10px; font-family: var(--font-mono); }
    .vilify-comments-page-info { min-width: 50px; text-align: center; }

    /* Chapter Picker */
    #vilify-chapter-modal { position: relative; width: 500px; }
    #vilify-chapter-modal::before { content: 'chapters'; position: absolute; top: -10px; left: 12px; background: var(--bg-1); color: var(--txt-3); padding: 0 6px; font-size: 12px; z-index: 1; }
    .vilify-chapter-item { display: flex; align-items: center; padding: 10px 16px; cursor: pointer; gap: 12px; }
    .vilify-chapter-item:hover { background: var(--bg-2); }
    .vilify-chapter-item.selected { background: var(--bg-2); outline: 2px solid var(--yt-red); outline-offset: -2px; }
    .vilify-chapter-thumb { width: 80px; height: 45px; background: var(--bg-3); object-fit: cover; flex-shrink: 0; border: 1px solid var(--bg-3); }
    .vilify-chapter-item.selected .vilify-chapter-thumb { border-color: var(--yt-red); }
    .vilify-chapter-info { flex: 1; min-width: 0; }
    .vilify-chapter-title { font-size: 13px; color: var(--txt-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .vilify-chapter-item.selected .vilify-chapter-title { color: var(--txt-1); }
    .vilify-chapter-time { font-size: 12px; color: var(--txt-3); margin-top: 2px; }

    /* Command Palette */
    #keyring-overlay { font-family: var(--font-mono); }
    #keyring-modal { position: relative; width: 560px; }
    #keyring-modal::before { content: 'commands'; position: absolute; top: -10px; left: 12px; background: var(--bg-1); color: var(--txt-3); padding: 0 6px; font-size: 12px; z-index: 1; }
    #keyring-header { display: none; }
    .keyring-group-label { padding: 16px 16px 8px; font-size: 12px; font-weight: 400; text-transform: lowercase; letter-spacing: 0; color: var(--txt-3); background: var(--bg-1); }
    .keyring-item { display: flex; align-items: center; padding: 8px 16px; cursor: pointer; font-size: 14px; color: var(--txt-2); background: transparent; }
    .keyring-item:hover { background: var(--bg-2); }
    .keyring-item.selected { background: var(--bg-2); outline: 2px solid var(--yt-red); outline-offset: -2px; }
    .keyring-item.selected .keyring-label { color: var(--txt-1); }
    .keyring-item.selected .keyring-shortcut kbd { border-color: var(--txt-3); color: var(--txt-1); }
    .keyring-item.selected .keyring-meta { color: var(--txt-2); }
    .keyring-icon { width: auto; margin-right: 8px; font-size: 14px; color: var(--txt-3); background: transparent; }
    .keyring-icon::before { content: '>'; }
    .keyring-icon:not(:empty)::before { content: none; }
    .keyring-item.selected .keyring-icon { color: var(--yt-red); }
    .keyring-thumbnail { width: 80px; height: 45px; margin-right: 12px; background: var(--bg-2); object-fit: cover; flex-shrink: 0; border: 1px solid var(--bg-3); }
    .keyring-item.selected .keyring-thumbnail { border-color: var(--yt-red); }
    .keyring-item .keyring-label { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; white-space: normal; line-height: 1.3; }
    .keyring-video-meta { display: flex; flex-direction: column; overflow: hidden; flex: 1; }
    .keyring-video-meta .keyring-label { font-size: 14px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; white-space: normal; line-height: 1.3; }
    .keyring-video-meta .keyring-meta { margin-left: 0; margin-top: 2px; }
    .keyring-label { flex: 1; }
    .keyring-meta { font-size: 12px; color: var(--txt-3); margin-left: 8px; }
    .keyring-shortcut { margin-left: 12px; display: flex; gap: 4px; }
    .keyring-shortcut kbd { background: transparent; border: 1px solid var(--bg-3); padding: 2px 6px; font-size: 11px; font-family: var(--font-mono); color: var(--txt-3); }
    #keyring-footer { gap: 16px; }
    #keyring-footer kbd { background: transparent; }

    /* Toast */
    .keyring-toast {
      position: fixed; bottom: 32px; right: 32px; background: var(--bg-2); color: var(--txt-2);
      padding: 12px 20px; border: 2px solid var(--bg-3); font-size: 14px; font-weight: 400;
      font-family: var(--font-mono); z-index: 10000000; opacity: 0; transition: opacity 0.2s;
    }
    .keyring-toast.show { opacity: 1; }
  `;

  const SELECTORS = {
    watch: {
      title: [
        'h1.ytd-watch-metadata yt-formatted-string', 'h1.ytd-watch-metadata', '#title h1 yt-formatted-string',
        '#title h1', 'ytd-watch-metadata h1', 'h1.ytd-video-primary-info-renderer',
        '#info-contents h1 yt-formatted-string', 'yt-formatted-string.ytd-watch-metadata'
      ],
      channel: [
        'ytd-video-owner-renderer #channel-name a', 'ytd-video-owner-renderer ytd-channel-name a',
        'ytd-video-owner-renderer #channel-name yt-formatted-string a', '#owner #channel-name a',
        '#owner ytd-channel-name a', '#channel-name a', 'ytd-channel-name#channel-name a',
        '#upload-info #channel-name a', '#top-row ytd-video-owner-renderer a.yt-simple-endpoint'
      ],
      subscribeButton: ['ytd-subscribe-button-renderer button', '#subscribe-button button', 'ytd-video-owner-renderer ytd-subscribe-button-renderer button', '#owner ytd-subscribe-button-renderer button'],
      likeButton: ['like-button-view-model button', '#segmented-like-button button'],
      description: ['ytd-watch-metadata #description-inner', 'ytd-watch-metadata ytd-text-inline-expander', '#description ytd-text-inline-expander', '#description-inner', 'ytd-text-inline-expander#description-inline-expander', '#description .content', 'ytd-expandable-video-description-body-renderer #description-inner', '#description yt-attributed-string'],
      uploadDate: ['#info-strings yt-formatted-string', 'ytd-watch-metadata #info-strings span', '#info span.bold', 'ytd-video-primary-info-renderer #info-text', '#description ytd-video-description-header-renderer .yt-core-attributed-string', '#info-container yt-formatted-string']
    },
    listing: {
      newLayout: 'yt-lockup-view-model',
      oldLayout: ['ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-compact-video-renderer', 'ytd-grid-video-renderer', 'ytd-playlist-video-renderer'],
      thumbnailLink: 'a.yt-lockup-view-model__content-image',
      titleLink: 'a.yt-lockup-metadata-view-model__title',
      channelNew: ['.yt-content-metadata-view-model-wiz__metadata-text', '.yt-content-metadata-view-model__metadata-text', '.yt-content-metadata-view-model__metadata span.yt-core-attributed-string', 'ytd-channel-name a', '#channel-name a', '.ytd-channel-name'],
      channelOld: ['#channel-name #text', '#channel-name a', '.ytd-channel-name a', '#text.ytd-channel-name', 'ytd-channel-name #text-container', '[itemprop="author"] [itemprop="name"]'],
      videoLink: 'a#video-title-link, a#video-title, a.ytd-thumbnail',
      videoTitle: '#video-title',
      metadataNew: '.yt-content-metadata-view-model-wiz__metadata-text, .yt-content-metadata-view-model__metadata-text',
      metadataOld: '#metadata-line span, .inline-metadata-item, .ytd-video-meta-block span, #metadata span'
    },
    comments: {
      thread: ['ytd-comment-thread-renderer', 'ytd-comment-view-model', 'ytd-comment-renderer'],
      author: ['#author-text', '#author-text span', 'a#author-text', '.ytd-comment-view-model #author-text', '#header-author #author-text', 'h3 a'],
      content: ['#content-text', '#content-text span', 'yt-attributed-string#content-text', '.ytd-comment-view-model #content-text', '#comment-content #content-text']
    }
  };

  // =============================================================================
  // SECTION 3: MODEL FUNCTIONS (Pure Logic)
  // =============================================================================

  /**
   * Calculates the next index with wrap-around.
   * @param {Number} current - Current index
   * @param {Number} total - Total items
   * @param {Number} direction - 1 for next, -1 for previous
   * @returns {Number}
   */
  const nextIndex = (current, total, direction) => {
    if (total === 0) return 0;
    return (current + direction + total) % total;
  };

  /**
   * Filters items based on a query string.
   * @param {Array<Item>} items
   * @param {String} query
   * @returns {Array<Item>}
   */
  const filterItems = (items, query) => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(item => {
      if (item.group) return false;
      if (item.type === 'video') {
        return item.title.toLowerCase().includes(q) || (item.channelName && item.channelName.toLowerCase().includes(q));
      }
      if (item.type === 'command') {
        return item.label.toLowerCase().includes(q) || (item.keys && item.keys.toLowerCase().replace(/\s+/g, '').includes(q));
      }
      return false;
    });
  };

  /**
   * Determines the current page type.
   * @returns {PageType}
   */
  const getPageType = () => {
    const path = location.pathname;
    const params = new URLSearchParams(location.search);
    if (path === '/watch' && params.get('v')) return 'watch';
    if (path === '/' || path === '') return 'home';
    if (path === '/results') return 'search';
    if (path.startsWith('/@') || path.startsWith('/channel/') || path.startsWith('/c/')) return 'channel';
    if (path === '/playlist') return 'playlist';
    if (path === '/feed/subscriptions') return 'subscriptions';
    if (path === '/feed/history') return 'history';
    if (path === '/feed/library') return 'library';
    if (path.startsWith('/shorts/')) return 'shorts';
    return 'other';
  };

  /**
   * Parses timestamp string to seconds.
   * @param {String} str - "1:23" or "1:23:45"
   * @returns {Number}
   */
  const parseTimestamp = (str) => {
    const parts = str.split(':').map(p => parseInt(p, 10));
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  };

  /**
   * Formats seconds to timestamp string.
   * @param {Number} seconds
   * @returns {String}
   */
  const formatTimestamp = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  /**
   * Checks if page type supports loading more videos.
   * @param {PageType} pageType
   * @returns {Boolean}
   */
  const supportsLoadMore = (pageType) => ['search', 'subscriptions', 'history', 'library', 'playlist', 'channel'].includes(pageType);

  // =============================================================================
  // SECTION 4: INPUT FUNCTIONS (Scrapers & DOM Readers)
  // =============================================================================

  /**
   * Query the first matching element from a list of selectors that has text content.
   */
  const queryFirst = (selectors, context = document) => {
    for (const sel of selectors) {
      const el = context.querySelector(sel);
      if (el?.textContent?.trim()) return el;
    }
    return null;
  };

  /**
   * Query the first matching element (without text content check).
   */
  const queryFirstEl = (selectors, context = document) => {
    for (const sel of selectors) {
      const el = context.querySelector(sel);
      if (el) return el;
    }
    return null;
  };

  const Scraper = {
    /**
     * Extract video ID from URL.
     */
    extractVideoId: (url) => {
      if (!url) return null;
      const match = url.match(/\/watch\?v=([^&]+)/);
      return match ? match[1] : null;
    },

    /**
     * Extract upload date from metadata elements.
     */
    extractUploadDate: (container, selector) => {
      if (!container || !selector) return '';
      const elements = container.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent?.trim() || '';
        const match = text.match(/^(?:Streamed\s+)?(\d+\s+(?:second|minute|hour|day|week|month|year)s?\s+ago)$/i);
        if (match) return match[1];
      }
      return '';
    },

    /**
     * Scrape videos from the current page.
     * @returns {Array<Video>}
     */
    getVideos: () => {
      const videos = [];
      const seen = new Set();

      const addVideo = (videoId, title, channelName, uploadDate = '') => {
        if (seen.has(videoId)) return;
        seen.add(videoId);
        videos.push({
          type: 'video', videoId, title, channelName, uploadDate,
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          url: `/watch?v=${videoId}`
        });
      };

      // Strategy 1: New layout (yt-lockup-view-model)
      document.querySelectorAll(SELECTORS.listing.newLayout).forEach(el => {
        const thumbLink = el.querySelector(SELECTORS.listing.thumbnailLink);
        const videoId = Scraper.extractVideoId(thumbLink?.href);
        if (!videoId) return;
        const titleLink = el.querySelector(SELECTORS.listing.titleLink);
        const title = titleLink?.textContent?.trim();
        if (!title) return;
        const channelEl = queryFirst(SELECTORS.listing.channelNew, el);
        const channelName = channelEl?.textContent?.trim() || '';
        const uploadDate = Scraper.extractUploadDate(el, SELECTORS.listing.metadataNew);
        addVideo(videoId, title, channelName, uploadDate);
      });

      // Strategy 2: Old layout
      document.querySelectorAll(SELECTORS.listing.oldLayout.join(',')).forEach(el => {
        const link = el.querySelector(SELECTORS.listing.videoLink);
        const videoId = Scraper.extractVideoId(link?.href);
        if (!videoId) return;
        const titleEl = el.querySelector(SELECTORS.listing.videoTitle);
        const title = titleEl?.textContent?.trim();
        if (!title) return;
        const channelEl = queryFirst(SELECTORS.listing.channelOld, el);
        const channelName = channelEl?.textContent?.trim() || '';
        const uploadDate = Scraper.extractUploadDate(el, SELECTORS.listing.metadataOld);
        addVideo(videoId, title, channelName, uploadDate);
      });

      // Strategy 3: Search results
      document.querySelectorAll('ytd-video-renderer').forEach(el => {
        const link = el.querySelector('a#video-title') || el.querySelector('a.ytd-thumbnail') || el.querySelector('a[href*="/watch?v="]');
        const videoId = Scraper.extractVideoId(link?.href);
        if (!videoId) return;
        const titleEl = el.querySelector('#video-title') || el.querySelector('h3 a') || el.querySelector('yt-formatted-string#video-title');
        const title = titleEl?.textContent?.trim();
        if (!title) return;
        const channelEl = el.querySelector('ytd-channel-name a') || el.querySelector('#channel-name a') || el.querySelector('.ytd-channel-name');
        const channelName = channelEl?.textContent?.trim() || '';
        const uploadDate = Scraper.extractUploadDate(el, SELECTORS.listing.metadataOld);
        addVideo(videoId, title, channelName, uploadDate);
      });

      // Strategy 4: Playlist renderers
      document.querySelectorAll('ytd-playlist-video-renderer').forEach(el => {
        const link = el.querySelector('a#video-title') || el.querySelector('a[href*="/watch?v="]');
        const videoId = Scraper.extractVideoId(link?.href);
        if (!videoId) return;
        const titleEl = el.querySelector('#video-title');
        const title = titleEl?.textContent?.trim();
        if (!title) return;
        const channelEl = el.querySelector('#channel-name a') || el.querySelector('ytd-channel-name a');
        const channelName = channelEl?.textContent?.trim() || '';
        const uploadDate = Scraper.extractUploadDate(el, SELECTORS.listing.metadataOld);
        addVideo(videoId, title, channelName, uploadDate);
      });

      // Strategy 5: Generic fallback
      if (videos.length === 0) {
        document.querySelectorAll('a[href*="/watch?v="]').forEach(link => {
          const videoId = Scraper.extractVideoId(link.href);
          if (!videoId) return;
          const title = link.textContent?.trim() || link.getAttribute('title') || link.closest('[class*="renderer"]')?.querySelector('#video-title, h3, [id*="title"]')?.textContent?.trim();
          if (!title || title.length < 3) return;
          if (link.href.includes('/channel/') || link.href.includes('/@')) return;
          addVideo(videoId, title, '');
        });
      }

      return videos;
    },

    /**
     * Get video context for the current watch page.
     * @returns {Object|null}
     */
    getVideoContext: () => {
      if (getPageType() !== 'watch') return null;
      const params = new URLSearchParams(location.search);
      const videoId = params.get('v');
      if (!videoId) return null;

      const ctx = { videoId, url: location.href, cleanUrl: `https://www.youtube.com/watch?v=${videoId}` };
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

      const titleEl = queryFirst(SELECTORS.watch.title);
      if (titleEl) ctx.title = titleEl.textContent.trim();

      const channelEl = queryFirst(SELECTORS.watch.channel);
      if (channelEl) {
        ctx.channelName = channelEl.textContent.trim();
        ctx.channelUrl = channelEl.href;
      }

      const subButton = queryFirstEl(SELECTORS.watch.subscribeButton);
      if (subButton) {
        const label = subButton.getAttribute('aria-label') || '';
        ctx.isSubscribed = label.toLowerCase().includes('unsubscribe');
      }

      const likeButton = queryFirstEl(SELECTORS.watch.likeButton);
      if (likeButton) ctx.isLiked = likeButton.getAttribute('aria-pressed') === 'true';

      const uploadDateEl = queryFirst(SELECTORS.watch.uploadDate);
      if (uploadDateEl) {
        const text = uploadDateEl.textContent.trim();
        const dateMatch = text.match(/(?:Premiered\s+|Streamed\s+)?(.+ago|[A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/i);
        ctx.uploadDate = dateMatch ? dateMatch[1] || dateMatch[0] : text;
      }

      return ctx;
    },

    /**
     * Get video description.
     * @returns {String}
     */
    getDescription: () => {
      const descEl = queryFirst(SELECTORS.watch.description);
      return descEl?.textContent?.trim() || '';
    },

    /**
     * Scrape comments from the page.
     * @returns {Array<Comment>}
     */
    getComments: () => {
      const comments = [];
      let commentEls = [];
      for (const sel of SELECTORS.comments.thread) {
        commentEls = document.querySelectorAll(sel);
        if (commentEls.length > 0) break;
      }
      commentEls.forEach(el => {
        const authorEl = queryFirst(SELECTORS.comments.author, el);
        const contentEl = queryFirst(SELECTORS.comments.content, el);
        const author = authorEl?.textContent?.trim() || '';
        const text = contentEl?.textContent?.trim() || '';
        if (author && text) comments.push({ author, text });
      });
      return comments;
    },

    /**
     * Scrape chapters from the page.
     * @returns {Array<Chapter>}
     */
    getChapters: () => {
      const chapters = [];
      const seenKeys = new Set();

      const addChapter = (title, time, timeText, thumbnailUrl) => {
        const key = `${title}::${Math.round(time)}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        chapters.push({ title, time, timeText, thumbnailUrl });
      };

      // Method 1: From chapter markers in progress bar
      document.querySelectorAll('.ytp-chapter-hover-container').forEach(marker => {
        const title = marker.querySelector('.ytp-chapter-title')?.textContent?.trim();
        const timeText = marker.dataset.startTime || marker.getAttribute('data-start-time');
        if (title && timeText) addChapter(title, parseFloat(timeText), null, null);
      });

      // Method 2: From description chapters panel
      document.querySelectorAll('ytd-macro-markers-list-item-renderer').forEach(item => {
        const titleEl = item.querySelector('#details h4, #title');
        const timeEl = item.querySelector('#time, #details #time');
        const thumbEl = item.querySelector('img');
        if (titleEl && timeEl) {
          const timeText = timeEl.textContent.trim();
          const time = parseTimestamp(timeText);
          addChapter(titleEl.textContent.trim(), time, timeText, thumbEl?.src || null);
        }
      });

      return chapters;
    }
  };

  // =============================================================================
  // SECTION 5: VIEW FUNCTIONS (Rendering)
  // =============================================================================

  const View = {
    /**
     * Creates a DOM element with attributes and children.
     */
    el: (tag, attrs = {}, children = []) => {
      const element = document.createElement(tag);
      Object.entries(attrs).forEach(([key, val]) => {
        if (key === 'textContent') element.textContent = val;
        else if (key === 'className') element.className = val;
        else element.setAttribute(key, val);
      });
      children.forEach(child => {
        if (typeof child === 'string') element.appendChild(document.createTextNode(child));
        else element.appendChild(child);
      });
      return element;
    },

    /** Shorthand element creators */
    div: (attrs, children) => View.el('div', attrs, children),
    span: (attrs, children) => View.el('span', attrs, children),
    img: (attrs) => View.el('img', attrs),
    input: (attrs) => View.el('input', attrs),
    button: (attrs, children) => View.el('button', attrs, children),

    /** Clear all children from an element */
    clear: (el) => { while (el.firstChild) el.removeChild(el.firstChild); },

    /** Update list selection */
    updateListSelection: (container, itemSelector, selectedIdx) => {
      const items = container.querySelectorAll(itemSelector);
      items.forEach((el, i) => el.classList.toggle('selected', i === selectedIdx));
      const sel = container.querySelector(`${itemSelector}.selected`);
      if (sel) sel.scrollIntoView({ block: 'nearest' });
    },

    /** Shows a toast notification */
    toast: (message) => {
      let toast = document.querySelector('.keyring-toast');
      if (!toast) {
        toast = View.div({ className: 'keyring-toast' });
        document.body.appendChild(toast);
      }
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), CONSTANTS.TOAST_DURATION_MS);
    },

    /** Creates footer hint element */
    createFooterHint: (keys, label) => {
      return View.span({}, [...keys.map(k => View.el('kbd', { textContent: k })), ' ' + label]);
    }
  };

  // =============================================================================
  // SECTION 6: ACTIONS (Side Effects)
  // =============================================================================

  const Actions = {
    /** Copy text to clipboard */
    copyToClipboard: (text) => {
      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(text);
        View.toast('Copied to clipboard');
      } else {
        navigator.clipboard.writeText(text)
          .then(() => View.toast('Copied to clipboard'))
          .catch(() => View.toast('Failed to copy'));
      }
    },

    /** Navigate to a URL */
    navigateTo: (path) => { location.href = path; },

    /** Open URL in new tab */
    openInNewTab: (url) => { window.open(url, '_blank'); },

    /** Get video element */
    getVideo: () => document.querySelector('video.html5-main-video'),

    /** Toggle play/pause */
    togglePlayPause: () => {
      const video = Actions.getVideo();
      if (!video) return;
      if (video.paused) { video.play(); View.toast('Playing'); }
      else { video.pause(); View.toast('Paused'); }
    },

    /** Seek relative */
    seekRelative: (seconds) => {
      const video = Actions.getVideo();
      if (!video) return;
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
      View.toast(`${seconds > 0 ? '+' : ''}${seconds}s`);
    },

    /** Set playback rate */
    setPlaybackRate: (rate) => {
      const video = Actions.getVideo();
      if (!video) return;
      video.playbackRate = rate;
      View.toast(`Speed: ${rate}x`);
    },

    /** Toggle mute */
    toggleMute: () => {
      const video = Actions.getVideo();
      if (!video) return;
      video.muted = !video.muted;
      View.toast(video.muted ? 'Muted' : 'Unmuted');
    },

    /** Toggle fullscreen */
    toggleFullscreen: () => {
      const player = document.querySelector('#movie_player');
      if (!player) return;
      const fsButton = player.querySelector('.ytp-fullscreen-button');
      if (fsButton) fsButton.click();
    },

    /** Toggle theater mode */
    toggleTheaterMode: () => {
      const theaterButton = document.querySelector('.ytp-size-button');
      if (theaterButton) { theaterButton.click(); View.toast('Theater mode toggled'); }
    },

    /** Toggle captions */
    toggleCaptions: () => {
      const ccButton = document.querySelector('.ytp-subtitles-button');
      if (ccButton) {
        ccButton.click();
        const isOn = ccButton.getAttribute('aria-pressed') === 'true';
        View.toast(isOn ? 'Captions off' : 'Captions on');
      }
    },

    /** Seek to percentage */
    seekToPercent: (percent) => {
      const video = Actions.getVideo();
      if (!video || !video.duration) return;
      video.currentTime = video.duration * (percent / 100);
    },

    /** Toggle subscribe */
    toggleSubscribe: (onUpdate) => {
      const ctx = Scraper.getVideoContext();
      if (ctx?.isSubscribed) {
        const notificationBtn = document.querySelector('ytd-subscribe-button-renderer button, #subscribe-button button');
        if (notificationBtn) {
          notificationBtn.click();
          setTimeout(() => {
            const formattedStrings = document.querySelectorAll('tp-yt-paper-listbox yt-formatted-string');
            let found = false;
            for (const el of formattedStrings) {
              if (el.textContent?.trim() === 'Unsubscribe') {
                const clickable = el.closest('tp-yt-paper-item') || el.closest('ytd-menu-service-item-renderer');
                if (clickable) { clickable.click(); found = true; break; }
              }
            }
            setTimeout(() => {
              const confirmBtn = document.querySelector('#confirm-button button, yt-confirm-dialog-renderer #confirm-button button, button[aria-label="Unsubscribe"]');
              if (confirmBtn) { confirmBtn.click(); View.toast('Unsubscribed'); setTimeout(() => onUpdate(false), 500); }
              else if (!found) View.toast('Unsubscribe option not found');
            }, 400);
          }, 400);
        }
      } else {
        const ytSubBtn = document.querySelector('ytd-subscribe-button-renderer button, #subscribe-button button');
        if (ytSubBtn) { ytSubBtn.click(); View.toast('Subscribed'); setTimeout(() => onUpdate(true), 500); }
        else View.toast('Subscribe button not found');
      }
    },

    /** Copy video URL */
    copyVideoUrl: () => {
      const ctx = Scraper.getVideoContext();
      if (!ctx) { View.toast('No video on this page'); return; }
      Actions.copyToClipboard(ctx.cleanUrl);
    },

    /** Copy video URL at current time */
    copyVideoUrlAtTime: () => {
      const ctx = Scraper.getVideoContext();
      if (!ctx) { View.toast('No video on this page'); return; }
      const t = Math.floor(ctx.currentTime);
      Actions.copyToClipboard(`https://www.youtube.com/watch?v=${ctx.videoId}&t=${t}s`);
    },

    /** Copy video title */
    copyVideoTitle: () => {
      const ctx = Scraper.getVideoContext();
      if (!ctx?.title) { View.toast('Could not get video title'); return; }
      Actions.copyToClipboard(ctx.title);
    },

    /** Copy title and URL */
    copyVideoTitleAndUrl: () => {
      const ctx = Scraper.getVideoContext();
      if (!ctx?.title) { View.toast('Could not get video info'); return; }
      Actions.copyToClipboard(`${ctx.title}\n${ctx.cleanUrl}`);
    },

    /** Apply default video settings */
    applyDefaultSettings: () => {
      const video = Actions.getVideo();
      if (video && video.playbackRate !== CONSTANTS.DEFAULT_PLAYBACK_RATE) {
        video.playbackRate = CONSTANTS.DEFAULT_PLAYBACK_RATE;
      }
    }
  };

  // =============================================================================
  // SECTION 7: COMMANDS
  // =============================================================================

  const Commands = {
    /**
     * Get list of commands based on current context.
     * @param {Object} app - App instance for callbacks
     * @returns {Array<Item>}
     */
    getCommands: (app) => {
      const pageType = getPageType();
      const videoCtx = Scraper.getVideoContext();
      const cmds = [];

      // Navigation - always available
      cmds.push({ group: 'Navigation' });
      cmds.push({ type: 'command', label: 'Home', icon: '🏠', action: () => Actions.navigateTo('/'), keys: 'G H' });
      cmds.push({ type: 'command', label: 'Subscriptions', icon: '📺', action: () => Actions.navigateTo('/feed/subscriptions'), keys: 'G S' });
      cmds.push({ type: 'command', label: 'History', icon: '⏱', action: () => Actions.navigateTo('/feed/history'), keys: 'G Y' });
      cmds.push({ type: 'command', label: 'Library', icon: '📚', action: () => Actions.navigateTo('/feed/library'), keys: 'G L' });
      cmds.push({ type: 'command', label: 'Trending', icon: '🔥', action: () => Actions.navigateTo('/feed/trending'), keys: 'G T' });
      cmds.push({ type: 'command', label: 'Search', icon: '🔍', action: () => app.openSearch(), keys: 'I' });
      cmds.push({ type: 'command', label: 'Exit focus mode', icon: '×', action: () => app.exitFocusMode(), keys: ':Q' });

      // Video controls - only on watch page
      if (pageType === 'watch' && videoCtx) {
        cmds.push({ group: 'Playback' });
        cmds.push({ type: 'command', label: videoCtx.paused ? 'Play' : 'Pause', icon: videoCtx.paused ? '▶' : '⏸', action: Actions.togglePlayPause, keys: 'Space' });
        cmds.push({ type: 'command', label: 'Skip back 10s', icon: '⏪', action: () => Actions.seekRelative(-10), keys: 'J' });
        cmds.push({ type: 'command', label: 'Skip forward 10s', icon: '⏩', action: () => Actions.seekRelative(10), keys: 'L' });
        cmds.push({ type: 'command', label: 'Skip back 5s', icon: '◀', action: () => Actions.seekRelative(-5), keys: '←' });
        cmds.push({ type: 'command', label: 'Skip forward 5s', icon: '▶', action: () => Actions.seekRelative(5), keys: '→' });

        cmds.push({ group: 'Speed' });
        cmds.push({ type: 'command', label: 'Speed 0.5x', icon: '🐢', action: () => Actions.setPlaybackRate(0.5) });
        cmds.push({ type: 'command', label: 'Speed 1x', icon: '⏱', action: () => Actions.setPlaybackRate(1), keys: 'G 1' });
        cmds.push({ type: 'command', label: 'Speed 1.25x', icon: '🏃', action: () => Actions.setPlaybackRate(1.25) });
        cmds.push({ type: 'command', label: 'Speed 1.5x', icon: '🏃', action: () => Actions.setPlaybackRate(1.5) });
        cmds.push({ type: 'command', label: 'Speed 2x', icon: '🚀', action: () => Actions.setPlaybackRate(2), keys: 'G 2' });

        cmds.push({ group: 'View' });
        cmds.push({ type: 'command', label: 'Toggle fullscreen', icon: '⛶', action: Actions.toggleFullscreen, keys: 'F' });
        cmds.push({ type: 'command', label: 'Theater mode', icon: '🎬', action: Actions.toggleTheaterMode, keys: 'T' });
        cmds.push({ type: 'command', label: 'Toggle captions', icon: '💬', action: Actions.toggleCaptions, keys: 'C' });
        cmds.push({ type: 'command', label: 'Toggle mute', icon: videoCtx.muted ? '🔇' : '🔊', action: Actions.toggleMute, keys: 'Shift+M' });
        cmds.push({ type: 'command', label: 'Show description', icon: '📖', action: () => app.openDescriptionModal(), keys: 'Z O' });
        cmds.push({ type: 'command', label: 'Close description', icon: '📕', action: () => app.closeDescriptionModal(), keys: 'Z C' });
        cmds.push({ type: 'command', label: 'Next comment page', icon: '💬', action: () => app.nextCommentPage(), keys: 'Ctrl+F' });
        cmds.push({ type: 'command', label: 'Prev comment page', icon: '💬', action: () => app.prevCommentPage(), keys: 'Ctrl+B' });
        cmds.push({ type: 'command', label: 'Jump to chapter', icon: '📑', action: () => app.openChapterPicker(), keys: 'F' });

        cmds.push({ group: 'Copy' });
        cmds.push({ type: 'command', label: 'Copy video URL', icon: '🔗', action: Actions.copyVideoUrl, keys: 'Y Y' });
        cmds.push({ type: 'command', label: 'Copy URL at current time', icon: '⏱', action: Actions.copyVideoUrlAtTime, meta: formatTimestamp(videoCtx.currentTime), keys: '⇧Y' });
        cmds.push({ type: 'command', label: 'Copy video title', icon: '📝', action: Actions.copyVideoTitle, keys: 'Y T' });
        cmds.push({ type: 'command', label: 'Copy title + URL', icon: '📋', action: Actions.copyVideoTitleAndUrl, keys: 'Y A' });

        // Channel navigation
        if (videoCtx.channelUrl) {
          cmds.push({ group: 'Channel' });
          cmds.push({ type: 'command', label: videoCtx.isSubscribed ? 'Unsubscribe' : 'Subscribe', icon: videoCtx.isSubscribed ? '✓' : '⊕', action: () => Actions.toggleSubscribe(app.updateSubscribeButton.bind(app)), keys: 'm' });
          cmds.push({ type: 'command', label: `Go to ${videoCtx.channelName || 'channel'}`, icon: '👤', action: () => Actions.navigateTo(videoCtx.channelUrl), keys: 'G C' });
          cmds.push({ type: 'command', label: `${videoCtx.channelName || 'Channel'} videos`, icon: '🎥', action: () => Actions.navigateTo(videoCtx.channelUrl + '/videos') });
        }
      }

      return cmds;
    },

    /**
     * Get key sequences for vim-style navigation.
     * @param {Object} app - App instance
     * @returns {Object}
     */
    getKeySequences: (app) => {
      const videoCtx = Scraper.getVideoContext();
      const sequences = {
        '/': () => {
          if (app.state.focusModeActive && getPageType() !== 'watch') app.openFilter();
          else app.openPalette('video');
        },
        ':': () => app.openPalette('command'),
        'i': () => app.openSearch(),
        'gh': () => Actions.navigateTo('/'),
        'gs': () => Actions.navigateTo('/feed/subscriptions'),
        'gy': () => Actions.navigateTo('/feed/history'),
        'gl': () => Actions.navigateTo('/feed/library'),
        'gt': () => Actions.navigateTo('/feed/trending'),
      };

      if (videoCtx) {
        sequences['gc'] = () => videoCtx.channelUrl && Actions.navigateTo(videoCtx.channelUrl);
        sequences['g1'] = () => Actions.setPlaybackRate(1);
        sequences['g2'] = () => Actions.setPlaybackRate(2);
        sequences['yy'] = Actions.copyVideoUrl;
        sequences['yt'] = Actions.copyVideoTitle;
        sequences['ya'] = Actions.copyVideoTitleAndUrl;
        sequences['zo'] = () => app.openDescriptionModal();
        sequences['zc'] = () => app.closeDescriptionModal();
        sequences['f'] = () => app.openChapterPicker();
        sequences['m'] = () => Actions.toggleSubscribe(app.updateSubscribeButton.bind(app));
      }

      return sequences;
    },

    /**
     * Get single-key actions (with Shift modifiers).
     * @returns {Object}
     */
    getSingleKeyActions: () => {
      const videoCtx = Scraper.getVideoContext();
      const actions = {};
      if (videoCtx) {
        actions['Y'] = Actions.copyVideoUrlAtTime;
        actions['M'] = Actions.toggleMute;
      }
      return actions;
    }
  };

  // =============================================================================
  // SECTION 8: THE WORLD (App Logic & Event Loop)
  // =============================================================================

  class App {
    constructor() {
      this.state = {
        focusModeActive: true,
        filterActive: false,
        filterQuery: '',
        searchActive: false,
        selectedIdx: 0,
        openModal: null,
        paletteQuery: '',
        paletteSelectedIdx: 0,
        chapterQuery: '',
        chapterSelectedIdx: 0,
        commentPage: 0,
        commentPageStarts: [0],
        keySeq: '',
        lastUrl: location.href,
        settingsApplied: false,
        watchPageRetryCount: 0,
        commentLoadAttempts: 0
      };

      // DOM references
      this.focusOverlay = null;
      this.paletteOverlay = null;
      this.paletteInputEl = null;
      this.paletteListEl = null;
      this.chapterOverlay = null;
      this.chapterInputEl = null;
      this.chapterListEl = null;
      this.descOverlay = null;
      this.pollTimer = null;
      this.keyTimer = null;
      this.observer = null;
      this.commentObserver = null;

      // Initialize
      this.injectLoadingScreen();
      this.injectStyles();
      this.bindGlobalEvents();
      this.setupNavigationObserver();
      this.init();
    }

    // --- Initialization ---

    injectLoadingScreen() {
      const style = document.createElement('style');
      style.id = 'vilify-loading-styles';
      style.textContent = LOADING_CSS;
      (document.head || document.documentElement).appendChild(style);
      const target = document.body || document.documentElement;
      target.classList.add('vilify-loading');
      this.createLoadingOverlay();
    }

    createLoadingOverlay() {
      if (document.getElementById('vilify-loading-overlay')) return;
      const overlay = View.div({ id: 'vilify-loading-overlay' }, [
        View.div({ className: 'vilify-loading-logo' }),
        View.div({ className: 'vilify-loading-spinner' }),
        View.div({ className: 'vilify-loading-text', textContent: 'Loading...' })
      ]);
      if (document.body) document.body.appendChild(overlay);
      else document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(overlay);
        document.body.classList.add('vilify-loading');
      }, { once: true });
    }

    hideLoadingScreen() {
      const overlay = document.getElementById('vilify-loading-overlay');
      if (overlay) { overlay.classList.add('hidden'); setTimeout(() => overlay.remove(), 300); }
      document.body?.classList.remove('vilify-loading');
      document.documentElement.classList.remove('vilify-loading');
    }

    injectStyles() {
      if (document.getElementById('keyring-styles')) return;
      const style = document.createElement('style');
      style.id = 'keyring-styles';
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    init() {
      this.waitForYouTubeContent().then(() => this.initFocusMode());
    }

    waitForYouTubeContent(maxWait = 5000) {
      return new Promise((resolve) => {
        const startTime = Date.now();
        const check = () => {
          const pageType = getPageType();
          if (pageType === 'watch') {
            if (document.querySelector('#movie_player video')) { resolve(); return; }
          } else {
            const videoCount = document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-playlist-video-renderer, yt-lockup-view-model').length;
            const isLoading = !!document.querySelector('ytd-continuation-item-renderer, tp-yt-paper-spinner, #spinner, ytd-ghost-grid-renderer, ytd-rich-grid-renderer[is-loading], .ytd-ghost-grid-renderer');
            if (videoCount > 0 && !isLoading) { resolve(); return; }
          }
          if (Date.now() - startTime >= maxWait) { resolve(); return; }
          setTimeout(check, CONSTANTS.POLL_INTERVAL_MS);
        };
        check();
      });
    }

    // --- Focus Mode ---

    initFocusMode() {
      if (!this.state.focusModeActive) { this.hideLoadingScreen(); return; }
      document.body.classList.add('vilify-focus-mode');
      this.createFocusOverlay();
      if (this.focusOverlay) this.focusOverlay.style.display = '';

      const pageType = getPageType();
      if (pageType === 'watch') {
        document.body.classList.add('vilify-watch-page');
        this.renderWatchPage();
        this.stopContentPolling();
      } else {
        document.body.classList.remove('vilify-watch-page');
        const videos = Scraper.getVideos();
        this.renderVideoList(videos);
        this.startContentPolling();
      }
      this.hideLoadingScreen();
    }

    exitFocusMode() {
      this.state.focusModeActive = false;
      this.stopContentPolling();
      document.body.classList.remove('vilify-focus-mode', 'vilify-watch-page');
      if (this.focusOverlay) { this.focusOverlay.remove(); this.focusOverlay = null; }
      this.hideLoadingScreen();
      View.toast('Focus mode off (refresh to re-enable)');
    }

    createFocusOverlay() {
      if (this.focusOverlay) return;

      const filterInput = View.input({ id: 'vilify-filter', type: 'text', placeholder: 'filter videos...', autocomplete: 'off', spellcheck: 'false' });
      const searchInput = View.input({ id: 'vilify-search', type: 'text', placeholder: 'search youtube...', autocomplete: 'off', spellcheck: 'false' });

      const header = View.div({ className: 'vilify-header' }, [
        View.div({ className: 'vilify-logo' }, [View.div({ className: 'vilify-logo-icon' })]),
        View.div({ className: 'vilify-filter-wrapper hidden', 'data-mode': 'filter' }, [View.span({ textContent: '/' }), filterInput]),
        View.div({ className: 'vilify-search-wrapper hidden', 'data-mode': 'search' }, [View.span({ textContent: '?' }), searchInput]),
        View.span({ className: 'vilify-mode', textContent: '[/] filter  [i] search  [:] commands' })
      ]);

      this.focusOverlay = View.div({ id: 'vilify-focus' }, [
        header,
        View.div({ id: 'vilify-content' }),
        View.div({ className: 'vilify-footer', textContent: 'j/k navigate · enter select · shift+enter new tab · :q quit' })
      ]);

      document.body.appendChild(this.focusOverlay);

      // Bind filter/search events
      filterInput.addEventListener('input', (e) => this.onFilterInput(e));
      filterInput.addEventListener('keydown', (e) => this.onFilterKeydown(e));
      searchInput.addEventListener('keydown', (e) => this.onSearchKeydown(e));
    }

    // --- Video List Rendering ---

    renderVideoList(videos, filterQuery = '') {
      const content = document.getElementById('vilify-content');
      if (!content) return;
      View.clear(content);

      let filtered = videos;
      if (filterQuery) {
        const q = filterQuery.toLowerCase();
        filtered = videos.filter(v => v.title.toLowerCase().includes(q) || (v.channelName && v.channelName.toLowerCase().includes(q)));
      }

      if (filtered.length === 0) {
        const message = filterQuery ? `No videos matching "${filterQuery}"` : 'No videos found. Try scrolling to load more.';
        content.appendChild(View.div({ className: 'vilify-empty', textContent: message }));
        return;
      }

      if (this.state.selectedIdx >= filtered.length) this.state.selectedIdx = Math.max(0, filtered.length - 1);

      filtered.forEach((video, idx) => {
        const metaParts = [];
        if (video.channelName) metaParts.push(video.channelName);
        if (video.uploadDate) metaParts.push(video.uploadDate);
        const metaText = metaParts.join(' · ');

        const item = View.div({ className: `vilify-video-item ${idx === this.state.selectedIdx ? 'selected' : ''}`, 'data-idx': String(idx), 'data-url': video.url }, [
          View.div({ className: 'vilify-thumb-wrapper' }, [View.img({ className: 'vilify-thumb', src: video.thumbnailUrl, alt: '' })]),
          View.div({ className: 'vilify-video-info' }, [
            View.div({ className: 'vilify-video-title', textContent: video.title }),
            View.div({ className: 'vilify-video-meta', textContent: metaText })
          ])
        ]);

        content.appendChild(item);
        item.addEventListener('click', () => this.executeVideoItem(idx, false));
        item.addEventListener('mouseenter', () => { this.state.selectedIdx = idx; this.updateVideoSelection(); });
      });

      this.updateVideoSelection();
    }

    updateVideoSelection() {
      View.updateListSelection(document, '.vilify-video-item', this.state.selectedIdx);
    }

    flashEndOfList() {
      const content = document.getElementById('vilify-content');
      if (!content) return;
      content.classList.add('flash-end');
      setTimeout(() => content.classList.remove('flash-end'), 150);
    }

    executeVideoItem(idx, newTab) {
      const items = document.querySelectorAll('.vilify-video-item');
      const item = items[idx];
      if (!item) return;
      const url = item.dataset.url;
      if (newTab) Actions.openInNewTab(url);
      else Actions.navigateTo(url);
    }

    // --- Watch Page Rendering ---

    renderWatchPage() {
      const content = document.getElementById('vilify-content');
      if (!content) return;
      View.clear(content);

      const ctx = Scraper.getVideoContext();

      if (!ctx || (!ctx.title && !ctx.channelName)) {
        if (this.state.watchPageRetryCount < CONSTANTS.WATCH_PAGE_MAX_RETRIES) {
          this.state.watchPageRetryCount++;
          content.appendChild(View.div({ className: 'vilify-empty', textContent: 'Loading video info...' }));
          setTimeout(() => this.renderWatchPage(), CONSTANTS.WATCH_PAGE_RETRY_DELAY);
          return;
        }
      }

      this.state.watchPageRetryCount = 0;

      if (!ctx) {
        content.appendChild(View.div({ className: 'vilify-empty', textContent: 'Could not load video info' }));
        return;
      }

      const sidebar = View.div({ className: 'vilify-watch-sidebar' });

      // Subscribe button
      const subBtn = View.button({
        className: ctx.isSubscribed ? 'vilify-subscribe-btn subscribed' : 'vilify-subscribe-btn',
        textContent: ctx.isSubscribed ? 'Subscribed' : 'Subscribe'
      });
      subBtn.addEventListener('click', () => {
        const ytSubBtn = document.querySelector('ytd-subscribe-button-renderer button, #subscribe-button button');
        if (ytSubBtn) ytSubBtn.click();
      });

      const channelInfoParts = [ctx.channelName || 'Unknown channel'];
      if (ctx.uploadDate) channelInfoParts.push(ctx.uploadDate);

      const videoInfo = View.div({ className: 'vilify-watch-info' }, [
        View.el('h1', { className: 'vilify-watch-title', textContent: ctx.title || 'Untitled' }),
        View.div({ className: 'vilify-channel-row' }, [
          View.span({ className: 'vilify-channel-name', textContent: channelInfoParts.join(' · ') }),
          subBtn
        ]),
        View.div({ className: 'vilify-description-hint' }, [
          View.el('kbd', { textContent: 'zo' }), ' description  ',
          View.el('kbd', { textContent: 'f' }), ' chapters'
        ])
      ]);

      sidebar.appendChild(videoInfo);

      // Comments section
      const commentsList = View.div({ className: 'vilify-comments-list' });
      const paginationEl = View.div({ className: 'vilify-comments-pagination', style: 'display: none' }, [
        View.el('kbd', { textContent: 'ctrl+b' }),
        View.span({ className: 'vilify-comments-page-info', textContent: '1 / 1' }),
        View.el('kbd', { textContent: 'ctrl+f' })
      ]);

      const commentsSection = View.div({ className: 'vilify-comments' }, [
        View.div({ className: 'vilify-comments-header', textContent: 'Comments' }),
        commentsList,
        paginationEl
      ]);

      sidebar.appendChild(commentsSection);
      content.appendChild(sidebar);

      // Populate comments
      const comments = Scraper.getComments();
      this.state.commentPage = 0;
      this.state.commentPageStarts = [0];

      if (comments.length === 0) {
        commentsList.appendChild(View.div({ className: 'vilify-empty', textContent: 'Loading comments...' }));
        this.setupCommentObserver();
      } else {
        this.updateCommentsUI(comments);
      }
    }

    updateSubscribeButton(isSubscribed) {
      const ourBtn = document.querySelector('.vilify-subscribe-btn');
      if (ourBtn) {
        ourBtn.textContent = isSubscribed ? 'Subscribed' : 'Subscribe';
        ourBtn.classList.toggle('subscribed', isSubscribed);
      }
    }

    // --- Comments ---

    setupCommentObserver() {
      if (this.commentObserver) return;
      const commentsContainer = document.querySelector('ytd-comments, #comments');
      if (!commentsContainer) return;
      this.triggerCommentLoad();
      this.commentObserver = new MutationObserver(() => {
        const comments = Scraper.getComments();
        if (comments.length > 0) {
          this.updateCommentsUI(comments);
          this.commentObserver.disconnect();
          this.commentObserver = null;
        }
      });
      this.commentObserver.observe(commentsContainer, { childList: true, subtree: true });
    }

    triggerCommentLoad() {
      const commentsSection = document.querySelector('#comments, ytd-comments');
      if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: 'instant', block: 'start' });
        [document.documentElement, document.body, document.querySelector('ytd-app'), document.querySelector('ytd-watch-flexy'), document.querySelector('#page-manager')].forEach(container => {
          if (container) container.dispatchEvent(new Event('scroll', { bubbles: true }));
        });
      }
      this.state.commentLoadAttempts++;
      if (this.state.commentLoadAttempts < CONSTANTS.MAX_COMMENT_LOAD_ATTEMPTS) {
        setTimeout(() => {
          const comments = Scraper.getComments();
          if (comments.length === 0) this.triggerCommentLoad();
          else this.updateCommentsUI(comments);
        }, 1000);
      }
    }

    renderCommentsPage(comments, startIdx, commentsList, maxHeight) {
      View.clear(commentsList);
      const originalOverflow = commentsList.style.overflow;
      commentsList.style.overflow = 'hidden';
      let i = startIdx;
      while (i < comments.length) {
        const comment = comments[i];
        const commentEl = View.el('div', { className: 'vilify-comment' }, [
          View.el('div', { className: 'vilify-comment-author', textContent: '@' + comment.author.replace(/^@/, '') }),
          View.el('div', { className: 'vilify-comment-text', textContent: comment.text })
        ]);
        commentsList.appendChild(commentEl);
        if (commentsList.scrollHeight > maxHeight && i > startIdx) {
          commentsList.removeChild(commentEl);
          break;
        }
        i++;
      }
      commentsList.style.overflow = originalOverflow;
      return i;
    }

    updateCommentsUI(comments) {
      const commentsList = document.querySelector('.vilify-comments-list');
      const paginationEl = document.querySelector('.vilify-comments-pagination');
      if (!commentsList) return;

      if (comments.length === 0) {
        View.clear(commentsList);
        commentsList.appendChild(View.el('div', { className: 'vilify-empty', textContent: 'No comments available' }));
        if (paginationEl) paginationEl.style.display = 'none';
        return;
      }

      const availableHeight = commentsList.clientHeight || 300;
      if (this.state.commentPage < 0) this.state.commentPage = 0;
      while (this.state.commentPageStarts.length <= this.state.commentPage) this.state.commentPageStarts.push(0);

      const startIdx = this.state.commentPageStarts[this.state.commentPage];
      const nextPageStart = this.renderCommentsPage(comments, startIdx, commentsList, availableHeight);

      if (nextPageStart < comments.length) this.state.commentPageStarts[this.state.commentPage + 1] = nextPageStart;

      let totalPages;
      if (nextPageStart >= comments.length) {
        totalPages = this.state.commentPage + 1;
        this.state.commentPageStarts.length = totalPages;
      } else {
        const commentsShown = nextPageStart;
        const avgPerPage = commentsShown / (this.state.commentPage + 1);
        const remainingComments = comments.length - nextPageStart;
        const estimatedRemainingPages = Math.ceil(remainingComments / avgPerPage);
        totalPages = this.state.commentPage + 1 + estimatedRemainingPages;
      }

      if (paginationEl) {
        if (totalPages > 1 || this.state.commentPage > 0) {
          paginationEl.style.display = '';
          const pageInfo = paginationEl.querySelector('.vilify-comments-page-info');
          if (pageInfo) pageInfo.textContent = `${this.state.commentPage + 1} / ${totalPages}`;
        } else {
          paginationEl.style.display = 'none';
        }
      }
    }

    nextCommentPage() {
      const comments = Scraper.getComments();
      const totalPages = this.state.commentPageStarts.length;
      if (this.state.commentPage < totalPages - 1) {
        this.state.commentPage++;
        this.updateCommentsUI(comments);
      } else {
        this.loadMoreComments();
      }
    }

    prevCommentPage() {
      if (this.state.commentPage > 0) {
        this.state.commentPage--;
        this.updateCommentsUI(Scraper.getComments());
      } else {
        View.toast('Already at first page');
      }
    }

    loadMoreComments() {
      if (getPageType() !== 'watch') return;
      View.toast('Loading more comments...');

      ['ytd-comments ytd-continuation-item-renderer', 'ytd-comments #continuations', 'ytd-comments tp-yt-paper-spinner', '#comments ytd-continuation-item-renderer'].forEach(selector => {
        const el = document.querySelector(selector);
        if (el) { el.scrollIntoView({ behavior: 'instant', block: 'center' }); if (el.click) el.click(); }
      });

      [document.querySelector('ytd-comments'), document.querySelector('#comments'), document.documentElement].forEach(target => {
        if (target) {
          if (target === document.documentElement) window.scrollBy(0, 1000);
          else target.scrollTop += 500;
        }
      });

      const scrollEvent = new Event('scroll', { bubbles: true });
      document.dispatchEvent(scrollEvent);
      window.dispatchEvent(scrollEvent);

      const oldCommentCount = Scraper.getComments().length;
      setTimeout(() => {
        const comments = Scraper.getComments();
        if (comments.length > oldCommentCount) {
          const oldPageCount = this.state.commentPageStarts.length;
          this.updateCommentsUI(comments);
          if (this.state.commentPageStarts.length > oldPageCount) {
            this.state.commentPage++;
            this.updateCommentsUI(comments);
          }
          View.toast(`Loaded ${comments.length - oldCommentCount} more (page ${this.state.commentPage + 1}/${this.state.commentPageStarts.length})`);
        } else {
          View.toast('No more comments available');
        }
      }, 2000);
    }

    // --- Filter ---

    openFilter() {
      const wrapper = document.querySelector('.vilify-filter-wrapper');
      const input = document.getElementById('vilify-filter');
      if (!wrapper || !input) return;
      this.state.filterActive = true;
      wrapper.classList.remove('hidden');
      input.value = this.state.filterQuery;
      input.focus();
    }

    closeFilter() {
      const wrapper = document.querySelector('.vilify-filter-wrapper');
      const input = document.getElementById('vilify-filter');
      if (!wrapper || !input) return;
      this.state.filterActive = false;
      wrapper.classList.add('hidden');
      input.blur();
    }

    onFilterInput(e) {
      this.state.filterQuery = e.target.value;
      const videos = Scraper.getVideos();
      this.renderVideoList(videos, this.state.filterQuery);
    }

    onFilterKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.state.filterQuery = '';
        this.closeFilter();
        this.renderVideoList(Scraper.getVideos());
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.closeFilter();
        const items = document.querySelectorAll('.vilify-video-item');
        if (items.length > 0) this.executeVideoItem(this.state.selectedIdx, e.shiftKey);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const items = document.querySelectorAll('.vilify-video-item');
        if (items.length > 0 && this.state.selectedIdx < items.length - 1) {
          this.state.selectedIdx++;
          this.updateVideoSelection();
        } else {
          this.flashEndOfList();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.state.selectedIdx > 0) {
          this.state.selectedIdx--;
          this.updateVideoSelection();
        } else {
          this.flashEndOfList();
        }
      }
    }

    // --- Search ---

    openSearch() {
      const wrapper = document.querySelector('.vilify-search-wrapper');
      const input = document.getElementById('vilify-search');
      if (!wrapper || !input) return;
      this.state.searchActive = true;
      wrapper.classList.remove('hidden');
      input.value = '';
      input.focus();
    }

    closeSearch() {
      const wrapper = document.querySelector('.vilify-search-wrapper');
      const input = document.getElementById('vilify-search');
      if (!wrapper || !input) return;
      this.state.searchActive = false;
      wrapper.classList.add('hidden');
      input.blur();
    }

    onSearchKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeSearch();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const query = e.target.value.trim();
        if (query) {
          this.closeSearch();
          Actions.navigateTo('/results?search_query=' + encodeURIComponent(query));
        }
      }
    }

    // --- Command Palette ---

    createPalette() {
      if (this.paletteOverlay) return;

      this.paletteInputEl = View.input({ id: 'keyring-input', className: 'vilify-modal-input', type: 'text', placeholder: 'Type a command...', autocomplete: 'off', spellcheck: 'false' });
      this.paletteListEl = View.div({ id: 'keyring-list', className: 'vilify-modal-list' });

      const modal = View.div({ id: 'keyring-modal', className: 'vilify-modal' }, [
        View.div({ id: 'keyring-header', className: 'vilify-modal-header' }, [
          View.div({ id: 'keyring-header-logo' }),
          View.div({ className: 'vilify-modal-title', textContent: 'Command Palette' })
        ]),
        View.div({ className: 'vilify-modal-input-wrapper' }, [this.paletteInputEl]),
        this.paletteListEl,
        View.div({ id: 'keyring-footer', className: 'vilify-modal-footer' }, [
          View.createFooterHint(['↑', '↓'], 'navigate'),
          View.createFooterHint(['↵'], 'select'),
          View.createFooterHint(['⇧↵'], 'new tab'),
          View.createFooterHint(['esc'], 'close')
        ])
      ]);

      this.paletteOverlay = View.div({ id: 'keyring-overlay', className: 'vilify-overlay' }, [modal]);
      this.paletteOverlay.addEventListener('click', e => { if (e.target === this.paletteOverlay) this.closePalette(); });
      this.paletteInputEl.addEventListener('input', () => this.onPaletteInput());
      this.paletteInputEl.addEventListener('keydown', e => this.onPaletteKeydown(e));
      document.body.appendChild(this.paletteOverlay);
    }

    openPalette(mode = 'video') {
      if (!this.paletteOverlay) this.createPalette();
      if (mode === 'command') {
        this.paletteInputEl.value = ':';
        this.state.paletteQuery = ':';
      } else {
        this.paletteInputEl.value = '';
        this.state.paletteQuery = '';
      }
      this.state.paletteSelectedIdx = 0;
      this.state.openModal = 'palette';
      this.renderPalette();
      this.paletteOverlay.classList.add('open');
      this.paletteInputEl.focus();
      if (mode === 'command') this.paletteInputEl.setSelectionRange(1, 1);
    }

    closePalette() {
      if (this.paletteOverlay) this.paletteOverlay.classList.remove('open');
      this.state.openModal = null;
    }

    isPaletteOpen() { return this.paletteOverlay?.classList.contains('open'); }

    getItems(query = '') {
      const isCommandMode = query.startsWith(':');
      const searchQuery = isCommandMode ? query.slice(1).trim().toLowerCase() : query.trim().toLowerCase();

      if (isCommandMode) {
        let cmds = Commands.getCommands(this);
        if (searchQuery) {
          cmds = cmds.filter(item => {
            if (item.group) return true;
            const labelMatch = item.label?.toLowerCase().includes(searchQuery);
            const keysMatch = item.keys?.toLowerCase().replace(/\s+/g, '').includes(searchQuery);
            return labelMatch || keysMatch;
          });
          cmds = cmds.filter((item, i, arr) => {
            if (item.group) { const next = arr[i + 1]; return next && !next.group; }
            return true;
          });
        }
        return cmds;
      }

      let videos = Scraper.getVideos();
      if (searchQuery) {
        videos = videos.filter(v => v.title.toLowerCase().includes(searchQuery) || (v.channelName && v.channelName.toLowerCase().includes(searchQuery)));
      }
      if (videos.length === 0) return this.getItems(':' + searchQuery);
      return videos;
    }

    renderPalette() {
      View.clear(this.paletteListEl);
      const items = this.getItems(this.state.paletteQuery);
      const actionable = items.filter(i => !i.group);
      let idx = 0;

      items.forEach(item => {
        if (item.group) {
          this.paletteListEl.appendChild(View.div({ className: 'keyring-group-label', textContent: item.group }));
        } else {
          const isVideo = item.type === 'video';
          const children = [];

          if (isVideo) {
            children.push(View.img({ className: 'keyring-thumbnail', src: item.thumbnailUrl, alt: '' }));
            const metaChildren = [View.span({ className: 'keyring-label', textContent: item.title })];
            const metaParts = [];
            if (item.channelName) metaParts.push(item.channelName);
            if (item.uploadDate) metaParts.push(item.uploadDate);
            if (metaParts.length > 0) metaChildren.push(View.span({ className: 'keyring-meta', textContent: metaParts.join(' · ') }));
            children.push(View.div({ className: 'keyring-video-meta' }, metaChildren));
          } else {
            children.push(View.span({ className: 'keyring-icon', textContent: item.icon || '▸' }));
            children.push(View.span({ className: 'keyring-label', textContent: item.label }));
            if (item.meta) children.push(View.span({ className: 'keyring-meta', textContent: item.meta }));
            if (item.keys) children.push(View.span({ className: 'keyring-shortcut' }, item.keys.split(' ').map(k => View.el('kbd', { textContent: k }))));
          }

          const el = View.div({ className: `keyring-item ${idx === this.state.paletteSelectedIdx ? 'selected' : ''}`, 'data-idx': String(idx), 'data-type': item.type || 'command' }, children);
          this.paletteListEl.appendChild(el);
          el.addEventListener('click', () => this.executePaletteItem(idx));
          el.addEventListener('mouseenter', () => { this.state.paletteSelectedIdx = idx; this.updatePaletteSelection(); });
          idx++;
        }
      });

      if (idx === 0) {
        this.paletteListEl.appendChild(View.div({ className: 'vilify-modal-empty', textContent: 'No matching commands' }));
      }
    }

    updatePaletteSelection() {
      View.updateListSelection(this.paletteListEl, '.keyring-item', this.state.paletteSelectedIdx);
    }

    executePaletteItem(idx, newTab = false) {
      const items = this.getItems(this.state.paletteQuery);
      const actionable = items.filter(i => !i.group);
      const item = actionable[idx];
      if (!item) return;

      this.closePalette();
      if (item.type === 'video') {
        if (newTab) Actions.openInNewTab(item.url);
        else Actions.navigateTo(item.url);
      } else if (item.action) {
        item.action();
      }
    }

    onPaletteInput() {
      this.state.paletteQuery = this.paletteInputEl.value;
      this.state.paletteSelectedIdx = 0;
      this.renderPalette();
    }

    onPaletteKeydown(e) {
      const items = this.getItems(this.state.paletteQuery);
      const actionable = items.filter(i => !i.group);
      const count = actionable.length;

      if (e.key === 'Enter' && this.paletteInputEl.value.trim().toLowerCase() === ':q') {
        e.preventDefault();
        this.closePalette();
        this.exitFocusMode();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (count > 0) { this.state.paletteSelectedIdx = (this.state.paletteSelectedIdx + 1) % count; this.updatePaletteSelection(); }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (count > 0) { this.state.paletteSelectedIdx = (this.state.paletteSelectedIdx - 1 + count) % count; this.updatePaletteSelection(); }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.executePaletteItem(this.state.paletteSelectedIdx, e.shiftKey);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.closePalette();
      }
    }

    // --- Chapter Picker ---

    createChapterPicker() {
      if (this.chapterOverlay) return;

      this.chapterInputEl = View.input({ id: 'vilify-chapter-input', className: 'vilify-modal-input', type: 'text', placeholder: 'Filter chapters...', autocomplete: 'off', spellcheck: 'false' });
      this.chapterListEl = View.div({ id: 'vilify-chapter-list', className: 'vilify-modal-list' });

      const modal = View.div({ id: 'vilify-chapter-modal', className: 'vilify-modal' }, [
        View.div({ id: 'vilify-chapter-header', className: 'vilify-modal-header' }, [
          View.span({ className: 'vilify-modal-title', textContent: 'Jump to Chapter' })
        ]),
        View.div({ className: 'vilify-modal-input-wrapper' }, [this.chapterInputEl]),
        this.chapterListEl,
        View.div({ className: 'vilify-modal-footer' }, [
          View.createFooterHint(['↑', '↓'], 'navigate'),
          View.createFooterHint(['↵'], 'jump'),
          View.createFooterHint(['esc'], 'close')
        ])
      ]);

      this.chapterOverlay = View.div({ id: 'vilify-chapter-overlay', className: 'vilify-overlay' }, [modal]);
      this.chapterOverlay.addEventListener('click', e => { if (e.target === this.chapterOverlay) this.closeChapterPicker(); });
      this.chapterInputEl.addEventListener('input', () => this.onChapterInput());
      this.chapterInputEl.addEventListener('keydown', e => this.onChapterKeydown(e));
      document.body.appendChild(this.chapterOverlay);
    }

    openChapterPicker() {
      const chapters = Scraper.getChapters();
      if (chapters.length === 0) { View.toast('No chapters found'); return; }
      if (!this.chapterOverlay) this.createChapterPicker();
      this.chapters = chapters;
      this.state.chapterSelectedIdx = 0;
      this.state.chapterQuery = '';
      this.state.openModal = 'chapters';
      this.renderChapterList();
      this.chapterOverlay.classList.add('open');
      this.chapterInputEl.value = '';
      this.chapterInputEl.focus();
    }

    closeChapterPicker() {
      if (this.chapterOverlay) this.chapterOverlay.classList.remove('open');
      this.state.openModal = null;
    }

    isChapterPickerOpen() { return this.chapterOverlay?.classList.contains('open'); }

    renderChapterList(filter = '') {
      View.clear(this.chapterListEl);
      let filtered = this.chapters;
      if (filter) {
        const q = filter.toLowerCase();
        filtered = this.chapters.filter(ch => ch.title.toLowerCase().includes(q));
      }

      if (filtered.length === 0) {
        this.chapterListEl.appendChild(View.div({ className: 'vilify-modal-empty', textContent: filter ? `No chapters matching "${filter}"` : 'No chapters found' }));
        return;
      }

      filtered.forEach((chapter, idx) => {
        const children = [];
        if (chapter.thumbnailUrl) children.push(View.img({ className: 'vilify-chapter-thumb', src: chapter.thumbnailUrl, alt: '' }));
        children.push(View.div({ className: 'vilify-chapter-info' }, [
          View.div({ className: 'vilify-chapter-title', textContent: chapter.title }),
          View.div({ className: 'vilify-chapter-time', textContent: chapter.timeText || formatTimestamp(chapter.time) })
        ]));

        const item = View.div({ className: `vilify-chapter-item ${idx === this.state.chapterSelectedIdx ? 'selected' : ''}`, 'data-idx': String(idx), 'data-time': String(chapter.time) }, children);
        this.chapterListEl.appendChild(item);
        item.addEventListener('click', () => this.jumpToChapter(idx, filtered));
        item.addEventListener('mouseenter', () => { this.state.chapterSelectedIdx = idx; this.updateChapterSelection(); });
      });
    }

    updateChapterSelection() {
      View.updateListSelection(this.chapterListEl, '.vilify-chapter-item', this.state.chapterSelectedIdx);
    }

    jumpToChapter(idx, filteredList = null) {
      const list = filteredList || this.chapters;
      const chapter = list[idx];
      if (!chapter) return;
      const video = Actions.getVideo();
      if (video) { video.currentTime = chapter.time; View.toast(`Jumped to: ${chapter.title}`); }
      this.closeChapterPicker();
    }

    onChapterInput() {
      this.state.chapterSelectedIdx = 0;
      this.state.chapterQuery = this.chapterInputEl.value;
      this.renderChapterList(this.state.chapterQuery);
    }

    onChapterKeydown(e) {
      const filter = this.chapterInputEl.value;
      let filtered = this.chapters;
      if (filter) {
        const q = filter.toLowerCase();
        filtered = this.chapters.filter(ch => ch.title.toLowerCase().includes(q));
      }
      const count = filtered.length;

      if (e.key === 'Escape') { e.preventDefault(); this.closeChapterPicker(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); if (count > 0) { this.state.chapterSelectedIdx = (this.state.chapterSelectedIdx + 1) % count; this.updateChapterSelection(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (count > 0) { this.state.chapterSelectedIdx = (this.state.chapterSelectedIdx - 1 + count) % count; this.updateChapterSelection(); } }
      else if (e.key === 'Enter') { e.preventDefault(); this.jumpToChapter(this.state.chapterSelectedIdx, filtered); }
    }

    // --- Description Modal ---

    createDescriptionModal() {
      if (this.descOverlay) return;

      const closeBtn = View.button({ id: 'vilify-desc-close', textContent: '×' });
      closeBtn.addEventListener('click', () => this.closeDescriptionModal());

      const modal = View.div({ id: 'vilify-desc-modal', className: 'vilify-modal' }, [
        View.div({ id: 'vilify-desc-header', className: 'vilify-modal-header' }, [
          View.span({ id: 'vilify-desc-title', className: 'vilify-modal-title', textContent: 'Description' }),
          closeBtn
        ]),
        View.div({ id: 'vilify-desc-content' }, [View.div({ id: 'vilify-desc-text' })]),
        View.div({ id: 'vilify-desc-footer', className: 'vilify-modal-footer' }, [
          'Press ', View.el('kbd', { textContent: 'zc' }), ' or ', View.el('kbd', { textContent: 'Esc' }), ' to close'
        ])
      ]);

      this.descOverlay = View.div({ id: 'vilify-desc-overlay', className: 'vilify-overlay' }, [modal]);
      this.descOverlay.addEventListener('click', e => { if (e.target === this.descOverlay) this.closeDescriptionModal(); });
      document.body.appendChild(this.descOverlay);
    }

    openDescriptionModal() {
      if (getPageType() !== 'watch') { View.toast('No description on this page'); return; }
      const description = Scraper.getDescription();
      if (!description) { View.toast('No description available'); return; }
      if (!this.descOverlay) this.createDescriptionModal();
      const textEl = document.getElementById('vilify-desc-text');
      if (textEl) textEl.textContent = description;
      this.state.openModal = 'description';
      this.descOverlay.classList.add('open');
    }

    closeDescriptionModal() {
      if (this.descOverlay) this.descOverlay.classList.remove('open');
      this.state.openModal = null;
    }

    isDescriptionModalOpen() { return this.descOverlay?.classList.contains('open'); }

    // --- Content Polling ---

    startContentPolling() {
      this.stopContentPolling();
      let lastVideoCount = 0;
      const poll = () => {
        if (getPageType() === 'watch') { this.stopContentPolling(); return; }
        const currentCount = document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-playlist-video-renderer, yt-lockup-view-model').length;
        const isLoading = !!document.querySelector('ytd-continuation-item-renderer, tp-yt-paper-spinner, #spinner, ytd-ghost-grid-renderer, ytd-rich-grid-renderer[is-loading], .ytd-ghost-grid-renderer');
        if (currentCount !== lastVideoCount && !isLoading) {
          lastVideoCount = currentCount;
          if (currentCount > 0) this.onContentUpdate();
        }
        this.pollTimer = setTimeout(poll, CONSTANTS.POLL_INTERVAL_MS);
      };
      poll();
    }

    stopContentPolling() {
      if (this.pollTimer) { clearTimeout(this.pollTimer); this.pollTimer = null; }
    }

    onContentUpdate() {
      if (!this.state.focusModeActive || this.state.filterActive || this.state.searchActive) return;
      if (getPageType() === 'watch') return;
      const videos = Scraper.getVideos();
      const currentItems = document.querySelectorAll('.vilify-video-item').length;
      if (videos.length > currentItems) this.renderVideoList(videos);
    }

    loadMoreVideos() {
      if (!supportsLoadMore(getPageType())) { this.flashEndOfList(); return; }
      View.toast('Loading more videos...');
      const oldVideoCount = Scraper.getVideos().length;

      ['ytd-continuation-item-renderer', '#continuations', 'tp-yt-paper-spinner', 'ytd-rich-grid-renderer ytd-continuation-item-renderer', 'ytd-section-list-renderer ytd-continuation-item-renderer'].forEach(selector => {
        const el = document.querySelector(selector);
        if (el) { el.scrollIntoView({ behavior: 'instant', block: 'center' }); if (el.click) el.click(); }
      });

      [document.querySelector('ytd-browse'), document.querySelector('ytd-search'), document.querySelector('ytd-section-list-renderer'), document.querySelector('#contents'), document.documentElement].forEach(target => {
        if (target) {
          if (target === document.documentElement) window.scrollBy(0, 2000);
          else target.scrollTop += 1000;
        }
      });

      const scrollEvent = new Event('scroll', { bubbles: true });
      document.dispatchEvent(scrollEvent);
      window.dispatchEvent(scrollEvent);

      setTimeout(() => {
        const videos = Scraper.getVideos();
        if (videos.length > oldVideoCount) {
          const newCount = videos.length - oldVideoCount;
          View.toast(`Loaded ${newCount} more video${newCount === 1 ? '' : 's'}`);
          this.state.selectedIdx = oldVideoCount;
          this.renderVideoList(videos, this.state.filterQuery);
        } else {
          View.toast('No more videos available');
          this.flashEndOfList();
        }
      }, 1500);
    }

    // --- Navigation ---

    setupNavigationObserver() {
      if (this.observer || !document.body) return;
      this.observer = new MutationObserver(() => {
        if (location.href !== this.state.lastUrl) {
          this.state.lastUrl = location.href;
          this.onNavigate();
        }
        if (!this.state.settingsApplied && getPageType() === 'watch') {
          const video = Actions.getVideo();
          if (video && video.readyState >= 1) {
            Actions.applyDefaultSettings();
            this.state.settingsApplied = true;
          }
        }
      });
      this.observer.observe(document.body, { childList: true, subtree: true });
    }

    onNavigate() {
      this.stopContentPolling();
      if (this.isPaletteOpen()) this.closePalette();
      if (this.state.filterActive) { this.state.filterQuery = ''; this.closeFilter(); }
      if (this.state.searchActive) this.closeSearch();
      this.state.settingsApplied = false;
      this.state.selectedIdx = 0;
      this.state.watchPageRetryCount = 0;
      this.state.commentPage = 0;
      if (this.commentObserver) { this.commentObserver.disconnect(); this.commentObserver = null; }
      this.state.commentLoadAttempts = 0;

      if (this.state.focusModeActive) {
        const content = document.getElementById('vilify-content');
        if (content) { View.clear(content); content.appendChild(View.div({ className: 'vilify-empty', textContent: 'Loading...' })); }
        this.waitForYouTubeContent().then(() => this.initFocusMode());
      }
      console.log('[Vilify] Navigated to:', location.pathname);
    }

    // --- Global Event Handling ---

    bindGlobalEvents() {
      window.addEventListener('popstate', () => {
        if (location.href !== this.state.lastUrl) {
          this.state.lastUrl = location.href;
          this.onNavigate();
        }
      });

      document.addEventListener('keydown', e => {
        const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
        const isYouTubeSearch = isInput && (e.target.id === 'search' || e.target.closest('ytd-searchbox') || e.target.closest('#search-form'));

        if (e.key === 'Escape' && isYouTubeSearch) {
          e.preventDefault();
          e.stopPropagation();
          e.target.blur();
          View.toast('Exited search');
          return;
        }

        if (isInput && e.target !== this.paletteInputEl) return;

        // Escape to close modals
        if (e.key === 'Escape') {
          if (this.isDescriptionModalOpen()) { e.preventDefault(); this.closeDescriptionModal(); return; }
          if (this.isChapterPickerOpen()) { e.preventDefault(); this.closeChapterPicker(); return; }
          if (this.isPaletteOpen()) { e.preventDefault(); this.closePalette(); return; }
        }

        // Ctrl+f/b for comment pagination
        if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
          if ((e.key === 'f' || e.key === 'b') && this.state.focusModeActive && getPageType() === 'watch' && !this.isPaletteOpen() && !this.isChapterPickerOpen() && !this.isDescriptionModalOpen()) {
            e.preventDefault();
            if (e.key === 'f') this.nextCommentPage();
            else this.prevCommentPage();
            return;
          }
        }

        // Vim-style sequences
        if (!this.isPaletteOpen() && !this.isChapterPickerOpen() && !this.isDescriptionModalOpen() && !isInput) {
          if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

          // Single-key actions (Shift+Y, Shift+M)
          const singleKeyActions = Commands.getSingleKeyActions();
          if (singleKeyActions[e.key]) {
            e.preventDefault();
            singleKeyActions[e.key]();
            this.state.keySeq = '';
            return;
          }

          // ZZ to exit focus mode
          if (this.state.focusModeActive && this.state.keySeq === 'Z' && e.key === 'Z') {
            e.preventDefault();
            this.exitFocusMode();
            this.state.keySeq = '';
            return;
          }

          // j/k navigation in focus mode (listing pages)
          if (this.state.focusModeActive && !this.isPaletteOpen() && !this.state.filterActive && getPageType() !== 'watch') {
            const items = document.querySelectorAll('.vilify-video-item');
            const count = items.length;
            if (e.key === 'j' || e.key === 'ArrowDown') {
              e.preventDefault();
              if (count > 0) {
                if (this.state.selectedIdx < count - 1) { this.state.selectedIdx++; this.updateVideoSelection(); }
                else this.loadMoreVideos();
              }
              return;
            }
            if (e.key === 'k' || e.key === 'ArrowUp') {
              e.preventDefault();
              if (count > 0) {
                if (this.state.selectedIdx > 0) { this.state.selectedIdx--; this.updateVideoSelection(); }
                else this.flashEndOfList();
              }
              return;
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              this.executeVideoItem(this.state.selectedIdx, e.shiftKey);
              return;
            }
          }

          clearTimeout(this.keyTimer);
          const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
          this.state.keySeq += key;
          this.keyTimer = setTimeout(() => { this.state.keySeq = ''; }, CONSTANTS.KEY_SEQ_TIMEOUT_MS);

          const sequences = Commands.getKeySequences(this);
          if (sequences[this.state.keySeq]) {
            e.preventDefault();
            sequences[this.state.keySeq]();
            this.state.keySeq = '';
            return;
          }

          const hasPrefix = Object.keys(sequences).some(s => s.startsWith(this.state.keySeq));
          if (!hasPrefix) this.state.keySeq = '';
        }
      }, true);
    }
  }

  // =============================================================================
  // MAIN ENTRY
  // =============================================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App());
  } else {
    new App();
  }

  console.log('[Vilify] YouTube focus mode loaded');

})();
