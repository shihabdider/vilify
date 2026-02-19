// Help Window — Neovim-style floating window showing all keybinds by context
// Built on the shared modal-window base.

import { createModalWindow, modalBaseCSS } from './modal-window';

// =============================================================================
// CSS (help-specific additions)
// =============================================================================

const HELP_EXTRA_CSS = `
  .vilify-help-item {
    display: flex;
    align-items: center;
    padding: 5px 16px;
    gap: 16px;
  }
  .vilify-help-item.selected {
    background: var(--bg-2);
  }

  .vilify-help-keys {
    min-width: 120px;
    flex-shrink: 0;
    display: flex;
    gap: 4px;
  }

  .vilify-help-keys kbd {
    background: transparent;
    border: 1px solid var(--bg-3);
    padding: 1px 5px;
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--txt-4);
    border-radius: 2px;
  }

  .vilify-help-desc {
    color: var(--txt-2);
    font-size: 13px;
    flex: 1;
  }
`;

// =============================================================================
// KEYBIND DATA
// =============================================================================

interface KeybindEntry {
  keys: string[];
  description: string;
}

type SectionName = 'Home Page' | 'Watch Page' | 'Google Search' | 'Universal';

const SECTIONS: SectionName[] = ['Home Page', 'Watch Page', 'Google Search', 'Universal'];

const KEYBINDS: Record<SectionName, KeybindEntry[]> = {
  'Home Page': [
    { keys: ['j', '\u2193'], description: 'Navigate down' },
    { keys: ['k', '\u2191'], description: 'Navigate up' },
    { keys: ['h'], description: 'Navigate left' },
    { keys: ['l'], description: 'Navigate right' },
    { keys: ['gg'], description: 'Go to top' },
    { keys: ['G'], description: 'Go to bottom' },
    { keys: ['Enter'], description: 'Open video' },
    { keys: ['dd'], description: 'Dismiss video' },
    { keys: ['mw'], description: 'Add to watch later' },
    { keys: ['u'], description: 'Undo watch later removal' },
    { keys: ['gh'], description: 'Go to home' },
    { keys: ['gs'], description: 'Go to subscriptions' },
    { keys: ['gy'], description: 'Go to history' },
    { keys: ['gl'], description: 'Go to library' },
    { keys: ['gw'], description: 'Go to watch later' },
    { keys: ['i'], description: 'Open search' },
    { keys: ['/'], description: 'Open local filter' },
    { keys: [':'], description: 'Open command palette' },
    { keys: [':sort da'], description: 'Sort by date' },
    { keys: [':sort du'], description: 'Sort by duration' },
    { keys: [':sort t'], description: 'Sort by title' },
    { keys: [':sort c'], description: 'Sort by channel' },
    { keys: [':sort v'], description: 'Sort by views' },
    { keys: [':sort'], description: 'Reset sort' },
  ],
  'Watch Page': [
    { keys: ['f'], description: 'Toggle fullscreen' },
    { keys: ['\u2190', '\u2192'], description: 'Skip \u00B15s' },
    { keys: ['sl'], description: 'Like video' },
    { keys: ['sd'], description: 'Dislike video' },
    { keys: ['ss'], description: 'Subscribe/unsubscribe' },
    { keys: ['sw'], description: 'Add to watch later' },
    { keys: ['gc'], description: 'Go to channel' },
    { keys: ['gh'], description: 'Go to home' },
    { keys: ['gs'], description: 'Go to subscriptions' },
    { keys: ['gy'], description: 'Go to history' },
    { keys: ['gl'], description: 'Go to library' },
    { keys: ['gw'], description: 'Go to watch later' },
    { keys: ['gg'], description: 'Go to top' },
    { keys: ['g1'], description: 'Playback speed 1x' },
    { keys: ['g2'], description: 'Playback speed 2x' },
    { keys: ['yy'], description: 'Copy video URL' },
    { keys: ['yt'], description: 'Copy video title' },
    { keys: ['Y'], description: 'Copy URL at current time' },
    { keys: ['zr'], description: 'Open recommended' },
    { keys: ['zo'], description: 'Open description' },
    { keys: ['zc'], description: 'Close description' },
    { keys: ['zp'], description: 'Open chapters' },
    { keys: ['t'], description: 'Open transcript' },
    { keys: ['['], description: 'Previous comment page' },
    { keys: [']'], description: 'Next comment page' },
    { keys: ['i'], description: 'Open search' },
    { keys: [':'], description: 'Open command palette' },
  ],
  'Google Search': [
    { keys: ['j', '\u2193'], description: 'Navigate down' },
    { keys: ['k', '\u2191'], description: 'Navigate up' },
    { keys: ['gg'], description: 'Go to top' },
    { keys: ['G'], description: 'Go to bottom' },
    { keys: ['Enter'], description: 'Open result' },
    { keys: ['Ctrl+f'], description: 'Next page' },
    { keys: ['Ctrl+b'], description: 'Previous page' },
    { keys: ['go'], description: 'Google search (same query)' },
    { keys: ['gi'], description: 'Image search' },
    { keys: ['yy'], description: 'Copy URL' },
    { keys: ['i'], description: 'Open search' },
    { keys: ['/'], description: 'Open local filter' },
    { keys: [':'], description: 'Open command palette' },
  ],
  'Universal': [
    { keys: ['Esc'], description: 'Close current overlay' },
    { keys: [':help'], description: 'Show this help window' },
    { keys: [':settings'], description: 'Open settings' },
    { keys: [':colorscheme'], description: 'Change colorscheme' },
    { keys: [':set guifont='], description: 'Change font' },
    { keys: [':q'], description: 'Exit focus mode' },
  ],
};

// =============================================================================
// MODAL INSTANCE
// =============================================================================

const modal = createModalWindow({
  prefix: 'vilify-help',
  css: modalBaseCSS('vilify-help', HELP_EXTRA_CSS),
  sections: SECTIONS,

  buildWindowHTML: (prefix) => `
    <div class="${prefix}-title">Help</div>
    <div class="${prefix}-tabs">
      <div class="${prefix}-tab active">Home Page</div>
      <div class="${prefix}-tab">Watch Page</div>
      <div class="${prefix}-tab">Google Search</div>
      <div class="${prefix}-tab">Universal</div>
    </div>
    <div class="${prefix}-list"></div>
    <div class="${prefix}-footer">
      <span><kbd>j</kbd><kbd>k</kbd> navigate</span>
      <span><kbd>Tab</kbd> section</span>
      <span><kbd>Esc</kbd> close</span>
    </div>
  `,

  getListLength: (sectionIdx) => KEYBINDS[SECTIONS[sectionIdx]].length,

  renderContent: (windowEl, sectionIdx, selectedIdx) => {
    const listEl = windowEl.querySelector('.vilify-help-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const entries = KEYBINDS[SECTIONS[sectionIdx]];
    entries.forEach((entry, idx) => {
      const row = document.createElement('div');
      row.className = 'vilify-help-item' + (idx === selectedIdx ? ' selected' : '');

      // Keys column
      const keysSpan = document.createElement('span');
      keysSpan.className = 'vilify-help-keys';
      for (const key of entry.keys) {
        const kbd = document.createElement('kbd');
        kbd.textContent = key;
        keysSpan.appendChild(kbd);
      }
      row.appendChild(keysSpan);

      // Description column
      const desc = document.createElement('span');
      desc.className = 'vilify-help-desc';
      desc.textContent = entry.description;
      row.appendChild(desc);

      listEl.appendChild(row);
    });
  },
});

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Open the help floating window.
 * [I/O]
 */
export const openHelpWindow = modal.open;

/**
 * Close the help floating window.
 * [I/O]
 */
export const closeHelpWindow = modal.close;

/**
 * Check if the help window is open.
 * [PURE]
 */
export const isHelpOpen = modal.isOpen;
