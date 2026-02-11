// Keyboard handler - Core keyboard functions for Vilify
// Following HTDP design from .design/DATA.md and .design/BLUEPRINT.md

import { isInputElement, showMessage } from './view.js';
import { removeFocusMode } from './layout.js';

/**
 * Returns initial keyboard state.
 * [PURE]
 *
 * @returns {{ keySeq: string, keyTimer: number | null }} Initial keyboard state
 *
 * @example
 * createKeyboardState() => { keySeq: '', keyTimer: null }
 */
export function createKeyboardState() {
  // Template: Compound - construct all fields
  return {
    keySeq: '',
    keyTimer: null
  };
}

/**
 * Process a key event against registered sequences.
 * Returns action to execute (if any), updated sequence, and whether to prevent default.
 * [PURE]
 *
 * @param {KeyboardEvent} event - The keyboard event
 * @param {string} keySeq - Current accumulated key sequence
 * @param {Object} sequences - Map of sequence strings to action functions
 * @param {number} timeout - Sequence timeout in ms (for reference, not used in pure function)
 * @returns {{ action: Function | null, newSeq: string, shouldPrevent: boolean }}
 *
 * @example
 * // User presses 'g', no match yet but 'gh' exists
 * handleKeyEvent(event, '', { 'gh': goHome, 'gs': goSubs }, 500)
 *   => { action: null, newSeq: 'g', shouldPrevent: false }
 *
 * // User presses 'h' after 'g'
 * handleKeyEvent(event, 'g', { 'gh': goHome, 'gs': goSubs }, 500)
 *   => { action: goHome, newSeq: '', shouldPrevent: true }
 *
 * // User presses 'x', no match, no prefix match
 * handleKeyEvent(event, '', { 'gh': goHome }, 500)
 *   => { action: null, newSeq: '', shouldPrevent: false }
 */
export function handleKeyEvent(event, keySeq, sequences, timeout) {
  // Template: Process event, check sequences, return result
  
  // Ignore modifier keys (they don't contribute to sequences)
  const modifierKeys = ['Shift', 'Control', 'Alt', 'Meta'];
  if (modifierKeys.includes(event.key)) {
    return { action: null, pendingAction: null, newSeq: keySeq, shouldPrevent: false };
  }

  // Build key from event.key (lowercase if single char)
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  
  // Append to current sequence
  const newSeq = keySeq + key;

  const exactMatch = sequences[newSeq] || null;
  const hasLongerMatch = Object.keys(sequences).some(
    seq => seq.length > newSeq.length && seq.startsWith(newSeq)
  );

  // Unambiguous exact match — fire immediately
  if (exactMatch && !hasLongerMatch) {
    return { action: exactMatch, pendingAction: null, newSeq: '', shouldPrevent: true };
  }

  // Ambiguous: exact match AND longer prefix exists — defer to timeout
  if (exactMatch && hasLongerMatch) {
    return { action: null, pendingAction: exactMatch, newSeq, shouldPrevent: true };
  }

  // No exact match but prefix exists — keep building
  if (hasLongerMatch) {
    return { action: null, pendingAction: null, newSeq, shouldPrevent: false };
  }

  // No match at all — reset
  return { action: null, pendingAction: null, newSeq: '', shouldPrevent: false };
}

/**
 * Set up the capture-phase keyboard listener.
 * [I/O]
 *
 * @param {SiteConfig} config - Site configuration with getKeySequences
 * @param {() => AppState} getState - Function to get current app state
 * @param {(AppState) => void} setState - Function to update app state
 * @param {Object} callbacks - Event callbacks
 * @param {() => void} callbacks.onRender - Called when UI needs re-render
 *
 * @example
 * setupKeyboardHandler(youtubeConfig, getState, setState, {
 *   onRender: () => renderFocusMode(config, state)
 * })
 * // Registers capture-phase keydown listener
 */
export function setupKeyboardHandler(config, getState, setState, callbacks, getSiteState = null) {
  // Template: I/O - Set up event listener with closure over state
  
  // Keyboard state (mutable, managed locally)
  let keySeq = '';
  let keyTimer = null;
  let pendingAction = null;
  
  const KEY_SEQ_TIMEOUT_MS = 500;

  const handler = (event) => {
    const state = getState();
    const target = event.target;

    // Get state properties from nested structure
    const { drawer, filterActive, searchActive } = state.ui;
    const focusModeActive = state.core.focusModeActive;

    // Skip if target is input element (with exceptions for our inputs)
    if (isInputElement(target)) {
      const isDrawerFilter = target.id?.startsWith('vilify-drawer-') && target.id?.endsWith('-input');
      const isStatusBarFilter = target.id === 'vilify-status-input' && filterActive;
      const isSiteDrawerInput = target.id === 'vilify-status-input' && 
                                drawer !== null && 
                                drawer !== 'palette' && 
                                drawer !== 'recommended';
      const isYouTubeSearch = target.id === 'search' || 
                              target.closest?.('ytd-searchbox') || 
                              target.closest?.('#search-form');
      
      // For filter inputs: arrows/Enter/Escape navigate, letters stay in input
      if (isDrawerFilter || isStatusBarFilter) {
        if (event.key === 'Escape' || event.key === 'Enter' || 
            event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          // Don't return - let these fall through to handlers below
        } else {
          // j/k and other keys stay in input for typing
          return;
        }
      } else if (isSiteDrawerInput) {
        // For site-specific drawers with input (chapters): 
        // - Escape/Enter fall through to keyboard handler
        // - Arrow keys are handled by input's onkeydown (don't duplicate here)
        // - j/k stay in input for typing
        if (event.key === 'Escape' || event.key === 'Enter') {
          // Don't return - let these fall through to handlers below
        } else {
          // Arrow keys handled by input handler, letters stay in input
          return;
        }
      } else if (event.key === 'Escape' && isYouTubeSearch) {
        // Handle Escape to blur YouTube search
        event.preventDefault();
        event.stopPropagation();
        target.blur();
        return;
      } else {
        // All other inputs - don't intercept
        return;
      }
    }

    // Skip if focus mode not active
    if (!focusModeActive) {
      return;
    }

    // Handle Escape specially (close modals, exit filter/search)
    if (event.key === 'Escape') {
      event.preventDefault();
      
      // Close any open modal first
      if (drawer !== null) {
        setState({ ...state, ui: { ...state.ui, drawer: null, paletteQuery: '', paletteSelectedIdx: 0 } });
        if (callbacks.onRender) callbacks.onRender();
        return;
      }
      
      // Exit filter mode
      if (filterActive) {
        setState({ ...state, ui: { ...state.ui, filterActive: false, filterQuery: '' } });
        if (callbacks.onRender) callbacks.onRender();
        return;
      }
      
      // Exit search mode
      if (searchActive) {
        setState({ ...state, ui: { ...state.ui, searchActive: false, searchQuery: '' } });
        if (callbacks.onRender) callbacks.onRender();
        return;
      }
      
      return;
    }

    // Handle site-specific drawer keys (delegates to drawer handler)
    // Palette is handled separately, recommended drawer is handled by status bar input
    if (drawer !== null && 
        drawer !== 'palette' && 
        drawer !== 'recommended') {
      event.preventDefault();
      if (callbacks.onDrawerKey) {
        const handled = callbacks.onDrawerKey(event.key);
        if (handled) return;
      }
      // Don't process other keys when drawer is open
      return;
    }

    // Don't process key sequences when palette is open
    if (drawer === 'palette') {
      return;
    }

    // Get page type from config if available
    const pageType = config.getPageType ? config.getPageType() : null;
    const isWatchPage = pageType === 'watch';
    const isListingPage = !isWatchPage;

    // Handle Ctrl+f/b for pagination
    // - On watch page: comment pagination (YouTube-specific)
    // - On listing page: site page navigation (Google search pages, etc.)
    if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
      if (event.key === 'f' || event.key === 'b') {
        event.preventDefault();
        
        if (isWatchPage) {
          // Watch page: comment pagination
          if (event.key === 'f' && callbacks.onNextCommentPage) {
            callbacks.onNextCommentPage();
          } else if (event.key === 'b' && callbacks.onPrevCommentPage) {
            callbacks.onPrevCommentPage();
          }
        } else {
          // Listing page: check for site-specific pagination via getSingleKeyActions
          // Uppercase key indicates Ctrl modifier (e.g., 'F' for Ctrl+f)
          // Note: passing null for app callbacks since pagination doesn't need them
          const siteActions = config.getSingleKeyActions ? config.getSingleKeyActions(null) : {};
          const ctrlKey = event.key.toUpperCase();
          if (siteActions[ctrlKey]) {
            siteActions[ctrlKey]();
          }
        }
        return;
      }
    }

    // Handle list navigation on listing pages
    // - Arrow keys work even when filtering (passthrough from input)
    // - Enter works even when filtering
    // - j/k only when NOT filtering (user might type those letters)
    if (isListingPage) {
      // Arrow keys always navigate (even in filter mode)
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (callbacks.onNavigate) {
          callbacks.onNavigate('down');
        }
        return;
      }
      
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (callbacks.onNavigate) {
          callbacks.onNavigate('up');
        }
        return;
      }
      
      // Enter always selects (even in filter mode)
      if (event.key === 'Enter') {
        event.preventDefault();
        if (callbacks.onSelect) {
          callbacks.onSelect(event.shiftKey);
        }
        return;
      }
      

      
      // u undoes the last removal/dismissal
      if (event.key === 'u' && !filterActive && !searchActive) {
        event.preventDefault();
        if (callbacks.onUndoWatchLaterRemoval) {
          callbacks.onUndoWatchLaterRemoval();
        }
        return;
      }
      
      // j/k/h/l only navigate when NOT filtering (user might type those letters)
      if (!filterActive && !searchActive) {
        if (event.key === 'j') {
          event.preventDefault();
          if (callbacks.onNavigate) {
            callbacks.onNavigate('down');
          }
          return;
        }
        
        if (event.key === 'k') {
          event.preventDefault();
          if (callbacks.onNavigate) {
            callbacks.onNavigate('up');
          }
          return;
        }

        if (event.key === 'h') {
          event.preventDefault();
          if (callbacks.onNavigate) {
            callbacks.onNavigate('left');
          }
          return;
        }

        if (event.key === 'l') {
          event.preventDefault();
          if (callbacks.onNavigate) {
            callbacks.onNavigate('right');
          }
          return;
        }
      }
    }

    // Ignore modifier keys for sequence building
    const modifierKeys = ['Shift', 'Control', 'Alt', 'Meta'];
    if (modifierKeys.includes(event.key)) {
      return;
    }

    // Get key sequences from config, passing callbacks for drawer openers
    // Helper to create new state with nested structure
    const updateUI = (updates) => {
      const currentState = getState();
      return { ...currentState, ui: { ...currentState.ui, ...updates } };
    };
    
    const appCallbacks = {
      openPalette: (mode) => {
        const newState = updateUI({ 
          drawer: 'palette', 
          paletteQuery: mode === 'command' ? ':' : '', 
          paletteSelectedIdx: 0 
        });
        setState(newState);
      },
      openRecommended: () => {
        setState(updateUI({ drawer: 'recommended' }));
      },
      openLocalFilter: () => {
        setState(updateUI({ filterActive: true, filterQuery: '' }));
      },
      openSearch: () => {
        // Open our search mode
        setState(updateUI({ searchActive: true, searchQuery: '' }));
      },
      openDrawer: (drawerId) => {
        setState(updateUI({ drawer: drawerId }));
      },
      closeDrawer: () => {
        setState(updateUI({ drawer: null }));
      },
      goToTop: () => {
        if (callbacks.onNavigate) {
          callbacks.onNavigate('top');
        }
      },
      goToBottom: () => {
        if (callbacks.onNavigate) {
          callbacks.onNavigate('bottom');
        }
      },
      openTranscriptDrawer: () => {
        const siteState = getSiteState?.();
        if (!siteState) return;
        
        const currentState = getState();
        const currentDrawer = currentState.ui?.drawer ?? null;
        
        // Toggle off if already open
        if (currentDrawer === 'transcript') {
          setState(updateUI({ drawer: null }));
          return;
        }
        
        // Check availability
        if (!siteState.transcript || siteState.transcript.status !== 'loaded') {
          // Show appropriate message based on transcript state
          if (siteState.transcript === null || siteState.transcript.status === 'loading') {
            showMessage('Loading transcript...');
          } else {
            // status === 'unavailable'
            showMessage('No transcript available');
          }
          return;
        }
        
        // Open drawer
        setState(updateUI({ drawer: 'transcript' }));
      },
      dismissVideo: () => {
        if (callbacks.onDismissVideo) {
          callbacks.onDismissVideo();
        }
      },
      addToWatchLater: () => {
        if (callbacks.onAddToWatchLater) {
          callbacks.onAddToWatchLater();
        }
      },
      removeFromWatchLater: () => {
        if (callbacks.onRemoveFromWatchLater) {
          callbacks.onRemoveFromWatchLater();
        }
      },
      exitFocusMode: () => {
        const currentState = getState();
        setState({ ...currentState, core: { ...currentState.core, focusModeActive: false } });
        removeFocusMode();
        document.body.classList.remove('vilify-watch-page');
      },
      updateSubscribeButton: (isSubscribed) => {
        // Update subscription status indicator after channel name
        const statusEl = document.getElementById('vilify-sub-status');
        if (statusEl) {
          statusEl.textContent = isSubscribed ? '· subscribed' : '· subscribe';
          if (isSubscribed) {
            statusEl.classList.remove('not-subscribed');
          } else {
            statusEl.classList.add('not-subscribed');
          }
        }
        
        // Update action hint text
        const actionEl = document.getElementById('vilify-sub-action');
        if (actionEl) {
          const kbd = document.createElement('kbd');
          kbd.textContent = 'ms';
          actionEl.innerHTML = '';
          actionEl.appendChild(kbd);
          actionEl.appendChild(document.createTextNode(isSubscribed ? 'unsub' : 'sub'));
        }
      },
    };
    const sequences = config.getKeySequences ? config.getKeySequences(appCallbacks) : {};

    // Check for single-key modal openers FIRST (before sequence building)
    // These special keys (`:`, `/`, `i`) should trigger immediately
    // BUT only when no key sequence is in progress (e.g., 'gi' must not fire 'i')
    const singleKeyActions = [':', '/', 'i'];
    if (singleKeyActions.includes(event.key) && sequences[event.key] && !keySeq) {
      event.preventDefault();
      event.stopPropagation(); // Stop YouTube from handling
      keySeq = '';
      if (keyTimer) {
        clearTimeout(keyTimer);
        keyTimer = null;
      }
      sequences[event.key]();
      // Focus the input after opening modal
      setTimeout(() => {
        const input = document.getElementById('vilify-status-input');
        if (input) input.focus();
      }, 10);
      return;
    }

    // Check for single-key actions with modifiers (e.g., Shift+Y)
    const siteActions = config.getSingleKeyActions ? config.getSingleKeyActions(appCallbacks) : {};
    if (siteActions[event.key]) {
      event.preventDefault();
      event.stopPropagation();
      keySeq = '';
      if (keyTimer) {
        clearTimeout(keyTimer);
        keyTimer = null;
      }
      siteActions[event.key]();
      return;
    }

    // On watch page, block single keys that YouTube would handle (f, m, c, t, etc.)
    // We handle these via sequences, so prevent YouTube's native handling
    if (isWatchPage) {
      const youtubeKeys = ['f', 'm', 'c', 't', 'j', 'k', 'l', ' '];
      if (youtubeKeys.includes(event.key.toLowerCase()) || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        // Don't return - let the sequence handler process it
      }
    }

    // Clear existing timeout
    if (keyTimer) {
      clearTimeout(keyTimer);
      keyTimer = null;
    }

    // Process key event through pure function
    const result = handleKeyEvent(event, keySeq, sequences, KEY_SEQ_TIMEOUT_MS);

    // Update local sequence state
    keySeq = result.newSeq;

    // Prevent default if needed
    if (result.shouldPrevent) {
      event.preventDefault();
    }

    // Unambiguous match — execute immediately
    if (result.action) {
      pendingAction = null;
      result.action();
      return;
    }

    // Ambiguous match — store pending action for timeout
    if (result.pendingAction) {
      pendingAction = result.pendingAction;
    }

    // Sequence broke (reset to '') with no new action — fire stored pending
    if (result.newSeq === '' && pendingAction) {
      const fn = pendingAction;
      pendingAction = null;
      fn();
      return;
    }

    // Set timeout to fire pending action or clear sequence
    if (keySeq) {
      keyTimer = setTimeout(() => {
        if (pendingAction) {
          pendingAction();
          pendingAction = null;
        }
        keySeq = '';
        keyTimer = null;
      }, KEY_SEQ_TIMEOUT_MS);
    }
  };
  
  // Add event listener (capture: true - intercept before YouTube)
  document.addEventListener('keydown', handler, true);

  // Return cleanup function
  return function cleanup() {
    document.removeEventListener('keydown', handler, true);
    if (keyTimer) {
      clearTimeout(keyTimer);
      keyTimer = null;
    }
    pendingAction = null;
  };
}
