// @vitest-environment jsdom
// Tests for :set guifont command dispatch in core/index.ts
// Covers: bare :set guifont (show current), :set guifont= (omnicomplete trigger),
//         :set guifont=FontName (apply font), unknown font error

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all heavy dependencies so createApp.init() can run
vi.mock('./loading', () => ({
  injectLoadingStyles: vi.fn(),
  showLoadingScreen: vi.fn(),
  hideLoadingScreen: vi.fn(),
}));

let capturedInputCallbacks: any = null;
vi.mock('./layout', () => ({
  injectFocusModeStyles: vi.fn(),
  applyTheme: vi.fn(),
  applyFont: vi.fn(),
  renderFocusMode: vi.fn(),
  renderListing: vi.fn(),
  setInputCallbacks: vi.fn((cbs) => { capturedInputCallbacks = cbs; }),
  updateStatusBar: vi.fn(),
  updateSortIndicator: vi.fn(),
  updateItemCount: vi.fn(),
  updateCursorPosition: vi.fn(),
  removeFocusMode: vi.fn(),
}));
vi.mock('./palette', () => ({
  injectPaletteStyles: vi.fn(),
  filterItems: vi.fn(() => []),
  filterColonCommands: vi.fn(() => []),
  openPalette: vi.fn((state) => state),
  closePalette: vi.fn((state) => state),
  renderPalette: vi.fn(),
  showPalette: vi.fn(),
  hidePalette: vi.fn(),
}));
vi.mock('./drawer', () => ({
  injectDrawerStyles: vi.fn(),
  renderDrawer: vi.fn(),
  handleDrawerKey: vi.fn(),
  closeDrawer: vi.fn(),
}));
vi.mock('./view', () => ({
  el: vi.fn((tag) => document.createElement(tag)),
  clear: vi.fn(),
  updateListSelection: vi.fn(),
  showMessage: vi.fn(),
  flashBoundary: vi.fn(),
  navigateList: vi.fn((_items, idx) => idx),
  isInputElement: vi.fn(() => false),
}));
vi.mock('./navigation', () => ({
  setupNavigationObserver: vi.fn(() => ({ disconnect: vi.fn() })),
}));
vi.mock('./view-tree', () => ({
  toView: vi.fn(() => ({})),
  toStatusBarView: vi.fn(() => ({ sortLabel: '', inputPlaceholder: '' })),
  toContentView: vi.fn(() => ({ type: 'empty', items: [] })),
  toDrawerView: vi.fn(() => null),
  getPageItems: vi.fn(() => []),
}));
vi.mock('./apply-view', () => ({
  applyView: vi.fn(),
  applyStatusBar: vi.fn(),
  applyContent: vi.fn(),
  applyDrawer: vi.fn(),
  resetViewState: vi.fn(),
}));
vi.mock('./poll-content', () => ({
  pollPageContent: vi.fn(() => true),
}));
vi.mock('./actions', () => ({
  copyToClipboard: vi.fn(),
  navigateTo: vi.fn(),
  openInNewTab: vi.fn(),
  copyImageToClipboard: vi.fn(),
}));

// Capture appCallbacks from setupKeyboardEngine
let capturedAppCallbacks: any = null;
vi.mock('./keyboard', () => ({
  setupKeyboardEngine: vi.fn((_config, _getState, _setState, appCallbacks, _getSiteState) => {
    capturedAppCallbacks = appCallbacks;
    return vi.fn();
  }),
}));

// Settings mock — must be hoisted but use real keyToFont logic
vi.mock('./settings', () => {
  const FONTS = ['SF Mono', 'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'Source Code Pro', 'Cascadia Code', 'Iosevka'];
  return {
    COLORSCHEMES: { 'kanagawa': { bg1: '#1F1F28' } },
    FONTS,
    loadSettings: vi.fn(() => ({ colorscheme: 'kanagawa', font: 'SF Mono' })),
    saveSettings: vi.fn(),
    getTheme: vi.fn(() => ({ bg1: '#1F1F28' })),
    getFontFamily: vi.fn((f: string) => `'${f}', monospace`),
    keyToFont: vi.fn((key: string) => {
      const normalized = key.toLowerCase().replace(/-/g, ' ');
      return FONTS.find((font) => font.toLowerCase() === normalized) ?? null;
    }),
  };
});

vi.mock('./settings-window', () => ({
  openSettingsWindow: vi.fn(),
}));

import { createApp } from './index';
import { applyFont } from './layout';
import { showMessage } from './view';
import { loadSettings, saveSettings } from './settings';

// =============================================================================
// :set guifont command dispatch tests
// =============================================================================

describe(':set guifont command in handleCommandSubmit', () => {
  let app: any;

  beforeEach(() => {
    capturedInputCallbacks = null;
    capturedAppCallbacks = null;
    document.body.innerHTML = '<div id="vilify-content"></div>';
    app = createApp({
      getPageType: () => 'home',
      getKeySequences: () => ({}),
      getBlockedNativeKeys: () => [],
      isNativeSearchInput: () => false,
    } as any);
  });

  afterEach(() => {
    if (app) {
      app.destroy();
      app = null;
    }
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  async function initAndGetInputCallbacks() {
    await app.init();
    expect(capturedInputCallbacks).not.toBeNull();
    return capturedInputCallbacks;
  }

  it('bare ":set guifont" shows current font as message', async () => {
    const cbs = await initAndGetInputCallbacks();
    cbs.onCommandSubmit(':set guifont', false);
    expect(loadSettings).toHaveBeenCalled();
    expect(showMessage).toHaveBeenCalledWith('SF Mono');
  });

  it('":set guifont" shows current font (case insensitive)', async () => {
    const cbs = await initAndGetInputCallbacks();
    cbs.onCommandSubmit(':SET GUIFONT', false);
    expect(showMessage).toHaveBeenCalledWith('SF Mono');
  });

  it('":set guifont=" with empty value does not crash (omnicomplete handles it)', async () => {
    const cbs = await initAndGetInputCallbacks();
    // Should not throw — early return for empty fontArg
    expect(() => cbs.onCommandSubmit(':set guifont=', false)).not.toThrow();
  });

  it('":set guifont=SF-Mono" applies the font and shows message', async () => {
    const cbs = await initAndGetInputCallbacks();
    cbs.onCommandSubmit(':set guifont=SF-Mono', false);
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ font: 'SF Mono' })
    );
    expect(applyFont).toHaveBeenCalledWith('SF Mono');
    expect(showMessage).toHaveBeenCalledWith('Font: SF Mono');
  });

  it('":set guifont=JetBrains-Mono" applies JetBrains Mono', async () => {
    const cbs = await initAndGetInputCallbacks();
    cbs.onCommandSubmit(':set guifont=JetBrains-Mono', false);
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ font: 'JetBrains Mono' })
    );
    expect(applyFont).toHaveBeenCalledWith('JetBrains Mono');
    expect(showMessage).toHaveBeenCalledWith('Font: JetBrains Mono');
  });

  it('":set guifont=iosevka" applies Iosevka (case insensitive key lookup)', async () => {
    const cbs = await initAndGetInputCallbacks();
    cbs.onCommandSubmit(':set guifont=iosevka', false);
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ font: 'Iosevka' })
    );
    expect(applyFont).toHaveBeenCalledWith('Iosevka');
    expect(showMessage).toHaveBeenCalledWith('Font: Iosevka');
  });

  it('unknown font shows error message', async () => {
    const cbs = await initAndGetInputCallbacks();
    cbs.onCommandSubmit(':set guifont=Comic-Sans', false);
    expect(showMessage).toHaveBeenCalledWith('Unknown font: Comic-Sans');
    expect(applyFont).not.toHaveBeenCalled();
    expect(saveSettings).not.toHaveBeenCalled();
  });

  it('closes drawer when applying a valid font', async () => {
    const cbs = await initAndGetInputCallbacks();
    cbs.onCommandSubmit(':set guifont=Fira-Code', false);
    const s = app.getState();
    expect(s.ui.drawer).toBeNull();
  });

  it('closes drawer when showing current font (bare command)', async () => {
    const cbs = await initAndGetInputCallbacks();
    // First open a drawer
    capturedAppCallbacks.openPalette('command');
    expect(app.getState().ui.drawer).toBe('palette');
    // Now run bare :set guifont
    cbs.onCommandSubmit(':set guifont', false);
    const s = app.getState();
    expect(s.ui.drawer).toBeNull();
  });

  it('handles extra whitespace between set and guifont', async () => {
    const cbs = await initAndGetInputCallbacks();
    cbs.onCommandSubmit(':set   guifont=SF-Mono', false);
    expect(applyFont).toHaveBeenCalledWith('SF Mono');
    expect(showMessage).toHaveBeenCalledWith('Font: SF Mono');
  });

  it('handles command without colon prefix', async () => {
    const cbs = await initAndGetInputCallbacks();
    cbs.onCommandSubmit('set guifont=Iosevka', false);
    expect(applyFont).toHaveBeenCalledWith('Iosevka');
    expect(showMessage).toHaveBeenCalledWith('Font: Iosevka');
  });
});

// =============================================================================
// :set guifont= auto-activate omnicompletion tests
// =============================================================================

describe(':set guifont= auto-activate omnicompletion in handleCommandChange', () => {
  let app: any;

  beforeEach(() => {
    capturedInputCallbacks = null;
    capturedAppCallbacks = null;
    document.body.innerHTML = '<div id="vilify-content"></div>';
    app = createApp({
      getPageType: () => 'home',
      getKeySequences: () => ({}),
      getBlockedNativeKeys: () => [],
      isNativeSearchInput: () => false,
    } as any);
  });

  afterEach(() => {
    if (app) {
      app.destroy();
      app = null;
    }
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  async function initAndGetInputCallbacks() {
    await app.init();
    expect(capturedInputCallbacks).not.toBeNull();
    return capturedInputCallbacks;
  }

  it('typing ":set guifont=" sets paletteQuery and resets selected index', async () => {
    const cbs = await initAndGetInputCallbacks();
    cbs.onCommandChange(':set guifont=');
    const s = app.getState();
    expect(s.ui.paletteQuery).toBe(':set guifont=');
    expect(s.ui.paletteSelectedIdx).toBe(0);
  });

  it('typing ":SET GUIFONT=" also triggers omnicompletion (case insensitive)', async () => {
    const cbs = await initAndGetInputCallbacks();
    cbs.onCommandChange(':SET GUIFONT=');
    const s = app.getState();
    // The check is on the lowercased value, so it should activate omnicompletion
    expect(s.ui.paletteQuery).toBe(':SET GUIFONT=');
    expect(s.ui.paletteSelectedIdx).toBe(0);
  });
});
