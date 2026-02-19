// Layout rendering - Focus mode layout functions for Vilify
// Following HTDP design from .design/DATA.md and .design/BLUEPRINT.md

import { el, clear } from './view';
import { getMode } from './state';
import { openSettingsWindow } from './settings-window';
import { getFontFamily } from './settings';
import type { SiteConfig, SiteTheme, AppState, ContentItem } from '../types';

/**
 * Return 'hsl(0, 0%, 0%)' or 'hsl(0, 0%, 100%)' for readable text on the given background.
 * Accepts hex (#RRGGBB) or hsl(h, s%, l%) input.
 * Uses YIQ perceived-brightness formula for both (HSL is converted to RGB first).
 * [PURE]
 */
export function contrastText(color: string): string {
  const dark = 'hsl(0, 0%, 0%)';
  const light = 'hsl(0, 0%, 100%)';

  if (!color) return light;

  let r: number, g: number, b: number;

  const hslMatch = color.match(/^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/);
  if (hslMatch) {
    // Convert HSL → RGB for perceptually-accurate YIQ brightness
    const h = parseFloat(hslMatch[1]) / 360;
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;
    if (s === 0) {
      r = g = b = Math.round(l * 255);
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
      g = Math.round(hue2rgb(p, q, h) * 255);
      b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);
    }
  } else {
    // Hex path
    const c = color.replace('#', '');
    r = parseInt(c.substring(0, 2), 16);
    g = parseInt(c.substring(2, 4), 16);
    b = parseInt(c.substring(4, 6), 16);
  }

  // YIQ perceived-brightness — consistent for both input formats
  return (r * 299 + g * 587 + b * 114) / 1000 >= 128 ? dark : light;
}

// Main CSS for focus mode - Kanagawa theme with TUI aesthetic
const FOCUS_MODE_CSS = `
  :root {
    --bg-1: hsl(240, 14%, 14%);
    --bg-2: hsl(240, 15%, 19%);
    --bg-3: hsl(240, 14%, 24%);
    --txt-1: hsl(50, 36%, 77%);
    --txt-2: hsl(49, 30%, 68%);
    --txt-3: hsl(53, 4%, 43%);
    --txt-4: hsl(220, 53%, 67%);
    --accent: hsl(358, 51%, 51%);
    --accent-hover: hsl(0, 82%, 53%);
    --mode-normal: hsl(205, 69%, 49%);
    --mode-search: hsl(68, 100%, 30%);
    --mode-command: hsl(18, 80%, 44%);
    --mode-filter: hsl(331, 64%, 52%);
    --mode-replace: hsl(0, 0%, 50%);
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
    border: 2px solid var(--bg-3);
  }

  /* Tab bar at top */
  .vilify-tab-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--bg-3);
    padding: 0;
    flex-shrink: 0;
    font-size: 13px;
    background: var(--bg-1);
  }
  .vilify-tab-bar-left {
    display: flex;
    align-items: center;
  }
  .vilify-tab-bar-right {
    display: flex;
    align-items: center;
    padding: 0 12px;
    font-size: 11px;
    color: var(--txt-3);
    gap: 6px;
    flex-wrap: nowrap;
  }
  .vilify-tab-bar-right kbd {
    background: transparent;
    border: 1px solid var(--bg-3);
    padding: 1px 4px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--txt-4);
  }
  .vilify-tab-bar-right .vilify-hint-sep {
    color: var(--bg-3);
    margin: 0 2px;
  }
  .vilify-tab {
    padding: 6px 16px;
    color: var(--txt-3);
    border-right: 1px solid var(--bg-3);
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }
  .vilify-tab:hover {
    color: var(--txt-2);
    background: var(--bg-2);
  }
  .vilify-tab.active {
    color: var(--txt-1);
    background: var(--bg-2);
  }
  .vilify-tab kbd {
    background: transparent;
    border: 1px solid var(--bg-3);
    padding: 0px 3px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--txt-4);
    margin-right: 2px;
  }
  .vilify-tab.active kbd {
    border-color: var(--txt-3);
    color: var(--txt-4);
  }
  /* Settings gear - nearly invisible until hovered */
  .vilify-settings-btn {
    color: var(--txt-4);
    cursor: pointer;
    padding: 4px 6px;
    font-size: 18px;
    user-select: none;
    transition: color 0.15s;
  }
  .vilify-settings-btn:hover {
    color: var(--txt-3);
  }

  /* Status bar at bottom - powerline/lualine style */
  .vilify-status-bar {
    height: 28px;
    padding: 0;
    border-top: 1px solid var(--bg-3);
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    font-size: 12px;
    flex-shrink: 0;
    background: var(--bg-2);
  }

  .vilify-status-left {
    height: 100%;
    display: flex;
    align-items: stretch;
    flex: 1;
    min-width: 0;
  }

  .vilify-status-right {
    height: 100%;
    display: flex;
    align-items: stretch;
  }

  /* Powerline segment base */
  .vilify-pl-seg {
    display: flex;
    align-items: center;
    padding: 0 10px;
    font-family: var(--font-mono);
    font-size: 12px;
    white-space: nowrap;
  }

  /* Powerline arrow separator */
  .vilify-pl-arrow {
    display: flex;
    align-items: stretch;
    font-size: 0;
    line-height: 0;
    width: 0;
    overflow: visible;
  }
  .vilify-pl-arrow svg {
    height: 28px;
    width: 14px;
    display: block;
  }

  /* Mode badge - leftmost segment */
  .vilify-mode-badge {
    background: var(--mode-normal);
    color: var(--mode-normal-text, hsl(0, 0%, 100%));
    padding: 0 12px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    font-family: var(--font-mono);
    display: flex;
    align-items: center;
  }
  .vilify-mode-badge.mode-search { background: var(--mode-search); color: var(--mode-search-text, hsl(0, 0%, 100%)); }
  .vilify-mode-badge.mode-command { background: var(--mode-command); color: var(--mode-command-text, hsl(0, 0%, 100%)); }
  .vilify-mode-badge.mode-filter { background: var(--mode-filter); color: var(--mode-filter-text, hsl(0, 0%, 100%)); }
  .vilify-mode-badge.mode-recommended { background: var(--mode-filter); color: var(--mode-filter-text, hsl(0, 0%, 100%)); }
  .vilify-mode-badge.mode-description { background: var(--mode-replace); color: var(--mode-replace-text, hsl(0, 0%, 100%)); }

  /* Page type segment (gray) */
  .vilify-pl-pagetype {
    background: var(--bg-3);
    color: var(--txt-1);
    font-weight: 600;
    font-size: 12px;
  }

  /* Middle section (lighter bg) */
  .vilify-pl-middle {
    background: var(--bg-2);
    color: var(--txt-3);
    flex: 1;
    min-width: 0;
    font-size: 11px;
  }

  /* Position segment (gray, right side) */
  .vilify-pl-position {
    background: var(--bg-3);
    color: var(--txt-1);
    font-size: 12px;
    font-weight: 600;
  }

  /* Browser segment (mode-colored, rightmost) */
  .vilify-pl-browser {
    background: var(--mode-normal);
    color: var(--mode-normal-text, hsl(0, 0%, 100%));
    font-size: 12px;
    font-weight: 700;
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
    min-width: 0;
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
    font-size: 11px;
  }

  .vilify-status-sort {
    color: var(--txt-3);
    font-size: 11px;
    margin-left: 8px;
    padding: 2px 6px;
    background: var(--bg-2);
    border: 1px solid var(--bg-3);
  }
  .vilify-status-sort::before {
    content: 'sort:';
    color: var(--txt-3);
    opacity: 0.7;
  }

  .vilify-status-count {
    color: var(--txt-3);
    font-size: 11px;
    margin-left: 8px;
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
    color: var(--txt-2);
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
    align-items: center;
    padding: 8px 24px;
    cursor: pointer;
    max-width: 1000px;
    margin: 0 auto;
  }

  .vilify-item:hover {
    background: var(--bg-2);
  }

  .vilify-item.selected {
    background: var(--bg-2);
  }

  .vilify-thumb {
    width: 120px;
    height: 68px;
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
    font-size: 13px;
    margin-bottom: 2px;
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

  /* Tilde filler for empty rows (vim-style) */
  .vilify-tilde-filler {
    color: var(--txt-4);
    font-size: 14px;
    padding: 4px 24px;
    user-select: none;
    opacity: 0.5;
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
let inputCallbacks: any = null;

/**
 * Set callbacks for status bar input handling
 * @param {Object} callbacks - { onFilterChange, onFilterSubmit, onSearchChange, onSearchSubmit, onCommandChange, onCommandSubmit, onEscape }
 */
export function setInputCallbacks(callbacks: any): void {
  inputCallbacks = callbacks;
}

/**
 * Inject focus mode styles into the document.
 * Idempotent - won't add duplicate style elements.
 * [I/O]
 */
export function injectFocusModeStyles(): void {
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
export function applyTheme(theme: SiteTheme): void {
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
  root.style.setProperty('--mode-normal', theme.modeNormal);
  root.style.setProperty('--mode-search', theme.modeSearch);
  root.style.setProperty('--mode-command', theme.modeCommand);
  root.style.setProperty('--mode-filter', theme.modeFilter);
  root.style.setProperty('--mode-replace', theme.modeReplace);
  root.style.setProperty('--mode-normal-text', contrastText(theme.modeNormal));
  root.style.setProperty('--mode-search-text', contrastText(theme.modeSearch));
  root.style.setProperty('--mode-command-text', contrastText(theme.modeCommand));
  root.style.setProperty('--mode-filter-text', contrastText(theme.modeFilter));
  root.style.setProperty('--mode-replace-text', contrastText(theme.modeReplace));
}

/**
 * Apply font to the entire page + vilify UI.
 * Sets --font-mono CSS variable and overrides all page elements.
 * [I/O]
 */
export function applyFont(font: string): void {
  const family = getFontFamily(font);
  const root = document.documentElement;
  root.style.setProperty('--font-mono', family);

  // Apply to entire website — inject/update a global override style
  let fontStyle = document.getElementById('vilify-font-override');
  if (!fontStyle) {
    fontStyle = document.createElement('style');
    fontStyle.id = 'vilify-font-override';
    document.head.appendChild(fontStyle);
  }
  fontStyle.textContent = `* { font-family: ${family} !important; }`;
}

/**
 * Render the full focus mode overlay (content area, status bar).
 * [I/O]
 */
export function renderFocusMode(config: SiteConfig, state: AppState): void {
  injectFocusModeStyles();

  // Theme is applied by init() from saved settings — not here.

  // Remove existing focus mode container if present
  const existing = document.getElementById('vilify-focus');
  if (existing) {
    existing.remove();
  }

  // Create tab bar
  const tabBar = createTabBar(config);

  // Create content area
  const content = el('div', { id: 'vilify-content' }, []);

  // Create status bar with input
  const statusBar = createStatusBar(state);

  // Create main container
  const container = el('div', { id: 'vilify-focus' }, [
    tabBar,
    content,
    statusBar
  ]);

  document.body.classList.add('vilify-focus-mode');
  document.body.appendChild(container);
}

/**
 * Create tab bar element for navigation.
 * [PURE - creates DOM element]
 */
function createTabBar(config: SiteConfig): HTMLElement {
  const pageType = config?.getPageType?.() ?? 'other';

  const tabs = [
    { label: 'Home', shortcut: 'gh', type: 'home', path: '/' },
    { label: 'Subscriptions', shortcut: 'gs', type: 'subscriptions', path: '/feed/subscriptions' },
    { label: 'Watch Later', shortcut: 'gw', type: 'playlist', path: '/playlist?list=WL' },
    { label: 'History', shortcut: 'gy', type: 'history', path: '/feed/history' },
  ];

  const tabElements = tabs.map(tab => {
    const isActive = pageType === tab.type ||
      (tab.type === 'playlist' && location.pathname === '/playlist' && location.search.includes('list=WL'));
    const classes = isActive ? 'vilify-tab active' : 'vilify-tab';
    const tabEl = el('span', { class: classes }, [
      el('kbd', {}, [tab.shortcut]),
      ' ' + tab.label
    ]);
    tabEl.addEventListener('click', () => {
      window.location.href = tab.path;
    });
    return tabEl;
  });

  const leftDiv = el('div', { class: 'vilify-tab-bar-left' }, tabElements);

  // Right side: navigation hints + settings gear
  const isListPage = pageType !== 'watch';
  const hintChildren: (HTMLElement | string)[] = [];

  if (isListPage) {
    hintChildren.push(
      el('kbd', {}, ['j']), el('kbd', {}, ['k']), 'move',
      el('kbd', {}, ['gg']), 'top', el('kbd', {}, ['G']), 'bottom',
      el('kbd', {}, ['↵']), 'play',
      el('kbd', {}, ['dd']), 'dismiss', el('kbd', {}, ['mw']), 'watch later',
      el('kbd', {}, ['i']), 'search', el('kbd', {}, ['/']), 'filter', el('kbd', {}, [':']), 'cmd',
    );
  } else {
    hintChildren.push(
      el('kbd', {}, ['zp']), 'chapters', el('kbd', {}, ['t']), 'transcript',
      el('kbd', {}, ['[']), el('kbd', {}, [']']), 'comments',
      el('kbd', {}, ['zr']), 'rec', el('kbd', {}, ['gc']), 'channel',
      el('kbd', {}, ['i']), 'search', el('kbd', {}, [':']), 'cmd',
    );
  }

  const hintsDiv = el('div', { class: 'vilify-tab-bar-right' }, hintChildren);

  // Settings gear (nearly invisible)
  const settingsBtn = el('span', { class: 'vilify-settings-btn', title: ':settings' }, ['⚙']);
  settingsBtn.addEventListener('click', () => openSettingsWindow());
  hintsDiv.appendChild(settingsBtn);

  return el('div', { class: 'vilify-tab-bar' }, [leftDiv, hintsDiv]);
}

/**
 * Create a powerline arrow SVG separator.
 * @param {string} fromColor - CSS color of left segment
 * @param {string} toColor - CSS color of right segment
 * @param {'right'|'left'} direction - Arrow direction
 */
function plArrow(fromColor: string, toColor: string, direction: 'right' | 'left' = 'right'): HTMLElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 14 28');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.style.height = '28px';
  svg.style.width = '14px';
  svg.style.display = 'block';

  // Background fill (right-side color)
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', '0');
  bg.setAttribute('y', '0');
  bg.setAttribute('width', '14');
  bg.setAttribute('height', '28');
  bg.setAttribute('fill', toColor);
  svg.appendChild(bg);

  // Diagonal slant shape (left-side color)
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  if (direction === 'right') {
    // Slant: top-left to bottom-right diagonal
    path.setAttribute('d', 'M0,0 L14,28 L0,28 Z');
    path.setAttribute('fill', fromColor);
  } else {
    // Slant: top-right to bottom-left diagonal
    path.setAttribute('d', 'M0,28 L14,0 L14,28 Z');
    path.setAttribute('fill', toColor);
    bg.setAttribute('fill', fromColor);
  }
  svg.appendChild(path);

  const wrapper = el('span', { class: 'vilify-pl-arrow' }, []);
  wrapper.appendChild(svg);
  return wrapper;
}

/**
 * Get the CSS color value for the current mode.
 */
function getModeColor(mode: string): string {
  const styles = getComputedStyle(document.documentElement);
  switch (mode) {
    case 'SEARCH': return styles.getPropertyValue('--mode-search').trim() || 'hsl(68, 100%, 30%)';
    case 'COMMAND': return styles.getPropertyValue('--mode-command').trim() || 'hsl(18, 80%, 44%)';
    case 'FILTER': return styles.getPropertyValue('--mode-filter').trim() || 'hsl(331, 64%, 52%)';
    case 'RECOMMENDED': return styles.getPropertyValue('--mode-filter').trim() || 'hsl(331, 64%, 52%)';
    case 'DESCRIPTION': return styles.getPropertyValue('--mode-replace').trim() || 'hsl(0, 0%, 50%)';
    default: return styles.getPropertyValue('--mode-normal').trim() || 'hsl(205, 69%, 49%)';
  }
}

/**
 * Create the status bar element with mode badge and input field.
 * [PURE - but attaches event listeners]
 */
function createStatusBar(state: AppState): HTMLElement {
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
    } else if (inputCallbacks?.onDrawerChange) {
      // For site-specific drawers (CHAPTERS, etc.)
      inputCallbacks.onDrawerChange(e.target.value, currentMode);
    }
  });

  // Track Ctrl-x prefix for Ctrl-x Ctrl-o omnicompletion
  let ctrlXPending = false;

  input.addEventListener('keydown', (e) => {
    e.stopPropagation(); // Prevent keyboard handler from intercepting

    // Prevent macOS Emacs keybindings (Ctrl-N/P = cursor movement) immediately
    if (e.ctrlKey && (e.key === 'n' || e.key === 'p')) {
      e.preventDefault();
    }

    const currentMode = document.querySelector('.vilify-mode-badge')?.textContent;

    // Ctrl-x Ctrl-o omnicompletion sequence (command mode only)
    if (e.ctrlKey && currentMode === 'COMMAND') {
      if (e.key === 'x') {
        e.preventDefault();
        ctrlXPending = true;
        return;
      }
      if (e.key === 'o' && ctrlXPending) {
        e.preventDefault();
        ctrlXPending = false;
        if (inputCallbacks?.onOmniComplete) {
          inputCallbacks.onOmniComplete();
        }
        return;
      }
    }
    // Any non-Ctrl-x key resets the Ctrl-x prefix
    if (ctrlXPending && !(e.ctrlKey && e.key === 'x')) {
      ctrlXPending = false;
    }

    if ((e.key === 'n' && e.ctrlKey && currentMode === 'COMMAND') ||
        (e.key === 'Tab' && !e.shiftKey && currentMode === 'COMMAND')) {
      e.preventDefault();
      if (inputCallbacks?.onCommandNavigate) {
        inputCallbacks.onCommandNavigate('down');
      }
      return;
    } else if ((e.key === 'p' && e.ctrlKey && currentMode === 'COMMAND') ||
               (e.key === 'Tab' && e.shiftKey && currentMode === 'COMMAND')) {
      e.preventDefault();
      if (inputCallbacks?.onCommandNavigate) {
        inputCallbacks.onCommandNavigate('up');
      }
      return;
    } else if (e.key === 'n' && e.ctrlKey && inputCallbacks?.onDrawerNavigate) {
      // Ctrl-N for site-specific drawers (RECOMMENDED, CHAPTERS, etc.)
      e.preventDefault();
      inputCallbacks.onDrawerNavigate('down', currentMode);
      return;
    } else if (e.key === 'p' && e.ctrlKey && inputCallbacks?.onDrawerNavigate) {
      // Ctrl-P for site-specific drawers
      e.preventDefault();
      inputCallbacks.onDrawerNavigate('up', currentMode);
      return;
    } else if (e.key === 'Escape') {
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
      } else if (inputCallbacks?.onDrawerSubmit) {
        // For site-specific drawers (CHAPTERS, etc.)
        inputCallbacks.onDrawerSubmit(e.target.value, e.shiftKey, currentMode);
      }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // Allow arrow keys for filter/drawer navigation (not command palette)
      const direction = e.key === 'ArrowDown' ? 'down' : 'up';
      if (currentMode === 'FILTER' && inputCallbacks?.onFilterNavigate) {
        e.preventDefault();
        inputCallbacks.onFilterNavigate(direction);
      } else if (inputCallbacks?.onDrawerNavigate) {
        // For site-specific drawers (CHAPTERS, etc.)
        e.preventDefault();
        inputCallbacks.onDrawerNavigate(direction, currentMode);
      }
    }
  });

  // Sort indicator (shown when sort is active)
  const sortIndicator = el('span', { class: 'vilify-status-sort', id: 'vilify-status-sort', style: 'display: none' }, []);

  // Hints area (shown when drawer is open)
  const hints = el('span', { class: 'vilify-status-hints', id: 'vilify-status-hints' }, []);

  // Message area
  const message = el('span', { class: 'vilify-status-message', id: 'vilify-status-message' }, []);

  // Page type segment (gray section after mode badge)
  const pageTypeSeg = el('span', { class: 'vilify-pl-seg vilify-pl-pagetype', id: 'vilify-status-pagetype' }, []);

  // Middle section (lighter bg - holds sort, input, hints, message)
  const middleSeg = el('span', { class: 'vilify-pl-seg vilify-pl-middle' }, [sortIndicator, input, hints, message]);

  // Position segment (cursor position like "3/21")
  const positionSeg = el('span', { class: 'vilify-pl-seg vilify-pl-position', id: 'vilify-status-position' }, []);

  // Browser segment (mode-colored, rightmost)
  const ua = navigator.userAgent;
  const browser = /Edg\//i.test(ua) ? 'EDGE'
    : /OPR\//i.test(ua) ? 'OPERA'
    : /Vivaldi\//i.test(ua) ? 'VIVALDI'
    : /Brave/.test(ua) ? 'BRAVE'
    : /YaBrowser\//i.test(ua) ? 'YANDEX'
    : 'CHROME';
  const browserSeg = el('span', { class: 'vilify-pl-seg vilify-pl-browser', id: 'vilify-status-browser' }, [browser]);

  // Build powerline: [mode][▶][pagetype][▶][middle...][◀][position][◀][browser]
  // Colors for initial arrows (NORMAL mode)
  const modeColor = getModeColor(mode);
  const grayColor = 'hsl(240, 14%, 24%)';  // --bg-3
  const midColor = 'hsl(240, 15%, 19%)';   // --bg-2

  const arrow1 = plArrow(modeColor, grayColor, 'right');
  arrow1.id = 'vilify-pl-arrow1';
  const arrow2 = plArrow(grayColor, midColor, 'right');
  arrow2.id = 'vilify-pl-arrow2';
  const arrow3 = plArrow(midColor, grayColor, 'left');
  arrow3.id = 'vilify-pl-arrow3';
  const arrow4 = plArrow(grayColor, modeColor, 'left');
  arrow4.id = 'vilify-pl-arrow4';

  const leftDiv = el('div', { class: 'vilify-status-left' }, [modeBadge, arrow1, pageTypeSeg, arrow2, middleSeg]);
  const rightDiv = el('div', { class: 'vilify-status-right' }, [arrow3, positionSeg, arrow4, browserSeg]);

  return el('div', { class: 'vilify-status-bar' }, [leftDiv, rightDiv]);
}

/**
 * Update status bar to reflect current mode.
 * Shows/hides input, updates badge, focuses input when needed.
 * [I/O]
 * 
 * @param {AppState} state
 * @param {boolean} focusInput - Whether to focus the input
 * @param {string|null} drawerPlaceholder - Placeholder for site-specific drawers
 */
export function updateStatusBar(state: AppState, focusInput: boolean = false, drawerPlaceholder: string | null = null, searchPlaceholder: string | null = null): void {
  const mode = getMode(state);
  
  // Update mode badge text and color class
  const modeClass = mode === 'SEARCH' ? 'mode-search'
    : mode === 'COMMAND' ? 'mode-command'
    : mode === 'FILTER' ? 'mode-filter'
    : mode === 'RECOMMENDED' ? 'mode-recommended'
    : mode === 'DESCRIPTION' ? 'mode-description'
    : null;

  const badge = document.querySelector('.vilify-mode-badge');
  if (badge) {
    badge.textContent = mode;
    badge.classList.remove('mode-search', 'mode-command', 'mode-filter', 'mode-recommended', 'mode-description');
    if (modeClass) badge.classList.add(modeClass);
  }

  // Update powerline arrows to match mode color
  const modeColor = getModeColor(mode);
  const grayColor = 'hsl(240, 14%, 24%)';
  const midColor = 'hsl(240, 15%, 19%)';

  const a1 = document.getElementById('vilify-pl-arrow1');
  if (a1) { a1.innerHTML = ''; a1.appendChild(plArrow(modeColor, grayColor, 'right').firstChild!); }
  const a4 = document.getElementById('vilify-pl-arrow4');
  if (a4) { a4.innerHTML = ''; a4.appendChild(plArrow(grayColor, modeColor, 'left').firstChild!); }

  // Update browser segment to match mode color
  const browserSeg = document.getElementById('vilify-status-browser');
  if (browserSeg) {
    browserSeg.style.background = modeColor;
    browserSeg.style.color = contrastText(modeColor);
  }

  // Check if this is a site-specific drawer mode (not NORMAL, COMMAND, FILTER, SEARCH)
  const isSiteDrawer = mode !== 'NORMAL' && mode !== 'COMMAND' && 
                       mode !== 'FILTER' && mode !== 'SEARCH' && 
                       mode !== 'DESCRIPTION'; // Description doesn't need input

  // Update input visibility and value
  // Support both new nested structure (state.ui.x) and legacy flat structure (state.x)
  const filterQuery = state.ui?.filterQuery ?? state.localFilterQuery ?? '';
  const searchQuery = state.ui?.searchQuery ?? state.siteSearchQuery ?? '';
  const paletteQuery = state.ui?.paletteQuery ?? state.paletteQuery ?? '';
  
  const input = document.getElementById('vilify-status-input');
  if (input) {
    if (mode === 'FILTER') {
      input.classList.add('visible');
      input.placeholder = 'Filter...';
      input.value = filterQuery;
      if (focusInput) input.focus();
    } else if (mode === 'SEARCH') {
      input.classList.add('visible');
      input.placeholder = searchPlaceholder || 'Search...';
      input.value = searchQuery;
      if (focusInput) input.focus();
    } else if (mode === 'COMMAND') {
      input.classList.add('visible');
      input.placeholder = 'Command...';
      input.value = paletteQuery;
      if (focusInput) input.focus();
    } else if (isSiteDrawer) {
      // Site-specific drawer (CHAPTERS, SUGGEST, etc.) - show input
      input.classList.add('visible');
      input.placeholder = drawerPlaceholder || `Filter ${mode.toLowerCase()}...`;
      input.value = (state.ui.drawer === 'suggest') ? (state.ui?.searchQuery ?? '') : '';
      if (focusInput) input.focus();
    } else {
      input.classList.remove('visible');
      input.blur();
    }
  }

  // Update hints
  const hints = document.getElementById('vilify-status-hints');
  if (hints) {
    if (mode === 'DESCRIPTION') {
      // Content drawer - scroll with j/k
      hints.innerHTML = '<kbd>j</kbd> <kbd>k</kbd> scroll <kbd>esc</kbd> close';
    } else if (mode === 'FILTER' || mode === 'COMMAND' || isSiteDrawer) {
      // List drawer or palette - navigate with arrows
      hints.innerHTML = '<kbd>↑↓</kbd> navigate <kbd>↵</kbd> select <kbd>esc</kbd> close';
    } else {
      hints.innerHTML = '';
    }
  }
}

/**
 * Update sort indicator in status bar.
 * [I/O]
 *
 * @param {string|null} sortLabel - Sort label (e.g., "date↓") or null/empty to hide
 */
export function updateSortIndicator(sortLabel: string): void {
  const sortEl = document.getElementById('vilify-status-sort');
  if (sortEl) {
    if (sortLabel) {
      sortEl.textContent = sortLabel;
      sortEl.style.display = 'inline';
    } else {
      sortEl.textContent = '';
      sortEl.style.display = 'none';
    }
  }
}

// Track last known position for updateItemCount fallback
let lastCursorPos = 1;

/**
 * Update item count in status bar.
 * [I/O]
 *
 * @param {number} count - Number of items
 */
export function updateItemCount(count: number): void {
  const posEl = document.getElementById('vilify-status-position');
  if (posEl) {
    posEl.textContent = count > 0 ? `${lastCursorPos}/${count}` : '';
  }
}

/**
 * Update cursor position display in status bar.
 * [I/O]
 */
export function updateCursorPosition(pos: number, total: number): void {
  lastCursorPos = pos;
  const posEl = document.getElementById('vilify-status-position');
  if (posEl) {
    posEl.textContent = total > 0 ? `${pos}/${total}` : '';
  }
}

/**
 * Render a list of content items with selection state.
 * [I/O]
 */
export function renderListing(items: ContentItem[], selectedIdx: number, container: HTMLElement | null = null, renderItem: ((item: ContentItem, isSelected: boolean, index: number) => HTMLElement) | null = null): void {
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
    const itemEl = renderer(item, isSelected, index);
    itemEl.setAttribute('data-index', String(index));
    targetContainer.appendChild(itemEl);
  });

  // Add tilde fillers to fill remaining space (vim-style)
  addTildeFillers(targetContainer);

  const selectedEl = targetContainer.querySelector('.vilify-item.selected');
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
}

/**
 * Add tilde filler rows to fill remaining vertical space (vim-style ~).
 * [I/O]
 */
function addTildeFillers(container: HTMLElement): void {
  // Use requestAnimationFrame to measure after layout
  requestAnimationFrame(() => {
    const containerHeight = container.clientHeight;
    const contentHeight = container.scrollHeight;
    const rowHeight = 84; // Approximate height of one item row

    if (contentHeight < containerHeight) {
      const remainingHeight = containerHeight - contentHeight;
      const tildeCount = Math.floor(remainingHeight / (rowHeight * 0.3));

      for (let i = 0; i < tildeCount; i++) {
        const tilde = el('div', { class: 'vilify-tilde-filler' }, ['~']);
        container.appendChild(tilde);
      }
    }
  });
}

/**
 * Default item renderer for ContentItem.
 * [PURE]
 */
export function renderDefaultItem(item: ContentItem, isSelected: boolean, _index?: number): HTMLElement {
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
function renderCommandItem(cmd: any, isSelected: boolean): HTMLElement {
  const classes = isSelected ? 'vilify-item selected' : 'vilify-item';
  const children = [];

  if (cmd.icon && !cmd.hidden) {
    const icon = el('span', { class: 'vilify-item-icon' }, [cmd.icon + ' ']);
    children.push(icon);
  }

  const label = el('span', { class: 'vilify-item-title' }, [cmd.label]);
  children.push(label);

  const spacer = el('span', { style: 'flex: 1' }, []);
  children.push(spacer);

  if (cmd.keys && !cmd.hidden) {
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
export function updateStatusMessage(message: string): void {
  const msgEl = document.getElementById('vilify-status-message');
  if (msgEl) {
    msgEl.textContent = message;
  }
}

/**
 * Remove focus mode overlay and restore normal page.
 * [I/O]
 */
export function removeFocusMode(): void {
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
export function getContentContainer(): HTMLElement | null {
  return document.getElementById('vilify-content');
}
