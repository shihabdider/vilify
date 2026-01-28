// State management - Core state functions for Vilify
// Following HTDP design from .design/DATA.md and .design/BLUEPRINT.md

/**
 * Creates initial application state with all defaults.
 * [PURE]
 *
 * @returns {AppState} Initial state
 *
 * @example
 * createAppState()
 *   => { focusModeActive: false, modalState: null, paletteQuery: '',
 *        paletteSelectedIdx: 0, selectedIdx: 0, localFilterActive: false,
 *        localFilterQuery: '', siteSearchActive: false, siteSearchQuery: '',
 *        keySeq: '', lastUrl: '' }
 */
export function createAppState() {
  // Template: Compound - construct all fields
  return {
    focusModeActive: false,
    modalState: null,
    paletteQuery: '',
    paletteSelectedIdx: 0,
    selectedIdx: 0,
    localFilterActive: false,
    localFilterQuery: '',
    siteSearchActive: false,
    siteSearchQuery: '',
    keySeq: '',
    lastUrl: ''
  };
}

/**
 * Returns a fresh state, discarding all current values.
 * Equivalent to createAppState().
 * [PURE]
 *
 * @param {AppState} _state - Current state (ignored)
 * @returns {AppState} Fresh initial state
 *
 * @example
 * resetState({ focusModeActive: true, ... })
 *   => { focusModeActive: false, ... }
 */
export function resetState(_state) {
  // Template: Compound - ignore input, return fresh state
  return createAppState();
}

/**
 * Derives display mode from current state.
 * [PURE]
 *
 * @param {AppState} state - Current application state
 * @returns {'NORMAL' | 'COMMAND' | 'FILTER' | 'SEARCH'} Current mode
 *
 * @example
 * getMode({ modalState: null, localFilterActive: false, siteSearchActive: false, ... })  => 'NORMAL'
 * getMode({ modalState: 'palette', paletteQuery: ':', ... })                              => 'COMMAND'
 * getMode({ modalState: null, localFilterActive: true, ... })                             => 'FILTER'
 * getMode({ modalState: null, siteSearchActive: true, ... })                              => 'SEARCH'
 */
export function getMode(state) {
  // Template: Compound - access modalState, localFilterActive, siteSearchActive
  // Priority order: palette (COMMAND) > localFilter (FILTER) > siteSearch (SEARCH) > NORMAL

  if (state.modalState === 'palette') {
    return 'COMMAND';
  }

  if (state.localFilterActive) {
    return 'FILTER';
  }

  if (state.siteSearchActive) {
    return 'SEARCH';
  }

  return 'NORMAL';
}

/**
 * Creates initial YouTube-specific state.
 * [PURE]
 *
 * @returns {YouTubeState} Initial YouTube state
 *
 * @example
 * createYouTubeState()
 *   => { chapterQuery: '', chapterSelectedIdx: 0,
 *        commentPage: 0, commentPageStarts: [0],
 *        settingsApplied: false, watchPageRetryCount: 0, commentLoadAttempts: 0 }
 */
export function createYouTubeState() {
  // Template: Compound - construct all fields per YouTubeState definition
  return {
    chapterQuery: '',
    chapterSelectedIdx: 0,
    commentPage: 0,
    commentPageStarts: [0],
    settingsApplied: false,
    watchPageRetryCount: 0,
    commentLoadAttempts: 0
  };
}
