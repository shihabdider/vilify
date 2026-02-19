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

// Track getPageItems mock so we can change its return value
const getPageItemsMock = vi.fn(() => []);

vi.mock('./view-tree', () => ({
  toView: vi.fn(() => ({})),
  toStatusBarView: vi.fn(() => ({ sortLabel: '', inputPlaceholder: '' })),
  toContentView: vi.fn(() => ({ type: 'empty', items: [] })),
  toDrawerView: vi.fn(() => null),
  getPageItems: () => getPageItemsMock(),
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

// Mock YouTube data provider for triggerLazyLoad
let mockFetchMore = vi.fn(() => Promise.resolve(false));
vi.mock('../sites/youtube/data/index', () => ({
  getDataProvider: () => ({
    fetchMore: () => mockFetchMore(),
  }),
}));

// Mock setupKeyboardEngine to capture appCallbacks
let capturedAppCallbacks: any = null;
vi.mock('./keyboard', () => ({
  setupKeyboardEngine: vi.fn((_config, _getState, _setState, appCallbacks, _getSiteState) => {
    capturedAppCallbacks = appCallbacks;
    return vi.fn();
  }),
}));

import { createApp } from './index';
import { showMessage, flashBoundary } from './view';

function makeItem(id: string) {
  return { id, title: `Video ${id}`, url: `/watch?v=${id}`, element: document.createElement('div') };
}

describe('handleListNavigation with lazy load at bottom boundary', () => {
  let app: any;
  let minimalConfig: any;

  beforeEach(() => {
    capturedAppCallbacks = null;
    mockFetchMore = vi.fn(() => Promise.resolve(false));

    document.body.innerHTML = '<div id="vilify-content"></div>';

    minimalConfig = {
      name: 'youtube',
      getPageType: () => 'home',
      getKeySequences: () => ({}),
      getBlockedNativeKeys: () => [],
      isNativeSearchInput: () => false,
      pages: {
        home: { gridColumns: 0 },
      },
      createPageState: null as (() => any) | null,
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

  it('awaits lazy load and advances cursor when new items arrive at bottom boundary', async () => {
    const items3 = [makeItem('1'), makeItem('2'), makeItem('3')];
    const items5 = [makeItem('1'), makeItem('2'), makeItem('3'), makeItem('4'), makeItem('5')];

    getPageItemsMock.mockReturnValue(items3);

    const cb = await initAndGetCallbacks();

    // Move cursor to last item (index 2, the 3rd item)
    cb.navigate('down');
    cb.navigate('down');
    expect(app.getState().ui.selectedIdx).toBe(2);

    // createPageState starts with 3 items (captured as beforeCount),
    // then after fetchMore succeeds, switches to 5 items for polling to detect
    let pollCount = 0;
    minimalConfig.createPageState = () => {
      pollCount++;
      // First call captures beforeCount (3 items)
      if (pollCount <= 1) return { videos: items3 };
      // Subsequent poll calls see new items
      return { videos: items5 };
    };

    mockFetchMore.mockImplementation(async () => {
      getPageItemsMock.mockReturnValue(items5);
      return true;
    });

    // Press j at the bottom boundary - should await lazy load then advance
    await cb.navigate('down');

    // After awaiting lazy load and re-navigating, cursor should be at index 3
    expect(app.getState().ui.selectedIdx).toBe(3);
  });

  it('stays at boundary when lazy load fails to produce new items', async () => {
    const items3 = [makeItem('1'), makeItem('2'), makeItem('3')];
    getPageItemsMock.mockReturnValue(items3);

    const cb = await initAndGetCallbacks();

    // Move to last item
    cb.navigate('down');
    cb.navigate('down');
    expect(app.getState().ui.selectedIdx).toBe(2);

    // fetchMore fails, and createPageState never shows more items
    mockFetchMore.mockResolvedValue(false);
    minimalConfig.createPageState = () => ({ videos: items3 });

    await cb.navigate('down');

    // Should stay at index 2 (bottom boundary, no new items)
    expect(app.getState().ui.selectedIdx).toBe(2);
  });

  it('shows Loading more... message when hitting bottom boundary', async () => {
    const items2 = [makeItem('1'), makeItem('2')];
    getPageItemsMock.mockReturnValue(items2);

    const cb = await initAndGetCallbacks();

    cb.navigate('down');
    expect(app.getState().ui.selectedIdx).toBe(1);

    mockFetchMore.mockResolvedValue(false);
    minimalConfig.createPageState = () => ({ videos: items2 });

    await cb.navigate('down');

    expect(showMessage).toHaveBeenCalledWith('Loading more...');
  });

  it('does not trigger lazy load when filter is active', async () => {
    const items2 = [makeItem('1'), makeItem('2')];
    getPageItemsMock.mockReturnValue(items2);

    const cb = await initAndGetCallbacks();

    // Activate filter
    cb.openLocalFilter();
    expect(app.getState().ui.filterActive).toBe(true);

    // Move to last item
    cb.navigate('down');
    expect(app.getState().ui.selectedIdx).toBe(1);

    // Try to go past bottom
    await cb.navigate('down');

    // Should flash boundary instead of lazy loading
    expect(flashBoundary).toHaveBeenCalled();
    expect(mockFetchMore).not.toHaveBeenCalled();
  });

  it('does not fire duplicate lazy loads when pressing j rapidly', async () => {
    const items2 = [makeItem('1'), makeItem('2')];
    getPageItemsMock.mockReturnValue(items2);

    const cb = await initAndGetCallbacks();

    cb.navigate('down');
    expect(app.getState().ui.selectedIdx).toBe(1);

    // Slow fetchMore to simulate in-flight request
    let resolveFetch!: (v: boolean) => void;
    const fetchPromise = new Promise<boolean>((r) => { resolveFetch = r; });
    mockFetchMore.mockReturnValue(fetchPromise);

    // createPageState returns same count so poll keeps running
    minimalConfig.createPageState = () => ({ videos: items2 });

    // First j at bottom - starts lazy load
    const p1 = cb.navigate('down');

    // Second j at bottom while first is still loading
    const p2 = cb.navigate('down');

    // Resolve the first fetch (poll will still time out since no new items)
    resolveFetch(false);
    await p1;
    await p2;

    // fetchMore should only be called once (isLoadingMore guard)
    expect(mockFetchMore).toHaveBeenCalledTimes(1);
  });

  it('DOM scroll fires immediately (not after API timeout)', async () => {
    const items2 = [makeItem('1'), makeItem('2')];
    getPageItemsMock.mockReturnValue(items2);

    const cb = await initAndGetCallbacks();

    cb.navigate('down');
    expect(app.getState().ui.selectedIdx).toBe(1);

    // Track when DOM scroll happens (focus-mode class removal)
    const classRemoveTime: number[] = [];
    const origRemove = document.body.classList.remove.bind(document.body.classList);
    vi.spyOn(document.body.classList, 'remove').mockImplementation((...args: string[]) => {
      if (args[0] === 'vilify-focus-mode') {
        classRemoveTime.push(Date.now());
      }
      return origRemove(...args);
    });

    // Make fetchMore hang (never resolve quickly)
    mockFetchMore.mockReturnValue(new Promise(() => {}));
    minimalConfig.createPageState = () => ({ videos: items2 });

    const startTime = Date.now();
    // Don't await - just fire and check timing
    const p = cb.navigate('down');

    // Give it a tick to start
    await new Promise(r => setTimeout(r, 50));

    // DOM scroll (class removal) should have happened almost immediately
    expect(classRemoveTime.length).toBeGreaterThan(0);
    expect(classRemoveTime[0]! - startTime).toBeLessThan(500);

    // Clean up: let the poll timeout naturally
    // Force resolve by making createPageState return more items
    const items4 = [makeItem('1'), makeItem('2'), makeItem('3'), makeItem('4')];
    minimalConfig.createPageState = () => ({ videos: items4 });
    await p;
  });

  it('picks up new items from DOM path when API path fails', async () => {
    const items2 = [makeItem('1'), makeItem('2')];
    const items4 = [makeItem('1'), makeItem('2'), makeItem('3'), makeItem('4')];
    getPageItemsMock.mockReturnValue(items2);

    const cb = await initAndGetCallbacks();

    app.setState({
      ...app.getState(),
      page: { type: 'list', videos: items2 },
    });

    cb.navigate('down');
    expect(app.getState().ui.selectedIdx).toBe(1);

    // API path fails
    mockFetchMore.mockResolvedValue(false);

    // createPageState: first call returns 2 items (beforeCount),
    // after a few polls, returns 4 items (simulating YouTube native load)
    let pollCount = 0;
    minimalConfig.createPageState = () => {
      pollCount++;
      if (pollCount <= 2) return { type: 'list', videos: items2 };
      return { type: 'list', videos: items4 };
    };

    getPageItemsMock.mockImplementation(() => {
      const st = app.getState();
      if (st.page?.videos?.length === 4) return items4;
      return items2;
    });

    await cb.navigate('down');

    // createPageState should have been polled multiple times
    expect(pollCount).toBeGreaterThan(2);
    // State should now have 4 videos from the DOM path
    const stateAfter = app.getState();
    expect(stateAfter.page.videos).toHaveLength(4);
  });

  it('after lazy load, state is updated with new items', async () => {
    const items2 = [makeItem('1'), makeItem('2')];
    const items5 = [makeItem('1'), makeItem('2'), makeItem('3'), makeItem('4'), makeItem('5')];
    getPageItemsMock.mockReturnValue(items2);

    const cb = await initAndGetCallbacks();

    // Manually set page state to list so onListItemsUpdate works
    app.setState({
      ...app.getState(),
      page: { type: 'list', videos: items2 },
    });

    // Move to last item
    cb.navigate('down');
    expect(app.getState().ui.selectedIdx).toBe(1);

    // fetchMore fails, DOM path will produce new items
    mockFetchMore.mockResolvedValue(false);

    // createPageState starts with 2 items (beforeCount captures this),
    // then switches to 5 items after a short delay (simulating YouTube loading)
    let pollCount = 0;
    minimalConfig.createPageState = () => {
      pollCount++;
      // First call is beforeCount capture, next few are polling checks
      if (pollCount <= 2) return { type: 'list', videos: items2 };
      // After a couple of polls, YouTube has loaded new content
      return { type: 'list', videos: items5 };
    };

    // After state update, getPageItems returns the new items
    getPageItemsMock.mockImplementation(() => {
      const st = app.getState();
      if (st.page?.videos?.length === 5) return items5;
      return items2;
    });

    await cb.navigate('down');

    // State should now have 5 videos from the DOM fallback update
    const stateAfter = app.getState();
    expect(stateAfter.page.videos).toHaveLength(5);
  });
});
