// Google Autocomplete Suggest Drawer
// Custom drawer handler for Google search autocomplete suggestions.
//
// Data definitions:
//
// SuggestDrawerConfig = { searchUrl: (query) => string, placeholder: string, initialQuery: string }
//   - searchUrl: function that builds a Google search URL from a query string
//   - placeholder: placeholder text for the status bar input
//   - initialQuery: initial query to pre-fill (read from URL ?q= param)
//
// SuggestState (closure-internal):
//   - query: string — current typed query
//   - suggestions: string[] — fetched autocomplete suggestions
//   - selectedIdx: number — index of currently highlighted suggestion (-1 = none)
//   - userNavigated: boolean — true if user pressed ArrowDown/Up (affects Enter behavior)
//   - debounceTimer: number|null — setTimeout id for debounced fetch
//   - abortController: AbortController|null — for cancelling in-flight fetches
//
// DrawerHandler interface (from drawer.js):
//   { render(container), updateQuery(query), getFilterPlaceholder(), onKey(key, state) → {handled, newState}, cleanup() }
//
// Navigation rules:
//   - ArrowDown/Up: navigate suggestions, set userNavigated=true
//   - Enter:
//       if userNavigated && selectedIdx >= 0: navigate to searchUrl(suggestions[selectedIdx])
//       else: navigate to searchUrl(query)   (typed query)
//   - Escape: close drawer (return newState with drawer: null)
//
// Fetch endpoint: /complete/search?client=firefox&q=<encoded-query>
//   Returns JSON: [query, [suggestion1, suggestion2, ...]]

import { injectDrawerStyles } from '../../core/drawer.js';
import { el, clear, updateListSelection } from '../../core/view.js';

/**
 * Fetch autocomplete suggestions from Google's suggest API.
 * [I/O - network]
 *
 * @param {string} query - Search query to get suggestions for
 * @param {AbortSignal} signal - AbortController signal for cancellation
 * @returns {Promise<string[]>} Array of suggestion strings
 */
export async function fetchGoogleSuggestions(query, signal) {
  if (!query) return [];
  try {
    const response = await fetch(
      `/complete/search?client=firefox&q=${encodeURIComponent(query)}`,
      { signal }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data[1] || [];
  } catch {
    return [];
  }
}

/**
 * Create a suggest drawer handler for Google autocomplete.
 * Returns a DrawerHandler that manages its own internal state via closure.
 * [PURE] (returns handler; handler methods have I/O)
 *
 * @param {SuggestDrawerConfig} config - { searchUrl, placeholder, initialQuery }
 * @returns {DrawerHandler} Handler with render, updateQuery, getFilterPlaceholder, onKey, cleanup
 */
export function createSuggestDrawer(config) {
  // Closure state
  let query = config.initialQuery || '';
  let suggestions = [];
  let selectedIdx = -1;
  let userNavigated = false;
  let debounceTimer = null;
  let abortController = null;
  let drawerEl = null;
  let listEl = null;

  /** Cancel any pending debounce timer and in-flight fetch */
  const cancelPending = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  };

  /** Render the suggestion list into listEl */
  const renderList = () => {
    if (!listEl) return;
    clear(listEl);

    if (suggestions.length === 0) {
      if (query) {
        const msgEl = document.createElement('div');
        msgEl.className = 'vilify-drawer-item';
        msgEl.textContent = 'Type to search...';
        msgEl.style.color = 'var(--txt-2)';
        msgEl.style.fontSize = '13px';
        msgEl.style.padding = '10px 16px';
        listEl.appendChild(msgEl);
      }
      return;
    }

    suggestions.forEach((suggestion, idx) => {
      const isSelected = idx === selectedIdx;
      const itemEl = document.createElement('div');
      itemEl.className = 'vilify-drawer-item' + (isSelected ? ' selected' : '');
      itemEl.textContent = suggestion;
      itemEl.style.color = isSelected ? 'var(--txt-1)' : 'var(--txt-2)';
      itemEl.style.fontSize = '13px';
      itemEl.style.padding = '10px 16px';
      listEl.appendChild(itemEl);
    });

    if (selectedIdx >= 0) {
      updateListSelection(listEl, '.vilify-drawer-item', selectedIdx);
    }
  };

  /** Cancel pending fetch and debounce, then schedule a new fetch for q */
  const debounceFetch = (q) => {
    cancelPending();

    if (!q) {
      suggestions = [];
      renderList();
      return;
    }

    debounceTimer = setTimeout(async () => {
      abortController = new AbortController();
      const results = await fetchGoogleSuggestions(q, abortController.signal);
      suggestions = results;
      renderList();
    }, 200);
  };

  return {
    render: (container) => {
      injectDrawerStyles();

      listEl = document.createElement('div');
      listEl.className = 'vilify-drawer-list';

      drawerEl = document.createElement('div');
      drawerEl.className = 'vilify-drawer open';
      drawerEl.appendChild(listEl);

      container.appendChild(drawerEl);

      if (config.initialQuery) {
        debounceFetch(config.initialQuery);
      }
    },

    updateQuery: (q) => {
      query = q;
      selectedIdx = -1;
      userNavigated = false;
      debounceFetch(q);
    },

    getFilterPlaceholder: () => config.placeholder,

    onKey: (key, state) => {
      if (key === 'Escape') {
        return { handled: true, newState: { ...state, ui: { ...state.ui, drawer: null } } };
      }

      if (key === 'ArrowDown') {
        if (suggestions.length > 0) {
          selectedIdx = Math.min(selectedIdx + 1, suggestions.length - 1);
          userNavigated = true;
          renderList();
        }
        return { handled: true, newState: state };
      }

      if (key === 'ArrowUp') {
        if (selectedIdx > 0) {
          selectedIdx--;
          userNavigated = true;
          renderList();
        } else if (selectedIdx === 0) {
          selectedIdx = -1;
          renderList();
        }
        return { handled: true, newState: state };
      }

      if (key === 'Enter') {
        const searchQuery = (userNavigated && selectedIdx >= 0)
          ? suggestions[selectedIdx]
          : query;
        if (searchQuery) {
          location.href = config.searchUrl(searchQuery);
        }
        return { handled: true, newState: { ...state, ui: { ...state.ui, drawer: null } } };
      }

      return { handled: false, newState: state };
    },

    cleanup: () => {
      cancelPending();
      if (drawerEl) {
        drawerEl.remove();
        drawerEl = null;
      }
      listEl = null;
    },
  };
}

// =============================================================================
// CACHED SINGLETON (same pattern as YouTube's getChapterDrawer/resetChapterDrawer)
// =============================================================================

/** @type {DrawerHandler|null} Cached drawer instance */
let cachedDrawer = null;

/**
 * Get or create the suggest drawer handler (cached singleton).
 * Returns the same instance for all calls while the drawer is open.
 * Cleanup auto-clears the cache so the next open creates a fresh instance.
 * [PURE factory]
 *
 * @param {SuggestDrawerConfig} config - { searchUrl, placeholder, initialQuery }
 * @returns {DrawerHandler}
 */
export function getSuggestDrawer(config) {
  if (!cachedDrawer) {
    const drawer = createSuggestDrawer(config);
    // Wrap cleanup to also clear module cache
    const originalCleanup = drawer.cleanup;
    drawer.cleanup = () => {
      originalCleanup();
      cachedDrawer = null;
    };
    cachedDrawer = drawer;
  }
  return cachedDrawer;
}

/**
 * Reset the cached suggest drawer (call on navigation away).
 */
export function resetSuggestDrawer() {
  if (cachedDrawer?.cleanup) {
    cachedDrawer.cleanup();
  }
  cachedDrawer = null;
}
