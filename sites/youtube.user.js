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
   * { type: 'video', id: String, title: String, channel: String,
   * uploadDate: String, url: String, thumb: String }
   */

  /**
   * A Command is a structure:
   * { type: 'command', label: String, icon: String, action: Function, keys: String }
   */

  /**
   * An Item is one of:
   * - Video
   * - Command
   */

  /**
   * A Mode is one of:
   * - 'HIDDEN'  : The default YouTube view
   * - 'FOCUS'   : The custom TUI list view
   * - 'PALETTE' : The command palette popup
   * - 'WATCH'   : The video player specific view
   */

  /**
   * WorldState is a structure:
   * {
   * mode: Mode,
   * items: Array<Item>,        // The list of items currently valid for display
   * displayItems: Array<Item>, // The subset of items currently visible (filtered)
   * selectedIndex: Number,     // Index into displayItems
   * filterQuery: String,       // Current user input for filtering
   * loading: Boolean
   * }
   */

  // =============================================================================
  // SECTION 2: CONSTANTS & ASSETS
  // =============================================================================

  const CONSTANTS = {
    POLL_INTERVAL: 500,
    TOAST_DURATION: 2000,
    DEFAULT_RATE: 2.0
  };

  const CSS = `
    :root {
      --bg-1: #002b36; --bg-2: #073642; --bg-3: #0a4a5c;
      --txt-1: #f1f1f1; --txt-2: #aaaaaa; --txt-3: #717171; --txt-accent: #3ea6ff;
      --yt-red: #ff0000;
      --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
    }
    body.vilify-active ytd-app { visibility: hidden !important; }
    .vilify-overlay { position: fixed; inset: 0; background: var(--bg-1); z-index: 9999; font-family: var(--font-mono); display: flex; flex-direction: column; color: var(--txt-2); }
    .vilify-header { padding: 12px; border-bottom: 2px solid var(--bg-3); display: flex; gap: 10px; align-items: center; }
    .vilify-input { background: transparent; border: none; color: var(--txt-1); font-family: inherit; font-size: 14px; flex-grow: 1; outline: none; }
    .vilify-list { flex: 1; overflow-y: auto; padding: 10px 0; }
    .vilify-item { display: flex; padding: 8px 16px; cursor: pointer; border-left: 2px solid transparent; }
    .vilify-item.selected { background: var(--bg-2); border-left-color: var(--yt-red); }
    .vilify-item-thumb { width: 120px; height: 68px; object-fit: cover; margin-right: 12px; background: var(--bg-3); }
    .vilify-item-info { display: flex; flex-direction: column; justify-content: center; }
    .vilify-item-title { color: var(--txt-1); margin-bottom: 4px; font-weight: 500; }
    .vilify-item-meta { font-size: 12px; color: var(--txt-3); }
    .vilify-toast { position: fixed; bottom: 20px; right: 20px; background: var(--bg-2); border: 1px solid var(--bg-3); padding: 8px 16px; z-index: 10000; opacity: 0; transition: opacity 0.2s; }
    .vilify-toast.show { opacity: 1; }
    /* Loading specific */
    body.vilify-loading ytd-app { visibility: hidden !important; }
    #vilify-loading { position: fixed; inset: 0; background: var(--bg-1); z-index: 100000; display: flex; justify-content: center; align-items: center; color: var(--txt-1); font-family: var(--font-mono); }
  `;

  const SELECTORS = {
    videoItems: [
      'ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-compact-video-renderer',
      'ytd-grid-video-renderer', 'yt-lockup-view-model'
    ],
    watch: {
      title: ['h1.ytd-watch-metadata', '#title h1'],
      channel: ['ytd-video-owner-renderer #channel-name a', '#owner #channel-name a']
    }
  };

  // =============================================================================
  // SECTION 3: MODEL FUNCTIONS (Pure Logic)
  // =============================================================================

  /**
   * Calculates the next index in a circular list.
   * @param {Number} current
   * @param {Number} total
   * @param {Number} direction (1 or -1)
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
      if (item.type === 'video') {
        return item.title.toLowerCase().includes(q) || item.channel.toLowerCase().includes(q);
      }
      if (item.type === 'command') {
        return item.label.toLowerCase().includes(q);
      }
      return false;
    });
  };

  /**
   * Determines the current context (Video Watch vs Listing).
   * @param {Location} location
   * @returns {String} 'watch' or 'listing'
   */
  const getPageContext = (location) => {
    return (location.pathname === '/watch' && new URLSearchParams(location.search).get('v'))
      ? 'watch'
      : 'listing';
  };

  // =============================================================================
  // SECTION 4: INPUT FUNCTIONS (Scrapers & DOM Readers)
  // =============================================================================

  const Scraper = {
    /**
     * Helper to find element text safely.
     */
    text: (el, selector) => el.querySelector(selector)?.textContent?.trim() || '',

    /**
     * Helper to extract Video ID from href.
     */
    getVideoId: (href) => {
      const match = href?.match(/[?&]v=([^&]+)/);
      return match ? match[1] : null;
    },

    /**
     * Scrapes the DOM for videos based on known selectors.
     * @returns {Array<Video>}
     */
    getVideos: () => {
      const results = [];
      const nodes = document.querySelectorAll(SELECTORS.videoItems.join(','));

      nodes.forEach(node => {
        // Try to find link
        const link = node.querySelector('a#video-title-link') || node.querySelector('a#video-title') || node.querySelector('a');
        if (!link) return;

        const id = Scraper.getVideoId(link.href);
        if (!id) return;

        // Try to find title
        const title = link.title || link.textContent.trim();
        if (!title) return;

        // Try to find metadata
        // Note: Heuristics simplified for HtDP brevity, real world requires the robust selectors from original script
        const channel = Scraper.text(node, '#channel-name') || Scraper.text(node, '.ytd-channel-name') || 'Unknown';
        const meta = Scraper.text(node, '#metadata-line') || '';

        results.push({
          type: 'video',
          id: id,
          title: title,
          channel: channel,
          uploadDate: meta,
          url: link.href,
          thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`
        });
      });

      // Deduplicate by ID
      return Array.from(new Map(results.map(item => [item.id, item])).values());
    },

    /**
     * Scrapes the current watch page context.
     * @returns {Object|null}
     */
    getWatchContext: () => {
      const titleEl = document.querySelector(SELECTORS.watch.title[0]);
      if (!titleEl) return null;
      return {
        title: titleEl.textContent.trim(),
        channel: document.querySelector(SELECTORS.watch.channel[0])?.textContent.trim()
      };
    }
  };

  // =============================================================================
  // SECTION 5: VIEW FUNCTIONS (Rendering)
  // =============================================================================

  const View = {
    /**
     * Creates a DOM element with attributes.
     * @param {String} tag
     * @param {Object} attrs
     * @param {Array} children
     * @returns {HTMLElement}
     */
    el: (tag, attrs = {}, children = []) => {
      const element = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === 'className') element.className = v;
        else if (k === 'value') element.value = v;
        else element.setAttribute(k, v);
      });
      children.forEach(c => {
        if (typeof c === 'string') element.appendChild(document.createTextNode(c));
        else element.appendChild(c);
      });
      return element;
    },

    /**
     * Renders a single list item.
     * @param {Item} item
     * @param {Boolean} isSelected
     * @param {Function} onClick
     * @returns {HTMLElement}
     */
    renderItem: (item, isSelected, onClick) => {
      const classes = `vilify-item ${isSelected ? 'selected' : ''}`;
      
      if (item.type === 'video') {
        return View.el('div', { className: classes, 'data-id': item.id }, [
          View.el('img', { className: 'vilify-item-thumb', src: item.thumb }),
          View.el('div', { className: 'vilify-item-info' }, [
            View.el('div', { className: 'vilify-item-title' }, [item.title]),
            View.el('div', { className: 'vilify-item-meta' }, [`${item.channel} ${item.uploadDate}`])
          ])
        ]);
      } else {
        // Command rendering
        return View.el('div', { className: classes }, [
          View.el('div', { className: 'vilify-item-info' }, [
            View.el('div', { className: 'vilify-item-title' }, [`${item.icon || '>'} ${item.label}`]),
            View.el('div', { className: 'vilify-item-meta' }, [item.keys || ''])
          ])
        ]);
      }
    },

    /**
     * Shows a transient message.
     */
    toast: (msg) => {
      let t = document.getElementById('vilify-toast');
      if (!t) {
        t = View.el('div', { id: 'vilify-toast', className: 'vilify-toast' });
        document.body.appendChild(t);
      }
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), CONSTANTS.TOAST_DURATION);
    }
  };

  // =============================================================================
  // SECTION 6: THE WORLD (App Logic & Event Loop)
  // =============================================================================

  class App {
    constructor() {
      // 1. Initialize State
      this.state = {
        mode: 'HIDDEN', // Start hidden to prevent flash, then move to FOCUS or WATCH
        items: [],
        displayItems: [],
        selectedIndex: 0,
        filterQuery: '',
        loading: true
      };

      // 2. Initialize DOM roots
      this.initStyles();
      this.initLoadingScreen();
      this.root = View.el('div', { id: 'vilify-root', className: 'vilify-overlay', style: 'display:none' });
      document.body.appendChild(this.root);

      // 3. Start Event Loop
      this.bindEvents();
      this.startPolling();
    }

    initStyles() {
      const s = document.createElement('style');
      s.textContent = CSS;
      document.head.appendChild(s);
    }

    initLoadingScreen() {
      // Runs at document-start
      const l = View.el('div', { id: 'vilify-loading' }, ['Loading Vilify...']);
      document.body.appendChild(l);
      document.body.classList.add('vilify-loading');
    }

    // --- State Transformers (The "On-Tick" / "On-Key" Logic) ---

    /**
     * Updates state and triggers a render.
     * @param {Partial<WorldState>} updates 
     */
    setState(updates) {
      this.state = { ...this.state, ...updates };
      
      // Derived state logic
      if (updates.hasOwnProperty('items') || updates.hasOwnProperty('filterQuery')) {
        this.state.displayItems = filterItems(this.state.items, this.state.filterQuery);
        // Reset index if out of bounds
        if (this.state.selectedIndex >= this.state.displayItems.length) {
          this.state.selectedIndex = 0;
        }
      }

      this.render();
    }

    // --- Actions ---

    handleNavigation(direction) {
      const idx = nextIndex(this.state.selectedIndex, this.state.displayItems.length, direction);
      this.setState({ selectedIndex: idx });
      this.scrollSelectionIntoView();
    }

    handleSelection(newTab = false) {
      const item = this.state.displayItems[this.state.selectedIndex];
      if (!item) return;

      if (item.type === 'video') {
        if (newTab) window.open(item.url, '_blank');
        else window.location.href = item.url;
      } else if (item.type === 'command') {
        item.action();
        this.setMode('HIDDEN'); // Close palette after command
      }
    }

    setMode(newMode) {
      // Transition Logic
      if (newMode === 'FOCUS') {
        const videos = Scraper.getVideos();
        this.setState({ 
          mode: 'FOCUS', 
          items: videos, 
          filterQuery: '', 
          selectedIndex: 0 
        });
        document.body.classList.add('vilify-active');
      } else if (newMode === 'HIDDEN') {
        this.setState({ mode: 'HIDDEN' });
        document.body.classList.remove('vilify-active');
      } else if (newMode === 'WATCH') {
        // Watch mode implies specific bindings, but no overlay
        this.setState({ mode: 'WATCH' });
        document.body.classList.remove('vilify-active');
      }
    }

    // --- Event Handling ---

    bindEvents() {
      // Global Keyboard Handler
      document.addEventListener('keydown', (e) => {
        // Prevent interference with input fields (unless it's our input)
        if (e.target.tagName === 'INPUT' && !e.target.classList.contains('vilify-input')) return;

        // Global Shortcuts
        if (e.key === 'Escape') {
          if (this.state.mode === 'FOCUS') {
            // Clear filter if exists, or exit focus mode? 
            // Original script: :q to exit. Here let's just clear filter.
            if (this.state.filterQuery) this.setState({ filterQuery: '' });
          }
        }

        // Mode Specific Handling
        if (this.state.mode === 'FOCUS') {
          this.handleFocusKey(e);
        } else if (this.state.mode === 'WATCH') {
          this.handleWatchKey(e);
        } else if (this.state.mode === 'HIDDEN') {
           // Entry point
           if (e.key === '/' && getPageContext(location) === 'listing') {
             e.preventDefault();
             this.setMode('FOCUS');
           }
        }
      });
    }

    handleFocusKey(e) {
      const isTyping = document.activeElement.classList.contains('vilify-input');
      
      if (e.key === 'ArrowDown' || (!isTyping && e.key === 'j')) {
        e.preventDefault();
        this.handleNavigation(1);
      } else if (e.key === 'ArrowUp' || (!isTyping && e.key === 'k')) {
        e.preventDefault();
        this.handleNavigation(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.handleSelection(e.shiftKey);
      } else if (e.key === '/' && !isTyping) {
        e.preventDefault();
        document.querySelector('.vilify-input')?.focus();
      }
    }

    handleWatchKey(e) {
      // Implement specific watch keys (j/k/l seek, etc.) here
      // kept minimal for refactor example
      if (e.key === 'f') {
        // Example: logic to open chapter picker
      }
    }

    // --- The Render Loop (Big-Bang 'to-draw') ---

    render() {
      // 1. Visibility Check
      if (this.state.mode === 'HIDDEN' || this.state.mode === 'WATCH') {
        this.root.style.display = 'none';
        return;
      }
      this.root.style.display = 'flex';

      // 2. Clear Root
      this.root.innerHTML = '';

      // 3. Construct Header
      const input = View.el('input', { 
        className: 'vilify-input', 
        type: 'text', 
        placeholder: 'Filter videos... (/ to focus)',
        value: this.state.filterQuery 
      });
      input.addEventListener('input', (e) => this.setState({ filterQuery: e.target.value }));
      
      const header = View.el('div', { className: 'vilify-header' }, [
         View.el('span', {style: 'color:var(--yt-red); font-weight:bold'}, ['Vilify']),
         input
      ]);
      this.root.appendChild(header);

      // 4. Construct List
      const list = View.el('div', { className: 'vilify-list' });
      
      if (this.state.displayItems.length === 0) {
        list.appendChild(View.el('div', { style: 'padding: 20px; text-align: center' }, ['No items found.']));
      } else {
        this.state.displayItems.forEach((item, idx) => {
          const el = View.renderItem(item, idx === this.state.selectedIndex);
          el.addEventListener('click', () => {
            this.setState({ selectedIndex: idx });
            this.handleSelection();
          });
          list.appendChild(el);
        });
      }
      this.root.appendChild(list);
      
      // Restore input focus if needed
      if (this.state.filterQuery) {
        // A naive re-focus (in a real framework diffing would handle this)
        input.focus();
      }
    }

    scrollSelectionIntoView() {
      const selected = this.root.querySelector('.selected');
      if (selected) selected.scrollIntoView({ block: 'nearest' });
    }

    // --- System Inputs (Polls & SPA Detection) ---

    startPolling() {
      // Initial Load Waiter
      const waitForLoad = setInterval(() => {
        if (document.querySelector('ytd-app')) {
          clearInterval(waitForLoad);
          document.getElementById('vilify-loading')?.remove();
          document.body.classList.remove('vilify-loading');
          
          // Initial Context check
          if (getPageContext(location) === 'watch') {
            this.setMode('WATCH');
          } else {
            this.setMode('FOCUS'); // Default to focus on home/results
          }
        }
      }, 100);

      // SPA Navigation Monitor
      let lastPath = location.pathname;
      setInterval(() => {
        if (location.pathname !== lastPath) {
          lastPath = location.pathname;
          // Context Switch
          if (getPageContext(location) === 'watch') {
            this.setMode('WATCH');
          } else {
            this.setMode('FOCUS');
          }
        }
      }, CONSTANTS.POLL_INTERVAL);
    }
  }

  // =============================================================================
  // MAIN ENTRY
  // =============================================================================
  
  // Start the world
  new App();

})();
