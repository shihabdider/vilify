// Help Window — Neovim-style floating window showing all keybinds by context
// Built on the shared modal-window base.
// Generic renderer — keybind data is provided by site configs via getHelpSections().

import { createModalWindow, modalBaseCSS, type ModalHandle } from './modal-window';

// =============================================================================
// TYPES
// =============================================================================

export interface HelpSection {
  name: string;
  keybinds: Array<{ keys: string[]; description: string }>;
}

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
// MODAL STATE
// =============================================================================

/** Current modal instance (recreated each time sections change) */
let modal: ModalHandle | null = null;
/** Last sections used to create the modal (avoid unnecessary recreation) */
let lastSections: HelpSection[] | null = null;

function getOrCreateModal(sections: HelpSection[]): ModalHandle {
  // Reuse existing modal if sections haven't changed
  if (modal && lastSections === sections) return modal;

  const sectionNames = sections.map(s => s.name);

  modal = createModalWindow({
    prefix: 'vilify-help',
    css: modalBaseCSS('vilify-help', HELP_EXTRA_CSS),
    sections: sectionNames,

    buildWindowHTML: (prefix) => `
      <div class="${prefix}-title">Help</div>
      <div class="${prefix}-tabs">
        ${sectionNames.map(name => `<div class="${prefix}-tab">${name}</div>`).join('\n        ')}
      </div>
      <div class="${prefix}-list"></div>
      <div class="${prefix}-footer">
        <span><kbd>j</kbd><kbd>k</kbd> navigate</span>
        <span><kbd>Tab</kbd> section</span>
        <span><kbd>Esc</kbd> close</span>
      </div>
    `,

    getListLength: (sectionIdx) => sections[sectionIdx]?.keybinds.length ?? 0,

    renderContent: (windowEl, sectionIdx, selectedIdx) => {
      const listEl = windowEl.querySelector('.vilify-help-list');
      if (!listEl) return;
      listEl.innerHTML = '';

      const entries = sections[sectionIdx]?.keybinds ?? [];
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

  lastSections = sections;
  return modal;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Open the help floating window with the given sections.
 * [I/O]
 */
export function openHelpWindow(sections: HelpSection[]): void {
  const m = getOrCreateModal(sections);
  m.open();
}

/**
 * Close the help floating window.
 * [I/O]
 */
export function closeHelpWindow(): void {
  modal?.close();
}

/**
 * Check if the help window is open.
 * [PURE]
 */
export function isHelpOpen(): boolean {
  return modal?.isOpen() ?? false;
}
