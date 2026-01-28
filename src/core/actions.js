// Actions - Common action functions for Vilify
// Following HTDP design from .design/DATA.md and .design/BLUEPRINT.md

import { updateStatusMessage } from './layout.js';

/**
 * Copy text to clipboard, show confirmation message.
 * [I/O]
 *
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful, false otherwise
 *
 * @example
 * copyToClipboard('https://youtube.com/watch?v=abc')
 * // Copies, shows "Copied to clipboard"
 */
export async function copyToClipboard(text) {
  // Template: I/O - side effect (clipboard API)
  try {
    await navigator.clipboard.writeText(text);
    updateStatusMessage('Copied to clipboard');

    // Auto-clear message after delay
    setTimeout(() => {
      updateStatusMessage('');
    }, 2000);

    return true;
  } catch (err) {
    console.error('[Vilify] Failed to copy to clipboard:', err);
    updateStatusMessage('Failed to copy');

    setTimeout(() => {
      updateStatusMessage('');
    }, 2000);

    return false;
  }
}

/**
 * Navigate current tab to URL/path.
 * [I/O]
 *
 * @param {string} path - URL or path to navigate to
 *
 * @example
 * navigateTo('/feed/history')
 * navigateTo('https://youtube.com/')
 */
export function navigateTo(path) {
  // Template: I/O - side effect (navigation)
  location.href = path;
}

/**
 * Open URL in new tab.
 * [I/O]
 *
 * @param {string} url - URL to open
 *
 * @example
 * openInNewTab('https://youtube.com/watch?v=abc')
 */
export function openInNewTab(url) {
  // Template: I/O - side effect (window API)
  window.open(url, '_blank');
}

/**
 * Navigate to URL, optionally in new tab.
 * Convenience wrapper combining navigateTo and openInNewTab.
 * [I/O]
 *
 * @param {string} url - URL to navigate to
 * @param {boolean} newTab - If true, open in new tab
 *
 * @example
 * navigate('/watch?v=abc', false)  // Navigate in current tab
 * navigate('/watch?v=abc', true)   // Open in new tab
 */
export function navigate(url, newTab = false) {
  // Template: I/O - conditional based on newTab
  if (newTab) {
    openInNewTab(url);
  } else {
    navigateTo(url);
  }
}
