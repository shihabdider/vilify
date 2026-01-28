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
    max-width: 300px;
  }

  .vilify-status-input::placeholder {
    color: var(--txt-3);
  }

  .vilify-status-message {
    color: var(--txt-3);
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

/**
 * Inject focus mode styles into the document.
 * Idempotent - won't add duplicate style elements.
 * [I/O]
 *
 * @example
 * injectFocusModeStyles()
 * // Adds <style id="vilify-focus-mode-styles"> to document head
 */
export function injectFocusModeStyles() {
  // Template: I/O - DOM mutation
  // Check if styles already injected
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
 *
 * @param {SiteTheme} theme - Theme configuration
 *
 * @example
 * applyTheme({ accent: '#ff0000', bg1: '#002b36', ... })
 * // Sets --accent, --bg-1, etc. on document root
 */
export function applyTheme(theme) {
  // Template: Compound - access all fields from theme
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
 * Creates: #vilify-focus > #vilify-content + .vilify-status-bar
 * Status bar has: mode badge, optional input, message area
 * [I/O]
 *
 * @param {SiteConfig} config - Site configuration
 * @param {AppState} state - Current application state
 *
 * @example
 * renderFocusMode(youtubeConfig, state)
 * // Creates overlay with site's theme, ready for content
 */
export function renderFocusMode(config, state) {
  // Template: Compound - access config.theme, state fields
  // Inject styles first
  injectFocusModeStyles();

  // Apply site theme
  if (config.theme) {
    applyTheme(config.theme);
  }

  // Remove existing focus mode container if present
  const existing = document.getElementById('vilify-focus');
  if (existing) {
    existing.remove();
  }

  // Get current mode for status bar
  const mode = getMode(state);

  // Create content area
  const content = el('div', { id: 'vilify-content' }, []);

  // Create status bar
  const statusBar = createStatusBar(mode, state);

  // Create main container
  const container = el('div', { id: 'vilify-focus' }, [
    content,
    statusBar
  ]);

  // Add focus mode class to body
  document.body.classList.add('vilify-focus-mode');

  // Append to document
  document.body.appendChild(container);
}

/**
 * Create the status bar element based on current mode.
 * [PURE]
 *
 * @param {string} mode - Current display mode ('NORMAL', 'COMMAND', 'FILTER', 'SEARCH')
 * @param {AppState} state - Current application state
 * @returns {HTMLElement} Status bar element
 */
function createStatusBar(mode, state) {
  // Template: Enumeration - case per mode value
  const leftContent = [];
  const rightContent = [];

  // Mode badge
  const modeBadge = el('span', { class: 'vilify-mode-badge' }, [mode]);
  leftContent.push(modeBadge);

  // Add input field for FILTER, SEARCH, COMMAND modes
  if (mode === 'FILTER') {
    const input = el('input', {
      type: 'text',
      class: 'vilify-status-input',
      placeholder: 'Filter...',
      id: 'vilify-filter-input'
    }, []);
    // Set value after creation (can't set via attributes for input)
    input.value = state.localFilterQuery;
    leftContent.push(input);
  } else if (mode === 'SEARCH') {
    const input = el('input', {
      type: 'text',
      class: 'vilify-status-input',
      placeholder: 'Search...',
      id: 'vilify-search-input'
    }, []);
    input.value = state.siteSearchQuery;
    leftContent.push(input);
  } else if (mode === 'COMMAND') {
    const input = el('input', {
      type: 'text',
      class: 'vilify-status-input',
      placeholder: 'Command...',
      id: 'vilify-command-input'
    }, []);
    input.value = state.paletteQuery;
    leftContent.push(input);
  }

  // Message area (right side)
  const message = el('span', {
    class: 'vilify-status-message',
    id: 'vilify-status-message'
  }, []);
  rightContent.push(message);

  // Build status bar
  const leftDiv = el('div', { class: 'vilify-status-left' }, leftContent);
  const rightDiv = el('div', { class: 'vilify-status-right' }, rightContent);

  return el('div', { class: 'vilify-status-bar' }, [leftDiv, rightDiv]);
}

/**
 * Render a list of content items with selection state.
 * Uses default rendering or custom renderItem function.
 * [I/O]
 *
 * @param {Array<ContentItem>} items - Items to render
 * @param {number} selectedIdx - Index of selected item
 * @param {HTMLElement} container - Container to render into (defaults to #vilify-content)
 * @param {Function|null} renderItem - Optional custom item renderer: (item, isSelected) => HTMLElement
 *
 * @example
 * renderListing(videos, 0)                    // Default rendering, first selected
 * renderListing(comments, 2, container, renderComment)   // Custom renderer, third selected
 */
export function renderListing(items, selectedIdx, container = null, renderItem = null) {
  // Template: Self-referential (list) - iterate over items
  // Get container
  const targetContainer = container || document.getElementById('vilify-content');
  if (!targetContainer) {
    return;
  }

  // Clear existing content
  clear(targetContainer);

  // Handle empty list
  if (!items || items.length === 0) {
    const empty = el('div', { class: 'vilify-empty' }, ['No items found']);
    targetContainer.appendChild(empty);
    return;
  }

  // Render each item
  items.forEach((item, index) => {
    const isSelected = index === selectedIdx;

    // Use custom renderer if provided, otherwise default
    const renderer = renderItem || renderDefaultItem;
    const itemEl = renderer(item, isSelected);

    // Add data-index for event handling
    itemEl.setAttribute('data-index', String(index));

    targetContainer.appendChild(itemEl);
  });

  // Scroll selected item into view
  const selectedEl = targetContainer.querySelector('.vilify-item.selected');
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

/**
 * Default item renderer for ContentItem.
 * Returns element with .vilify-item, thumbnail, title, meta.
 * [PURE]
 *
 * @param {ContentItem} item - Item to render
 * @param {boolean} isSelected - Whether this item is selected
 * @returns {HTMLElement} Rendered item element
 *
 * @example
 * renderDefaultItem({ title: 'Video', meta: 'Channel', thumbnail: '...' }, true)
 * // Returns <div class="vilify-item selected">...</div>
 */
export function renderDefaultItem(item, isSelected) {
  // Template: Union - handle ContentItem, GroupHeader, Command
  // Check for group header
  if ('group' in item && item.group) {
    return el('div', { class: 'vilify-group-header' }, [item.group]);
  }

  // Check for Command (has label and action)
  if ('label' in item && 'action' in item) {
    return renderCommandItem(item, isSelected);
  }

  // Default: ContentItem
  // Template: Compound - access all fields from ContentItem
  const classes = isSelected ? 'vilify-item selected' : 'vilify-item';
  const children = [];

  // Thumbnail (if present)
  if (item.thumbnail) {
    const thumb = el('img', {
      class: 'vilify-thumb',
      src: item.thumbnail,
      alt: ''
    }, []);
    children.push(thumb);
  } else {
    // Placeholder for consistent layout
    const thumbPlaceholder = el('div', { class: 'vilify-thumb' }, []);
    children.push(thumbPlaceholder);
  }

  // Info section
  const infoChildren = [];

  // Title
  const title = el('div', { class: 'vilify-item-title' }, [item.title || '']);
  infoChildren.push(title);

  // Meta (secondary info)
  if (item.meta) {
    const meta = el('div', { class: 'vilify-item-meta' }, [item.meta]);
    infoChildren.push(meta);
  }

  // Subtitle (third line)
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
 *
 * @param {Command} cmd - Command to render
 * @param {boolean} isSelected - Whether this item is selected
 * @returns {HTMLElement} Rendered command element
 */
function renderCommandItem(cmd, isSelected) {
  // Template: Compound - access all fields from Command
  const classes = isSelected ? 'vilify-item selected' : 'vilify-item';
  const children = [];

  // Icon
  if (cmd.icon) {
    const icon = el('span', { class: 'vilify-item-icon' }, [cmd.icon + ' ']);
    children.push(icon);
  }

  // Label
  const label = el('span', { class: 'vilify-item-title' }, [cmd.label]);
  children.push(label);

  // Spacer
  const spacer = el('span', { style: 'flex: 1' }, []);
  children.push(spacer);

  // Keys (shortcut hint)
  if (cmd.keys) {
    const keys = el('kbd', {}, [cmd.keys]);
    children.push(keys);
  }

  // Meta info
  if (cmd.meta) {
    const meta = el('span', { class: 'vilify-item-meta', style: 'margin-left: 8px' }, [cmd.meta]);
    children.push(meta);
  }

  return el('div', { class: classes, style: 'align-items: center' }, children);
}

/**
 * Update status bar message.
 * [I/O]
 *
 * @param {string} message - Message to display
 *
 * @example
 * updateStatusMessage('Copied URL')
 */
export function updateStatusMessage(message) {
  // Template: I/O - DOM mutation
  const msgEl = document.getElementById('vilify-status-message');
  if (msgEl) {
    msgEl.textContent = message;
  }
}

/**
 * Update status bar mode badge.
 * [I/O]
 *
 * @param {string} mode - New mode to display
 *
 * @example
 * updateModeBadge('FILTER')
 */
export function updateModeBadge(mode) {
  // Template: I/O - DOM mutation
  const badge = document.querySelector('.vilify-mode-badge');
  if (badge) {
    badge.textContent = mode;
  }
}

/**
 * Remove focus mode overlay and restore normal page.
 * [I/O]
 *
 * @example
 * removeFocusMode()
 */
export function removeFocusMode() {
  // Template: I/O - DOM mutation
  const container = document.getElementById('vilify-focus');
  if (container) {
    container.remove();
  }
  document.body.classList.remove('vilify-focus-mode');
}

/**
 * Get the content container element.
 * [I/O]
 *
 * @returns {HTMLElement|null} Content container or null if not found
 */
export function getContentContainer() {
  return document.getElementById('vilify-content');
}
