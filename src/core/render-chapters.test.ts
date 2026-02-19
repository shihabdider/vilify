// @vitest-environment jsdom
// Tests for chapter indicator in render() -- on watch pages with chapters,
// the position segment (#vilify-status-position) shows "chapters: N"

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all heavy dependencies so createApp.init() can run
vi.mock('./loading', () => ({
  injectLoadingStyles: vi.fn(),
  showLoadingScreen: vi.fn(),
  hideLoadingScreen: vi.fn(),
}));
vi.mock('./layout', () => ({
  injectFocusModeStyles: vi.fn(),
  applyTheme: vi.fn(),
  applyFont: vi.fn(),
  renderFocusMode: vi.fn(),
  renderListing: vi.fn(),
  setInputCallbacks: vi.fn(),
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
  toContentView: vi.fn(() => ({ type: 'empty', items: [], selectedIdx: 0 })),
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
vi.mock('./settings', () => ({
  COLORSCHEMES: { kanagawa: { bg1: 'hsl(240, 14%, 14%)' } },
  loadSettings: vi.fn(() => ({ colorscheme: 'kanagawa', font: 'SF Mono' })),
  saveSettings: vi.fn(),
  getTheme: vi.fn(() => ({ bg1: 'hsl(240, 14%, 14%)' })),
  getFontFamily: vi.fn((f: string) => `'${f}', monospace`),
  keyToFont: vi.fn(() => null),
  FONTS: [],
}));
vi.mock('./settings-window', () => ({
  openSettingsWindow: vi.fn(),
}));

// Mock keyboard to capture nothing -- we just need setState to trigger render()
vi.mock('./keyboard', () => ({
  setupKeyboardEngine: vi.fn(() => vi.fn()),
}));

import { createApp } from './index';
import type { Chapter } from '../types';

// setState calls render() internally, so we use it to trigger render.
describe('render() chapter indicator in status bar position', () => {
  let app: any;

  function makeConfig(pageType: string) {
    return {
      getPageType: () => pageType,
      getKeySequences: () => ({}),
      getBlockedNativeKeys: () => [],
      isNativeSearchInput: () => false,
    };
  }

  beforeEach(() => {
    // Provide the vilify-content container AND the position element
    document.body.innerHTML =
      '<div id="vilify-content"></div>' +
      '<span id="vilify-status-position"></span>';
  });

  afterEach(() => {
    if (app) {
      app.destroy();
      app = null;
    }
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('shows "chapters: N" on watch page with chapters', async () => {
    app = createApp(makeConfig('watch'));
    await app.init();

    const chapters: Chapter[] = [
      { title: 'Intro', time: 0, timeText: '0:00' },
      { title: 'Main', time: 60, timeText: '1:00' },
      { title: 'Outro', time: 120, timeText: '2:00' },
    ];

    app.setState({
      ...app.getState(),
      page: { type: 'watch', videoContext: null, recommended: [], chapters },
    });

    const posEl = document.getElementById('vilify-status-position');
    expect(posEl!.textContent).toBe('chapters: 3');
  });

  it('does not override position on watch page with empty chapters', async () => {
    app = createApp(makeConfig('watch'));
    await app.init();

    app.setState({
      ...app.getState(),
      page: { type: 'watch', videoContext: null, recommended: [], chapters: [] },
    });

    const posEl = document.getElementById('vilify-status-position');
    expect(posEl!.textContent).not.toMatch(/^chapters:/);
  });

  it('does not override position on non-watch page', async () => {
    app = createApp(makeConfig('home'));
    await app.init();

    app.setState(app.getState());

    const posEl = document.getElementById('vilify-status-position');
    expect(posEl!.textContent).not.toMatch(/^chapters:/);
  });

  it('does not override position when page state is null', async () => {
    app = createApp(makeConfig('watch'));
    await app.init();

    app.setState(app.getState());

    const posEl = document.getElementById('vilify-status-position');
    expect(posEl!.textContent).not.toMatch(/^chapters:/);
  });

  it('shows single chapter as "chapters: 1"', async () => {
    app = createApp(makeConfig('watch'));
    await app.init();

    const chapters: Chapter[] = [
      { title: 'Only Chapter', time: 0, timeText: '0:00' },
    ];

    app.setState({
      ...app.getState(),
      page: { type: 'watch', videoContext: null, recommended: [], chapters },
    });

    const posEl = document.getElementById('vilify-status-position');
    expect(posEl!.textContent).toBe('chapters: 1');
  });
});
