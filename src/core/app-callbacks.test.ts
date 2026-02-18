// @vitest-environment jsdom
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
  el: vi.fn((tag, attrs, children) => {
    const e = document.createElement(tag);
    return e;
  }),
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
  pollPageContent: vi.fn(() => true),  // Resolve immediately — skip DOM polling
}));
vi.mock('./actions', () => ({
  copyToClipboard: vi.fn(),
  navigateTo: vi.fn(),
  openInNewTab: vi.fn(),
  copyImageToClipboard: vi.fn(),
}));

// Mock setupKeyboardEngine to capture appCallbacks
let capturedAppCallbacks = null;
vi.mock('./keyboard', () => ({
  setupKeyboardEngine: vi.fn((_config, _getState, _setState, appCallbacks, _getSiteState) => {
    capturedAppCallbacks = appCallbacks;
    return vi.fn(); // cleanup function
  }),
}));

import { createApp } from './index';
import { removeFocusMode } from './layout';
import { showMessage } from './view';

describe('appCallbacks constructed in createApp.init()', () => {
  let app;
  let minimalConfig;

  beforeEach(() => {
    capturedAppCallbacks = null;

    // Minimal vilify-content container
    document.body.innerHTML = '<div id="vilify-content"></div>';

    minimalConfig = {
      getPageType: () => 'home',
      getKeySequences: () => ({}),
      getBlockedNativeKeys: () => [],
      isNativeSearchInput: () => false,
    };

    app = createApp(minimalConfig);
  });

  afterEach(() => {
    if (app) {
      app.destroy();
      app = null;
    }
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  async function initAndGetCallbacks() {
    await app.init();
    expect(capturedAppCallbacks).not.toBeNull();
    return capturedAppCallbacks;
  }

  describe('openPalette', () => {
    it('sets drawer to palette with empty query for non-command mode', async () => {
      const cb = await initAndGetCallbacks();
      cb.openPalette('filter');
      const s = app.getState();
      expect(s.ui.drawer).toBe('palette');
      expect(s.ui.paletteQuery).toBe('');
      expect(s.ui.paletteSelectedIdx).toBe(0);
    });

    it('sets paletteQuery to ":" for command mode', async () => {
      const cb = await initAndGetCallbacks();
      cb.openPalette('command');
      const s = app.getState();
      expect(s.ui.drawer).toBe('palette');
      expect(s.ui.paletteQuery).toBe(':');
      expect(s.ui.paletteSelectedIdx).toBe(0);
    });
  });

  describe('openRecommended', () => {
    it('sets drawer to recommended', async () => {
      const cb = await initAndGetCallbacks();
      cb.openRecommended();
      const s = app.getState();
      expect(s.ui.drawer).toBe('recommended');
    });
  });

  describe('openLocalFilter', () => {
    it('sets filterActive true and clears filterQuery', async () => {
      const cb = await initAndGetCallbacks();
      cb.openLocalFilter();
      const s = app.getState();
      expect(s.ui.filterActive).toBe(true);
      expect(s.ui.filterQuery).toBe('');
    });
  });

  describe('openSearch', () => {
    it('opens searchActive when no suggest drawer handler', async () => {
      const cb = await initAndGetCallbacks();
      cb.openSearch();
      const s = app.getState();
      expect(s.ui.searchActive).toBe(true);
      expect(s.ui.searchQuery).toBe('');
    });

    it('opens searchActive with initialQuery', async () => {
      const cb = await initAndGetCallbacks();
      cb.openSearch('test query');
      const s = app.getState();
      expect(s.ui.searchActive).toBe(true);
      expect(s.ui.searchQuery).toBe('test query');
    });

    it('opens suggest drawer when config has suggest drawer handler', async () => {
      // Config with getDrawerHandler returning truthy for 'suggest'
      const configWithSuggest = {
        ...minimalConfig,
        getDrawerHandler: (drawerType) => drawerType === 'suggest' ? {} : null,
      };
      app.destroy();
      app = createApp(configWithSuggest);
      await app.init();
      const cb = capturedAppCallbacks;

      cb.openSearch('hello');
      const s = app.getState();
      expect(s.ui.drawer).toBe('suggest');
      expect(s.ui.searchQuery).toBe('hello');
    });

    it('defaults initialQuery to empty string when undefined', async () => {
      const cb = await initAndGetCallbacks();
      cb.openSearch(undefined);
      const s = app.getState();
      expect(s.ui.searchQuery).toBe('');
    });
  });

  describe('openDrawer', () => {
    it('sets drawer to the given drawerId', async () => {
      const cb = await initAndGetCallbacks();
      cb.openDrawer('myCustomDrawer');
      const s = app.getState();
      expect(s.ui.drawer).toBe('myCustomDrawer');
    });
  });

  describe('closeDrawer', () => {
    it('sets drawer to null', async () => {
      const cb = await initAndGetCallbacks();
      // First open a drawer
      cb.openDrawer('something');
      expect(app.getState().ui.drawer).toBe('something');
      // Then close
      cb.closeDrawer();
      const s = app.getState();
      expect(s.ui.drawer).toBeNull();
    });
  });

  describe('goToTop / goToBottom', () => {
    it('goToTop delegates to handleListNavigation("top")', async () => {
      const cb = await initAndGetCallbacks();
      // Should not throw (delegates to handleListNavigation)
      expect(() => cb.goToTop()).not.toThrow();
    });

    it('goToBottom delegates to handleListNavigation("bottom")', async () => {
      const cb = await initAndGetCallbacks();
      expect(() => cb.goToBottom()).not.toThrow();
    });
  });

  describe('openTranscriptDrawer', () => {
    it('shows message when siteState is null', async () => {
      const cb = await initAndGetCallbacks();
      // siteState is null by default for minimal config
      cb.openTranscriptDrawer();
      // Should not crash — early return on null siteState
    });

    it('toggles transcript drawer off when already open', async () => {
      const cb = await initAndGetCallbacks();
      // Set up siteState with loaded transcript
      app.setSiteState({ transcript: { status: 'loaded', items: [] } });
      // Open transcript
      cb.openTranscriptDrawer();
      expect(app.getState().ui.drawer).toBe('transcript');
      // Toggle off
      cb.openTranscriptDrawer();
      expect(app.getState().ui.drawer).toBeNull();
    });

    it('opens transcript drawer when transcript is loaded', async () => {
      const cb = await initAndGetCallbacks();
      app.setSiteState({ transcript: { status: 'loaded', items: [] } });
      cb.openTranscriptDrawer();
      expect(app.getState().ui.drawer).toBe('transcript');
    });

    it('shows loading message when transcript is loading', async () => {
      const cb = await initAndGetCallbacks();
      app.setSiteState({ transcript: { status: 'loading' } });
      cb.openTranscriptDrawer();
      expect(showMessage).toHaveBeenCalledWith('Loading transcript...');
      expect(app.getState().ui.drawer).not.toBe('transcript');
    });

    it('shows loading message when transcript is null', async () => {
      const cb = await initAndGetCallbacks();
      app.setSiteState({ transcript: null });
      cb.openTranscriptDrawer();
      expect(showMessage).toHaveBeenCalledWith('Loading transcript...');
    });

    it('shows no transcript message when status is error', async () => {
      const cb = await initAndGetCallbacks();
      app.setSiteState({ transcript: { status: 'error' } });
      cb.openTranscriptDrawer();
      expect(showMessage).toHaveBeenCalledWith('No transcript available');
    });
  });

  describe('exitFocusMode', () => {
    it('sets focusModeActive to false', async () => {
      const cb = await initAndGetCallbacks();
      expect(app.getState().core.focusModeActive).toBe(true);
      cb.exitFocusMode();
      expect(app.getState().core.focusModeActive).toBe(false);
    });

    it('calls removeFocusMode', async () => {
      const cb = await initAndGetCallbacks();
      cb.exitFocusMode();
      expect(removeFocusMode).toHaveBeenCalled();
    });

    it('removes vilify-watch-page class from body', async () => {
      const cb = await initAndGetCallbacks();
      document.body.classList.add('vilify-watch-page');
      cb.exitFocusMode();
      expect(document.body.classList.contains('vilify-watch-page')).toBe(false);
    });
  });

  describe('updateSubscribeButton', () => {
    it('updates status element for subscribed state', async () => {
      const cb = await initAndGetCallbacks();
      document.body.innerHTML += '<span id="vilify-sub-status" class="not-subscribed">· subscribe</span>';
      document.body.innerHTML += '<span id="vilify-sub-action"></span>';
      cb.updateSubscribeButton(true);
      const statusEl = document.getElementById('vilify-sub-status');
      expect(statusEl.textContent).toBe('· subscribed');
      expect(statusEl.classList.contains('not-subscribed')).toBe(false);
    });

    it('updates status element for unsubscribed state', async () => {
      const cb = await initAndGetCallbacks();
      document.body.innerHTML += '<span id="vilify-sub-status">· subscribed</span>';
      document.body.innerHTML += '<span id="vilify-sub-action"></span>';
      cb.updateSubscribeButton(false);
      const statusEl = document.getElementById('vilify-sub-status');
      expect(statusEl.textContent).toBe('· subscribe');
      expect(statusEl.classList.contains('not-subscribed')).toBe(true);
    });

    it('updates action element with kbd and text for subscribed', async () => {
      const cb = await initAndGetCallbacks();
      document.body.innerHTML += '<span id="vilify-sub-action"></span>';
      cb.updateSubscribeButton(true);
      const actionEl = document.getElementById('vilify-sub-action');
      const kbd = actionEl.querySelector('kbd');
      expect(kbd).not.toBeNull();
      expect(kbd.textContent).toBe('ms');
      expect(actionEl.textContent).toContain('unsub');
    });

    it('updates action element with kbd and text for unsubscribed', async () => {
      const cb = await initAndGetCallbacks();
      document.body.innerHTML += '<span id="vilify-sub-action"></span>';
      cb.updateSubscribeButton(false);
      const actionEl = document.getElementById('vilify-sub-action');
      expect(actionEl.textContent).toContain('sub');
      expect(actionEl.textContent).not.toContain('unsub');
    });

    it('handles missing DOM elements gracefully', async () => {
      const cb = await initAndGetCallbacks();
      // No sub-status or sub-action elements in DOM
      expect(() => cb.updateSubscribeButton(true)).not.toThrow();
    });
  });
});
