// Keyboard handler - Core keyboard functions for Vilify
// Following HTDP design from .design/DATA.md and .design/BLUEPRINT.md

import { isInputElement } from './view.js';

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
    return { action: null, newSeq: keySeq, shouldPrevent: false };
  }

  // Build key from event.key (lowercase if single char)
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  
  // Append to current sequence
  const newSeq = keySeq + key;

  // Check if newSeq matches any sequence exactly
  if (sequences[newSeq]) {
    return { action: sequences[newSeq], newSeq: '', shouldPrevent: true };
  }

  // Check if partial match exists (some sequence starts with newSeq)
  const hasPrefix = Object.keys(sequences).some(seq => seq.startsWith(newSeq));
  if (hasPrefix) {
    return { action: null, newSeq, shouldPrevent: false };
  }

  // No match possible - reset sequence
  return { action: null, newSeq: '', shouldPrevent: false };
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
export function setupKeyboardHandler(config, getState, setState, callbacks) {
  // Template: I/O - Set up event listener with closure over state
  
  // Keyboard state (mutable, managed locally)
  let keySeq = '';
  let keyTimer = null;
  
  const KEY_SEQ_TIMEOUT_MS = 500;

  document.addEventListener('keydown', (event) => {
    const state = getState();
    const target = event.target;

    // Skip if target is input element (except our palette input)
    // Note: Palette input handling will be done separately
    if (isInputElement(target)) {
      // But still handle Escape to blur YouTube search
      if (event.key === 'Escape') {
        const isYouTubeSearch = target.id === 'search' || 
                                target.closest?.('ytd-searchbox') || 
                                target.closest?.('#search-form');
        if (isYouTubeSearch) {
          event.preventDefault();
          event.stopPropagation();
          target.blur();
          return;
        }
      }
      return;
    }

    // Skip if focus mode not active
    if (!state.focusModeActive) {
      return;
    }

    // Handle Escape specially (close modals, exit filter/search)
    if (event.key === 'Escape') {
      event.preventDefault();
      
      // Close any open modal first
      if (state.modalState !== null) {
        setState({ ...state, modalState: null, paletteQuery: '', paletteSelectedIdx: 0 });
        if (callbacks.onRender) callbacks.onRender();
        return;
      }
      
      // Exit filter mode
      if (state.localFilterActive) {
        setState({ ...state, localFilterActive: false, localFilterQuery: '' });
        if (callbacks.onRender) callbacks.onRender();
        return;
      }
      
      // Exit search mode
      if (state.siteSearchActive) {
        setState({ ...state, siteSearchActive: false, siteSearchQuery: '' });
        if (callbacks.onRender) callbacks.onRender();
        return;
      }
      
      return;
    }

    // Don't process key sequences when modals are open
    if (state.modalState !== null) {
      return;
    }

    // Get page type from config if available
    const pageType = config.getPageType ? config.getPageType() : null;
    const isWatchPage = pageType === 'watch';
    const isListingPage = !isWatchPage;

    // Handle Ctrl+f/b for comment pagination (watch page only)
    if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
      if ((event.key === 'f' || event.key === 'b') && isWatchPage) {
        event.preventDefault();
        // Callbacks for comment pagination will be wired up later
        // For now, these are stub placeholders
        if (event.key === 'f' && callbacks.onNextCommentPage) {
          callbacks.onNextCommentPage();
        } else if (event.key === 'b' && callbacks.onPrevCommentPage) {
          callbacks.onPrevCommentPage();
        }
        return;
      }
    }

    // Handle j/k for list navigation on listing pages
    if (isListingPage && !state.localFilterActive && !state.siteSearchActive) {
      if (event.key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault();
        if (callbacks.onNavigate) {
          callbacks.onNavigate('down');
        }
        return;
      }
      
      if (event.key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (callbacks.onNavigate) {
          callbacks.onNavigate('up');
        }
        return;
      }
      
      // Handle Enter for selection
      if (event.key === 'Enter') {
        event.preventDefault();
        if (callbacks.onSelect) {
          callbacks.onSelect(event.shiftKey);
        }
        return;
      }
    }

    // Ignore modifier keys for sequence building
    const modifierKeys = ['Shift', 'Control', 'Alt', 'Meta'];
    if (modifierKeys.includes(event.key)) {
      return;
    }

    // Get key sequences from config, passing callbacks for modal openers
    const appCallbacks = {
      openPalette: (mode) => {
        const newState = { ...state, modalState: 'palette', paletteQuery: mode === 'command' ? ':' : '', paletteSelectedIdx: 0 };
        setState(newState);
      },
      openFilter: () => {
        setState({ ...state, localFilterActive: true, localFilterQuery: '' });
      },
      openSearch: () => {
        // Open our search mode
        setState({ ...state, siteSearchActive: true, siteSearchQuery: '' });
      },
      openDescriptionModal: () => {
        setState({ ...state, modalState: 'description' });
      },
      closeDescriptionModal: () => {
        if (state.modalState === 'description') {
          setState({ ...state, modalState: null });
        }
      },
      openChapterPicker: () => {
        setState({ ...state, modalState: 'chapters' });
      },
    };
    const sequences = config.getKeySequences ? config.getKeySequences(appCallbacks) : {};

    // Check for single-key modal openers FIRST (before sequence building)
    // These special keys (`:`, `/`, `i`) should trigger immediately
    const singleKeyActions = [':', '/', 'i'];
    if (singleKeyActions.includes(event.key) && sequences[event.key]) {
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

    // Execute action if matched
    if (result.action) {
      result.action();
      return;
    }

    // Set timeout to clear sequence if no match and sequence is building
    if (keySeq) {
      keyTimer = setTimeout(() => {
        keySeq = '';
        keyTimer = null;
      }, KEY_SEQ_TIMEOUT_MS);
    }
  }, true); // capture: true - intercept before YouTube
}
