/**
 * YouTube Commands
 * 
 * Command definitions and key bindings for YouTube.
 */

import { copyToClipboard, navigateTo, openInNewTab } from '../../core/actions.js';
import { togglePlayPause, seekRelative, setPlaybackRate, toggleMute, toggleFullscreen, seekToChapter, getCurrentTimeFormatted } from './player.js';

/**
 * Navigation destinations for YouTube.
 */
export const YOUTUBE_DESTINATIONS = {
  home: '/',
  subscriptions: '/feed/subscriptions',
  history: '/feed/history',
  library: '/feed/library',
  trending: '/feed/trending',
  liked: '/playlist?list=LL',
  watchLater: '/playlist?list=WL',
};

/**
 * [PURE] Get available commands based on context.
 */
export function getYouTubeCommands(videoContext) {
  const commands = [];
  
  // Navigation commands (always available)
  commands.push({ group: 'Navigation' });
  commands.push({
    label: 'Home',
    icon: '🏠',
    action: () => navigateTo(YOUTUBE_DESTINATIONS.home),
    keys: 'g h',
    meta: null,
    group: null,
  });
  commands.push({
    label: 'Subscriptions',
    icon: '📺',
    action: () => navigateTo(YOUTUBE_DESTINATIONS.subscriptions),
    keys: 'g s',
    meta: null,
    group: null,
  });
  commands.push({
    label: 'History',
    icon: '📜',
    action: () => navigateTo(YOUTUBE_DESTINATIONS.history),
    keys: 'g i',
    meta: null,
    group: null,
  });
  commands.push({
    label: 'Watch Later',
    icon: '⏰',
    action: () => navigateTo(YOUTUBE_DESTINATIONS.watchLater),
    keys: 'g w',
    meta: null,
    group: null,
  });
  commands.push({
    label: 'Liked Videos',
    icon: '👍',
    action: () => navigateTo(YOUTUBE_DESTINATIONS.liked),
    keys: 'g l',
    meta: null,
    group: null,
  });
  
  // Video-specific commands
  if (videoContext) {
    // Copy commands
    commands.push({ group: 'Copy' });
    commands.push({
      label: 'Copy video URL',
      icon: '📋',
      action: () => copyToClipboard(videoContext.cleanUrl, 'Copied URL'),
      keys: 'y y',
      meta: null,
      group: null,
    });
    commands.push({
      label: 'Copy video title',
      icon: '📝',
      action: () => copyToClipboard(videoContext.title || '', 'Copied title'),
      keys: 'y t',
      meta: null,
      group: null,
    });
    commands.push({
      label: 'Copy URL at current time',
      icon: '⏱',
      action: () => {
        const time = Math.floor(videoContext.currentTime);
        const url = `${videoContext.cleanUrl}&t=${time}`;
        copyToClipboard(url, `Copied URL at ${getCurrentTimeFormatted()}`);
      },
      keys: 'y c',
      meta: getCurrentTimeFormatted(),
      group: null,
    });
    
    // Playback commands
    commands.push({ group: 'Playback' });
    commands.push({
      label: 'Play/Pause',
      icon: '⏯',
      action: togglePlayPause,
      keys: 'space',
      meta: null,
      group: null,
    });
    commands.push({
      label: 'Speed: Normal (1x)',
      icon: '🐢',
      action: () => setPlaybackRate(1),
      keys: 'r 1',
      meta: null,
      group: null,
    });
    commands.push({
      label: 'Speed: 1.5x',
      icon: '🏃',
      action: () => setPlaybackRate(1.5),
      keys: 'r 2',
      meta: null,
      group: null,
    });
    commands.push({
      label: 'Speed: 2x',
      icon: '🚀',
      action: () => setPlaybackRate(2),
      keys: 'r 3',
      meta: null,
      group: null,
    });
    commands.push({
      label: 'Toggle Mute',
      icon: '🔇',
      action: toggleMute,
      keys: 'm',
      meta: null,
      group: null,
    });
    commands.push({
      label: 'Toggle Fullscreen',
      icon: '⛶',
      action: toggleFullscreen,
      keys: 'f',
      meta: null,
      group: null,
    });
    
    // Chapter commands (if available)
    if (videoContext.chapters && videoContext.chapters.length > 0) {
      commands.push({ group: 'Chapters' });
      commands.push({
        label: `Show chapters (${videoContext.chapters.length})`,
        icon: '📑',
        action: () => {
          // This would open chapter picker modal
          console.log('[Vilify] Chapter picker not yet implemented');
        },
        keys: 'c',
        meta: null,
        group: null,
      });
    }
    
    // Channel commands
    if (videoContext.channelUrl) {
      commands.push({ group: 'Channel' });
      commands.push({
        label: `Go to ${videoContext.channelName || 'channel'}`,
        icon: '👤',
        action: () => navigateTo(videoContext.channelUrl),
        keys: 'g c',
        meta: null,
        group: null,
      });
      commands.push({
        label: 'Open channel in new tab',
        icon: '↗',
        action: () => openInNewTab(videoContext.channelUrl),
        keys: 'g C',
        meta: null,
        group: null,
      });
    }
  }
  
  return commands;
}

/**
 * [PURE] Get key sequence bindings.
 */
export function getYouTubeKeySequences(videoContext) {
  const sequences = {
    // Navigation
    'g h': () => navigateTo(YOUTUBE_DESTINATIONS.home),
    'g s': () => navigateTo(YOUTUBE_DESTINATIONS.subscriptions),
    'g i': () => navigateTo(YOUTUBE_DESTINATIONS.history),
    'g w': () => navigateTo(YOUTUBE_DESTINATIONS.watchLater),
    'g l': () => navigateTo(YOUTUBE_DESTINATIONS.liked),
  };
  
  // Video-specific bindings
  if (videoContext) {
    // Copy bindings
    sequences['y y'] = () => copyToClipboard(videoContext.cleanUrl, 'Copied URL');
    sequences['y t'] = () => copyToClipboard(videoContext.title || '', 'Copied title');
    sequences['y c'] = () => {
      const time = Math.floor(videoContext.currentTime);
      const url = `${videoContext.cleanUrl}&t=${time}`;
      copyToClipboard(url, `Copied URL at ${getCurrentTimeFormatted()}`);
    };
    
    // Playback bindings
    sequences['space'] = togglePlayPause;
    sequences['r 1'] = () => setPlaybackRate(1);
    sequences['r 2'] = () => setPlaybackRate(1.5);
    sequences['r 3'] = () => setPlaybackRate(2);
    sequences['m'] = toggleMute;
    sequences['f'] = toggleFullscreen;
    
    // Seek bindings
    sequences['l'] = () => seekRelative(10);
    sequences['h'] = () => seekRelative(-10);
    sequences['shift+l'] = () => seekRelative(30);
    sequences['shift+h'] = () => seekRelative(-30);
    
    // Channel
    if (videoContext.channelUrl) {
      sequences['g c'] = () => navigateTo(videoContext.channelUrl);
    }
  }
  
  return sequences;
}
