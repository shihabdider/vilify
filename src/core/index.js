// Core orchestration - Main entry point for Vilify
// Following HTDP design from .design/DATA.md and .design/WORLD.md
// Iteration 023: Encapsulated state via createApp()

import { 
  createAppState,
  getMode,
  getVisibleItems,
  onNavigate,
  onFilterToggle,
  onFilterChange,
  onDrawerOpen,
  onDrawerClose,
  onSortChange,
  onShowMessage,
  onBoundaryHit,
  onSearchToggle,
  onSearchChange,
  onPaletteQueryChange,
  onPaletteNavigate,
  onUrlChange,
  onPageUpdate,
  onListItemsUpdate,
  onSelect,
  onWatchLaterAdd,
  onWatchLaterRemove,
  onWatchLaterUndoRemove,
  onDismissVideo,
  onUndoDismissVideo
} from './state.js';
import { el, clear, updateListSelection, showMessage, flashBoundary, navigateList, isInputElement } from './view.js';
import { injectLoadingStyles, showLoadingScreen, hideLoadingScreen } from './loading.js';
import { setupNavigationObserver } from './navigation.js';
import { setupKeyboardHandler } from './keyboard.js';
import { injectFocusModeStyles, applyTheme, renderFocusMode, renderListing, setInputCallbacks, updateStatusBar, updateSortIndicator, updateItemCount, removeFocusMode } from './layout.js';
import { parseSortCommand, getSortLabel, getDefaultDirection, toggleDirection, SORT_FIELDS } from './sort.js';
import { injectPaletteStyles, filterItems, openPalette, closePalette, renderPalette, showPalette, hidePalette } from './palette.js';
import { copyToClipboard, navigateTo, openInNewTab } from './actions.js';

import { injectDrawerStyles, renderDrawer, handleDrawerKey, closeDrawer } from './drawer.js';
import { toView, toStatusBarView, toContentView, toDrawerView, getPageItems } from './view-tree.js';
import { applyView, applyStatusBar, applyContent, applyDrawer, resetViewState } from './apply-view.js';
import { pollPageContent } from './poll-content.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const POLL_INTERVAL_MS = 200;

/**
 * Build the search navigation URL from config and query.
 * Uses config.searchUrl if defined, otherwise falls back to YouTube-style URL.
 * [PURE]
 *
 * @param {SiteConfig} config - Site configuration (may have searchUrl)
 * @param {string} query - Search query (already trimmed)
 * @returns {string} URL to navigate to
 *
 * @example
 * buildSearchUrl({}, 'hello')
 * // => '/results?search_query=hello'
 *
 * buildSearchUrl({ searchUrl: q => '/search?q=' + encodeURIComponent(q) }, 'hello')
 * // => '/search?q=hello'
 */
export function buildSearchUrl(config, query) {
  return config.searchUrl
    ? config.searchUrl(query)
    : '/results?search_query=' + encodeURIComponent(query);
}

// =============================================================================
// CREATE APP
// =============================================================================

/**
 * Create an app instance with encapsulated state.
 * All state is private via closure, returned interface provides controlled access.
 * [PURE factory - returns I/O object]
 *
 * @param {SiteConfig} config - Site configuration
 * @returns {App} App instance with init, destroy, getState, setState, getSiteState, setSiteState
 *
 * @example
 * const app = createApp(youtubeConfig);
 * await app.init();
 * // ... later
 * app.destroy();
 */
export function createApp(config) {
  // ==========================================================================
  // ENCAPSULATED STATE (private via closure)
  // ==========================================================================
  
  /** @type {AppState|null} Main application state */
  let state = null;

  /** @type {Object|null} Site-specific state (e.g., YouTubeState) */
  let siteState = null;

  /** @type {number|null} Content polling timer */
  let pollTimer = null;

  /** @type {number} Last seen video count for polling */
  let lastVideoCount = 0;

  /** @type {string|null} Previously rendered drawer state (to avoid re-render) */
  let lastRenderedDrawer = null;

  /** @type {Function|null} Keyboard handler cleanup function */
  let cleanupKeyboard = null;

  /** @type {MutationObserver|null} Navigation observer */
  let navigationObserver = null;

  // ==========================================================================
  // CONTENT POLLING
  // ==========================================================================

  /**
   * Start polling for content changes on listing pages.
   * Re-renders when new videos are detected.
   * [I/O]
   */
  function startContentPolling() {
    stopContentPolling();
    lastVideoCount = 0;
    
    const poll = () => {
      const pageType = config?.getPageType?.() || 'other';
      
      // Don't poll on watch page
      if (pageType === 'watch') {
        stopContentPolling();
        return;
      }
      
      // Count video elements in DOM (YouTube-specific selectors)
      const currentCount = document.querySelectorAll(
        'ytd-rich-item-renderer, ytd-video-renderer, ' +
        'ytd-compact-video-renderer, ytd-grid-video-renderer, ' +
        'ytd-playlist-video-renderer, yt-lockup-view-model'
      ).length;
      
      // Check if YouTube is still loading content
      const isLoading = !!document.querySelector(
        'ytd-continuation-item-renderer, tp-yt-paper-spinner, ' +
        '#spinner, ytd-ghost-grid-renderer, ' +
        'ytd-rich-grid-renderer[is-loading], .ytd-ghost-grid-renderer'
      );
      
      // Re-render if video count changed and not currently loading
      if (currentCount !== lastVideoCount && !isLoading && currentCount > 0) {
        lastVideoCount = currentCount;
        
        // Update state.page with fresh items (HtDP: events update state)
        if (config.createPageState) {
          const pageState = config.createPageState();
          state = onListItemsUpdate(state, pageState.videos || []);
        }
        
        render();
      }
      
      pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
    };
    
    poll();
  }

  /**
   * Stop content polling.
   * [I/O]
   */
  function stopContentPolling() {
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  }

  // ==========================================================================
  // STATE ACCESSORS
  // ==========================================================================

  function getState() {
    return state;
  }

  function setState(newState) {
    state = newState;
    render();
  }

  function getSiteState() {
    return siteState;
  }

  function setSiteState(newState) {
    siteState = newState;
    render();
  }

  // ==========================================================================
  // RENDERING
  // ==========================================================================

  /**
   * Get drawer placeholder from current drawer handler.
   * [PURE helper]
   */
  function getDrawerPlaceholder() {
    const drawer = state?.ui?.drawer;
    if (!drawer || drawer === 'palette') return null;
    
    const handler = config?.getDrawerHandler?.(drawer, siteState);
    return handler?.getFilterPlaceholder?.() ?? null;
  }

  /**
   * Main render function.
   * Uses pure view computation (toView) followed by I/O application.
   */
  function render() {
    if (!state || !config) return;

    const pageType = config.getPageType ? config.getPageType() : 'other';

    // Ensure focus mode container exists
    let container = document.getElementById('vilify-content');
    if (!container) {
      renderFocusMode(config, state);
      container = document.getElementById('vilify-content');
    }

    // Compute pure view tree (reads items from state.page - HtDP model)
    const statusBarView = toStatusBarView(state, getDrawerPlaceholder());
    const contentView = toContentView(state, config);  // Items read from state.page

    // Apply status bar view
    const isSiteDrawer = state.ui.drawer !== null && 
                         state.ui.drawer !== 'palette';
    const shouldFocusInput = state.ui.drawer === 'palette' || 
                             state.ui.filterActive ||
                             isSiteDrawer;
    updateStatusBar(state, shouldFocusInput, statusBarView.inputPlaceholder, config.searchPlaceholder);

    // Apply content view
    updateSortIndicator(statusBarView.sortLabel);
    updateItemCount(contentView.items.length);

    // Render content based on computed view type
    if (contentView.type === 'custom' && contentView.render) {
      contentView.render(state, siteState, container);
    } else if (contentView.type === 'listing') {
      renderListing(contentView.items, contentView.selectedIdx, container);
    } else if (contentView.type === 'empty') {
      clear(container);
      const empty = el('div', { class: 'vilify-empty' }, ['No items found']);
      container.appendChild(empty);
    }

    // Handle palette rendering
    if (state.ui.drawer === 'palette') {
      const commands = config.getCommands
        ? config.getCommands({
            state,
            siteState,
            navigateTo,
            copyToClipboard,
            openPalette: (mode) => {
              state = openPalette(state, mode);
              render();
            },
            openRecommended: () => {
              state = onDrawerOpen(state, 'recommended');
              render();
            },
            openSearch: () => {
              const searchInput = document.querySelector('input#search');
              if (searchInput) searchInput.focus();
            },
            exitFocusMode: () => {
              state = { ...state, core: { ...state.core, focusModeActive: false } };
              removeFocusMode();
              document.body.classList.remove('vilify-watch-page');
            },
            executeSort: (field) => {
              state = onDrawerClose(state);
              if (!field) {
                state = onSortChange(state, null, 'desc');
                showMessage('Sort reset');
              } else if (state.ui.sort.field === field) {
                const newDir = toggleDirection(state.ui.sort.direction);
                state = onSortChange(state, field, newDir);
                showMessage(`Sorted by ${getSortLabel(field, newDir)}`);
              } else {
                const newDir = getDefaultDirection(field);
                state = onSortChange(state, field, newDir);
                showMessage(`Sorted by ${getSortLabel(field, newDir)}`);
              }
              render();
            },
          })
        : [];

      // Filter commands by query
      const query = state.ui.paletteQuery.startsWith(':')
        ? state.ui.paletteQuery.slice(1)
        : state.ui.paletteQuery;
      const filtered = filterItems(commands, query);

      renderPalette(filtered, state.ui.paletteSelectedIdx);
      showPalette();
    } else {
      hidePalette();
    }

    // Handle site-specific drawer rendering
    if (isSiteDrawer) {
      if (state.ui.drawer !== lastRenderedDrawer) {
        const handler = config.getDrawerHandler ? 
                        config.getDrawerHandler(state.ui.drawer, siteState) : null;
        renderDrawer(state.ui.drawer, handler);
        lastRenderedDrawer = state.ui.drawer;
      }
    } else {
      if (lastRenderedDrawer !== null) {
        closeDrawer();
        lastRenderedDrawer = null;
      }
    }
  }

  // ==========================================================================
  // INPUT HANDLERS (for status bar input)
  // ==========================================================================

  function handleFilterChange(value) {
    state = onFilterChange(state, value);
    render();
  }

  function handleFilterSubmit(value, shiftKey) {
    const items = getPageItems(state);
    const filtered = getVisibleItems(state, items);
    const result = onSelect(state, filtered, shiftKey);

    if (result.action === 'navigate') {
      navigateTo(result.url);
    } else if (result.action === 'newTab') {
      openInNewTab(result.url);
    }
  }

  function handleFilterNavigate(direction) {
    // Local filter navigation is handled by main list navigation
  }

  // ==========================================================================
  // DRAWER INPUT HANDLERS
  // ==========================================================================

  function handleDrawerChange(value, mode) {
    if (!state.ui.drawer || state.ui.drawer === 'palette') {
      return;
    }
    
    const handler = config.getDrawerHandler ? 
                    config.getDrawerHandler(state.ui.drawer, siteState) : null;
    
    if (handler?.updateQuery) {
      handler.updateQuery(value);
    }
  }

  function handleDrawerSubmit(value, shiftKey, mode) {
    if (!state.ui.drawer || state.ui.drawer === 'palette') {
      return;
    }
    
    const handler = config.getDrawerHandler ? 
                    config.getDrawerHandler(state.ui.drawer, siteState) : null;
    
    if (handler?.onKey) {
      const result = handler.onKey('Enter', state);
      if (result.handled) {
        state = result.newState;
        render();
      }
    }
  }

  function handleDrawerNavigate(direction, mode) {
    if (!state.ui.drawer || state.ui.drawer === 'palette') {
      return;
    }
    
    const handler = config.getDrawerHandler ? 
                    config.getDrawerHandler(state.ui.drawer, siteState) : null;
    
    if (handler?.onKey) {
      const key = direction === 'down' ? 'ArrowDown' : 'ArrowUp';
      const result = handler.onKey(key, state);
      if (result.handled) {
        state = result.newState;
      }
    }
  }

  function handleSearchChange(value) {
    state = onSearchChange(state, value);
  }

  function handleSearchSubmit(value) {
    if (value.trim()) {
      const query = value.trim();
      const url = buildSearchUrl(config, query);
      navigateTo(url);
    }
  }

  function handleCommandChange(value) {
    state = onPaletteQueryChange(state, value);
    render();
  }

  function handleCommandSubmit(value, shiftKey) {
    // Check for :q exit command
    if (value.trim().toLowerCase() === ':q') {
      state = onDrawerClose(state);
      state = { ...state, core: { ...state.core, focusModeActive: false } };
      
      stopContentPolling();
      removeFocusMode();
      document.body.classList.remove('vilify-watch-page', 'vilify-loading');
      hideLoadingScreen();
      
      const drawers = document.querySelectorAll(
        '.vilify-drawer, #vilify-drawer-container, ' +
        '#vilify-loading-overlay, .vilify-overlay'
      );
      drawers.forEach(el => el.remove());
      
      showMessage('Focus mode off (refresh to re-enable)');
      return;
    }

    // Check for :sort command
    const sortMatch = value.trim().match(/^:?sort\s*(.*)$/i);
    if (sortMatch !== null) {
      const sortArg = sortMatch[1].trim();
      
      if (!sortArg) {
        state = onDrawerClose(state);
        state = onSortChange(state, null, 'desc');
        showMessage('Sort reset');
        render();
        return;
      }
      
      const parsed = parseSortCommand(sortArg);
      if (parsed) {
        state = onDrawerClose(state);
        
        if (state.ui.sort.field === parsed.field && !parsed.reverse) {
          const newDir = toggleDirection(state.ui.sort.direction);
          state = onSortChange(state, parsed.field, newDir);
        } else {
          const defaultDir = getDefaultDirection(parsed.field);
          const newDir = parsed.reverse ? toggleDirection(defaultDir) : defaultDir;
          state = onSortChange(state, parsed.field, newDir);
        }
        
        const label = getSortLabel(state.ui.sort.field, state.ui.sort.direction);
        showMessage(`Sorted by ${label}`);
        render();
        return;
      } else {
        showMessage(`Unknown sort field: ${sortArg}`);
        return;
      }
    }

    // Execute selected command
    const commands = config.getCommands
      ? config.getCommands({ state, siteState, navigateTo, copyToClipboard })
      : [];

    const query = value.startsWith(':') ? value.slice(1) : value;
    const filtered = filterItems(commands, query);
    const actionable = filtered.filter((c) => !c.group);
    const item = actionable[state.ui.paletteSelectedIdx];

    if (item?.action) {
      state = onDrawerClose(state);
      state = onFilterToggle(state);
      if (!state.ui.filterActive) {
        state = onFilterToggle(state);
      }
      state = { ...state, ui: { ...state.ui, filterActive: false, filterQuery: '' } };
      item.action();
      render();
    }
  }

  function handleCommandNavigate(direction) {
    const commands = config.getCommands
      ? config.getCommands({ state, siteState, navigateTo, copyToClipboard })
      : [];

    const query = state.ui.paletteQuery.startsWith(':') ? state.ui.paletteQuery.slice(1) : state.ui.paletteQuery;
    const filtered = filterItems(commands, query);
    const actionable = filtered.filter((c) => !c.group);
    const count = actionable.length;

    if (count === 0) return;

    const result = onPaletteNavigate(state, direction, count);
    state = result.state;
    
    if (result.boundary) {
      flashBoundary();
    }

    render();
  }

  function handleInputEscape() {
    if (state.ui.drawer === 'palette') {
      state = onDrawerClose(state);
    } else if (state.ui.drawer !== null) {
      state = onDrawerClose(state);
    }
    if (state.ui.filterActive) {
      state = onFilterToggle(state);
    }
    if (state.ui.searchActive) {
      state = onSearchToggle(state);
    }
    render();
  }

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  function handleListNavigation(direction) {
    const items = getPageItems(state);
    const filtered = getVisibleItems(state, items);

    const result = onNavigate(state, direction, filtered.length);
    state = result.state;

    if (direction === 'top' || direction === 'bottom') {
      const pos = state.ui.selectedIdx + 1;
      const total = filtered.length;
      showMessage(`${pos}/${total}`);
    }

    if (result.boundary) {
      if (result.boundary === 'bottom' && !state.ui.filterActive) {
        triggerLazyLoad();
      } else {
        flashBoundary();
      }
    }

    render();
  }

  /**
   * Trigger YouTube's lazy loading by scrolling continuation element into view.
   * [I/O]
   */
  function triggerLazyLoad() {
    const continuationSelectors = [
      'ytd-continuation-item-renderer',
      '#continuations ytd-continuation-item-renderer',
      'ytd-rich-grid-renderer ytd-continuation-item-renderer',
      'ytd-section-list-renderer ytd-continuation-item-renderer',
    ];
    
    for (const selector of continuationSelectors) {
      const continuation = document.querySelector(selector);
      if (continuation) {
        continuation.scrollIntoView({ behavior: 'instant', block: 'center' });
        showMessage('Loading more...');
        return;
      }
    }
    
    window.scrollBy({ top: window.innerHeight, behavior: 'instant' });
  }

  function handleSelect(shiftKey) {
    if (state.ui.drawer === 'palette') {
      handleCommandSubmit(state.ui.paletteQuery, shiftKey);
    } else {
      const items = getPageItems(state);
      const filtered = getVisibleItems(state, items);
      const result = onSelect(state, filtered, shiftKey);

      if (result.action === 'navigate') {
        navigateTo(result.url);
      } else if (result.action === 'newTab') {
        openInNewTab(result.url);
      }
    }
  }

  /**
   * Handle adding selected item to Watch Later.
   * [I/O]
   */
  async function handleAddToWatchLater() {
    const items = getPageItems(state);
    const filtered = getVisibleItems(state, items);
    const item = filtered[state.ui.selectedIdx];

    if (!item?.data?.videoId) {
      showMessage('No video selected');
      return;
    }

    const videoId = item.data.videoId;

    // Check if already added this session
    if (state.ui.watchLaterAdded.has(videoId)) {
      showMessage('Already in Watch Later');
      return;
    }

    // Call site-specific add to watch later function
    if (config.addToWatchLater) {
      const success = await config.addToWatchLater(videoId);
      if (success) {
        state = onWatchLaterAdd(state, videoId);
        showMessage('Added to Watch Later');
        render();
      } else {
        showMessage('Failed to add to Watch Later');
      }
    }
  }

  /**
   * Check if we're on the Watch Later playlist page.
   * [PURE helper]
   */
  function isWatchLaterPage() {
    return location.pathname === '/playlist' && 
           new URLSearchParams(location.search).get('list') === 'WL';
  }

  /**
   * Handle removing selected item from Watch Later.
   * On Watch Later page: removes from playlist (with undo).
   * On other listing pages: delegates to dismiss ("Not interested").
   * [I/O]
   */
  async function handleRemoveFromWatchLater() {
    // On non-WL pages, ArrowLeft triggers dismiss instead
    if (!isWatchLaterPage()) {
      await handleDismissVideo();
      return;
    }

    const items = getPageItems(state);
    const filtered = getVisibleItems(state, items);
    const item = filtered[state.ui.selectedIdx];

    if (!item?.data?.videoId) {
      showMessage('No video selected');
      return;
    }

    const videoId = item.data.videoId;

    // Check if already removed this session
    if (state.ui.watchLaterRemoved.has(videoId)) {
      showMessage('Already removed (press u to undo)');
      return;
    }

    // Get playlist item data (setVideoId) from data-bridge
    if (!config.getPlaylistItemData || !config.removeFromWatchLater) {
      showMessage('Removal not supported');
      return;
    }

    const itemData = await config.getPlaylistItemData(videoId);
    if (!itemData) {
      showMessage('Could not find video data');
      return;
    }

    const success = await config.removeFromWatchLater(itemData.setVideoId);
    if (success) {
      state = onWatchLaterRemove(state, videoId, itemData.setVideoId, itemData.position);
      showMessage('Removed from Watch Later (u to undo)');
      render();
    } else {
      showMessage('Failed to remove from Watch Later');
    }
  }

  /**
   * Handle undoing the last Watch Later removal or dismiss.
   * On WL page: undoes WL removal. On other pages: undoes dismiss.
   * [I/O]
   */
  async function handleUndoWatchLaterRemoval() {
    if (isWatchLaterPage()) {
      // Undo Watch Later removal
      const lastRemoval = state.ui.lastWatchLaterRemoval;
      
      if (!lastRemoval) {
        showMessage('Nothing to undo');
        return;
      }

      if (!config.undoRemoveFromWatchLater) {
        showMessage('Undo not supported');
        return;
      }

      const success = await config.undoRemoveFromWatchLater(lastRemoval.videoId, lastRemoval.position);
      if (success) {
        state = onWatchLaterUndoRemove(state, lastRemoval.videoId);
        showMessage('Restored to Watch Later');
        render();
      } else {
        showMessage('Failed to restore video');
      }
    } else {
      // Undo dismiss ("Not interested")
      await handleUndoDismissVideo();
    }
  }

  /**
   * Handle undoing the last "Not interested" dismissal.
   * Clicks YouTube's native Undo button and restores the item.
   * [I/O]
   */
  async function handleUndoDismissVideo() {
    const lastDismissal = state.ui.lastDismissal;
    
    if (!lastDismissal) {
      showMessage('Nothing to undo');
      return;
    }

    // Click YouTube's native Undo button
    let ytUndone = false;
    if (config.clickUndoDismiss) {
      ytUndone = await config.clickUndoDismiss();
    }

    // Always restore in our state
    state = onUndoDismissVideo(state, lastDismissal.videoId);

    if (ytUndone) {
      showMessage('Undo — restored');
    } else {
      showMessage('Restored (YouTube undo may have expired)');
    }
    render();
  }

  /**
   * Handle dismissing selected video ("Not interested").
   * Triggers YouTube's native "Not interested" via DOM, then grays out in list.
   * Can be undone with 'u'.
   * [I/O]
   */
  async function handleDismissVideo() {
    const items = getPageItems(state);
    const filtered = getVisibleItems(state, items);
    const item = filtered[state.ui.selectedIdx];

    if (!item?.data?.videoId) {
      showMessage('No video selected');
      return;
    }

    const videoId = item.data.videoId;

    // Check if already dismissed this session
    if (state.ui.dismissedVideos.has(videoId)) {
      showMessage('Already dismissed (u to undo)');
      return;
    }

    // Try to trigger YouTube's native "Not interested" via DOM
    let ytDismissed = false;
    if (config.dismissVideo) {
      ytDismissed = await config.dismissVideo(videoId);
    }

    // Track dismissal in state (item stays visible but grayed out)
    state = onDismissVideo(state, videoId);

    if (ytDismissed) {
      showMessage('Not interested (u to undo)');
    } else {
      showMessage('Dismissed (u to undo)');
    }
    render();
  }

  function handleSiteDrawerKey(key) {
    if (!state.ui.drawer) return false;
    if (state.ui.drawer === 'palette') return false;
    
    const handler = config.getDrawerHandler ? 
                    config.getDrawerHandler(state.ui.drawer, siteState) : null;
    
    if (!handler) return false;
    
    const result = handleDrawerKey(key, state, handler);
    
    if (result.handled) {
      const drawerClosed = result.newState.ui.drawer === null;
      state = result.newState;
      if (drawerClosed) {
        render();
      }
      return true;
    }
    
    return false;
  }

  function handleEscape() {
    if (state.ui.drawer === 'palette') {
      state = onDrawerClose(state);
      render();
    } else if (state.ui.drawer !== null) {
      closeDrawer();
      state = onDrawerClose(state);
      render();
    } else if (state.ui.filterActive) {
      state = onFilterToggle(state);
      render();
    } else if (state.ui.searchActive) {
      state = onSearchToggle(state);
      render();
    }
  }

  /**
   * Get page config for a page type.
   * [PURE helper]
   */
  function getPageConfig(pageType) {
    return config?.pages?.[pageType] ?? null;
  }

  function handleNavigation(oldUrl, newUrl) {
    // Get old page type before URL changes
    const oldPageType = config.getPageType ? config.getPageType() : 'other';
    const oldPageConfig = getPageConfig(oldPageType);
    
    // Call onLeave for old page
    if (oldPageConfig?.onLeave) {
      oldPageConfig.onLeave();
    }
    
    stopContentPolling();

    state = onUrlChange(state, newUrl, config);
    lastRenderedDrawer = null;
    
    resetViewState();

    if (config.createSiteState) {
      siteState = config.createSiteState();
      state = { ...state, site: siteState };
    }

    document.body.classList.remove('vilify-watch-page');

    // Check cache for instant render
    const cachedItems = config.getPageCache?.(newUrl) || [];
    if (cachedItems.length > 0) {
      // Cache hit: render immediately from cache, no loading screen
      state = onPageUpdate(state, { type: 'list', videos: cachedItems });
      render();

      // Background refresh from DOM
      waitForContent(config).then(async () => {
        if (config.createPageState) {
          const pageState = config.createPageState();
          state = onPageUpdate(state, pageState);
          config.setPageCache?.(newUrl, pageState.videos || []);
        }
        render();

        const newPageType = config.getPageType ? config.getPageType() : 'other';
        if (newPageType !== 'watch') {
          startContentPolling();
        }

        const newPageConfig = getPageConfig(newPageType);
        if (newPageConfig?.onEnter) {
          const ctx = {
            getSiteState: () => siteState,
            updateSiteState: (fn) => {
              siteState = fn(siteState);
              state = { ...state, site: siteState };
            },
            render
          };
          await newPageConfig.onEnter(ctx);
        }

        if (config.onContentReady) {
          config.onContentReady();
        }
      });
    } else {
      // Cache miss: show loading screen, wait for content
      showLoadingScreen(config);

      waitForContent(config).then(async () => {
        if (config.createPageState) {
          const pageState = config.createPageState();
          state = onPageUpdate(state, pageState);
          config.setPageCache?.(newUrl, pageState.videos || []);
        }
        
        render();
        hideLoadingScreen();
        
        const newPageType = config.getPageType ? config.getPageType() : 'other';
        const newPageConfig = getPageConfig(newPageType);
        
        if (newPageConfig?.onEnter) {
          const ctx = {
            getSiteState: () => siteState,
            updateSiteState: (fn) => {
              siteState = fn(siteState);
              state = { ...state, site: siteState };
            },
            render
          };
          await newPageConfig.onEnter(ctx);
        }
        
        if (config.onContentReady) {
          config.onContentReady();
        }
        
        if (newPageType !== 'watch') {
          startContentPolling();
        }
      });
    }
  }

  function handleNextCommentPage() {
    // Try page config first, then legacy config.watch
    const pageConfig = getPageConfig('watch');
    const fn = pageConfig?.nextCommentPage ?? config.watch?.nextCommentPage;
    if (fn && siteState) {
      siteState = fn(siteState);
    }
  }

  function handlePrevCommentPage() {
    // Try page config first, then legacy config.watch
    const pageConfig = getPageConfig('watch');
    const fn = pageConfig?.prevCommentPage ?? config.watch?.prevCommentPage;
    if (fn && siteState) {
      siteState = fn(siteState);
    }
  }

  // ==========================================================================
  // WAIT FOR CONTENT
  // ==========================================================================

  async function waitForContent(cfg, timeout = 5000) {
    const start = Date.now();
    
    // YouTube data bridge special case (unchanged)
    if (cfg.name === 'youtube') {
      try {
        const { getDataProvider } = await import('../sites/youtube/data/index.js');
        const dp = getDataProvider();
        if (dp.waitForData) {
          await dp.waitForData(timeout);
        }
      } catch (e) {
        // Fallback to DOM-based waiting
      }
    }
    
    // Use page config's waitForContent predicate when available
    const handled = await pollPageContent(cfg, timeout);
    if (handled) return;
    
    // Legacy YouTube-specific DOM selector fallback
    const pageType = cfg.getPageType ? cfg.getPageType() : 'other';
    if (pageType === 'watch') {
      while (!document.querySelector('video.html5-main-video') && Date.now() - start < timeout) {
        await new Promise(r => setTimeout(r, 100));
      }
    } else {
      while (Date.now() - start < timeout) {
        const videoItems = document.querySelectorAll(
          'ytd-rich-item-renderer, ytd-video-renderer, yt-lockup-view-model'
        );
        
        if (videoItems.length > 0) {
          break;
        }
        
        await new Promise(r => setTimeout(r, 50));
      }
    }
  }

  // ==========================================================================
  // PUBLIC INTERFACE
  // ==========================================================================

  return {
    /**
     * Initialize the app - inject styles, set up handlers, show UI.
     * [I/O]
     */
    async init() {
      // Inject styles early
      injectLoadingStyles();
      injectFocusModeStyles();
      injectPaletteStyles();
      injectDrawerStyles();

      // Create initial state (doesn't need DOM)
      state = createAppState(config);
      state.core.focusModeActive = true;
      state.core.lastUrl = location.href;

      siteState = state.site;

      // Apply site theme
      if (config.theme) {
        applyTheme(config.theme);
      }

      // Set up input callbacks
      setInputCallbacks({
        onFilterChange: handleFilterChange,
        onFilterSubmit: handleFilterSubmit,
        onFilterNavigate: handleFilterNavigate,
        onSearchChange: handleSearchChange,
        onSearchSubmit: handleSearchSubmit,
        onCommandChange: handleCommandChange,
        onCommandSubmit: handleCommandSubmit,
        onCommandNavigate: handleCommandNavigate,
        onDrawerChange: handleDrawerChange,
        onDrawerSubmit: handleDrawerSubmit,
        onDrawerNavigate: handleDrawerNavigate,
        onEscape: handleInputEscape,
      });

      // Set up keyboard handling (returns cleanup function)
      cleanupKeyboard = setupKeyboardHandler(config, getState, setState, {
        onNavigate: handleListNavigation,
        onSelect: handleSelect,
        onEscape: handleEscape,
        onRender: render,
        onNextCommentPage: handleNextCommentPage,
        onPrevCommentPage: handlePrevCommentPage,
        onDrawerKey: handleSiteDrawerKey,
        onAddToWatchLater: handleAddToWatchLater,
        onRemoveFromWatchLater: handleRemoveFromWatchLater,
        onUndoWatchLaterRemoval: handleUndoWatchLaterRemoval,
        onDismissVideo: handleDismissVideo,
      }, () => siteState);

      // Set up SPA navigation observer
      navigationObserver = setupNavigationObserver(handleNavigation);

      // Add focus mode class
      document.body.classList.add('vilify-focus-mode');

      // Check cache for instant render
      const cachedItems = config.getPageCache?.(location.href) || [];
      if (cachedItems.length > 0) {
        // Cache hit: render immediately from cache, no loading screen
        state = onPageUpdate(state, { type: 'list', videos: cachedItems });
        render();

        // Background refresh from DOM
        waitForContent(config).then(async () => {
          if (config.createPageState) {
            const pageState = config.createPageState();
            state = onPageUpdate(state, pageState);
            config.setPageCache?.(location.href, pageState.videos || []);
          }
          render();

          const pageType = config.getPageType ? config.getPageType() : 'other';
          if (pageType !== 'watch') {
            startContentPolling();
          }

          const pageConfig = getPageConfig(pageType);
          if (pageConfig?.onEnter) {
            const ctx = {
              getSiteState: () => siteState,
              updateSiteState: (fn) => {
                siteState = fn(siteState);
                state = { ...state, site: siteState };
              },
              render
            };
            await pageConfig.onEnter(ctx);
          }

          if (config.onContentReady) {
            config.onContentReady();
          }
        });
      } else {
        // Cache miss: show loading screen, wait for content
        showLoadingScreen(config);

        await waitForContent(config);

        // Populate state.page with initial data (HtDP: state drives view)
        if (config.createPageState) {
          const pageState = config.createPageState();
          state = onPageUpdate(state, pageState);
          config.setPageCache?.(location.href, pageState.videos || []);
        }

        // Initial render
        render();

        // Hide loading screen
        hideLoadingScreen();

        // Start content polling for listing pages
        const pageType = config.getPageType ? config.getPageType() : 'other';
        if (pageType !== 'watch') {
          startContentPolling();
        }

        // Call page-specific onEnter hook
        const pageConfig = getPageConfig(pageType);
        if (pageConfig?.onEnter) {
          const ctx = {
            getSiteState: () => siteState,
            updateSiteState: (fn) => {
              siteState = fn(siteState);
              state = { ...state, site: siteState };
            },
            render
          };
          await pageConfig.onEnter(ctx);
        }

        // Legacy: Call site's onContentReady hook
        if (config.onContentReady) {
          config.onContentReady();
        }
      }
    },

    /**
     * Destroy the app - clean up event handlers and timers.
     * [I/O]
     */
    destroy() {
      // Stop content polling
      stopContentPolling();

      // Clean up keyboard handler
      if (cleanupKeyboard) {
        cleanupKeyboard();
        cleanupKeyboard = null;
      }

      // Disconnect navigation observer
      if (navigationObserver) {
        navigationObserver.disconnect();
        navigationObserver = null;
      }

      // Remove focus mode
      removeFocusMode();
      document.body.classList.remove('vilify-focus-mode', 'vilify-watch-page', 'vilify-loading');

      // Remove loading overlay
      hideLoadingScreen();

      // Remove drawers
      const drawers = document.querySelectorAll(
        '.vilify-drawer, #vilify-drawer-container, ' +
        '#vilify-loading-overlay, .vilify-overlay'
      );
      drawers.forEach(el => el.remove());

      // Clear state
      state = null;
      siteState = null;
      lastRenderedDrawer = null;
    },

    /**
     * Get current app state (for testing).
     * @returns {AppState|null}
     */
    getState,

    /**
     * Set app state (for testing).
     * @param {AppState} newState
     */
    setState,

    /**
     * Get current site state (for compatibility).
     * @returns {Object|null}
     */
    getSiteState,

    /**
     * Set site state (for compatibility).
     * @param {Object} newState
     */
    setSiteState,
  };
}

// =============================================================================
// LEGACY API (for backward compatibility)
// =============================================================================

/** @type {ReturnType<typeof createApp>|null} Singleton app instance for legacy API */
let legacyApp = null;

/**
 * Initialize site with configuration.
 * Legacy entry point - uses createApp() internally.
 * [I/O]
 * 
 * @deprecated Use createApp(config).init() instead
 */
export function initSite(config) {
  // Destroy any existing app
  if (legacyApp) {
    legacyApp.destroy();
  }
  
  // Create and initialize new app
  legacyApp = createApp(config);
  legacyApp.init();
}

/**
 * Get current site-specific state.
 * Legacy accessor for backward compatibility.
 * @returns {Object|null}
 * @deprecated Use app.getSiteState() instead
 */
export function getSiteState() {
  return legacyApp?.getSiteState() ?? null;
}

/**
 * Update site-specific state and re-render.
 * Legacy accessor for backward compatibility.
 * @param {Object} newState - New site state
 * @deprecated Use app.setSiteState() instead
 */
export function setSiteState(newState) {
  if (legacyApp) {
    legacyApp.setSiteState(newState);
  }
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

export { createAppState, getMode, getVisibleItems } from './state.js';
export { el, clear, showMessage } from './view.js';
export { copyToClipboard, navigateTo, openInNewTab } from './actions.js';

// View tree functions (iteration 022)
export { toView, toStatusBarView, toContentView, toDrawerView } from './view-tree.js';
export { applyView, applyStatusBar, applyContent, applyDrawer, resetViewState } from './apply-view.js';
