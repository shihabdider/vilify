// Tests for YouTube key sequence bindings (dd, mw on listing pages)
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing
vi.mock('./player.js', () => ({
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

vi.mock('./scraper.js', () => ({
  getYouTubePageType: vi.fn(() => 'home'),
}));

vi.mock('./data/index.js', () => ({
  getDataProvider: vi.fn(() => ({
    getVideoContext: vi.fn(() => null),
  })),
}));

vi.mock('../../core/view.js', () => ({
  showMessage: vi.fn(),
}));

import { getYouTubeKeySequences, getYouTubeCommands, getYouTubeSingleKeyActions, getYouTubeBlockedNativeKeys } from './commands.js';
import { getYouTubePageType } from './scraper.js';
import { getDataProvider } from './data/index.js';

// Helper to create a KeyContext for tests
function makeContext(overrides = {}) {
  return { pageType: null, filterActive: false, searchActive: false, drawer: null, ...overrides };
}

describe('getYouTubeKeySequences - dd and mw on listing pages', () => {
  let app;

  beforeEach(() => {
    app = {
      removeFromWatchLater: vi.fn(),
      addToWatchLater: vi.fn(),
      openPalette: vi.fn(),
      openLocalFilter: vi.fn(),
      openSearch: vi.fn(),
      goToTop: vi.fn(),
      goToBottom: vi.fn(),
      navigate: vi.fn(),
      select: vi.fn(),
      undoWatchLaterRemoval: vi.fn(),
    };
  });

  it('has dd sequence on listing pages', () => {
    getYouTubePageType.mockReturnValue('home');
    const sequences = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    expect(sequences).toHaveProperty('dd');
  });

  it('has mw sequence on listing pages', () => {
    getYouTubePageType.mockReturnValue('home');
    const sequences = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    expect(sequences).toHaveProperty('mw');
  });

  it('dd calls removeFromWatchLater', () => {
    getYouTubePageType.mockReturnValue('home');
    const sequences = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    sequences['dd']();
    expect(app.removeFromWatchLater).toHaveBeenCalled();
  });

  it('mw calls addToWatchLater', () => {
    getYouTubePageType.mockReturnValue('home');
    const sequences = getYouTubeKeySequences(app, makeContext({ pageType: 'home' }));
    sequences['mw']();
    expect(app.addToWatchLater).toHaveBeenCalled();
  });

  it('does not have dd on watch page', () => {
    getYouTubePageType.mockReturnValue('watch');
    const sequences = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(sequences).not.toHaveProperty('dd');
  });

  it('has mw on watch page', () => {
    getYouTubePageType.mockReturnValue('watch');
    const sequences = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(sequences).toHaveProperty('mw');
  });

  it('mw calls addToWatchLater on watch page', () => {
    getYouTubePageType.mockReturnValue('watch');
    const sequences = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    sequences['mw']();
    expect(app.addToWatchLater).toHaveBeenCalled();
  });

  it('dd works on subscriptions page', () => {
    getYouTubePageType.mockReturnValue('subscriptions');
    const sequences = getYouTubeKeySequences(app, makeContext({ pageType: 'subscriptions' }));
    expect(sequences).toHaveProperty('dd');
    sequences['dd']();
    expect(app.removeFromWatchLater).toHaveBeenCalled();
  });

  it('mw works on subscriptions page', () => {
    getYouTubePageType.mockReturnValue('subscriptions');
    const sequences = getYouTubeKeySequences(app, makeContext({ pageType: 'subscriptions' }));
    expect(sequences).toHaveProperty('mw');
    sequences['mw']();
    expect(app.addToWatchLater).toHaveBeenCalled();
  });

  it('handles null app gracefully for dd', () => {
    getYouTubePageType.mockReturnValue('home');
    const sequences = getYouTubeKeySequences(null, makeContext({ pageType: 'home' }));
    expect(() => sequences['dd']()).not.toThrow();
  });

  it('handles null app gracefully for mw', () => {
    getYouTubePageType.mockReturnValue('home');
    const sequences = getYouTubeKeySequences(null, makeContext({ pageType: 'home' }));
    expect(() => sequences['mw']()).not.toThrow();
  });

  it('has ms sequence on watch page with video context', () => {
    getYouTubePageType.mockReturnValue('watch');
    getDataProvider.mockReturnValue({
      getVideoContext: () => ({ videoId: 'abc', channelUrl: '/c/test', channelName: 'Test', isSubscribed: false }),
    });
    const sequences = getYouTubeKeySequences(app, makeContext({ pageType: 'watch' }));
    expect(sequences).toHaveProperty('ms');
    // Restore default mock
    getDataProvider.mockReturnValue({
      getVideoContext: () => null,
    });
  });

  it('does not have M single-key action on watch page (merged into sequences as Y)', () => {
    getYouTubePageType.mockReturnValue('watch');
    getDataProvider.mockReturnValue({
      getVideoContext: () => ({ videoId: 'abc', channelUrl: '/c/test', channelName: 'Test', isSubscribed: false }),
    });
    const actions = getYouTubeSingleKeyActions(app);
    expect(actions).not.toHaveProperty('M');
    // Restore default mock
    getDataProvider.mockReturnValue({
      getVideoContext: () => null,
    });
  });
});

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
