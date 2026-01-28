/**
 * Core Actions
 * 
 * Side-effecting operations: clipboard, navigation.
 */

import { showMessage } from './dom.js';

/**
 * [I/O] Copy text to clipboard, show confirmation message.
 *
 * Examples:
 *   copyToClipboard('https://youtube.com/watch?v=abc')
 *   // Copies, shows "Copied URL"
 */
export function copyToClipboard(text, label = 'Copied') {
  navigator.clipboard.writeText(text)
    .then(() => {
      showMessage(label);
    })
    .catch(err => {
      console.error('[Vilify] Failed to copy:', err);
      showMessage('Copy failed');
    });
}

/**
 * [I/O] Navigate current tab to URL.
 *
 * Examples:
 *   navigateTo('/feed/history')
 */
export function navigateTo(url) {
  window.location.href = url;
}

/**
 * [I/O] Open URL in new tab.
 *
 * Examples:
 *   openInNewTab('https://youtube.com/watch?v=abc')
 */
export function openInNewTab(url) {
  window.open(url, '_blank');
}
