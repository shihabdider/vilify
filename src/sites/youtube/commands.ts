// YouTube-specific commands
// Provides command palette items and key sequence bindings

import type { App, KeyContext } from '../../types';
import * as player from './player';
import { getYouTubePageType } from './scraper';
import { getDataProvider } from './data/index';
import { showMessage } from '../../core/view';
import { formatTimestamp } from './format';

/** Get video context using DataProvider */
function getVideoContext(): Record<string, any> | null {
  return getDataProvider().getVideoContext();
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Navigate to a URL (same tab)
 * @param {string} url - URL or path to navigate to
 */
function navigateTo(url: string): void {
  window.location.href = url;
}

/**
 * Open URL in new tab
 * @param {string} url - URL to open
 */
function openInNewTab(url: string): void {
  window.open(url, '_blank');
}

/**
 * Copy text to clipboard and show toast
 * @param {string} text - Text to copy
 * @param {string} message - Toast message (optional)
 */
async function copyToClipboard(text: string, message?: string): Promise<void> {
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

// formatTimestamp imported from ./format

// =============================================================================
// COPY ACTIONS
// =============================================================================

/**
 * Copy video URL to clipboard
 * @param {Object} ctx - Video context
 */
function copyVideoUrl(ctx: Record<string, any> | null): void {
  if (!ctx) return;
  copyToClipboard(ctx.cleanUrl, 'Copied URL');
}

/**
 * Copy video URL at current time
 * @param {Object} ctx - Video context
 */
function copyVideoUrlAtTime(ctx: Record<string, any> | null): void {
  if (!ctx) return;
  const t = Math.floor(ctx.currentTime || 0);
  copyToClipboard(`https://www.youtube.com/watch?v=${ctx.videoId}&t=${t}s`, `Copied URL at ${formatTimestamp(t)}`);
}

/**
 * Copy video title
 * @param {Object} ctx - Video context
 */
function copyVideoTitle(ctx: Record<string, any> | null): void {
  if (!ctx?.title) return;
  copyToClipboard(ctx.title, 'Copied title');
}

/**
 * Copy video title and URL
 * @param {Object} ctx - Video context
 */
function copyVideoTitleAndUrl(ctx: Record<string, any> | null): void {
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
function toggleSubscribe(ctx: Record<string, any> | null, onUpdate?: (subscribed: boolean) => void): void {
  if (!ctx) return;

  const channelName = ctx.channelName || 'channel';

  if (ctx.isSubscribed) {
    // Unsubscribe flow - click subscribe button to open menu/dialog
    const subBtn = document.querySelector('ytd-subscribe-button-renderer button, #subscribe-button button');
    if (subBtn) {
      subBtn.click();
      
      // Wait for menu or dialog to appear
      setTimeout(() => {
        // Try to find "Unsubscribe" in dropdown menu
        const menuItems = document.querySelectorAll('tp-yt-paper-listbox yt-formatted-string, ytd-menu-service-item-renderer yt-formatted-string');
        let clickedMenuItem = false;
        
        for (const el of menuItems) {
          if (el.textContent?.trim() === 'Unsubscribe') {
            const clickable = el.closest('tp-yt-paper-item') || el.closest('ytd-menu-service-item-renderer');
            if (clickable) {
              clickable.click();
              clickedMenuItem = true;
              break;
            }
          }
        }
        
        // Wait for confirmation dialog
        setTimeout(() => {
          // Try multiple selectors for the confirm button
          const confirmSelectors = [
            // New YouTube dialog
            'yt-confirm-dialog-renderer button.yt-spec-button-shape-next--call-to-action',
            'yt-confirm-dialog-renderer #confirm-button button',
            'tp-yt-paper-dialog button.yt-spec-button-shape-next--call-to-action',
            // Button with Unsubscribe text
            'tp-yt-paper-dialog button[aria-label="Unsubscribe"]',
            'yt-confirm-dialog-renderer button[aria-label="Unsubscribe"]',
            // Generic confirm button
            '#confirm-button button',
          ];
          
          let confirmBtn = null;
          for (const sel of confirmSelectors) {
            confirmBtn = document.querySelector(sel);
            if (confirmBtn) break;
          }
          
          // Also try finding by button text
          if (!confirmBtn) {
            const allButtons = document.querySelectorAll('tp-yt-paper-dialog button, yt-confirm-dialog-renderer button');
            for (const btn of allButtons) {
              if (btn.textContent?.trim() === 'Unsubscribe') {
                confirmBtn = btn;
                break;
              }
            }
          }
          
          if (confirmBtn) {
            confirmBtn.click();
            showMessage(`Unsubscribed from ${channelName}`);
            onUpdate?.(false);
          } else {
            showMessage('Could not confirm unsubscribe');
          }
        }, 500);
      }, 400);
    }
  } else {
    // Subscribe flow - just click the button
    const ytSubBtn = document.querySelector('ytd-subscribe-button-renderer button, #subscribe-button button');
    if (ytSubBtn) {
      ytSubBtn.click();
      showMessage(`Subscribed to ${channelName}`);
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
export function getYouTubeCommands(app: App): any[] {
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
    label: 'Watch Later',
    icon: '🕐',
    action: () => navigateTo('/playlist?list=WL'),
    keys: 'G W',
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
      action: () => app?.openRecommended?.(),
      keys: '/',
    });
    // --- Sort commands for listing pages ---
    commands.push({ group: 'Sort' });
    commands.push({
      type: 'command',
      label: 'Sort by date',
      icon: '📅',
      action: () => app?.executeSort?.('date'),
      keys: ':sort da',
    });
    commands.push({
      type: 'command',
      label: 'Sort by duration',
      icon: '⏱',
      action: () => app?.executeSort?.('duration'),
      keys: ':sort du',
    });
    commands.push({
      type: 'command',
      label: 'Sort by title',
      icon: '🔤',
      action: () => app?.executeSort?.('title'),
      keys: ':sort t',
    });
    commands.push({
      type: 'command',
      label: 'Sort by channel',
      icon: '👤',
      action: () => app?.executeSort?.('channel'),
      keys: ':sort c',
    });
    commands.push({
      type: 'command',
      label: 'Sort by views',
      icon: '👁',
      action: () => app?.executeSort?.('views'),
      keys: ':sort v',
    });
    commands.push({
      type: 'command',
      label: 'Reset sort',
      icon: '↩',
      action: () => app?.executeSort?.(null),
      keys: ':sort',
    });
    // --- Dismiss ---
    commands.push({ group: 'Dismiss' });
    commands.push({
      type: 'command',
      label: 'Not interested',
      icon: '🚫',
      action: () => app?.dismissVideo?.(),
      keys: 'D D',
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

  // --- List navigation (listing pages only) ---
  if (pageType !== 'watch') {
    commands.push({ group: 'List' });
    commands.push({
      type: 'command',
      label: 'Go to top',
      icon: '⬆',
      action: () => app?.goToTop?.(),
      keys: 'G G',
    });
    commands.push({
      type: 'command',
      label: 'Go to bottom',
      icon: '⬇',
      action: () => app?.goToBottom?.(),
      keys: '⇧G',
    });
  }

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
      action: () => app?.openDrawer?.('description'),
      keys: 'Z O',
    });
    commands.push({
      type: 'command',
      label: 'Close description',
      icon: '📕',
      action: () => app?.closeDrawer?.(),
      keys: 'Z C',
    });
    commands.push({
      type: 'command',
      label: 'Jump to chapter',
      icon: '📑',
      action: () => app?.openDrawer?.('chapters'),
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

    // Watch Later
    commands.push({ group: 'Watch Later' });
    commands.push({
      type: 'command',
      label: 'Add to Watch Later',
      icon: '🕐',
      action: () => app?.addToWatchLater?.(),
      keys: 'M W',
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
        keys: 'M S',
      });
      commands.push({
        type: 'command',
        label: `Go to ${ctx.channelName || 'channel'} videos`,
        icon: '👤',
        action: () => navigateTo(ctx.channelUrl + '/videos'),
        keys: 'G C',
      });
    }
  }

  return commands;
}

// =============================================================================
// KEY SEQUENCES
// =============================================================================

/**
 * Get ALL key sequence bindings for YouTube, including navigation keys,
 * modifier combos, and multi-key sequences. Context-conditional: checks
 * context.pageType, context.filterActive etc. to decide which bindings to include.
 *
 * Provides ALL key bindings for YouTube — navigation, modifiers, multi-key sequences.
 *
 * @param {Object} app - App instance for callbacks (navigate, select, openPalette, etc.)
 * @param {KeyContext} context - Current keyboard context { pageType, filterActive, searchActive, drawer }
 * @returns {Object} Map of key sequence to action function
 * 
 * Bindings by context:
 * - Always: '/', ':', 'i', 'gh', 'gs', 'gy', 'gl', 'gw', 'gg', 'mw',
 *           'ArrowDown', 'ArrowUp', 'Enter' (on listing pages)
 * - Listing, !filterActive, !searchActive: 'j', 'k', 'h', 'l', 'u', 'dd'
 * - Listing: 'G' (goToBottom)
 * - Watch page: 'C-f', 'C-b', ' ' (space→togglePlayPause), player controls
 * - Watch page with ctx: 'm', 'c', 'h', 'l', 'f', 't', 'yy', 'yt', 'Y', etc.
 *
 * Examples:
 *   getYouTubeKeySequences(app, { pageType: 'home', filterActive: false, ... })
 *     => { 'j': [Function], 'k': [Function], 'gh': [Function], ... }
 *   getYouTubeKeySequences(app, { pageType: 'watch', ... })
 *     => { 'C-f': [Function], ' ': [Function], 'm': [Function], ... }
 */
export function getYouTubeKeySequences(app: App, context: KeyContext): Record<string, Function> {
  const ctx = getVideoContext();
  const pageType = context?.pageType;

  // (1) Always-available bindings
  const sequences = {
    '/': () => {
      if (pageType === 'watch') {
        app?.openRecommended?.();
      } else {
        app?.openLocalFilter?.();
      }
    },
    ':': () => app?.openPalette?.('command'),
    'i': () => app?.openSearch?.(),

    // g-prefixed navigation
    'gh': () => navigateTo('/'),
    'gs': () => navigateTo('/feed/subscriptions'),
    'gy': () => navigateTo('/feed/history'),
    'gl': () => navigateTo('/feed/library'),
    'gw': () => navigateTo('/playlist?list=WL'),

    'gg': () => app?.goToTop?.(),
    'mw': () => app?.addToWatchLater?.(),
  };

  // (2) Listing pages (pageType !== 'watch')
  if (pageType !== 'watch') {
    sequences['ArrowDown'] = () => app?.navigate?.('down');
    sequences['ArrowUp'] = () => app?.navigate?.('up');
    sequences['Enter'] = () => app?.select?.(false);
    sequences['G'] = () => app?.goToBottom?.();
    sequences['dd'] = () => app?.removeFromWatchLater?.();

    // (3) Listing + !filterActive + !searchActive
    if (!context?.filterActive && !context?.searchActive) {
      sequences['j'] = () => app?.navigate?.('down');
      sequences['k'] = () => app?.navigate?.('up');
      sequences['h'] = () => app?.navigate?.('left');
      sequences['l'] = () => app?.navigate?.('right');
      sequences['u'] = () => app?.undoWatchLaterRemoval?.();
    }
  }

  // (4) Watch page basics
  if (pageType === 'watch') {
    sequences['C-f'] = () => app?.nextCommentPage?.();
    sequences['C-b'] = () => app?.prevCommentPage?.();
    sequences[' '] = () => player.togglePlayPause();
  }

  // (5) Watch page with video context
  if (ctx) {
    if (ctx.channelUrl) {
      sequences['gc'] = () => navigateTo(ctx.channelUrl + '/videos');
    }

    sequences['g1'] = () => player.setPlaybackRate(1);
    sequences['g2'] = () => player.setPlaybackRate(2);

    sequences['yy'] = () => copyVideoUrl(ctx);
    sequences['yt'] = () => copyVideoTitle(ctx);
    sequences['Y'] = () => copyVideoUrlAtTime(ctx);

    sequences['zo'] = () => app?.openDrawer?.('description');
    sequences['zc'] = () => app?.closeDrawer?.();
    sequences['f'] = () => app?.openDrawer?.('chapters');

    sequences['ms'] = () => toggleSubscribe(ctx, app?.updateSubscribeButton?.bind(app));

    sequences['m'] = player.toggleMute;
    sequences['c'] = player.toggleCaptions;
    sequences['h'] = () => player.seekRelative(-10);
    sequences['l'] = () => player.seekRelative(10);
    sequences['t'] = () => app?.openTranscriptDrawer?.();
  }

  return sequences;
}

/**
 * Get keys to block (preventDefault+stopPropagation) on YouTube pages,
 * even if just a prefix match. Prevents YouTube's native handlers from
 * intercepting keys that Vilify handles via sequences.
 * [PURE]
 *
 * @param {KeyContext} context - Current keyboard context { pageType, filterActive, searchActive, drawer }
 * @returns {string[]} Keys to block
 *
 * @example
 * getYouTubeBlockedNativeKeys({ pageType: 'watch', ... })
 *   => ['f', 'm', 'c', 't', 'j', 'k', 'l', ' ', 'h']
 * getYouTubeBlockedNativeKeys({ pageType: 'home', ... })
 *   => []
 */
export function getYouTubeBlockedNativeKeys(context: KeyContext): string[] {
  if (context.pageType === 'watch') {
    return ['f', 'm', 'c', 't', 'j', 'k', 'l', ' ', 'h'];
  }
  return [];
}

// =============================================================================
// ADD TO WATCH LATER
// =============================================================================

/**
 * Add a video to Watch Later via YouTube's internal API.
 * Sends command to data-bridge running in MAIN world which has access to ytcfg.
 * [I/O]
 *
 * @param {string} videoId - Video ID to add
 * @returns {Promise<boolean>} True if successfully added
 *
 * @example
 * await addToWatchLater('dQw4w9WgXcQ')  // => true if added
 */
export async function addToWatchLater(videoId: string): Promise<boolean> {
  console.log('[Vilify] addToWatchLater called for:', videoId);
  return new Promise((resolve) => {
    const requestId = `wl_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    // Set up response listener
    const responseHandler = (event) => {
      const { requestId: respId, result } = event.detail || {};
      console.log('[Vilify] Got response:', respId, result);
      if (respId === requestId) {
        document.removeEventListener('__vilify_response__', responseHandler);
        resolve(result?.success === true);
      }
    };
    
    document.addEventListener('__vilify_response__', responseHandler);
    
    // Send command to data-bridge in MAIN world
    console.log('[Vilify] Sending command to bridge...');
    document.dispatchEvent(new CustomEvent('__vilify_command__', {
      detail: {
        command: 'addToWatchLater',
        data: { videoId },
        requestId
      }
    }));
    
    // Timeout after 5 seconds
    setTimeout(() => {
      console.log('[Vilify] Timeout waiting for response');
      document.removeEventListener('__vilify_response__', responseHandler);
      resolve(false);
    }, 5000);
  });
}

/**
 * Get playlist item data (setVideoId and position) for removal.
 * [I/O]
 *
 * @param {string} videoId - Video ID to look up
 * @returns {Promise<{ setVideoId: string, position: number } | null>}
 */
export async function getPlaylistItemData(videoId: string): Promise<{ setVideoId: string; position: number } | null> {
  console.log('[Vilify] getPlaylistItemData called for:', videoId);
  return new Promise((resolve) => {
    const requestId = `pid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const responseHandler = (event) => {
      const { requestId: respId, result } = event.detail || {};
      if (respId === requestId) {
        document.removeEventListener('__vilify_response__', responseHandler);
        resolve(result);
      }
    };
    
    document.addEventListener('__vilify_response__', responseHandler);
    
    document.dispatchEvent(new CustomEvent('__vilify_command__', {
      detail: {
        command: 'getPlaylistItemData',
        data: { videoId },
        requestId
      }
    }));
    
    setTimeout(() => {
      document.removeEventListener('__vilify_response__', responseHandler);
      resolve(null);
    }, 3000);
  });
}

/**
 * Remove a video from Watch Later via YouTube's internal API.
 * [I/O]
 *
 * @param {string} setVideoId - Playlist item ID (NOT the video ID)
 * @returns {Promise<boolean>} True if successfully removed
 */
export async function removeFromWatchLater(setVideoId: string): Promise<boolean> {
  console.log('[Vilify] removeFromWatchLater called for:', setVideoId);
  return new Promise((resolve) => {
    const requestId = `rm_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const responseHandler = (event) => {
      const { requestId: respId, result } = event.detail || {};
      if (respId === requestId) {
        document.removeEventListener('__vilify_response__', responseHandler);
        resolve(result?.success === true);
      }
    };
    
    document.addEventListener('__vilify_response__', responseHandler);
    
    document.dispatchEvent(new CustomEvent('__vilify_command__', {
      detail: {
        command: 'removeFromWatchLater',
        data: { setVideoId },
        requestId
      }
    }));
    
    setTimeout(() => {
      document.removeEventListener('__vilify_response__', responseHandler);
      resolve(false);
    }, 5000);
  });
}

/**
 * Undo removal - re-add video to Watch Later at specific position.
 * [I/O]
 *
 * @param {string} videoId - Video ID to add back
 * @param {number} position - Position to insert at
 * @returns {Promise<boolean>} True if successfully added back
 */
export async function undoRemoveFromWatchLater(videoId: string, position: number): Promise<boolean> {
  console.log('[Vilify] undoRemoveFromWatchLater called for:', videoId, 'at position:', position);
  return new Promise((resolve) => {
    const requestId = `undo_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const responseHandler = (event) => {
      const { requestId: respId, result } = event.detail || {};
      if (respId === requestId) {
        document.removeEventListener('__vilify_response__', responseHandler);
        resolve(result?.success === true);
      }
    };
    
    document.addEventListener('__vilify_response__', responseHandler);
    
    document.dispatchEvent(new CustomEvent('__vilify_command__', {
      detail: {
        command: 'undoRemoveFromWatchLater',
        data: { videoId, position },
        requestId
      }
    }));
    
    setTimeout(() => {
      document.removeEventListener('__vilify_response__', responseHandler);
      resolve(false);
    }, 5000);
  });
}

// =============================================================================
// DISMISS VIDEO ("Not interested")
// =============================================================================

/**
 * Find the YouTube DOM element containing a specific video.
 * Searches through various renderer types used by YouTube.
 * [I/O - reads DOM]
 *
 * @param {string} videoId - Video ID to find
 * @returns {HTMLElement|null} Container element or null
 */
function findVideoElement(videoId: string): Element | null {
  const selectors = [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-playlist-video-renderer',
  ];
  
  for (const selector of selectors) {
    for (const el of document.querySelectorAll(selector)) {
      const link = el.querySelector(`a[href*="/watch?v=${videoId}"]`);
      if (link) return el;
    }
  }

  // New layout: yt-lockup-view-model (wrapped in ytd-rich-item-renderer or standalone)
  for (const el of document.querySelectorAll('yt-lockup-view-model')) {
    const link = el.querySelector(`a[href*="/watch?v=${videoId}"]`);
    if (link) {
      // Prefer the parent rich-item-renderer if it exists
      return el.closest('ytd-rich-item-renderer') || el;
    }
  }
  
  return null;
}

/**
 * Find the three-dot menu button within a YouTube video element.
 * [I/O - reads DOM]
 *
 * @param {HTMLElement} videoElement - Video container element
 * @returns {HTMLElement|null} Menu button or null
 */
function findMenuButton(videoElement: Element): Element | null {
  const selectors = [
    'button[aria-label="Action menu"]',
    'ytd-menu-renderer button.yt-icon-button',
    'ytd-menu-renderer #button',
    '#menu button',
    'yt-icon-button#button',
    'button.yt-icon-button',
  ];
  
  for (const selector of selectors) {
    const btn = videoElement.querySelector(selector);
    if (btn) return btn;
  }
  
  return null;
}

/**
 * Wait for a DOM element matching a selector to appear.
 * [I/O]
 *
 * @param {string} selector - CSS selector
 * @param {number} timeout - Max wait in ms
 * @returns {Promise<HTMLElement|null>}
 */
function waitForElement(selector: string, timeout: number = 2000): Promise<Element | null> {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) { resolve(el); return; }
    
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Click "Not interested" inside an open YouTube dropdown.
 * [I/O]
 *
 * @param {HTMLElement} dropdown - The tp-yt-iron-dropdown element
 * @returns {boolean} True if found and clicked
 */
function clickNotInterested(dropdown: Element): boolean {
  // Search for menu items containing "Not interested" text
  const items = dropdown.querySelectorAll(
    'yt-list-item-view-model, ytd-menu-service-item-renderer, tp-yt-paper-item'
  );
  for (const item of items) {
    const text = item.textContent?.trim();
    if (text?.includes('Not interested')) {
      const button = item.querySelector('button') || item;
      button.click();
      return true;
    }
  }
  return false;
}

/**
 * Dismiss a video via YouTube's "Not interested" dropdown action.
 * Temporarily makes hidden native elements visible for the interaction,
 * then cleans up. Falls back to just tracking dismissal in state if
 * the DOM interaction fails.
 * [I/O]
 *
 * @param {string} videoId - Video ID to dismiss
 * @returns {Promise<boolean>} True if YouTube's "Not interested" was triggered
 *
 * @example
 * await dismissVideo('dQw4w9WgXcQ')  // => true if YouTube menu clicked
 */
export async function dismissVideo(videoId: string): Promise<boolean> {
  console.log('[Vilify] dismissVideo called for:', videoId);
  
  const videoElement = findVideoElement(videoId);
  if (!videoElement) {
    console.log('[Vilify] Could not find video element for:', videoId);
    return false;
  }
  
  // Temporarily make the video element visible (focus mode hides ytd-app)
  videoElement.style.setProperty('visibility', 'visible', 'important');
  
  const menuButton = findMenuButton(videoElement);
  if (!menuButton) {
    console.log('[Vilify] Could not find menu button for:', videoId);
    videoElement.style.removeProperty('visibility');
    return false;
  }
  
  // Click the three-dot menu
  menuButton.click();
  
  // Wait for dropdown to appear
  const dropdown = await waitForElement(
    'tp-yt-iron-dropdown:not([aria-hidden="true"]), ytd-popup-container tp-yt-iron-dropdown',
    2000
  );
  
  if (!dropdown) {
    console.log('[Vilify] Dropdown did not appear for:', videoId);
    videoElement.style.removeProperty('visibility');
    return false;
  }
  
  // Make dropdown visible too
  dropdown.style.setProperty('visibility', 'visible', 'important');
  
  // Small delay for dropdown content to render
  await new Promise(r => setTimeout(r, 200));
  
  const clicked = clickNotInterested(dropdown);
  console.log('[Vilify] Not interested clicked:', clicked);
  
  // Clean up visibility overrides
  videoElement.style.removeProperty('visibility');
  dropdown.style.removeProperty('visibility');
  
  // Close any lingering dropdown after a short delay
  setTimeout(() => {
    const openDropdown = document.querySelector('tp-yt-iron-dropdown:not([aria-hidden="true"])');
    if (openDropdown) {
      // Try to close it gracefully
      openDropdown.setAttribute('aria-hidden', 'true');
      openDropdown.style.display = 'none';
    }
  }, 300);
  
  return clicked;
}

// =============================================================================
// UNDO DISMISS ("Not interested" undo)
// =============================================================================

/**
 * Click YouTube's native "Undo" button that appears after "Not interested".
 * Searches for the undo notification toast and clicks its Undo button.
 * [I/O - reads/modifies DOM]
 *
 * @returns {Promise<boolean>} True if Undo button was found and clicked
 *
 * @example
 * await clickUndoDismiss()  // => true if YouTube's Undo was clicked
 */
export async function clickUndoDismiss(): Promise<boolean> {
  // YouTube shows a notification with "Undo" button after "Not interested"
  // The button is inside .ytNotificationMultiActionRendererButtonContainer
  const containers = document.querySelectorAll(
    '.ytNotificationMultiActionRendererButtonContainer, ' +
    'ytd-notification-multi-action-renderer'
  );
  
  for (const container of containers) {
    const buttons = container.querySelectorAll('button');
    for (const btn of buttons) {
      const text = btn.textContent?.trim();
      if (text === 'Undo') {
        btn.click();
        return true;
      }
    }
  }
  
  return false;
}

// =============================================================================
// LEGACY EXPORT (for backward compatibility)
// =============================================================================

export const youtubeCommands = [];
