# Template and Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the repo to support a plugin ecosystem where contributors can easily add new sites by copying a well-documented template, while preserving bespoke implementations and easy Tampermonkey installation.

**Architecture:** Each site is a standalone userscript in `sites/`. A template file provides the boilerplate with TODO markers. Documentation explains patterns and contribution workflow. Installation remains one-click via GitHub raw URLs.

**Tech Stack:** Tampermonkey userscripts, vanilla JS, GitHub raw URLs for updates.

---

## Task 1: Create Directory Structure

**Files:**
- Create: `sites/` directory
- Move: `vilify-youtube.user.js` → `sites/youtube.user.js`

**Step 1: Create sites directory and move YouTube**

```bash
cd /Users/user1/projects/vilify
mkdir -p sites
git mv vilify-youtube.user.js sites/youtube.user.js
```

**Step 2: Update the @updateURL and @downloadURL in youtube.user.js**

Edit `sites/youtube.user.js` lines 7-8, change:
```javascript
// @updateURL    https://raw.githubusercontent.com/shihabdider/vilify/main/vilify-youtube.user.js
// @downloadURL  https://raw.githubusercontent.com/shihabdider/vilify/main/vilify-youtube.user.js
```
To:
```javascript
// @updateURL    https://raw.githubusercontent.com/shihabdider/vilify/main/sites/youtube.user.js
// @downloadURL  https://raw.githubusercontent.com/shihabdider/vilify/main/sites/youtube.user.js
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: move youtube userscript to sites/ directory"
```

---

## Task 2: Create the Site Template

**Files:**
- Create: `template/site.template.js`

**Step 1: Create template directory**

```bash
mkdir -p template
```

**Step 2: Create the template file**

Create `template/site.template.js`:

```javascript
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
```

**Step 3: Commit**

```bash
git add template/
git commit -m "feat: add site template with documented TODOs"
```

---

## Task 3: Create Contributing Documentation

**Files:**
- Create: `docs/contributing.md`

**Step 1: Create the contributing guide**

Create `docs/contributing.md`:

```markdown
# Contributing a New Site to Vilify

This guide walks you through adding support for a new website.

## Overview

Each site in Vilify is a standalone Tampermonkey userscript. You'll create one file that contains everything: theme, commands, scraping logic, and keybindings.

**Time estimate:** 2-4 hours for a basic implementation

## Step 1: Copy the Template

```bash
cp template/site.template.js sites/[sitename].user.js
```

Replace `[sitename]` with your site's name in lowercase (e.g., `reddit`, `twitter`, `notion`).

## Step 2: Update Userscript Metadata

Edit the header block at the top:

```javascript
// @name         Vilify - [Your Site Name]
// @match        https://www.yoursite.com/*
// @updateURL    https://raw.githubusercontent.com/shihabdider/vilify/main/sites/[sitename].user.js
// @downloadURL  https://raw.githubusercontent.com/shihabdider/vilify/main/sites/[sitename].user.js
```

The `@match` pattern determines which URLs your script runs on. See [Tampermonkey match patterns](https://www.tampermonkey.net/documentation.php#_match).

## Step 3: Design Your Theme

Inspect the target site and extract its design language:

1. Open DevTools → Elements
2. Find the main colors: backgrounds, text, accents, borders
3. Identify the font family
4. Update the CSS variables in your script

```javascript
const CSS = `
  :root {
    --bg-primary: #1a1a1b;      /* Main background */
    --bg-secondary: #272729;    /* Card/input background */
    --bg-hover: #3a3a3c;        /* Hover state */
    --text-primary: #d7dadc;    /* Main text */
    --text-secondary: #818384;  /* Muted text */
    --accent: #ff4500;          /* Brand color for selection */
    --border: #343536;          /* Borders */
    --font: 'IBM Plex Sans', sans-serif;
  }
  ...
`;
```

**Tip:** The accent color is used for the selected item highlight. Use the site's primary brand color.

## Step 4: Implement Context Detection

Context detection lets you show different commands based on what page the user is on.

```javascript
function getPageType() {
  const path = location.pathname;
  
  if (path === '/') return 'home';
  if (path.startsWith('/r/')) return 'subreddit';
  if (path.includes('/comments/')) return 'post';
  // ...
  return 'other';
}

function getContext() {
  const pageType = getPageType();
  
  if (pageType === 'post') {
    return {
      postId: extractPostId(),
      title: document.querySelector('h1')?.textContent,
      subreddit: extractSubreddit(),
    };
  }
  
  return null;
}
```

## Step 5: Define Commands

Commands are the heart of your implementation. Think about:

- **Navigation:** Where do users commonly go?
- **Actions:** What do users frequently do on this site?
- **Context actions:** What's relevant to the current page?

```javascript
function getCommands() {
  const ctx = getContext();
  const cmds = [];

  // Always available
  cmds.push({ group: 'Navigation' });
  cmds.push({ label: 'Home', icon: '🏠', action: () => navigateTo('/'), keys: 'G H' });
  cmds.push({ label: 'Popular', icon: '🔥', action: () => navigateTo('/r/popular'), keys: 'G P' });

  // Context-specific
  if (ctx?.postId) {
    cmds.push({ group: 'Post Actions' });
    cmds.push({ label: 'Upvote', icon: '⬆', action: () => upvote(ctx.postId), keys: 'U' });
    cmds.push({ label: 'Save', icon: '🔖', action: () => save(ctx.postId), keys: 'S' });
    cmds.push({ label: 'Copy Link', icon: '🔗', action: () => copyToClipboard(ctx.url) });
  }

  return cmds;
}
```

## Step 6: Define Key Sequences

Key sequences work when the palette is closed. Follow vim conventions:

| Prefix | Meaning | Example |
|--------|---------|---------|
| `g` | Go to | `gh` = go home |
| `y` | Yank (copy) | `yy` = copy URL |
| Single key | Frequent action | `u` = upvote |

```javascript
function getKeySequences() {
  return {
    '/': () => openPalette('content'),
    ':': () => openPalette('command'),
    'gh': () => navigateTo('/'),
    'gp': () => navigateTo('/r/popular'),
    'yy': () => copyToClipboard(location.href),
  };
}
```

## Step 7: Content Scraping (Optional)

If the site shows lists (posts, videos, emails), scrape them for the palette:

```javascript
function scrapeContent() {
  const posts = document.querySelectorAll('[data-testid="post-container"]');
  
  return Array.from(posts).slice(0, 15).map(el => {
    const title = el.querySelector('h3')?.textContent;
    const link = el.querySelector('a[href*="/comments/"]')?.href;
    
    return {
      type: 'content',
      label: title,
      meta: el.querySelector('[data-testid="subreddit-name"]')?.textContent,
      url: link,
    };
  });
}
```

## Step 8: Test Locally

1. Open Tampermonkey → Create New Script
2. Paste your entire script
3. Save and refresh the target site
4. Test all commands and keybindings

**Testing checklist:**
- [ ] Palette opens with `/` and `:`
- [ ] Commands filter correctly
- [ ] Arrow keys navigate
- [ ] Enter executes
- [ ] Escape closes
- [ ] Key sequences work outside palette
- [ ] Theme looks native to the site
- [ ] Works on different page types

## Step 9: Submit a Pull Request

1. Fork the repo
2. Add your file to `sites/`
3. Update `README.md` to list your site
4. Submit PR with:
   - Screenshot of the palette on the site
   - List of implemented commands
   - Any known limitations

## Tips

### Dealing with SPAs

Most modern sites don't do full page reloads. The template includes SPA detection that watches for URL changes. If you need to clear caches or reset state on navigation, do it in `onNavigate()`.

### Handling CSP Restrictions

Some sites (like YouTube) block `innerHTML`. The template uses `createElement()` which works everywhere. Stick to this pattern.

### Finding Reliable Selectors

Sites often have obfuscated class names. Look for:
- `data-testid` attributes
- `id` attributes
- Semantic HTML (`article`, `nav`, `main`)
- ARIA attributes (`aria-label`, `role`)

Avoid relying on class names that look auto-generated (e.g., `css-1a2b3c`).

### Debugging

Add `console.log('[Vilify]', ...)` statements. Check the browser console for errors. The template logs navigation events by default.

## Examples

Study the existing implementations:
- `sites/youtube.user.js` - Video site with playback controls, content scraping
- (more to come)

## Questions?

Open an issue on GitHub or check existing site implementations for patterns.
```

**Step 2: Commit**

```bash
git add docs/contributing.md
git commit -m "docs: add contributing guide for new sites"
```

---

## Task 4: Create Patterns Documentation

**Files:**
- Create: `docs/patterns.md`

**Step 1: Create patterns reference**

Create `docs/patterns.md`:

```markdown
# Vilify Patterns Reference

Common patterns used across Vilify site implementations.

## Keyboard Sequence Handler

Detects vim-style multi-key sequences (e.g., `gh` for "go home"):

```javascript
let keySeq = '';
let keyTimer = null;
const KEY_SEQ_TIMEOUT_MS = 500;

document.addEventListener('keydown', e => {
  // Skip if typing in an input
  const isInput = e.target.tagName === 'INPUT' || 
                  e.target.tagName === 'TEXTAREA' || 
                  e.target.isContentEditable;
  if (isInput) return;

  // Skip modifier keys
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

  // Build sequence
  clearTimeout(keyTimer);
  keySeq += e.key.toLowerCase();
  keyTimer = setTimeout(() => { keySeq = ''; }, KEY_SEQ_TIMEOUT_MS);

  // Check for match
  const sequences = { 'gh': () => goHome(), 'gs': () => goSearch() };
  if (sequences[keySeq]) {
    e.preventDefault();
    sequences[keySeq]();
    keySeq = '';
  }
}, true); // Capture phase to intercept before site handlers
```

## SPA Navigation Detection

Detects client-side navigation in single-page apps:

```javascript
let lastUrl = location.href;

const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    onNavigate();
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Also handle back/forward buttons
window.addEventListener('popstate', () => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    onNavigate();
  }
});
```

## CSP-Safe DOM Creation

Avoids `innerHTML` which is blocked by some sites' Content Security Policy:

```javascript
function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'textContent') el.textContent = val;
    else if (key === 'className') el.className = val;
    else el.setAttribute(key, val);
  }
  for (const child of children) {
    el.appendChild(typeof child === 'string' 
      ? document.createTextNode(child) 
      : child);
  }
  return el;
}
```

## Toast Notifications

Non-intrusive feedback for user actions:

```javascript
function showToast(message, duration = 2000) {
  let toast = document.querySelector('.vilify-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'vilify-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}
```

## Clipboard with Tampermonkey

Use `GM_setClipboard` for reliable clipboard access:

```javascript
// Requires: @grant GM_setClipboard

function copyToClipboard(text) {
  if (typeof GM_setClipboard === 'function') {
    GM_setClipboard(text);
    showToast('Copied');
  } else {
    // Fallback for testing outside Tampermonkey
    navigator.clipboard.writeText(text)
      .then(() => showToast('Copied'))
      .catch(() => showToast('Copy failed'));
  }
}
```

## Content Scraping with Caching

Cache scraped content to avoid re-querying DOM:

```javascript
const CACHE_MS = 2000;
let cache = null;
let cacheTime = 0;

function scrapeContent() {
  if (cache && Date.now() - cacheTime < CACHE_MS) {
    return cache;
  }
  
  // ... scraping logic ...
  
  cache = results;
  cacheTime = Date.now();
  return results;
}

function clearCache() {
  cache = null;
  cacheTime = 0;
}
```

## Filtering with Empty Group Removal

Filter items while cleaning up empty groups:

```javascript
function filterItems(items, query) {
  const q = query.toLowerCase();
  
  // Filter
  let filtered = items.filter(item => {
    if (item.group) return true;
    return item.label?.toLowerCase().includes(q);
  });
  
  // Remove empty groups
  filtered = filtered.filter((item, i, arr) => {
    if (item.group) {
      const next = arr[i + 1];
      return next && !next.group;
    }
    return true;
  });
  
  return filtered;
}
```

## Handling Site-Specific Inputs

Allow Escape to blur site search boxes:

```javascript
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    // Check if in site's search box
    const searchInput = document.querySelector('#search-input');
    if (document.activeElement === searchInput) {
      e.preventDefault();
      searchInput.blur();
      showToast('Exited search');
      return;
    }
  }
  // ... rest of handler
}, true);
```

## Reliable Selector Strategies

Prefer these selector types (most to least reliable):

1. **IDs:** `#unique-id`
2. **Data attributes:** `[data-testid="post"]`
3. **ARIA:** `[aria-label="Search"]`
4. **Semantic HTML:** `article`, `nav`, `main`
5. **Stable classes:** `.post-title` (human-readable)
6. **Avoid:** `.css-1x2y3z` (auto-generated)

Combine for resilience:

```javascript
const title = el.querySelector('[data-testid="title"], h1.title, .post-title');
```
```

**Step 2: Commit**

```bash
git add docs/patterns.md
git commit -m "docs: add patterns reference for common code"
```

---

## Task 5: Update README

**Files:**
- Modify: `README.md`

**Step 1: Replace README with comprehensive version**

Replace `README.md` with:

```markdown
# Vilify

Bespoke vim-style command palettes for the web.

Unlike generic browser extensions that try to handle all websites with one-size-fits-all solutions, Vilify provides **deep, site-specific integrations**. Each site gets a carefully crafted keyboard-driven experience with native theming.

## Supported Sites

| Site | Install | Description |
|------|---------|-------------|
| YouTube | [Install](https://raw.githubusercontent.com/shihabdider/vilify/main/sites/youtube.user.js) | Video controls, navigation, copy URLs |

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser
2. Click the **Install** link for your site
3. Click "Install" in the Tampermonkey dialog
4. Refresh the site

Scripts auto-update when changes are pushed to this repo.

## Usage

Press `/` to open the command palette with page content (videos, posts, etc.)

Press `:` to open the command palette with commands

### Common Keybindings

| Key | Action |
|-----|--------|
| `/` | Open palette (content) |
| `:` | Open palette (commands) |
| `↑` `↓` | Navigate items |
| `Enter` | Select item |
| `Shift+Enter` | Open in new tab |
| `Escape` | Close palette |
| `g h` | Go home |

Each site has additional keybindings. Open the palette and type to search commands.

## Philosophy

The bespokeness is the point. Generic solutions handle nothing well; focused solutions handle one thing excellently.

Each Vilify implementation:
- **Looks native** — themed to match the site's design
- **Feels native** — commands that make sense for that site
- **Works reliably** — selectors tuned to each site's DOM

## Contributing

Want to add a new site? See [Contributing Guide](docs/contributing.md).

1. Copy `template/site.template.js`
2. Fill in the TODOs
3. Submit a PR

## License

MIT
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with installation links and usage"
```

---

## Task 6: Update Design Doc

**Files:**
- Modify: `docs/design.md`

**Step 1: Update architecture section to reflect new approach**

Edit `docs/design.md`, replace the "Architecture" section (lines ~25-80) with:

```markdown
## Architecture

### Approach: Template + Convention

Rather than a shared library, Vilify uses a **documented template** approach:

```
vilify/
├── sites/
│   ├── youtube.user.js      # Complete, standalone
│   ├── gmail.user.js        # Complete, standalone
│   └── reddit.user.js       # Complete, standalone
│
├── template/
│   └── site.template.js     # Documented skeleton with TODOs
│
├── docs/
│   ├── design.md            # This document
│   ├── contributing.md      # How to add a new site
│   ├── patterns.md          # Common code patterns
│   └── plans/               # Implementation plans
│
└── README.md                # Installation links
```

**Why not a shared library?**

1. The "shared" code would be ~100 lines of trivial utilities
2. Each site needs different rendering (thumbnails vs icons vs previews)
3. Abstraction adds complexity without reducing code
4. Sites can evolve independently

**What IS shared:**

- **Template:** Starting point with boilerplate solved
- **Patterns:** Documented solutions for common problems
- **Conventions:** Consistent UX across sites (keybindings, palette behavior)

### Installation Flow

```
User clicks Install link
    ↓
GitHub raw URL → Tampermonkey
    ↓
Script installed with @updateURL
    ↓
Auto-updates on future changes
```

Each site is a standalone `.user.js` file with:
```javascript
// @updateURL    https://raw.githubusercontent.com/shihabdider/vilify/main/sites/[site].user.js
// @downloadURL  https://raw.githubusercontent.com/shihabdider/vilify/main/sites/[site].user.js
```
```

**Step 2: Commit**

```bash
git add docs/design.md
git commit -m "docs: update design doc with template approach"
```

---

## Task 7: Final Verification

**Step 1: Verify file structure**

```bash
cd /Users/user1/projects/vilify
find . -type f -name "*.js" -o -name "*.md" | grep -v node_modules | sort
```

Expected:
```
./docs/contributing.md
./docs/design.md
./docs/patterns.md
./docs/plans/2026-01-25-template-and-restructure.md
./docs/plans/2026-01-25-video-selection-design.md
./docs/plans/2026-01-25-video-selection.md
./docs/plans/2026-01-25-youtube-command-palette.md
./docs/testing-checklist.md
./README.md
./sites/youtube.user.js
./template/site.template.js
```

**Step 2: Verify YouTube script still has correct URLs**

```bash
head -15 sites/youtube.user.js
```

Verify lines 7-8 point to `sites/youtube.user.js`.

**Step 3: Test template is valid JS**

```bash
node --check template/site.template.js
```

Expected: No output (syntax OK)

**Step 4: Final commit and tag**

```bash
git add -A
git status
git commit -m "chore: complete restructure for plugin ecosystem" --allow-empty
git tag v0.2.0
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Create `sites/` directory, move YouTube |
| 2 | Create `template/site.template.js` |
| 3 | Create `docs/contributing.md` |
| 4 | Create `docs/patterns.md` |
| 5 | Update `README.md` with install links |
| 6 | Update `docs/design.md` |
| 7 | Final verification |

**Result:** A plugin ecosystem where:
- Contributors copy a template and fill in TODOs
- Each site is standalone and fully bespoke
- Installation is one-click via Tampermonkey
- Updates flow automatically from GitHub
