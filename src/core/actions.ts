// Actions - Common action functions for Vilify
// Following HTDP design from .design/DATA.md and .design/BLUEPRINT.md

import { updateStatusMessage } from './layout';

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
export async function copyToClipboard(text: string): Promise<boolean> {
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
 * Copy image to clipboard. Fetches the image, converts to PNG if needed
 * (clipboard API requires image/png), copies via clipboard API.
 * Shows success/failure status message, auto-clears after 2 seconds.
 * [I/O]
 *
 * @param {string} imgSrc - Image URL or data URI
 * @returns {Promise<boolean>} True if successful, false otherwise
 *
 * @example
 * copyImageToClipboard('https://example.com/thumb.jpg')
 * // Fetches, converts to PNG, copies to clipboard, shows message
 */
export async function copyImageToClipboard(imgSrc: string): Promise<boolean> {
  // Template: I/O - side effect (fetch + clipboard API)
  try {
    const response = await fetch(imgSrc);
    let blob = await response.blob();

    // Clipboard API requires image/png; convert if needed
    if (blob.type !== 'image/png') {
      blob = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d').drawImage(img, 0, 0);
          canvas.toBlob((pngBlob) => {
            if (pngBlob) resolve(pngBlob);
            else reject(new Error('Canvas toBlob failed'));
          }, 'image/png');
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = imgSrc;
      });
    }

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);

    updateStatusMessage('Image copied to clipboard');
    setTimeout(() => {
      updateStatusMessage('');
    }, 2000);

    return true;
  } catch (err) {
    console.error('[Vilify] Failed to copy image to clipboard:', err);
    updateStatusMessage('Failed to copy image');
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
export function navigateTo(path: string): void {
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
export function openInNewTab(url: string): void {
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
export function navigate(url: string, newTab: boolean = false): void {
  // Template: I/O - conditional based on newTab
  if (newTab) {
    openInNewTab(url);
  } else {
    navigateTo(url);
  }
}
