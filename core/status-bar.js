/**
 * Core Status Bar
 * 
 * Renders the vim-style status bar at the bottom.
 */

import { el, clear } from './dom.js';

/**
 * [I/O] Render the full status bar (logo, mode indicator, message area).
 *
 * Examples:
 *   renderStatusBar('NORMAL', '', youtubeConfig)      // [Logo] NORMAL
 *   renderStatusBar('COMMAND', '', youtubeConfig)     // [Logo] COMMAND
 *   renderStatusBar('NORMAL', 'Copied URL', config)   // [Logo] NORMAL  Copied URL
 */
export function renderStatusBar(mode, message, siteConfig) {
  let statusBar = document.querySelector('.vilify-status-bar');
  
  // Create status bar if it doesn't exist
  if (!statusBar) {
    statusBar = el('div', { class: 'vilify-status-bar' }, []);
    const overlay = document.querySelector('.vilify-overlay');
    if (overlay) {
      overlay.appendChild(statusBar);
    }
  }
  
  clear(statusBar);
  
  // Logo
  const logo = el('span', { class: 'vilify-logo' }, ['VILIFY']);
  statusBar.appendChild(logo);
  
  // Mode indicator
  const modeClass = `vilify-mode ${mode.toLowerCase()}`;
  const modeEl = el('span', { class: modeClass }, [mode]);
  statusBar.appendChild(modeEl);
  
  // Message area
  const messageEl = el('span', { class: 'vilify-message' }, [message || '']);
  statusBar.appendChild(messageEl);
}

/**
 * [I/O] Update just the mode indicator.
 */
export function updateMode(mode) {
  const modeEl = document.querySelector('.vilify-mode');
  if (!modeEl) return;
  
  // Update class
  modeEl.className = `vilify-mode ${mode.toLowerCase()}`;
  modeEl.textContent = mode;
}
