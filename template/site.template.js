// ==UserScript==
// @name         Vilify - [SITE_NAME]
// @namespace    https://github.com/shihabdider/vilify
// @version      0.1.0
// @description  Vim-style command palette for [SITE_NAME]
// @author       [YOUR_NAME]
// @updateURL    https://raw.githubusercontent.com/shihabdider/vilify/main/sites/[site].user.js
// @downloadURL  https://raw.githubusercontent.com/shihabdider/vilify/main/sites/[site].user.js
// @match        [MATCH_PATTERN]
// @grant        GM_setClipboard
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // ============================================
  // TODO: Define your theme CSS
  // ============================================
  // Use CSS variables that match the site's design language.
  // Example from YouTube (dark theme, red accents):
  //   --yt-bg-primary: #0f0f0f;
  //   --yt-red: #ff0000;
  //
  // Inspect the site to find:
  // - Background colors (primary, secondary, hover states)
  // - Accent color (for selection highlight)
  // - Text colors (primary, secondary/muted)
  // - Border colors
  // - Font family
  // ============================================
  const CSS = `
    :root {
      /* TODO: Define your color palette */
      --bg-primary: #ffffff;
      --bg-secondary: #f5f5f5;
      --bg-hover: #e5e5e5;
      --text-primary: #333333;
      --text-secondary: #666666;
      --accent: #0066cc;
      --border: #dddddd;
      --font: system-ui, sans-serif;
    }

    #vilify-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: none;
      align-items: flex-start;
      justify-content: center;
      padding-top: 15vh;
      z-index: 9999999;
      font-family: var(--font);
    }

    #vilify-overlay.open {
      display: flex;
    }

    #vilify-modal {
      width: 560px;
      max-width: 90vw;
      max-height: 70vh;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    #vilify-header {
      background: var(--bg-secondary);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--border);
    }

    #vilify-header-logo {
      /* TODO: Style your logo to match the site */
      width: 24px;
      height: 24px;
      background: var(--accent);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
    }

    #vilify-header-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
    }

    #vilify-input-wrapper {
      padding: 12px 16px;
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border);
    }

    #vilify-input {
      width: 100%;
      padding: 10px 12px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 14px;
      font-family: var(--font);
      color: var(--text-primary);
      outline: none;
    }

    #vilify-input::placeholder {
      color: var(--text-secondary);
    }

    #vilify-input:focus {
      border-color: var(--accent);
    }

    #vilify-list {
      flex: 1;
      overflow-y: auto;
      max-height: 400px;
    }

    .vilify-group-label {
      padding: 12px 16px 8px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
      background: var(--bg-primary);
    }

    .vilify-item {
      display: flex;
      align-items: center;
      padding: 10px 16px;
      cursor: pointer;
      font-size: 14px;
      color: var(--text-primary);
      background: var(--bg-primary);
    }

    .vilify-item:hover {
      background: var(--bg-hover);
    }

    .vilify-item.selected {
      background: var(--accent);
      color: white;
    }

    .vilify-item.selected .vilify-shortcut kbd {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .vilify-item.selected .vilify-meta {
      color: rgba(255, 255, 255, 0.8);
    }

    .vilify-icon {
      width: 32px;
      height: 32px;
      margin-right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: var(--text-secondary);
      background: var(--bg-secondary);
      border-radius: 6px;
    }

    .vilify-item.selected .vilify-icon {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    /* TODO: If your site shows content items (like videos, emails, etc.),
       add thumbnail/preview styles here. Example:
    
    .vilify-thumbnail {
      width: 80px;
      height: 45px;
      margin-right: 12px;
      border-radius: 6px;
      background: var(--bg-secondary);
      object-fit: cover;
    }
    */

    .vilify-label {
      flex: 1;
    }

    .vilify-meta {
      font-size: 12px;
      color: var(--text-secondary);
      margin-left: 8px;
    }

    .vilify-shortcut {
      margin-left: 12px;
      display: flex;
      gap: 4px;
    }

    .vilify-shortcut kbd {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      font-family: var(--font);
      color: var(--text-secondary);
    }

    #vilify-footer {
      display: flex;
      gap: 20px;
      padding: 10px 16px;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border);
      font-size: 12px;
      color: var(--text-secondary);
    }

    #vilify-footer kbd {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 2px 6px;
      margin: 0 4px;
      font-size: 11px;
    }

    .vilify-empty {
      padding: 40px;
      text-align: center;
      color: var(--text-secondary);
      font-size: 14px;
    }

    .vilify-toast {
      position: fixed;
      bottom: 32px;
      right: 32px;
      background: var(--bg-primary);
      color: var(--text-primary);
      padding: 16px 24px;
      border-radius: 12px;
      border: 1px solid var(--border);
      font-size: 15px;
      font-weight: 500;
      font-family: var(--font);
      z-index: 10000000;
      opacity: 0;
      transition: opacity 0.2s;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    .vilify-toast.show {
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
  // Utilities (keep these as-is)
  // ============================================
  function escapeHtml(str) {
    const el = document.createElement('div');
    el.textContent = str || '';
    return el.innerHTML;
  }

  function showToast(message) {
    let toast = document.querySelector('.vilify-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'vilify-toast';
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

  // ============================================
  // TODO: Context Detection
  // ============================================
  // Implement functions to detect what page/state the user is on.
  // This enables context-aware commands.
  //
  // Example questions to answer:
  // - What type of page is this? (home, detail view, search, etc.)
  // - What item is the user viewing? (video, email, document, etc.)
  // - What actions are available? (like, save, delete, etc.)
  // ============================================
  
  function getPageType() {
    // TODO: Detect page type from URL or DOM
    // Example:
    // const path = location.pathname;
    // if (path === '/') return 'home';
    // if (path.startsWith('/item/')) return 'detail';
    // return 'other';
    return 'home';
  }

  function getContext() {
    // TODO: Extract relevant context from the current page
    // Return null if no special context
    // Example for a video site:
    // return { videoId, title, channelName, ... }
    return null;
  }

  // ============================================
  // TODO: Content Scraping (optional)
  // ============================================
  // If your site shows lists of items (videos, emails, posts),
  // implement scraping to show them in the palette.
  //
  // Return an array of objects with at least:
  // - type: 'content'
  // - label: string (title)
  // - action: function (what happens on select)
  //
  // Optional fields:
  // - meta: string (subtitle, e.g., channel name)
  // - thumbnailUrl: string (for visual items)
  // ============================================

  function scrapeContent() {
    // TODO: Implement content scraping or remove if not needed
    // Example:
    // const items = document.querySelectorAll('.item-selector');
    // return Array.from(items).map(el => ({
    //   type: 'content',
    //   label: el.querySelector('.title')?.textContent,
    //   meta: el.querySelector('.subtitle')?.textContent,
    //   action: () => el.querySelector('a')?.click()
    // }));
    return [];
  }

  // ============================================
  // TODO: Site-Specific Actions
  // ============================================
  // Implement helper functions for site-specific actions.
  // These are called by commands and key sequences.
  // ============================================

  function navigateTo(path) {
    location.href = path;
  }

  function openInNewTab(url) {
    window.open(url, '_blank');
  }

  // TODO: Add more site-specific action functions
  // Examples:
  // - togglePlayPause() for media sites
  // - archiveEmail() for email sites
  // - upvote() for social sites

  // ============================================
  // TODO: Define Commands
  // ============================================
  // Commands appear in the palette. Each command has:
  // - label: string (display name)
  // - icon: string (emoji or character)
  // - action: function (what to do)
  // - keys: string (optional, shows shortcut hint, e.g., 'G H')
  //
  // Group commands with: { group: 'Group Name' }
  // ============================================

  function getCommands() {
    const pageType = getPageType();
    const ctx = getContext();
    const cmds = [];

    // Navigation commands (always available)
    cmds.push({ group: 'Navigation' });
    cmds.push({ label: 'Home', icon: '🏠', action: () => navigateTo('/'), keys: 'G H' });
    // TODO: Add more navigation commands

    // Context-specific commands
    if (ctx) {
      cmds.push({ group: 'Actions' });
      // TODO: Add context-aware commands
      // Example:
      // cmds.push({ label: 'Like', icon: '❤️', action: () => like(ctx.id) });
    }

    return cmds;
  }

  // ============================================
  // TODO: Define Key Sequences
  // ============================================
  // Vim-style key sequences that work when palette is closed.
  // Format: 'keys': () => action()
  //
  // Common patterns:
  // - 'g' prefix for "go to" navigation
  // - 'y' prefix for "yank" (copy)
  // - Single keys for frequent actions
  // ============================================

  function getKeySequences() {
    const ctx = getContext();
    
    const sequences = {
      // Palette triggers
      '/': () => openPalette('content'),   // Open with content items
      ':': () => openPalette('command'),   // Open with commands
      
      // Navigation: g + key
      'gh': () => navigateTo('/'),
      // TODO: Add more sequences
    };

    // Context-specific sequences
    if (ctx) {
      // TODO: Add context-aware sequences
      // Example:
      // sequences['yy'] = () => copyToClipboard(ctx.url);
    }

    return sequences;
  }

  // Single-key actions (including Shift+ modifiers)
  function getSingleKeyActions() {
    const ctx = getContext();
    const actions = {};
    
    // TODO: Add single-key actions
    // Example:
    // if (ctx) {
    //   actions['Y'] = () => copyToClipboard(ctx.urlWithTimestamp);
    // }
    
    return actions;
  }

  // ============================================
  // Item Retrieval
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

    // Default mode: show scraped content
    let content = scrapeContent();

    if (searchQuery) {
      content = content.filter(item =>
        item.label?.toLowerCase().includes(searchQuery) ||
        item.meta?.toLowerCase().includes(searchQuery)
      );
    }

    // If no content or no matches, fall back to commands
    if (content.length === 0) {
      return getItems(':' + searchQuery);
    }

    return content;
  }

  // ============================================
  // Rendering
  // ============================================
  function render() {
    while (listEl.firstChild) {
      listEl.removeChild(listEl.firstChild);
    }

    let idx = 0;

    for (const item of items) {
      if (item.group) {
        listEl.appendChild(createElement('div', { 
          className: 'vilify-group-label', 
          textContent: item.group 
        }));
      } else {
        const isContent = item.type === 'content';
        const itemEl = createElement('div', {
          className: `vilify-item ${idx === selectedIdx ? 'selected' : ''}`,
          'data-idx': String(idx)
        });

        if (isContent && item.thumbnailUrl) {
          // Content item with thumbnail
          const img = createElement('img', {
            className: 'vilify-thumbnail',
            src: item.thumbnailUrl,
            alt: ''
          });
          itemEl.appendChild(img);
        } else {
          // Command item with icon
          itemEl.appendChild(createElement('span', {
            className: 'vilify-icon',
            textContent: item.icon || '▸'
          }));
        }

        itemEl.appendChild(createElement('span', {
          className: 'vilify-label',
          textContent: item.label
        }));

        if (item.meta) {
          itemEl.appendChild(createElement('span', {
            className: 'vilify-meta',
            textContent: item.meta
          }));
        }

        if (item.keys) {
          const shortcut = createElement('span', { className: 'vilify-shortcut' });
          for (const key of item.keys.split(' ')) {
            shortcut.appendChild(createElement('kbd', { textContent: key }));
          }
          itemEl.appendChild(shortcut);
        }

        listEl.appendChild(itemEl);
        idx++;
      }
    }

    if (idx === 0) {
      listEl.appendChild(createElement('div', { 
        className: 'vilify-empty', 
        textContent: 'No results' 
      }));
    }

    bindItemEvents();
  }

  function bindItemEvents() {
    listEl.querySelectorAll('.vilify-item').forEach(el => {
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
    listEl.querySelectorAll('.vilify-item').forEach(el => {
      const i = parseInt(el.dataset.idx, 10);
      el.classList.toggle('selected', i === selectedIdx);
    });
    const sel = listEl.querySelector('.vilify-item.selected');
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

    if (item.url) {
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
  function injectStyles() {
    if (document.getElementById('vilify-styles')) return;
    const style = document.createElement('style');
    style.id = 'vilify-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  injectStyles();

  function createUI() {
    injectStyles();

    overlay = createElement('div', { id: 'vilify-overlay' });
    const modal = createElement('div', { id: 'vilify-modal' });

    // Header - TODO: Customize the logo
    const header = createElement('div', { id: 'vilify-header' }, [
      createElement('div', { id: 'vilify-header-logo', textContent: 'V' }),
      createElement('div', { id: 'vilify-header-title', textContent: 'Command Palette' })
    ]);

    // Input
    inputEl = createElement('input', {
      id: 'vilify-input',
      type: 'text',
      placeholder: 'Type a command...',
      autocomplete: 'off',
      spellcheck: 'false'
    });
    const inputWrapper = createElement('div', { id: 'vilify-input-wrapper' }, [inputEl]);

    // List
    listEl = createElement('div', { id: 'vilify-list' });

    // Footer
    const footer = createElement('div', { id: 'vilify-footer' }, [
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
  function openPalette(mode = 'content') {
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
    const isInput = e.target.tagName === 'INPUT' || 
                    e.target.tagName === 'TEXTAREA' || 
                    e.target.isContentEditable;

    // TODO: Handle site-specific input elements (like search boxes)
    // Example: Allow Escape to blur search box
    // if (e.key === 'Escape' && isInput && e.target.matches('.search-input')) {
    //   e.target.blur();
    //   return;
    // }

    if (isInput && e.target !== inputEl) {
      return;
    }

    if (e.key === 'Escape' && isPaletteOpen()) {
      e.preventDefault();
      closePalette();
      return;
    }

    // Vim-style sequences when palette is closed
    if (!isPaletteOpen() && !isInput) {
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
      
      if (sequences[keySeq]) {
        e.preventDefault();
        sequences[keySeq]();
        keySeq = '';
        return;
      }
      
      const hasPrefix = Object.keys(sequences).some(s => s.startsWith(keySeq));
      if (!hasPrefix) {
        keySeq = '';
      }
    }
  }, true);

  // ============================================
  // SPA Navigation Detection
  // ============================================
  // Most modern sites are SPAs. This detects navigation without page reload.
  let lastUrl = location.href;

  function onNavigate() {
    if (isPaletteOpen()) {
      closePalette();
    }
    // TODO: Clear any caches, reset state as needed
    console.log('[Vilify] Navigated to:', location.pathname);
  }

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      onNavigate();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('popstate', () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      onNavigate();
    }
  });

  // ============================================
  // Initialize
  // ============================================
  console.log('[Vilify] Loaded for [SITE_NAME]');

})();
