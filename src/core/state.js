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
 *   => { focusModeActive: false, drawerState: null, paletteQuery: '',
 *        paletteSelectedIdx: 0, selectedIdx: 0, localFilterActive: false,
 *        localFilterQuery: '', siteSearchActive: false, siteSearchQuery: '',
 *        keySeq: '', lastUrl: '' }
 */
export function createAppState() {
  // Template: Compound - construct all fields
  return {
    focusModeActive: false,
    drawerState: null,  // DrawerState: null | 'palette' | site-specific string
    paletteQuery: '',   // TODO: Move to palette drawer internal state in future iteration
    paletteSelectedIdx: 0, // TODO: Move to palette drawer internal state in future iteration
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
 * @returns {string} Current mode (NORMAL, COMMAND, FILTER, SEARCH, or drawer name uppercased)
 *
 * @example
 * getMode({ drawerState: null, localFilterActive: false, siteSearchActive: false, ... })  => 'NORMAL'
 * getMode({ drawerState: 'palette', ... })                                                 => 'COMMAND'
 * getMode({ drawerState: null, localFilterActive: true, ... })                             => 'FILTER'
 * getMode({ drawerState: null, siteSearchActive: true, ... })                              => 'SEARCH'
 * getMode({ drawerState: 'chapters', ... })                                                => 'CHAPTERS'
 * getMode({ drawerState: 'description', ... })                                             => 'DESCRIPTION'
 * getMode({ drawerState: 'filter', ... })                                                  => 'FILTER'
 */
export function getMode(state) {
  // Template: Compound - access drawerState, localFilterActive, siteSearchActive
  // Priority order: drawers > localFilter (FILTER) > siteSearch (SEARCH) > NORMAL

  if (state.drawerState === 'palette') {
    return 'COMMAND';
  }

  // Any other drawer state - return uppercased drawer name
  if (state.drawerState !== null) {
    return state.drawerState.toUpperCase();
  }

  if (state.localFilterActive) {
    return 'FILTER';
  }

  if (state.siteSearchActive) {
    return 'SEARCH';
  }

  return 'NORMAL';
}


