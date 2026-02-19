// Settings — Pure data + persistence for Vilify settings
// Colorschemes, fonts, localStorage read/write

import type { SiteTheme } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface VilifySettings {
  colorscheme: string;
  font: string;
}

// =============================================================================
// COLORSCHEMES
// =============================================================================

export const COLORSCHEMES: Record<string, SiteTheme> = {
  'kanagawa': {
    bg1: 'hsl(240, 14%, 14%)', bg2: 'hsl(240, 15%, 19%)', bg3: 'hsl(240, 14%, 24%)',
    txt1: 'hsl(50, 36%, 77%)', txt2: 'hsl(49, 30%, 68%)', txt3: 'hsl(53, 4%, 43%)', txt4: 'hsl(220, 53%, 67%)',
    accent: 'hsl(358, 51%, 51%)', accentHover: 'hsl(0, 82%, 53%)',
    modeNormal: 'hsl(220, 53%, 67%)', modeSearch: 'hsl(93, 34%, 58%)', modeCommand: 'hsl(39, 40%, 59%)', modeFilter: 'hsl(264, 29%, 61%)',
    modeReplace: 'hsl(25, 100%, 70%)',
  },
  'gruvbox': {
    bg1: 'hsl(0, 0%, 16%)', bg2: 'hsl(20, 5%, 22%)', bg3: 'hsl(22, 6%, 29%)',
    txt1: 'hsl(46, 56%, 81%)', txt2: 'hsl(40, 38%, 73%)', txt3: 'hsl(24, 12%, 51%)', txt4: 'hsl(166, 17%, 58%)',
    accent: 'hsl(2, 75%, 46%)', accentHover: 'hsl(6, 96%, 59%)',
    modeNormal: 'hsl(36, 16%, 59%)', modeSearch: 'hsl(166, 17%, 58%)', modeCommand: 'hsl(62, 66%, 44%)', modeFilter: 'hsl(28, 99%, 55%)',
    modeReplace: 'hsl(142, 40%, 63%)',
  },
  'tokyo-night': {
    bg1: 'hsl(235, 21%, 13%)', bg2: 'hsl(230, 24%, 18%)', bg3: 'hsl(226, 24%, 33%)',
    txt1: 'hsl(230, 78%, 85%)', txt2: 'hsl(228, 39%, 75%)', txt3: 'hsl(228, 24%, 44%)', txt4: 'hsl(220, 89%, 72%)',
    accent: 'hsl(351, 88%, 72%)', accentHover: 'hsl(355, 100%, 80%)',
    modeNormal: 'hsl(220, 89%, 72%)', modeSearch: 'hsl(95, 53%, 61%)', modeCommand: 'hsl(36, 67%, 64%)', modeFilter: 'hsl(267, 84%, 79%)',
    modeReplace: 'hsl(0, 65%, 58%)',
  },
  'catppuccin-mocha': {
    bg1: 'hsl(240, 21%, 15%)', bg2: 'hsl(234, 16%, 23%)', bg3: 'hsl(237, 13%, 31%)',
    txt1: 'hsl(226, 70%, 88%)', txt2: 'hsl(227, 35%, 80%)', txt3: 'hsl(233, 12%, 47%)', txt4: 'hsl(217, 92%, 76%)',
    accent: 'hsl(343, 81%, 75%)', accentHover: 'hsl(339, 79%, 79%)',
    modeNormal: 'hsl(217, 92%, 76%)', modeSearch: 'hsl(115, 54%, 76%)', modeCommand: 'hsl(23, 92%, 75%)', modeFilter: 'hsl(267, 84%, 81%)',
    modeReplace: 'hsl(350, 65%, 77%)',
  },
  'nord': {
    bg1: 'hsl(220, 16%, 22%)', bg2: 'hsl(222, 16%, 28%)', bg3: 'hsl(220, 17%, 32%)',
    txt1: 'hsl(218, 27%, 94%)', txt2: 'hsl(219, 28%, 88%)', txt3: 'hsl(220, 17%, 36%)', txt4: 'hsl(193, 43%, 67%)',
    accent: 'hsl(354, 42%, 56%)', accentHover: 'hsl(14, 51%, 63%)',
    modeNormal: 'hsl(213, 32%, 63%)', modeSearch: 'hsl(219, 28%, 88%)', modeCommand: 'hsl(311, 20%, 63%)', modeFilter: 'hsl(179, 25%, 65%)',
    modeReplace: 'hsl(14, 51%, 63%)',
  },
  'dracula': {
    bg1: 'hsl(231, 15%, 18%)', bg2: 'hsl(232, 14%, 31%)', bg3: 'hsl(225, 27%, 51%)',
    txt1: 'hsl(60, 30%, 96%)', txt2: 'hsl(60, 6%, 87%)', txt3: 'hsl(225, 27%, 51%)', txt4: 'hsl(191, 97%, 77%)',
    accent: 'hsl(0, 100%, 67%)', accentHover: 'hsl(0, 100%, 72%)',
    modeNormal: 'hsl(265, 89%, 78%)', modeSearch: 'hsl(135, 94%, 65%)', modeCommand: 'hsl(191, 97%, 77%)', modeFilter: 'hsl(326, 100%, 74%)',
    modeReplace: 'hsl(31, 100%, 71%)',
  },
  'solarized': {
    bg1: 'hsl(192, 100%, 11%)', bg2: 'hsl(192, 81%, 14%)', bg3: 'hsl(194, 14%, 40%)',
    txt1: 'hsl(44, 87%, 94%)', txt2: 'hsl(46, 42%, 88%)', txt3: 'hsl(196, 13%, 45%)', txt4: 'hsl(205, 69%, 49%)',
    accent: 'hsl(1, 71%, 52%)', accentHover: 'hsl(18, 80%, 44%)',
    modeNormal: 'hsl(205, 69%, 49%)', modeSearch: 'hsl(68, 100%, 30%)', modeCommand: 'hsl(18, 80%, 44%)', modeFilter: 'hsl(331, 64%, 52%)',
    modeReplace: 'hsl(1, 71%, 52%)',
  },
  'onedarkpro': {
    bg1: 'hsl(220, 13%, 18%)', bg2: 'hsl(220, 14%, 20%)', bg3: 'hsl(221, 15%, 30%)',
    txt1: 'hsl(220, 13%, 71%)', txt2: 'hsl(219, 14%, 66%)', txt3: 'hsl(220, 6%, 53%)', txt4: 'hsl(207, 82%, 66%)',
    accent: 'hsl(355, 65%, 65%)', accentHover: 'hsl(355, 65%, 72%)',
    modeNormal: 'hsl(95, 38%, 62%)', modeSearch: 'hsl(207, 82%, 66%)', modeCommand: 'hsl(286, 60%, 67%)', modeFilter: 'hsl(39, 67%, 69%)',
    modeReplace: 'hsl(355, 65%, 65%)',
  },
  'material-deep-ocean': {
    bg1: 'hsl(229, 28%, 8%)', bg2: 'hsl(229, 19%, 12%)', bg3: 'hsl(231, 22%, 17%)',
    txt1: 'hsl(231, 28%, 73%)', txt2: 'hsl(230, 30%, 57%)', txt3: 'hsl(229, 13%, 32%)', txt4: 'hsl(220, 100%, 75%)',
    accent: 'hsl(357, 81%, 70%)', accentHover: 'hsl(357, 81%, 75%)',
    modeNormal: 'hsl(180, 100%, 76%)', modeSearch: 'hsl(87, 61%, 73%)', modeCommand: 'hsl(39, 100%, 71%)', modeFilter: 'hsl(280, 68%, 75%)',
    modeReplace: 'hsl(357, 81%, 70%)',
  },
  'oxocarbon': {
    bg1: 'hsl(0, 0%, 9%)', bg2: 'hsl(0, 0%, 16%)', bg3: 'hsl(0, 0%, 25%)',
    txt1: 'hsl(0, 0%, 95%)', txt2: 'hsl(0, 0%, 84%)', txt3: 'hsl(0, 0%, 36%)', txt4: 'hsl(218, 100%, 74%)',
    accent: 'hsl(337, 82%, 63%)', accentHover: 'hsl(337, 82%, 70%)',
    modeNormal: 'hsl(218, 100%, 74%)', modeSearch: 'hsl(337, 100%, 75%)', modeCommand: 'hsl(138, 52%, 50%)', modeFilter: 'hsl(264, 100%, 79%)',
    modeReplace: 'hsl(330, 100%, 75%)',
  },
  'sonokai': {
    bg1: 'hsl(225, 9%, 19%)', bg2: 'hsl(230, 11%, 22%)', bg3: 'hsl(226, 10%, 26%)',
    txt1: 'hsl(240, 2%, 89%)', txt2: 'hsl(0, 0%, 73%)', txt3: 'hsl(224, 7%, 53%)', txt4: 'hsl(189, 60%, 67%)',
    accent: 'hsl(349, 97%, 68%)', accentHover: 'hsl(349, 95%, 74%)',
    modeNormal: 'hsl(198, 80%, 73%)', modeSearch: 'hsl(93, 58%, 67%)', modeCommand: 'hsl(45, 75%, 65%)', modeFilter: 'hsl(351, 100%, 69%)',
    modeReplace: 'hsl(45, 75%, 65%)',
  },
  'bamboo': {
    bg1: 'hsl(80, 4%, 14%)', bg2: 'hsl(84, 6%, 18%)', bg3: 'hsl(90, 5%, 23%)',
    txt1: 'hsl(43, 53%, 88%)', txt2: 'hsl(100, 3%, 52%)', txt3: 'hsl(105, 2%, 36%)', txt4: 'hsl(207, 72%, 62%)',
    accent: 'hsl(348, 74%, 63%)', accentHover: 'hsl(348, 72%, 70%)',
    modeNormal: 'hsl(97, 31%, 58%)', modeSearch: 'hsl(207, 72%, 62%)', modeCommand: 'hsl(44, 67%, 59%)', modeFilter: 'hsl(240, 100%, 83%)',
    modeReplace: 'hsl(359, 63%, 70%)',
  },
  'monokai': {
    bg1: 'hsl(210, 8%, 14%)', bg2: 'hsl(210, 9%, 16%)', bg3: 'hsl(223, 13%, 21%)',
    txt1: 'hsl(60, 36%, 96%)', txt2: 'hsl(60, 4%, 89%)', txt3: 'hsl(70, 3%, 55%)', txt4: 'hsl(190, 81%, 67%)',
    accent: 'hsl(338, 95%, 56%)', accentHover: 'hsl(340, 94%, 65%)',
    modeNormal: 'hsl(54, 70%, 68%)', modeSearch: 'hsl(80, 76%, 53%)', modeCommand: 'hsl(54, 70%, 68%)', modeFilter: 'hsl(261, 100%, 75%)',
    modeReplace: 'hsl(338, 97%, 69%)',
  },
  'github-dark': {
    bg1: 'hsl(215, 28%, 7%)', bg2: 'hsl(215, 21%, 11%)', bg3: 'hsl(215, 13%, 21%)',
    txt1: 'hsl(210, 33%, 93%)', txt2: 'hsl(210, 13%, 82%)', txt3: 'hsl(214, 9%, 31%)', txt4: 'hsl(212, 100%, 67%)',
    accent: 'hsl(3, 92%, 63%)', accentHover: 'hsl(3, 92%, 70%)',
    modeNormal: 'hsl(212, 100%, 67%)', modeSearch: 'hsl(129, 50%, 49%)', modeCommand: 'hsl(268, 100%, 83%)', modeFilter: 'hsl(41, 73%, 48%)',
    modeReplace: 'hsl(3, 92%, 63%)',
  },
  'nightfox': {
    bg1: 'hsl(213, 29%, 14%)', bg2: 'hsl(214, 31%, 19%)', bg3: 'hsl(214, 32%, 24%)',
    txt1: 'hsl(150, 1%, 81%)', txt2: 'hsl(210, 1%, 69%)', txt3: 'hsl(213, 12%, 51%)', txt4: 'hsl(217, 55%, 64%)',
    accent: 'hsl(345, 51%, 55%)', accentHover: 'hsl(346, 51%, 64%)',
    modeNormal: 'hsl(217, 55%, 64%)', modeSearch: 'hsl(157, 24%, 60%)', modeCommand: 'hsl(44, 58%, 66%)', modeFilter: 'hsl(264, 50%, 65%)',
    modeReplace: 'hsl(345, 51%, 55%)',
  },
  'srcery': {
    bg1: 'hsl(40, 8%, 10%)', bg2: 'hsl(36, 5%, 17%)', bg3: 'hsl(25, 12%, 51%)',
    txt1: 'hsl(38, 91%, 88%)', txt2: 'hsl(38, 30%, 61%)', txt3: 'hsl(25, 12%, 51%)', txt4: 'hsl(209, 68%, 65%)',
    accent: 'hsl(2, 87%, 55%)', accentHover: 'hsl(6, 92%, 61%)',
    modeNormal: 'hsl(0, 0%, 27%)', modeSearch: 'hsl(38, 91%, 88%)', modeCommand: 'hsl(41, 96%, 57%)', modeFilter: 'hsl(182, 89%, 37%)',
    modeReplace: 'hsl(2, 87%, 55%)',
  },
  'aquarium': {
    bg1: 'hsl(240, 13%, 15%)', bg2: 'hsl(233, 17%, 21%)', bg3: 'hsl(234, 19%, 24%)',
    txt1: 'hsl(225, 42%, 85%)', txt2: 'hsl(219, 35%, 75%)', txt3: 'hsl(232, 15%, 32%)', txt4: 'hsl(224, 78%, 89%)',
    accent: 'hsl(0, 53%, 83%)', accentHover: 'hsl(0, 53%, 86%)',
    modeNormal: 'hsl(0, 44%, 84%)', modeSearch: 'hsl(107, 38%, 75%)', modeCommand: 'hsl(316, 73%, 85%)', modeFilter: 'hsl(234, 19%, 24%)',
    modeReplace: 'hsl(0, 53%, 83%)',
  },
};

// =============================================================================
// FONTS
// =============================================================================

export const FONTS: string[] = [
  // Monospace
  'SF Mono',
  'JetBrains Mono',
  'Fira Code',
  'IBM Plex Mono',
  'Source Code Pro',
  'Cascadia Code',
  'Iosevka',
  // Sans-serif
  'Inter',
  'IBM Plex Sans',
  'Source Sans 3',
  'Nunito',
  'Work Sans',
  // Serif
  'Lora',
  'Source Serif 4',
  'Merriweather',
  'Playfair Display',
  'IBM Plex Serif',
];

export type FontCategory = 'monospace' | 'sans-serif' | 'serif';

const FONT_CATEGORIES: Record<string, FontCategory> = {
  'SF Mono': 'monospace',
  'JetBrains Mono': 'monospace',
  'Fira Code': 'monospace',
  'IBM Plex Mono': 'monospace',
  'Source Code Pro': 'monospace',
  'Cascadia Code': 'monospace',
  'Iosevka': 'monospace',
  'Inter': 'sans-serif',
  'IBM Plex Sans': 'sans-serif',
  'Source Sans 3': 'sans-serif',
  'Nunito': 'sans-serif',
  'Work Sans': 'sans-serif',
  'Lora': 'serif',
  'Source Serif 4': 'serif',
  'Merriweather': 'serif',
  'Playfair Display': 'serif',
  'IBM Plex Serif': 'serif',
};

export function getFontCategory(font: string): FontCategory {
  return FONT_CATEGORIES[font] || 'monospace';
}

// =============================================================================
// DEFAULTS
// =============================================================================

const STORAGE_KEY = 'vilify-settings';

const DEFAULT_SETTINGS: VilifySettings = {
  colorscheme: 'kanagawa',
  font: 'SF Mono',
};

// =============================================================================
// PERSISTENCE
// =============================================================================

// Migration map: old title-case keys -> new lowercase-hyphenated keys
const MIGRATION_MAP: Record<string, string> = {
  'Kanagawa': 'kanagawa',
  'Gruvbox': 'gruvbox',
  'Tokyo Night': 'tokyo-night',
  'Catppuccin Mocha': 'catppuccin-mocha',
  'Nord': 'nord',
  'Dracula': 'dracula',
  'Solarized Dark': 'solarized',
  'One Dark': 'onedarkpro',
  'one-dark': 'onedarkpro',
};

/**
 * Load settings from localStorage with validation + fallback.
 * Migrates old title-case colorscheme keys to lowercase-hyphenated.
 * [I/O]
 */
export function loadSettings(): VilifySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(raw);

    // Migrate old colorscheme key if needed
    let colorscheme = parsed.colorscheme;
    if (colorscheme && MIGRATION_MAP[colorscheme]) {
      colorscheme = MIGRATION_MAP[colorscheme];
    }

    const settings: VilifySettings = {
      colorscheme: (colorscheme && COLORSCHEMES[colorscheme])
        ? colorscheme
        : DEFAULT_SETTINGS.colorscheme,
      font: (parsed.font && FONTS.includes(parsed.font))
        ? parsed.font
        : DEFAULT_SETTINGS.font,
    };

    // Save migrated settings back if a migration occurred
    if (parsed.colorscheme && MIGRATION_MAP[parsed.colorscheme]) {
      saveSettings(settings);
    }

    return settings;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save settings to localStorage.
 * [I/O]
 */
export function saveSettings(settings: VilifySettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get SiteTheme for a colorscheme key.
 * [PURE]
 */
export function getTheme(key: string): SiteTheme {
  return COLORSCHEMES[key] || COLORSCHEMES['kanagawa'];
}

/**
 * Get CSS font-family string for a font name.
 * [PURE]
 */
export function getFontFamily(font: string): string {
  const category = getFontCategory(font);
  if (category === 'sans-serif') return `'${font}', 'Helvetica Neue', 'Arial', sans-serif`;
  if (category === 'serif') return `'${font}', 'Georgia', 'Times New Roman', serif`;
  return `'${font}', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace`;
}

/**
 * Convert a font display name to a command key by replacing spaces with hyphens.
 * E.g. 'JetBrains Mono' -> 'JetBrains-Mono', 'Iosevka' -> 'Iosevka'
 * [PURE]
 */
export function fontToKey(displayName: string): string {
  return displayName.replace(/ /g, '-');
}

/**
 * Find the matching FONTS entry for a command key (case-insensitive, hyphens vs spaces).
 * E.g. 'JetBrains-Mono' -> 'JetBrains Mono', 'iosevka' -> 'Iosevka'
 * Returns null if no match found.
 * [PURE]
 */
export function keyToFont(key: string): string | null {
  const normalized = key.toLowerCase().replace(/-/g, ' ');
  return FONTS.find((font) => font.toLowerCase() === normalized) ?? null;
}
