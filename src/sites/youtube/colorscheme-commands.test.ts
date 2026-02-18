// Tests for colorscheme commands in getYouTubeCommands
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing
vi.mock('./player', () => ({
  toggleMute: vi.fn(),
  toggleCaptions: vi.fn(),
  togglePlayPause: vi.fn(),
  toggleFullscreen: vi.fn(),
  toggleTheaterMode: vi.fn(),
  seekRelative: vi.fn(),
  seekToChapter: vi.fn(),
  seekToPercent: vi.fn(),
  setPlaybackRate: vi.fn(),
  getVideo: vi.fn(),
  applyDefaultVideoSettings: vi.fn(),
  playerControls: {},
}));

vi.mock('./scraper', () => ({
  getYouTubePageType: vi.fn(() => 'home'),
}));

vi.mock('./data/index', () => ({
  getDataProvider: vi.fn(() => ({
    getVideoContext: vi.fn(() => null),
  })),
}));

vi.mock('../../core/view', () => ({
  showMessage: vi.fn(),
}));

vi.mock('../../core/settings', () => ({
  COLORSCHEMES: {
    'kanagawa': { bg1: '#1F1F28' },
    'gruvbox': { bg1: '#282828' },
    'tokyo-night': { bg1: '#1a1b26' },
  },
  FONTS: ['SF Mono', 'JetBrains Mono', 'Fira Code'],
  fontToKey: vi.fn((name: string) => name.replace(/ /g, '-')),
  loadSettings: vi.fn(() => ({ colorscheme: 'kanagawa', font: 'SF Mono' })),
  saveSettings: vi.fn(),
  getTheme: vi.fn((key: string) => ({ bg1: '#000' })),
}));

vi.mock('../../core/layout', () => ({
  applyTheme: vi.fn(),
  applyFont: vi.fn(),
}));

import { getYouTubeCommands } from './commands';
import { getYouTubePageType } from './scraper';
import { showMessage } from '../../core/view';
import { COLORSCHEMES, FONTS, fontToKey, loadSettings, saveSettings, getTheme } from '../../core/settings';
import { applyTheme, applyFont } from '../../core/layout';

function makeApp() {
  return {
    dismissVideo: vi.fn(),
    openPalette: vi.fn(),
    exitFocusMode: vi.fn(),
    executeSort: vi.fn(),
    openSearch: vi.fn(),
    openRecommended: vi.fn(),
    openSettings: vi.fn(),
    openLocalFilter: vi.fn(),
    goToTop: vi.fn(),
    goToBottom: vi.fn(),
    navigate: vi.fn(),
    select: vi.fn(),
  };
}

// =============================================================================
// Colorscheme commands in getYouTubeCommands
// =============================================================================
describe('getYouTubeCommands - colorscheme commands', () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    app = makeApp();
    vi.clearAllMocks();
    (getYouTubePageType as any).mockReturnValue('home');
  });

  it('includes a Colorscheme group header', () => {
    const commands = getYouTubeCommands(app);
    const group = commands.find(c => c.group === 'Colorscheme');
    expect(group).toBeDefined();
  });

  it('has one command per colorscheme key', () => {
    const commands = getYouTubeCommands(app);
    const schemeKeys = Object.keys(COLORSCHEMES);
    for (const name of schemeKeys) {
      const cmd = commands.find(c => c.keys === `:colo ${name}`);
      expect(cmd).toBeDefined();
    }
  });

  it('each colorscheme command has correct label format', () => {
    const commands = getYouTubeCommands(app);
    const schemeKeys = Object.keys(COLORSCHEMES);
    for (const name of schemeKeys) {
      const cmd = commands.find(c => c.keys === `:colo ${name}`);
      expect(cmd.label).toBe(name);
    }
  });

  it('each colorscheme command has paint palette icon', () => {
    const commands = getYouTubeCommands(app);
    const schemeKeys = Object.keys(COLORSCHEMES);
    for (const name of schemeKeys) {
      const cmd = commands.find(c => c.keys === `:colo ${name}`);
      expect(cmd.icon).toBe('\uD83C\uDFA8');
    }
  });

  it('each colorscheme command has type "command"', () => {
    const commands = getYouTubeCommands(app);
    const schemeKeys = Object.keys(COLORSCHEMES);
    for (const name of schemeKeys) {
      const cmd = commands.find(c => c.keys === `:colo ${name}`);
      expect(cmd.type).toBe('command');
    }
  });

  it('colorscheme command action saves settings and applies theme', () => {
    const commands = getYouTubeCommands(app);
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
    const commands = getYouTubeCommands(app);
    const cmd = commands.find(c => c.keys === ':colo gruvbox');
    expect(cmd).toBeDefined();

    cmd.action();

    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ colorscheme: 'gruvbox' })
    );
    expect(getTheme).toHaveBeenCalledWith('gruvbox');
    expect(showMessage).toHaveBeenCalledWith('Colorscheme: gruvbox');
  });

  it('colorscheme commands appear on both listing and watch pages', () => {
    // Listing page
    (getYouTubePageType as any).mockReturnValue('home');
    const listingCmds = getYouTubeCommands(app);
    const listingColo = listingCmds.filter(c => c.keys?.startsWith(':colo '));
    expect(listingColo.length).toBe(Object.keys(COLORSCHEMES).length);

    // Watch page
    (getYouTubePageType as any).mockReturnValue('watch');
    const watchCmds = getYouTubeCommands(app);
    const watchColo = watchCmds.filter(c => c.keys?.startsWith(':colo '));
    expect(watchColo.length).toBe(Object.keys(COLORSCHEMES).length);
  });

  it('Colorscheme group appears after :settings command', () => {
    const commands = getYouTubeCommands(app);
    const settingsIdx = commands.findIndex(c => c.keys === ':settings');
    const coloGroupIdx = commands.findIndex(c => c.group === 'Colorscheme');
    expect(settingsIdx).toBeGreaterThanOrEqual(0);
    expect(coloGroupIdx).toBeGreaterThanOrEqual(0);
    expect(coloGroupIdx).toBeGreaterThan(settingsIdx);
  });
});

// =============================================================================
// Font commands in getYouTubeCommands
// =============================================================================
describe('getYouTubeCommands - font commands', () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    app = makeApp();
    vi.clearAllMocks();
    (getYouTubePageType as any).mockReturnValue('home');
  });

  it('includes a Font group header', () => {
    const commands = getYouTubeCommands(app);
    const group = commands.find(c => c.group === 'Font');
    expect(group).toBeDefined();
  });

  it('has one command per font in FONTS', () => {
    const commands = getYouTubeCommands(app);
    for (const font of FONTS) {
      const key = fontToKey(font);
      const cmd = commands.find(c => c.keys === `:set guifont=${key}`);
      expect(cmd).toBeDefined();
    }
  });

  it('each font command has the font display name as label', () => {
    const commands = getYouTubeCommands(app);
    for (const font of FONTS) {
      const key = fontToKey(font);
      const cmd = commands.find(c => c.keys === `:set guifont=${key}`);
      expect(cmd.label).toBe(font);
    }
  });

  it('each font command is hidden', () => {
    const commands = getYouTubeCommands(app);
    for (const font of FONTS) {
      const key = fontToKey(font);
      const cmd = commands.find(c => c.keys === `:set guifont=${key}`);
      expect(cmd.hidden).toBe(true);
    }
  });

  it('each font command has type "command"', () => {
    const commands = getYouTubeCommands(app);
    for (const font of FONTS) {
      const key = fontToKey(font);
      const cmd = commands.find(c => c.keys === `:set guifont=${key}`);
      expect(cmd.type).toBe('command');
    }
  });

  it('font command action saves settings and calls applyFont', () => {
    const commands = getYouTubeCommands(app);
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
    const commands = getYouTubeCommands(app);
    const cmd = commands.find(c => c.keys === ':set guifont=JetBrains-Mono');
    expect(cmd).toBeDefined();

    cmd.action();

    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ font: 'JetBrains Mono' })
    );
    expect(applyFont).toHaveBeenCalledWith('JetBrains Mono');
    expect(showMessage).toHaveBeenCalledWith('Font: JetBrains Mono');
  });

  it('font commands appear on both listing and watch pages', () => {
    // Listing page
    (getYouTubePageType as any).mockReturnValue('home');
    const listingCmds = getYouTubeCommands(app);
    const listingFonts = listingCmds.filter(c => c.keys?.startsWith(':set guifont='));
    expect(listingFonts.length).toBe(FONTS.length);

    // Watch page
    (getYouTubePageType as any).mockReturnValue('watch');
    const watchCmds = getYouTubeCommands(app);
    const watchFonts = watchCmds.filter(c => c.keys?.startsWith(':set guifont='));
    expect(watchFonts.length).toBe(FONTS.length);
  });

  it('Font group appears after Colorscheme group', () => {
    const commands = getYouTubeCommands(app);
    const coloGroupIdx = commands.findIndex(c => c.group === 'Colorscheme');
    const fontGroupIdx = commands.findIndex(c => c.group === 'Font');
    expect(coloGroupIdx).toBeGreaterThanOrEqual(0);
    expect(fontGroupIdx).toBeGreaterThanOrEqual(0);
    expect(fontGroupIdx).toBeGreaterThan(coloGroupIdx);
  });
});
