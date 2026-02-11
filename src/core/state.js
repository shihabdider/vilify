// State management - Core state functions for Vilify
// Following HTDP design from .design/DATA.md and .design/WORLD.md

import { sortItems } from './sort.js';

// =============================================================================
// STATE CREATION
// =============================================================================

/**
 * Creates initial UIState with all defaults.
 * [PURE] (internal helper)
 *
 * @returns {UIState} Initial UI state
 */
function createUIState() {
  return {
    drawer: null,           // DrawerType: null | 'palette' | site-specific string
    paletteQuery: '',
    paletteSelectedIdx: 0,
    selectedIdx: 0,
    filterActive: false,
    filterQuery: '',
    searchActive: false,
    searchQuery: '',
    keySeq: '',
    sort: { field: null, direction: 'desc' },
    message: null,          // Message | null
    boundaryFlash: null,    // BoundaryFlash | null
    watchLaterAdded: new Set(),  // Set<string> - video IDs added to Watch Later this session
    watchLaterRemoved: new Map(), // Map<videoId, { setVideoId, position }> - removed videos for undo
    lastWatchLaterRemoval: null,  // { videoId, setVideoId, position } - most recent removal for undo
    dismissedVideos: new Set(),   // Set<string> - video IDs dismissed via "Not interested"
    lastDismissal: null           // { videoId } | null - most recent dismissal for undo
  };
}

/**
 * Creates initial AppCore with all defaults.
 * [PURE] (internal helper)
 *
 * @returns {AppCore} Initial core state
 */
function createAppCore() {
  return {
    focusModeActive: false,
    lastUrl: ''
  };
}

/**
 * Creates initial application state with nested structure.
 * [PURE]
 *
 * @param {SiteConfig|null} config - Optional site configuration
 * @returns {AppState} Initial state with nested structure (core, ui, site, page)
 *
 * @example
 * // No config
 * createAppState()
 *   => { core: { focusModeActive: false, lastUrl: '' },
 *        ui: { drawer: null, paletteQuery: '', ... },
 *        site: null, page: null }
 *
 * @example
 * // With site config that has createSiteState
 * createAppState({ name: 'youtube', createSiteState: () => ({ transcript: null }) })
 *   => { core: { ... }, ui: { ... },
 *        site: { transcript: null }, page: null }
 *
 * @example
 * // With site config but no createSiteState
 * createAppState({ name: 'google' })
 *   => { core: { ... }, ui: { ... }, site: null, page: null }
 */
export function createAppState(config = null) {
  // Template: Compound - construct all fields
  // config is optional Compound - access createSiteState if exists
  return {
    core: createAppCore(),
    ui: createUIState(),
    site: config?.createSiteState ? config.createSiteState() : null,
    page: null
  };
}

// =============================================================================
// STATE QUERIES
// =============================================================================

/**
 * Derives display mode from current state.
 * [PURE]
 *
 * @param {AppState} state - Current application state
 * @returns {string} Current mode (NORMAL, COMMAND, FILTER, SEARCH, or drawer name uppercased)
 *
 * @example
 * getMode({ ui: { drawer: null, filterActive: false, searchActive: false } })  => 'NORMAL'
 * getMode({ ui: { drawer: 'palette' } })                                        => 'COMMAND'
 * getMode({ ui: { drawer: null, filterActive: true } })                         => 'FILTER'
 * getMode({ ui: { drawer: null, searchActive: true } })                         => 'SEARCH'
 * getMode({ ui: { drawer: 'chapters' } })                                       => 'CHAPTERS'
 */
export function getMode(state) {
  // Template: Compound - access drawer, filterActive, searchActive
  const { drawer, filterActive, searchActive } = state.ui;

  // Priority order: drawers > filter > search > normal
  if (drawer === 'palette') {
    return 'COMMAND';
  }

  if (drawer !== null) {
    return drawer.toUpperCase();
  }

  if (filterActive) {
    return 'FILTER';
  }

  if (searchActive) {
    return 'SEARCH';
  }

  return 'NORMAL';
}

/**
 * Get visible items after applying filter and sort.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {Array<Item>} items - All items
 * @returns {Array<Item>} Filtered and sorted items
 *
 * @example
 * // No filter, no sort - returns all items
 * getVisibleItems({ ui: { filterActive: false, sort: { field: null } } }, items)
 *   => items
 *
 * @example
 * // With filter - returns matching items
 * getVisibleItems({ ui: { filterActive: true, filterQuery: 'music' } }, items)
 *   => items matching 'music' in title or meta
 *
 * @example
 * // With sort - returns sorted items
 * getVisibleItems({ ui: { sort: { field: 'date', direction: 'desc' } } }, items)
 *   => items sorted by date descending
 */
export function getVisibleItems(state, items) {
  // Template: items is List → filter then map/sort
  // state is Compound → access filterActive, filterQuery, sort
  
  if (!items || items.length === 0) return [];
  
  const { filterActive, filterQuery, sort } = state.ui;
  
  let result = items;
  
  // Note: dismissed videos are NOT filtered out — they remain visible but 
  // rendered grayed out (like watch-later-removed items). Undo with 'u'.
  
  // Apply filter if active
  if (filterActive && filterQuery) {
    const query = filterQuery.toLowerCase();
    result = result.filter(item => {
      const titleMatch = item.title?.toLowerCase().includes(query);
      const metaMatch = item.meta?.toLowerCase().includes(query);
      const descMatch = item.description?.toLowerCase().includes(query);
      return titleMatch || metaMatch || descMatch;
    });
  }
  
  // Apply sort if set
  if (sort.field) {
    result = sortItems(result, sort.field, sort.direction);
  }
  
  return result;
}

// =============================================================================
// STATE TRANSITIONS
// =============================================================================

/**
 * Move selection in a list. Returns new state and boundary info.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {string} direction - 'up' | 'down' | 'top' | 'bottom'
 * @param {number} itemCount - Total number of items in list
 * @returns {{ state: AppState, boundary: 'top' | 'bottom' | null }} New state and boundary hit info
 *
 * @example
 * // Move down from index 0, 5 items
 * onNavigate(state, 'down', 5)  => { state: { ui: { selectedIdx: 1 } }, boundary: null }
 *
 * @example
 * // Move down at bottom (index 4, 5 items)
 * onNavigate(state, 'down', 5)  => { state: { ui: { selectedIdx: 4 } }, boundary: 'bottom' }
 *
 * @example
 * // Move up at top (index 0)
 * onNavigate(state, 'up', 5)    => { state: { ui: { selectedIdx: 0 } }, boundary: 'top' }
 *
 * @example
 * // Jump to top
 * onNavigate(state, 'top', 5)   => { state: { ui: { selectedIdx: 0 } }, boundary: null }
 *
 * @example
 * // Jump to bottom
 * onNavigate(state, 'bottom', 5) => { state: { ui: { selectedIdx: 4 } }, boundary: null }
 *
 * @example
 * // Empty list
 * onNavigate(state, 'down', 0)  => { state: { ui: { selectedIdx: 0 } }, boundary: null }
 */
export function onNavigate(state, direction, itemCount, step = 1) {
  // Template: direction is Enumeration → case per value
  // itemCount is Atomic → use directly
  // state is Compound → access ui.selectedIdx
  // step is Atomic → stride for up/down in grid layouts (default 1 for lists)
  //
  // Directions:
  //   'down'   → currentIdx + step, boundary at max
  //   'up'     → currentIdx - step, boundary at 0
  //   'right'  → currentIdx + 1, boundary at max
  //   'left'   → currentIdx - 1, boundary at 0
  //   'top'    → jump to 0
  //   'bottom' → jump to max
  
  const currentIdx = state.ui.selectedIdx;
  const maxIdx = Math.max(0, itemCount - 1);
  
  let newIdx = currentIdx;
  let boundary = null;
  
  switch (direction) {
    case 'down':
      if (currentIdx >= maxIdx) {
        boundary = 'bottom';
      } else {
        newIdx = Math.min(currentIdx + step, maxIdx);
      }
      break;
      
    case 'up':
      if (currentIdx <= 0) {
        boundary = 'top';
      } else {
        newIdx = Math.max(currentIdx - step, 0);
      }
      break;

    case 'right':
      if (currentIdx >= maxIdx) {
        boundary = 'bottom';
      } else {
        newIdx = currentIdx + 1;
      }
      break;

    case 'left':
      if (currentIdx <= 0) {
        boundary = 'top';
      } else {
        newIdx = currentIdx - 1;
      }
      break;
      
    case 'top':
      newIdx = 0;
      break;
      
    case 'bottom':
      newIdx = maxIdx;
      break;
  }
  
  // Handle empty list
  if (itemCount === 0) {
    newIdx = 0;
    boundary = null;
  }
  
  return {
    state: { ...state, ui: { ...state.ui, selectedIdx: newIdx } },
    boundary
  };
}

/**
 * Toggle filter mode on/off.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @returns {AppState} New state with filterActive toggled and filterQuery cleared if turning off
 *
 * @example
 * // Turn on filter mode
 * onFilterToggle({ ui: { filterActive: false } })
 *   => { ui: { filterActive: true, filterQuery: '' } }
 *
 * @example
 * // Turn off filter mode (clears query)
 * onFilterToggle({ ui: { filterActive: true, filterQuery: 'test' } })
 *   => { ui: { filterActive: false, filterQuery: '' } }
 */
export function onFilterToggle(state) {
  // Template: Compound → access filterActive, filterQuery
  const isActive = state.ui.filterActive;
  
  return {
    ...state,
    ui: {
      ...state.ui,
      filterActive: !isActive,
      filterQuery: '',  // Clear query when toggling
      selectedIdx: !isActive ? state.ui.selectedIdx : 0  // Reset selection when turning off
    }
  };
}

/**
 * Update filter query text.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {string} query - New filter query
 * @returns {AppState} New state with updated filterQuery and reset selectedIdx
 *
 * @example
 * onFilterChange({ ui: { filterQuery: '' } }, 'test')
 *   => { ui: { filterQuery: 'test', selectedIdx: 0 } }
 */
export function onFilterChange(state, query) {
  // Template: query is Atomic → use directly
  return {
    ...state,
    ui: {
      ...state.ui,
      filterQuery: query,
      selectedIdx: 0  // Reset selection when filter changes
    }
  };
}

/**
 * Open a drawer.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {string} drawerType - Drawer to open ('palette', 'chapters', etc.)
 * @returns {AppState} New state with drawer open
 *
 * @example
 * onDrawerOpen({ ui: { drawer: null } }, 'palette')
 *   => { ui: { drawer: 'palette', paletteQuery: '', paletteSelectedIdx: 0 } }
 *
 * @example
 * onDrawerOpen({ ui: { drawer: null } }, 'chapters')
 *   => { ui: { drawer: 'chapters' } }
 */
export function onDrawerOpen(state, drawerType) {
  // Template: drawerType is Atomic → use directly
  const updates = { drawer: drawerType };
  
  // Reset palette state when opening palette
  if (drawerType === 'palette') {
    updates.paletteQuery = '';
    updates.paletteSelectedIdx = 0;
  }
  
  return {
    ...state,
    ui: { ...state.ui, ...updates }
  };
}

/**
 * Close the current drawer.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @returns {AppState} New state with drawer closed
 *
 * @example
 * onDrawerClose({ ui: { drawer: 'palette' } })
 *   => { ui: { drawer: null, paletteQuery: '', paletteSelectedIdx: 0 } }
 */
export function onDrawerClose(state) {
  return {
    ...state,
    ui: {
      ...state.ui,
      drawer: null,
      paletteQuery: '',
      paletteSelectedIdx: 0
    }
  };
}

/**
 * Update partial key sequence.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {string} key - Key to append to sequence
 * @returns {AppState} New state with updated keySeq
 *
 * @example
 * onKeySeqUpdate({ ui: { keySeq: '' } }, 'g')
 *   => { ui: { keySeq: 'g' } }
 *
 * @example
 * onKeySeqUpdate({ ui: { keySeq: 'g' } }, 'h')
 *   => { ui: { keySeq: 'gh' } }
 */
export function onKeySeqUpdate(state, key) {
  const newSeq = state.ui.keySeq + key;
  return { ...state, ui: { ...state.ui, keySeq: newSeq } };
}

/**
 * Clear key sequence.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @returns {AppState} New state with empty keySeq
 *
 * @example
 * onKeySeqClear({ ui: { keySeq: 'gh' } })
 *   => { ui: { keySeq: '' } }
 */
export function onKeySeqClear(state) {
  return { ...state, ui: { ...state.ui, keySeq: '' } };
}

/**
 * Update sort configuration.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {string|null} field - Sort field (null to reset)
 * @param {string} direction - 'asc' or 'desc'
 * @returns {AppState} New state with updated sort and reset selectedIdx
 *
 * @example
 * onSortChange({ ui: { sort: { field: null, direction: 'desc' } } }, 'date', 'asc')
 *   => { ui: { sort: { field: 'date', direction: 'asc' }, selectedIdx: 0 } }
 *
 * @example
 * // Reset sort
 * onSortChange(state, null, 'desc')
 *   => { ui: { sort: { field: null, direction: 'desc' }, selectedIdx: 0 } }
 */
export function onSortChange(state, field, direction) {
  return {
    ...state,
    ui: {
      ...state.ui,
      sort: { field, direction },
      selectedIdx: 0
    }
  };
}

/**
 * Show a flash message.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {string} text - Message text
 * @returns {AppState} New state with message set
 *
 * @example
 * onShowMessage(state, 'Copied!')
 *   => { ui: { message: { text: 'Copied!', timestamp: <now> } } }
 */
export function onShowMessage(state, text) {
  const message = { text, timestamp: Date.now() };
  return { ...state, ui: { ...state.ui, message } };
}

/**
 * Flash boundary indicator.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {'top'|'bottom'} edge - Which edge was hit
 * @returns {AppState} New state with boundaryFlash set
 *
 * @example
 * onBoundaryHit(state, 'top')
 *   => { ui: { boundaryFlash: { edge: 'top', timestamp: <now> } } }
 */
export function onBoundaryHit(state, edge) {
  const boundaryFlash = { edge, timestamp: Date.now() };
  return { ...state, ui: { ...state.ui, boundaryFlash } };
}

/**
 * Mark a video as added to Watch Later.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {string} videoId - Video ID that was added
 * @returns {AppState} New state with videoId in watchLaterAdded set
 *
 * @example
 * onWatchLaterAdd(state, 'abc123')
 *   => { ui: { watchLaterAdded: Set(['abc123']) } }
 */
export function onWatchLaterAdd(state, videoId) {
  const newSet = new Set(state.ui.watchLaterAdded);
  newSet.add(videoId);
  return { ...state, ui: { ...state.ui, watchLaterAdded: newSet } };
}

/**
 * Mark a video as removed from Watch Later (for undo support).
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {string} videoId - Video ID that was removed
 * @param {string} setVideoId - Playlist item ID (for undo API call)
 * @param {number} position - Position in playlist (for undo restore)
 * @returns {AppState} New state with removal tracked
 *
 * @example
 * onWatchLaterRemove(state, 'abc123', 'PLAYLIST_ITEM_ID', 2)
 *   => { ui: { watchLaterRemoved: Map([['abc123', { setVideoId, position }]]), lastWatchLaterRemoval: {...} } }
 */
export function onWatchLaterRemove(state, videoId, setVideoId, position) {
  const newMap = new Map(state.ui.watchLaterRemoved);
  newMap.set(videoId, { setVideoId, position });
  return { 
    ...state, 
    ui: { 
      ...state.ui, 
      watchLaterRemoved: newMap,
      lastWatchLaterRemoval: { videoId, setVideoId, position }
    } 
  };
}

/**
 * Clear a video from the removed set (after undo).
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {string} videoId - Video ID to restore
 * @returns {AppState} New state with video removed from watchLaterRemoved
 *
 * @example
 * onWatchLaterUndoRemove(state, 'abc123')
 *   => { ui: { watchLaterRemoved: Map([]) } }
 */
export function onWatchLaterUndoRemove(state, videoId) {
  const newMap = new Map(state.ui.watchLaterRemoved);
  newMap.delete(videoId);
  return { 
    ...state, 
    ui: { 
      ...state.ui, 
      watchLaterRemoved: newMap,
      lastWatchLaterRemoval: null
    } 
  };
}

/**
 * Mark a video as dismissed ("Not interested").
 * Dismissed videos remain visible but rendered grayed out.
 * Tracks last dismissal for undo support.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {string} videoId - Video ID to dismiss
 * @returns {AppState} New state with videoId in dismissedVideos set and lastDismissal set
 *
 * @example
 * onDismissVideo(state, 'abc123')
 *   => { ui: { dismissedVideos: Set(['abc123']), lastDismissal: { videoId: 'abc123' } } }
 */
export function onDismissVideo(state, videoId) {
  const newSet = new Set(state.ui.dismissedVideos);
  newSet.add(videoId);
  return { ...state, ui: { ...state.ui, dismissedVideos: newSet, lastDismissal: { videoId } } };
}

/**
 * Clear a video from the dismissed set (after undo).
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {string} videoId - Video ID to restore
 * @returns {AppState} New state with video removed from dismissedVideos
 *
 * @example
 * onUndoDismissVideo(state, 'abc123')
 *   => { ui: { dismissedVideos: Set([]), lastDismissal: null } }
 */
export function onUndoDismissVideo(state, videoId) {
  const newSet = new Set(state.ui.dismissedVideos);
  newSet.delete(videoId);
  return { ...state, ui: { ...state.ui, dismissedVideos: newSet, lastDismissal: null } };
}

/**
 * Clear expired flash states.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {number} messageTimeout - Message display duration in ms (default 2000)
 * @param {number} flashTimeout - Boundary flash duration in ms (default 150)
 * @returns {AppState} New state with expired flashes cleared
 */
export function onClearFlash(state, messageTimeout = 2000, flashTimeout = 150) {
  const now = Date.now();
  
  const { message, boundaryFlash } = state.ui;
  
  const newMessage = message && (now - message.timestamp) >= messageTimeout ? null : message;
  const newFlash = boundaryFlash && (now - boundaryFlash.timestamp) >= flashTimeout ? null : boundaryFlash;
  
  return {
    ...state,
    ui: { ...state.ui, message: newMessage, boundaryFlash: newFlash }
  };
}

/**
 * Toggle search mode on/off.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @returns {AppState} New state with searchActive toggled
 */
export function onSearchToggle(state) {
  const isActive = state.ui.searchActive;
  
  return {
    ...state,
    ui: {
      ...state.ui,
      searchActive: !isActive,
      searchQuery: ''
    }
  };
}

/**
 * Update search query text.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {string} query - New search query
 * @returns {AppState} New state with updated searchQuery
 */
export function onSearchChange(state, query) {
  return { ...state, ui: { ...state.ui, searchQuery: query } };
}

/**
 * Update command palette query.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {string} query - New palette query
 * @returns {AppState} New state with updated paletteQuery and reset selection
 */
export function onPaletteQueryChange(state, query) {
  return {
    ...state,
    ui: { ...state.ui, paletteQuery: query, paletteSelectedIdx: 0 }
  };
}

/**
 * Navigate in command palette.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {string} direction - 'up' or 'down'
 * @param {number} itemCount - Number of items in palette
 * @returns {{ state: AppState, boundary: 'top' | 'bottom' | null }}
 */
export function onPaletteNavigate(state, direction, itemCount) {
  const currentIdx = state.ui.paletteSelectedIdx;
  const maxIdx = Math.max(0, itemCount - 1);
  
  let newIdx = currentIdx;
  let boundary = null;
  
  if (direction === 'down') {
    if (currentIdx >= maxIdx) {
      boundary = 'bottom';
    } else {
      newIdx = currentIdx + 1;
    }
  } else if (direction === 'up') {
    if (currentIdx <= 0) {
      boundary = 'top';
    } else {
      newIdx = currentIdx - 1;
    }
  }
  
  if (itemCount === 0) {
    newIdx = 0;
    boundary = null;
  }
  
  return {
    state: { ...state, ui: { ...state.ui, paletteSelectedIdx: newIdx } },
    boundary
  };
}

/**
 * Handle URL change (navigation).
 * Resets page-specific state while preserving site state.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {string} newUrl - New URL
 * @param {SiteConfig|null} config - Site config for recreating site state if needed
 * @returns {AppState} New state with page reset
 */
export function onUrlChange(state, newUrl, config = null) {
  return {
    ...state,
    core: { ...state.core, lastUrl: newUrl },
    ui: {
      ...state.ui,
      drawer: null,
      paletteQuery: '',
      paletteSelectedIdx: 0,
      selectedIdx: 0,
      filterActive: false,
      filterQuery: '',
      keySeq: '',
      sort: { field: null, direction: 'desc' },
      message: null,
      boundaryFlash: null
      // Note: searchActive/searchQuery preserved (user might want to continue searching)
    },
    // site preserved, page reset
    page: null
  };
}

/**
 * Set page state on navigation.
 * Replaces state.page with new PageState.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {PageState} pageState - New page state (e.g., ListPageState, WatchPageState)
 * @returns {AppState} State with new page
 *
 * @example
 * onPageUpdate(state, { type: 'list', videos: [...] })
 *   => { ...state, page: { type: 'list', videos: [...] } }
 *
 * @example
 * onPageUpdate(state, { type: 'watch', videoContext: null, recommended: [], chapters: [] })
 *   => { ...state, page: { type: 'watch', ... } }
 */
export function onPageUpdate(state, pageState) {
  // Template: pageState is Compound → use directly
  return {
    ...state,
    page: pageState
  };
}

/**
 * Update videos in ListPageState (for content polling).
 * Only updates if current page is a list page.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {Array<ContentItem>} videos - New videos from content polling
 * @returns {AppState} State with updated videos (if list page)
 *
 * @example
 * // List page - updates videos
 * onListItemsUpdate({ page: { type: 'list', videos: [] } }, [video1, video2])
 *   => { page: { type: 'list', videos: [video1, video2] } }
 *
 * @example
 * // Watch page - no change (wrong page type)
 * onListItemsUpdate({ page: { type: 'watch', ... } }, [video1])
 *   => { page: { type: 'watch', ... } } // unchanged
 *
 * @example
 * // No page state - no change
 * onListItemsUpdate({ page: null }, [video1])
 *   => { page: null }
 */
export function onListItemsUpdate(state, videos) {
  // Template: state.page is Itemization → check type discriminator
  
  // Only update if we have a list page
  if (!state.page || state.page.type !== 'list') {
    return state;
  }
  
  return {
    ...state,
    page: {
      ...state.page,
      videos
    }
  };
}

/**
 * Update items (from content polling).
 * @deprecated Use onListItemsUpdate instead - this exists for backward compatibility
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {Array} items - New items (stored in page state if needed)
 * @returns {AppState} State (potentially with page.items updated)
 */
export function onItemsUpdate(state, items) {
  // Delegate to onListItemsUpdate for list pages
  return onListItemsUpdate(state, items);
}

/**
 * Determine action for selecting current item.
 * Returns action descriptor - I/O shell handles actual navigation.
 * [PURE]
 *
 * @param {AppState} state - Current state
 * @param {Array<Item>} visibleItems - Items currently visible (after filter/sort)
 * @param {boolean} shiftKey - Whether shift was held (open in new tab)
 * @returns {{ action: 'navigate'|'newTab'|null, url: string|null }} Action descriptor
 *
 * @example
 * // Normal select - navigate to item
 * onSelect(state, [{ url: '/watch?v=abc' }], false)
 *   => { action: 'navigate', url: '/watch?v=abc' }
 *
 * @example
 * // Shift+select - open in new tab
 * onSelect(state, [{ url: '/watch?v=abc' }], true)
 *   => { action: 'newTab', url: '/watch?v=abc' }
 *
 * @example
 * // No item selected
 * onSelect(state, [], false)
 *   => { action: null, url: null }
 */
export function onSelect(state, visibleItems, shiftKey = false) {
  // Template: visibleItems is List → access by index
  // state is Compound → access selectedIdx
  // shiftKey is Boolean → case per value
  
  const item = visibleItems[state.ui.selectedIdx];
  
  if (!item || !item.url) {
    return { action: null, url: null };
  }
  
  return {
    action: shiftKey ? 'newTab' : 'navigate',
    url: item.url
  };
}
