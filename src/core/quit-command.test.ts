// @vitest-environment jsdom
// Tests for :q command — must fully destroy the app (keyboard, observer, state)

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

const mockDisconnect = vi.fn();
vi.mock('./navigation', () => ({
  setupNavigationObserver: vi.fn(() => ({ disconnect: mockDisconnect })),
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
}));

// Capture the cleanup function from setupKeyboardEngine
const mockCleanupKeyboard = vi.fn();
vi.mock('./keyboard', () => ({
  setupKeyboardEngine: vi.fn(() => mockCleanupKeyboard),
}));

// Capture setInputCallbacks calls to get the onCommandSubmit handler
import { setInputCallbacks } from './layout';
import { createApp } from './index';

function getCommandSubmit(): (value: string, shiftKey: boolean) => void {
  const calls = vi.mocked(setInputCallbacks).mock.calls;
  const lastCall = calls[calls.length - 1];
  return lastCall[0].onCommandSubmit;
}

describe(':q command handler', () => {
  let app;

  const minimalConfig = {
    getPageType: () => 'home',
    getKeySequences: () => ({}),
    getBlockedNativeKeys: () => [],
    isNativeSearchInput: () => false,
  };

  beforeEach(() => {
    document.body.innerHTML = '<div id="vilify-content"></div>';
    app = createApp(minimalConfig);
  });

  afterEach(() => {
    // app may already be destroyed by :q
    try { app.destroy(); } catch (_) { /* ignore */ }
    app = null;
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('calls cleanupKeyboard after :q', async () => {
    await app.init();
    const commandSubmit = getCommandSubmit();

    commandSubmit(':q', false);

    expect(mockCleanupKeyboard).toHaveBeenCalled();
  });

  it('disconnects navigation observer after :q', async () => {
    await app.init();
    const commandSubmit = getCommandSubmit();

    commandSubmit(':q', false);

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('nulls out state after :q', async () => {
    await app.init();
    expect(app.getState()).not.toBeNull();

    const commandSubmit = getCommandSubmit();
    commandSubmit(':q', false);

    expect(app.getState()).toBeNull();
  });
});
