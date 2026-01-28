/**
 * Core State Management
 * 
 * AppState is the central state for the extension.
 * Mode is derived, not stored.
 */

/**
 * [PURE] Creates initial application state with all defaults.
 *
 * Examples:
 *   createAppState() 
 *     => { focusModeActive: false, modalState: null, paletteQuery: '',
 *          paletteSelectedIdx: 0, selectedIdx: 0, filterActive: false,
 *          filterQuery: '', searchActive: false, searchQuery: '',
 *          keySeq: '', lastUrl: '' }
 */
export function createAppState() {
  return {
    focusModeActive: false,
    modalState: null,
    paletteQuery: '',
    paletteSelectedIdx: 0,
    selectedIdx: 0,
    filterActive: false,
    filterQuery: '',
    searchActive: false,
    searchQuery: '',
    keySeq: '',
    lastUrl: '',
  };
}

/**
 * [PURE] Returns a fresh state, discarding all current values.
 * Equivalent to createAppState().
 *
 * Examples:
 *   resetState({ focusModeActive: true, modalState: 'palette', ... })
 *     => { focusModeActive: false, modalState: null, ... }
 */
export function resetState(state) {
  return createAppState();
}

/**
 * [PURE] Derives display mode from current state.
 *
 * Examples:
 *   getMode({ modalState: null, filterActive: false, ... })         => 'NORMAL'
 *   getMode({ modalState: 'palette', ... })                         => 'COMMAND'
 *   getMode({ modalState: null, filterActive: true, ... })          => 'FILTER'
 */
export function getMode(state) {
  if (state.modalState === 'palette') return 'COMMAND';
  if (state.filterActive) return 'FILTER';
  return 'NORMAL';
}
