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

vi.mock('./watch', () => ({
  updateLikeButton: vi.fn(),
  updateDislikeButton: vi.fn(),
}));

import { getYouTubeKeySequences, getYouTubeCommands, getYouTubeBlockedNativeKeys, likeVideo, dislikeVideo } from './commands';
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

  it('does NOT have / on watch page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('/');
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

  it('has mw → addToWatchLater (listing only)', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    seq['mw']();
    expect(app.addToWatchLater).toHaveBeenCalled();
  });

  it('does NOT have mw on watch page (uses sw)', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('mw');
  });

  // g-prefixed navigation sequences
  const gNavTests = [
    ['gh', '/', false],
    ['gs', '/feed/subscriptions', false],
    ['gy', '/feed/history', true],
    ['gl', '/feed/library', true],
    ['gw', '/playlist?list=WL', false],
  ];
  for (const [key, _path, keepPrefix] of gNavTests) {
    it(`has ${key} navigation sequence on listing page`, () => {
      const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
      expect(seq).toHaveProperty(key);
      expect(typeof seq[key]).toBe('function');
    });

    it(`has ${key} navigation sequence on watch page`, () => {
      const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
      const watchKey = keepPrefix ? '\\' + key : key;
      expect(seq).toHaveProperty(watchKey);
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

  it('has S-Enter → select(true)', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    expect(seq).toHaveProperty('S-Enter');
    seq['S-Enter']();
    expect(app.select).toHaveBeenCalledWith(true);
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

  it('has ] → nextCommentPage', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq[']']();
    expect(app.nextCommentPage).toHaveBeenCalled();
  });

  it('has [ → prevCommentPage', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['[']();
    expect(app.prevCommentPage).toHaveBeenCalled();
  });

  it('does not have ] on listing page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    expect(seq).not.toHaveProperty(']');
  });

  it('does not have space in sequences (YouTube native handles it)', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty(' ');
  });

  it('has f → toggleFullscreen on watch page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['f']();
    expect(player.toggleFullscreen).toHaveBeenCalled();
  });

  it('does not have f on listing page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    expect(seq).not.toHaveProperty('f');
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
    seq['\\g1']();
    expect(player.setPlaybackRate).toHaveBeenCalledWith(1);
  });

  it('has g2 → setPlaybackRate(2)', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['\\g2']();
    expect(player.setPlaybackRate).toHaveBeenCalledWith(2);
  });

  it('has yy → copyVideoUrl', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).toHaveProperty('\\yy');
  });

  it('has yt → copyVideoTitle', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).toHaveProperty('\\yt');
  });

  it('has Y → copyVideoUrlAtTime', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).toHaveProperty('\\Y');
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

  it('has zp → openDrawer("chapters")', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['zp']();
    expect(app.openDrawer).toHaveBeenCalledWith('chapters');
  });

  it('has ss → toggleSubscribe', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).toHaveProperty('ss');
  });

  it('does NOT have m in sequences (handled by YouTube native)', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('m');
    expect(seq).not.toHaveProperty('\\m');
  });

  it('does NOT have c in sequences (handled by YouTube native)', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('c');
  });

  it('does NOT have h or l in sequences on watch page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('h');
    expect(seq).not.toHaveProperty('l');
  });

  it('has t → openTranscriptDrawer', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    seq['t']();
    expect(app.openTranscriptDrawer).toHaveBeenCalled();
  });

  it('does NOT have ctx-dependent keys without video context', () => {
    mockNoVideoContext();
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('\\gc');
    expect(seq).not.toHaveProperty('\\g1');
    expect(seq).not.toHaveProperty('\\yy');
    expect(seq).not.toHaveProperty('\\Y');
    expect(seq).not.toHaveProperty('ss');
    expect(seq).not.toHaveProperty('zp');
  });

  it('does not have gc when channelUrl is missing', () => {
    mockVideoContext({ channelUrl: null });
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('\\gc');
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
    expect(() => seq[']']()).not.toThrow();
    expect(() => seq['[']()).not.toThrow();
  });
});

// =============================================================================
// getYouTubeBlockedNativeKeys
// =============================================================================
describe('getYouTubeBlockedNativeKeys', () => {
  it('returns full blocked keys list on watch page', () => {
    const result = getYouTubeBlockedNativeKeys(makeContext({ pageType: 'watch' }));
    expect(result).toEqual(['\\', 'g', 's', 'z', 't', 'i', ':', ' ', 'f']);
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
    expect(result).toEqual(['\\', 'g', 's', 'z', 't', 'i', ':', ' ', 'f']);
  });

  it('includes f in blocked keys on watch page', () => {
    const result = getYouTubeBlockedNativeKeys(makeContext({ pageType: 'watch' }));
    expect(result).toContain('f');
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

  it('shows S S as key for Subscribe on watch page', () => {
    getYouTubePageType.mockReturnValue('watch');
    getDataProvider.mockReturnValue({
      getVideoContext: () => ({ videoId: 'abc', channelUrl: '/c/test', channelName: 'Test', isSubscribed: false }),
    });
    const commands = getYouTubeCommands(app);
    const sub = commands.find(c => c.label === 'Subscribe');
    expect(sub).toBeDefined();
    expect(sub.keys).toBe('S S');
    // Restore default mock
    getDataProvider.mockReturnValue({
      getVideoContext: () => null,
    });
  });
});

// =============================================================================
// Type contract tests — verify return types match annotations
// =============================================================================
describe('type contracts', () => {
  let app;

  beforeEach(() => {
    app = makeApp();
    mockNoVideoContext();
  });

  it('getYouTubeCommands returns an array', () => {
    getYouTubePageType.mockReturnValue('home');
    const result = getYouTubeCommands(app);
    expect(Array.isArray(result)).toBe(true);
  });

  it('getYouTubeKeySequences returns a plain object with function values', () => {
    const result = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
    for (const val of Object.values(result)) {
      expect(typeof val).toBe('function');
    }
  });

  it('getYouTubeBlockedNativeKeys returns an array of strings', () => {
    const result = getYouTubeBlockedNativeKeys(makeContext({ pageType: 'watch' }));
    expect(Array.isArray(result)).toBe(true);
    for (const item of result) {
      expect(typeof item).toBe('string');
    }
  });

  it('getYouTubeBlockedNativeKeys returns empty array for non-watch', () => {
    const result = getYouTubeBlockedNativeKeys(makeContext({ pageType: 'home' }));
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// Scroll keybinds (C-d, C-u, C-e, C-y)
// =============================================================================
describe('getYouTubeKeySequences - scroll keybinds', () => {
  let app;

  beforeEach(() => {
    app = makeApp();
    mockNoVideoContext();
  });

  it('has C-d → navigate("down", 10) on listing page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    expect(seq).toHaveProperty('C-d');
    seq['C-d']();
    expect(app.navigate).toHaveBeenCalledWith('down', 10);
  });

  it('has C-u → navigate("up", 10) on listing page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    expect(seq).toHaveProperty('C-u');
    seq['C-u']();
    expect(app.navigate).toHaveBeenCalledWith('up', 10);
  });

  it('has C-e → navigate("down") on listing page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    expect(seq).toHaveProperty('C-e');
    seq['C-e']();
    expect(app.navigate).toHaveBeenCalledWith('down');
  });

  it('has C-y → navigate("up") on listing page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    expect(seq).toHaveProperty('C-y');
    seq['C-y']();
    expect(app.navigate).toHaveBeenCalledWith('up');
  });

  it('does not have C-d on watch page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('C-d');
  });

  it('does not have C-u on watch page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('C-u');
  });

  it('does not have C-e on watch page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('C-e');
  });

  it('does not have C-y on watch page', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('C-y');
  });

  it('C-d is NOT in getYouTubeCommands shortlist', () => {
    getYouTubePageType.mockReturnValue('home');
    const commands = getYouTubeCommands(app);
    const cdCommand = commands.find(c => c.keys === 'C-d' || c.keys === 'Ctrl-D');
    expect(cdCommand).toBeUndefined();
  });

  it('handles null app gracefully for C-d', () => {
    const seq = getYouTubeKeySequences(null, makeContext({ pageType: 'home' }));
    expect(() => seq['C-d']()).not.toThrow();
  });
});

// =============================================================================
// Like / Dislike key sequences
// =============================================================================
describe('getYouTubeKeySequences - like/dislike', () => {
  let app;

  beforeEach(() => {
    app = makeApp();
    mockVideoContext();
  });

  afterEach(() => {
    mockNoVideoContext();
  });

  it('has sl → likeVideo on watch page with video context', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).toHaveProperty('sl');
    expect(typeof seq['sl']).toBe('function');
  });

  it('has sd → dislikeVideo on watch page with video context', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).toHaveProperty('sd');
    expect(typeof seq['sd']).toBe('function');
  });

  it('does not have sl on listing pages', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    expect(seq).not.toHaveProperty('sl');
  });

  it('does not have sd on listing pages', () => {
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    expect(seq).not.toHaveProperty('sd');
  });

  it('does not have sl without video context', () => {
    mockNoVideoContext();
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('sl');
  });

  it('does not have sd without video context', () => {
    mockNoVideoContext();
    const seq = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(seq).not.toHaveProperty('sd');
  });
});

// =============================================================================
// likeVideo / dislikeVideo DOM interaction
// =============================================================================
describe('likeVideo', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clicks the like button when found', () => {
    const mockBtn = { click: vi.fn(), getAttribute: vi.fn(() => null) };
    vi.stubGlobal('document', {
      querySelector: vi.fn((sel: string) => {
        if (sel.includes('like')) return mockBtn;
        return null;
      }),
    });
    likeVideo();
    expect(mockBtn.click).toHaveBeenCalled();
  });

  it('does not throw when no like button is found', () => {
    vi.stubGlobal('document', {
      querySelector: vi.fn(() => null),
    });
    expect(() => likeVideo()).not.toThrow();
  });
});

describe('dislikeVideo', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clicks the dislike button when found', () => {
    const mockBtn = { click: vi.fn(), getAttribute: vi.fn(() => null) };
    vi.stubGlobal('document', {
      querySelector: vi.fn((sel: string) => {
        if (sel.includes('dislike')) return mockBtn;
        return null;
      }),
    });
    dislikeVideo();
    expect(mockBtn.click).toHaveBeenCalled();
  });

  it('does not throw when no dislike button is found', () => {
    vi.stubGlobal('document', {
      querySelector: vi.fn(() => null),
    });
    expect(() => dislikeVideo()).not.toThrow();
  });
});

// =============================================================================
// Command palette - Like / Dislike entries
// =============================================================================
describe('getYouTubeCommands - like/dislike palette entries', () => {
  let app;

  beforeEach(() => {
    app = {
      dismissVideo: vi.fn(),
      openPalette: vi.fn(),
      exitFocusMode: vi.fn(),
      executeSort: vi.fn(),
    };
  });

  it('has Like video command on watch page', () => {
    getYouTubePageType.mockReturnValue('watch');
    mockVideoContext();
    const commands = getYouTubeCommands(app);
    const like = commands.find(c => c.label === 'Like video');
    expect(like).toBeDefined();
    expect(like.keys).toBe('S L');
    mockNoVideoContext();
  });

  it('has Dislike video command on watch page', () => {
    getYouTubePageType.mockReturnValue('watch');
    mockVideoContext();
    const commands = getYouTubeCommands(app);
    const dislike = commands.find(c => c.label === 'Dislike video');
    expect(dislike).toBeDefined();
    expect(dislike.keys).toBe('S D');
    mockNoVideoContext();
  });

  it('does not have Like/Dislike commands on listing page', () => {
    getYouTubePageType.mockReturnValue('home');
    mockNoVideoContext();
    const commands = getYouTubeCommands(app);
    const like = commands.find(c => c.label === 'Like video');
    const dislike = commands.find(c => c.label === 'Dislike video');
    expect(like).toBeUndefined();
    expect(dislike).toBeUndefined();
  });
});
