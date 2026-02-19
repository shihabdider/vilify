// Tests for :help command palette entry in YouTube commands

import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('../../core/help-window', () => ({
  openHelpWindow: vi.fn(),
}));

import { getYouTubeCommands } from './commands';
import { openHelpWindow } from '../../core/help-window';

describe('getYouTubeCommands - :help palette entry', () => {
  let app: any;

  beforeEach(() => {
    app = {
      dismissVideo: vi.fn(),
      openPalette: vi.fn(),
      exitFocusMode: vi.fn(),
      executeSort: vi.fn(),
      openSettings: vi.fn(),
    };
  });

  it('includes a :help command entry', () => {
    const commands = getYouTubeCommands(app);
    const helpCmd = commands.find((c: any) => c.keys === ':help');
    expect(helpCmd).toBeDefined();
    expect(helpCmd.label).toBe('Show keybind help');
    expect(helpCmd.icon).toBe('?');
  });

  it(':help command entry calls openHelpWindow', () => {
    const commands = getYouTubeCommands(app);
    const helpCmd = commands.find((c: any) => c.keys === ':help');
    helpCmd.action();
    expect(openHelpWindow).toHaveBeenCalled();
  });
});
