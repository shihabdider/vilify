// Tests for YouTube key sequence bindings (dd, mw on listing pages)
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing
vi.mock('./player.js', () => ({
  toggleMute: vi.fn(),
  toggleCaptions: vi.fn(),
  seekRelative: vi.fn(),
  setPlaybackRate: vi.fn(),
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

import { getYouTubeKeySequences, getYouTubeCommands } from './commands.js';
import { getYouTubePageType } from './scraper.js';

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
    };
  });

  it('has dd sequence on listing pages', () => {
    getYouTubePageType.mockReturnValue('home');
    const sequences = getYouTubeKeySequences(app);
    expect(sequences).toHaveProperty('dd');
  });

  it('has mw sequence on listing pages', () => {
    getYouTubePageType.mockReturnValue('home');
    const sequences = getYouTubeKeySequences(app);
    expect(sequences).toHaveProperty('mw');
  });

  it('dd calls removeFromWatchLater', () => {
    getYouTubePageType.mockReturnValue('home');
    const sequences = getYouTubeKeySequences(app);
    sequences['dd']();
    expect(app.removeFromWatchLater).toHaveBeenCalled();
  });

  it('mw calls addToWatchLater', () => {
    getYouTubePageType.mockReturnValue('home');
    const sequences = getYouTubeKeySequences(app);
    sequences['mw']();
    expect(app.addToWatchLater).toHaveBeenCalled();
  });

  it('does not have dd on watch page', () => {
    getYouTubePageType.mockReturnValue('watch');
    const sequences = getYouTubeKeySequences(app);
    expect(sequences).not.toHaveProperty('dd');
  });

  it('does not have mw on watch page', () => {
    getYouTubePageType.mockReturnValue('watch');
    const sequences = getYouTubeKeySequences(app);
    expect(sequences).not.toHaveProperty('mw');
  });

  it('dd works on subscriptions page', () => {
    getYouTubePageType.mockReturnValue('subscriptions');
    const sequences = getYouTubeKeySequences(app);
    expect(sequences).toHaveProperty('dd');
    sequences['dd']();
    expect(app.removeFromWatchLater).toHaveBeenCalled();
  });

  it('mw works on subscriptions page', () => {
    getYouTubePageType.mockReturnValue('subscriptions');
    const sequences = getYouTubeKeySequences(app);
    expect(sequences).toHaveProperty('mw');
    sequences['mw']();
    expect(app.addToWatchLater).toHaveBeenCalled();
  });

  it('handles null app gracefully for dd', () => {
    getYouTubePageType.mockReturnValue('home');
    const sequences = getYouTubeKeySequences(null);
    expect(() => sequences['dd']()).not.toThrow();
  });

  it('handles null app gracefully for mw', () => {
    getYouTubePageType.mockReturnValue('home');
    const sequences = getYouTubeKeySequences(null);
    expect(() => sequences['mw']()).not.toThrow();
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
});
