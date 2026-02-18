// Settings Window — Neovim-style floating window for colorscheme + font picker
// Capture-phase keydown isolates from main keyboard engine

import { applyTheme } from './layout';
import {
  COLORSCHEMES, FONTS,
  loadSettings, saveSettings,
  getTheme, getFontFamily, getFontCategory,
  type VilifySettings,
} from './settings';

// =============================================================================
// CSS
// =============================================================================

const SETTINGS_CSS = `
  .vilify-settings-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 10001;
  }

  .vilify-settings-window {
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

  /* Title bar */
  .vilify-settings-title {
    padding: 10px 16px 0;
    font-size: 12px;
    color: var(--txt-3);
    letter-spacing: 0.5px;
  }

  .vilify-settings-tabs {
    display: flex;
    border-bottom: 1px solid var(--bg-3);
  }

  .vilify-settings-tab {
    flex: 1;
    padding: 8px 0;
    text-align: center;
    font-size: 12px;
    color: var(--txt-3);
    cursor: pointer;
    border-bottom: 2px solid transparent;
  }
  .vilify-settings-tab.active {
    color: var(--txt-1);
    border-bottom-color: var(--txt-4);
  }

  .vilify-settings-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
    scrollbar-width: thin;
    scrollbar-color: var(--bg-3) transparent;
  }

  .vilify-settings-item {
    display: flex;
    align-items: center;
    padding: 6px 16px;
    cursor: pointer;
    gap: 10px;
  }
  .vilify-settings-item:hover {
    background: var(--bg-2);
  }
  .vilify-settings-item.selected {
    background: var(--bg-2);
  }
  .vilify-settings-item.selected .vilify-settings-label {
    color: var(--txt-1);
  }

  .vilify-settings-marker {
    width: 16px;
    color: var(--txt-4);
    font-size: 12px;
    flex-shrink: 0;
    text-align: center;
  }

  .vilify-settings-swatches {
    display: flex;
    gap: 3px;
    flex-shrink: 0;
  }
  .vilify-settings-swatch {
    width: 14px;
    height: 14px;
    border-radius: 2px;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .vilify-settings-label {
    color: var(--txt-2);
    font-size: 13px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .vilify-settings-font-preview {
    color: var(--txt-3);
    font-size: 16px;
    flex-shrink: 0;
  }

  .vilify-settings-category {
    padding: 6px 16px 2px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--txt-4);
  }

  .vilify-settings-footer {
    padding: 6px 16px;
    border-top: 1px solid var(--bg-3);
    font-size: 11px;
    color: var(--txt-3);
    display: flex;
    gap: 12px;
  }
  .vilify-settings-footer kbd {
    background: transparent;
    border: 1px solid var(--bg-3);
    padding: 1px 4px;
    font-size: 10px;
    font-family: var(--font-mono);
    color: var(--txt-4);
  }
`;

// =============================================================================
// MODULE STATE
// =============================================================================

let windowEl: HTMLElement | null = null;
let backdropEl: HTMLElement | null = null;
let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
let currentSection: 'colorscheme' | 'font' = 'colorscheme';
let selectedIdx = 0;
let currentSettings: VilifySettings | null = null;
let stylesInjected = false;

const SECTIONS: ('colorscheme' | 'font')[] = ['colorscheme', 'font'];

// =============================================================================
// HELPERS
// =============================================================================

function getColorschemeKeys(): string[] {
  return Object.keys(COLORSCHEMES);
}

function getCurrentListLength(): number {
  if (currentSection === 'colorscheme') return getColorschemeKeys().length;
  return FONTS.length;
}

function nextSection(): void {
  const idx = SECTIONS.indexOf(currentSection);
  switchSection(SECTIONS[(idx + 1) % SECTIONS.length]);
}

// =============================================================================
// RENDER
// =============================================================================

function renderWindow(): void {
  if (!windowEl || !currentSettings) return;

  const isColorscheme = currentSection === 'colorscheme';
  const isFont = currentSection === 'font';

  // Tabs
  const tabsEl = windowEl.querySelector('.vilify-settings-tabs');
  if (tabsEl) {
    const tabs = tabsEl.querySelectorAll('.vilify-settings-tab');
    tabs[0]?.classList.toggle('active', isColorscheme);
    tabs[1]?.classList.toggle('active', isFont);
  }

  // List
  const listEl = windowEl.querySelector('.vilify-settings-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (isColorscheme) {
    const keys = getColorschemeKeys();
    keys.forEach((item, idx) => {
      const isSelected = idx === selectedIdx;
      const isActive = item === currentSettings.colorscheme;
      const theme = COLORSCHEMES[item];

      const row = document.createElement('div');
      row.className = 'vilify-settings-item' + (isSelected ? ' selected' : '');

      // Marker
      const marker = document.createElement('span');
      marker.className = 'vilify-settings-marker';
      marker.textContent = isActive ? '*' : '';
      row.appendChild(marker);

      // Swatches — show 7 colors: bg1, accent, txt4, txt1, accentHover, modeNormal, modeCommand
      const swatches = document.createElement('span');
      swatches.className = 'vilify-settings-swatches';
      for (const color of [theme.bg1, theme.accent, theme.txt4, theme.txt1, theme.accentHover, theme.modeNormal, theme.modeCommand]) {
        const swatch = document.createElement('span');
        swatch.className = 'vilify-settings-swatch';
        swatch.style.backgroundColor = color;
        swatches.appendChild(swatch);
      }
      row.appendChild(swatches);

      // Label
      const label = document.createElement('span');
      label.className = 'vilify-settings-label';
      label.textContent = item;
      row.appendChild(label);

      row.addEventListener('click', () => {
        selectedIdx = idx;
        applySelection();
        renderWindow();
      });

      listEl.appendChild(row);
    });
  } else if (isFont) {
    const PREVIEW_TEXT = { monospace: 'HI1l0Ojqnagv', 'sans-serif': 'Hamburgefonts', serif: 'Hamburgefonts' };
    let lastCategory = '';
    FONTS.forEach((item, idx) => {
      // Category header
      const category = getFontCategory(item);
      if (category !== lastCategory) {
        lastCategory = category;
        const header = document.createElement('div');
        header.className = 'vilify-settings-category';
        header.textContent = category;
        listEl.appendChild(header);
      }

      const isSelected = idx === selectedIdx;
      const isActive = item === currentSettings.font;

      const row = document.createElement('div');
      row.className = 'vilify-settings-item' + (isSelected ? ' selected' : '');

      // Marker
      const marker = document.createElement('span');
      marker.className = 'vilify-settings-marker';
      marker.textContent = isActive ? '*' : '';
      row.appendChild(marker);

      // Label
      const label = document.createElement('span');
      label.className = 'vilify-settings-label';
      label.textContent = item;
      row.appendChild(label);

      // Font preview
      const preview = document.createElement('span');
      preview.className = 'vilify-settings-font-preview';
      preview.style.fontFamily = getFontFamily(item);
      preview.textContent = PREVIEW_TEXT[category];
      row.appendChild(preview);

      row.addEventListener('click', () => {
        selectedIdx = idx;
        applySelection();
        renderWindow();
      });

      listEl.appendChild(row);
    });
  }

  // Scroll selected into view
  const selectedEl = listEl.querySelector('.vilify-settings-item.selected');
  if (selectedEl) {
    selectedEl.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
}

function applySelection(): void {
  if (!currentSettings) return;

  if (currentSection === 'colorscheme') {
    const key = getColorschemeKeys()[selectedIdx];
    if (key) {
      currentSettings.colorscheme = key;
      applyTheme(getTheme(key));
    }
  } else if (currentSection === 'font') {
    const font = FONTS[selectedIdx];
    if (font) {
      currentSettings.font = font;
      document.documentElement.style.setProperty('--font-mono', getFontFamily(font));
    }
  }

  saveSettings(currentSettings);
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Open the settings floating window.
 * [I/O]
 */
export function openSettingsWindow(): void {
  if (windowEl) return; // Already open

  // Inject styles once
  if (!stylesInjected) {
    const style = document.createElement('style');
    style.textContent = SETTINGS_CSS;
    document.head.appendChild(style);
    stylesInjected = true;
  }

  // Load web fonts for preview (idempotent — skips if already injected)
  if (!document.getElementById('vilify-google-fonts')) {
    const link = document.createElement('link');
    link.id = 'vilify-google-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono&family=Fira+Code&family=IBM+Plex+Mono&family=Source+Code+Pro&family=Cascadia+Code&family=Iosevka&family=Inter&family=IBM+Plex+Sans&family=Source+Sans+3&family=Nunito&family=Work+Sans&family=Lora&family=Source+Serif+4&family=Merriweather&family=Playfair+Display&family=IBM+Plex+Serif&display=swap';
    document.head.appendChild(link);
  }

  currentSettings = loadSettings();
  currentSection = 'colorscheme';
  // Set selectedIdx to the current active item
  const keys = getColorschemeKeys();
  selectedIdx = Math.max(0, keys.indexOf(currentSettings.colorscheme));

  // Backdrop
  backdropEl = document.createElement('div');
  backdropEl.className = 'vilify-settings-backdrop';
  backdropEl.addEventListener('click', closeSettingsWindow);
  document.body.appendChild(backdropEl);

  // Window
  windowEl = document.createElement('div');
  windowEl.className = 'vilify-settings-window';
  windowEl.innerHTML = `
    <div class="vilify-settings-title">Settings</div>
    <div class="vilify-settings-tabs">
      <div class="vilify-settings-tab active">Colorscheme</div>
      <div class="vilify-settings-tab">Font</div>
    </div>
    <div class="vilify-settings-list"></div>
    <div class="vilify-settings-footer">
      <span><kbd>j</kbd><kbd>k</kbd> navigate</span>
      <span><kbd>Enter</kbd> apply</span>
      <span><kbd>Tab</kbd> section</span>
      <span><kbd>Esc</kbd> close</span>
    </div>
  `;

  // Tab click handlers
  const tabs = windowEl.querySelectorAll('.vilify-settings-tab');
  tabs[0]?.addEventListener('click', () => switchSection('colorscheme'));
  tabs[1]?.addEventListener('click', () => switchSection('font'));

  document.body.appendChild(windowEl);
  renderWindow();

  // Capture-phase keydown — isolates from main keyboard engine
  keydownHandler = (e: KeyboardEvent) => {
    e.stopPropagation();

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeSettingsWindow();
        break;
      case 'j':
      case 'ArrowDown':
        e.preventDefault();
        selectedIdx = Math.min(selectedIdx + 1, getCurrentListLength() - 1);
        renderWindow();
        break;
      case 'k':
      case 'ArrowUp':
        e.preventDefault();
        selectedIdx = Math.max(selectedIdx - 1, 0);
        renderWindow();
        break;
      case 'Tab':
        e.preventDefault();
        nextSection();
        break;
      case 'Enter':
        e.preventDefault();
        applySelection();
        renderWindow();
        break;
      case 'g':
        e.preventDefault();
        selectedIdx = 0;
        renderWindow();
        break;
      case 'G':
        e.preventDefault();
        selectedIdx = getCurrentListLength() - 1;
        renderWindow();
        break;
    }
  };

  document.addEventListener('keydown', keydownHandler, true);
}

function switchSection(section: 'colorscheme' | 'font'): void {
  currentSection = section;
  if (currentSettings) {
    if (section === 'colorscheme') {
      selectedIdx = Math.max(0, getColorschemeKeys().indexOf(currentSettings.colorscheme));
    } else if (section === 'font') {
      selectedIdx = Math.max(0, FONTS.indexOf(currentSettings.font));
    }
  } else {
    selectedIdx = 0;
  }
  renderWindow();
}

/**
 * Close the settings floating window.
 * [I/O]
 */
export function closeSettingsWindow(): void {
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
  currentSettings = null;
}

/**
 * Check if the settings window is open.
 * [PURE]
 */
export function isSettingsOpen(): boolean {
  return windowEl !== null;
}
