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
 * KeyContext — current keyboard/UI context passed to site config functions.
 * @typedef {{ pageType: string|null, filterActive: boolean, searchActive: boolean, drawer: string|null }} KeyContext
 */

/**
 * Normalize a keyboard event into a key string for sequence matching.
 * Modifier-only keys (Shift, Control, Alt, Meta) return null.
 * Ctrl+key produces 'C-' + event.key (e.g., 'C-f').
 * Regular keys return event.key as-is (Shift naturally produces uppercase, e.g., 'G' for Shift+G).
 * [PURE]
 *
 * @param {KeyboardEvent} event - The keyboard event
 * @returns {string|null} Normalized key string, or null for modifier-only keys
 *
 * @example
 * normalizeKey({ key: 'a' }) => 'a'
 * normalizeKey({ key: 'G', shiftKey: true }) => 'G'
 * normalizeKey({ key: 'f', ctrlKey: true }) => 'C-f'
 * normalizeKey({ key: 'Shift' }) => null
 */
export function normalizeKey(event) {
  const MODIFIER_KEYS = ['Shift', 'Control', 'Alt', 'Meta'];
  if (MODIFIER_KEYS.includes(event.key)) return null;
  if (event.ctrlKey) return 'C-' + event.key;
  return event.key;
}

/**
 * Process a normalized key string against registered sequences.
 * Returns action to execute (if any), updated sequence, and whether to prevent default.
 * Takes a pre-normalized key string (from normalizeKey) instead of a raw event.
 * No internal toLowerCase — case is preserved as-is from normalizeKey.
 * [PURE]
 *
 * @param {string} key - Normalized key string (from normalizeKey). Must not be null.
 * @param {string} keySeq - Current accumulated key sequence
 * @param {Object} sequences - Map of sequence strings to action functions
 * @param {number} timeout - Sequence timeout in ms (for reference, not used in pure function)
 * @returns {{ action: Function | null, pendingAction: Function | null, newSeq: string, shouldPrevent: boolean }}
 *
 * @example
 * // User presses 'g', no match yet but 'gh' exists
 * handleKeyEvent('g', '', { 'gh': goHome, 'gs': goSubs }, 500)
 *   => { action: null, newSeq: 'g', shouldPrevent: false }
 *
 * // User presses 'h' after 'g'
 * handleKeyEvent('h', 'g', { 'gh': goHome, 'gs': goSubs }, 500)
 *   => { action: goHome, newSeq: '', shouldPrevent: true }
 *
 * // User presses 'x', no match, no prefix match
 * handleKeyEvent('x', '', { 'gh': goHome }, 500)
 *   => { action: null, newSeq: '', shouldPrevent: false }
 */
export function handleKeyEvent(key, keySeq, sequences, timeout) {
  const newSeq = keySeq + key;
  const exactMatch = sequences[newSeq] || null;
  const longerPrefix = Object.keys(sequences).some(s => s.startsWith(newSeq) && s.length > newSeq.length);

  if (exactMatch && !longerPrefix) {
    return { action: exactMatch, pendingAction: null, newSeq: '', shouldPrevent: true };
  }
  if (exactMatch && longerPrefix) {
    return { action: null, pendingAction: exactMatch, newSeq, shouldPrevent: true };
  }
  if (longerPrefix) {
    return { action: null, pendingAction: null, newSeq, shouldPrevent: false };
  }
  return { action: null, pendingAction: null, newSeq: '', shouldPrevent: false };
}

/**
 * Set up the capture-phase keyboard listener.
 * 
 * Uses normalizeKey to convert events to key strings, then handleKeyEvent for
 * sequence matching. All bindings come from config.getKeySequences(appCallbacks, context).
 * Site-specific key blocking comes from config.getBlockedNativeKeys(context).
 * Site-specific search input detection comes from config.isNativeSearchInput(target).
 * 
 * appCallbacks is passed IN (constructed by core/index.js), not built internally.
 * 
 * Responsibilities that STAY in the engine:
 * - Escape handling (generic modal stack: drawer > filter > search)
 * - Input element filtering for Vilify's own inputs
 * - Sequence engine (handleKeyEvent + timeout + dispatch)
 * - For ALL matched sequences (exact or prefix): preventDefault + stopPropagation
 * - Drawer key delegation
 * - Modal opener focus (auto-focus status bar input after opening modal)
 * 
 * Responsibilities REMOVED from the engine (now in sites/config):
 * - No hardcoded listing-page navigation (j/k/h/l, arrows, Enter, u)
 * - No hardcoded YouTube watch-page key blocking
 * - No hardcoded YouTube search input detection
 * - No hardcoded Ctrl+f/b handling
 * - No internal appCallbacks construction
 * [I/O]
 *
 * @param {SiteConfig} config - Site configuration with getKeySequences, getBlockedNativeKeys, isNativeSearchInput
 * @param {() => AppState} getState - Function to get current app state
 * @param {(AppState) => void} setState - Function to update app state
 * @param {Object} appCallbacks - App callbacks (navigate, select, openPalette, etc.) — constructed by core/index.js
 * @param {() => Object|null} getSiteState - Function to get site-specific state
 * @returns {Function} Cleanup function to remove the event listener
 *
 * @example
 * setupKeyboardEngine(youtubeConfig, getState, setState, appCallbacks, getSiteState)
 * // Registers capture-phase keydown listener
 */
export function setupKeyboardEngine(config, getState, setState, appCallbacks, getSiteState = null) {
  throw new Error("not implemented: setupKeyboardEngine");
}
