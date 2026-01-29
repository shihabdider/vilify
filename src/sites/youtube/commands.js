// YouTube-specific commands
// Provides command palette items and key sequence bindings

import * as player from './player.js';
import { getYouTubePageType, getVideoContext } from './scraper.js';
import { showMessage } from '../../core/view.js';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Navigate to a URL (same tab)
 * @param {string} url - URL or path to navigate to
 */
function navigateTo(url) {
  window.location.href = url;
}

/**
 * Open URL in new tab
 * @param {string} url - URL to open
 */
function openInNewTab(url) {
  window.open(url, '_blank');
}

/**
 * Copy text to clipboard and show toast
 * @param {string} text - Text to copy
 * @param {string} message - Toast message (optional)
 */
async function copyToClipboard(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    if (message) showMessage(message);
  } catch (e) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    if (message) showMessage(message);
  }
}

/**
 * Format seconds to timestamp string
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted timestamp like '1:23' or '1:23:45'
 */
function formatTimestamp(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// =============================================================================
// COPY ACTIONS
// =============================================================================

/**
 * Copy video URL to clipboard
 * @param {Object} ctx - Video context
 */
function copyVideoUrl(ctx) {
  if (!ctx) return;
  copyToClipboard(ctx.cleanUrl, 'Copied URL');
}

/**
 * Copy video URL at current time
 * @param {Object} ctx - Video context
 */
function copyVideoUrlAtTime(ctx) {
  if (!ctx) return;
  const t = Math.floor(ctx.currentTime || 0);
  copyToClipboard(`https://www.youtube.com/watch?v=${ctx.videoId}&t=${t}s`, `Copied URL at ${formatTimestamp(t)}`);
}

/**
 * Copy video title
 * @param {Object} ctx - Video context
 */
function copyVideoTitle(ctx) {
  if (!ctx?.title) return;
  copyToClipboard(ctx.title, 'Copied title');
}

/**
 * Copy video title and URL
 * @param {Object} ctx - Video context
 */
function copyVideoTitleAndUrl(ctx) {
  if (!ctx?.title) return;
  copyToClipboard(`${ctx.title}\n${ctx.cleanUrl}`, 'Copied title + URL');
}

// =============================================================================
// SUBSCRIBE ACTION
// =============================================================================

/**
 * Toggle subscribe/unsubscribe
 * @param {Object} ctx - Video context
 * @param {Function} onUpdate - Callback after state change
 */
function toggleSubscribe(ctx, onUpdate) {
  if (!ctx) return;

  const channelName = ctx.channelName || 'channel';

  if (ctx.isSubscribed) {
    // Unsubscribe flow - click notification button, then find unsubscribe
    const notificationBtn = document.querySelector('ytd-subscribe-button-renderer button, #subscribe-button button');
    if (notificationBtn) {
      notificationBtn.click();
      setTimeout(() => {
        const formattedStrings = document.querySelectorAll('tp-yt-paper-listbox yt-formatted-string');
        let found = false;
        for (const el of formattedStrings) {
          if (el.textContent?.trim() === 'Unsubscribe') {
            const clickable = el.closest('tp-yt-paper-item') || el.closest('ytd-menu-service-item-renderer');
            if (clickable) {
              clickable.click();
              found = true;
              break;
            }
          }
        }
        setTimeout(() => {
          const confirmBtn = document.querySelector('#confirm-button button, yt-confirm-dialog-renderer #confirm-button button, button[aria-label="Unsubscribe"]');
          if (confirmBtn) {
            confirmBtn.click();
            showMessage(`Unsubscribed from ${channelName}`);
            // Update immediately (optimistic)
            onUpdate?.(false);
          }
        }, 400);
      }, 400);
    }
  } else {
    // Subscribe flow - just click the button
    const ytSubBtn = document.querySelector('ytd-subscribe-button-renderer button, #subscribe-button button');
    if (ytSubBtn) {
      ytSubBtn.click();
      showMessage(`Subscribed to ${channelName}`);
      // Update immediately (optimistic)
      onUpdate?.(true);
    }
  }
}

// =============================================================================
// COMMANDS
// =============================================================================

/**
 * Get available commands based on current page context
 * Returns array of command objects with groups
 * @param {Object} app - App instance for callbacks
 * @returns {Array<Command>}
 * 
 * Examples:
 *   getYouTubeCommands(app) => [{ group: 'Navigation' }, { label: 'Home', ... }, ...]
 */
export function getYouTubeCommands(app) {
  // Inventory: app (callbacks), pageType (Enum), ctx (VideoContext|null)
  // Template: Enum - case per page type, Compound - access ctx fields

  const commands = [];
  const pageType = getYouTubePageType();
  const ctx = getVideoContext();

  // --- Navigation (always available) ---
  commands.push({ group: 'Navigation' });
  commands.push({
    type: 'command',
    label: 'Home',
    icon: '🏠',
    action: () => navigateTo('/'),
    keys: 'G H',
  });
  commands.push({
    type: 'command',
    label: 'Subscriptions',
    icon: '📺',
    action: () => navigateTo('/feed/subscriptions'),
    keys: 'G S',
  });
  commands.push({
    type: 'command',
    label: 'History',
    icon: '⏱',
    action: () => navigateTo('/feed/history'),
    keys: 'G Y',
  });
  commands.push({
    type: 'command',
    label: 'Library',
    icon: '📚',
    action: () => navigateTo('/feed/library'),
    keys: 'G L',
  });
  commands.push({
    type: 'command',
    label: 'Trending',
    icon: '🔥',
    action: () => navigateTo('/feed/trending'),
    keys: 'G T',
  });

  // --- Search/Filter ---
  commands.push({ group: 'Search' });
  commands.push({
    type: 'command',
    label: 'Open search',
    icon: '🔍',
    action: () => app?.openSearch?.(),
    keys: 'I',
  });
  if (pageType !== 'watch') {
    commands.push({
      type: 'command',
      label: 'Filter videos',
      icon: '🔎',
      action: () => app?.openFilter?.(),
      keys: '/',
    });
  }
  commands.push({
    type: 'command',
    label: 'Command palette',
    icon: '⌘',
    action: () => app?.openPalette?.('command'),
    keys: ':',
  });
  commands.push({
    type: 'command',
    label: 'Exit focus mode',
    icon: '>',
    action: () => app?.exitFocusMode?.(),
    keys: ':q',
  });

  // --- Video controls (watch page only) ---
  if (pageType === 'watch' && ctx) {
    // Playback
    commands.push({ group: 'Playback' });
    commands.push({
      type: 'command',
      label: ctx.paused ? 'Play' : 'Pause',
      icon: ctx.paused ? '▶' : '⏸',
      action: player.togglePlayPause,
      keys: 'Space',
    });
    commands.push({
      type: 'command',
      label: 'Skip back 10s',
      icon: '⏪',
      action: () => player.seekRelative(-10),
      keys: 'h',
    });
    commands.push({
      type: 'command',
      label: 'Skip forward 10s',
      icon: '⏩',
      action: () => player.seekRelative(10),
      keys: 'l',
    });
    commands.push({
      type: 'command',
      label: 'Skip back 5s',
      icon: '◀',
      action: () => player.seekRelative(-5),
      keys: '←',
    });
    commands.push({
      type: 'command',
      label: 'Skip forward 5s',
      icon: '▶',
      action: () => player.seekRelative(5),
      keys: '→',
    });

    // Speed
    commands.push({ group: 'Speed' });
    commands.push({
      type: 'command',
      label: 'Speed 0.5x',
      icon: '🐢',
      action: () => player.setPlaybackRate(0.5),
    });
    commands.push({
      type: 'command',
      label: 'Speed 1x',
      icon: '⏱',
      action: () => player.setPlaybackRate(1),
      keys: 'G 1',
    });
    commands.push({
      type: 'command',
      label: 'Speed 1.25x',
      icon: '🏃',
      action: () => player.setPlaybackRate(1.25),
    });
    commands.push({
      type: 'command',
      label: 'Speed 1.5x',
      icon: '🏃',
      action: () => player.setPlaybackRate(1.5),
    });
    commands.push({
      type: 'command',
      label: 'Speed 2x',
      icon: '🚀',
      action: () => player.setPlaybackRate(2),
      keys: 'G 2',
    });

    // View
    commands.push({ group: 'View' });
    commands.push({
      type: 'command',
      label: 'Toggle fullscreen',
      icon: '⛶',
      action: player.toggleFullscreen,
      keys: 'F',
    });
    commands.push({
      type: 'command',
      label: 'Theater mode',
      icon: '🎬',
      action: player.toggleTheaterMode,
      keys: 't',
    });
    commands.push({
      type: 'command',
      label: 'Toggle captions',
      icon: '💬',
      action: player.toggleCaptions,
      keys: 'c',
    });
    commands.push({
      type: 'command',
      label: 'Toggle mute',
      icon: ctx.muted ? '🔇' : '🔊',
      action: player.toggleMute,
      keys: 'm',
    });
    commands.push({
      type: 'command',
      label: 'Show description',
      icon: '📖',
      action: () => app?.openDescriptionModal?.(),
      keys: 'Z O',
    });
    commands.push({
      type: 'command',
      label: 'Close description',
      icon: '📕',
      action: () => app?.closeDescriptionModal?.(),
      keys: 'Z C',
    });
    commands.push({
      type: 'command',
      label: 'Jump to chapter',
      icon: '📑',
      action: () => app?.openChapterPicker?.(),
      keys: 'F',
    });
    commands.push({
      type: 'command',
      label: 'Next comment page',
      icon: '💬',
      action: () => app?.nextCommentPage?.(),
      keys: 'Ctrl+F',
    });
    commands.push({
      type: 'command',
      label: 'Prev comment page',
      icon: '💬',
      action: () => app?.prevCommentPage?.(),
      keys: 'Ctrl+B',
    });

    // Copy
    commands.push({ group: 'Copy' });
    commands.push({
      type: 'command',
      label: 'Copy video URL',
      icon: '🔗',
      action: () => copyVideoUrl(ctx),
      keys: 'Y Y',
    });
    commands.push({
      type: 'command',
      label: 'Copy URL at current time',
      icon: '⏱',
      action: () => copyVideoUrlAtTime(ctx),
      meta: formatTimestamp(ctx.currentTime),
      keys: '⇧Y',
    });
    commands.push({
      type: 'command',
      label: 'Copy video title',
      icon: '📝',
      action: () => copyVideoTitle(ctx),
      keys: 'Y T',
    });
    commands.push({
      type: 'command',
      label: 'Copy title + URL',
      icon: '📋',
      action: () => copyVideoTitleAndUrl(ctx),
      keys: 'Y A',
    });

    // Channel
    if (ctx.channelUrl) {
      commands.push({ group: 'Channel' });
      commands.push({
        type: 'command',
        label: ctx.isSubscribed ? 'Unsubscribe' : 'Subscribe',
        icon: ctx.isSubscribed ? '✓' : '⊕',
        action: () => toggleSubscribe(ctx, app?.updateSubscribeButton?.bind(app)),
        keys: '⇧M',
      });
      commands.push({
        type: 'command',
        label: `Go to ${ctx.channelName || 'channel'}`,
        icon: '👤',
        action: () => navigateTo(ctx.channelUrl),
        keys: 'G C',
      });
      commands.push({
        type: 'command',
        label: `${ctx.channelName || 'Channel'} videos`,
        icon: '🎥',
        action: () => navigateTo(ctx.channelUrl + '/videos'),
      });
    }
  }

  return commands;
}

// =============================================================================
// KEY SEQUENCES
// =============================================================================

/**
 * Get key sequence bindings for vim-style navigation
 * @param {Object} app - App instance for callbacks
 * @returns {Object} Map of key sequence to action function
 * 
 * Examples:
 *   getYouTubeKeySequences(app) => { 'gh': [Function], 'yy': [Function], ... }
 */
export function getYouTubeKeySequences(app) {
  // Inventory: app (callbacks), ctx (VideoContext|null), pageType (Enum)
  // Template: build object, conditional additions

  const ctx = getVideoContext();
  const pageType = getYouTubePageType();

  // Base sequences (always available)
  const sequences = {
    // Search/palette - '/' opens filter on all pages (videos on listing, recommended on watch)
    '/': () => {
      app?.openFilter?.();
    },
    ':': () => app?.openPalette?.('command'),
    'i': () => app?.openSearch?.(),

    // Navigation
    'gh': () => navigateTo('/'),
    'gs': () => navigateTo('/feed/subscriptions'),
    'gy': () => navigateTo('/feed/history'),
    'gl': () => navigateTo('/feed/library'),
    'gt': () => navigateTo('/feed/trending'),
  };

  // Video-specific sequences (watch page only)
  if (ctx) {
    // Channel navigation
    if (ctx.channelUrl) {
      sequences['gc'] = () => navigateTo(ctx.channelUrl);
    }

    // Playback speed
    sequences['g1'] = () => player.setPlaybackRate(1);
    sequences['g2'] = () => player.setPlaybackRate(2);

    // Copy
    sequences['yy'] = () => copyVideoUrl(ctx);
    sequences['yt'] = () => copyVideoTitle(ctx);
    // Note: Shift+Y (copy URL at time) is handled via getSingleKeyActions

    // Description
    sequences['zo'] = () => app?.openDescriptionModal?.();
    sequences['zc'] = () => app?.closeDescriptionModal?.();

    // Chapters
    sequences['f'] = () => app?.openChapterPicker?.();

    // Player controls (single keys on watch page)
    sequences['m'] = player.toggleMute;
    sequences['c'] = player.toggleCaptions;
    sequences['h'] = () => player.seekRelative(-10);
    sequences['l'] = () => player.seekRelative(10);
    sequences['t'] = player.toggleTheaterMode;
  }

  return sequences;
}

/**
 * Get single-key actions (including Shift modifiers)
 * @param {Object} app - App instance
 * @returns {Object} Map of key to action
 * 
 * Examples:
 *   getYouTubeSingleKeyActions(app) => { 'Y': [Function], 'M': [Function], ... }
 */
export function getYouTubeSingleKeyActions(app) {
  const ctx = getVideoContext();
  const actions = {};

  if (ctx) {
    // Shift+Y = copy URL at time
    actions['Y'] = () => copyVideoUrlAtTime(ctx);
    // Shift+M = toggle subscribe
    actions['M'] = () => toggleSubscribe(ctx, app?.updateSubscribeButton?.bind(app));
  }

  return actions;
}

// =============================================================================
// LEGACY EXPORT (for backward compatibility)
// =============================================================================

export const youtubeCommands = [];
