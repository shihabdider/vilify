// Modal Window — shared base for Neovim-style floating windows (settings, help, etc.)
// Encapsulates: backdrop, window positioning, capture-phase keydown with vim navigation,
// style injection, open/close/isOpen lifecycle.

// =============================================================================
// SHARED CSS
// =============================================================================

/**
 * Generate base CSS for a modal window. Covers backdrop, centered window,
 * footer bar, and kbd styling. Caller provides a class prefix (e.g. 'vilify-help')
 * and any extra CSS rules specific to their window.
 * [PURE]
 */
export function modalBaseCSS(prefix: string, extraCSS: string): string {
  return `
  .${prefix}-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 10001;
  }

  .${prefix}-window {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10002;
    width: 520px;
    max-height: 80vh;
    background: var(--bg-1);
    border: 2px solid var(--bg-3);
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--txt-2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .${prefix}-title {
    padding: 10px 16px 0;
    font-size: 12px;
    color: var(--txt-3);
    letter-spacing: 0.5px;
  }

  .${prefix}-tabs {
    display: flex;
    border-bottom: 1px solid var(--bg-3);
  }

  .${prefix}-tab {
    flex: 1;
    padding: 8px 0;
    text-align: center;
    font-size: 12px;
    color: var(--txt-3);
    cursor: pointer;
    border-bottom: 2px solid transparent;
  }
  .${prefix}-tab.active {
    color: var(--txt-1);
    border-bottom-color: var(--txt-4);
  }

  .${prefix}-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
    scrollbar-width: thin;
    scrollbar-color: var(--bg-3) transparent;
  }

  .${prefix}-footer {
    padding: 6px 16px;
    border-top: 1px solid var(--bg-3);
    font-size: 11px;
    color: var(--txt-3);
    display: flex;
    gap: 12px;
  }
  .${prefix}-footer kbd {
    background: transparent;
    border: 1px solid var(--bg-3);
    padding: 1px 4px;
    font-size: 10px;
    font-family: var(--font-mono);
    color: var(--txt-4);
  }

${extraCSS}
`;
}

// =============================================================================
// MODAL WINDOW FACTORY
// =============================================================================

export interface ModalConfig {
  /** CSS class prefix, e.g. 'vilify-help' */
  prefix: string;
  /** Full CSS string (use modalBaseCSS to generate) */
  css: string;
  /** Section names for tabs */
  sections: string[];
  /** Called before DOM is built (for loading settings, fonts, etc.) */
  onBeforeOpen?: () => void;
  /** Build the window innerHTML. Receives the prefix. */
  buildWindowHTML: (prefix: string) => string;
  /** Called after window is appended to DOM (for tab click handlers etc.) */
  onAfterOpen?: (windowEl: HTMLElement) => void;
  /** Render the list content. Called on open and on every navigation/tab change. */
  renderContent: (windowEl: HTMLElement, sectionIdx: number, selectedIdx: number) => void;
  /** Get number of items in the current section */
  getListLength: (sectionIdx: number) => number;
  /** Called when section changes (for resetting selectedIdx to active item, etc.) */
  onSectionChange?: (sectionIdx: number) => number;
  /** Extra keydown cases. Return true if handled. */
  onExtraKey?: (key: string, sectionIdx: number, selectedIdx: number) => boolean;
  /** Called on close (for cleanup, e.g. nulling currentSettings) */
  onClose?: () => void;
}

export interface ModalHandle {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}

/**
 * Create a modal window with vim-style keyboard navigation.
 * Returns open/close/isOpen functions.
 * [I/O]
 */
export function createModalWindow(config: ModalConfig): ModalHandle {
  let windowEl: HTMLElement | null = null;
  let backdropEl: HTMLElement | null = null;
  let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  let currentSectionIdx = 0;
  let selectedIdx = 0;
  let stylesInjected = false;

  function render(): void {
    if (!windowEl) return;

    // Update tab active states
    const tabsEl = windowEl.querySelector(`.${config.prefix}-tabs`);
    if (tabsEl) {
      const tabs = tabsEl.querySelectorAll(`.${config.prefix}-tab`);
      config.sections.forEach((_section, i) => {
        tabs[i]?.classList.toggle('active', i === currentSectionIdx);
      });
    }

    config.renderContent(windowEl, currentSectionIdx, selectedIdx);

    // Scroll selected into view
    const listEl = windowEl.querySelector(`.${config.prefix}-list`);
    if (listEl) {
      const selectedEl = listEl.querySelector(`.${config.prefix}-item.selected`);
      if (selectedEl && typeof selectedEl.scrollIntoView === 'function') {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      }
    }
  }

  function switchSection(idx: number): void {
    currentSectionIdx = idx;
    if (config.onSectionChange) {
      selectedIdx = config.onSectionChange(idx);
    } else {
      selectedIdx = 0;
    }
    render();
  }

  function nextSection(): void {
    switchSection((currentSectionIdx + 1) % config.sections.length);
  }

  function close(): void {
    if (keydownHandler) {
      document.removeEventListener('keydown', keydownHandler, true);
      keydownHandler = null;
    }
    if (backdropEl) {
      backdropEl.remove();
      backdropEl = null;
    }
    if (windowEl) {
      windowEl.remove();
      windowEl = null;
    }
    config.onClose?.();
  }

  function open(): void {
    if (windowEl) return; // Already open

    // Inject styles once
    if (!stylesInjected) {
      const style = document.createElement('style');
      style.textContent = config.css;
      document.head.appendChild(style);
      stylesInjected = true;
    }

    config.onBeforeOpen?.();
    currentSectionIdx = 0;
    // Let consumer set initial selectedIdx (e.g. to active item)
    if (config.onSectionChange) {
      selectedIdx = config.onSectionChange(0);
    } else {
      selectedIdx = 0;
    }

    // Backdrop
    backdropEl = document.createElement('div');
    backdropEl.className = `${config.prefix}-backdrop`;
    backdropEl.addEventListener('click', close);
    document.body.appendChild(backdropEl);

    // Window
    windowEl = document.createElement('div');
    windowEl.className = `${config.prefix}-window`;
    windowEl.innerHTML = config.buildWindowHTML(config.prefix);

    // Tab click handlers
    const tabs = windowEl.querySelectorAll(`.${config.prefix}-tab`);
    config.sections.forEach((_section, i) => {
      tabs[i]?.addEventListener('click', () => switchSection(i));
    });

    config.onAfterOpen?.(windowEl);

    document.body.appendChild(windowEl);
    render();

    // Capture-phase keydown -- isolates from main keyboard engine
    keydownHandler = (e: KeyboardEvent) => {
      e.stopPropagation();

      // Let consumer handle extra keys first
      if (config.onExtraKey?.(e.key, currentSectionIdx, selectedIdx)) {
        e.preventDefault();
        render();
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          selectedIdx = Math.min(selectedIdx + 1, config.getListLength(currentSectionIdx) - 1);
          render();
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          selectedIdx = Math.max(selectedIdx - 1, 0);
          render();
          break;
        case 'Tab':
          e.preventDefault();
          nextSection();
          break;
        case 'g':
          e.preventDefault();
          selectedIdx = 0;
          render();
          break;
        case 'G':
          e.preventDefault();
          selectedIdx = config.getListLength(currentSectionIdx) - 1;
          render();
          break;
      }
    };

    document.addEventListener('keydown', keydownHandler, true);
  }

  function isOpen(): boolean {
    return windowEl !== null;
  }

  return { open, close, isOpen };
}
