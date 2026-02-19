// YouTube player controls
// All functions fail silently if video element not found (no messages - caller handles that)

import type { Chapter } from '../../types';
import { showMessage } from '../../core/view';

// =============================================================================
// VIDEO ELEMENT
// =============================================================================

/**
 * Get the main video element
 * @returns {HTMLVideoElement|null}
 * 
 * Examples:
 *   getVideo() => <video class="html5-main-video">
 *   getVideo() => null  // Not on watch page
 */
export function getVideo(): HTMLVideoElement | null {
  return document.querySelector<HTMLVideoElement>('video.html5-main-video');
}

// =============================================================================
// PLAYBACK CONTROLS
// =============================================================================

/**
 * Toggle play/pause
 * No-ops silently if video not found
 * @returns {void}
 * 
 * Examples:
 *   togglePlayPause()  // Pauses if playing, plays if paused
 */
export function togglePlayPause(): void {
  // Inventory: video element
  // Template: conditional on video state
  const video = getVideo();
  if (!video) return;

  if (video.paused) {
    video.play();
  } else {
    video.pause();
  }
}

/**
 * Seek forward or backward by seconds
 * Clamps to [0, duration]
 * @param {number} seconds - Positive to seek forward, negative to seek backward
 * @returns {void}
 * 
 * Examples:
 *   seekRelative(10)   // Forward 10s
 *   seekRelative(-5)   // Back 5s
 */
export function seekRelative(seconds: number): void {
  // Inventory: video element, seconds (Number)
  // Template: clamp to boundaries
  const video = getVideo();
  if (!video) return;

  const newTime = video.currentTime + seconds;
  video.currentTime = Math.max(0, Math.min(video.duration || 0, newTime));
  
  // Show feedback
  const sign = seconds >= 0 ? '+' : '−';
  showMessage(`${sign}${Math.abs(seconds)}s`);
}

/**
 * Set video playback speed
 * @param {number} rate - Playback rate (e.g., 0.5, 1, 1.5, 2)
 * @returns {void}
 * 
 * Examples:
 *   setPlaybackRate(1.5)  // Sets 1.5x
 *   setPlaybackRate(2)    // Sets 2x
 */
export function setPlaybackRate(rate: number): void {
  // Inventory: video element, rate (Number)
  // Template: simple assignment
  const video = getVideo();
  if (!video) return;

  video.playbackRate = rate;
  showMessage(`Speed: ${rate}x`);
}

/**
 * Toggle video mute state
 * @returns {void}
 * 
 * Examples:
 *   toggleMute()  // Mutes if unmuted, unmutes if muted
 */
export function toggleMute(): void {
  // Inventory: video element
  // Template: toggle boolean
  const video = getVideo();
  if (!video) return;

  video.muted = !video.muted;
  showMessage(video.muted ? 'Muted' : 'Unmuted');
}

// =============================================================================
// VIEW CONTROLS
// =============================================================================

/** Module-level flag to ensure fullscreenchange listener is added only once */
let fullscreenListenerAdded = false;

/**
 * Set up a fullscreenchange event listener that toggles the vilify-fullscreen
 * class on document.body. Idempotent — safe to call multiple times.
 * @returns {void}
 */
export function setupFullscreenListener(): void {
  if (fullscreenListenerAdded) return;
  fullscreenListenerAdded = true;

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement != null) {
      document.body.classList.add('vilify-fullscreen');
    } else {
      document.body.classList.remove('vilify-fullscreen');
    }
  });
}

/**
 * Toggle fullscreen mode by clicking YouTube's fullscreen button.
 * Also ensures the fullscreenchange listener is registered so that
 * Vilify's overlay elements are hidden/restored automatically.
 * @returns {void}
 *
 * Examples:
 *   toggleFullscreen()  // Enters or exits fullscreen
 */
export function toggleFullscreen(): void {
  // Inventory: player element, fullscreen button
  // Template: find and click button
  setupFullscreenListener();

  const player = document.querySelector('#movie_player');
  if (!player) return;

  const fsButton = player.querySelector('.ytp-fullscreen-button');
  if (fsButton) {
    const isFullscreen = document.fullscreenElement != null;
    fsButton.click();
    showMessage(isFullscreen ? 'Exit fullscreen' : 'Fullscreen');
  }
}

/**
 * Toggle theater mode by clicking YouTube's theater button
 * @returns {void}
 */
export function toggleTheaterMode(): void {
  // Inventory: theater button
  // Template: find and click button
  const theaterButton = document.querySelector('.ytp-size-button');
  if (theaterButton) {
    const isTheater = document.querySelector('ytd-watch-flexy')?.hasAttribute('theater');
    theaterButton.click();
    showMessage(isTheater ? 'Exit theater' : 'Theater mode');
  }
}

/**
 * Toggle captions by clicking YouTube's CC button
 * @returns {void}
 */
export function toggleCaptions(): void {
  // Inventory: CC button
  // Template: find and click button
  const ccButton = document.querySelector('.ytp-subtitles-button');
  if (ccButton) {
    const isOn = ccButton.getAttribute('aria-pressed') === 'true';
    ccButton.click();
    showMessage(isOn ? 'Captions off' : 'Captions on');
  }
}

// =============================================================================
// CHAPTER NAVIGATION
// =============================================================================

/**
 * Seek to a chapter's timestamp
 * @param {{ time: number, title?: string, timeText?: string }} chapter - Chapter object
 * @returns {void}
 * 
 * Examples:
 *   seekToChapter({ title: 'Main Topic', time: 65, timeText: '1:05' })
 */
export function seekToChapter(chapter: Chapter): void {
  // Inventory: video element, chapter (Compound with time)
  // Template: access compound field
  const video = getVideo();
  if (!video || chapter == null) return;

  video.currentTime = chapter.time;
}

/**
 * Seek to a percentage of the video duration
 * @param {number} percent - 0-100
 * @returns {void}
 * 
 * Examples:
 *   seekToPercent(50)  // Jump to middle
 *   seekToPercent(0)   // Jump to start
 */
export function seekToPercent(percent: number): void {
  // Inventory: video element, percent (Number)
  // Template: calculate and set
  const video = getVideo();
  if (!video || !video.duration) return;

  video.currentTime = video.duration * (percent / 100);
}

// =============================================================================
// DEFAULT SETTINGS
// =============================================================================

const DEFAULT_PLAYBACK_RATE: number = 2;

/**
 * Apply default video settings (2x playback speed)
 * Only changes if current rate is different
 * @returns {void}
 * 
 * Examples:
 *   applyDefaultVideoSettings()  // Sets playbackRate to 2
 */
export function applyDefaultVideoSettings(): void {
  // Inventory: video element
  // Template: conditional assignment
  const video = getVideo();
  if (!video) return;

  if (video.playbackRate !== DEFAULT_PLAYBACK_RATE) {
    video.playbackRate = DEFAULT_PLAYBACK_RATE;
  }
}

// =============================================================================
// LEGACY EXPORT (for backward compatibility)
// =============================================================================

export const playerControls = {
  play(): void {
    const video = getVideo();
    if (video) video.play();
  },
  pause(): void {
    const video = getVideo();
    if (video) video.pause();
  },
  toggle: togglePlayPause,
  seek(seconds: number): void {
    const video = getVideo();
    if (video) video.currentTime = seconds;
  },
  skip: seekRelative,
  setSpeed: setPlaybackRate,
  fullscreen: toggleFullscreen,
};
