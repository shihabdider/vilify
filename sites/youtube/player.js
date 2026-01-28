/**
 * YouTube Video Player
 * 
 * Video player control functions.
 * All functions no-op silently if video element not found.
 */

/**
 * Valid YouTube playback rates.
 */
const VALID_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * Get the video element, or null if not found.
 */
function getVideoElement() {
  return document.querySelector('video.html5-main-video');
}

/**
 * [I/O] Toggle video play/pause state.
 *
 * Examples:
 *   togglePlayPause()  // Playing -> paused, or paused -> playing
 */
export function togglePlayPause() {
  const video = getVideoElement();
  if (!video) return;
  
  if (video.paused) {
    video.play();
  } else {
    video.pause();
  }
}

/**
 * [I/O] Seek forward/backward by seconds.
 *
 * Examples:
 *   seekRelative(10)   // Forward 10s
 *   seekRelative(-5)   // Back 5s
 */
export function seekRelative(seconds) {
  const video = getVideoElement();
  if (!video) return;
  
  video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
}

/**
 * [I/O] Set video playback speed.
 * Clamps to YouTube's valid rates (0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2).
 *
 * Examples:
 *   setPlaybackRate(1.5)  // Sets 1.5x
 *   setPlaybackRate(1.3)  // Clamps to 1.25x
 *   setPlaybackRate(3.0)  // Clamps to 2x
 */
export function setPlaybackRate(rate) {
  const video = getVideoElement();
  if (!video) return;
  
  const clampedRate = clampPlaybackRate(rate);
  video.playbackRate = clampedRate;
}

/**
 * [I/O] Toggle video mute state.
 *
 * Examples:
 *   toggleMute()  // Muted -> unmuted, or vice versa
 */
export function toggleMute() {
  const video = getVideoElement();
  if (!video) return;
  
  video.muted = !video.muted;
}

/**
 * [I/O] Toggle fullscreen mode.
 *
 * Examples:
 *   toggleFullscreen()  // Enter or exit fullscreen
 */
export function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    // Find the player container for fullscreen
    const player = document.querySelector('#movie_player, .html5-video-player');
    if (player) {
      player.requestFullscreen();
    }
  }
}

/**
 * [I/O] Seek to a chapter's timestamp.
 *
 * Examples:
 *   seekToChapter({ title: 'Main Topic', time: 65, timeText: '1:05' })
 */
export function seekToChapter(chapter) {
  const video = getVideoElement();
  if (!video) return;
  
  video.currentTime = chapter.time;
}

/**
 * [PURE] Find the closest valid playback rate.
 *
 * Examples:
 *   clampPlaybackRate(1.3)  => 1.25
 *   clampPlaybackRate(3.0)  => 2
 *   clampPlaybackRate(0.1)  => 0.25
 */
export function clampPlaybackRate(rate) {
  // Find the rate with minimum distance
  let closest = VALID_RATES[0];
  let minDistance = Math.abs(rate - closest);
  
  for (const validRate of VALID_RATES) {
    const distance = Math.abs(rate - validRate);
    if (distance < minDistance) {
      minDistance = distance;
      closest = validRate;
    }
  }
  
  return closest;
}

/**
 * [I/O] Get current playback rate.
 */
export function getPlaybackRate() {
  const video = getVideoElement();
  return video ? video.playbackRate : 1;
}

/**
 * [I/O] Get current time formatted as string.
 */
export function getCurrentTimeFormatted() {
  const video = getVideoElement();
  if (!video) return '0:00';
  
  return formatTime(video.currentTime);
}

/**
 * Format seconds to time string.
 */
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  
  return `${m}:${s.toString().padStart(2, '0')}`;
}
