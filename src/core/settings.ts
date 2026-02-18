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
    bg1: '#1F1F28', bg2: '#2A2A37', bg3: '#363646',
    txt1: '#DCD7BA', txt2: '#C8C093', txt3: '#727169', txt4: '#7E9CD8',
    accent: '#C34043', accentHover: '#E82424',
    modeNormal: '#7E9CD8', modeSearch: '#98BB6C', modeCommand: '#C0A36E', modeFilter: '#957FB8',
  },
  'gruvbox': {
    bg1: '#282828', bg2: '#3c3836', bg3: '#504945',
    txt1: '#ebdbb2', txt2: '#d5c4a1', txt3: '#928374', txt4: '#83a598',
    accent: '#cc241d', accentHover: '#fb4934',
    modeNormal: '#a89984', modeSearch: '#83a598', modeCommand: '#b8bb26', modeFilter: '#fe8019',
  },
  'tokyo-night': {
    bg1: '#1a1b26', bg2: '#24283b', bg3: '#414868',
    txt1: '#c0caf5', txt2: '#a9b1d6', txt3: '#565f89', txt4: '#7aa2f7',
    accent: '#f7768e', accentHover: '#ff99a1',
    modeNormal: '#7aa2f7', modeSearch: '#9ece6a', modeCommand: '#e0af68', modeFilter: '#bb9af7',
  },
  'catppuccin-mocha': {
    bg1: '#1e1e2e', bg2: '#313244', bg3: '#45475a',
    txt1: '#cdd6f4', txt2: '#bac2de', txt3: '#6c7086', txt4: '#89b4fa',
    accent: '#f38ba8', accentHover: '#f5a0ba',
    modeNormal: '#89b4fa', modeSearch: '#a6e3a1', modeCommand: '#fab387', modeFilter: '#cba6f7',
  },
  'nord': {
    bg1: '#2e3440', bg2: '#3b4252', bg3: '#434c5e',
    txt1: '#eceff4', txt2: '#d8dee9', txt3: '#4c566a', txt4: '#88c0d0',
    accent: '#bf616a', accentHover: '#d08770',
    modeNormal: '#81A1C1', modeSearch: '#D8DEE9', modeCommand: '#B48EAD', modeFilter: '#8FBCBB',
  },
  'dracula': {
    bg1: '#282a36', bg2: '#44475a', bg3: '#6272a4',
    txt1: '#f8f8f2', txt2: '#e2e2dc', txt3: '#6272a4', txt4: '#8be9fd',
    accent: '#ff5555', accentHover: '#ff6e6e',
    modeNormal: '#BD93F9', modeSearch: '#50FA7B', modeCommand: '#8BE9FD', modeFilter: '#FF79C6',
  },
  'solarized': {
    bg1: '#002b36', bg2: '#073642', bg3: '#586e75',
    txt1: '#fdf6e3', txt2: '#eee8d5', txt3: '#657b83', txt4: '#268bd2',
    accent: '#dc322f', accentHover: '#cb4b16',
    modeNormal: '#268bd2', modeSearch: '#859900', modeCommand: '#cb4b16', modeFilter: '#d33682',
  },
  'onedarkpro': {
    bg1: '#282c34', bg2: '#2d313b', bg3: '#414858',
    txt1: '#abb2bf', txt2: '#9da5b4', txt3: '#7f848e', txt4: '#61afef',
    accent: '#e06c75', accentHover: '#e88991',
    modeNormal: '#98c379', modeSearch: '#61afef', modeCommand: '#c678dd', modeFilter: '#e5c07b',
  },
  'material-deep-ocean': {
    bg1: '#0F111A', bg2: '#1A1C25', bg3: '#232637',
    txt1: '#A6ACCD', txt2: '#717CB4', txt3: '#464B5D', txt4: '#82AAFF',
    accent: '#F07178', accentHover: '#f38d93',
    modeNormal: '#84FFFF', modeSearch: '#C3E88D', modeCommand: '#FFCB6B', modeFilter: '#C792EA',
  },
  'oxocarbon': {
    bg1: '#161616', bg2: '#292929', bg3: '#3f3f3f',
    txt1: '#f2f2f2', txt2: '#d5d5d5', txt3: '#5b5b5b', txt4: '#78a9ff',
    accent: '#ee5396', accentHover: '#f175ab',
    modeNormal: '#78a9ff', modeSearch: '#ff7eb6', modeCommand: '#42be65', modeFilter: '#be95ff',
  },
  'sonokai': {
    bg1: '#2c2e34', bg2: '#33353f', bg3: '#3b3e48',
    txt1: '#e2e2e3', txt2: '#b9b9b9', txt3: '#7f8490', txt4: '#76cce0',
    accent: '#fc5d7c', accentHover: '#fc7d96',
    modeNormal: '#85d3f2', modeSearch: '#a7df78', modeCommand: '#e7c664', modeFilter: '#ff6077',
  },
  'bamboo': {
    bg1: '#252623', bg2: '#2f312c', bg3: '#3a3d37',
    txt1: '#f1e9d2', txt2: '#838781', txt3: '#5b5e5a', txt4: '#57a5e5',
    accent: '#e75a7c', accentHover: '#eb7b96',
    modeNormal: '#8fb573', modeSearch: '#57a5e5', modeCommand: '#dbb651', modeFilter: '#aaaaff',
  },
  'monokai': {
    bg1: '#222426', bg2: '#26292C', bg3: '#2E323C',
    txt1: '#f8f8f0', txt2: '#e3e3e1', txt3: '#8F908A', txt4: '#66d9ef',
    accent: '#f92672', accentHover: '#fa518e',
    modeNormal: '#e6db74', modeSearch: '#a6e22e', modeCommand: '#e6db74', modeFilter: '#ae81ff',
  },
  'github-dark': {
    bg1: '#0d1117', bg2: '#161b22', bg3: '#30363d',
    txt1: '#e6edf3', txt2: '#c9d1d9', txt3: '#484f58', txt4: '#58a6ff',
    accent: '#f85149', accentHover: '#f9736d',
    modeNormal: '#58a6ff', modeSearch: '#3fb950', modeCommand: '#d2a8ff', modeFilter: '#d29922',
  },
  'nightfox': {
    bg1: '#192330', bg2: '#212e3f', bg3: '#29394f',
    txt1: '#cdcecf', txt2: '#aeafb0', txt3: '#738091', txt4: '#719cd6',
    accent: '#c94f6d', accentHover: '#d3728a',
    modeNormal: '#719cd6', modeSearch: '#81b29a', modeCommand: '#dbc074', modeFilter: '#9d79d6',
  },
  'srcery': {
    bg1: '#1C1B19', bg2: '#2D2B28', bg3: '#918175',
    txt1: '#FCE8C3', txt2: '#BAA67F', txt3: '#918175', txt4: '#68A8E4',
    accent: '#EF2F27', accentHover: '#F75341',
    modeNormal: '#444444', modeSearch: '#FCE8C3', modeCommand: '#FBB829', modeFilter: '#0AAEB3',
  },
  'aquarium': {
    bg1: '#20202A', bg2: '#2C2E3E', bg3: '#313449',
    txt1: '#C6D0E9', txt2: '#A7B7D6', txt3: '#44495E', txt4: '#CDDBF9',
    accent: '#EBB9B9', accentHover: '#efc7c7',
    modeNormal: '#EAC1C1', modeSearch: '#B1DBA4', modeCommand: '#F6BBE7', modeFilter: '#313449',
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
