// Settings Window — Neovim-style floating window for colorscheme + font picker
// Built on the shared modal-window base.

import { applyTheme } from './layout';
import {
  COLORSCHEMES, FONTS,
  loadSettings, saveSettings,
  getTheme, getFontFamily, getFontCategory,
  type VilifySettings,
} from './settings';
import { createModalWindow, modalBaseCSS } from './modal-window';

// =============================================================================
// CSS (settings-specific additions)
// =============================================================================

const SETTINGS_EXTRA_CSS = `
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
`;

// =============================================================================
// SETTINGS STATE
// =============================================================================

const SECTIONS: ('colorscheme' | 'font')[] = ['colorscheme', 'font'];
let currentSettings: VilifySettings | null = null;

function getColorschemeKeys(): string[] {
  return Object.keys(COLORSCHEMES);
}

function applySelection(sectionIdx: number, selectedIdx: number): void {
  if (!currentSettings) return;

  if (SECTIONS[sectionIdx] === 'colorscheme') {
    const key = getColorschemeKeys()[selectedIdx];
    if (key) {
      currentSettings.colorscheme = key;
      applyTheme(getTheme(key));
    }
  } else if (SECTIONS[sectionIdx] === 'font') {
    const font = FONTS[selectedIdx];
    if (font) {
      currentSettings.font = font;
      document.documentElement.style.setProperty('--font-mono', getFontFamily(font));
    }
  }

  saveSettings(currentSettings);
}

// =============================================================================
// MODAL INSTANCE
// =============================================================================

const modal = createModalWindow({
  prefix: 'vilify-settings',
  css: modalBaseCSS('vilify-settings', SETTINGS_EXTRA_CSS),
  sections: SECTIONS,

  onBeforeOpen: () => {
    // Load web fonts for preview (idempotent)
    if (!document.getElementById('vilify-google-fonts')) {
      const link = document.createElement('link');
      link.id = 'vilify-google-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono&family=Fira+Code&family=IBM+Plex+Mono&family=Source+Code+Pro&family=Cascadia+Code&family=Iosevka&family=Inter&family=IBM+Plex+Sans&family=Source+Sans+3&family=Nunito&family=Work+Sans&family=Lora&family=Source+Serif+4&family=Merriweather&family=Playfair+Display&family=IBM+Plex+Serif&display=swap';
      document.head.appendChild(link);
    }

    currentSettings = loadSettings();
  },

  buildWindowHTML: (prefix) => `
    <div class="${prefix}-title">Settings</div>
    <div class="${prefix}-tabs">
      <div class="${prefix}-tab active">Colorscheme</div>
      <div class="${prefix}-tab">Font</div>
    </div>
    <div class="${prefix}-list"></div>
    <div class="${prefix}-footer">
      <span><kbd>j</kbd><kbd>k</kbd> navigate</span>
      <span><kbd>Enter</kbd> apply</span>
      <span><kbd>Tab</kbd> section</span>
      <span><kbd>Esc</kbd> close</span>
    </div>
  `,

  getListLength: (sectionIdx) => {
    if (SECTIONS[sectionIdx] === 'colorscheme') return getColorschemeKeys().length;
    return FONTS.length;
  },

  onSectionChange: (sectionIdx) => {
    if (!currentSettings) return 0;
    if (SECTIONS[sectionIdx] === 'colorscheme') {
      return Math.max(0, getColorschemeKeys().indexOf(currentSettings.colorscheme));
    } else if (SECTIONS[sectionIdx] === 'font') {
      return Math.max(0, FONTS.indexOf(currentSettings.font));
    }
    return 0;
  },

  onExtraKey: (key, sectionIdx, selectedIdx) => {
    if (key === 'Enter') {
      applySelection(sectionIdx, selectedIdx);
      return true;
    }
    return false;
  },

  onClose: () => {
    currentSettings = null;
  },

  renderContent: (windowEl, sectionIdx, selectedIdx) => {
    const listEl = windowEl.querySelector('.vilify-settings-list');
    if (!listEl || !currentSettings) return;
    listEl.innerHTML = '';

    const section = SECTIONS[sectionIdx];

    if (section === 'colorscheme') {
      const keys = getColorschemeKeys();
      keys.forEach((item, idx) => {
        const isSelected = idx === selectedIdx;
        const isActive = item === currentSettings!.colorscheme;
        const theme = COLORSCHEMES[item];

        const row = document.createElement('div');
        row.className = 'vilify-settings-item' + (isSelected ? ' selected' : '');

        // Marker
        const marker = document.createElement('span');
        marker.className = 'vilify-settings-marker';
        marker.textContent = isActive ? '*' : '';
        row.appendChild(marker);

        // Swatches
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
          applySelection(sectionIdx, idx);
        });

        listEl.appendChild(row);
      });
    } else if (section === 'font') {
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
        const isActive = item === currentSettings!.font;

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
          applySelection(sectionIdx, idx);
        });

        listEl.appendChild(row);
      });
    }
  },
});

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Open the settings floating window.
 * [I/O]
 */
export const openSettingsWindow = modal.open;

/**
 * Close the settings floating window.
 * [I/O]
 */
export const closeSettingsWindow = modal.close;

/**
 * Check if the settings window is open.
 * [PURE]
 */
export const isSettingsOpen = modal.isOpen;
