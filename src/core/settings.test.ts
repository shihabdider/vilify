// Tests for settings.ts — fontToKey and keyToFont conversion functions
// Following HtDP: derive tests from input types

import { describe, it, expect } from 'vitest';
import { fontToKey, keyToFont, FONTS } from './settings';

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
