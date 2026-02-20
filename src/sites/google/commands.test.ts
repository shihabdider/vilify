
// Tests for commands in getGoogleCommands
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing
vi.mock('../../core/view', () => ({
  showMessage: vi.fn(),
}));

vi.mock('../../core/settings', () => ({
  COLORSCHEMES: {
    'kanagawa': { bg1: 'hsl(240, 14%, 14%)' },
    'gruvbox': { bg1: 'hsl(0, 0%, 16%)' },
    'tokyo-night': { bg1: 'hsl(235, 21%, 13%)' },
  },
  FONTS: ['SF Mono', 'JetBrains Mono', 'Fira Code'],
  fontToKey: vi.fn((name: string) => name.replace(/ /g, '-')),
  loadSettings: vi.fn(() => ({ colorscheme: 'kanagawa', font: 'SF Mono' })),
  saveSettings: vi.fn(),
  getTheme: vi.fn((key: string) => ({ bg1: 'hsl(0, 0%, 0%)' })),
}));

vi.mock('../../core/layout', () => ({
  applyTheme: vi.fn(),
  applyFont: vi.fn(),
}));

import { getGoogleCommands } from './commands';
import { showMessage } from '../../core/view';
import { COLORSCHEMES, FONTS, fontToKey, loadSettings, saveSettings, getTheme } from '../../core/settings';
import { applyTheme, applyFont } from '../../core/layout';

function makeApp() {
  return {
    openPalette: vi.fn(),
    exitFocusMode: vi.fn(),
    openSearch: vi.fn(),
    openSettings: vi.fn(),
    openLocalFilter: vi.fn(),
    navigate: vi.fn(),
    select: vi.fn(),
  };
}

// =============================================================================
// Colorscheme commands in getGoogleCommands
// =============================================================================
describe('getGoogleCommands - colorscheme commands', () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    app = makeApp();
    vi.clearAllMocks();
  });

  it('includes a Colorscheme group header', () => {
    const commands = getGoogleCommands(app);
    const group = commands.find(c => c.group === 'Colorscheme');
    expect(group).toBeDefined();
  });

  it('has one command per colorscheme key', () => {
    const commands = getGoogleCommands(app);
    const schemeKeys = Object.keys(COLORSCHEMES);
    for (const name of schemeKeys) {
      const cmd = commands.find(c => c.keys === `:colo ${name}`);
      expect(cmd).toBeDefined();
    }
  });

  it('each colorscheme command has correct label format', () => {
    const commands = getGoogleCommands(app);
    const schemeKeys = Object.keys(COLORSCHEMES);
    for (const name of schemeKeys) {
      const cmd = commands.find(c => c.keys === `:colo ${name}`);
      expect(cmd.label).toBe(name);
    }
  });

  it('each colorscheme command has paint palette icon', () => {
    const commands = getGoogleCommands(app);
    const schemeKeys = Object.keys(COLORSCHEMES);
    for (const name of schemeKeys) {
      const cmd = commands.find(c => c.keys === `:colo ${name}`);
      expect(cmd.icon).toBe('\uD83C\uDFA8');
    }
  });

  it('each colorscheme command has type "command"', () => {
    const commands = getGoogleCommands(app);
    const schemeKeys = Object.keys(COLORSCHEMES);
    for (const name of schemeKeys) {
      const cmd = commands.find(c => c.keys === `:colo ${name}`);
      expect(cmd.type).toBe('command');
    }
  });

  it('colorscheme command action saves settings and applies theme', () => {
    const commands = getGoogleCommands(app);
    const cmd = commands.find(c => c.keys === ':colo kanagawa');
    expect(cmd).toBeDefined();

    cmd.action();

    expect(loadSettings).toHaveBeenCalled();
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ colorscheme: 'kanagawa' })
    );
    expect(getTheme).toHaveBeenCalledWith('kanagawa');
    expect(applyTheme).toHaveBeenCalled();
    expect(showMessage).toHaveBeenCalledWith('Colorscheme: kanagawa');
  });

  it('colorscheme command action works for a different scheme', () => {
    const commands = getGoogleCommands(app);
    const cmd = commands.find(c => c.keys === ':colo gruvbox');
    expect(cmd).toBeDefined();

    cmd.action();

    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ colorscheme: 'gruvbox' })
    );
    expect(getTheme).toHaveBeenCalledWith('gruvbox');
    expect(showMessage).toHaveBeenCalledWith('Colorscheme: gruvbox');
  });

  it('Colorscheme group appears after :settings command', () => {
    const commands = getGoogleCommands(app);
    const settingsIdx = commands.findIndex(c => c.keys === ':settings');
    const coloGroupIdx = commands.findIndex(c => c.group === 'Colorscheme');
    expect(settingsIdx).toBeGreaterThanOrEqual(0);
    expect(coloGroupIdx).toBeGreaterThanOrEqual(0);
    expect(coloGroupIdx).toBeGreaterThan(settingsIdx);
  });
});

// =============================================================================
// Font commands in getGoogleCommands
// =============================================================================
describe('getGoogleCommands - font commands', () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    app = makeApp();
    vi.clearAllMocks();
  });

  it('includes a Font group header', () => {
    const commands = getGoogleCommands(app);
    const group = commands.find(c => c.group === 'Font');
    expect(group).toBeDefined();
  });

  it('has one command per font in FONTS', () => {
    const commands = getGoogleCommands(app);
    for (const font of FONTS) {
      const key = fontToKey(font);
      const cmd = commands.find(c => c.keys === `:set guifont=${key}`);
      expect(cmd).toBeDefined();
    }
  });

  it('each font command has the font display name as label', () => {
    const commands = getGoogleCommands(app);
    for (const font of FONTS) {
      const key = fontToKey(font);
      const cmd = commands.find(c => c.keys === `:set guifont=${key}`);
      expect(cmd.label).toBe(font);
    }
  });

  it('each font command is hidden', () => {
    const commands = getGoogleCommands(app);
    for (const font of FONTS) {
      const key = fontToKey(font);
      const cmd = commands.find(c => c.keys === `:set guifont=${key}`);
      expect(cmd.hidden).toBe(true);
    }
  });

  it('each font command has type "command"', () => {
    const commands = getGoogleCommands(app);
    for (const font of FONTS) {
      const key = fontToKey(font);
      const cmd = commands.find(c => c.keys === `:set guifont=${key}`);
      expect(cmd.type).toBe('command');
    }
  });

  it('font command action saves settings and calls applyFont', () => {
    const commands = getGoogleCommands(app);
    const cmd = commands.find(c => c.keys === ':set guifont=SF-Mono');
    expect(cmd).toBeDefined();

    cmd.action();

    expect(loadSettings).toHaveBeenCalled();
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ font: 'SF Mono' })
    );
    expect(applyFont).toHaveBeenCalledWith('SF Mono');
    expect(showMessage).toHaveBeenCalledWith('Font: SF Mono');
  });

  it('font command action works for a different font', () => {
    const commands = getGoogleCommands(app);
    const cmd = commands.find(c => c.keys === ':set guifont=JetBrains-Mono');
    expect(cmd).toBeDefined();

    cmd.action();

    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ font: 'JetBrains Mono' })
    );
    expect(applyFont).toHaveBeenCalledWith('JetBrains Mono');
    expect(showMessage).toHaveBeenCalledWith('Font: JetBrains Mono');
  });

  it('Font group appears after Colorscheme group', () => {
    const commands = getGoogleCommands(app);
    const coloGroupIdx = commands.findIndex(c => c.group === 'Colorscheme');
    const fontGroupIdx = commands.findIndex(c => c.group === 'Font');
    expect(coloGroupIdx).toBeGreaterThanOrEqual(0);
    expect(fontGroupIdx).toBeGreaterThanOrEqual(0);
    expect(fontGroupIdx).toBeGreaterThan(coloGroupIdx);
  });
});
