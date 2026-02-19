// Tests for settings.ts — fontToKey and keyToFont conversion functions
// Following HtDP: derive tests from input types

import { describe, it, expect } from 'vitest';
import { fontToKey, keyToFont, FONTS, COLORSCHEMES } from './settings';

// =============================================================================
// COLORSCHEMES — all values must be hsl() format
// =============================================================================
describe('COLORSCHEMES hsl format', () => {
  const hslPattern = /^hsl\(\d{1,3}, \d{1,3}%, \d{1,3}%\)$/;

  it('has 17 colorschemes', () => {
    expect(Object.keys(COLORSCHEMES).length).toBe(17);
  });

  it('every color value in every scheme uses hsl() format', () => {
    for (const [name, theme] of Object.entries(COLORSCHEMES)) {
      for (const [key, value] of Object.entries(theme)) {
        expect(value, `${name}.${key} = "${value}" is not hsl()`).toMatch(hslPattern);
      }
    }
  });

  it('solarized bg1 uses native solarized-osaka HSL', () => {
    expect(COLORSCHEMES['solarized'].bg1).toBe('hsl(192, 100%, 11%)');
  });

  it('solarized txt4 uses solarized-osaka blue', () => {
    expect(COLORSCHEMES['solarized'].txt4).toBe('hsl(205, 69%, 49%)');
  });

  it('kanagawa bg1 has correct HSL', () => {
    expect(COLORSCHEMES['kanagawa'].bg1).toBe('hsl(240, 14%, 14%)');
  });

  it('dracula accent has correct HSL', () => {
    expect(COLORSCHEMES['dracula'].accent).toBe('hsl(0, 100%, 67%)');
  });

  it('no hex color values remain', () => {
    for (const [name, theme] of Object.entries(COLORSCHEMES)) {
      for (const [key, value] of Object.entries(theme)) {
        expect(value, `${name}.${key} = "${value}" still has hex`).not.toMatch(/^#/);
      }
    }
  });

  it('no modeReplace is the placeholder gray hsl(0, 0%, 50%)', () => {
    for (const [name, theme] of Object.entries(COLORSCHEMES)) {
      expect(theme.modeReplace, `${name}.modeReplace is still placeholder`).not.toBe('hsl(0, 0%, 50%)');
    }
  });

  it('kanagawa modeReplace is surimiOrange', () => {
    expect(COLORSCHEMES['kanagawa'].modeReplace).toBe('hsl(25, 100%, 70%)');
  });

  it('gruvbox modeReplace is aqua', () => {
    expect(COLORSCHEMES['gruvbox'].modeReplace).toBe('hsl(142, 40%, 63%)');
  });

  it('tokyo-night modeReplace is red1', () => {
    expect(COLORSCHEMES['tokyo-night'].modeReplace).toBe('hsl(0, 65%, 58%)');
  });

  it('catppuccin-mocha modeReplace is maroon', () => {
    expect(COLORSCHEMES['catppuccin-mocha'].modeReplace).toBe('hsl(350, 65%, 77%)');
  });

  it('nord modeReplace is aurora orange', () => {
    expect(COLORSCHEMES['nord'].modeReplace).toBe('hsl(14, 51%, 63%)');
  });

  it('dracula modeReplace is orange', () => {
    expect(COLORSCHEMES['dracula'].modeReplace).toBe('hsl(31, 100%, 71%)');
  });

  it('solarized modeReplace is red', () => {
    expect(COLORSCHEMES['solarized'].modeReplace).toBe('hsl(1, 71%, 52%)');
  });

  it('onedarkpro modeReplace is red', () => {
    expect(COLORSCHEMES['onedarkpro'].modeReplace).toBe('hsl(355, 65%, 65%)');
  });

  it('material-deep-ocean modeReplace is red', () => {
    expect(COLORSCHEMES['material-deep-ocean'].modeReplace).toBe('hsl(357, 81%, 70%)');
  });

  it('oxocarbon modeReplace is pink', () => {
    expect(COLORSCHEMES['oxocarbon'].modeReplace).toBe('hsl(330, 100%, 75%)');
  });

  it('sonokai modeReplace is orange', () => {
    expect(COLORSCHEMES['sonokai'].modeReplace).toBe('hsl(45, 75%, 65%)');
  });

  it('bamboo modeReplace is coral', () => {
    expect(COLORSCHEMES['bamboo'].modeReplace).toBe('hsl(359, 63%, 70%)');
  });

  it('monokai modeReplace is red', () => {
    expect(COLORSCHEMES['monokai'].modeReplace).toBe('hsl(338, 97%, 69%)');
  });

  it('github-dark modeReplace is red', () => {
    expect(COLORSCHEMES['github-dark'].modeReplace).toBe('hsl(3, 92%, 63%)');
  });

  it('nightfox modeReplace is red', () => {
    expect(COLORSCHEMES['nightfox'].modeReplace).toBe('hsl(345, 51%, 55%)');
  });

  it('srcery modeReplace is bright red', () => {
    expect(COLORSCHEMES['srcery'].modeReplace).toBe('hsl(2, 87%, 55%)');
  });

  it('aquarium modeReplace is red', () => {
    expect(COLORSCHEMES['aquarium'].modeReplace).toBe('hsl(0, 53%, 83%)');
  });
});

// =============================================================================
// fontToKey
// =============================================================================
describe('fontToKey', () => {
  it('converts multi-word display name to hyphenated key', () => {
    expect(fontToKey('JetBrains Mono')).toBe('JetBrains-Mono');
  });

  it('converts two-word display name', () => {
    expect(fontToKey('SF Mono')).toBe('SF-Mono');
  });

  it('converts three-word display name', () => {
    expect(fontToKey('Source Code Pro')).toBe('Source-Code-Pro');
  });

  it('returns single-word name unchanged', () => {
    expect(fontToKey('Iosevka')).toBe('Iosevka');
  });

  it('handles empty string', () => {
    expect(fontToKey('')).toBe('');
  });

  it('handles multiple consecutive spaces by replacing each', () => {
    expect(fontToKey('IBM Plex Mono')).toBe('IBM-Plex-Mono');
  });

  it('converts Cascadia Code', () => {
    expect(fontToKey('Cascadia Code')).toBe('Cascadia-Code');
  });

  it('converts Fira Code', () => {
    expect(fontToKey('Fira Code')).toBe('Fira-Code');
  });
});

// =============================================================================
// keyToFont
// =============================================================================
describe('keyToFont', () => {
  it('finds JetBrains Mono from hyphenated key', () => {
    expect(keyToFont('JetBrains-Mono')).toBe('JetBrains Mono');
  });

  it('finds SF Mono from hyphenated key', () => {
    expect(keyToFont('SF-Mono')).toBe('SF Mono');
  });

  it('finds Source Code Pro from hyphenated key', () => {
    expect(keyToFont('Source-Code-Pro')).toBe('Source Code Pro');
  });

  it('finds single-word font Iosevka', () => {
    expect(keyToFont('Iosevka')).toBe('Iosevka');
  });

  it('matches case-insensitively (all lowercase)', () => {
    expect(keyToFont('jetbrains-mono')).toBe('JetBrains Mono');
  });

  it('matches case-insensitively (all uppercase)', () => {
    expect(keyToFont('JETBRAINS-MONO')).toBe('JetBrains Mono');
  });

  it('matches case-insensitively (mixed case)', () => {
    expect(keyToFont('sf-mono')).toBe('SF Mono');
  });

  it('matches single-word font case-insensitively', () => {
    expect(keyToFont('iosevka')).toBe('Iosevka');
  });

  it('returns null for unknown key', () => {
    expect(keyToFont('Comic-Sans')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(keyToFont('')).toBeNull();
  });

  it('round-trips: keyToFont(fontToKey(name)) returns name for all FONTS', () => {
    for (const font of FONTS) {
      expect(keyToFont(fontToKey(font))).toBe(font);
    }
  });
});
