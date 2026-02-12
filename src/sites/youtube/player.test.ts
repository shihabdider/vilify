// @vitest-environment jsdom
// Tests for player.ts — YouTube player controls with type annotations

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getVideo,
  togglePlayPause,
  seekRelative,
  setPlaybackRate,
  toggleMute,
  toggleFullscreen,
  toggleTheaterMode,
  toggleCaptions,
  seekToChapter,
  seekToPercent,
  applyDefaultVideoSettings,
  playerControls,
} from './player';

// =============================================================================
// Helpers
// =============================================================================

/** Create a mock <video> with class html5-main-video and add to DOM */
function addMockVideo(overrides: Partial<HTMLVideoElement> = {}): HTMLVideoElement {
  const video = document.createElement('video');
  video.className = 'html5-main-video';
  // jsdom doesn't support real media, so stub properties
  Object.defineProperty(video, 'paused', { value: overrides.paused ?? true, writable: true, configurable: true });
  Object.defineProperty(video, 'duration', { value: overrides.duration ?? 100, writable: true, configurable: true });
  Object.defineProperty(video, 'currentTime', { value: overrides.currentTime ?? 0, writable: true, configurable: true });
  Object.defineProperty(video, 'playbackRate', { value: overrides.playbackRate ?? 1, writable: true, configurable: true });
  Object.defineProperty(video, 'muted', { value: overrides.muted ?? false, writable: true, configurable: true });
  video.play = vi.fn().mockResolvedValue(undefined);
  video.pause = vi.fn();
  document.body.appendChild(video);
  return video;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

// =============================================================================
// getVideo
// =============================================================================
describe('getVideo', () => {
  it('returns null when no video element exists', () => {
    expect(getVideo()).toBeNull();
  });

  it('returns the video element when present', () => {
    const video = addMockVideo();
    expect(getVideo()).toBe(video);
  });
});

// =============================================================================
// togglePlayPause
// =============================================================================
describe('togglePlayPause', () => {
  it('does nothing when no video', () => {
    expect(() => togglePlayPause()).not.toThrow();
  });

  it('plays when paused', () => {
    const video = addMockVideo({ paused: true } as any);
    togglePlayPause();
    expect(video.play).toHaveBeenCalled();
  });

  it('pauses when playing', () => {
    const video = addMockVideo({ paused: false } as any);
    togglePlayPause();
    expect(video.pause).toHaveBeenCalled();
  });
});

// =============================================================================
// seekRelative
// =============================================================================
describe('seekRelative', () => {
  it('does nothing when no video', () => {
    expect(() => seekRelative(10)).not.toThrow();
  });

  it('seeks forward by seconds', () => {
    const video = addMockVideo({ currentTime: 20, duration: 100 } as any);
    seekRelative(10);
    expect(video.currentTime).toBe(30);
  });

  it('seeks backward by seconds', () => {
    const video = addMockVideo({ currentTime: 20, duration: 100 } as any);
    seekRelative(-5);
    expect(video.currentTime).toBe(15);
  });

  it('clamps to 0 when seeking before start', () => {
    const video = addMockVideo({ currentTime: 3, duration: 100 } as any);
    seekRelative(-10);
    expect(video.currentTime).toBe(0);
  });

  it('clamps to duration when seeking past end', () => {
    const video = addMockVideo({ currentTime: 95, duration: 100 } as any);
    seekRelative(10);
    expect(video.currentTime).toBe(100);
  });
});

// =============================================================================
// setPlaybackRate
// =============================================================================
describe('setPlaybackRate', () => {
  it('does nothing when no video', () => {
    expect(() => setPlaybackRate(2)).not.toThrow();
  });

  it('sets the playback rate', () => {
    const video = addMockVideo();
    setPlaybackRate(1.5);
    expect(video.playbackRate).toBe(1.5);
  });

  it('sets playback rate to 2x', () => {
    const video = addMockVideo();
    setPlaybackRate(2);
    expect(video.playbackRate).toBe(2);
  });
});

// =============================================================================
// toggleMute
// =============================================================================
describe('toggleMute', () => {
  it('does nothing when no video', () => {
    expect(() => toggleMute()).not.toThrow();
  });

  it('mutes when unmuted', () => {
    const video = addMockVideo({ muted: false } as any);
    toggleMute();
    expect(video.muted).toBe(true);
  });

  it('unmutes when muted', () => {
    const video = addMockVideo({ muted: true } as any);
    toggleMute();
    expect(video.muted).toBe(false);
  });
});

// =============================================================================
// toggleFullscreen
// =============================================================================
describe('toggleFullscreen', () => {
  it('does nothing when no player element', () => {
    expect(() => toggleFullscreen()).not.toThrow();
  });

  it('clicks fullscreen button when present', () => {
    const player = document.createElement('div');
    player.id = 'movie_player';
    const fsBtn = document.createElement('button');
    fsBtn.className = 'ytp-fullscreen-button';
    fsBtn.click = vi.fn();
    player.appendChild(fsBtn);
    document.body.appendChild(player);

    toggleFullscreen();
    expect(fsBtn.click).toHaveBeenCalled();
  });
});

// =============================================================================
// toggleTheaterMode
// =============================================================================
describe('toggleTheaterMode', () => {
  it('does nothing when no theater button', () => {
    expect(() => toggleTheaterMode()).not.toThrow();
  });

  it('clicks theater button when present', () => {
    const btn = document.createElement('button');
    btn.className = 'ytp-size-button';
    btn.click = vi.fn();
    document.body.appendChild(btn);

    toggleTheaterMode();
    expect(btn.click).toHaveBeenCalled();
  });
});

// =============================================================================
// toggleCaptions
// =============================================================================
describe('toggleCaptions', () => {
  it('does nothing when no CC button', () => {
    expect(() => toggleCaptions()).not.toThrow();
  });

  it('clicks CC button when present', () => {
    const btn = document.createElement('button');
    btn.className = 'ytp-subtitles-button';
    btn.setAttribute('aria-pressed', 'false');
    btn.click = vi.fn();
    document.body.appendChild(btn);

    toggleCaptions();
    expect(btn.click).toHaveBeenCalled();
  });
});

// =============================================================================
// seekToChapter
// =============================================================================
describe('seekToChapter', () => {
  it('does nothing when no video', () => {
    expect(() => seekToChapter({ title: 'Intro', time: 0, timeText: '0:00' })).not.toThrow();
  });

  it('seeks to chapter time', () => {
    const video = addMockVideo({ duration: 600 } as any);
    seekToChapter({ title: 'Main Topic', time: 65, timeText: '1:05' });
    expect(video.currentTime).toBe(65);
  });

  it('seeks to chapter at time 0', () => {
    const video = addMockVideo({ duration: 600 } as any);
    seekToChapter({ title: 'Start', time: 0, timeText: '0:00' });
    expect(video.currentTime).toBe(0);
  });
});

// =============================================================================
// seekToPercent
// =============================================================================
describe('seekToPercent', () => {
  it('does nothing when no video', () => {
    expect(() => seekToPercent(50)).not.toThrow();
  });

  it('seeks to midpoint at 50%', () => {
    const video = addMockVideo({ duration: 200 } as any);
    seekToPercent(50);
    expect(video.currentTime).toBe(100);
  });

  it('seeks to start at 0%', () => {
    const video = addMockVideo({ duration: 200 } as any);
    seekToPercent(0);
    expect(video.currentTime).toBe(0);
  });

  it('seeks to end at 100%', () => {
    const video = addMockVideo({ duration: 200 } as any);
    seekToPercent(100);
    expect(video.currentTime).toBe(200);
  });

  it('does nothing when duration is 0', () => {
    const video = addMockVideo({ duration: 0 } as any);
    seekToPercent(50);
    // Should not change since !video.duration is falsy for 0
    expect(video.currentTime).toBe(0);
  });
});

// =============================================================================
// applyDefaultVideoSettings
// =============================================================================
describe('applyDefaultVideoSettings', () => {
  it('does nothing when no video', () => {
    expect(() => applyDefaultVideoSettings()).not.toThrow();
  });

  it('sets playback rate to 2x when different', () => {
    const video = addMockVideo({ playbackRate: 1 } as any);
    applyDefaultVideoSettings();
    expect(video.playbackRate).toBe(2);
  });

  it('does not change rate when already 2x', () => {
    const video = addMockVideo({ playbackRate: 2 } as any);
    // Should not error or change
    applyDefaultVideoSettings();
    expect(video.playbackRate).toBe(2);
  });
});

// =============================================================================
// playerControls legacy export
// =============================================================================
describe('playerControls', () => {
  it('play calls video.play', () => {
    const video = addMockVideo();
    playerControls.play();
    expect(video.play).toHaveBeenCalled();
  });

  it('pause calls video.pause', () => {
    const video = addMockVideo();
    playerControls.pause();
    expect(video.pause).toHaveBeenCalled();
  });

  it('seek sets currentTime directly', () => {
    const video = addMockVideo({ duration: 100 } as any);
    playerControls.seek(42);
    expect(video.currentTime).toBe(42);
  });

  it('toggle is togglePlayPause', () => {
    expect(playerControls.toggle).toBe(togglePlayPause);
  });

  it('skip is seekRelative', () => {
    expect(playerControls.skip).toBe(seekRelative);
  });

  it('setSpeed is setPlaybackRate', () => {
    expect(playerControls.setSpeed).toBe(setPlaybackRate);
  });

  it('fullscreen is toggleFullscreen', () => {
    expect(playerControls.fullscreen).toBe(toggleFullscreen);
  });
});
