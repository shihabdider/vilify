/**
 * Core Keyboard Handling
 * 
 * Mousetrap integration for vim-style key bindings.
 */

import Mousetrap from 'mousetrap';

/**
 * [I/O] Initialize Mousetrap with site's key bindings.
 *
 * Examples:
 *   initKeyboard(youtubeConfig)
 *   // Registers all bindings from config
 */
export function initKeyboard(siteConfig, getContext) {
  const ctx = getContext ? getContext() : null;
  
  if (siteConfig.getKeySequences) {
    const sequences = siteConfig.getKeySequences(ctx);
    
    for (const [keys, callback] of Object.entries(sequences)) {
      bind(keys, callback);
    }
  }
}

/**
 * [I/O] Bind a key or key sequence to a callback.
 *
 * Examples:
 *   bind('j', () => moveDown())
 *   bind('g g', () => goToTop())
 *   bind('y y', () => copyUrl())
 */
export function bind(keys, callback) {
  console.log('[Vilify] Binding key:', keys);
  Mousetrap.bind(keys, (e) => {
    console.log('[Vilify] Key pressed:', keys);
    
    // Don't trigger in input elements
    if (isInputElement(document.activeElement)) {
      console.log('[Vilify] Ignoring - in input element');
      return;
    }
    
    e.preventDefault();
    callback();
  });
}

/**
 * [I/O] Unbind all Mousetrap bindings.
 */
export function unbindAll() {
  Mousetrap.reset();
}

/**
 * [PURE] Check if element is an input/textarea/contenteditable.
 *
 * Examples:
 *   isInputElement(document.querySelector('input'))                    => true
 *   isInputElement(document.querySelector('div'))                      => false
 *   isInputElement(document.querySelector('[contenteditable="true"]')) => true
 */
export function isInputElement(element) {
  if (!element) return false;
  
  const tagName = element.tagName.toUpperCase();
  
  // Check for form elements
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }
  
  // Check for contenteditable
  if (element.isContentEditable) {
    return true;
  }
  
  return false;
}
