// Tests for YouTube key sequence bindings
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

import { getYouTubeKeySequences, getYouTubeCommands, getYouTubeBlockedNativeKeys } from './commands';
import { getYouTubePageType } from './scraper';
import { getDataProvider } from './data/index';
import * as player from './player';

// Helper to create a KeyContext for tests
function makeContext(overrides = {}) {
  return { pageType: null, filterActive: false, searchActive: false, drawer: null, ...overrides };
}

// Helper: full app mock with all methods
function makeApp() {
  return {
    removeFromWatchLater: vi.fn(),
    addToWatchLater: vi.fn(),
    openPalette: vi.fn(),
    openLocalFilter: vi.fn(),
    openRecommended: vi.fn(),
    openSearch: vi.fn(),
    goToTop: vi.fn(),
    goToBottom: vi.fn(),
    navigate: vi.fn(),
    select: vi.fn(),
    undoWatchLaterRemoval: vi.fn(),
    nextCommentPage: vi.fn(),
    prevCommentPage: vi.fn(),
    openDrawer: vi.fn(),
    closeDrawer: vi.fn(),
    openTranscriptDrawer: vi.fn(),
    updateSubscribeButton: vi.fn(),
  };
}

// Helper: mock video context for watch page
function mockVideoContext(ctx = {}) {
  const defaultCtx = {
    videoId: 'abc123',
    channelUrl: '/c/testchannel',
    channelName: 'TestChannel',
    isSubscribed: false,
    cleanUrl: 'https://www.youtube.com/watch?v=abc123',
    title: 'Test Video',
    currentTime: 42,
  };
  getDataProvider.mockReturnValue({
    getVideoContext: () => ({ ...defaultCtx, ...ctx }),
  });
}

function mockNoVideoContext() {
  getDataProvider.mockReturnValue({
    getVideoContext: () => null,
  });
}

// =============================================================================
// (1) Always-available bindings
// =============================================================================
describe('getYouTubeKeySequences - always available', () => {
  let app;

  beforeEach(() => {
    app = makeApp();
    mockNoVideoContext();
  });

  it('has / on listing page → openLocalFilter', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    expect(seq).toHaveProperty('/');
    seq['/']();
    expect(app.openLocalFilter).toHaveBeenCalled();
  });

  it('has / on watch page → openRecommended', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).toHaveProperty('/');
    seq['/']();
    expect(app.openRecommended).toHaveBeenCalled();
  });

  it('has : → openPalette("command")', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    seq[':']();
    expect(app.openPalette).toHaveBeenCalledWith('command');
  });

  it('has i → openSearch', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    seq['i']();
    expect(app.openSearch).toHaveBeenCalled();
  });

  it('has gg → goToTop', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    seq['gg']();
    expect(app.goToTop).toHaveBeenCalled();
  });

  it('has mw → addToWatchLater (always)', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    seq['mw']();
    expect(app.addToWatchLater).toHaveBeenCalled();
  });

  it('has mw on watch page too', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['mw']();
    expect(app.addToWatchLater).toHaveBeenCalled();
  });

  // g-prefixed navigation sequences
  const gNavTests = [
    ['gh', '/'],
    ['gs', '/feed/subscriptions'],
    ['gy', '/feed/history'],
    ['gl', '/feed/library'],
    ['gw', '/playlist?list=WL'],
  ];
  for (const [key, _path] of gNavTests) {
    it(`has ${key} navigation sequence on listing page`, () => {
      const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
      expect(seq).toHaveProperty(key);
      expect(typeof seq[key]).toBe('function');
    });

    it(`has ${key} navigation sequence on watch page`, () => {
      const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
      expect(seq).toHaveProperty(key);
    });
  }
});

// =============================================================================
// (2) Listing pages (context.pageType !== 'watch')
// =============================================================================
describe('getYouTubeKeySequences - listing pages', () => {
  let app;

  beforeEach(() => {
    app = makeApp();
    mockNoVideoContext();
  });

  it('has ArrowDown → navigate("down")', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    seq['ArrowDown']();
    expect(app.navigate).toHaveBeenCalledWith('down');
  });

  it('has ArrowUp → navigate("up")', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    seq['ArrowUp']();
    expect(app.navigate).toHaveBeenCalledWith('up');
  });

  it('has Enter → select(false)', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    seq['Enter']();
    expect(app.select).toHaveBeenCalledWith(false);
  });

  it('has G → goToBottom', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    seq['G']();
    expect(app.goToBottom).toHaveBeenCalled();
  });

  it('has dd → removeFromWatchLater', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    seq['dd']();
    expect(app.removeFromWatchLater).toHaveBeenCalled();
  });

  it('does not have dd on watch page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('dd');
  });

  it('does not have G on watch page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('G');
  });

  it('does not have ArrowDown on watch page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('ArrowDown');
  });

  it('does not have Enter on watch page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('Enter');
  });

  it('listing keys work on subscriptions page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'subscriptions' }));
    expect(seq).toHaveProperty('dd');
    expect(seq).toHaveProperty('ArrowDown');
    expect(seq).toHaveProperty('ArrowUp');
    expect(seq).toHaveProperty('Enter');
    expect(seq).toHaveProperty('G');
  });
});

// =============================================================================
// (3) Listing + !filterActive + !searchActive
// =============================================================================
describe('getYouTubeKeySequences - listing, no filter/search', () => {
  let app;

  beforeEach(() => {
    app = makeApp();
    mockNoVideoContext();
  });

  it('has j/k/h/l/u when filter and search inactive', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home', filterActive: false, searchActive: false }));
    expect(seq).toHaveProperty('j');
    expect(seq).toHaveProperty('k');
    expect(seq).toHaveProperty('h');
    expect(seq).toHaveProperty('l');
    expect(seq).toHaveProperty('u');
  });

  it('j → navigate("down")', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    seq['j']();
    expect(app.navigate).toHaveBeenCalledWith('down');
  });

  it('k → navigate("up")', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    seq['k']();
    expect(app.navigate).toHaveBeenCalledWith('up');
  });

  it('h → navigate("left")', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    seq['h']();
    expect(app.navigate).toHaveBeenCalledWith('left');
  });

  it('l → navigate("right")', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    seq['l']();
    expect(app.navigate).toHaveBeenCalledWith('right');
  });

  it('u → undoWatchLaterRemoval', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    seq['u']();
    expect(app.undoWatchLaterRemoval).toHaveBeenCalled();
  });

  it('does NOT have j/k/h/l/u when filterActive', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home', filterActive: true }));
    expect(seq).not.toHaveProperty('j');
    expect(seq).not.toHaveProperty('k');
    expect(seq).not.toHaveProperty('h');
    expect(seq).not.toHaveProperty('l');
    expect(seq).not.toHaveProperty('u');
  });

  it('does NOT have j/k/h/l/u when searchActive', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home', searchActive: true }));
    expect(seq).not.toHaveProperty('j');
    expect(seq).not.toHaveProperty('k');
    expect(seq).not.toHaveProperty('h');
    expect(seq).not.toHaveProperty('l');
    expect(seq).not.toHaveProperty('u');
  });

  it('does NOT have j/k (listing nav) on watch page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    // j/k should not exist as listing nav on watch — watch page uses h/l for seek
    expect(seq).not.toHaveProperty('j');
    expect(seq).not.toHaveProperty('k');
  });
});

// =============================================================================
// (4) Watch page basics
// =============================================================================
describe('getYouTubeKeySequences - watch page', () => {
  let app;

  beforeEach(() => {
    app = makeApp();
    mockNoVideoContext();
  });

  it('has C-f → nextCommentPage', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['C-f']();
    expect(app.nextCommentPage).toHaveBeenCalled();
  });

  it('has C-b → prevCommentPage', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['C-b']();
    expect(app.prevCommentPage).toHaveBeenCalled();
  });

  it('has space → togglePlayPause', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq[' ']();
    expect(player.togglePlayPause).toHaveBeenCalled();
  });

  it('does not have C-f on listing page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    expect(seq).not.toHaveProperty('C-f');
  });

  it('does not have space on listing page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    expect(seq).not.toHaveProperty(' ');
  });
});

// =============================================================================
// (5) Watch page with video context
// =============================================================================
describe('getYouTubeKeySequences - watch page with video context', () => {
  let app;

  beforeEach(() => {
    app = makeApp();
    mockVideoContext();
  });

  afterEach(() => {
    mockNoVideoContext();
  });

  it('has gc → navigateTo(channelUrl + /videos)', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).toHaveProperty('gc');
  });

  it('has g1 → setPlaybackRate(1)', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['g1']();
    expect(player.setPlaybackRate).toHaveBeenCalledWith(1);
  });

  it('has g2 → setPlaybackRate(2)', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['g2']();
    expect(player.setPlaybackRate).toHaveBeenCalledWith(2);
  });

  it('has yy → copyVideoUrl', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).toHaveProperty('yy');
  });

  it('has yt → copyVideoTitle', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).toHaveProperty('yt');
  });

  it('has Y → copyVideoUrlAtTime', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).toHaveProperty('Y');
  });

  it('has zo → openDrawer("description")', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['zo']();
    expect(app.openDrawer).toHaveBeenCalledWith('description');
  });

  it('has zc → closeDrawer', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['zc']();
    expect(app.closeDrawer).toHaveBeenCalled();
  });

  it('has f → openDrawer("chapters")', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['f']();
    expect(app.openDrawer).toHaveBeenCalledWith('chapters');
  });

  it('has ms → toggleSubscribe', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).toHaveProperty('ms');
  });

  it('has m → toggleMute', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['m']();
    expect(player.toggleMute).toHaveBeenCalled();
  });

  it('has c → toggleCaptions', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['c']();
    expect(player.toggleCaptions).toHaveBeenCalled();
  });

  it('has h → seekRelative(-10)', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['h']();
    expect(player.seekRelative).toHaveBeenCalledWith(-10);
  });

  it('has l → seekRelative(10)', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['l']();
    expect(player.seekRelative).toHaveBeenCalledWith(10);
  });

  it('has t → openTranscriptDrawer', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['t']();
    expect(app.openTranscriptDrawer).toHaveBeenCalled();
  });

  it('does NOT have ctx-dependent keys without video context', () => {
    mockNoVideoContext();
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('gc');
    expect(seq).not.toHaveProperty('g1');
    expect(seq).not.toHaveProperty('yy');
    expect(seq).not.toHaveProperty('Y');
    expect(seq).not.toHaveProperty('ms');
    expect(seq).not.toHaveProperty('f');
  });

  it('does not have gc when channelUrl is missing', () => {
    mockVideoContext({ channelUrl: null });
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('gc');
  });
});

// =============================================================================
// Null app safety
// =============================================================================
describe('getYouTubeKeySequences - null app safety', () => {
  beforeEach(() => {
    mockNoVideoContext();
  });

  it('handles null app gracefully for dd', () => {
    const seq = getYouTubeKeySequences(null, makeContext({ pageType: 'home' }));
    expect(() => seq['dd']()).not.toThrow();
  });

  it('handles null app gracefully for mw', () => {
    const seq = getYouTubeKeySequences(null, makeContext({ pageType: 'home' }));
    expect(() => seq['mw']()).not.toThrow();
  });

  it('handles null app gracefully for /', () => {
    const seq = getYouTubeKeySequences(null, makeContext({ pageType: 'home' }));
    expect(() => seq['/']()).not.toThrow();
  });

  it('handles null app gracefully for :', () => {
    const seq = getYouTubeKeySequences(null, makeContext({ pageType: 'home' }));
    expect(() => seq[':']()).not.toThrow();
  });

  it('handles null app gracefully for watch page bindings', () => {
    const seq = getYouTubeKeySequences(null, makeContext({ pageType: 'watch' }));
    expect(() => seq['C-f']()).not.toThrow();
    expect(() => seq['C-b']()).not.toThrow();
  });
});

// =============================================================================
// getYouTubeBlockedNativeKeys
// =============================================================================
describe('getYouTubeBlockedNativeKeys', () => {
  it('returns full blocked keys list on watch page', () => {
    const result = getYouTubeBlockedNativeKeys(makeContext({ pageType: 'watch' }));
    expect(result).toEqual(['f', 'm', 'c', 't', 'j', 'k', 'l', ' ', 'h']);
  });

  it('returns empty array on home page', () => {
    const result = getYouTubeBlockedNativeKeys(makeContext({ pageType: 'home' }));
    expect(result).toEqual([]);
  });

  it('returns empty array on subscriptions page', () => {
    const result = getYouTubeBlockedNativeKeys(makeContext({ pageType: 'subscriptions' }));
    expect(result).toEqual([]);
  });

  it('returns empty array when pageType is null', () => {
    const result = getYouTubeBlockedNativeKeys(makeContext({ pageType: null }));
    expect(result).toEqual([]);
  });

  it('returns blocked keys regardless of other context flags on watch page', () => {
    const result = getYouTubeBlockedNativeKeys(makeContext({
      pageType: 'watch',
      filterActive: true,
      searchActive: true,
      drawer: 'settings',
    }));
    expect(result).toEqual(['f', 'm', 'c', 't', 'j', 'k', 'l', ' ', 'h']);
  });
});

// =============================================================================
// getYouTubeCommands - display keys
// =============================================================================
describe('getYouTubeCommands - Not interested display key', () => {
  let app;

  beforeEach(() => {
    app = {
      dismissVideo: vi.fn(),
      openPalette: vi.fn(),
      exitFocusMode: vi.fn(),
      executeSort: vi.fn(),
    };
  });

  it('shows D D as key for Not interested on listing pages', () => {
    getYouTubePageType.mockReturnValue('home');
    const commands = getYouTubeCommands(app);
    const notInterested = commands.find(c => c.label === 'Not interested');
    expect(notInterested).toBeDefined();
    expect(notInterested.keys).toBe('D D');
  });

  it('shows M S as key for Subscribe on watch page', () => {
    getYouTubePageType.mockReturnValue('watch');
    getDataProvider.mockReturnValue({
      getVideoContext: () => ({ videoId: 'abc', channelUrl: '/c/test', channelName: 'Test', isSubscribed: false }),
    });
    const commands = getYouTubeCommands(app);
    const sub = commands.find(c => c.label === 'Subscribe');
    expect(sub).toBeDefined();
    expect(sub.keys).toBe('M S');
    // Restore default mock
    getDataProvider.mockReturnValue({
      getVideoContext: () => null,
    });
  });
});
