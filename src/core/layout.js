// Layout rendering - Focus mode layout functions for Vilify
// Following HTDP design from .design/DATA.md and .design/BLUEPRINT.md

import { el, clear } from './view.js';
import { getMode } from './state.js';

// Main CSS for focus mode - Solarized Dark theme with TUI aesthetic
const FOCUS_MODE_CSS = `
  :root {
    --bg-1: #002b36;
    --bg-2: #073642;
    --bg-3: #0a4a5c;
    --txt-1: #f1f1f1;
    --txt-2: #aaaaaa;
    --txt-3: #717171;
    --txt-4: #3ea6ff;
    --accent: #ff0000;
    --accent-hover: #cc0000;
    --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
  }

  /* Hide YouTube UI in focus mode */
  body.vilify-focus-mode ytd-app { visibility: hidden !important; }
  body.vilify-focus-mode { overflow: hidden !important; }

  /* Main focus mode container */
  #vilify-focus {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: var(--bg-1);
    font-family: var(--font-mono);
    color: var(--txt-2);
    display: flex;
    flex-direction: column;
    font-size: 14px;
    line-height: 1.5;
  }

  /* Status bar at bottom */
  .vilify-status-bar {
    height: 32px;
    padding: 0 16px;
    border-top: 1px solid var(--bg-3);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    flex-shrink: 0;
    background: var(--bg-1);
  }

  .vilify-status-left {
    display: flex;
    align-items: center;
    flex: 1;
  }

  .vilify-status-right {
    display: flex;
    align-items: center;
  }

  .vilify-mode-badge {
    background: var(--bg-2);
    border: 1px solid var(--bg-3);
    color: var(--txt-2);
    padding: 2px 8px;
    font-size: 11px;
    text-transform: uppercase;
    font-family: var(--font-mono);
  }

  .vilify-status-input {
    background: transparent;
    border: none;
    color: var(--txt-1);
    font-family: var(--font-mono);
    font-size: 12px;
    margin-left: 8px;
    outline: none;
    flex: 1;
    max-width: 400px;
    display: none;
  }

  .vilify-status-input.visible {
    display: block;
  }

  .vilify-status-input::placeholder {
    color: var(--txt-3);
  }

  .vilify-status-message {
    color: var(--txt-3);
  }

  .vilify-status-hints {
    color: var(--txt-3);
    font-size: 11px;
  }

  .vilify-status-hints kbd {
    background: transparent;
    border: 1px solid var(--bg-3);
    padding: 1px 4px;
    margin: 0 2px;
    font-family: var(--font-mono);
    font-size: 10px;
  }

  /* Content area */
  #vilify-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px 0;
  }

  #vilify-content.flash-end {
    background-color: var(--bg-2);
    transition: background-color 0.15s ease-out;
  }

  /* Scrollbar styling */
  #vilify-content {
    scrollbar-width: thin;
    scrollbar-color: var(--bg-3) transparent;
  }

  #vilify-content::-webkit-scrollbar {
    width: 6px;
  }

  #vilify-content::-webkit-scrollbar-track {
    background: transparent;
  }

  #vilify-content::-webkit-scrollbar-thumb {
    background: var(--bg-3);
  }

  /* Video items */
  .vilify-item {
    display: flex;
    padding: 12px 24px;
    cursor: pointer;
    max-width: 900px;
    margin: 0 auto;
  }

  .vilify-item:hover {
    background: var(--bg-2);
  }

  .vilify-item.selected {
    background: var(--bg-2);
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  .vilify-thumb {
    width: 160px;
    height: 90px;
    margin-right: 16px;
    object-fit: cover;
    background: var(--bg-2);
    border: 1px solid var(--bg-3);
    flex-shrink: 0;
  }

  .vilify-item.selected .vilify-thumb {
    border-color: var(--accent);
  }

  .vilify-item-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .vilify-item-title {
    color: var(--txt-2);
    font-size: 14px;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .vilify-item.selected .vilify-item-title {
    color: var(--txt-1);
  }

  .vilify-item-meta {
    color: var(--txt-3);
    font-size: 12px;
  }

  .vilify-item-subtitle {
    color: var(--txt-3);
    font-size: 12px;
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* TUI box pattern */
  .tui-box {
    position: relative;
    border: 2px solid var(--bg-3);
    padding: 16px;
    margin: 12px;
  }

  .tui-box::before {
    content: attr(data-label);
    position: absolute;
    top: -10px;
    left: 10px;
    background: var(--bg-1);
    color: var(--txt-3);
    padding: 0 6px;
    font-size: 12px;
  }

  /* Keyboard hint badges */
  kbd {
    background: transparent;
    border: 1px solid var(--bg-3);
    padding: 1px 5px;
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--txt-3);
  }

  .vilify-item.selected kbd {
    border-color: var(--txt-3);
    color: var(--txt-1);
  }

  /* Input fields */
  .vilify-input {
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--bg-3);
    color: var(--txt-1);
    font-family: var(--font-mono);
    font-size: 14px;
    padding: 4px 8px;
    outline: none;
  }

  .vilify-input:focus {
    border-bottom-color: var(--txt-3);
  }

  .vilify-input::placeholder {
    color: var(--txt-3);
  }

  /* Subscribe button (TUI style) */
  .vilify-subscribe-btn {
    background: transparent;
    border: 1px solid var(--accent);
    color: var(--accent);
    padding: 4px 12px;
    font-family: var(--font-mono);
    font-size: 12px;
    cursor: pointer;
  }

  .vilify-subscribe-btn:hover {
    background: var(--accent);
    color: var(--bg-1);
  }

  .vilify-subscribe-btn.subscribed {
    border-color: var(--txt-3);
    color: var(--txt-3);
  }

  .vilify-subscribe-btn.subscribed:hover {
    background: var(--bg-3);
  }

  /* Group headers */
  .vilify-group-header {
    color: var(--txt-3);
    font-size: 11px;
    text-transform: uppercase;
    padding: 16px 24px 8px;
    max-width: 900px;
    margin: 0 auto;
  }

  /* Empty state */
  .vilify-empty {
    color: var(--txt-3);
    text-align: center;
    padding: 48px 24px;
  }
`;

// Style element ID for deduplication
const STYLE_ID = 'vilify-focus-mode-styles';

// Store callbacks for input handling
let inputCallbacks = null;

/**
 * Set callbacks for status bar input handling
 * @param {Object} callbacks - { onFilterChange, onFilterSubmit, onSearchChange, onSearchSubmit, onCommandChange, onCommandSubmit, onEscape }
 */
export function setInputCallbacks(callbacks) {
  inputCallbacks = callbacks;
}

/**
 * Inject focus mode styles into the document.
 * Idempotent - won't add duplicate style elements.
 * [I/O]
 */
export function injectFocusModeStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = FOCUS_MODE_CSS;
  document.head.appendChild(style);
}

/**
 * Apply CSS custom properties from theme to focus mode container.
 * [I/O]
 */
export function applyTheme(theme) {
  const root = document.documentElement;

  root.style.setProperty('--bg-1', theme.bg1);
  root.style.setProperty('--bg-2', theme.bg2);
  root.style.setProperty('--bg-3', theme.bg3);
  root.style.setProperty('--txt-1', theme.txt1);
  root.style.setProperty('--txt-2', theme.txt2);
  root.style.setProperty('--txt-3', theme.txt3);
  root.style.setProperty('--txt-4', theme.txt4);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-hover', theme.accentHover);
}

/**
 * Render the full focus mode overlay (content area, status bar).
 * [I/O]
 */
export function renderFocusMode(config, state) {
  injectFocusModeStyles();

  if (config.theme) {
    applyTheme(config.theme);
  }

  // Remove existing focus mode container if present
  const existing = document.getElementById('vilify-focus');
  if (existing) {
    existing.remove();
  }

  // Create content area
  const content = el('div', { id: 'vilify-content' }, []);

  // Create status bar with input
  const statusBar = createStatusBar(state);

  // Create main container
  const container = el('div', { id: 'vilify-focus' }, [
    content,
    statusBar
  ]);

  document.body.classList.add('vilify-focus-mode');
  document.body.appendChild(container);
}

/**
 * Create the status bar element with mode badge and input field.
 * [PURE - but attaches event listeners]
 */
function createStatusBar(state) {
  const mode = getMode(state);
  
  // Mode badge
  const modeBadge = el('span', { class: 'vilify-mode-badge' }, [mode]);

  // Single input field (shown/hidden based on mode)
  const input = el('input', {
    type: 'text',
    class: 'vilify-status-input',
    id: 'vilify-status-input',
    placeholder: '',
    autocomplete: 'off',
    spellcheck: 'false'
  }, []);

  // Set up input event listeners
  input.addEventListener('input', (e) => {
    const currentMode = document.querySelector('.vilify-mode-badge')?.textContent;
    if (currentMode === 'FILTER' && inputCallbacks?.onFilterChange) {
      inputCallbacks.onFilterChange(e.target.value);
    } else if (currentMode === 'SEARCH' && inputCallbacks?.onSearchChange) {
      inputCallbacks.onSearchChange(e.target.value);
    } else if (currentMode === 'COMMAND' && inputCallbacks?.onCommandChange) {
      inputCallbacks.onCommandChange(e.target.value);
    }
  });

  input.addEventListener('keydown', (e) => {
    e.stopPropagation(); // Prevent keyboard handler from intercepting
    
    const currentMode = document.querySelector('.vilify-mode-badge')?.textContent;
    
    if (e.key === 'Escape') {
      e.preventDefault();
      if (inputCallbacks?.onEscape) {
        inputCallbacks.onEscape();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentMode === 'FILTER' && inputCallbacks?.onFilterSubmit) {
        inputCallbacks.onFilterSubmit(e.target.value, e.shiftKey);
      } else if (currentMode === 'SEARCH' && inputCallbacks?.onSearchSubmit) {
        inputCallbacks.onSearchSubmit(e.target.value);
      } else if (currentMode === 'COMMAND' && inputCallbacks?.onCommandSubmit) {
        inputCallbacks.onCommandSubmit(e.target.value, e.shiftKey);
      }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // Allow arrow keys for palette navigation
      if (currentMode === 'COMMAND' && inputCallbacks?.onCommandNavigate) {
        e.preventDefault();
        inputCallbacks.onCommandNavigate(e.key === 'ArrowDown' ? 'down' : 'up');
      }
    }
  });

  // Hints area (shown when drawer is open)
  const hints = el('span', { class: 'vilify-status-hints', id: 'vilify-status-hints' }, []);

  // Message area
  const message = el('span', { class: 'vilify-status-message', id: 'vilify-status-message' }, []);

  const leftDiv = el('div', { class: 'vilify-status-left' }, [modeBadge, input]);
  const rightDiv = el('div', { class: 'vilify-status-right' }, [hints, message]);

  return el('div', { class: 'vilify-status-bar' }, [leftDiv, rightDiv]);
}

/**
 * Update status bar to reflect current mode.
 * Shows/hides input, updates badge, focuses input when needed.
 * [I/O]
 */
export function updateStatusBar(state, focusInput = false) {
  const mode = getMode(state);
  
  // Update mode badge
  const badge = document.querySelector('.vilify-mode-badge');
  if (badge) {
    badge.textContent = mode;
  }

  // Update input visibility and value
  const input = document.getElementById('vilify-status-input');
  if (input) {
    if (mode === 'FILTER') {
      input.classList.add('visible');
      input.placeholder = 'Filter...';
      input.value = state.localFilterQuery || '';
      if (focusInput) input.focus();
    } else if (mode === 'SEARCH') {
      input.classList.add('visible');
      input.placeholder = 'Search YouTube...';
      input.value = state.siteSearchQuery || '';
      if (focusInput) input.focus();
    } else if (mode === 'COMMAND') {
      input.classList.add('visible');
      input.placeholder = 'Command...';
      input.value = state.paletteQuery || '';
      if (focusInput) input.focus();
    } else {
      input.classList.remove('visible');
      input.blur();
    }
  }

  // Update hints
  const hints = document.getElementById('vilify-status-hints');
  if (hints) {
    if (mode === 'FILTER' || mode === 'COMMAND') {
      hints.innerHTML = '<kbd>↑↓</kbd> navigate <kbd>↵</kbd> select <kbd>esc</kbd> close';
    } else {
      hints.innerHTML = '';
    }
  }
}

/**
 * Render a list of content items with selection state.
 * [I/O]
 */
export function renderListing(items, selectedIdx, container = null, renderItem = null) {
  const targetContainer = container || document.getElementById('vilify-content');
  if (!targetContainer) {
    return;
  }

  clear(targetContainer);

  if (!items || items.length === 0) {
    const empty = el('div', { class: 'vilify-empty' }, ['No items found']);
    targetContainer.appendChild(empty);
    return;
  }

  items.forEach((item, index) => {
    const isSelected = index === selectedIdx;
    const renderer = renderItem || renderDefaultItem;
    const itemEl = renderer(item, isSelected);
    itemEl.setAttribute('data-index', String(index));
    targetContainer.appendChild(itemEl);
  });

  const selectedEl = targetContainer.querySelector('.vilify-item.selected');
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

/**
 * Default item renderer for ContentItem.
 * [PURE]
 */
export function renderDefaultItem(item, isSelected) {
  // Check for group header
  if ('group' in item && item.group) {
    return el('div', { class: 'vilify-group-header' }, [item.group]);
  }

  // Check for Command (has label and action)
  if ('label' in item && 'action' in item) {
    return renderCommandItem(item, isSelected);
  }

  // Default: ContentItem
  const classes = isSelected ? 'vilify-item selected' : 'vilify-item';
  const children = [];

  if (item.thumbnail) {
    const thumb = el('img', { class: 'vilify-thumb', src: item.thumbnail, alt: '' }, []);
    children.push(thumb);
  } else {
    const thumbPlaceholder = el('div', { class: 'vilify-thumb' }, []);
    children.push(thumbPlaceholder);
  }

  const infoChildren = [];
  const title = el('div', { class: 'vilify-item-title' }, [item.title || '']);
  infoChildren.push(title);

  if (item.meta) {
    const meta = el('div', { class: 'vilify-item-meta' }, [item.meta]);
    infoChildren.push(meta);
  }

  if (item.subtitle) {
    const subtitle = el('div', { class: 'vilify-item-subtitle' }, [item.subtitle]);
    infoChildren.push(subtitle);
  }

  const info = el('div', { class: 'vilify-item-info' }, infoChildren);
  children.push(info);

  return el('div', { class: classes }, children);
}

/**
 * Render a command item for palette display.
 * [PURE]
 */
function renderCommandItem(cmd, isSelected) {
  const classes = isSelected ? 'vilify-item selected' : 'vilify-item';
  const children = [];

  if (cmd.icon) {
    const icon = el('span', { class: 'vilify-item-icon' }, [cmd.icon + ' ']);
    children.push(icon);
  }

  const label = el('span', { class: 'vilify-item-title' }, [cmd.label]);
  children.push(label);

  const spacer = el('span', { style: 'flex: 1' }, []);
  children.push(spacer);

  if (cmd.keys) {
    const keys = el('kbd', {}, [cmd.keys]);
    children.push(keys);
  }

  if (cmd.meta) {
    const meta = el('span', { class: 'vilify-item-meta', style: 'margin-left: 8px' }, [cmd.meta]);
    children.push(meta);
  }

  return el('div', { class: classes, style: 'align-items: center' }, children);
}

/**
 * Update status bar message.
 * [I/O]
 */
export function updateStatusMessage(message) {
  const msgEl = document.getElementById('vilify-status-message');
  if (msgEl) {
    msgEl.textContent = message;
  }
}

/**
 * Remove focus mode overlay and restore normal page.
 * [I/O]
 */
export function removeFocusMode() {
  const container = document.getElementById('vilify-focus');
  if (container) {
    container.remove();
  }
  document.body.classList.remove('vilify-focus-mode');
}

/**
 * Get the content container element.
 * [I/O]
 */
export function getContentContainer() {
  return document.getElementById('vilify-content');
}
