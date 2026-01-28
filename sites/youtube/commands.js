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
      label: 'Copy title and URL',
      icon: '📄',
      action: () => {
        const text = `${videoContext.title}\n${videoContext.cleanUrl}`;
        copyToClipboard(text, 'Copied title and URL');
      },
      keys: 'y a',
      meta: null,
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
      label: 'Speed: 1x',
      icon: '🐢',
      action: () => setPlaybackRate(1),
      keys: 'g 1',
      meta: null,
      group: null,
    });
    commands.push({
      label: 'Speed: 2x',
      icon: '🚀',
      action: () => setPlaybackRate(2),
      keys: 'g 2',
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
          console.log('[Vilify] Chapter picker not yet implemented');
        },
        keys: 'f',
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
    sequences['y a'] = () => {
      const text = `${videoContext.title}\n${videoContext.cleanUrl}`;
      copyToClipboard(text, 'Copied title and URL');
    };
    
    // Playback bindings
    sequences['space'] = togglePlayPause;
    sequences['g 1'] = () => setPlaybackRate(1);
    sequences['g 2'] = () => setPlaybackRate(2);
    
    // Seek bindings
    sequences['l'] = () => seekRelative(10);
    sequences['h'] = () => seekRelative(-10);
    sequences['shift+l'] = () => seekRelative(30);
    sequences['shift+h'] = () => seekRelative(-30);
    
    // Chapter picker
    if (videoContext.chapters && videoContext.chapters.length > 0) {
      sequences['f'] = () => {
        // TODO: Open chapter picker modal
        console.log('[Vilify] Chapter picker not yet implemented');
      };
    }
    
    // Channel
    if (videoContext.channelUrl) {
      sequences['g c'] = () => navigateTo(videoContext.channelUrl);
    }
  }
  
  return sequences;
}
